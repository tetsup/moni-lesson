export const MESSAGE_DATABASE_KEY = 'moni-lesson-message-database';

export const MESSAGE_SITUATIONS = [
  { id: 'start', label: '始まり' },
  { id: 'done', label: 'できた' },
  { id: 'topic-goal', label: 'お題達成' },
  { id: 'song-complete', label: '曲コンプ' },
  { id: 'daily-complete', label: '今日のお題コンプ' },
] as const;

export type MessageSituation = (typeof MESSAGE_SITUATIONS)[number]['id'];

export type MasterMessage = {
  id: string;
  text: string;
  situations: MessageSituation[];
  songIds: string[];
  topicIds: string[];
  order: number;
  deleted: boolean;
};

export type MessageDatabase = {
  version: 1;
  messages: MasterMessage[];
};

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

export const emptyMessageDatabase = (): MessageDatabase => ({ version: 1, messages: [] });

const createId = (): string => {
  if (typeof globalThis.crypto?.randomUUID === 'function') return globalThis.crypto.randomUUID();
  return `message-${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const isSituation = (value: unknown): value is MessageSituation =>
  MESSAGE_SITUATIONS.some((situation) => situation.id === value);

const isMessage = (value: unknown): value is MasterMessage => {
  if (!value || typeof value !== 'object') return false;
  const message = value as Partial<MasterMessage>;
  return typeof message.id === 'string' &&
    typeof message.text === 'string' &&
    Array.isArray(message.situations) && message.situations.every(isSituation) &&
    Array.isArray(message.songIds) && message.songIds.every((id) => typeof id === 'string') &&
    Array.isArray(message.topicIds) && message.topicIds.every((id) => typeof id === 'string') &&
    typeof message.order === 'number' && typeof message.deleted === 'boolean';
};

export const loadMessageDatabase = (storage: StorageLike): MessageDatabase => {
  try {
    const raw = storage.getItem(MESSAGE_DATABASE_KEY);
    if (!raw) return emptyMessageDatabase();
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return emptyMessageDatabase();
    const value = parsed as Partial<MessageDatabase>;
    if (value.version !== 1 || !Array.isArray(value.messages) || !value.messages.every(isMessage)) {
      return emptyMessageDatabase();
    }
    return value as MessageDatabase;
  } catch {
    return emptyMessageDatabase();
  }
};

export const saveMessageDatabase = (database: MessageDatabase, storage: StorageLike): void => {
  storage.setItem(MESSAGE_DATABASE_KEY, JSON.stringify(database));
};

export const listMasterMessages = (database: MessageDatabase, query = ''): MasterMessage[] => {
  const normalized = query.trim().toLocaleLowerCase();
  return database.messages
    .filter((message) => !message.deleted && message.text.toLocaleLowerCase().includes(normalized))
    .sort((a, b) => a.order - b.order);
};

export const addMasterMessage = (database: MessageDatabase, text: string): MessageDatabase => {
  const normalized = text.trim();
  if (!normalized) return database;
  return {
    ...database,
    messages: [...database.messages, {
      id: createId(),
      text: normalized,
      situations: [],
      songIds: [],
      topicIds: [],
      order: Math.max(-1, ...database.messages.map((message) => message.order)) + 1,
      deleted: false,
    }],
  };
};

export const updateMasterMessage = (
  database: MessageDatabase,
  messageId: string,
  update: Pick<MasterMessage, 'text' | 'situations' | 'songIds' | 'topicIds'>,
): MessageDatabase => {
  if (!update.text.trim()) return database;
  const unique = <T,>(values: T[]): T[] => [...new Set(values)];
  return {
    ...database,
    messages: database.messages.map((message) => message.id !== messageId ? message : {
      ...message,
      text: update.text.trim(),
      situations: unique(update.situations),
      songIds: unique(update.songIds),
      topicIds: unique(update.topicIds),
    }),
  };
};

export const softDeleteMasterMessage = (database: MessageDatabase, messageId: string): MessageDatabase => ({
  ...database,
  messages: database.messages.map((message) => message.id === messageId ? { ...message, deleted: true } : message),
});

/**
 * Picks one message for an event. A topic assignment wins over a song assignment,
 * which wins over a situation-only message. Multiple candidates at the same level
 * are chosen randomly. A context-specific message may optionally also be restricted
 * to situations; an empty situations list means it is available for any situation.
 */
export const selectLessonMessage = (
  database: MessageDatabase,
  situation: MessageSituation,
  songId?: string,
  topicId?: string,
  random: () => number = Math.random,
): string | undefined => {
  const applicable = listMasterMessages(database).filter((message) =>
    message.situations.length === 0 || message.situations.includes(situation),
  );
  const topicMatches = topicId ? applicable.filter((message) => message.topicIds.includes(topicId)) : [];
  const songMatches = songId ? applicable.filter((message) => message.songIds.includes(songId)) : [];
  const candidates = topicMatches.length ? topicMatches : songMatches.length ? songMatches : applicable.filter((message) =>
    message.situations.includes(situation) && message.songIds.length === 0 && message.topicIds.length === 0,
  );
  if (!candidates.length) return undefined;
  const index = Math.min(candidates.length - 1, Math.floor(Math.max(0, Math.min(0.999999999, random())) * candidates.length));
  return candidates[index].text;
};
