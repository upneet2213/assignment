import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api-response";
import { UpdateOrderApiSchema } from "@/lib/api-schemas";
import {
  getOrderWithDetails,
  updateOrder,
  deleteOrder,
  OrderNotFoundError,
  OrderLockedError,
} from "@/lib/order";
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

  const order = await getOrderWithDetails(orderId);
  if (!order) {
    return apiError(404, "Order not found.");
  }

  return apiSuccess(order);
}

export async function PATCH(
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

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return apiError(400, "Request body must be valid JSON.");
  }

  const parsed = UpdateOrderApiSchema.safeParse(json);
  if (!parsed.success) {
    return apiError(400, "Validation failed.", parsed.error.flatten());
  }

  try {
    await updateOrder(orderId, userId, parsed.data);
  } catch (error) {
    if (error instanceof OrderNotFoundError) {
      return apiError(404, "Order not found.");
    }
    if (error instanceof OrderLockedError) {
      return apiError(
        409,
        "This order cannot be edited because a payment has already been recorded against it.",
      );
    }
    console.error("PATCH /api/orders/[id] failed:", error);
    return apiError(500, "Failed to update order.");
  }

  const updated = await getOrderWithDetails(orderId);
  return apiSuccess(updated);
}

export async function DELETE(
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

  try {
    await deleteOrder(orderId, userId);
  } catch (error) {
    if (error instanceof OrderNotFoundError) {
      return apiError(404, "Order not found.");
    }
    if (error instanceof OrderLockedError) {
      return apiError(
        409,
        "This order cannot be deleted because a payment has already been recorded against it.",
      );
    }
    console.error("DELETE /api/orders/[id] failed:", error);
    return apiError(500, "Failed to delete order.");
  }

  return apiSuccess({ deleted: true });
}
