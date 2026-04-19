// POST /api/brand/submissions/[id]/upload
// Upload a file to Supabase Storage and add reference to submission

import { NextRequest, NextResponse } from "next/server";
import { getBrandSession } from "@/lib/brand-auth";
import { getSupabaseServer } from "@/lib/supabase";
import { FileReferenceSchema } from "@/lib/brand-submission/schemas";

interface RouteContext {
  params: Promise<{ id: string }>;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
];

export async function POST(req: NextRequest, context: RouteContext) {
  const session = await getBrandSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await context.params;
  const supabase = getSupabaseServer();

  // Verify ownership
  const { data: submission } = await supabase
    .from("product_submissions")
    .select("id, status, brand_account_id, file_references")
    .eq("id", id)
    .eq("brand_account_id", session.account.id)
    .maybeSingle();

  if (!submission) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!["draft", "needs_revision"].includes(submission.status)) {
    return NextResponse.json(
      { error: "Cannot upload to submitted submissions" },
      { status: 403 }
    );
  }

  // Parse form data
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const kind = (formData.get("kind") as string) || "other";

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: `File too large. Max size: ${MAX_FILE_SIZE / 1024 / 1024}MB` },
      { status: 400 }
    );
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Invalid file type. Only PDF and images allowed." },
      { status: 400 }
    );
  }

  // Generate storage path
  const timestamp = Date.now();
  const ext = file.name.split(".").pop() || "pdf";
  const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
  const storagePath = `${session.account.id}/${id}/${kind}-${timestamp}.${ext}`;

  // Upload to Supabase Storage
  const arrayBuffer = await file.arrayBuffer();
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from("brand-submissions")
    .upload(storagePath, arrayBuffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    console.error("[upload] Supabase Storage error:", uploadError.message);
    
    // If bucket doesn't exist, provide helpful error
    if (uploadError.message.includes("not found") || uploadError.message.includes("does not exist")) {
      return NextResponse.json(
        { 
          error: "Storage bucket not configured. Admin needs to create 'brand-submissions' bucket in Supabase Storage.",
          technical: uploadError.message 
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: "Upload failed", technical: uploadError.message },
      { status: 500 }
    );
  }

  // Add file reference to submission
  const fileRef = FileReferenceSchema.parse({
    kind,
    path: uploadData.path,
    filename: safeName,
    size_bytes: file.size,
    uploaded_at: new Date().toISOString(),
  });

  const existingRefs = (submission.file_references as unknown[]) || [];
  const newRefs = [...existingRefs, fileRef];

  const { error: updateError } = await supabase
    .from("product_submissions")
    .update({ file_references: newRefs })
    .eq("id", id);

  if (updateError) {
    console.error("[upload] DB update error:", updateError.message);
    // Try to delete the uploaded file
    await supabase.storage.from("brand-submissions").remove([storagePath]);
    return NextResponse.json({ error: "Failed to save file reference" }, { status: 500 });
  }

  return NextResponse.json({ file: fileRef }, { status: 201 });
}
