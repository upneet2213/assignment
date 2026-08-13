import * as z from "zod";

export const SignupFormSchema = z.object({
  name: z
    .string()
    .min(2, { error: "Name must be at least 2 characters long." })
    .trim(),
  email: z.email({ error: "Please enter a valid email." }).trim(),
  password: z
    .string()
    .min(8, { error: "Be at least 8 characters long" })
    .regex(/[a-zA-Z]/, { error: "Contain at least one letter." })
    .regex(/[0-9]/, { error: "Contain at least one number." })
    .regex(/[^a-zA-Z0-9]/, {
      error: "Contain at least one special character.",
    })
    .trim(),
});

export const LoginFormSchema = z.object({
  email: z.email({ error: "Please enter a valid email." }).trim(),
  password: z.string().trim(),
});

export type SessionPayload = {
  userId: number;
  expiresAt: Date;
};

export type FormState =
  | {
      errors?: {
        name?: string[];
        email?: string[];
        password?: string[];
      };
      message?: string;
    }
  | undefined;

export const PaymentFormSchema = z.object({
  amount: z
    .string()
    .trim()
    .regex(/^\d+(\.\d{1,2})?$/, "Enter a valid amount, e.g. 100.00")
    .refine((val) => Number(val) > 0, "Amount must be greater than 0"),
  note: z.string().trim().max(500).optional(),
});

export const LineItemSchema = z.object({
  description: z.string().trim().min(1, "Description is required"),
  quantity: z.coerce
    .number({ error: "Enter a quantity" })
    .int("Quantity must be a whole number")
    .positive("Quantity must be at least 1"),
  unitPrice: z
    .string()
    .trim()
    .regex(/^\d+(\.\d{1,2})?$/, "Enter a valid price, e.g. 10.00"),
});
export const CreateOrderSchema = z.object({
  customer: z.string().trim().min(1, "Customer name is required"),
  dueDate: z.coerce.date({ error: "Enter a valid due date" }),
  lineItems: z.array(LineItemSchema).min(1, "Add at least one line item"),
});
