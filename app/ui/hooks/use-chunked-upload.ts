import { useState, useCallback } from 'react';
import SparkMD5 from 'spark-md5';

const DEFAULT_CHUNK_SIZE = 5 * 1024 * 1024; // 5MB

export type UploadStatus = 'idle' | 'hashing' | 'uploading' | 'completed' | 'error';

export interface ChunkedUploadProgress {
  status: UploadStatus;
  progress: number; // 0-100
  uploadedChunks: number;
  totalChunks: number;
  error?: string;
}

export interface ChunkedUploadResult {
  fileId: number;
  file: {
    id: number;
    title: string;
    url: string;
    mimeType: string;
    size: number;
  };
}

interface UseChunkedUploadOptions {
  storageId: number;
  targetPath: string;
  chunkSize?: number;
  onProgress?: (progress: ChunkedUploadProgress) => void;
  onComplete?: (result: ChunkedUploadResult) => void;
  onError?: (error: string) => void;
}

export function useChunkedUpload({
  storageId,
  targetPath,
  chunkSize = DEFAULT_CHUNK_SIZE,
  onProgress,
  onComplete,
  onError,
}: UseChunkedUploadOptions) {
  const [progress, setProgress] = useState<ChunkedUploadProgress>({
    status: 'idle',
    progress: 0,
    uploadedChunks: 0,
    totalChunks: 0,
  });

  const updateProgress = useCallback(
    (update: Partial<ChunkedUploadProgress>) => {
      setProgress((prev) => {
        const newProgress = { ...prev, ...update };
        onProgress?.(newProgress);
        return newProgress;
      });
    },
    [onProgress],
  );

  const calculateFileHash = useCallback(
    async (file: File): Promise<string> => {
      return new Promise((resolve, reject) => {
        const spark = new SparkMD5.ArrayBuffer();
        const fileReader = new FileReader();
        const chunks = Math.ceil(file.size / chunkSize);
        let currentChunk = 0;

        fileReader.onload = (e) => {
          if (e.target?.result) {
            spark.append(e.target.result as ArrayBuffer);
            currentChunk++;

            const hashProgress = (currentChunk / chunks) * 100;
            updateProgress({
              status: 'hashing',
              progress: hashProgress,
            });

            if (currentChunk < chunks) {
              loadNext();
            } else {
              const hash = spark.end();
              resolve(hash);
            }
          }
        };

        fileReader.onerror = () => {
          reject(new Error('Failed to read file'));
        };

        const loadNext = () => {
          const start = currentChunk * chunkSize;
          const end = Math.min(start + chunkSize, file.size);
          fileReader.readAsArrayBuffer(file.slice(start, end));
        };

        loadNext();
      });
    },
    [chunkSize, updateProgress],
  );

  const uploadFile = useCallback(
    async (file: File) => {
      try {
        updateProgress({
          status: 'hashing',
          progress: 0,
          uploadedChunks: 0,
          totalChunks: 0,
          error: undefined,
        });

        // Calculate file hash
        const fileHash = await calculateFileHash(file);

        // Initialize upload
        updateProgress({ status: 'uploading', progress: 0 });

        const initResponse = await fetch('/api/upload/init', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: file.name,
            fileSize: file.size,
            fileHash,
            mimeType: file.type,
            storageId,
            targetPath,
            chunkSize,
          }),
        });

        if (!initResponse.ok) {
          const error = await initResponse.json();
          throw new Error(error.error || 'Failed to initialize upload');
        }

        const initData = await initResponse.json();

        // Check for instant upload
        if (initData.instantUpload) {
          updateProgress({
            status: 'completed',
            progress: 100,
            uploadedChunks: 1,
            totalChunks: 1,
          });
          onComplete?.({
            fileId: initData.fileId,
            file: {
              id: initData.fileId,
              title: file.name,
              url: '',
              mimeType: file.type,
              size: file.size,
            },
          });
          return;
        }

        const { uploadId, chunkSize: serverChunkSize, totalChunks, uploadedChunks } = initData;

        updateProgress({
          totalChunks,
          uploadedChunks: uploadedChunks.length,
        });

        // Upload chunks
        const uploadedChunkSet = new Set(uploadedChunks);

        for (let i = 0; i < totalChunks; i++) {
          // Skip already uploaded chunks
          if (uploadedChunkSet.has(i)) {
            continue;
          }

          const start = i * serverChunkSize;
          const end = Math.min(start + serverChunkSize, file.size);
          const chunkBlob = file.slice(start, end);

          // Calculate chunk hash
          const chunkBuffer = await chunkBlob.arrayBuffer();
          const chunkHash = SparkMD5.ArrayBuffer.hash(chunkBuffer);

          // Upload chunk
          const formData = new FormData();
          formData.append('uploadId', uploadId);
          formData.append('chunkIndex', i.toString());
          formData.append('chunkHash', chunkHash);
          formData.append('chunk', new Blob([chunkBuffer]));

          const chunkResponse = await fetch('/api/upload/chunk', {
            method: 'POST',
            body: formData,
          });

          if (!chunkResponse.ok) {
            const error = await chunkResponse.json();
            throw new Error(error.error || 'Failed to upload chunk');
          }

          const chunkData = await chunkResponse.json();

          // Update progress
          const uploadProgress = (chunkData.uploadedChunks / totalChunks) * 100;
          updateProgress({
            progress: uploadProgress,
            uploadedChunks: chunkData.uploadedChunks,
          });
        }

        // Complete upload
        const completeResponse = await fetch('/api/upload/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uploadId }),
        });

        if (!completeResponse.ok) {
          const error = await completeResponse.json();
          throw new Error(error.error || 'Failed to complete upload');
        }

        const completeData = await completeResponse.json();

        updateProgress({
          status: 'completed',
          progress: 100,
        });

        onComplete?.(completeData);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Upload failed';
        updateProgress({
          status: 'error',
          error: errorMessage,
        });
        onError?.(errorMessage);
      }
    },
    [
      storageId,
      targetPath,
      chunkSize,
      calculateFileHash,
      updateProgress,
      onComplete,
      onError,
    ],
  );

  return {
    uploadFile,
    progress,
  };
}
