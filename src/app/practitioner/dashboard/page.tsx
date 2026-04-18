import { redirect } from "next/navigation";
import { getPractitionerSession } from "@/lib/practitioner-auth";
import PractitionerDashboardClient from "./DashboardClient";

export default async function PractitionerDashboardPage() {
  const session = await getPractitionerSession();
  if (!session) redirect("/practitioner/login");
  return <PractitionerDashboardClient practitioner={session} />;
}
