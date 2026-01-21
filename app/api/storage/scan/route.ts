import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { auth } from '@/auth';
import { and, eq } from 'drizzle-orm';
import { db } from '@/app/lib/drizzle';
import { userStorages, users } from '@/app/lib/schema';
import { runStorageScan, type StorageScanLog } from '@/app/lib/storage-scan';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const storageId = Number(searchParams.get('storageId'));
  const encoder = new TextEncoder();

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
          sendError('参数错误。');
          return;
        }

        const session = await auth.api.getSession({
          headers: await headers(),
        });
        const email = session?.user?.email;
        if (!email) {
          sendError('未登录或缺少用户信息。');
          return;
        }

        if (session?.user?.role !== 'admin') {
          sendError('Forbidden');
          return;
        }

        const user = await db.query.users.findFirst({
          where: eq(users.email, email),
        });
        if (!user) {
          sendError('用户不存在。');
          return;
        }

        const storage = await db.query.userStorages.findFirst({
          where: and(eq(userStorages.id, storageId), eq(userStorages.userId, user.id)),
        });
        if (!storage) {
          sendError('存储配置不存在。');
          return;
        }

        if (storage.type !== 'local' && storage.type !== 'nas') {
          sendError('当前存储类型暂不支持扫描。');
          return;
        }

        const storageConfig = (storage.config ?? {}) as {
          rootPath?: string;
          isDisabled?: boolean;
        };

        if (storageConfig.isDisabled) {
          sendError('当前配置已禁用，请先启用。');
          return;
        }

        const rootPath = storageConfig.rootPath;
        if (!rootPath) {
          sendError('根目录路径未配置。');
          return;
        }

        send('log', { level: 'info', message: `开始扫描：${rootPath}` });
        logToConsole({ level: 'info', message: `开始扫描：${rootPath}` });

        const { processed } = await runStorageScan({
          storageId: storage.id,
          storageType: storage.type as 'local' | 'nas',
          rootPath,
          onLog: (entry) => {
            send('log', entry);
            logToConsole(entry);
          },
          onProgress: (progress) => {
            send('progress', progress);
          },
        });

        revalidatePath('/dashboard/media');
        revalidatePath('/gallery');
        send('done', { message: `扫描完成，共处理 ${processed} 张图片，旧记录已清空。` });
        logToConsole({ level: 'info', message: `扫描完成，共处理 ${processed} 张图片。` });
      } catch (error) {
        console.error('扫描目录失败：', error);
        send('error', { message: '扫描目录失败，请检查路径是否可访问。' });
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
