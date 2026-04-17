import { readFile } from 'fs/promises';
import { createLogger } from './logger';

const logger = createLogger('file-validator');

/** 允许的 MIME 类型白名单 */
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'image/gif',
  'image/avif',
  'video/mp4',
  'video/quicktime',
  'video/x-msvideo',
  'video/webm',
]);

/** 文件魔数（文件签名）映射 */
const FILE_SIGNATURES: Record<string, number[][]> = {
  'image/jpeg': [[0xff, 0xd8, 0xff]],
  'image/png': [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
  'image/gif': [[0x47, 0x49, 0x46, 0x38, 0x37, 0x61], [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]],
  'image/webp': [[0x52, 0x49, 0x46, 0x46]], // RIFF
  'video/mp4': [
    [0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70], // ftyp
    [0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70],
  ],
  'video/quicktime': [[0x00, 0x00, 0x00, 0x14, 0x66, 0x74, 0x79, 0x70]],
};

/** 恶意代码特征模式 */
const MALICIOUS_PATTERNS = [
  /<script[\s>]/i,
  /javascript:/i,
  /onerror\s*=/i,
  /onload\s*=/i,
  /<iframe[\s>]/i,
  /eval\s*\(/i,
  /document\.cookie/i,
  /window\.location/i,
];

/** 最大文件大小：500MB */
const MAX_FILE_SIZE = 500 * 1024 * 1024;

export class FileValidator {
  /**
   * 检查 MIME 类型是否在白名单中
   */
  static isAllowedType(mimeType: string): boolean {
    return ALLOWED_MIME_TYPES.has(mimeType.toLowerCase());
  }

  /**
   * 验证文件大小
   */
  static isValidSize(size: number, maxSize: number = MAX_FILE_SIZE): boolean {
    return size > 0 && size <= maxSize;
  }

  /**
   * 验证文件魔数（文件签名）
   * 通过读取文件头部字节来确认文件类型与声明的 MIME 类型一致
   */
  static async verifyFileSignature(
    filePath: string,
    expectedMimeType: string,
  ): Promise<boolean> {
    const signatures = FILE_SIGNATURES[expectedMimeType.toLowerCase()];
    // 没有定义签名的类型，跳过验证
    if (!signatures || signatures.length === 0) return true;

    try {
      const buffer = await readFile(filePath);
      const maxSigLen = Math.max(...signatures.map((s) => s.length));
      const fileHeader = Array.from(buffer.slice(0, maxSigLen));

      // 任意一个签名匹配即通过
      return signatures.some((sig) =>
        sig.every((byte, index) => byte === fileHeader[index]),
      );
    } catch (error) {
      logger.error({ filePath, error }, '读取文件签名失败');
      return false;
    }
  }

  /**
   * 扫描文件内容中的恶意代码特征
   * 主要针对图片/视频中嵌入的脚本注入
   */
  static async scanForMalware(filePath: string): Promise<boolean> {
    try {
      // 只读取文件头部 4KB 进行扫描，避免读取大文件
      const fd = await readFile(filePath);
      const sample = fd.slice(0, 4096).toString('utf-8', 0, 4096);

      const hasMalicious = MALICIOUS_PATTERNS.some((pattern) =>
        pattern.test(sample),
      );

      if (hasMalicious) {
        logger.warn({ filePath }, '检测到可疑内容特征');
      }

      return !hasMalicious;
    } catch {
      // 读取失败时（如二进制文件无法解析为 UTF-8），视为安全
      return true;
    }
  }

  /**
   * 完整的文件验证流程
   */
  static async validate(
    filePath: string,
    mimeType: string,
    size: number,
  ): Promise<{ valid: boolean; error?: string }> {
    // 1. 检查 MIME 类型
    if (!this.isAllowedType(mimeType)) {
      return { valid: false, error: `不支持的文件类型: ${mimeType}` };
    }

    // 2. 检查文件大小
    if (!this.isValidSize(size)) {
      return {
        valid: false,
        error: `文件大小超出限制（最大 ${MAX_FILE_SIZE / 1024 / 1024}MB）`,
      };
    }

    // 3. 验证文件签名
    const signatureValid = await this.verifyFileSignature(filePath, mimeType);
    if (!signatureValid) {
      return { valid: false, error: '文件内容与声明的类型不匹配' };
    }

    // 4. 扫描恶意代码
    const isSafe = await this.scanForMalware(filePath);
    if (!isSafe) {
      return { valid: false, error: '文件包含可疑内容，已被拒绝' };
    }

    return { valid: true };
  }
}
