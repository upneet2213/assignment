"use server";
import { PaymentFormSchema } from "@/lib/definitions";
import { recordPayment, OrderNotFoundError } from "@/lib/payments";
import { parseWithZod } from "@conform-to/zod/v4";
import { SubmissionResult } from "@conform-to/react";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function makePayment(
  orderId: number,
  _prevState: SubmissionResult<string[]> | undefined,
  formData: FormData,
) {
  const submission = parseWithZod(formData, {
    schema: PaymentFormSchema,
  });

  if (submission.status !== "success") {
    return submission.reply();
  }

  const { amount, note } = submission.value;

  try {
    await recordPayment(orderId, amount, note);
  } catch (error) {
    if (error instanceof OrderNotFoundError) {
      return submission.reply({
        formErrors: ["This order no longer exists."],
      });
    }
    console.error("Failed to record payment:", error);
    return submission.reply({
      formErrors: [
        "Something went wrong while recording the payment. Please try again.",
      ],
    });
  }

  revalidatePath(`/payments/${orderId}`);
  revalidatePath("/"); // orders list, if that's where your dashboard lives

  redirect("/");
}
