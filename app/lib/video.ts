import { execFile } from 'child_process';
import { promisify } from 'util';
import { promises as fs, existsSync } from 'fs';
import path from 'path';
import os from 'os';
import sharp from 'sharp';
import { encode } from 'blurhash';
import ffmpegPath from 'ffmpeg-static';
import ffprobe from 'ffprobe-static';

const execFileAsync = promisify(execFile);

export type VideoProbeResult = {
  duration: number | null;
  width: number | null;
  height: number | null;
  bitrate: number | null;
  fps: number | null;
  frameCount: number | null;
  codecVideo: string | null;
  codecVideoProfile: string | null;
  pixelFormat: string | null;
  colorSpace: string | null;
  colorRange: string | null;
  colorPrimaries: string | null;
  colorTransfer: string | null;
  bitDepth: number | null;
  codecAudio: string | null;
  audioChannels: number | null;
  audioSampleRate: number | null;
  audioBitrate: number | null;
  hasAudio: boolean;
  rotation: number | null;
  containerFormat: string | null;
  containerLong: string | null;
  raw: Record<string, unknown> | null;
};

const parseNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const parseInteger = (value: unknown): number | null => {
  const parsed = parseNumber(value);
  if (parsed === null) return null;
  return Number.isFinite(parsed) ? Math.round(parsed) : null;
};

const parseFps = (value: unknown): number | null => {
  if (typeof value !== 'string') return parseNumber(value);
  const parts = value.split('/').map((part) => Number.parseFloat(part));
  if (parts.length === 2 && parts[0] > 0 && parts[1] > 0) {
    return parts[0] / parts[1];
  }
  return parseNumber(value);
};

const toStringValue = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value : null;

let warnedFfprobe = false;
let warnedFfmpeg = false;

const resolveFfprobePath = () => {
  const candidate = process.env.FFPROBE_PATH || ffprobe?.path || '';
  if (candidate && existsSync(candidate)) {
    return candidate;
  }
  const fallback = path.join(
    process.cwd(),
    'node_modules',
    'ffprobe-static',
    'bin',
    os.platform(),
    os.arch(),
    os.platform() === 'win32' ? 'ffprobe.exe' : 'ffprobe',
  );
  if (existsSync(fallback)) {
    return fallback;
  }
  if (!candidate || !existsSync(candidate)) {
    if (!warnedFfprobe) {
      console.warn(
        'ffprobe binary missing. Run `pnpm approve-builds` then `pnpm install`, or set FFPROBE_PATH.',
      );
      warnedFfprobe = true;
    }
    return '';
  }
  return candidate;
};

const resolveFfmpegPath = () => {
  const candidate = process.env.FFMPEG_PATH || ffmpegPath || '';
  if (candidate && existsSync(candidate)) {
    return candidate;
  }
  const fallback = path.join(
    process.cwd(),
    'node_modules',
    'ffmpeg-static',
    os.platform() === 'win32' ? 'ffmpeg.exe' : 'ffmpeg',
  );
  if (existsSync(fallback)) {
    return fallback;
  }
  if (!candidate || !existsSync(candidate)) {
    if (!warnedFfmpeg) {
      console.warn(
        'ffmpeg binary missing. Run `pnpm approve-builds` then `pnpm install`, or set FFMPEG_PATH.',
      );
      warnedFfmpeg = true;
    }
    return '';
  }
  return candidate;
};

export async function probeVideoMetadata(
  filePath: string,
): Promise<VideoProbeResult | null> {
  const ffprobeBin = resolveFfprobePath();
  if (!ffprobeBin) return null;

  try {
    const { stdout } = await execFileAsync(ffprobeBin, [
      '-v',
      'error',
      '-print_format',
      'json',
      '-show_format',
      '-show_streams',
      filePath,
    ]);

    const data = JSON.parse(stdout) as {
      format?: Record<string, unknown>;
      streams?: Array<Record<string, unknown>>;
    };

    const streams = data.streams ?? [];
    const videoStream = streams.find((stream) => stream.codec_type === 'video');
    const audioStream = streams.find((stream) => stream.codec_type === 'audio');
    const format = data.format ?? {};

    const duration = parseNumber(format.duration);
    const width = parseInteger(videoStream?.width);
    const height = parseInteger(videoStream?.height);
    const bitrate = parseInteger(videoStream?.bit_rate ?? format.bit_rate);
    const fps = parseFps(videoStream?.avg_frame_rate ?? videoStream?.r_frame_rate);
    const frameCount = parseInteger(videoStream?.nb_frames);

    const rotation = parseInteger(
      (videoStream?.tags as Record<string, unknown> | undefined)?.rotate,
    );

    const bitDepth =
      parseInteger(videoStream?.bits_per_raw_sample) ??
      parseInteger(videoStream?.bits_per_sample);

    return {
      duration,
      width,
      height,
      bitrate,
      fps,
      frameCount,
      codecVideo: toStringValue(videoStream?.codec_name),
      codecVideoProfile: toStringValue(videoStream?.profile),
      pixelFormat: toStringValue(videoStream?.pix_fmt),
      colorSpace: toStringValue(videoStream?.color_space),
      colorRange: toStringValue(videoStream?.color_range),
      colorPrimaries: toStringValue(videoStream?.color_primaries),
      colorTransfer: toStringValue(videoStream?.color_transfer),
      bitDepth,
      codecAudio: toStringValue(audioStream?.codec_name),
      audioChannels: parseInteger(audioStream?.channels),
      audioSampleRate: parseInteger(audioStream?.sample_rate),
      audioBitrate: parseInteger(audioStream?.bit_rate),
      hasAudio: Boolean(audioStream),
      rotation,
      containerFormat: toStringValue(format.format_name),
      containerLong: toStringValue(format.format_long_name),
      raw: data as Record<string, unknown>,
    };
  } catch (error) {
    console.warn('ffprobe failed:', filePath, error);
    return null;
  }
}

export type VideoPosterResult = {
  blurHash: string | null;
  posterTime: number;
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

export async function generateVideoPoster(
  filePath: string,
  targetPath: string,
  duration: number | null,
  maxWidth = 960,
): Promise<VideoPosterResult | null> {
  const ffmpegBin = resolveFfmpegPath();
  if (!ffmpegBin) return null;

  const posterTime = duration && duration > 0 ? Math.min(1, duration * 0.1) : 1;
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'video-poster-'));
  const tempPath = path.join(tempDir, 'frame.jpg');

  try {
    await execFileAsync(ffmpegBin, [
      '-hide_banner',
      '-loglevel',
      'error',
      '-y',
      '-strict',
      '-2',
      '-hwaccel',
      'none',
      '-err_detect',
      'ignore_err',
      '-ss',
      String(posterTime),
      '-i',
      filePath,
      '-ss',
      '0',
      '-frames:v',
      '1',
      '-vf',
      'setparams=range=tv:color_primaries=bt709:color_trc=bt709:colorspace=bt709,scale=trunc(iw/2)*2:trunc(ih/2)*2,setsar=1,format=yuvj422p',
      tempPath,
    ]);

    const imageBuffer = await sharp(tempPath)
      .resize({ width: maxWidth, withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();

    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.writeFile(targetPath, imageBuffer);

    const blurHash = await buildBlurHash(imageBuffer);

    return {
      blurHash,
      posterTime,
    };
  } catch (error) {
    console.warn('Video poster generation failed:', filePath, error);
    return null;
  } finally {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // ignore cleanup error
    }
  }
}
