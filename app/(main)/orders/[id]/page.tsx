import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getOrderWithDetails } from "@/lib/order";

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const order = await getOrderWithDetails(Number(id));

  if (!order) {
    return <div>Order not found</div>;
  }

  return (
    <div className="p-10  space-y-8">
      <div>
        <h1 className="text-2xl">Order #{order.id}</h1>
        <p>Balance due: {order.balanceDue}</p>
      </div>
      <h2 className="text-2xl ">Line Items</h2>
      <Table>
        <TableCaption>A list of your line items</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Description</TableHead>
            <TableHead>Unit Price</TableHead>
            <TableHead>Quantity</TableHead>
            <TableHead>Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {order.lineItems.map((item) => (
            <TableRow key={item.id}>
              <TableCell>{item.description}</TableCell>
              <TableCell>{item.unitPrice}</TableCell>
              <TableCell>{item.quantity}</TableCell>
              <TableCell>{item.subtotal}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <h2 className="text-2xl ">Payments</h2>
      <Table>
        <TableCaption>A list of your payments made</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Amount</TableHead>
            <TableHead>Created On</TableHead>
            <TableHead>Note</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {order.payments.map((payment) => (
            <TableRow key={payment.id}>
              <TableCell>{payment.amount}</TableCell>
              <TableCell>{payment.date.toDateString()}</TableCell>
              <TableCell>{payment.note}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
