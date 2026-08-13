"use server";
import { CreateOrderSchema } from "@/lib/definitions";
import { createOrder } from "@/lib/order";
import { SubmissionResult } from "@conform-to/react";
import { parseWithZod } from "@conform-to/zod/v4";

export const createOrderAction = async (
  _prevState: SubmissionResult<string[]> | undefined,
  formData: FormData,
) => {
  const submission = parseWithZod(formData, {
    schema: CreateOrderSchema,
  });

  if (submission.status !== "success") {
    return submission.reply();
  }
  const { customer, dueDate, lineItems } = submission.value;
  try {
    await createOrder(customer, dueDate, lineItems);
  } catch (error) {
    console.error("Failed to create order:", error);
    return submission.reply({
      formErrors: [
        "Something went wrong while recording the payment. Please try again.",
      ],
    });
  }
};
