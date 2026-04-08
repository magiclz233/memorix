import type { FileStatus, UploadFile } from '@/app/lib/definitions';

const DB_NAME = 'upload-progress';
const DB_VERSION = 1;
const FILE_STORE = 'files';

type ProgressRecord = {
  id: string;
  taskId: string;
  fileId: string;
  progress: number;
  uploadedSize: number;
  status: FileStatus;
  updatedAt: number;
};

function isBrowser() {
  return typeof window !== 'undefined' && typeof indexedDB !== 'undefined';
}

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(FILE_STORE)) {
        const fileStore = db.createObjectStore(FILE_STORE, { keyPath: 'id' });
        fileStore.createIndex('taskId', 'taskId', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function requestToPromise<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transactionToPromise(transaction: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

export async function saveProgress(taskId: string, file: UploadFile) {
  if (!isBrowser()) {
    return;
  }

  const db = await openDatabase();
  const tx = db.transaction(FILE_STORE, 'readwrite');
  const store = tx.objectStore(FILE_STORE);

  const record: ProgressRecord = {
    id: `${taskId}:${file.id}`,
    taskId,
    fileId: file.id,
    progress: file.progress,
    uploadedSize: file.uploadedSize,
    status: file.status,
    updatedAt: Date.now(),
  };

  store.put(record);
  await transactionToPromise(tx);
  db.close();
}

export async function resumeUpload(taskId: string) {
  if (!isBrowser()) {
    return new Map<string, ProgressRecord>();
  }

  const db = await openDatabase();
  const tx = db.transaction(FILE_STORE, 'readonly');
  const store = tx.objectStore(FILE_STORE);
  const index = store.index('taskId');

  const records = (await requestToPromise(
    index.getAll(IDBKeyRange.only(taskId)),
  )) as ProgressRecord[];

  await transactionToPromise(tx);
  db.close();

  return new Map(records.map((record) => [record.fileId, record]));
}

export async function clearTaskProgress(taskId: string) {
  if (!isBrowser()) {
    return;
  }

  const db = await openDatabase();
  const tx = db.transaction(FILE_STORE, 'readwrite');
  const store = tx.objectStore(FILE_STORE);
  const index = store.index('taskId');

  const keys = (await requestToPromise(
    index.getAllKeys(IDBKeyRange.only(taskId)),
  )) as IDBValidKey[];

  for (const key of keys) {
    store.delete(key);
  }

  await transactionToPromise(tx);
  db.close();
}