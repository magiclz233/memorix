import type { InvoiceForm, InvoiceWithPriority } from "./definitions";
import { formatCurrency } from "./utils";
import { db } from "./drizzle";
import { invoices, customers, revenue, userStorages, files, photoMetadata, users, userSettings } from './schema';
import { desc, asc, eq, ilike, or, sql, count, and, inArray } from 'drizzle-orm';

export async function fetchRevenue() {
  try {
    // Artificially delay a response for demo purposes.
    // Don't do this in production :)

    // console.log('Fetching revenue data...');
    // await new Promise((resolve) => setTimeout(resolve, 3000));

    // const data = await sql<Revenue[]>`SELECT * FROM revenue`;
    const data = await db.select().from(revenue);
    // console.log('Data fetch completed after 3 seconds.');

    return data;
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch revenue data.");
  }
}

export async function fetchLatestInvoices() {
  try {
    // const data = await sql<LatestInvoiceRaw[]>`
    //   SELECT invoices.amount, customers.name, customers.image_url, customers.email, invoices.id
    //   FROM invoices
    //   JOIN customers ON invoices.customer_id = customers.id
    //   ORDER BY invoices.date DESC
    //   LIMIT 5`;
    const data = await db.query.invoices.findMany({
      limit: 5,
      orderBy: (invoices, { desc }) => [desc(invoices.date)],
      with: {
        customer: true,
      },
    });

    // 格式化数据以匹配前端组件需要的结构
    const latestInvoices = data.map((invoice) => ({
      id: invoice.id,
      name: invoice.customer.name,
      image_url: invoice.customer.imageUrl,
      email: invoice.customer.email,
      amount: formatCurrency(invoice.amount),
    }));

    // const latestInvoices = data.map((invoice) => ({
    //   ...invoice,
    //   amount: formatCurrency(invoice.amount),
    // }));
    return latestInvoices;
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch the latest invoices.");
  }
}

export async function fetchCardData() {
  try {
    // You can probably combine these into a single SQL query
    // However, we are intentionally splitting them to demonstrate
    // how to initialize multiple queries in parallel with JS.
    // const invoiceCountPromise = sql`SELECT COUNT(*) FROM invoices`;
    // const customerCountPromise = sql`SELECT COUNT(*) FROM customers`;
    // const invoiceStatusPromise = sql`SELECT
    //      SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) AS "paid",
    //      SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) AS "pending"
    //      FROM invoices`;
    // 替换为 Drizzle ORM 查询
    const invoiceCountPromise = db.select({ count: count() }).from(invoices);
    const customerCountPromise = db.select({ count: count() }).from(customers);
    const invoiceStatusPromise = db
      .select({
        paid: sql<number>`SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END)`,
        pending: sql<number>`SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END)`,
      })
      .from(invoices);

    const [invoiceCount, customerCount, invoiceStatus] = await Promise.all([
      invoiceCountPromise,
      customerCountPromise,
      invoiceStatusPromise,
    ]);

    const invoiceStatusRow = invoiceStatus[0] ?? { paid: 0, pending: 0 };
    const totalPaid = Number(invoiceStatusRow.paid ?? 0);
    const totalPending = Number(invoiceStatusRow.pending ?? 0);

    return {
      numberOfCustomers: Number(customerCount[0]?.count ?? 0),
      numberOfInvoices: Number(invoiceCount[0]?.count ?? 0),
      totalPaidInvoices: formatCurrency(totalPaid),
      totalPendingInvoices: formatCurrency(totalPending),
    };
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch card data.");
  }
}

const ITEMS_PER_PAGE = 6;
export async function fetchFilteredInvoices(
  query: string,
  currentPage: number,
) {
  const offset = (currentPage - 1) * ITEMS_PER_PAGE;
  const searchTerm = `%${query}%`;
  const amountAsText = sql<string>`CAST(${invoices.amount} AS TEXT)`;
  const dateAsText = sql<string>`CAST(${invoices.date} AS TEXT)`;

  try {
    // 动态构建搜索条件
    const searchFilter = or(
      ilike(customers.name, searchTerm),
      ilike(customers.email, searchTerm),
      ilike(amountAsText, searchTerm),
      ilike(dateAsText, searchTerm),
      ilike(invoices.status, searchTerm),
    );

    const data = await db
      .select({
        id: invoices.id,
        customer_id: invoices.customerId,
        amount: invoices.amount,
        date: invoices.date,
        status: invoices.status,
        name: customers.name,
        email: customers.email,
        image_url: customers.imageUrl,
      })
      .from(invoices)
      .leftJoin(customers, eq(invoices.customerId, customers.id))
      .where(searchFilter)
      .orderBy(desc(invoices.date))
      .limit(ITEMS_PER_PAGE)
      .offset(offset);

    return data;
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch invoices.");
  }
}

