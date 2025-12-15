import bcrypt from 'bcryptjs';
import { sql } from 'drizzle-orm';
import { db } from '../lib/drizzle';
import {
  customers as customersTable,
  invoices as invoicesTable,
  revenue as revenueTable,
  users as usersTable,
} from '../lib/schema';
import {
  invoices,
  customers,
  revenue,
  users,
} from '../lib/placeholder-data';

async function seedUsers() {
  await db.execute(sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS users (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role VARCHAR(50) DEFAULT 'user',
      image_url VARCHAR(255)
    );
  `);

  await Promise.all(
    users.map(async (user) => {
      const hashedPassword = await bcrypt.hash(user.password, 10);
      return db
        .insert(usersTable)
        .values({
          id: user.id,
          name: user.name,
          email: user.email,
          password: hashedPassword,
          role: 'user',
          imageUrl: null,
        })
        .onConflictDoNothing();
    }),
  );
}

async function seedCustomers() {
  await db.execute(sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS customers (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL,
      image_url VARCHAR(255) NOT NULL
    );
  `);

  await Promise.all(
    customers.map((customer) =>
      db
        .insert(customersTable)
        .values({
          id: customer.id,
          name: customer.name,
          email: customer.email,
          imageUrl: customer.image_url,
        })
        .onConflictDoNothing(),
    ),
  );
}

async function seedInvoices() {
  await db.execute(sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS invoices (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      customer_id UUID NOT NULL REFERENCES customers(id),
      amount INT NOT NULL,
      status VARCHAR(255) NOT NULL,
      date DATE NOT NULL
    );
  `);

  await Promise.all(
    invoices.map((invoice) =>
      db
        .insert(invoicesTable)
        .values({
          customerId: invoice.customer_id,
          amount: invoice.amount,
          status: invoice.status,
          date: invoice.date,
        })
        .onConflictDoNothing(),
    ),
  );
}

async function seedRevenue() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS revenue (
      month VARCHAR(4) NOT NULL UNIQUE,
      revenue INT NOT NULL
    );
  `);

  await Promise.all(
    revenue.map((rev) =>
      db
        .insert(revenueTable)
        .values({
          month: rev.month,
          revenue: rev.revenue,
        })
        .onConflictDoNothing(),
    ),
  );
}

export async function GET() {
  try {
    await seedUsers();
    await seedCustomers();
    await seedInvoices();
    await seedRevenue();

    return Response.json({ message: 'Database seeded successfully' });
  } catch (error) {
    console.error('Failed to seed database:', error);
    return Response.json(
      { error: 'Failed to seed database.' },
      { status: 500 },
    );
  }
}
