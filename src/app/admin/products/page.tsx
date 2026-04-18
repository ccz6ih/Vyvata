import { redirect } from "next/navigation";
import { hasAdminSession } from "@/lib/admin-auth";
import AdminProductsClient from "./AdminProductsClient";

export default async function AdminProductsPage() {
  if (!(await hasAdminSession())) redirect("/admin/login");
  return <AdminProductsClient />;
}
