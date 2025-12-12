import Form from '@/app/ui/invoices/edit-form';
import { fetchInvoiceById, fetchCustomers } from '@/app/lib/data';
import { notFound } from 'next/navigation';
import { Modal } from '@/app/ui/modal'; // 引入刚才写的 Modal 组件

export default async function Page(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const id = params.id;
  
  // 依然是服务器组件，直接查库！
  const [invoice, customers] = await Promise.all([
    fetchInvoiceById(id),
    fetchCustomers(),
  ]);

  if (!invoice) {
    notFound();
  }

  return (
    // 用 Modal 包裹原来的表单
    <Modal>
      <h2 className="mb-4 text-xl font-bold">Edit Invoice</h2>
      {/* Form 组件完全复用，不需要改任何代码 */}
      <Form invoice={invoice} customers={customers} />
    </Modal>
  );
}