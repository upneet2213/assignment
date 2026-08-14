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
export class OverpaymentError extends Error {
  constructor(orderId: number, attempted: string, balanceDue: string) {
    super(
      `Payment of ${attempted} exceeds balance due of ${balanceDue} for order ${orderId}`,
    );
    this.name = "OverpaymentError";
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
      throw new OverpaymentError(orderId, amount, order.balanceDue);
    }
    const [updatedOrder] = await tx
      .update(orders)
      .set({
        amountPaid: newAmountPaid,
        balanceDue: newBalanceDue,
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
