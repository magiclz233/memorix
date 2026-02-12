import { createReadStream, promises as fs } from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { db } from '@/app/lib/drizzle';
import { files, photoMetadata, userStorages, users } from '@/app/lib/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@/auth';
import { GetObjectCommand, HeadObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { resolveS3Client, s3BodyToReadable } from '@/app/lib/s3-helper';

export const runtime = 'nodejs';

const isLikelyMp4Header = (buffer: Buffer) => {
  const ftypIndex = buffer.indexOf('ftyp');
  return ftypIndex >= 4 && ftypIndex <= 16;
};

const readS3RangeBuffer = async (
  client: S3Client,
  bucket: string,
  key: string,
  start: number,
  length: number,
) => {
  const end = Math.max(start, start + length - 1);
  const response = await client.send(
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
      Range: `bytes=${start}-${end}`,
    }),
  );
  const body = s3BodyToReadable(response.Body);
  if (!body) return Buffer.alloc(0);
  const chunks: Buffer[] = [];
  for await (const chunk of body as AsyncIterable<Uint8Array>) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
};

const resolveVideoContentType = (filePath: string, fallback?: string | null) => {
  if (fallback && fallback.startsWith('video/')) return fallback;
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.webm') return 'video/webm';
  if (ext === '.mov') return 'video/mp4';
  if (ext === '.mp4') return 'video/mp4';
  return 'video/mp4';
};

