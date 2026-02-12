import { revalidatePathForAllLocales } from '@/app/lib/revalidate';
import { headers } from 'next/headers';
import { auth } from '@/auth';
import { and, eq } from 'drizzle-orm';
import { db } from '@/app/lib/drizzle';
import { userStorages, users } from '@/app/lib/schema';
import {
  runStorageScan,
  runS3StorageScan,
  type StorageScanLog,
  type StorageScanMode,
} from '@/app/lib/storage-scan';

import { getTranslations } from 'next-intl/server';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const storageId = Number(searchParams.get('storageId'));
  const modeParam = searchParams.get('mode');
  const mode: StorageScanMode = modeParam === 'full' ? 'full' : 'incremental';
  const encoder = new TextEncoder();
  const tCommon = await getTranslations('common');
  const tStorage = await getTranslations('dashboard.storage');

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
        );
      };
      const sendError = (message: string) => {
        send('error', { message });
      };
      const logToConsole = (entry: StorageScanLog) => {
        if (entry.level === 'error') {
          console.error(entry.message);
          return;
        }
        if (entry.level === 'warn') {
          console.warn(entry.message);
          return;
        }
        console.info(entry.message);
      };

      try {
        if (!Number.isFinite(storageId) || storageId <= 0) {
          sendError(tCommon('invalidParams'));
          return;
        }

        const session = await auth.api.getSession({
          headers: await headers(),
        });
        const email = session?.user?.email;
        if (!email) {
          sendError(tCommon('notLoggedIn'));
          return;
        }

        if (session?.user?.role !== 'admin') {
          sendError(tCommon('forbidden'));
          return;
        }

        const user = await db.query.users.findFirst({
          where: eq(users.email, email),
        });
        if (!user) {
          sendError(tCommon('userNotFound'));
          return;
        }

        const storage = await db.query.userStorages.findFirst({
          where: and(eq(userStorages.id, storageId), eq(userStorages.userId, user.id)),
        });
        if (!storage) {
          sendError(tStorage('notFound'));
          return;
        }

        const storageConfig = (storage.config ?? {}) as {
          rootPath?: string;
          endpoint?: string | null;
          region?: string | null;
          bucket?: string | null;
          accessKey?: string | null;
          secretKey?: string | null;
          prefix?: string | null;
          isDisabled?: boolean;
        };

        if (storageConfig.isDisabled) {
          sendError(tStorage('configDisabled'));
          return;
        }

        if (storage.type === 's3') {
          if (!storageConfig.bucket || !storageConfig.accessKey || !storageConfig.secretKey) {
            sendError(tStorage('s3ConfigIncomplete'));
            return;
          }

          const targetLabel = storageConfig.prefix
            ? `${storageConfig.bucket}/${storageConfig.prefix}`
            : storageConfig.bucket;
          send('log', {
            level: 'info',
            message: `${tStorage('files.scan.scanning')} ${targetLabel}`,
          });
          logToConsole({ level: 'info', message: `Start scanning: ${targetLabel}` });

          const { processed } = await runS3StorageScan({
            storageId: storage.id,
            config: {
              endpoint: storageConfig.endpoint ?? null,
              region: storageConfig.region ?? null,
              bucket: storageConfig.bucket ?? null,
              accessKey: storageConfig.accessKey ?? null,
              secretKey: storageConfig.secretKey ?? null,
              prefix: storageConfig.prefix ?? null,
            },
            mode,
            onLog: (entry) => {
              send('log', entry);
              logToConsole(entry);
            },
            onProgress: (progress) => {
              send('progress', progress);
            },
          });

          revalidatePathForAllLocales('/dashboard/media');
          revalidatePathForAllLocales('/gallery');
          send('done', { message: tStorage('files.scan.scanComplete', { count: processed }) });
          logToConsole({
            level: 'info',
            message: tStorage('files.scan.scanCompleteConsole', { count: processed }),
          });
          return;
        }

        if (storage.type !== 'local' && storage.type !== 'nas') {
          sendError(tStorage('scanUnsupported'));
          return;
        }

        const rootPath = storageConfig.rootPath;
        if (!rootPath) {
          sendError(tStorage('noRootPath'));
          return;
        }

        send('log', {
          level: 'info',
          message: `${tStorage('files.scan.scanning')} ${rootPath}`,
        });
        logToConsole({ level: 'info', message: `Start scanning: ${rootPath}` });

        const { processed } = await runStorageScan({
          storageId: storage.id,
          storageType: storage.type as 'local' | 'nas',
          rootPath,
          mode,
          onLog: (entry) => {
            send('log', entry);
            logToConsole(entry);
          },
          onProgress: (progress) => {
            send('progress', progress);
          },
        });

        revalidatePathForAllLocales('/dashboard/media');
        revalidatePathForAllLocales('/gallery');
        send('done', { message: tStorage('files.scan.scanComplete', { count: processed }) });
        logToConsole({ level: 'info', message: tStorage('files.scan.scanCompleteConsole', { count: processed }) });
      } catch (error) {
        console.error(tStorage('files.scan.scanFailedMessage'), error);
        send('error', { message: tStorage('files.scan.scanFailedMessage') });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
