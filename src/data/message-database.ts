export const MESSAGE_DATABASE_KEY = 'moni-lesson-message-database';

export const MESSAGE_SITUATIONS = [
  { id: 'start', label: '始まり', defaultText: 'きょうは何のお題にチャレンジする？' },
  { id: 'done', label: 'できた', defaultText: 'いい感じ！ その調子でいこう♪' },
  { id: 'topic-goal', label: 'お題達成', defaultText: 'やったね！ 目標達成だよ！' },
  { id: 'song-complete', label: '曲コンプ', defaultText: 'すごい！ この曲のお題を全部クリアしたね！' },
  { id: 'daily-complete', label: '今日のお題コンプ', defaultText: 'やったー！ 今日のお題を全部クリア！' },
] as const;

export type MessageSituation = (typeof MESSAGE_SITUATIONS)[number]['id'];
export type MessageScope = 'situation' | 'song' | 'topic';

export type MasterMessage = {
  id: string;
  text: string;
  order: number;
  deleted: boolean;
};

export type MessageAssignment = {
  id: string;
  messageId: string;
  situation: MessageSituation;
  scope: MessageScope;
  targetId: string | null;
  order: number;
  /** The initial assignment is protected from deletion. */
  isDefault: boolean;
};

export type MessageDatabase = {
  version: 1;
  messages: MasterMessage[];
  assignments: MessageAssignment[];
  initialized: boolean;
};

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

