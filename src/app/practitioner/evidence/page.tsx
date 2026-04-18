import { redirect } from "next/navigation";
import { getPractitionerSession } from "@/lib/practitioner-auth";
import EvidenceLibraryClient from "./EvidenceLibraryClient";

export default async function EvidenceLibraryPage() {
  const session = await getPractitionerSession();
  if (!session) {
    redirect("/practitioner/login");
  }

  return <EvidenceLibraryClient />;
}