export async function fetchInvoicesPages(query: string) {
  try {
    const searchTerm = `%${query}%`;
    const amountAsText = sql<string>`CAST(${invoices.amount} AS TEXT)`;
    const dateAsText = sql<string>`CAST(${invoices.date} AS TEXT)`;

    const searchFilter = or(
      ilike(customers.name, searchTerm),
      ilike(customers.email, searchTerm),
      ilike(amountAsText, searchTerm),
      ilike(dateAsText, searchTerm),
      ilike(invoices.status, searchTerm),
    );
    const countResult = await db
      .select({ count: count() })
      .from(invoices)
      .leftJoin(customers, eq(invoices.customerId, customers.id))
      .where(searchFilter);

    const totalPages = Math.ceil(Number(countResult[0].count) / ITEMS_PER_PAGE);
    return totalPages;
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch total number of invoices.");
  }
}

export async function fetchInvoiceById(
  id: string,
): Promise<InvoiceForm | undefined> {
  try {
    const data = await db
      .select({
        id: invoices.id,
        customer_id: invoices.customerId,
        amount: invoices.amount,
        status: invoices.status,
      })
      .from(invoices)
      .where(eq(invoices.id, id));

    const invoice = data[0];
    if (!invoice) return undefined;

    const status = invoice.status;
    if (status !== "pending" && status !== "paid") {
      throw new Error(`Invalid invoice status: ${status}`);
    }

    return {
      ...invoice,
      // Convert amount from cents to dollars
      amount: invoice.amount / 100,
      status,
    };
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch invoice.");
  }
}

export async function fetchCustomers() {
  try {
    const data = await db
      .select({
        id: customers.id,
        name: customers.name,
      })
      .from(customers)
      .orderBy(asc(customers.name));

    return data;
  } catch (err) {
    console.error("Database Error:", err);
    throw new Error("Failed to fetch all customers.");
  }
}

export async function fetchFilteredCustomers(query: string) {
  try {
    // const data = await sql<CustomersTableType[]>`
    // SELECT
    //   customers.id,
    //   customers.name,
    //   customers.email,
    //   customers.image_url,
    //   COUNT(invoices.id) AS total_invoices,
    //   SUM(CASE WHEN invoices.status = 'pending' THEN invoices.amount ELSE 0 END) AS total_pending,
    //   SUM(CASE WHEN invoices.status = 'paid' THEN invoices.amount ELSE 0 END) AS total_paid
    // FROM customers
    // LEFT JOIN invoices ON customers.id = invoices.customer_id
    // WHERE
    //   customers.name ILIKE ${`%${query}%`} OR
    //     customers.email ILIKE ${`%${query}%`}
    // GROUP BY customers.id, customers.name, customers.email, customers.image_url
    // ORDER BY customers.name ASC
    // `;

    const data = await db
      .select({
        id: customers.id,
        name: customers.name,
        email: customers.email,
        image_url: customers.imageUrl,
        total_invoices: count(invoices.id),
        // 聚合逻辑：如果是 'pending' 状态则累加金额，否则加 0
        total_pending: sql<number>`SUM(CASE WHEN ${invoices.status} = 'pending' THEN ${invoices.amount} ELSE 0 END)`,
        // 聚合逻辑：如果是 'paid' 状态则累加金额，否则加 0
        total_paid: sql<number>`SUM(CASE WHEN ${invoices.status} = 'paid' THEN ${invoices.amount} ELSE 0 END)`,
      })
      .from(customers)
      .leftJoin(invoices, eq(customers.id, invoices.customerId))
      .where(
        or(
          ilike(customers.name, `%${query}%`),
          ilike(customers.email, `%${query}%`),
        ),
      )
      // 必须按照非聚合字段分组
      .groupBy(
        customers.id,
        customers.name,
        customers.email,
        customers.imageUrl,
      )
      .orderBy(asc(customers.name));

    // 格式化金额数据
    const formattedCustomers = data.map((customer) => ({
      ...customer,
      total_pending: formatCurrency(Number(customer.total_pending ?? 0)),
      total_paid: formatCurrency(Number(customer.total_paid ?? 0)),
    }));

    return formattedCustomers;
  } catch (err) {
    console.error("Database Error:", err);
    throw new Error("Failed to fetch customer table.");
  }
}

