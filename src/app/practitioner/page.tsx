import { redirect } from "next/navigation";
import { getPractitionerSession } from "@/lib/practitioner-auth";

export default async function PractitionerRootPage() {
  const session = await getPractitionerSession();
  if (session) redirect("/practitioner/dashboard");
  redirect("/practitioner/login");
}
