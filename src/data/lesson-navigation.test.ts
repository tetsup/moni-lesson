import { describe, expect, it } from 'vitest';
import {
  advanceLessonNavigation,
  createLessonNavigation,
  returnToLessonSelection,
  selectLessonSong,
  selectLessonTopic,
  type LessonNavigationSong,
} from './lesson-navigation';

const songs: LessonNavigationSong[] = [
  { id: 'song-a', title: '曲A', topics: [{ id: 'a-1', title: 'お題A1' }, { id: 'a-2', title: 'お題A2' }] },
  { id: 'song-b', title: '曲B', topics: [{ id: 'b-1', title: 'お題B1' }] },
];

describe('lesson navigation state transitions', () => {
  it('starts in selection mode with the first song selected', () => {
    expect(createLessonNavigation(songs)).toEqual({
      mode: 'selection',
      selectedSongId: 'song-a',
      currentTopicId: null,
    });
  });

  it('changes the selected song without leaving selection mode', () => {
    const initial = createLessonNavigation(songs);
    expect(selectLessonSong(initial, songs, 'song-b')).toEqual({
      mode: 'selection',
      selectedSongId: 'song-b',
      currentTopicId: null,
    });
  });

  it('enters lesson mode only after selecting a topic from the selected song', () => {
    const initial = createLessonNavigation(songs);
    expect(selectLessonTopic(initial, songs, 'a-2')).toEqual({
      mode: 'lesson',
      selectedSongId: 'song-a',
      currentTopicId: 'a-2',
    });
  });

  it('does not enter lesson mode for a topic belonging to another song', () => {
    const initial = createLessonNavigation(songs);
    expect(selectLessonTopic(initial, songs, 'b-1')).toBe(initial);
  });

  it('returns to selection mode only through the back transition and preserves the current selection', () => {
    const lesson = selectLessonTopic(createLessonNavigation(songs), songs, 'a-2');
    expect(returnToLessonSelection(lesson)).toEqual({
      mode: 'selection',
      selectedSongId: 'song-a',
      currentTopicId: 'a-2',
    });
  });

  it('advances to the next topic while staying in lesson mode', () => {
    const lesson = selectLessonTopic(createLessonNavigation(songs), songs, 'a-1');
    expect(advanceLessonNavigation(lesson, songs)).toEqual({
      mode: 'lesson',
      selectedSongId: 'song-a',
      currentTopicId: 'a-2',
    });
  });

  it('moves to the next song first topic while staying in lesson mode', () => {
    const lesson = selectLessonTopic(createLessonNavigation(songs), songs, 'a-2');
    expect(advanceLessonNavigation(lesson, songs)).toEqual({
      mode: 'lesson',
      selectedSongId: 'song-b',
      currentTopicId: 'b-1',
    });
  });

  it('does not leave lesson mode when advancing past the last available song', () => {
    const lesson = selectLessonTopic(createLessonNavigation(songs), songs, 'b-1');
    expect(advanceLessonNavigation(lesson, songs)).toEqual(lesson);
  });
});