function calculatePriority(
  amount: number,
  status: string,
): "High" | "Medium" | "Low" {
  if (status === "paid") return "Low";
  // 注意：数据库里的 amount 通常是以分为单位的整数，这里假设 amount 是分为单位
  if (amount > 50000) return "High"; // 大于 $500.00
  return "Medium";
}

export async function fetchInvoicesWithBusinessLogic(
  query: string,
  currentPage: number,
): Promise<InvoiceWithPriority[]> {
  try {
    // 1. 获取原始数据 (Raw Data)
    const invoiceList = await fetchFilteredInvoices(query, currentPage);

    // 2. 中间业务处理 (Intermediate Business Processing)
    // 这里是放置复杂逻辑的最佳地点
    const processedInvoices = invoiceList.map((invoice) => {
      const priority = calculatePriority(invoice.amount, invoice.status);

      let priorityLabel = "低";
      if (priority === "High") priorityLabel = "高 - 需紧急处理";
      if (priority === "Medium") priorityLabel = "中 - 正常跟进";

      return {
        ...invoice,
        priority, // 注入计算出的业务字段
        priorityLabel, // 注入用于显示的文案
      };
    });

    return processedInvoices as any;
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch invoices with priority.");
  }
}

export async function fetchUserByEmail(email: string) {
  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
  });
  return user ?? null;
}

export async function fetchUserStorages(userId: string) {
  return db
    .select({
      id: userStorages.id,
      type: userStorages.type,
      config: userStorages.config,
      createdAt: userStorages.createdAt,
      updatedAt: userStorages.updatedAt,
    })
    .from(userStorages)
    .where(eq(userStorages.userId, userId))
    .orderBy(desc(userStorages.updatedAt));
}

export async function fetchStorageFiles(storageId: number) {
  return db
    .select({
      id: files.id,
      title: files.title,
      path: files.path,
      size: files.size,
      mimeType: files.mimeType,
      mtime: files.mtime,
      isPublished: files.isPublished,
      resolutionWidth: photoMetadata.resolutionWidth,
      resolutionHeight: photoMetadata.resolutionHeight,
    })
    .from(files)
    .leftJoin(photoMetadata, eq(files.id, photoMetadata.fileId))
    .where(eq(files.userStorageId, storageId))
    .orderBy(desc(files.mtime));
}

export async function fetchPublishedPhotos(userId: string) {
  const records = await db
    .select({
      id: files.id,
      title: files.title,
      path: files.path,
      size: files.size,
      mimeType: files.mimeType,
      mtime: files.mtime,
      resolutionWidth: photoMetadata.resolutionWidth,
      resolutionHeight: photoMetadata.resolutionHeight,
      description: photoMetadata.description,
      camera: photoMetadata.camera,
      maker: photoMetadata.maker,
      lens: photoMetadata.lens,
      dateShot: photoMetadata.dateShot,
      exposure: photoMetadata.exposure,
      aperture: photoMetadata.aperture,
      iso: photoMetadata.iso,
      focalLength: photoMetadata.focalLength,
      whiteBalance: photoMetadata.whiteBalance,
      storageConfig: userStorages.config,
    })
    .from(files)
    .innerJoin(userStorages, eq(files.userStorageId, userStorages.id))
    .leftJoin(photoMetadata, eq(files.id, photoMetadata.fileId))
    .where(and(eq(files.isPublished, true), eq(userStorages.userId, userId)))
    .orderBy(desc(files.mtime));

  return records
    .filter(
      (record) =>
        !(record.storageConfig as { isDisabled?: boolean })?.isDisabled,
    )
    .map(({ storageConfig, ...rest }) => rest);
}

const HERO_SETTING_KEY = 'hero_images';

