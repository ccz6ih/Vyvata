// GET /api/practitioner/me — return current session practitioner info

import { NextResponse } from "next/server";
import { getPractitionerSession } from "@/lib/practitioner-auth";

export async function GET() {
  const session = await getPractitionerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ practitioner: session });
}
