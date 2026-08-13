import { redirect } from "next/navigation";
import { getUser } from "@/lib/dal";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();
  if (user) {
    redirect("/");
  }
  return <main>{children}</main>;
}
