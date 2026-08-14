import { relations, sql, SQL } from "drizzle-orm";
import {
  index,
  integer,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").unique().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  password: text("password").notNull(),
});

export const orders = pgTable(
  "orders",
  {
    id: serial("id").primaryKey(),
    customer: text("customer").notNull(),
    dueDate: timestamp("due_date").notNull(),
    totalAmount: numeric("total_amount", { precision: 10, scale: 2 })
      .notNull()
      .default("0"),
    amountPaid: numeric("amount_paid", { precision: 10, scale: 2 })
      .notNull()
      .default("0"),
    balanceDue: numeric("balance_due", { precision: 10, scale: 2 })
      .notNull()
      .default("0"),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id),
  },
  (table) => [
    // Covers WHERE user_id = ? ... ORDER BY due_date in one structure —
    // getOrdersList does exactly this, filter + sort, every call.
    index("orders_user_id_due_date_idx").on(table.userId, table.dueDate),
  ],
);

export const lineItems = pgTable(
  "line_items",
  {
    id: serial("id").primaryKey(),
    description: text("description").notNull(),
    quantity: integer("quantity").notNull(),
    unitPrice: numeric("unit_price", { precision: 10, scale: 2 }).notNull(),
    subtotal: numeric("subtotal", {
      precision: 10,
      scale: 2,
    }).generatedAlwaysAs((): SQL => sql`quantity * unit_price`),
    orderId: integer("order_id")
      .notNull()
      .references(() => orders.id),
  },
  (table) => [index("line_items_order_id_idx").on(table.orderId)],
);

export const payments = pgTable(
  "payments",
  {
    id: serial("id").primaryKey(),
    orderId: integer("order_id")
      .notNull()
      .references(() => orders.id),
    amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
    date: timestamp("date").defaultNow().notNull(),
    note: text("note"),
  },
  (table) => [index("payments_order_id_idx").on(table.orderId)],
);

export const userRelations = relations(users, ({ many }) => ({
  orders: many(orders),
}));

export const orderRelations = relations(orders, ({ one, many }) => ({
  user: one(users, { fields: [orders.userId], references: [users.id] }),
  lineItems: many(lineItems),
  payments: many(payments),
}));

export const lineItemsRelations = relations(lineItems, ({ one }) => ({
  order: one(orders, { fields: [lineItems.orderId], references: [orders.id] }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  order: one(orders, { fields: [payments.orderId], references: [orders.id] }),
}));
