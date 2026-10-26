export const RECORDINGS_DATABASE_NAME = 'moni-lesson-recordings';
export const RECORDINGS_STORE_NAME = 'recordings';
export const RECORDINGS_DIRECTORY = 'recordings';

export type LessonRecording = {
  id: string;
  filePath: string;
  recordedAt: string;
  songId: string;
  songTitle: string;
  topicId: string;
  topicTitle: string;
  attemptNumber: number;
  durationMs: number;
  mimeType: string;
  fileSize: number;
};

const openRecordingsDatabase = (): Promise<IDBDatabase> => new Promise((resolve, reject) => {
  const request = indexedDB.open(RECORDINGS_DATABASE_NAME, 1);
  request.onupgradeneeded = () => {
    const database = request.result;
    if (!database.objectStoreNames.contains(RECORDINGS_STORE_NAME)) {
      const store = database.createObjectStore(RECORDINGS_STORE_NAME, { keyPath: 'id' });
      store.createIndex('songTopic', ['songId', 'topicId'], { unique: false });
      store.createIndex('recordedAt', 'recordedAt', { unique: false });
    }
  };
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error ?? new Error('録音データベースを開けませんでした'));
});

export const listLessonRecordings = async (): Promise<LessonRecording[]> => {
  const database = await openRecordingsDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const request = database.transaction(RECORDINGS_STORE_NAME, 'readonly')
        .objectStore(RECORDINGS_STORE_NAME).getAll();
      request.onsuccess = () => resolve(request.result as LessonRecording[]);
      request.onerror = () => reject(request.error ?? new Error('録音一覧を読み込めませんでした'));
    });
  } finally {
    database.close();
  }
};

export const saveLessonRecording = async (recording: LessonRecording): Promise<void> => {
  const database = await openRecordingsDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(RECORDINGS_STORE_NAME, 'readwrite');
      transaction.objectStore(RECORDINGS_STORE_NAME).put(recording);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error('録音情報を保存できませんでした'));
      transaction.onabort = () => reject(transaction.error ?? new Error('録音情報の保存が中断されました'));
    });
  } finally {
    database.close();
  }
};

export const nextRecordingAttemptNumber = async (songId: string, topicId: string): Promise<number> => {
  const recordings = await listLessonRecordings();
  return recordings.reduce((max, item) =>
    item.songId === songId && item.topicId === topicId
      ? Math.max(max, item.attemptNumber)
      : max, 0) + 1;
};

export const getRecordingsDirectory = async (): Promise<FileSystemDirectoryHandle> => {
  if (!navigator.storage?.getDirectory) {
    throw new Error('このブラウザは端末内録音ファイルの保存に対応していません');
  }
  const root = await navigator.storage.getDirectory();
  return root.getDirectoryHandle(RECORDINGS_DIRECTORY, { create: true });
};
