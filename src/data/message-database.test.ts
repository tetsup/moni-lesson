import { describe, expect, it } from 'vitest';
import {
  MESSAGE_DATABASE_KEY,
  addMasterMessage,
  assignMessage,
  emptyMessageDatabase,
  listMasterMessages,
  listMessageAssignments,
  loadMessageDatabase,
  removeMessageAssignment,
  saveMessageDatabase,
  selectLessonMessage,
  seedDefaultMessages,
  softDeleteMasterMessage,
  updateMasterMessage,
  updateMessageAssignment,
} from './message-database';

class MemoryStorage {
  private values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

const seeded = () => seedDefaultMessages(emptyMessageDatabase());

const addAndAssign = (
  database: ReturnType<typeof seeded>,
  text: string,
  situation: 'selection' | 'start' | 'done' | 'topic-goal' | 'song-complete' | 'daily-complete',
  scope: 'situation' | 'song' | 'topic',
  targetId: string | null = null,
) => {
  const before = listMasterMessages(database);
  const next = addMasterMessage(database, text);
  const added = listMasterMessages(next).find((message) => !before.some((old) => old.id === message.id));
  if (!added) throw new Error('message was not added');
  return { database: assignMessage(next, added.id, situation, scope, targetId), messageId: added.id };
};

describe('message database persistence and defaults', () => {
  it('seeds one default message per situation and round-trips it', () => {
    const storage = new MemoryStorage();
    const database = loadMessageDatabase(storage);
    expect(listMessageAssignments(database, 'selection', 'situation')).toHaveLength(1);\n    expect(listMessageAssignments(database, 'start', 'situation')).toHaveLength(1);
    expect(listMessageAssignments(database, 'done', 'situation')).toHaveLength(1);
    expect(listMessageAssignments(database, 'topic-goal', 'situation')).toHaveLength(1);
    expect(listMessageAssignments(database, 'song-complete', 'situation')).toHaveLength(1);
    expect(listMessageAssignments(database, 'daily-complete', 'situation')).toHaveLength(1);
    saveMessageDatabase(database, storage);
    expect(storage.getItem(MESSAGE_DATABASE_KEY)).not.toBeNull();
    expect(loadMessageDatabase(storage)).toEqual(database);
  });

  it('does not resurrect a deliberately deleted default after reload', () => {
    const storage = new MemoryStorage();
    let database = loadMessageDatabase(storage);
    const defaultAssignment = listMessageAssignments(database, 'topic-goal', 'situation')[0];
    const added = addAndAssign(database, '追加のお祝い', 'topic-goal', 'situation');
    database = removeMessageAssignment(added.database, defaultAssignment.id);
    saveMessageDatabase(database, storage);
    expect(listMessageAssignments(loadMessageDatabase(storage), 'topic-goal', 'situation').map((item) => item.text))
      .toEqual(['追加のお祝い']);
  });

  it('loads invalid data safely and filters master messages by partial text', () => {
    const storage = new MemoryStorage();
    storage.setItem(MESSAGE_DATABASE_KEY, '{broken');
    expect(listMessageAssignments(loadMessageDatabase(storage), 'start', 'situation')).toHaveLength(1);
    let database = addMasterMessage(seeded(), '  すごいね！  ');
    database = addMasterMessage(database, 'もう一回');
    expect(listMasterMessages(database, ' ごいね ').map((item) => item.text)).toEqual(['すごいね！']);
  });
});

describe('message master and assignments', () => {
  it('trims master text, refuses blank edits, and keeps assignments linked by ID', () => {
    let database = seeded();
    const result = addAndAssign(database, ' 元気にいこう ', 'start', 'situation');
    database = result.database;
    const assignmentId = listMessageAssignments(database, 'start', 'situation').find((item) => item.messageId === result.messageId)!.id;
    database = updateMasterMessage(database, result.messageId, '  はじめよう！ ');
    expect(listMessageAssignments(database, 'start', 'situation').find((item) => item.id === assignmentId)?.text).toBe('はじめよう！');
    expect(updateMasterMessage(database, result.messageId, '   ')).toEqual(database);
  });

  it('selects topic over song over situation for start and done', () => {
    let database = seeded();
    database = addAndAssign(database, '曲用', 'start', 'song', 'song-1').database;
    database = addAndAssign(database, 'お題用', 'start', 'topic', 'topic-1').database;
    expect(selectLessonMessage(database, 'start', 'song-1', 'topic-1', () => 0)).toBe('お題用');
    expect(selectLessonMessage(database, 'start', 'song-1', 'other-topic', () => 0)).toBe('曲用');
    expect(selectLessonMessage(database, 'start', 'other-song', 'other-topic', () => 0)).toBe('さあ、はじめよう！');\n    expect(selectLessonMessage(database, 'selection', undefined, undefined, () => 0)).toBe('きょうは何のお題にチャレンジする？');
    database = addAndAssign(database, 'できた専用', 'done', 'topic', 'topic-1').database;
    expect(selectLessonMessage(database, 'done', 'song-1', 'topic-1', () => 0)).toBe('できた専用');
  });

  it('achievement messages only use situation assignments, ignoring song/topic assignments', () => {
    let database = seeded();
    database = addAndAssign(database, '曲に設定したお祝い', 'topic-goal', 'situation').database;
    // Song/topic-specific assignments are forbidden for achievement situations.
    const before = database;
    const added = addMasterMessage(database, '対象外メッセージ');
    const message = listMasterMessages(added).find((item) => !listMasterMessages(before).some((old) => old.id === item.id))!;
    expect(assignMessage(added, message.id, 'topic-goal', 'topic', 'topic-1')).toEqual(added);
    expect(selectLessonMessage(database, 'topic-goal', 'song-1', 'topic-1', () => 0)).toBe('やったね！ 目標達成だよ！');
    expect(selectLessonMessage(database, 'topic-goal', 'song-1', 'topic-1', () => 0.99)).toBe('曲に設定したお祝い');
    expect(selectLessonMessage(database, 'song-complete', 'song-1', 'topic-1', () => 0)).toBe('すごい！ この曲のお題を全部クリアしたね！');
  });

  it('chooses among multiple messages randomly at the selected priority', () => {
    let database = seeded();
    database = addAndAssign(database, '候補A', 'done', 'situation').database;
    database = addAndAssign(database, '候補B', 'done', 'situation').database;
    const candidates = listMessageAssignments(database, 'done', 'situation').map((item) => item.text);
    expect(selectLessonMessage(database, 'done', undefined, undefined, () => 0)).toBe(candidates[0]);
    expect(selectLessonMessage(database, 'done', undefined, undefined, () => 0.99)).toBe(candidates[candidates.length - 1]);
  });

  it('prevents deleting the last situation assignment, but allows deleting it when another remains', () => {
    let database = seeded();
    const original = listMessageAssignments(database, 'daily-complete', 'situation')[0];
    expect(removeMessageAssignment(database, original.id)).toEqual(database);
    const added = addAndAssign(database, 'もう一つ', 'daily-complete', 'situation');
    database = removeMessageAssignment(added.database, original.id);
    expect(listMessageAssignments(database, 'daily-complete', 'situation').map((item) => item.text)).toEqual(['もう一つ']);
    expect(listMessageAssignments(database, 'daily-complete', 'situation')).toHaveLength(1);
  });

  it('allows replacing an assignment message and refuses deleting a message still assigned', () => {
    let database = seeded();
    const assignment = listMessageAssignments(database, 'start', 'situation')[0];
    const added = addMasterMessage(database, '別の始まり');
    const replacement = listMasterMessages(added).find((message) => message.text === '別の始まり')!;
    database = updateMessageAssignment(added, assignment.id, replacement.id);
    expect(listMessageAssignments(database, 'start', 'situation')[0].text).toBe('別の始まり');
    expect(softDeleteMasterMessage(database, replacement.id)).toEqual(database);
    const unassigned = addMasterMessage(database, '未割り当て');
    const loose = listMasterMessages(unassigned).find((message) => message.text === '未割り当て')!;
    expect(listMasterMessages(softDeleteMasterMessage(unassigned, loose.id)).some((message) => message.id === loose.id)).toBe(false);
  });
});