const normalizeIdList = (value: unknown) => {
  if (!Array.isArray(value)) return [];
  const ids = value
    .map((item) => {
      if (typeof item === 'number' && Number.isFinite(item)) return Math.trunc(item);
      if (typeof item === 'string') {
        const parsed = Number(item);
        if (Number.isFinite(parsed)) return Math.trunc(parsed);
      }
      return null;
    })
    .filter((item): item is number => typeof item === 'number' && item > 0);
  return Array.from(new Set(ids));
};

const getErrorCode = (error: unknown): string | null => {
  if (!error || typeof error !== 'object') return null;
  const code = (error as { code?: string }).code;
  if (code) return code;
  const cause = (error as { cause?: unknown }).cause;
  if (cause && cause !== error) {
    const nestedCode = getErrorCode(cause);
    if (nestedCode) return nestedCode;
  }
  const original = (error as { original?: unknown; originalError?: unknown }).original ?? (error as { originalError?: unknown }).originalError;
  if (original && original !== error) {
    const nestedCode = getErrorCode(original);
    if (nestedCode) return nestedCode;
  }
  return null;
};

const getErrorMessage = (error: unknown): string | null => {
  if (!error || typeof error !== 'object') return null;
  const message = (error as { message?: string }).message;
  if (typeof message === 'string' && message.length > 0) return message;
  const cause = (error as { cause?: unknown }).cause;
  if (cause && cause !== error) {
    const nestedMessage = getErrorMessage(cause);
    if (nestedMessage) return nestedMessage;
  }
  const original = (error as { original?: unknown; originalError?: unknown }).original ?? (error as { originalError?: unknown }).originalError;
  if (original && original !== error) {
    const nestedMessage = getErrorMessage(original);
    if (nestedMessage) return nestedMessage;
  }
  return null;
};

const getErrorQuery = (error: unknown): string | null => {
  if (!error || typeof error !== 'object') return null;
  const query = (error as { query?: string }).query;
  if (typeof query === 'string' && query.length > 0) return query;
  const cause = (error as { cause?: unknown }).cause;
  if (cause && cause !== error) {
    const nestedQuery = getErrorQuery(cause);
    if (nestedQuery) return nestedQuery;
  }
  const original = (error as { original?: unknown; originalError?: unknown }).original ?? (error as { originalError?: unknown }).originalError;
  if (original && original !== error) {
    const nestedQuery = getErrorQuery(original);
    if (nestedQuery) return nestedQuery;
  }
  return null;
};

const isMissingRelationError = (error: unknown) => {
  const code = getErrorCode(error);
  if (code === '42P01') return true;
  const message = getErrorMessage(error) ?? '';
  return message.includes('relation') && message.includes('does not exist');
};

const shouldIgnoreHeroSettingsError = (error: unknown) => {
  if (isMissingRelationError(error)) return true;
  const query = getErrorQuery(error) ?? '';
  if (query.includes('"user_settings"')) return true;
  const message = getErrorMessage(error) ?? '';
  return message.includes('user_settings');
};

const warnHeroSettingsFallback = (error: unknown) => {
  const code = getErrorCode(error);
  const message = getErrorMessage(error);
  const detail = [code ? `code=${code}` : null, message].filter(Boolean).join(' ');
  console.warn(`读取 Hero 配置失败，已降级为默认图片。${detail ? ` ${detail}` : ''}`);
};

export async function fetchHeroPhotoIdsByUser(userId: string) {
  try {
    const record = await db
      .select({ value: userSettings.value })
      .from(userSettings)
      .where(and(eq(userSettings.userId, userId), eq(userSettings.key, HERO_SETTING_KEY)))
      .limit(1);
    return normalizeIdList(record[0]?.value);
  } catch (error) {
    // 兼容未执行迁移或库权限不足导致读取失败的情况
    if (shouldIgnoreHeroSettingsError(error)) {
      warnHeroSettingsFallback(error);
      return [];
    }
    throw error;
  }
}

