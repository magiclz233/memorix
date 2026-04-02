import archiver from 'archiver';
import fs from 'fs';
import { promises as fsPromises } from 'fs';
import path from 'path';
import { Readable } from 'stream';

export type FileToZip = {
  absolutePath: string;
  fileName: string;
};

/**
 * 创建 ZIP 文件（流式）
 * @param files 要打包的文件列表
 * @param outputPath ZIP 文件输出路径
 * @returns ZIP 文件路径
 */
export async function createZipFromFiles(
  files: FileToZip[],
  outputPath: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    // 确保输出目录存在
    const outputDir = path.dirname(outputPath);
    fs.mkdirSync(outputDir, { recursive: true });

    // 创建输出流
    const output = fs.createWriteStream(outputPath);
    const archive = archiver('zip', {
      zlib: { level: 6 }, // 压缩级别 (0-9)
    });

    // 监听完成事件
    output.on('close', () => {
      resolve(outputPath);
    });

    // 监听错误事件
    archive.on('error', (err) => {
      reject(err);
    });

    output.on('error', (err) => {
      reject(err);
    });

    // 连接输出流
    archive.pipe(output);

    // 添加文件到 ZIP
    for (const file of files) {
      try {
        if (fs.existsSync(file.absolutePath)) {
          archive.file(file.absolutePath, { name: file.fileName });
        }
      } catch (error) {
        console.error(`Failed to add file to ZIP: ${file.fileName}`, error);
      }
    }

    // 完成打包
    archive.finalize();
  });
}

/**
 * 创建 ZIP 文件流（用于直接响应）
 * @param files 要打包的文件列表
 * @returns ZIP 文件流
 */
export function createZipStream(files: FileToZip[]): Readable {
  const archive = archiver('zip', {
    zlib: { level: 6 },
  });

  // 添加文件到 ZIP
  for (const file of files) {
    try {
      if (fs.existsSync(file.absolutePath)) {
        archive.file(file.absolutePath, { name: file.fileName });
      }
    } catch (error) {
      console.error(`Failed to add file to ZIP: ${file.fileName}`, error);
    }
  }

  // 完成打包
  archive.finalize();

  return archive as unknown as Readable;
}

/**
 * 清理临时 ZIP 文件
 * @param olderThan 清理多少毫秒之前的文件
 * @param tempDir 临时目录路径
 */
export async function cleanupTempFiles(
  olderThan: number,
  tempDir: string
): Promise<number> {
  try {
    const files = await fsPromises.readdir(tempDir);
    const now = Date.now();
    let cleanedCount = 0;

    for (const file of files) {
      if (!file.endsWith('.zip')) continue;

      const filePath = path.join(tempDir, file);
      try {
        const stats = await fsPromises.stat(filePath);
        const age = now - stats.mtimeMs;

        if (age > olderThan) {
          await fsPromises.unlink(filePath);
          cleanedCount++;
        }
      } catch (error) {
        console.error(`Failed to clean up file: ${filePath}`, error);
      }
    }

    return cleanedCount;
  } catch (error) {
    console.error('Failed to cleanup temp files:', error);
    return 0;
  }
}
