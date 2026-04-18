import { redirect } from "next/navigation";
import { getPractitionerSession } from "@/lib/practitioner-auth";
import PatientDetailClient from "./PatientDetailClient";

export default async function PatientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getPractitionerSession();
  if (!session) redirect("/practitioner/login");
  const { id } = await params;
  return <PatientDetailClient linkId={id} practitionerName={session.name} />;
}