const fetchHeroPhotoIdsForHome = async (userId?: string) => {
  try {
    if (userId) {
      return fetchHeroPhotoIdsByUser(userId);
    }
    const record = await db
      .select({ value: userSettings.value })
      .from(userSettings)
      .where(eq(userSettings.key, HERO_SETTING_KEY))
      .orderBy(desc(userSettings.updatedAt))
      .limit(1);
    return normalizeIdList(record[0]?.value);
  } catch (error) {
    // 兼容未执行迁移或库权限不足导致读取失败的情况
    if (shouldIgnoreHeroSettingsError(error)) {
      warnHeroSettingsFallback(error);
      return [];
    }
    throw error;
  }
};

export async function fetchHeroPhotosForHome(options?: { userId?: string; limit?: number }) {
  const limit = options?.limit ?? 12;
  const heroIds = await fetchHeroPhotoIdsForHome(options?.userId);
  if (heroIds.length === 0) return [];
  const limitedIds = heroIds.slice(0, limit);
  const records = await db
    .select({
      id: files.id,
      title: files.title,
      path: files.path,
      mtime: files.mtime,
      storageConfig: userStorages.config,
    })
    .from(files)
    .innerJoin(userStorages, eq(files.userStorageId, userStorages.id))
    .where(and(inArray(files.id, limitedIds), eq(files.isPublished, true)));

  const filtered = records
    .filter(
      (record) =>
        !(record.storageConfig as { isDisabled?: boolean })?.isDisabled,
    )
    .map(({ storageConfig, ...rest }) => rest);

  const recordMap = new Map(filtered.map((item) => [item.id, item]));
  return limitedIds
    .map((id) => recordMap.get(id))
    .filter((item): item is (typeof filtered)[number] => Boolean(item));
}

type FetchGalleryOptions = {
  limit?: number;
  offset?: number;
};

export async function fetchPublishedMediaForGallery(
  options: FetchGalleryOptions = {},
) {
  try {
    let query = db
      .select({
        id: files.id,
        title: files.title,
        path: files.path,
        size: files.size,
        mimeType: files.mimeType,
        mediaType: files.mediaType,
        url: files.url,
        thumbUrl: files.thumbUrl,
        mtime: files.mtime,
        resolutionWidth: photoMetadata.resolutionWidth,
        resolutionHeight: photoMetadata.resolutionHeight,
        description: photoMetadata.description,
        camera: photoMetadata.camera,
        maker: photoMetadata.maker,
        lens: photoMetadata.lens,
        dateShot: photoMetadata.dateShot,
        exposure: photoMetadata.exposure,
        aperture: photoMetadata.aperture,
        iso: photoMetadata.iso,
        focalLength: photoMetadata.focalLength,
        whiteBalance: photoMetadata.whiteBalance,
        gpsLatitude: photoMetadata.gpsLatitude,
        gpsLongitude: photoMetadata.gpsLongitude,
        storageConfig: userStorages.config,
      })
      .from(files)
      .innerJoin(userStorages, eq(files.userStorageId, userStorages.id))
      .leftJoin(photoMetadata, eq(files.id, photoMetadata.fileId))
      .where(
        and(eq(files.isPublished, true), inArray(files.mediaType, ['image', 'video'])),
      )
      .orderBy(desc(files.mtime));
    if (typeof options.limit === 'number') {
      query = query.limit(options.limit);
    }
    if (typeof options.offset === 'number' && options.offset > 0) {
      query = query.offset(options.offset);
    }
    const records = await query;

    return records
      .filter(
        (record) =>
          !(record.storageConfig as { isDisabled?: boolean })?.isDisabled,
      )
      .map(({ storageConfig, ...rest }) => rest);
  } catch (error) {
    const cause = (error as Error & { cause?: unknown }).cause;
    console.error('画廊查询失败:', error);
    if (cause) {
      console.error('画廊查询原始错误:', cause);
    }
    throw error;
  }
}

export async function fetchPublishedPhotosForHome(limit = 12) {
  const records = await db
    .select({
      id: files.id,
      title: files.title,
      path: files.path,
      mtime: files.mtime,
      storageConfig: userStorages.config,
    })
    .from(files)
    .innerJoin(userStorages, eq(files.userStorageId, userStorages.id))
    .where(eq(files.isPublished, true))
    .orderBy(desc(files.mtime))
    .limit(limit);

  return records
    .filter(
      (record) =>
        !(record.storageConfig as { isDisabled?: boolean })?.isDisabled,
    )
    .map(({ storageConfig, ...rest }) => rest);
}
