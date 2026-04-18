// /admin — server component: validates VYVATA_ADMIN_SECRET from query param,
// then renders the AdminClient. Simple but effective guard for an internal tool.
// Usage: /admin?secret=YOUR_VYVATA_ADMIN_SECRET

import { redirect } from "next/navigation";
import AdminClient from "./AdminClient";

interface AdminPageProps {
  searchParams: Promise<{ secret?: string }>;
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const { secret } = await searchParams;
  const adminSecret = process.env.VYVATA_ADMIN_SECRET;

  if (!adminSecret || !secret || secret !== adminSecret) {
    redirect("/");
  }

  return <AdminClient secret={secret} />;
}
