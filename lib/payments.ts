"server-only";
import { orders, payments } from "@/db/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export class OrderNotFoundError extends Error {
  constructor(orderId: number) {
    super(`Order ${orderId} not found`);
    this.name = "OrderNotFoundError";
  }
}

/**
 * Records a payment against an order, updating amountPaid/balanceDue/status
 * atomically and safely under concurrent calls.
 *
 * Concurrency: locks the order row (`SELECT ... FOR UPDATE`) for the
 * duration of the transaction, so two payments for the *same* order
 * arriving at nearly the same time are serialized rather than racing —
 * see docs/payment-concurrency.md for the full reasoning. Payments for
 * different orders are unaffected and proceed in parallel.
 *
 * Not yet handled (see docs/payment-concurrency.md "future work"):
 * idempotency (duplicate webhook delivery) and overpayment guards.
 */
export const recordPayment = async (
  orderId: number,
  amount: string,
  note?: string,
) => {
  return await db.transaction(async (tx) => {
    const [order] = await tx
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .for("update");

    if (!order) {
      throw new OrderNotFoundError(orderId);
    }

    await tx.insert(payments).values({ orderId, amount, note });

    const newAmountPaid = (Number(order.amountPaid) + Number(amount)).toFixed(
      2,
    );
    const newBalanceDue = (
      Number(order.totalAmount) - Number(newAmountPaid)
    ).toFixed(2);

    if (Number(newBalanceDue) < 0) {
      throw new Error("Cannot overpay");
    }

    const newStatus =
      Number(newBalanceDue) <= 0
        ? "paid"
        : Number(newAmountPaid) > 0
          ? "partially_paid"
          : order.status;

    const [updatedOrder] = await tx
      .update(orders)
      .set({
        amountPaid: newAmountPaid,
        balanceDue: newBalanceDue,
        status: newStatus,
      })
      .where(eq(orders.id, orderId))
      .returning();

    return updatedOrder;
  });
};

export const getPaymentsForOrder = async (orderId: number) => {
  return await db
    .select()
    .from(payments)
    .where(eq(payments.orderId, orderId))
    .orderBy(desc(payments.date));
};
