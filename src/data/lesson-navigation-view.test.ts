import { describe, expect, it } from 'vitest';
import {
  createLessonNavigation,
  getLessonNavigationView,
  selectLessonSong,
  selectLessonTopic,
  type LessonNavigationSong,
} from './lesson-navigation';

const songs: LessonNavigationSong[] = [
  { id: 'song-a', title: '曲A', topics: [{ id: 'a-1', title: 'お題A1' }, { id: 'a-2', title: 'お題A2' }] },
  { id: 'song-b', title: '曲B', topics: [{ id: 'b-1', title: 'お題B1' }] },
];

describe('lesson navigation view model', () => {
  it('always exposes both song and topic lists in selection mode', () => {
    const state = createLessonNavigation(songs);
    expect(getLessonNavigationView(state, songs)).toEqual({
      mode: 'selection',
      showSongList: true,
      showTopicList: true,
      selectedSongId: 'song-a',
      topics: songs[0].topics,
    });
  });

  it('shows topics for the selected song after changing songs', () => {
    const state = selectLessonSong(createLessonNavigation(songs), songs, 'song-b');
    expect(getLessonNavigationView(state, songs)).toMatchObject({
      mode: 'selection',
      showSongList: true,
      showTopicList: true,
      selectedSongId: 'song-b',
      topics: songs[1].topics,
    });
  });

  it('exposes back and completion controls and labels the same-song next action', () => {
    const state = selectLessonTopic(createLessonNavigation(songs), songs, 'a-1');
    expect(getLessonNavigationView(state, songs)).toEqual({
      mode: 'lesson',
      selectedSongId: 'song-a',
      currentTopicId: 'a-1',
      backButton: true,
      completionButton: true,
      nextButtonLabel: '次のお題へ',
    });
  });

  it('changes the next action label to next song at the last topic', () => {
    const state = selectLessonTopic(createLessonNavigation(songs), songs, 'a-2');
    expect(getLessonNavigationView(state, songs)).toMatchObject({
      mode: 'lesson',
      currentTopicId: 'a-2',
      nextButtonLabel: '次の曲',
    });
  });

  it('keeps the lesson view and next-song action when at the last topic of a song', () => {
    const state = selectLessonTopic(createLessonNavigation(songs), songs, 'a-2');
    expect(getLessonNavigationView(state, songs).mode).toBe('lesson');
  });
});
