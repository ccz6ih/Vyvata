import { redirect } from "next/navigation";
import { getPractitionerSession } from "@/lib/practitioner-auth";
import AnalyticsClient from "./AnalyticsClient";

export default async function AnalyticsPage() {
  const session = await getPractitionerSession();
  if (!session) redirect("/practitioner/login");
  return <AnalyticsClient practitioner={session} />;
}
