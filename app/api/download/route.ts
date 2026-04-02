import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/auth';
import { db } from '@/app/lib/drizzle';
import { files, userStorages } from '@/app/lib/schema';
import { and, eq, inArray } from 'drizzle-orm';
import path from 'path';
import fs from 'fs';
import { createZipStream, type FileToZip } from '@/app/lib/zip-generator';
import { getTranslations } from 'next-intl/server';

export async function POST(request: NextRequest) {
  try {
    // 1. 验证用户权限
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = Number(session.user.id);
    const t = await getTranslations('api.download');

    // 2. 解析请求
    const body = await request.json();
    const fileIds = body.fileIds as number[];

    if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
      return NextResponse.json(
        { error: t('missingParameters') },
        { status: 400 }
      );
    }

    // 3. 查询文件信息
    const fileRecords = await db
      .select({
        id: files.id,
        title: files.title,
        path: files.path,
        mimeType: files.mimeType,
        storageType: userStorages.type,
        storageConfig: userStorages.config,
      })
      .from(files)
      .innerJoin(userStorages, eq(files.userStorageId, userStorages.id))
      .where(
        and(
          inArray(files.id, fileIds),
          eq(userStorages.userId, userId)
        )
      );

    if (fileRecords.length === 0) {
      return NextResponse.json(
        { error: t('noFiles') },
        { status: 404 }
      );
    }

    // 4. 准备文件列表
    const filesToDownload: FileToZip[] = [];

    for (const record of fileRecords) {
      const storageConfig = record.storageConfig as { basePath?: string };

      if (record.storageType === 'local' || record.storageType === 'nas') {
        const basePath = storageConfig.basePath || '';
        if (!basePath) continue;

        const absolutePath = path.join(basePath, record.path);

        // 检查文件是否存在
        if (!fs.existsSync(absolutePath)) continue;

        // 使用标题作为文件名，如果没有标题则使用原始文件名
        const ext = path.extname(record.path);
        const fileName = record.title
          ? `${record.title}${ext}`
          : path.basename(record.path);

        filesToDownload.push({
          absolutePath,
          fileName,
        });
      }
      // S3 存储暂不支持
    }

    if (filesToDownload.length === 0) {
      return NextResponse.json(
        { error: t('noAccessibleFiles') },
        { status: 404 }
      );
    }

    // 5. 如果只有一个文件，直接返回文件流
    if (filesToDownload.length === 1) {
      const file = filesToDownload[0];
      const fileStream = fs.createReadStream(file.absolutePath);
      const stat = fs.statSync(file.absolutePath);

      return new NextResponse(fileStream as any, {
        headers: {
          'Content-Type': fileRecords[0].mimeType || 'application/octet-stream',
          'Content-Disposition': `attachment; filename="${encodeURIComponent(file.fileName)}"`,
          'Content-Length': stat.size.toString(),
        },
      });
    }

    // 6. 多个文件，创建 ZIP
    const zipStream = createZipStream(filesToDownload);
    const timestamp = Date.now();
    const zipFileName = `download_${timestamp}.zip`;

    return new NextResponse(zipStream as any, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${zipFileName}"`,
      },
    });
  } catch (error) {
    console.error('Download API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
