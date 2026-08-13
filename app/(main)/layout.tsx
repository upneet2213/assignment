import { getUser } from "@/lib/dal";
import { redirect } from "next/navigation";

const MainLayout = async ({ children }: { children: React.ReactNode }) => {
  const user = await getUser();
  if (!user) {
    redirect("/login");
  }
  return <>{children}</>;
};
export default MainLayout;
