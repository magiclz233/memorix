import { promises as fs } from 'fs';
import path from 'path';
import sharp from 'sharp';
import { encode } from 'blurhash';

export type ImageThumbnailResult = {
  blurHash: string | null;
};

const buildBlurHash = async (buffer: Buffer): Promise<string | null> => {
  try {
    const { data, info } = await sharp(buffer)
      .raw()
      .ensureAlpha()
      .resize(32, 32, { fit: 'inside' })
      .toBuffer({ resolveWithObject: true });

    return encode(new Uint8ClampedArray(data), info.width, info.height, 4, 4);
  } catch (error) {
    console.warn('BlurHash generation failed:', error);
    return null;
  }
};

export async function detectAnimatedImage(filePath: string): Promise<boolean> {
  try {
    const metadata = await sharp(filePath, { animated: true }).metadata();
    return typeof metadata.pages === 'number' && metadata.pages > 1;
  } catch {
    return false;
  }
}

export async function generateImageThumbnail(
  filePath: string,
  targetPath: string,
  maxWidth = 960,
): Promise<ImageThumbnailResult | null> {
  try {
    const ext = path.extname(filePath).toLowerCase();
    const isHeic = ext === '.heic' || ext === '.heif';
    let imageBuffer: Buffer;

    try {
      imageBuffer = await sharp(filePath, { animated: true, pages: 1 })
        .resize({ width: maxWidth, withoutEnlargement: true })
        .webp({ quality: 82 })
        .toBuffer();
    } catch (error) {
      if (!isHeic) {
        throw error;
      }
      const inputBuffer = await fs.readFile(filePath);
      const { default: heicConvert } = await import('heic-convert');
      const converted = await heicConvert({
        buffer: inputBuffer as any,
        format: 'JPEG',
        quality: 0.92,
      });
      imageBuffer = await sharp(converted)
        .resize({ width: maxWidth, withoutEnlargement: true })
        .webp({ quality: 82 })
        .toBuffer();
    }

    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.writeFile(targetPath, imageBuffer);

    return {
      blurHash: await buildBlurHash(imageBuffer),
    };
  } catch (error) {
    console.warn('Image thumbnail generation failed:', filePath, error);
    return null;
  }
}
