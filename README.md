This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Order status

Order status is **derived**, not stored — it's computed on every read from
`totalAmount`, `amountPaid`, and `dueDate` (see `lib/order.ts`,
`deriveOrderStatus`). It is never written to the database or trusted as
independent state, because one of its conditions (`overdue`) depends on
the current date, which has no corresponding write event to keep a stored
value in sync with.

| Status           | Condition                                                  |
| ---------------- | ---------------------------------------------------------- |
| `pending`        | No payments recorded, due date not yet passed              |
| `partially_paid` | Some payment recorded, less than order total, not past due |
| `paid`           | Total payments meet or exceed the order total              |
| `overdue`        | Past due date and not fully paid                           |

## Edge cases

### 1. An order that was overdue but is now fully paid

`paid` is evaluated **before** `overdue` in `deriveOrderStatus`. Once
`amountPaid >= totalAmount`, the function returns `paid` immediately and
never checks the due date — so an order that was overdue right up until
the final payment lands correctly shows as `paid`, with no special
"un-overdue" handling required. This falls out of the precedence order,
not a separate case that had to be coded around.

### 2. Overdue orders can still accept payments

Being overdue does not close an order to payment — it just means it's
late. `recordPayment` only rejects payment on an order whose _current_
derived status is `paid`; `overdue`, `pending`, and `partially_paid` all
still accept payments. This is intentional: blocking payment on overdue
orders would make it impossible for a late order to ever be paid off,
since the moment it passes its due date it would be permanently stuck.

### 3. Overpayment

A payment that would make `balanceDue` negative is rejected with
`OverpaymentError`, inside the same transaction as the payment insert —
so the transaction rolls back entirely (see `docs/payment-concurrency.md`)
and nothing is partially recorded.

### 4. Concurrent payments on the same order

Two payments arriving for the same order at nearly the same time (e.g. a
retried request) are serialized via `SELECT ... FOR UPDATE` on the order
row for the duration of the transaction, rather than racing and
potentially losing one payment's effect on `amountPaid`/`balanceDue`. See
`docs/payment-concurrency.md` for the full reasoning and pattern.

### 5. Zero-total order

`deriveOrderStatus` explicitly guards `totalAmount > 0` before returning
`paid` — an order with a total of 0 (e.g. before any line items are
added, if that state is ever reachable) does not spuriously show as
`paid` just because `amountPaid (0) >= totalAmount (0)`.

## Known limitations / not yet handled

- **Idempotency**: a duplicate payment request (e.g. a retried webhook)
  is currently recorded twice rather than deduplicated. Would need a
  unique idempotency key on `payments` to close this gap.
- **No write-off / cancellation flow**: there's currently no way to mark
  an overdue order as uncollectable/cancelled short of it eventually
  being paid — status is purely derived from amounts and dates, with no
  manual override state.
