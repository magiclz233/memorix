'use client';

import { useState } from 'react';
import { CheckCircle2, XCircle, AlertCircle, Info } from 'lucide-react';

import type { UploadStorageOption } from '@/app/lib/definitions';
import { UploadCenter } from '@/app/ui/admin/upload-center';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

type TestUploadCenterProps = {
  storages: UploadStorageOption[];
};

type TestResult = {
  id: string;
  name: string;
  status: 'pending' | 'pass' | 'fail' | 'warning';
  message?: string;
};

export function TestUploadCenter({ storages }: TestUploadCenterProps) {
  const [testResults, setTestResults] = useState<TestResult[]>([
    {
      id: '1',
      name: '1. 测试任务创建流程',
      status: 'pending',
      message: '点击"新建上传任务"按钮，填写任务信息并选择文件',
    },
    {
      id: '2',
      name: '2. 测试任务列表展示和操作',
      status: 'pending',
      message: '验证任务卡片显示、暂停/恢复/查看功能',
    },
    {
      id: '3',
      name: '3. 测试任务详情页面和文件管理',
      status: 'pending',
      message: '点击"查看详情"，验证文件列表、搜索和筛选功能',
    },
    {
      id: '4',
      name: '4. 验证任务队列管理和并发控制',
      status: 'pending',
      message: '创建多个任务，验证一次只处理一个任务',
    },
    {
      id: '5',
      name: '5. 验证断点续传功能',
      status: 'pending',
      message: '暂停任务后刷新页面，验证任务状态恢复',
    },
    {
      id: '6',
      name: '6. 验证错误处理和重试机制',
      status: 'pending',
      message: '模拟网络错误，验证自动重试和错误提示',
    },
    {
      id: '7',
      name: '7. 验证性能（1000个文件无卡顿）',
      status: 'pending',
      message: '创建包含大量文件的任务，验证虚拟滚动性能',
    },
    {
      id: '8',
      name: '8. 验证国际化文案',
      status: 'pending',
      message: '切换语言，验证所有文案正确显示',
    },
  ]);

  const updateTestResult = (id: string, status: TestResult['status'], message?: string) => {
    setTestResults((prev) =>
      prev.map((test) =>
        test.id === id ? { ...test, status, message: message || test.message } : test
      )
    );
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'pass':
        return <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />;
      case 'fail':
        return <XCircle className="h-5 w-5 text-rose-600 dark:text-rose-400" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />;
      default:
        return <Info className="h-5 w-5 text-zinc-400" />;
    }
  };

  const getStatusBadge = (status: TestResult['status']) => {
    switch (status) {
      case 'pass':
        return <Badge variant="default" className="bg-green-600">通过</Badge>;
      case 'fail':
        return <Badge variant="destructive">失败</Badge>;
      case 'warning':
        return <Badge variant="secondary" className="bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-400">警告</Badge>;
      default:
        return <Badge variant="outline">待测试</Badge>;
    }
  };

  const passedCount = testResults.filter((t) => t.status === 'pass').length;
  const failedCount = testResults.filter((t) => t.status === 'fail').length;
  const warningCount = testResults.filter((t) => t.status === 'warning').length;
  const totalCount = testResults.length;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
      {/* 左侧：上传中心组件 */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>上传中心功能测试</CardTitle>
            <CardDescription>
              在此区域测试上传中心的所有功能
            </CardDescription>
          </CardHeader>
          <CardContent>
            <UploadCenter storages={storages} />
          </CardContent>
        </Card>
      </div>

      {/* 右侧：测试清单 */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>测试进度</CardTitle>
            <CardDescription>
              {passedCount}/{totalCount} 项测试通过
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-900/50 dark:bg-green-900/20">
                <div className="text-2xl font-bold text-green-700 dark:text-green-400">
                  {passedCount}
                </div>
                <div className="text-xs text-green-600 dark:text-green-500">通过</div>
              </div>
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 dark:border-rose-900/50 dark:bg-rose-900/20">
                <div className="text-2xl font-bold text-rose-700 dark:text-rose-400">
                  {failedCount}
                </div>
                <div className="text-xs text-rose-600 dark:text-rose-500">失败</div>
              </div>
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/50 dark:bg-amber-900/20">
                <div className="text-2xl font-bold text-amber-700 dark:text-amber-400">
                  {warningCount}
                </div>
                <div className="text-xs text-amber-600 dark:text-amber-500">警告</div>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              {testResults.map((test) => (
                <div
                  key={test.id}
                  className="rounded-lg border border-zinc-200 bg-white/80 p-3 dark:border-zinc-800 dark:bg-zinc-900/60"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">{getStatusIcon(test.status)}</div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                          {test.name}
                        </p>
                        {getStatusBadge(test.status)}
                      </div>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {test.message}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => updateTestResult(test.id, 'pass', '测试通过')}
                    >
                      通过
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => updateTestResult(test.id, 'fail', '测试失败')}
                    >
                      失败
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => updateTestResult(test.id, 'warning', '存在问题')}
                    >
                      警告
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>测试说明</AlertTitle>
          <AlertDescription className="text-xs space-y-2">
            <p>1. 按照测试清单逐项验证功能</p>
            <p>2. 点击对应按钮标记测试结果</p>
            <p>3. 所有测试通过后即可完成验收</p>
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle>验收标准</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="space-y-2">
              <p className="font-medium text-zinc-900 dark:text-zinc-100">功能完整性</p>
              <ul className="space-y-1 text-xs text-zinc-600 dark:text-zinc-400">
                <li>✓ 任务创建流程完整</li>
                <li>✓ 任务列表展示正确</li>
                <li>✓ 任务详情功能完善</li>
                <li>✓ 文件管理功能正常</li>
              </ul>
            </div>
            <Separator />
            <div className="space-y-2">
              <p className="font-medium text-zinc-900 dark:text-zinc-100">性能要求</p>
              <ul className="space-y-1 text-xs text-zinc-600 dark:text-zinc-400">
                <li>✓ 1000个文件无卡顿</li>
                <li>✓ 虚拟滚动流畅</li>
                <li>✓ 进度更新及时</li>
              </ul>
            </div>
            <Separator />
            <div className="space-y-2">
              <p className="font-medium text-zinc-900 dark:text-zinc-100">用户体验</p>
              <ul className="space-y-1 text-xs text-zinc-600 dark:text-zinc-400">
                <li>✓ 国际化文案完整</li>
                <li>✓ 错误提示友好</li>
                <li>✓ 操作反馈及时</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
