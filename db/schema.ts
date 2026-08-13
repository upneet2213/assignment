import { relations } from "drizzle-orm";
import {
  integer,
  numeric,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const paymentStatusEnum = pgEnum("status", [
  "pending",
  "paid",
  "partially_paid",
  "overdue",
]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").unique().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  password: text("password").notNull(),
});

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id")
    .notNull()
    .references(() => users.id, {
      onDelete: "restrict",
    }),
  dueDate: timestamp("due_date").notNull(),
  status: paymentStatusEnum("status").notNull(),
});

export const lineItems = pgTable("line_items", {
  id: serial("id").primaryKey(),
  description: text("description").notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: numeric("unit_price", { precision: 10, scale: 2 }).notNull(),
  orderId: integer("order_id")
    .notNull()
    .references(() => orders.id),
});

export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id")
    .notNull()
    .references(() => orders.id),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  date: timestamp("date").defaultNow().notNull(),
  note: text("note"),
});

export const userRelations = relations(users, ({ many }) => ({
  orders: many(orders),
}));

export const orderRelations = relations(orders, ({ one, many }) => ({
  customer: one(users, {
    fields: [orders.customerId],
    references: [users.id],
  }),
  lineItems: many(lineItems),
  payments: many(payments),
}));

export const lineItemsRelations = relations(lineItems, ({ one }) => ({
  order: one(orders, { fields: [lineItems.orderId], references: [orders.id] }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  order: one(orders, { fields: [payments.orderId], references: [orders.id] }),
}));
