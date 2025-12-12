'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react'; // 引入 hooks

export function Modal({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    // 组件挂载时显示模态框
    if (!dialogRef.current?.open) {
      dialogRef.current?.showModal();
    }
  }, []);

  function onDismiss() {
    // 关闭时回退路由，这会关闭拦截路由并返回列表页
    router.back();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      {/* 点击背景关闭 */}
      <div className="absolute inset-0" onClick={onDismiss} />
      
      {/* 弹窗内容区域 */}
      <dialog
        ref={dialogRef}
        className="relative w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl"
        onClose={onDismiss}
      >
        {children}
      </dialog>
    </div>
  );
}