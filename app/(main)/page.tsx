import { LogoutButton } from "@/components/logout-button";
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
import { getOrdersList } from "@/lib/order";
import Link from "next/link";

const PAGE_SIZE = 10;

type MainProps = {
  searchParams: Promise<{ page?: string }>;
};

// Builds a compact page list like [1, "...", 4, 5, 6, "...", 20] instead of
// rendering every page number when there are many pages.
const getPageNumbers = (currentPage: number, totalPages: number) => {
  const delta = 1; // how many neighbors to show on each side of currentPage
  const pages: (number | "ellipsis")[] = [];

  const range = {
    start: Math.max(2, currentPage - delta),
    end: Math.min(totalPages - 1, currentPage + delta),
  };

  pages.push(1);

  if (range.start > 2) {
    pages.push("ellipsis");
  }

  for (let i = range.start; i <= range.end; i++) {
    pages.push(i);
  }

  if (range.end < totalPages - 1) {
    pages.push("ellipsis");
  }

  if (totalPages > 1) {
    pages.push(totalPages);
  }

  return pages;
};

const Main = async ({ searchParams }: MainProps) => {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);

  const { orders, pagination } = await getOrdersList({
    page,
    pageSize: PAGE_SIZE,
  });

  return (
    <div className="p-10">
      <div className="flex items-center mb-20 justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-3xl text-center">Your orders</h1>
          <Button>
            <Link href={"/orders/create"}>Create New</Link>
          </Button>
        </div>
        <LogoutButton />
      </div>
      <Table>
        <TableCaption>A list of your recent invoices.</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Customer</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Total Amount</TableHead>
            <TableHead>Amount Pending</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => (
            <TableRow key={order.id}>
              <TableCell>{order.customer}</TableCell>
              <TableCell>{order.status}</TableCell>
              <TableCell className="text-right">{order.totalAmount}</TableCell>
              <TableCell>{order.balanceDue}</TableCell>
              <TableCell>
                <Link href={`/payments/${order.id}`}>
                  <Button
                    disabled={
                      order.status === "paid" || order.status === "overdue"
                    }
                  >
                    Make payment
                  </Button>
                </Link>
              </TableCell>
              <TableCell>
                <Link href={`/orders/${order.id}`}>
                  <Button>Open</Button>
                </Link>
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
              href={`?page=${page - 1}`}
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
                  href={`?page=${pageNum}`}
                  aria-current={pageNum === page ? "page" : undefined}
                >
                  {pageNum}
                </Link>
              </Button>
            ),
          )}

          <Button variant="outline" disabled={page >= pagination.totalPages}>
            <Link
              href={`?page=${page + 1}`}
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
