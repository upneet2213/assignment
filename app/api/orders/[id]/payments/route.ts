import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api-response";
import { RecordPaymentApiSchema } from "@/lib/api-schemas";
import { getOrderWithDetails } from "@/lib/order";
import {
  recordPayment,
  getPaymentsForOrder,
  OrderNotFoundError,
  OverpaymentError,
} from "@/lib/payments";
import { getCurrentUserId } from "@/lib/dal";

const parseOrderId = (id: string) => {
  const orderId = Number(id);
  return Number.isNaN(orderId) ? null : orderId;
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return apiError(401, "You must be logged in.");
  }

  const { id } = await params;
  const orderId = parseOrderId(id);
  if (orderId === null) {
    return apiError(400, "Invalid order id.");
  }

  // getOrderWithDetails is the ownership gate here — getPaymentsForOrder
  // itself doesn't check ownership, so we confirm the order belongs to
  // this user before ever calling it.
  const order = await getOrderWithDetails(orderId);
  if (!order) {
    return apiError(404, "Order not found.");
  }

  const payments = await getPaymentsForOrder(orderId);
  return apiSuccess(payments);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return apiError(401, "You must be logged in.");
  }

  const { id } = await params;
  const orderId = parseOrderId(id);
  if (orderId === null) {
    return apiError(400, "Invalid order id.");
  }

  // Same ownership gate as GET above, before touching payment logic at all.
  const order = await getOrderWithDetails(orderId);
  if (!order) {
    return apiError(404, "Order not found.");
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return apiError(400, "Request body must be valid JSON.");
  }

  const parsed = RecordPaymentApiSchema.safeParse(json);
  if (!parsed.success) {
    return apiError(400, "Validation failed.", parsed.error.flatten());
  }

  const { amount, date, note } = parsed.data;

  try {
    const updatedOrder = await recordPayment(orderId, amount, date, note);
    return apiSuccess(updatedOrder, 201);
  } catch (error) {
    if (error instanceof OrderNotFoundError) {
      return apiError(404, "Order not found.");
    }
    if (error instanceof OverpaymentError) {
      // Include the actual max allowed amount, per the spec's requirement
      // for an actionable error message.
      return apiError(409, error.message, {
        maxAllowedAmount: order.balanceDue,
      });
    }

    console.error("POST /api/orders/[id]/payments failed:", error);
    return apiError(500, "Failed to record payment.");
  }
}