type Params = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, { params }: Params) {
  const { id } = await params;
  const fileId = Number(id);

  if (isNaN(fileId)) {
    return new NextResponse('Invalid ID', { status: 400 });
  }

  // 1. Fetch File & Metadata
  const result = await db
    .select({
      id: files.id,
      path: files.path,
      userStorageId: files.userStorageId,
      mimeType: files.mimeType,
      mediaType: files.mediaType,
      config: userStorages.config,
      storageType: userStorages.type,
      liveType: photoMetadata.liveType,
      videoOffset: photoMetadata.videoOffset,
      pairedPath: photoMetadata.pairedPath,
      isPublished: files.isPublished,
      userId: userStorages.userId,
    })
    .from(files)
    .innerJoin(userStorages, eq(files.userStorageId, userStorages.id))
    .leftJoin(photoMetadata, eq(files.id, photoMetadata.fileId))
    .where(eq(files.id, fileId));

  const item = result[0];
  if (!item) {
    return new NextResponse('Not Found', { status: 404 });
  }

  // Auth Check (Copied from local-files)
  if (!item.isPublished) {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    const email = session?.user?.email;
    if (!email) {
      console.warn(`[Stream API] Unauthorized access attempt for ID ${id}`);
      return new NextResponse('Unauthorized', { status: 403 });
    }
    // Simple check: if user is logged in, do they own the file?
    // Optimization: query DB for user ID
    const user = await db.query.users.findFirst({
        where: eq(users.email, email),
    });
    if (!user || user.id !== item.userId) {
        console.warn(`[Stream API] Forbidden access for ID ${id} by user ${email}`);
        return new NextResponse('Forbidden', { status: 403 });
    }
  }

  if (item.storageType === 's3') {
    const config = (item.config ?? {}) as {
      endpoint?: string | null;
      region?: string | null;
      bucket?: string | null;
      accessKey?: string | null;
      secretKey?: string | null;
    };
    if (!config.bucket || !config.accessKey || !config.secretKey) {
      return new NextResponse('Storage Config Incomplete', { status: 500 });
    }

    const client = resolveS3Client(config);
    let targetKey = '';
    let offset = 0;

    if (item.mediaType === 'video') {
      targetKey = item.path;
      offset = 0;
    } else if (item.liveType === 'paired' && item.pairedPath) {
      targetKey = item.pairedPath;
    } else if (item.liveType === 'embedded' && typeof item.videoOffset === 'number') {
      targetKey = item.path;
      offset = item.videoOffset;
    } else {
      return new NextResponse('Not a Video', { status: 404 });
    }

    let objectSize = 0;
    try {
      const head = await client.send(
        new HeadObjectCommand({
          Bucket: config.bucket,
          Key: targetKey,
        }),
      );
      objectSize = head.ContentLength ?? 0;
    } catch (e) {
      console.error(`[Stream API] S3 head failed for ID ${id}:`, targetKey, e);
      return new NextResponse('Video File Not Found', { status: 404 });
    }

    if (item.liveType === 'embedded' && offset > 0 && objectSize > 0) {
      try {
        const checkBuffer = await readS3RangeBuffer(
          client,
          config.bucket,
          targetKey,
          offset,
          32,
        );
        const isMp4Absolute = isLikelyMp4Header(checkBuffer);
        if (!isMp4Absolute) {
          const altOffset = objectSize - offset;
          if (altOffset > 0 && altOffset < objectSize) {
            const altBuffer = await readS3RangeBuffer(
              client,
              config.bucket,
              targetKey,
              altOffset,
              32,
            );
            const isMp4Relative = isLikelyMp4Header(altBuffer);
            if (isMp4Relative) {
              offset = altOffset;
            } else {
              offset = altOffset;
            }
          }
        }
      } catch (checkErr) {
        console.error(`[Stream API] Failed to verify MP4 header for ID ${id}:`, checkErr);
      }
    }

    if (offset < 0 || offset >= objectSize) {
      console.error(`[Stream API] Invalid video offset for ID ${id}:`, {
        objectSize,
        offset,
      });
      return new NextResponse('Invalid Video Offset', { status: 500 });
    }

    const videoSize = objectSize - offset;
    if (videoSize <= 0) {
      console.error(`[Stream API] Invalid video size for ID ${id}:`, {
        objectSize,
        offset,
        videoSize,
      });
      return new NextResponse('Invalid Video Size', { status: 500 });
    }

    const contentType = resolveVideoContentType(targetKey, item.mimeType);
    const range = request.headers.get('range');

    if (range) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(range);
      if (!match) {
        return new NextResponse('Invalid Range', { status: 416 });
      }

      const startPart = match[1];
      const endPart = match[2];
      let start: number;
      let end: number;

      if (!startPart && !endPart) {
        return new NextResponse('Invalid Range', { status: 416 });
      }

      if (!startPart) {
        const suffixLength = parseInt(endPart, 10);
        if (!Number.isFinite(suffixLength) || suffixLength <= 0) {
          return new NextResponse('Invalid Range', { status: 416 });
        }
        start = Math.max(videoSize - suffixLength, 0);
        end = videoSize - 1;
      } else {
        start = parseInt(startPart, 10);
        end = endPart ? parseInt(endPart, 10) : videoSize - 1;
      }

      if (!Number.isFinite(start) || !Number.isFinite(end) || start > end) {
        return new NextResponse('Invalid Range', { status: 416 });
      }

      if (start >= videoSize) {
        return new NextResponse('Range Not Satisfiable', {
          status: 416,
          headers: { 'Content-Range': `bytes */${videoSize}` },
        });
      }

      if (end >= videoSize) {
        end = videoSize - 1;
      }

      const chunksize = end - start + 1;
      const fileStart = start + offset;
      const fileEnd = end + offset;
      const response = await client.send(
        new GetObjectCommand({
          Bucket: config.bucket,
          Key: targetKey,
          Range: `bytes=${fileStart}-${fileEnd}`,
        }),
      );
      const body = s3BodyToReadable(response.Body);
      if (!body) {
        return new NextResponse('Video File Not Found', { status: 404 });
      }
      return new NextResponse(Readable.toWeb(body) as BodyInit, {
        status: 206,
        headers: {
          'Content-Range': `bytes ${start}-${end}/${videoSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize.toString(),
          'Content-Type': contentType,
        },
      });
    }

    const rangeHeader = offset > 0 ? `bytes=${offset}-${objectSize - 1}` : undefined;
    const response = await client.send(
      new GetObjectCommand({
        Bucket: config.bucket,
        Key: targetKey,
        Range: rangeHeader,
      }),
    );
    const body = s3BodyToReadable(response.Body);
    if (!body) {
      return new NextResponse('Video File Not Found', { status: 404 });
    }
    return new NextResponse(Readable.toWeb(body) as BodyInit, {
      status: 200,
      headers: {
        'Content-Length': videoSize.toString(),
        'Content-Type': contentType,
        'Accept-Ranges': 'bytes',
      },
    });
  }

  const rootPath = (item.config as { rootPath?: string })?.rootPath;
  if (!rootPath) {
    return new NextResponse('Storage Root Not Configured', { status: 500 });
  }

  let targetPath = '';
  let offset = 0;

  const normalizedRoot = path.resolve(rootPath);
  const originalPath = path.resolve(normalizedRoot, item.path);

  if (item.mediaType === 'video') {
    targetPath = originalPath;
    offset = 0;
  } else if (item.liveType === 'paired' && item.pairedPath) {
    targetPath = path.resolve(normalizedRoot, item.pairedPath);
  } else if (item.liveType === 'embedded' && typeof item.videoOffset === 'number') {
    targetPath = originalPath;
    offset = item.videoOffset;
  } else {
    return new NextResponse('Not a Video', { status: 404 });
  }

  if (!targetPath.startsWith(normalizedRoot + path.sep) && targetPath !== normalizedRoot) {
     return new NextResponse('Forbidden Path', { status: 403 });
  }

  let stat;
  try {
    stat = await fs.stat(targetPath);
    console.log(`[Stream API] Serving ${item.liveType} video for ID ${id}:`, {
      targetPath,
      size: stat.size,
      offset,
      exists: true
    });
  } catch (e) {
    console.error(`[Stream API] File not found for ID ${id}:`, targetPath, e);
    return new NextResponse('Video File Not Found', { status: 404 });
  }

  // 4.1 Adjust Offset for Android Motion Photos (Embedded)
  // Android (Pixel/Samsung) often stores "MicroVideoOffset" as bytes from the END of the file.
  // We need to check if the current offset points to a valid MP4 header ('ftyp' atom).
  // If not, try (FileSize - Offset) and see if that points to a valid header.
  if (item.liveType === 'embedded' && offset > 0) {
    let fd: fs.FileHandle | null = null;
    try {
      fd = await fs.open(targetPath, 'r');
      const checkBuffer = Buffer.alloc(32);
      const readHeader = async (position: number) => {
        if (!fd) return false;
        await fd.read(checkBuffer, 0, checkBuffer.length, position);
        return isLikelyMp4Header(checkBuffer);
      };
      
      // Check 1: Treat offset as Absolute Start
      const isMp4Absolute = await readHeader(offset);

      if (!isMp4Absolute) {
         // Check 2: Treat offset as "Bytes from End" (Size of video)
         const altOffset = stat.size - offset;
         if (altOffset > 0 && altOffset < stat.size) {
             const isMp4Relative = await readHeader(altOffset);
             
             if (isMp4Relative) {
                 console.log(`[Stream API] Detected Relative Offset for ID ${id}. Correcting from ${offset} to ${altOffset}`);
                 offset = altOffset;
             } else {
                 // Fallback: If absolute is definitely NOT MP4, and relative IS NOT MP4 either,
                 // but it's an embedded video, the XMP spec says MicroVideoOffset is "bytes from end".
                 // So "altOffset" is theoretically the correct start.
                 // We'll log a warning but TRY the relative offset, as it's the standard for XMP.
                 console.warn(`[Stream API] Warning: No MP4 header found at absolute (${offset}) or relative (${altOffset}). Defaulting to relative (standard XMP behavior) for ID ${id}. Check hex: ${checkBuffer.toString('hex')}`);
                 offset = altOffset;
             }
         }
      } else {
          console.log(`[Stream API] Confirmed Absolute Offset for ID ${id} at ${offset}`);
      }
    } catch (checkErr) {
      console.error(`[Stream API] Failed to verify MP4 header for ID ${id}:`, checkErr);
    } finally {
      if (fd) {
        await fd.close();
      }
    }
  }

  // Calculate Content Length
  // For embedded: size = stat.size - offset
  // Note: If videoOffset is relative to end of file (common in Motion Photos),
  // we need to handle that. However, currently we assume stored offset is absolute or relative to start.
  // TODO: Verify MicroVideoOffset semantics if issues arise with Android photos.
  
  if (offset < 0 || offset >= stat.size) {
    console.error(`[Stream API] Invalid video offset for ID ${id}:`, {
      statSize: stat.size,
      offset,
    });
    return new NextResponse('Invalid Video Offset', { status: 500 });
  }

  const videoSize = stat.size - offset;

  if (videoSize <= 0) {
    console.error(`[Stream API] Invalid video size for ID ${id}:`, {
      statSize: stat.size,
      offset,
      videoSize,
    });
    return new NextResponse('Invalid Video Size', { status: 500 });
  }

  // Determine Content-Type
  const ext = path.extname(targetPath).toLowerCase();
  let contentType =
    typeof item.mimeType === 'string' && item.mimeType.startsWith('video/')
      ? item.mimeType
      : 'video/mp4'; // Default to mp4 for best compatibility
  if (ext === '.webm') {
    contentType = 'video/webm';
  } else if (ext === '.mov') {
    contentType = 'video/mp4';
  }
  // Note: .mov files are often HEVC. Setting 'video/mp4' allows Chrome/Edge to attempt playback
  // whereas 'video/quicktime' might trigger download or be unsupported.
  // If the browser supports the codec, it should play.

  // 5. Handle Range Request
  const range = request.headers.get('range');

  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (!match) {
      console.error(`[Stream API] Invalid range format for ID ${id}: ${range}`);
      return new NextResponse('Invalid Range', { status: 416 });
    }

    const startPart = match[1];
    const endPart = match[2];
    let start: number;
    let end: number;

    if (!startPart && !endPart) {
      console.error(`[Stream API] Empty range for ID ${id}: ${range}`);
      return new NextResponse('Invalid Range', { status: 416 });
    }

    if (!startPart) {
      const suffixLength = parseInt(endPart, 10);
      if (!Number.isFinite(suffixLength) || suffixLength <= 0) {
        console.error(`[Stream API] Invalid suffix range for ID ${id}: ${range}`);
        return new NextResponse('Invalid Range', { status: 416 });
      }
      start = Math.max(videoSize - suffixLength, 0);
      end = videoSize - 1;
    } else {
      start = parseInt(startPart, 10);
      end = endPart ? parseInt(endPart, 10) : videoSize - 1;
    }

    if (!Number.isFinite(start) || !Number.isFinite(end) || start > end) {
      console.error(`[Stream API] Invalid range values for ID ${id}: ${range}`);
      return new NextResponse('Invalid Range', { status: 416 });
    }

    if (start >= videoSize) {
      console.warn(`[Stream API] Range unsatisfiable for ID ${id}: ${range} (Size: ${videoSize})`);
      return new NextResponse('Range Not Satisfiable', { 
        status: 416,
        headers: { 'Content-Range': `bytes */${videoSize}` }
      });
    }

    if (end >= videoSize) {
      end = videoSize - 1;
    }

    const chunksize = (end - start) + 1;

    // Adjust for embedded offset
    const fileStart = start + offset;
    const fileEnd = end + offset;

    const stream = createReadStream(targetPath, { start: fileStart, end: fileEnd });
    
    return new NextResponse(Readable.toWeb(stream) as BodyInit, {
        status: 206,
        headers: {
            'Content-Range': `bytes ${start}-${end}/${videoSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunksize.toString(),
            'Content-Type': contentType,
        }
    });
  } else {
      const stream = createReadStream(targetPath, { start: offset });
      return new NextResponse(Readable.toWeb(stream) as BodyInit, {
          status: 200,
          headers: {
              'Content-Length': videoSize.toString(),
              'Content-Type': contentType,
              'Accept-Ranges': 'bytes',
          }
      });
  }
}
