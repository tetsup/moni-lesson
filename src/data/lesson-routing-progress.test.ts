import { describe, expect, it } from 'vitest';
import {
  getLessonPrimaryAction,
  resolveLessonAction,
  type LessonProgress,
} from './lesson-routing';

const progress = (songIndex: number, topicIndex: number): LessonProgress => ({
  songs: [
    { songId: 'song-a', topicIds: ['topic-1', 'topic-2'] },
    { songId: 'song-b', topicIds: ['topic-3'] },
  ],
  currentSongIndex: songIndex,
  currentTopicIndex: topicIndex,
});

describe('lesson primary action', () => {
  it('keeps the next-topic action while another topic remains in the song', () => {
    expect(getLessonPrimaryAction(progress(0, 0))).toEqual({
      label: '次のお題へ',
      action: 'advance',
    });
  });

  it('keeps the next-song action when the current song ends but another song remains', () => {
    expect(getLessonPrimaryAction(progress(0, 1))).toEqual({
      label: '次の曲',
      action: 'advance',
    });
  });

  it('switches to lesson completion only at the last topic of the last song', () => {
    expect(getLessonPrimaryAction(progress(1, 0))).toEqual({
      label: 'レッスン終了！',
      action: 'finish',
    });
  });
});

describe('lesson primary action transition', () => {
  it('advances to the next topic without finishing', () => {
    expect(resolveLessonAction(progress(0, 0), 'advance')).toEqual({
      type: 'advance',
      songIndex: 0,
      topicIndex: 1,
    });
  });

  it('advances to the first topic of the next song without finishing', () => {
    expect(resolveLessonAction(progress(0, 1), 'advance')).toEqual({
      type: 'advance',
      songIndex: 1,
      topicIndex: 0,
    });
  });

  it('transitions to the completion screen when finish is pressed on the final topic', () => {
    expect(resolveLessonAction(progress(1, 0), 'finish')).toEqual({
      type: 'navigate',
      route: 'complete',
    });
  });

  it('does not finish when finish is requested before the final topic', () => {
    expect(resolveLessonAction(progress(0, 0), 'finish')).toEqual({
      type: 'invalid',
    });
  });
});
