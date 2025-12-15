import { eq } from 'drizzle-orm';
import { db } from '../lib/drizzle';
import { customers, invoices } from '../lib/schema';

async function listInvoices() {
  const data = await db
    .select({
      amount: invoices.amount,
      name: customers.name,
    })
    .from(invoices)
    .innerJoin(customers, eq(invoices.customerId, customers.id))
    .where(eq(invoices.amount, 666));

  return data;
}

export async function GET() {
  try {
    return Response.json(await listInvoices());
  } catch (error) {
    return Response.json({ error }, { status: 500 });
  }
}
