import { redirect } from "next/navigation";
import { createServerComponentClient } from "@/lib/supabase.server";
import { AdminTabs } from "./AdminTabs";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Admin" };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const supabase = createServerComponentClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", session.user.id)
    .single();

  if (
    !profile ||
    !["admin", "moderator"].includes((profile as { role: string }).role)
  ) {
    redirect("/");
  }

  const [
    { count: totalUsers },
    { count: totalPosts },
    { data: recentUsers },
    { data: recentPosts },
    { data: adminLog },
    { data: bans },
  ] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("posts").select("*", { count: "exact", head: true }),
    supabase
      .from("profiles")
      .select("id, username, role, joined_at, post_count, is_online")
      .order("joined_at", { ascending: false })
      .limit(50),
    supabase
      .from("posts")
      .select(
        "id, title, created_at, like_count, is_pinned, author:profiles(username), forum:forums(team:teams(name))",
      )
      .order("created_at", { ascending: false })
      .limit(30),
    supabase
      .from("admin_actions")
      .select("*, admin:profiles(username)")
      .order("created_at", { ascending: false })
      .limit(30),
    supabase
      .from("user_bans")
      .select(
        "*, banned_user:profiles!user_bans_user_id_fkey(username), mod:profiles!user_bans_banned_by_fkey(username)",
      )
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  return (
    <div className="max-w-6xl mx-auto px-0 sm:px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-mp-red rounded-xl flex items-center justify-center text-white text-xl">
          <i className="fa-solid fa-shield-halved" />
        </div>
        <div>
          <h1 className="font-display text-2xl tracking-wide">ADMIN-PANEL</h1>
          <p className="text-mp-t2 text-xs">
            Inloggad som{" "}
            <span className="font-bold text-mp-t1">
              {session.user.user_metadata?.username}
            </span>{" "}
            (
            <span className="text-mp-amber">
              {(profile as { role: string }).role}
            </span>
            )
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        {[
          { n: totalUsers ?? 0, l: "Användare", c: "text-mp-blue" },
          { n: totalPosts ?? 0, l: "Inlägg totalt", c: "text-mp-green" },
        ].map((s) => (
          <div
            key={s.l}
            className="bg-mp-s1 border border-mp-border rounded-xl p-4 text-center"
          >
            <div className={`font-display text-3xl tracking-wide ${s.c}`}>
              {s.n.toLocaleString()}
            </div>
            <div className="text-[10px] text-mp-t2 mt-1">{s.l}</div>
          </div>
        ))}
      </div>

      <AdminTabs
        users={(recentUsers || []) as Record<string, unknown>[]}
        posts={(recentPosts || []) as Record<string, unknown>[]}
        adminLog={(adminLog || []) as Record<string, unknown>[]}
        bans={(bans || []) as Record<string, unknown>[]}
        currentRole={(profile as { role: string }).role}
        currentUserId={session.user.id}
      />
    </div>
  );
}
