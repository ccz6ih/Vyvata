import { redirect } from "next/navigation";
import { hasAdminSession } from "@/lib/admin-auth";
import AdminClient from "./AdminClient";

export default async function AdminPage() {
  if (!(await hasAdminSession())) {
    redirect("/admin/login");
  }
  return <AdminClient />;
}
