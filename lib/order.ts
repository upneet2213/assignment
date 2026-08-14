"server-only";
import { orders, lineItems } from "@/db/schema";
import { db } from "./db";
import { eq, desc, sql, and } from "drizzle-orm";
import { getCurrentUserId } from "./dal";

type LineItemInput = {
  description: string;
  quantity: number;
  unitPrice: string;
};
type GetOrdersOptions = {
  page?: number;
  pageSize?: number;
};

type OrderStatusInput = {
  totalAmount: string;
  amountPaid: string;
  dueDate: Date | string;
};

export type OrderStatus = "paid" | "partially_paid" | "pending" | "overdue";

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
}: GetOrdersOptions = {}) => {
  const offset = (page - 1) * pageSize;
  const currentUserId = await getCurrentUserId();
  if (!currentUserId) {
    throw new Error("You must be logged in to access your orders.");
  }

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
    .where(eq(orders.userId, currentUserId))
    .orderBy(desc(orders.dueDate))
    .limit(pageSize)
    .offset(offset);

  const updatedResults = results.map((result) => {
    return {
      ...result,
      status: deriveOrderStatus(result),
    };
  });

  const [{ count }] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(orders)
    .where(eq(orders.userId, currentUserId));

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
