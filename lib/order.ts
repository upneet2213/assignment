"server-only";
import { orders, lineItems, payments, users } from "@/db/schema";
import { db } from "./db";
import { eq, sql, desc } from "drizzle-orm";

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
  customerId: number,
  dueDate: Date,
  items: LineItemInput[],
) => {
  return await db.transaction(async (tx) => {
    const [order] = await tx
      .insert(orders)
      .values({
        customerId,
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
      customer: {
        columns: { id: true, name: true, email: true }, // omit password
      },
    },
  });

  if (!order) return null;

  const totalAmount = order.lineItems.reduce(
    (sum, item) => sum + Number(item.unitPrice) * item.quantity,
    0,
  );

  const totalPaid = order.payments.reduce(
    (sum, payment) => sum + Number(payment.amount),
    0,
  );

  return {
    ...order,
    totalAmount,
    totalPaid,
    balanceDue: totalAmount - totalPaid,
  };
};

export const getOrdersList = async ({
  page = 1,
  pageSize = 20,
}: GetOrdersOptions = {}) => {
  const offset = (page - 1) * pageSize;

  const lineItemTotals = db
    .select({
      orderId: lineItems.orderId,
      totalAmount:
        sql<string>`COALESCE(SUM(${lineItems.quantity} * ${lineItems.unitPrice}), 0)`.as(
          "total_amount",
        ),
    })
    .from(lineItems)
    .groupBy(lineItems.orderId)
    .as("line_item_totals");

  const paymentTotals = db
    .select({
      orderId: payments.orderId,
      totalPaid: sql<string>`COALESCE(SUM(${payments.amount}), 0)`.as(
        "total_paid",
      ),
    })
    .from(payments)
    .groupBy(payments.orderId)
    .as("payment_totals");

  const results = await db
    .select({
      id: orders.id,
      dueDate: orders.dueDate,
      status: orders.status,
      customerName: users.name,
      customerEmail: users.email,
      totalAmount: sql<string>`COALESCE(${lineItemTotals.totalAmount}, 0)`,
      totalPaid: sql<string>`COALESCE(${paymentTotals.totalPaid}, 0)`,
      balanceDue: sql<string>`COALESCE(${lineItemTotals.totalAmount}, 0) - COALESCE(${paymentTotals.totalPaid}, 0)`,
    })
    .from(orders)
    .leftJoin(users, eq(users.id, orders.customerId))
    .leftJoin(lineItemTotals, eq(lineItemTotals.orderId, orders.id))
    .leftJoin(paymentTotals, eq(paymentTotals.orderId, orders.id))
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
