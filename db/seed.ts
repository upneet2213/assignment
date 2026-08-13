"server-only";
import { db } from "@/lib/db";
import { orders, lineItems, payments } from "@/db/schema";

const CUSTOMER = "Upneet Singh";

const daysFromNow = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
};

async function seed() {
  console.log("Seeding orders for user", CUSTOMER, "...");

  // Order 1: pending, due in the future, no payments yet
  const [order1] = await db
    .insert(orders)
    .values({
      customer: CUSTOMER,
      dueDate: daysFromNow(14),
      status: "pending",
    })
    .returning({ id: orders.id });

  await db.insert(lineItems).values([
    {
      description: "Website design – homepage",
      quantity: 1,
      unitPrice: "1200.00",
      orderId: order1.id,
    },
    {
      description: "Website design – contact page",
      quantity: 1,
      unitPrice: "400.00",
      orderId: order1.id,
    },
  ]);

  // Order 2: partially paid
  const [order2] = await db
    .insert(orders)
    .values({
      customer: CUSTOMER,
      dueDate: daysFromNow(7),
      status: "partially_paid",
    })
    .returning({ id: orders.id });

  await db.insert(lineItems).values([
    {
      description: "Logo design",
      quantity: 1,
      unitPrice: "500.00",
      orderId: order2.id,
    },
    {
      description: "Brand guidelines document",
      quantity: 1,
      unitPrice: "300.00",
      orderId: order2.id,
    },
  ]);

  await db.insert(payments).values([
    {
      orderId: order2.id,
      amount: "400.00",
      note: "Deposit",
    },
  ]);

  // Order 3: fully paid
  const [order3] = await db
    .insert(orders)
    .values({
      customer: CUSTOMER,
      dueDate: daysFromNow(-3),
      status: "paid",
    })
    .returning({ id: orders.id });

  await db.insert(lineItems).values([
    {
      description: "Consulting – 5 hours",
      quantity: 5,
      unitPrice: "150.00",
      orderId: order3.id,
    },
  ]);

  await db.insert(payments).values([
    {
      orderId: order3.id,
      amount: "750.00",
      note: "Paid in full via bank transfer",
    },
  ]);

  // Order 4: overdue, unpaid
  const [order4] = await db
    .insert(orders)
    .values({
      customer: CUSTOMER,
      dueDate: daysFromNow(-10),
      status: "overdue",
    })
    .returning({ id: orders.id });

  await db.insert(lineItems).values([
    {
      description: "Monthly hosting – March",
      quantity: 1,
      unitPrice: "50.00",
      orderId: order4.id,
    },
    {
      description: "Monthly hosting – April",
      quantity: 1,
      unitPrice: "50.00",
      orderId: order4.id,
    },
  ]);

  // Order 5: pending, larger order, multiple line items
  const [order5] = await db
    .insert(orders)
    .values({
      customer: CUSTOMER,
      dueDate: daysFromNow(21),
      status: "pending",
    })
    .returning({ id: orders.id });

  await db.insert(lineItems).values([
    {
      description: "Custom illustration set (10 pieces)",
      quantity: 10,
      unitPrice: "80.00",
      orderId: order5.id,
    },
    {
      description: "Revisions (3 rounds)",
      quantity: 3,
      unitPrice: "50.00",
      orderId: order5.id,
    },
  ]);

  console.log("Seed complete. Created orders:", [
    order1.id,
    order2.id,
    order3.id,
    order4.id,
    order5.id,
  ]);
}

seed()
  .then(() => {
    console.log("Done.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
