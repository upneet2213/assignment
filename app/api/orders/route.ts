import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api-response";
import { CreateOrderApiSchema } from "@/lib/api-schemas";
import { createOrder, getOrdersList, OrderStatus } from "@/lib/order";
import { getCurrentUserId } from "@/lib/dal";

const VALID_STATUSES = new Set([
  "pending",
  "partially_paid",
  "paid",
  "overdue",
]);

export async function GET(request: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return apiError(401, "You must be logged in.");
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const pageSize = Math.min(
    100,
    Math.max(1, Number(searchParams.get("pageSize")) || 20),
  );
  const statusParam = searchParams.get("status");
  const status =
    statusParam && VALID_STATUSES.has(statusParam)
      ? (statusParam as OrderStatus)
      : undefined;

  try {
    const result = await getOrdersList({ page, pageSize, status });
    return apiSuccess(result);
  } catch (error) {
    console.error("GET /api/orders failed:", error);
    return apiError(500, "Failed to fetch orders.");
  }
}

export async function POST(request: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return apiError(401, "You must be logged in.");
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return apiError(400, "Request body must be valid JSON.");
  }

  const parsed = CreateOrderApiSchema.safeParse(json);
  if (!parsed.success) {
    return apiError(400, "Validation failed.", parsed.error.flatten());
  }

  const { customer, dueDate, lineItems } = parsed.data;

  try {
    const orderId = await createOrder(customer, dueDate, lineItems);
    return apiSuccess({ id: orderId }, 201);
  } catch (error) {
    console.error("POST /api/orders failed:", error);
    return apiError(500, "Failed to create order.");
  }
}
