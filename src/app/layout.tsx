import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileSidebarDrawer } from "@/components/layout/MobileSidebarDrawer";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { TwemojiScript } from "@/components/ui/TwemojiScript";
import { createServerComponentClient } from "@/lib/supabase.server";

export const metadata: Metadata = {
  title: { default: "Matchpuls", template: "%s | Matchpuls" },
  description: "Den levande sportarenans forum – fotboll, hockey och mer.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Matchpuls",
  },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#080b14",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createServerComponentClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  let subscriptions: unknown[] = [];
  let isAdmin = false;
  if (session?.user) {
    const [{ data: subs }, { data: profile }] = await Promise.all([
      supabase
        .from("subscriptions")
        .select(
          "id, forum:forums(id, team:teams(name, short_name, color, slug, league:leagues(id, slug)))",
        )
        .eq("user_id", session.user.id)
        .limit(20),
      supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .single(),
    ]);
    subscriptions = subs || [];
    isAdmin = profile?.role === "admin" || profile?.role === "moderator";
  }

  const { data: leaguesRaw } = await supabase
    .from("leagues")
    .select("id, slug, name, flag_emoji, teams(id, slug, name, short_name, color)")
    .eq("sport", "football")
    .neq("slug", "champions-league")
    .order("name");

  return (
    <html lang="sv" className="dark" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Space+Grotesk:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        {/* Font Awesome Kit */}
        <script defer src="https://kit.fontawesome.com/853d626c18.js" crossOrigin="anonymous" />
      </head>
      <body className="bg-mp-bg text-mp-t0 font-sans antialiased">
        <div className="flex flex-col h-screen overflow-hidden">
          <Navbar session={session} isAdmin={isAdmin} />
          {/* Spacer for fixed navbar */}
          <div className="h-[60px] flex-shrink-0" />
          <div className="flex flex-1 overflow-hidden">
            <Sidebar subscriptions={subscriptions as never[]} isAdmin={isAdmin} leagues={(leaguesRaw ?? []) as never[]} />
            <main className="flex-1 overflow-y-auto">
              <div className="pb-16 md:pb-0">{children}</div>
            </main>
          </div>
          <MobileBottomNav
            session={session}
            subscriptionCount={subscriptions.length}
          />
          <MobileSidebarDrawer
            subscriptions={subscriptions as never[]}
            isAdmin={isAdmin}
            leagues={(leaguesRaw ?? []) as never[]}
          />
        </div>
        <TwemojiScript />
      </body>
    </html>
  );
}
