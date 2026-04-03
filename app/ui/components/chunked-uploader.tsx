'use client';

import { useRef, useState } from 'react';
import { useChunkedUpload, type ChunkedUploadProgress } from '@/app/ui/hooks/use-chunked-upload';

interface ChunkedUploaderProps {
  storageId: number;
  targetPath: string;
  onComplete?: (result: { fileId: number }) => void;
  onError?: (error: string) => void;
  accept?: string;
  maxSize?: number; // in bytes
}

export function ChunkedUploader({
  storageId,
  targetPath,
  onComplete,
  onError,
  accept = 'image/*,video/*',
  maxSize = 5 * 1024 * 1024 * 1024, // 5GB default
}: ChunkedUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<ChunkedUploadProgress | null>(null);

  const { uploadFile, progress } = useChunkedUpload({
    storageId,
    targetPath,
    onProgress: setUploadProgress,
    onComplete: (result) => {
      setSelectedFile(null);
      setUploadProgress(null);
      onComplete?.(result);
    },
    onError: (error) => {
      onError?.(error);
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size
    if (file.size > maxSize) {
      onError?.(`File size exceeds maximum allowed size of ${(maxSize / 1024 / 1024 / 1024).toFixed(1)}GB`);
      return;
    }

    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    await uploadFile(selectedFile);
  };

  const handleCancel = () => {
    setSelectedFile(null);
    setUploadProgress(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
    return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
  };

  const getStatusText = () => {
    if (!uploadProgress) return '';

    switch (uploadProgress.status) {
      case 'hashing':
        return 'Calculating file hash...';
      case 'uploading':
        return `Uploading: ${uploadProgress.uploadedChunks} / ${uploadProgress.totalChunks} chunks`;
      case 'completed':
        return 'Upload completed!';
      case 'error':
        return `Error: ${uploadProgress.error}`;
      default:
        return '';
    }
  };

  const isUploading = uploadProgress?.status === 'hashing' || uploadProgress?.status === 'uploading';

  return (
    <div className="w-full max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <div className="space-y-4">
        {/* File Input */}
        <div>
          <label
            htmlFor="file-upload"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Select File
          </label>
          <input
            ref={fileInputRef}
            id="file-upload"
            type="file"
            accept={accept}
            onChange={handleFileSelect}
            disabled={isUploading}
            className="block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-md file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-50 file:text-blue-700
              hover:file:bg-blue-100
              disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        {/* Selected File Info */}
        {selectedFile && (
          <div className="p-4 bg-gray-50 rounded-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {formatFileSize(selectedFile.size)} • {selectedFile.type}
                </p>
              </div>
              {!isUploading && (
                <button
                  onClick={handleCancel}
                  className="text-sm text-red-600 hover:text-red-800"
                >
                  Remove
                </button>
              )}
            </div>
          </div>
        )}

        {/* Progress Bar */}
        {uploadProgress && uploadProgress.status !== 'idle' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-700">{getStatusText()}</span>
              <span className="text-gray-500">{uploadProgress.progress.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className={`h-2.5 rounded-full transition-all duration-300 ${
                  uploadProgress.status === 'error'
                    ? 'bg-red-600'
                    : uploadProgress.status === 'completed'
                      ? 'bg-green-600'
                      : 'bg-blue-600'
                }`}
                style={{ width: `${uploadProgress.progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Upload Button */}
        {selectedFile && !uploadProgress && (
          <button
            onClick={handleUpload}
            disabled={isUploading}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded-md
              hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors duration-200"
          >
            Start Upload
          </button>
        )}

        {/* Cancel Button During Upload */}
        {isUploading && (
          <button
            onClick={handleCancel}
            className="w-full py-2 px-4 bg-gray-600 text-white rounded-md
              hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500
              transition-colors duration-200"
          >
            Cancel Upload
          </button>
        )}
      </div>
    </div>
  );
}
