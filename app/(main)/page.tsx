import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getOrdersList, OrderStatus } from "@/lib/order";
import Link from "next/link";

const PAGE_SIZE = 10;

type MainProps = {
  searchParams: Promise<{ page?: string; status?: string }>;
};

const STATUS_OPTIONS: { label: string; value: OrderStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Partially paid", value: "partially_paid" },
  { label: "Paid", value: "paid" },
  { label: "Overdue", value: "overdue" },
];

const VALID_STATUSES = new Set([
  "pending",
  "partially_paid",
  "paid",
  "overdue",
]);

const formatCurrency = (value: string | number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    Number(value),
  );

const formatDate = (value: Date | string) =>
  new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(
    new Date(value),
  );

const statusStyles: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  paid: "bg-green-100 text-green-800",
  partially_paid: "bg-blue-100 text-blue-800",
  overdue: "bg-red-100 text-red-800",
};

const getPageNumbers = (currentPage: number, totalPages: number) => {
  const delta = 1;
  const pages: (number | "ellipsis")[] = [];
  const range = {
    start: Math.max(2, currentPage - delta),
    end: Math.min(totalPages - 1, currentPage + delta),
  };
  pages.push(1);
  if (range.start > 2) pages.push("ellipsis");
  for (let i = range.start; i <= range.end; i++) pages.push(i);
  if (range.end < totalPages - 1) pages.push("ellipsis");
  if (totalPages > 1) pages.push(totalPages);
  return pages;
};

const Main = async ({ searchParams }: MainProps) => {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const statusFilter = VALID_STATUSES.has(params.status ?? "")
    ? (params.status as OrderStatus)
    : undefined;

  const { orders, pagination } = await getOrdersList({
    page,
    pageSize: PAGE_SIZE,
    status: statusFilter,
  });

  // Preserve the current status filter when changing pages, and reset to
  // page 1 whenever the status filter itself changes.
  const buildHref = (overrides: { page?: number; status?: string }) => {
    const next = new URLSearchParams();
    const nextStatus = overrides.status ?? statusFilter ?? "all";
    if (nextStatus !== "all") next.set("status", nextStatus);
    next.set("page", String(overrides.page ?? page));
    return `?${next.toString()}`;
  };

  return (
    <div className="p-10">
      <h1 className="text-3xl text-center mb-10">Your orders</h1>

      <div className="flex gap-2 mb-6 justify-center">
        {STATUS_OPTIONS.map((option) => {
          const isActive = (statusFilter ?? "all") === option.value;
          return (
            <Button
              key={option.value}
              variant={isActive ? "default" : "outline"}
              size="sm"
            >
              <Link href={buildHref({ status: option.value, page: 1 })}>
                {option.label}
              </Link>
            </Button>
          );
        })}
      </div>

      <Table>
        <TableCaption>A list of your recent invoices.</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Customer</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Due date</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead className="text-right">Paid</TableHead>
            <TableHead className="text-right">Amount due</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={7}
                className="text-center text-muted-foreground"
              >
                No orders found.
              </TableCell>
            </TableRow>
          )}
          {orders.map((order) => (
            <TableRow key={order.id}>
              <TableCell>{order.customer}</TableCell>
              <TableCell>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${
                    statusStyles[order.status] ??
                    "bg-muted text-muted-foreground"
                  }`}
                >
                  {order.status.replace("_", " ")}
                </span>
              </TableCell>
              <TableCell>{formatDate(order.dueDate)}</TableCell>
              <TableCell className="text-right">
                {formatCurrency(order.totalAmount)}
              </TableCell>
              <TableCell className="text-right">
                {formatCurrency(order.amountPaid)}
              </TableCell>
              <TableCell className="text-right">
                {formatCurrency(order.balanceDue)}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Button size="sm">
                    <Link href={`/payments/${order.id}`}>Make payment</Link>
                  </Button>
                  <Button size="sm">
                    <Link href={`/orders/${order.id}`}>View</Link>
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="flex items-center justify-between mt-6">
        <p className="text-sm text-muted-foreground">
          Page {pagination.page} of {pagination.totalPages || 1} (
          {pagination.totalCount} total)
        </p>

        <div className="flex items-center gap-2">
          <Button variant="outline" disabled={page <= 1}>
            <Link
              href={buildHref({ page: page - 1 })}
              aria-disabled={page <= 1}
              tabIndex={page <= 1 ? -1 : undefined}
              className={page <= 1 ? "pointer-events-none opacity-50" : ""}
            >
              Previous
            </Link>
          </Button>

          {getPageNumbers(page, pagination.totalPages).map((pageNum, i) =>
            pageNum === "ellipsis" ? (
              <span
                key={`ellipsis-${i}`}
                className="px-2 text-sm text-muted-foreground"
              >
                …
              </span>
            ) : (
              <Button
                key={pageNum}
                variant={pageNum === page ? "default" : "outline"}
                size="icon"
              >
                <Link
                  href={buildHref({ page: pageNum })}
                  aria-current={pageNum === page ? "page" : undefined}
                >
                  {pageNum}
                </Link>
              </Button>
            ),
          )}

          <Button variant="outline" disabled={page >= pagination.totalPages}>
            <Link
              href={buildHref({ page: page + 1 })}
              aria-disabled={page >= pagination.totalPages}
              tabIndex={page >= pagination.totalPages ? -1 : undefined}
              className={
                page >= pagination.totalPages
                  ? "pointer-events-none opacity-50"
                  : ""
              }
            >
              Next
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Main;
