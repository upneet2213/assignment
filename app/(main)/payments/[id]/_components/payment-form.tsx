"use client";
import { useActionState } from "react";
import { useForm, getFormProps, getInputProps } from "@conform-to/react";
import { parseWithZod } from "@conform-to/zod/v4";
import { PaymentFormSchema } from "@/lib/definitions";
import { makePayment } from "@/app/actions/payments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type PaymentFormProps = {
  orderId: number;
};

const todayIsoDate = () => new Date().toISOString().slice(0, 10);

export function PaymentForm({ orderId }: PaymentFormProps) {
  const makePaymentForOrder = makePayment.bind(null, orderId);
  const [lastResult, formAction, isPending] = useActionState(
    makePaymentForOrder,
    undefined,
  );

  const [form, fields] = useForm({
    lastResult,
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: PaymentFormSchema });
    },
    shouldValidate: "onBlur",
    shouldRevalidate: "onInput",
    defaultValue: {
      date: todayIsoDate(),
    },
  });

  return (
    <form {...getFormProps(form)} action={formAction} className="space-y-4">
      <div>
        <label
          htmlFor={fields.amount.id}
          className="block text-sm font-medium mb-1"
        >
          Amount
        </label>
        <Input
          {...getInputProps(fields.amount, { type: "text" })}
          key={fields.amount.key}
          placeholder="100.00"
        />
        {fields.amount.errors && (
          <p
            id={fields.amount.errorId}
            className="text-sm text-destructive mt-1"
          >
            {fields.amount.errors}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor={fields.date.id}
          className="block text-sm font-medium mb-1"
        >
          Payment date
        </label>
        <Input
          {...getInputProps(fields.date, { type: "date" })}
          key={fields.date.key}
          max={todayIsoDate()}
        />
        {fields.date.errors && (
          <p id={fields.date.errorId} className="text-sm text-destructive mt-1">
            {fields.date.errors}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor={fields.note.id}
          className="block text-sm font-medium mb-1"
        >
          Note (optional)
        </label>
        <Input
          {...getInputProps(fields.note, { type: "text" })}
          key={fields.note.key}
          placeholder="e.g. bank transfer"
        />
        {fields.note.errors && (
          <p id={fields.note.errorId} className="text-sm text-destructive mt-1">
            {fields.note.errors}
          </p>
        )}
      </div>

      {form.errors && (
        <p id={form.errorId} className="text-sm text-destructive">
          {form.errors}
        </p>
      )}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Processing…" : "Make Payment"}
      </Button>
    </form>
  );
}
