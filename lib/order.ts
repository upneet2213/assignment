"server-only";
import { orders, lineItems, users, payments } from "@/db/schema";
import { db } from "./db";
import { eq, desc, sql, and } from "drizzle-orm";
import { getCurrentUserId } from "./dal";
import { OrderNotFoundError } from "./payments";

type LineItemInput = {
  description: string;
  quantity: number;
  unitPrice: string;
};

export type OrderStatus = "paid" | "partially_paid" | "pending" | "overdue";

type OrderStatusInput = {
  totalAmount: string;
  amountPaid: string;
  dueDate: Date | string;
};

type GetOrdersOptions = {
  page?: number;
  pageSize?: number;
  status?: OrderStatus;
};

type UpdateOrderInput = {
  customer?: string;
  dueDate?: Date;
  lineItems?: LineItemInput[];
};

export class OrderLockedError extends Error {
  constructor(orderId: number) {
    super(
      `Order ${orderId} cannot be edited or deleted after a payment has been recorded`,
    );
    this.name = "OrderLockedError";
  }
}

export const deriveOrderStatus = (order: OrderStatusInput): OrderStatus => {
  const totalAmount = Number(order.totalAmount);
  const amountPaid = Number(order.amountPaid);
  const isPastDue = new Date(order.dueDate) < new Date();

  if (amountPaid >= totalAmount && totalAmount > 0) {
    return "paid";
  }
  if (isPastDue) {
    return "overdue";
  }
  if (amountPaid > 0) {
    return "partially_paid";
  }
  return "pending";
};

// SQL-level mirror of deriveOrderStatus, used only for filtering in
// getOrdersList's WHERE clause — the precedence here MUST match
// deriveOrderStatus exactly (paid, then overdue, then partially_paid,
// then pending) or filtering and display will disagree.
const orderStatusSql = sql<OrderStatus>`
  CASE
    WHEN ${orders.amountPaid} >= ${orders.totalAmount} AND ${orders.totalAmount} > 0 THEN 'paid'
    WHEN ${orders.dueDate} < NOW() THEN 'overdue'
    WHEN ${orders.amountPaid} > 0 THEN 'partially_paid'
    ELSE 'pending'
  END
`;

export const createOrder = async (
  customer: string,
  dueDate: Date,
  items: LineItemInput[],
) => {
  return await db.transaction(async (tx) => {
    const currentUserId = await getCurrentUserId();
    if (!currentUserId) {
      throw new Error("You must be logged in to create an order.");
    }
    const [order] = await tx
      .insert(orders)
      .values({
        customer,
        userId: Number(currentUserId),
        dueDate,
      })
      .returning({ id: orders.id });

    await tx.insert(lineItems).values(
      items.map((item) => ({
        ...item,
        orderId: order.id,
      })),
    );

    return order.id;
  });
};

export const getOrderWithDetails = async (orderId: number) => {
  const currentUserId = await getCurrentUserId();
  if (!currentUserId) {
    throw new Error("You must be logged in to access an order.");
  }
  const order = await db.query.orders.findFirst({
    where: and(eq(orders.id, orderId), eq(orders.userId, currentUserId)),
    with: {
      lineItems: true,
      payments: true,
    },
  });
  if (order) {
    return { ...order, status: deriveOrderStatus(order) };
  }

  return null;
};

export const getOrdersList = async ({
  page = 1,
  pageSize = 20,
  status,
}: GetOrdersOptions = {}) => {
  const offset = (page - 1) * pageSize;
  const currentUserId = await getCurrentUserId();
  if (!currentUserId) {
    throw new Error("You must be logged in to access your orders.");
  }

  const conditions = [eq(orders.userId, currentUserId)];
  if (status) {
    conditions.push(eq(orderStatusSql, status));
  }
  const whereClause = and(...conditions);

  const results = await db
    .select({
      id: orders.id,
      dueDate: orders.dueDate,
      customer: orders.customer,
      totalAmount: orders.totalAmount,
      amountPaid: orders.amountPaid,
      balanceDue: orders.balanceDue,
    })
    .from(orders)
    .where(whereClause)
    .orderBy(desc(orders.dueDate))
    .limit(pageSize)
    .offset(offset);

  const updatedResults = results.map((result) => ({
    ...result,
    status: deriveOrderStatus(result),
  }));

  const [{ count }] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(orders)
    .where(whereClause);

  return {
    orders: updatedResults,
    pagination: {
      page,
      pageSize,
      totalCount: count,
      totalPages: Math.ceil(count / pageSize),
    },
  };
};

export const updateOrder = async (
  orderId: number,
  userId: number,
  input: UpdateOrderInput,
) => {
  return await db.transaction(async (tx) => {
    const [order] = await tx
      .select()
      .from(orders)
      .where(and(eq(orders.id, orderId), eq(orders.userId, userId)))
      .for("update");

    if (!order) {
      throw new OrderNotFoundError(orderId);
    }

    const [existingPayment] = await tx
      .select({ id: payments.id })
      .from(payments)
      .where(eq(payments.orderId, orderId))
      .limit(1);

    if (existingPayment) {
      throw new OrderLockedError(orderId);
    }

    if (input.customer !== undefined || input.dueDate !== undefined) {
      await tx
        .update(orders)
        .set({
          ...(input.customer !== undefined && { customer: input.customer }),
          ...(input.dueDate !== undefined && { dueDate: input.dueDate }),
        })
        .where(eq(orders.id, orderId));
    }

    if (input.lineItems) {
      await tx.delete(lineItems).where(eq(lineItems.orderId, orderId));
      await tx
        .insert(lineItems)
        .values(input.lineItems.map((item) => ({ ...item, orderId })));
      // totalAmount/balanceDue recalculate automatically via the
      // line_items_recalculate_total DB trigger once these inserts commit.
    }

    return orderId;
  });
};

export const deleteOrder = async (orderId: number, userId: number) => {
  return await db.transaction(async (tx) => {
    const [order] = await tx
      .select()
      .from(orders)
      .where(and(eq(orders.id, orderId), eq(orders.userId, userId)))
      .for("update");

    if (!order) {
      throw new OrderNotFoundError(orderId);
    }

    const [existingPayment] = await tx
      .select({ id: payments.id })
      .from(payments)
      .where(eq(payments.orderId, orderId))
      .limit(1);

    if (existingPayment) {
      throw new OrderLockedError(orderId);
    }

    await tx.delete(lineItems).where(eq(lineItems.orderId, orderId));
    await tx.delete(orders).where(eq(orders.id, orderId));
  });
};
export { OrderNotFoundError };