const createId = (): string => {
  if (typeof globalThis.crypto?.randomUUID === 'function') return globalThis.crypto.randomUUID();
  return `message-${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

export const emptyMessageDatabase = (): MessageDatabase => ({ version: 1, messages: [], assignments: [], initialized: false });

/** Creates one default assignment per situation on first initialization. */
export const seedDefaultMessages = (database: MessageDatabase): MessageDatabase => {
  if (database.initialized) return database;
  let next = { ...database, initialized: true };
  for (const situation of MESSAGE_SITUATIONS) {
    const existing = next.assignments.some((assignment) =>
      !assignment.deleted && assignment.scope === 'situation' && assignment.situation === situation.id,
    );
    if (existing) continue;
    const messageId = createId();
    const assignmentId = createId();
    next = {
      ...next,
      messages: [...next.messages, {
        id: messageId, text: situation.defaultText, order: Math.max(-1, ...next.messages.map((message) => message.order)) + 1, deleted: false,
      }],
      assignments: [...next.assignments, {
        id: assignmentId, messageId, situation: situation.id, scope: 'situation', targetId: null,
        order: Math.max(-1, ...next.assignments.filter((assignment) => assignment.situation === situation.id && assignment.scope === 'situation').map((assignment) => assignment.order)) + 1,
        isDefault: true,
      }],
    };
  }
  return next;
};

const isSituation = (value: unknown): value is MessageSituation =>
  MESSAGE_SITUATIONS.some((situation) => situation.id === value);

const isDatabase = (value: unknown): value is MessageDatabase => {
  if (!value || typeof value !== 'object') return false;
  const database = value as Partial<MessageDatabase>;
  return database.version === 1 &&
    Array.isArray(database.messages) && database.messages.every((message) =>
      message && typeof message.id === 'string' && typeof message.text === 'string' &&
      typeof message.order === 'number' && typeof message.deleted === 'boolean') &&
    typeof database.initialized === 'boolean' &&
    Array.isArray(database.assignments) && database.assignments.every((assignment) =>
      assignment && typeof assignment.id === 'string' && typeof assignment.messageId === 'string' &&
      isSituation(assignment.situation) &&
      (assignment.scope === 'situation' || assignment.scope === 'song' || assignment.scope === 'topic') &&
      (assignment.targetId === null || typeof assignment.targetId === 'string') &&
      typeof assignment.order === 'number' && typeof assignment.isDefault === 'boolean' &&
      (assignment.scope === 'situation' ? assignment.targetId === null : typeof assignment.targetId === 'string'));
};

export const loadMessageDatabase = (storage: StorageLike): MessageDatabase => {
  try {
    const raw = storage.getItem(MESSAGE_DATABASE_KEY);
    if (!raw) return seedDefaultMessages(emptyMessageDatabase());
    const parsed: unknown = JSON.parse(raw);
    return isDatabase(parsed) ? seedDefaultMessages(parsed) : seedDefaultMessages(emptyMessageDatabase());
  } catch {
    return seedDefaultMessages(emptyMessageDatabase());
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
      id: createId(), text: normalized,
      order: Math.max(-1, ...database.messages.map((message) => message.order)) + 1,
      deleted: false,
    }],
  };
};

export const updateMasterMessage = (database: MessageDatabase, messageId: string, text: string): MessageDatabase => {
  const normalized = text.trim();
  if (!normalized) return database;
  return {
    ...database,
    messages: database.messages.map((message) => message.id === messageId && !message.deleted
      ? { ...message, text: normalized }
      : message),
  };
};

/** Assigns a reusable master message. Song/topic assignments are allowed only for start/done. */
export const assignMessage = (
  database: MessageDatabase,
  messageId: string,
  situation: MessageSituation,
  scope: MessageScope,
  targetId: string | null = null,
): MessageDatabase => {
  const message = database.messages.find((item) => item.id === messageId && !item.deleted);
  if (!message) return database;
  if (scope !== 'situation' && situation !== 'start' && situation !== 'done') return database;
  if (scope === 'situation' ? targetId !== null : !targetId) return database;
  const duplicate = database.assignments.some((assignment) =>
    assignment.messageId === messageId && assignment.situation === situation &&
    assignment.scope === scope && assignment.targetId === targetId,
  );
  if (duplicate) return database;
  const siblings = database.assignments.filter((assignment) =>
    !assignment.deleted && assignment.situation === situation && assignment.scope === scope && assignment.targetId === targetId,
  );
  return {
    ...database,
    assignments: [...database.assignments, {
      id: createId(), messageId, situation, scope, targetId,
      order: Math.max(-1, ...siblings.map((assignment) => assignment.order)) + 1,
      isDefault: false,
    }],
  };
};

export const updateMessageAssignment = (
  database: MessageDatabase,
  assignmentId: string,
  messageId: string,
): MessageDatabase => {
  if (!database.messages.some((message) => message.id === messageId && !message.deleted)) return database;
  return {
    ...database,
    assignments: database.assignments.map((assignment) =>
      assignment.id === assignmentId ? { ...assignment, messageId, isDefault: false } : assignment),
  };
};

/** Refuses to remove the final assignment for a situation; song/topic assignments may be empty. */
export const removeMessageAssignment = (database: MessageDatabase, assignmentId: string): MessageDatabase => {
  const target = database.assignments.find((assignment) => assignment.id === assignmentId);
  if (!target) return database;
  if (target.scope === 'situation') {
    const count = database.assignments.filter((assignment) =>
      assignment.scope === 'situation' && assignment.situation === target.situation,
    ).length;
    if (count <= 1) return database;
  }
  return { ...database, assignments: database.assignments.filter((assignment) => assignment.id !== assignmentId) };
};

export const softDeleteMasterMessage = (database: MessageDatabase, messageId: string): MessageDatabase => {
  // A message still referenced by an assignment remains available; deleting the master
  // is refused until its assignments have been removed or replaced.
  if (database.assignments.some((assignment) => assignment.messageId === messageId)) return database;
  return {
    ...database,
    messages: database.messages.map((message) => message.id === messageId ? { ...message, deleted: true } : message),
  };
};

export const listMessageAssignments = (
  database: MessageDatabase,
  situation?: MessageSituation,
  scope?: MessageScope,
  targetId?: string,
): Array<MessageAssignment & { text: string }> => database.assignments
  .filter((assignment) =>
    (situation === undefined || assignment.situation === situation) &&
    (scope === undefined || assignment.scope === scope) &&
    (targetId === undefined || assignment.targetId === targetId) &&
    database.messages.some((message) => message.id === assignment.messageId && !message.deleted),
  )
  .sort((a, b) => a.order - b.order)
  .flatMap((assignment) => {
    const message = database.messages.find((item) => item.id === assignment.messageId && !item.deleted);
    return message ? [{ ...assignment, text: message.text }] : [];
  });

/**
 * start/done: topic assignment, then song assignment, then situation assignment.
 * Achievement situations: situation assignments only. Randomness is injectable for tests.
 */
export const selectLessonMessage = (
  database: MessageDatabase,
  situation: MessageSituation,
  songId?: string,
  topicId?: string,
  random: () => number = Math.random,
): string | undefined => {
  const scopeCandidates = (scope: MessageScope, targetId: string | null) =>
    listMessageAssignments(database, situation, scope, targetId);
  const candidates = situation === 'start' || situation === 'done'
    ? (topicId ? scopeCandidates('topic', topicId) : []).length
      ? scopeCandidates('topic', topicId)
      : (songId ? scopeCandidates('song', songId) : []).length
        ? scopeCandidates('song', songId)
        : scopeCandidates('situation', null)
    : scopeCandidates('situation', null);
  if (!candidates.length) return undefined;
  const index = Math.min(candidates.length - 1, Math.floor(Math.max(0, Math.min(0.999999999, random())) * candidates.length));
  return candidates[index].text;
};
