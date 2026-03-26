import { NextRequest, NextResponse } from "next/server";
import { createServerComponentClient } from "@/lib/supabase.server";
export async function POST(req: NextRequest) {
  const supabase = createServerComponentClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return NextResponse.redirect(new URL("/auth/login", req.url));
  const form = await req.formData();
  const fixtureId = form.get("fixtureId") as string;
  const pick = form.get("pick") as string;
  await supabase
    .from("match_predictions")
    .upsert(
      { user_id: session.user.id, fixture_id: fixtureId, pick },
      { onConflict: "user_id,fixture_id" },
    );
  return NextResponse.redirect(req.headers.get("referer") ?? "/", {
    status: 303,
  });
}
