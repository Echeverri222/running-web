import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  return NextResponse.json({
    hasSession: Boolean(session),
    hasUser: Boolean(user),
    email: user?.email ?? null,
    sessionError: sessionError?.message ?? null,
    userError: userError?.message ?? null,
  });
}
