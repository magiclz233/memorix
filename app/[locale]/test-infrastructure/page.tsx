'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/app/ui/components/spinner';
import { GallerySkeleton, MediaLibrarySkeleton, UploadQueueSkeleton } from '@/app/ui/components/skeletons';
import { ErrorBoundary } from '@/app/ui/components/error-boundary';
import { showSuccess, showError, showWarning, showInfo } from '@/app/lib/toast-utils';
import { useDebounce } from '@/app/ui/hooks/use-debounce';
import { useThrottle } from '@/app/ui/hooks/use-throttle';
import { useFocusTrap } from '@/app/ui/hooks/use-focus-trap';
import { useKeyboard } from '@/app/ui/hooks/use-keyboard';
import { apiClient } from '@/app/lib/api-client';

function ErrorComponent() {
  const [shouldError, setShouldError] = useState(false);
  
  if (shouldError) {
    throw new Error('测试错误边界：这是一个故意抛出的错误');
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>错误边界测试</CardTitle>
        <CardDescription>点击按钮触发错误，测试错误边界是否正常工作</CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={() => setShouldError(true)} variant="destructive">
          触发错误
        </Button>
      </CardContent>
    </Card>
  );
}

export default function TestInfrastructurePage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [throttleValue, setThrottleValue] = useState(0);
  const [showSkeletons, setShowSkeletons] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  
  const debouncedSearch = useDebounce(searchTerm, 300);
  const throttledValue = useThrottle(throttleValue, 100);
  
  useFocusTrap(modalRef as React.RefObject<HTMLElement>, showModal);
  
  useKeyboard('Escape', () => {
    if (showModal) setShowModal(false);
  });
  
  const testToasts = () => {
    showSuccess('操作成功！这是一个成功提示');
    setTimeout(() => showError('操作失败！这是一个错误提示'), 500);
    setTimeout(() => showWarning('请注意！这是一个警告提示'), 1000);
    setTimeout(() => showInfo('提示信息：这是一个信息提示'), 1500);
  };
  
  const testApiClient = async () => {
    try {
      // 测试成功请求
      await apiClient.get('/api/gallery');
      showSuccess('API 请求成功');
    } catch (error) {
      // 错误会自动通过 Toast 显示
      console.error('API 请求失败:', error);
    }
  };
  
  const testApiError = async () => {
    try {
      // 测试 404 错误
      await apiClient.get('/api/nonexistent-endpoint');
    } catch (error) {
      console.error('预期的 404 错误:', error);
    }
  };

  return (
    <div className="container mx-auto space-y-8 py-8">
      <div>
        <h1 className="text-3xl font-bold">基础设施验证测试页面</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          测试所有 Phase 1 基础组件和工具函数
        </p>
      </div>

      {/* Toast 通知系统测试 */}
      <Card>
        <CardHeader>
          <CardTitle>1. Toast 通知系统</CardTitle>
          <CardDescription>测试 Sonner Toast 集成和工具函数</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button onClick={testToasts}>测试所有 Toast 类型</Button>
            <Button onClick={() => showSuccess('单独成功提示')} variant="outline">
              成功
            </Button>
            <Button onClick={() => showError('单独错误提示')} variant="outline">
              错误
            </Button>
            <Button onClick={() => showWarning('单独警告提示')} variant="outline">
              警告
            </Button>
            <Button onClick={() => showInfo('单独信息提示')} variant="outline">
              信息
            </Button>
          </div>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            ✓ Toast 应该出现在右上角
            <br />
            ✓ 支持 Light/Dark 模式
            <br />
            ✓ 使用 zinc 色系和 indigo 主色
          </p>
        </CardContent>
      </Card>

      {/* 错误边界测试 */}
      <ErrorBoundary>
        <ErrorComponent />
      </ErrorBoundary>

      {/* API 客户端测试 */}
      <Card>
        <CardHeader>
          <CardTitle>3. API 客户端</CardTitle>
          <CardDescription>测试统一的 API 请求封装和错误处理</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button onClick={testApiClient}>测试正常请求</Button>
            <Button onClick={testApiError} variant="outline">
              测试 404 错误
            </Button>
          </div>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            ✓ 自动重试机制（最多 3 次）
            <br />
            ✓ 统一错误处理（401/403/404/500）
            <br />
            ✓ 错误信息通过 Toast 显示
          </p>
        </CardContent>
      </Card>

      {/* 加载状态组件测试 */}
      <Card>
        <CardHeader>
          <CardTitle>4. 加载状态组件</CardTitle>
          <CardDescription>测试 Spinner 和骨架屏组件</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h4 className="mb-2 font-semibold">Spinner 组件（3 种尺寸）</h4>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Spinner size="sm" />
                <span className="text-sm">Small</span>
              </div>
              <div className="flex items-center gap-2">
                <Spinner size="md" />
                <span className="text-sm">Medium</span>
              </div>
              <div className="flex items-center gap-2">
                <Spinner size="lg" />
                <span className="text-sm">Large</span>
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="mb-2 font-semibold">骨架屏组件</h4>
            <Button onClick={() => setShowSkeletons(!showSkeletons)} variant="outline">
              {showSkeletons ? '隐藏' : '显示'}骨架屏
            </Button>
            
            {showSkeletons && (
              <div className="mt-4 space-y-6">
                <div>
                  <p className="mb-2 text-sm font-medium">GallerySkeleton</p>
                  <GallerySkeleton />
                </div>
                <div>
                  <p className="mb-2 text-sm font-medium">MediaLibrarySkeleton</p>
                  <MediaLibrarySkeleton />
                </div>
                <div>
                  <p className="mb-2 text-sm font-medium">UploadQueueSkeleton</p>
                  <UploadQueueSkeleton />
                </div>
              </div>
            )}
          </div>
          
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            ✓ 全局进度条（顶部，切换路由时可见）
            <br />
            ✓ Spinner 支持 3 种尺寸
            <br />
            ✓ 骨架屏支持 Light/Dark 模式
          </p>
        </CardContent>
      </Card>

      {/* 工具 Hooks 测试 */}
      <Card>
        <CardHeader>
          <CardTitle>5. 工具 Hooks</CardTitle>
          <CardDescription>测试防抖、节流、焦点管理和键盘快捷键</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h4 className="mb-2 font-semibold">useDebounce（防抖 300ms）</h4>
            <Input
              placeholder="输入文本测试防抖..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div className="mt-2 text-sm">
              <p>实时值: {searchTerm}</p>
              <p className="text-indigo-600 dark:text-indigo-400">
                防抖值: {debouncedSearch}
              </p>
            </div>
          </div>
          
          <div>
            <h4 className="mb-2 font-semibold">useThrottle（节流 100ms）</h4>
            <Button onClick={() => setThrottleValue(prev => prev + 1)}>
              点击测试节流（当前: {throttleValue}）
            </Button>
            <p className="mt-2 text-sm text-indigo-600 dark:text-indigo-400">
              节流值: {throttledValue}
            </p>
          </div>
          
          <div>
            <h4 className="mb-2 font-semibold">useFocusTrap & useKeyboard</h4>
            <Button onClick={() => setShowModal(true)}>打开模态框测试</Button>
            
            {showModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                <div
                  ref={modalRef}
                  className="w-96 rounded-xl border border-zinc-200 bg-white p-6 shadow-lg dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <h3 className="text-lg font-semibold">测试模态框</h3>
                  <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                    按 Tab 键测试焦点循环，按 ESC 键关闭
                  </p>
                  <div className="mt-4 space-y-2">
                    <Input placeholder="输入框 1" />
                    <Input placeholder="输入框 2" />
                    <Input placeholder="输入框 3" />
                  </div>
                  <div className="mt-4 flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowModal(false)}>
                      取消
                    </Button>
                    <Button onClick={() => setShowModal(false)}>确认</Button>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            ✓ useDebounce 防抖效果
            <br />
            ✓ useThrottle 节流效果
            <br />
            ✓ useFocusTrap 焦点循环（Tab 键）
            <br />
            ✓ useKeyboard 快捷键监听（ESC 键）
          </p>
        </CardContent>
      </Card>

      {/* 国际化文案 */}
      <Card>
        <CardHeader>
          <CardTitle>6. 国际化文案</CardTitle>
          <CardDescription>验证 UI/UX 优化相关的国际化文案</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            ✓ messages/zh-CN.json 已添加所有新增文案
            <br />
            ✓ messages/en.json 已添加所有新增文案
            <br />
            ✓ 包含：Toast 提示、错误信息、加载状态、筛选标签、上传中心文案等
          </p>
        </CardContent>
      </Card>

      {/* 验证总结 */}
      <Card className="border-indigo-200 bg-indigo-50/50 dark:border-indigo-900 dark:bg-indigo-950/20">
        <CardHeader>
          <CardTitle>✓ 验证总结</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>✓ Toast 通知系统正常工作（Sonner 集成）</p>
          <p>✓ 错误边界能正确捕获和显示错误</p>
          <p>✓ API 客户端支持重试和统一错误处理</p>
          <p>✓ 加载状态组件在 Light/Dark 模式下样式正确</p>
          <p>✓ 工具 Hooks（防抖、节流、焦点管理、键盘）正常工作</p>
          <p>✓ 国际化文案已完整添加</p>
        </CardContent>
      </Card>
    </div>
  );
}
