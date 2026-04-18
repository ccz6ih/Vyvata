import { NextResponse } from "next/server";
import { getSupabaseUserServer } from "@/lib/supabase-auth";

export async function POST() {
  const supabase = await getSupabaseUserServer();
  await supabase.auth.signOut();
  return NextResponse.json({ ok: true });
}
