import { redirect } from "next/navigation";
import { hasAdminSession } from "@/lib/admin-auth";
import AdminComplianceClient from "./AdminComplianceClient";

export default async function AdminCompliancePage() {
  if (!(await hasAdminSession())) redirect("/admin/login");
  return <AdminComplianceClient />;
}
