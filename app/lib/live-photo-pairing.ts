import path from 'path';

/**
 * 查找配对的 Live Photo 视频文件
 * @param imagePath 图片文件路径
 * @param availableFiles 可用的文件列表（相对路径）
 * @returns 配对的视频文件路径，如果未找到则返回 null
 */
export function findPairedLiveVideo(
  imagePath: string,
  availableFiles: string[],
): string | null {
  const dir = path.dirname(imagePath);
  const baseName = path.basename(imagePath, path.extname(imagePath));

  // 尝试多种可能的视频扩展名（不区分大小写）
  const videoExtensions = ['.MOV', '.mov', '.MP4', '.mp4', '.M4V', '.m4v'];

  // 1. 精确匹配：相同文件名，不同扩展名
  for (const ext of videoExtensions) {
    const exactMatch = path.join(dir, `${baseName}${ext}`);
    if (availableFiles.includes(exactMatch)) {
      return exactMatch;
    }
  }

  // 2. 模糊匹配：处理 IMG_1234.HEIC 和 IMG_1234_HEVC.MOV 的情况
  const pattern = new RegExp(
    `^${escapeRegex(baseName)}[_-]?(hevc|video)?\\.(mov|mp4|m4v)$`,
    'i',
  );

  for (const file of availableFiles) {
    const fileName = path.basename(file);
    const fileDir = path.dirname(file);

    // 确保在同一目录
    if (fileDir !== dir) continue;

    if (pattern.test(fileName)) {
      return file;
    }
  }

  return null;
}

/**
 * 构建 Live Photo 配对键（用于快速查找）
 * @param filePath 文件路径
 * @returns 配对键（目录 + 文件名，不含扩展名，小写）
 */
export function buildLivePhotoPairKey(filePath: string): string {
  const parsed = path.parse(filePath);
  return path.join(parsed.dir, parsed.name).toLowerCase();
}

/**
 * 转义正则表达式特殊字符
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * 构建 Live Photo 配对映射
 * @param fileList 文件列表
 * @returns 图片到视频的映射
 */
export function buildLivePhotoPairMap(
  fileList: Array<{ relativePath: string; mediaType: string }>,
): {
  pairedVideoByImage: Map<string, string>;
  pairedVideoPaths: Set<string>;
} {
  const livePhotoImageExts = new Set(['.heic', '.heif', '.jpg', '.jpeg']);
  const videoExtensions = new Set(['.mov', '.mp4', '.m4v']);

  // 构建视频文件的快速查找映射
  const videosByKey = new Map<string, string[]>();
  for (const file of fileList) {
    if (file.mediaType !== 'video') continue;

    const ext = path.extname(file.relativePath).toLowerCase();
    if (!videoExtensions.has(ext)) continue;

    const key = buildLivePhotoPairKey(file.relativePath);
    if (!videosByKey.has(key)) {
      videosByKey.set(key, []);
    }
    videosByKey.get(key)!.push(file.relativePath);
  }

  const pairedVideoByImage = new Map<string, string>();
  const pairedVideoPaths = new Set<string>();

  // 为每个图片查找配对的视频
  for (const file of fileList) {
    if (file.mediaType === 'video') continue;

    const ext = path.extname(file.relativePath).toLowerCase();
    if (!livePhotoImageExts.has(ext)) continue;

    // 1. 尝试精确匹配
    const key = buildLivePhotoPairKey(file.relativePath);
    const candidates = videosByKey.get(key);

    if (candidates && candidates.length > 0) {
      // 优先选择 .MOV 文件
      const movFile = candidates.find((v) => v.toLowerCase().endsWith('.mov'));
      const pairedPath = movFile || candidates[0];

      pairedVideoByImage.set(file.relativePath, pairedPath);
      pairedVideoPaths.add(pairedPath);
      continue;
    }

    // 2. 尝试模糊匹配
    const dir = path.dirname(file.relativePath);
    const baseName = path.basename(file.relativePath, ext);
    const pattern = new RegExp(
      `^${escapeRegex(baseName)}[_-]?(hevc|video)?\\.(mov|mp4|m4v)$`,
      'i',
    );

    for (const videoFile of fileList) {
      if (videoFile.mediaType !== 'video') continue;

      const videoFileName = path.basename(videoFile.relativePath);
      const videoDir = path.dirname(videoFile.relativePath);

      if (videoDir !== dir) continue;

      if (pattern.test(videoFileName)) {
        pairedVideoByImage.set(file.relativePath, videoFile.relativePath);
        pairedVideoPaths.add(videoFile.relativePath);
        break;
      }
    }
  }

  return { pairedVideoByImage, pairedVideoPaths };
}
