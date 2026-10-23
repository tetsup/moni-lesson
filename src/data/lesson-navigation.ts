export type LessonNavigationSong = {
  id: string;
  title: string;
  topics: Array<{ id: string; title: string }>;
};

export type LessonScreenMode = 'selection' | 'lesson';

export type LessonNavigationState = {
  mode: LessonScreenMode;
  selectedSongId: string;
  currentTopicId: string | null;
};

export type LessonNavigationView =
  | {
      mode: 'selection';
      showSongList: true;
      showTopicList: true;
      selectedSongId: string;
      topics: Array<{ id: string; title: string }>;
    }
  | {
      mode: 'lesson';
      selectedSongId: string;
      currentTopicId: string;
      backButton: true;
      completionButton: true;
      nextButtonLabel: '次のお題へ' | '次の曲';
    };

const findSong = (songs: LessonNavigationSong[], songId: string) =>
  songs.find((song) => song.id === songId);

export const createLessonNavigation = (
  songs: LessonNavigationSong[],
): LessonNavigationState => ({
  mode: 'selection',
  selectedSongId: songs[0]?.id ?? '',
  currentTopicId: null,
});

export const selectLessonSong = (
  state: LessonNavigationState,
  songs: LessonNavigationSong[],
  songId: string,
): LessonNavigationState => {
  if (state.mode !== 'selection' || !findSong(songs, songId)) return state;
  return { ...state, selectedSongId: songId, currentTopicId: null };
};

export const selectLessonTopic = (
  state: LessonNavigationState,
  songs: LessonNavigationSong[],
  topicId: string,
): LessonNavigationState => {
  if (state.mode !== 'selection') return state;
  const song = findSong(songs, state.selectedSongId);
  if (!song?.topics.some((topic) => topic.id === topicId)) return state;
  return { ...state, mode: 'lesson', currentTopicId: topicId };
};

export const returnToLessonSelection = (
  state: LessonNavigationState,
): LessonNavigationState =>
  state.mode === 'lesson' ? { ...state, mode: 'selection' } : state;

export const advanceLessonNavigation = (
  state: LessonNavigationState,
  songs: LessonNavigationSong[],
): LessonNavigationState => {
  if (state.mode !== 'lesson' || !state.currentTopicId) return state;

  const songIndex = songs.findIndex((song) => song.id === state.selectedSongId);
  const song = songs[songIndex];
  const topicIndex = song?.topics.findIndex((topic) => topic.id === state.currentTopicId) ?? -1;
  if (!song || topicIndex < 0) return state;

  const nextTopic = song.topics[topicIndex + 1];
  if (nextTopic) return { ...state, currentTopicId: nextTopic.id };

  const nextSong = songs[songIndex + 1];
  const firstTopic = nextSong?.topics[0];
  if (nextSong && firstTopic) {
    return {
      ...state,
      selectedSongId: nextSong.id,
      currentTopicId: firstTopic.id,
    };
  }

  return state;
};

export const getLessonNavigationView = (
  state: LessonNavigationState,
  songs: LessonNavigationSong[],
): LessonNavigationView => {
  if (state.mode === 'selection') {
    const song = findSong(songs, state.selectedSongId);
    return {
      mode: 'selection',
      showSongList: true,
      showTopicList: true,
      selectedSongId: state.selectedSongId,
      topics: song?.topics ?? [],
    };
  }

  const songIndex = songs.findIndex((song) => song.id === state.selectedSongId);
  const song = songs[songIndex];
  const topicIndex = song?.topics.findIndex((topic) => topic.id === state.currentTopicId) ?? -1;
  const isLastTopicOfSong = !!song && topicIndex === song.topics.length - 1;
  const hasNextSong = !!songs[songIndex + 1]?.topics[0];

  return {
    mode: 'lesson',
    selectedSongId: state.selectedSongId,
    currentTopicId: state.currentTopicId ?? '',
    backButton: true,
    completionButton: true,
    nextButtonLabel: isLastTopicOfSong && hasNextSong ? '次の曲' : '次のお題へ',
  };
};
