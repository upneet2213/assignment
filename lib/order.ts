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
        status: "pending",
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

  return order ?? null;
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
      status: orders.status,
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

  const [{ count }] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(orders);

  return {
    orders: results,
    pagination: {
      page,
      pageSize,
      totalCount: count,
      totalPages: Math.ceil(count / pageSize),
    },
  };
};
