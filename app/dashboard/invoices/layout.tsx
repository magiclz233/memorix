import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Invoices',
};

export default function Layout({
  children,
  modal, // <--- 新增：接收 modal 插槽
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
}) {
  return (
    <>
      {children} {/* 这里是原来的列表页内容 */}
      {modal}    {/* 这里是并行路由插槽，平时是空的，拦截时会显示 */}
    </>
  );
}