import { CreateOrderForm } from "./_components/create-order-form";

export default async function NewOrderPage() {
  return (
    <div className="p-10 max-w-2xl mx-auto space-y-6">
      <h1 className="text-3xl">Create order</h1>
      <CreateOrderForm />
    </div>
  );
}
