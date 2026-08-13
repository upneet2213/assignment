"use client";
import { useActionState } from "react";
import { useForm, getFormProps, getInputProps } from "@conform-to/react";
import { parseWithZod } from "@conform-to/zod/v4";
import { CreateOrderSchema } from "@/lib/definitions";
import { createOrderAction } from "@/app/actions/orders";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CreateOrderForm() {
  const [lastResult, formAction, isPending] = useActionState(
    createOrderAction,
    undefined,
  );

  const [form, fields] = useForm({
    lastResult,
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: CreateOrderSchema });
    },
    shouldValidate: "onBlur",
    shouldRevalidate: "onInput",
    defaultValue: {
      lineItems: [{ description: "", quantity: "1", unitPrice: "" }],
    },
  });

  const lineItems = fields.lineItems.getFieldList();

  return (
    <form {...getFormProps(form)} action={formAction} className="space-y-6">
      <div>
        <Label
          htmlFor={fields.customer.id}
          className="block text-sm font-medium mb-1"
        >
          Customer
        </Label>
        <Input
          {...getInputProps(fields.customer, { type: "text" })}
          key={fields.customer.key}
        />
        {fields.customer.errors && (
          <p className="text-sm text-destructive mt-1">
            {fields.customer.errors}
          </p>
        )}
      </div>

      <div>
        <Label
          htmlFor={fields.dueDate.id}
          className="block text-sm font-medium mb-1"
        >
          Due date
        </Label>
        <Input
          {...getInputProps(fields.dueDate, { type: "date" })}
          key={fields.dueDate.key}
        />
        {fields.dueDate.errors && (
          <p className="text-sm text-destructive mt-1">
            {fields.dueDate.errors}
          </p>
        )}
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Line items</h2>
          <Button
            type="submit"
            variant="outline"
            size="sm"
            {...form.insert.getButtonProps({ name: fields.lineItems.name })}
          >
            Add line item
          </Button>
        </div>

        {fields.lineItems.errors && (
          <p className="text-sm text-destructive">{fields.lineItems.errors}</p>
        )}

        {lineItems.map((lineItem, index) => {
          const itemFields = lineItem.getFieldset();
          return (
            <div
              key={lineItem.key}
              className="grid grid-cols-[1fr_100px_120px_auto] gap-2 items-start"
            >
              <div>
                <Input
                  {...getInputProps(itemFields.description, { type: "text" })}
                  key={itemFields.description.key}
                  placeholder="Description"
                />
                {itemFields.description.errors && (
                  <p className="text-sm text-destructive mt-1">
                    {itemFields.description.errors}
                  </p>
                )}
              </div>

              <div>
                <Input
                  {...getInputProps(itemFields.quantity, { type: "number" })}
                  key={itemFields.quantity.key}
                  placeholder="Qty"
                />
                {itemFields.quantity.errors && (
                  <p className="text-sm text-destructive mt-1">
                    {itemFields.quantity.errors}
                  </p>
                )}
              </div>

              <div>
                <Input
                  {...getInputProps(itemFields.unitPrice, { type: "text" })}
                  key={itemFields.unitPrice.key}
                  placeholder="0.00"
                />
                {itemFields.unitPrice.errors && (
                  <p className="text-sm text-destructive mt-1">
                    {itemFields.unitPrice.errors}
                  </p>
                )}
              </div>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={lineItems.length <= 1}
                {...form.remove.getButtonProps({
                  name: fields.lineItems.name,
                  index,
                })}
              >
                ✕
              </Button>
            </div>
          );
        })}
      </div>

      {form.errors && <p className="text-sm text-destructive">{form.errors}</p>}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Creating…" : "Create order"}
      </Button>
    </form>
  );
}
