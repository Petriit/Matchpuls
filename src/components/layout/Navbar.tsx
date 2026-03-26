"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserMenu } from "@/components/ui/UserMenu";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { cn } from "@/lib/utils";
import { Home, Flame, Star } from "lucide-react";
import type { Session } from "@supabase/supabase-js";

interface Props {
  session: Session | null;
  isAdmin: boolean;
}

const NAV = [
  { href: "/",              label: "Hem",         lucide: Home,  exact: true },
  { href: "/forum/popular", label: "Populära",    lucide: Flame, exact: false },
  { href: "/mina-forum",    label: "Mina forum",  lucide: Star,  exact: false, authOnly: true },
  { href: "/ligor",         label: "Ligatabeller", fa: "fa-solid fa-trophy", exact: false },
];

export function Navbar({ session, isAdmin }: Props) {
  const pathname = usePathname();

  const isActive = (href: string, exact: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  return (
    <header className="h-[60px] bg-mp-s1 border-b border-mp-border flex items-center px-4 flex-shrink-0 z-30 sticky top-0">
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-mp-red" />

      {/* Logo */}
      <Link href="/" className="flex items-center gap-2.5 flex-shrink-0 mr-8">
        <div className="w-8 h-8 bg-mp-red flex items-center justify-center flex-shrink-0">
          <svg
            viewBox="0 0 16 16"
            className="w-4 h-4 fill-none stroke-white stroke-[2.5]"
            strokeLinecap="round"
          >
            <polyline points="1,8 4,4 7,11 10,6 13,8 15,8" />
          </svg>
        </div>
        <span className="font-display text-[24px] leading-none tracking-wide">
          MATCH<em className="text-mp-red not-italic">PULS</em>
        </span>
      </Link>

      {/* Nav links */}
      <nav className="hidden md:flex items-center h-full">
        {NAV.map((item) => {
          if (item.authOnly && !session) return null;
          const active = isActive(item.href, item.exact ?? false);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex items-center gap-2 px-4 h-full text-[13px] font-semibold transition-colors",
                active ? "text-mp-t0" : "text-mp-t2 hover:text-mp-t1",
              )}
            >
              {(() => { const L = 'lucide' in item ? item.lucide : null; return L ? <L size={14} strokeWidth={1.75}/> : <i className={'fa' in item ? item.fa : ''}/>; })()}
              {item.label}
              {active && (
                <span className="absolute bottom-0 left-2 right-2 h-[2px] bg-mp-red z-10" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Spacer — pushes right side in, not all the way to the edge */}
      <div className="flex-1" />

      {/* Right side */}
      <div className="flex items-center gap-2 mr-4 md:mr-6">
        <ThemeToggle />
        {session ? (
          <UserMenu session={session} isAdmin={isAdmin} />
        ) : (
          <>
            <Link
              href="/auth/login"
              className="hidden sm:inline-flex btn-ghost text-[13px] py-1.5 px-3"
            >
              Logga in
            </Link>
            <Link
              href="/auth/register"
              className="hidden sm:inline-flex btn-primary text-[13px] py-1.5 px-3"
            >
              Skapa konto
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
