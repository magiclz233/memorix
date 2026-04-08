import type { UploadFile, UploadTask } from '@/app/lib/definitions';

const DB_NAME = 'upload-center';
const DB_VERSION = 1;
const TASK_STORE = 'tasks';
const FILE_STORE = 'files';

type StoredTask = Omit<UploadTask, 'files'> & {
  fileIds: string[];
};

type StoredFile = UploadFile & {
  key: string;
  taskId: string;
};

function isBrowser() {
  return typeof window !== 'undefined' && typeof indexedDB !== 'undefined';
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

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(TASK_STORE)) {
        db.createObjectStore(TASK_STORE, { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains(FILE_STORE)) {
        const fileStore = db.createObjectStore(FILE_STORE, { keyPath: 'key' });
        fileStore.createIndex('taskId', 'taskId', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveTasks(tasks: UploadTask[]) {
  if (!isBrowser()) {
    return;
  }

  const db = await openDatabase();
  const tx = db.transaction([TASK_STORE, FILE_STORE], 'readwrite');
  const taskStore = tx.objectStore(TASK_STORE);
  const fileStore = tx.objectStore(FILE_STORE);

  taskStore.clear();
  fileStore.clear();

  for (const task of tasks) {
    const storedTask: StoredTask = {
      ...task,
      fileIds: task.files.map((file) => file.id),
    };

    taskStore.put(storedTask);

    for (const file of task.files) {
      const storedFile: StoredFile = {
        ...file,
        key: `${task.id}:${file.id}`,
        taskId: task.id,
      };
      fileStore.put(storedFile);
    }
  }

  await transactionToPromise(tx);
  db.close();
}

export async function getTasks() {
  if (!isBrowser()) {
    return [] as UploadTask[];
  }

  const db = await openDatabase();
  const tx = db.transaction([TASK_STORE, FILE_STORE], 'readonly');
  const taskStore = tx.objectStore(TASK_STORE);
  const fileStore = tx.objectStore(FILE_STORE);

  const storedTasks = (await requestToPromise(
    taskStore.getAll(),
  )) as StoredTask[];
  const storedFiles = (await requestToPromise(
    fileStore.getAll(),
  )) as StoredFile[];

  await transactionToPromise(tx);
  db.close();

  const fileMap = new Map<string, UploadFile[]>();

  for (const storedFile of storedFiles) {
    const list = fileMap.get(storedFile.taskId) ?? [];
    const { key: _key, ...file } = storedFile;
    list.push(file);
    fileMap.set(storedFile.taskId, list);
  }

  return storedTasks
    .map((task) => {
      const { fileIds, ...taskInfo } = task;
      const files = fileMap.get(task.id) ?? [];
      const sortedFiles = fileIds
        .map((id) => files.find((file) => file.id === id))
        .filter((file): file is UploadFile => Boolean(file));

      return {
        ...taskInfo,
        files: sortedFiles,
      } satisfies UploadTask;
    })
    .sort((a, b) => Number(new Date(b.createdAt)) - Number(new Date(a.createdAt)));
}

export async function saveTask(task: UploadTask) {
  const tasks = await getTasks();
  const index = tasks.findIndex((item) => item.id === task.id);

  if (index >= 0) {
    tasks[index] = task;
  } else {
    tasks.unshift(task);
  }

  await saveTasks(tasks);
}

export async function updateTask(
  taskId: string,
  updater: (task: UploadTask) => UploadTask,
) {
  const tasks = await getTasks();
  const index = tasks.findIndex((task) => task.id === taskId);

  if (index < 0) {
    return null;
  }

  const updated = updater(tasks[index]);
  tasks[index] = updated;
  await saveTasks(tasks);

  return updated;
}

export async function deleteTask(taskId: string) {
  const tasks = await getTasks();
  const nextTasks = tasks.filter((task) => task.id !== taskId);
  await saveTasks(nextTasks);
}