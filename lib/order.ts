"server-only";
import { orders, lineItems, users } from "@/db/schema";
import { db } from "./db";
import { eq, desc, sql } from "drizzle-orm";

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
    const [order] = await tx
      .insert(orders)
      .values({
        customer,
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
  const order = await db.query.orders.findFirst({
    where: eq(orders.id, orderId),
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
    // .where(eq(users.id, ))
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
