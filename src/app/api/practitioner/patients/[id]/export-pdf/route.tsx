/**
 * Export Patient Protocol Report as PDF
 * GET /api/practitioner/patients/[id]/export-pdf
 * 
 * Returns a PDF document with patient protocol report
 */

import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getPractitionerSession } from "@/lib/practitioner-auth";
import { getSupabaseServer } from "@/lib/supabase";
import { ProtocolPDF } from "@/components/pdf/ProtocolPDF";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: patientLinkId } = await params;

  // 1. Verify practitioner session
  const session = await getPractitionerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseServer();

  // 2. Fetch patient data and verify ownership
  const { data: patient, error: patientError } = await supabase
    .from("patient_links")
    .select(
      `
      id,
      patient_label,
      session_id,
      practitioner_id,
      added_at,
      status,
      audits (
        id,
        score,
        public_slug,
        report_json,
        is_unlocked,
        created_at
      ),
      quiz_responses (
        id,
        primary_goals,
        age_range,
        activity_level,
        sleep_quality,
        assigned_protocol_slug,
        created_at
      ),
      sessions (
        id,
        raw_input,
        goals,
        created_at
      )
    `
    )
    .eq("id", patientLinkId)
    .eq("practitioner_id", session.id)
    .single();

  if (patientError || !patient) {
    return NextResponse.json(
      { error: "Patient not found or access denied" },
      { status: 404 }
    );
  }

  // 3. Fetch practitioner name
  const { data: practitioner } = await supabase
    .from("practitioners")
    .select("name")
    .eq("id", session.id)
    .single();

  // 4. Parse data
  const audit = Array.isArray(patient.audits) ? patient.audits[0] : patient.audits;
  const quiz = Array.isArray(patient.quiz_responses)
    ? patient.quiz_responses[0]
    : patient.quiz_responses;
  const sessionData = Array.isArray(patient.sessions)
    ? patient.sessions[0]
    : patient.sessions;

  if (!audit || !sessionData) {
    return NextResponse.json(
      { error: "Missing audit or session data" },
      { status: 400 }
    );
  }

  // Parse report JSON
  let report = null;
  try {
    if (audit.report_json) {
      report = JSON.parse(audit.report_json);
    }
  } catch (err) {
    console.error("Failed to parse report JSON:", err);
  }

  // Parse session goals
  let goals: string[] = [];
  try {
    goals = typeof sessionData.goals === "string"
      ? JSON.parse(sessionData.goals)
      : sessionData.goals || [];
  } catch (err) {
    console.error("Failed to parse goals:", err);
  }

  // 5. Generate PDF
  try {
    const pdfBuffer = await renderToBuffer(
      <ProtocolPDF
        patientName={patient.patient_label || "Patient"}
        practitionerName={practitioner?.name || "Practitioner"}
        score={audit.score}
        protocolSlug={quiz?.assigned_protocol_slug || null}
        rawInput={sessionData.raw_input}
        goals={goals}
        ageRange={quiz?.age_range || null}
        activityLevel={quiz?.activity_level || null}
        sleepQuality={quiz?.sleep_quality || null}
        primaryGoals={quiz?.primary_goals || []}
        report={report}
        generatedDate={new Date().toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })}
      />
    );

    // 6. Return PDF as download
    const filename = `vyvata-protocol-${patient.patient_label?.replace(/\s+/g, "-").toLowerCase() || patientLinkId}-${new Date().toISOString().split("T")[0]}.pdf`;

    // Convert Buffer to Uint8Array for NextResponse compatibility
    const uint8Array = new Uint8Array(pdfBuffer);

    return new NextResponse(uint8Array, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("PDF generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
