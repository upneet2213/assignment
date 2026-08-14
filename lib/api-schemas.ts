import { z } from "zod";

const LineItemApiSchema = z.object({
  description: z.string().trim().min(1, "Description is required"),
  quantity: z.number().int().positive("Quantity must be at least 1"),
  unitPrice: z
    .string()
    .trim()
    .regex(
      /^\d+(\.\d{1,2})?$/,
      'unitPrice must be a decimal string, e.g. "10.00"',
    ),
});

export const CreateOrderApiSchema = z.object({
  customer: z.string().trim().min(1, "Customer is required"),
  dueDate: z.coerce.date({ error: "dueDate must be a valid date" }),
  lineItems: z
    .array(LineItemApiSchema)
    .min(1, "At least one line item is required"),
});

// All fields optional — PATCH only updates what's provided. If lineItems
// is provided, it fully replaces the existing set (not merged).
export const UpdateOrderApiSchema = z.object({
  customer: z.string().trim().min(1).optional(),
  dueDate: z.coerce.date().optional(),
  lineItems: z.array(LineItemApiSchema).min(1).optional(),
});

export const RecordPaymentApiSchema = z.object({
  amount: z
    .string()
    .trim()
    .regex(
      /^\d+(\.\d{1,2})?$/,
      'amount must be a decimal string, e.g. "100.00"',
    )
    .refine((val) => Number(val) >= 0.01, "amount must be at least 0.01"),
  date: z.coerce.date({ error: "date must be a valid date" }),
  note: z.string().trim().max(500).optional(),
});
