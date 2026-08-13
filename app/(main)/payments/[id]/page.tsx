import { getOrderWithDetails } from "@/lib/order";
import { PaymentForm } from "./_components/payment-form";
import { notFound } from "next/navigation";

const PaymentPage = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const orderId = Number(id);
  if (Number.isNaN(orderId)) notFound();

  const order = await getOrderWithDetails(orderId);
  if (!order) notFound();

  return (
    <div className="p-10 max-w-lg mx-auto space-y-8">
      <div>
        <h1 className="text-2xl">Order #{order.id}</h1>
        <p>Balance due: {order.balanceDue}</p>
      </div>
      <PaymentForm orderId={orderId} />
    </div>
  );
};

export default PaymentPage;
