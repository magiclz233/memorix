import Form from '@/app/ui/invoices/edit-form';
import { fetchInvoiceById, fetchCustomers } from '@/app/lib/data';
import { notFound } from 'next/navigation';
import { Modal } from '@/app/ui/modal';

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [invoice, customers] = await Promise.all([
    fetchInvoiceById(id),
    fetchCustomers(),
  ]);

  if (!invoice) {
    notFound();
  }

  return (
    <Modal>
      <h2 className="mb-4 text-xl font-bold">Edit Invoice</h2>
      <Form invoice={invoice} customers={customers} />
    </Modal>
  );
}
