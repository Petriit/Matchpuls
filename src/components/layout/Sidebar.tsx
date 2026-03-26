"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, ChevronRight, Home, Flame, Star, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { TeamBadge } from "@/components/ui/TeamBadge";

interface Team {
  id: string;
  slug: string;
  name: string;
  short_name: string;
  color: string;
}
interface League {
  id: string;
  slug: string;
  name: string;
  flag_emoji: string;
  teams: Team[];
}
interface Sub {
  id: string;
  forum: {
    team: {
      name: string;
      short_name: string;
      color: string;
      slug: string;
      league: { slug: string };
    };
  };
}
interface Props {
  subscriptions: Sub[];
  isAdmin: boolean;
  leagues: League[];
}

export function Sidebar({ subscriptions, isAdmin, leagues }: Props) {
  const pathname = usePathname();
  const [sportOpen, setSportOpen] = useState<Record<string, boolean>>({
    football: true,
    hockey: false,
  });
  const [leagueOpen, setLeagueOpen] = useState<Record<string, boolean>>({});

  const toggleSport = (k: string) =>
    setSportOpen((p) => ({ ...p, [k]: !p[k] }));
  const toggleLeague = (s: string) =>
    setLeagueOpen((p) => ({ ...p, [s]: !p[s] }));

  const navItems = [
    { href: "/",              label: "Hem",            icon: <Home size={15} strokeWidth={1.75}/> },
    { href: "/forum/popular", label: "Populära forum", icon: <Flame size={15} strokeWidth={1.75}/> },
    { href: "/mina-forum",    label: "Mina forum",     icon: <Star size={15} strokeWidth={1.75}/> },
    { href: "/profile",       label: "Min sida",       icon: <User size={15} strokeWidth={1.75}/> },
    ...(isAdmin ? [{ href: "/admin", label: "Admin", icon: <i className="fa-solid fa-shield-halved fa-sm"/> }] : []),
  ];

  return (
    <aside className="hidden md:flex flex-col w-[220px] min-w-[220px] bg-mp-s1 border-r border-mp-border overflow-y-auto flex-shrink-0">
      {/* ── NAVIGATION ─────────────────────────────── */}
      <div className="pt-4 pb-2">
        <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-mp-t2 px-4 mb-1">
          Navigering
        </p>
        {navItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-2 text-sm font-medium transition-all border-l-2",
                active
                  ? "border-l-mp-red text-mp-t0 bg-mp-s2"
                  : "border-l-transparent text-mp-t1 hover:border-l-mp-border hover:text-mp-t0 hover:bg-mp-s2/50",
              )}
            >
              <span className="text-base leading-none w-4 text-center">
                {item.icon}
              </span>
              {item.label}
            </Link>
          );
        })}
      </div>

      {/* ── MY FORUMS ──────────────────────────────── */}
      {subscriptions.length > 0 && (
        <div className="border-t border-mp-border pt-3 pb-2">
          <div className="flex items-center justify-between px-4 mb-1">
            <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-mp-t2 flex items-center gap-1.5">
              <Star size={14} strokeWidth={1.75}/> Mina forum
            </p>
            <span className="text-[9px] font-bold text-mp-red bg-mp-red/10 px-1.5 py-0.5">
              {subscriptions.length}
            </span>
          </div>
          {subscriptions.map((sub) => {
            const t = sub.forum?.team;
            const active = pathname.includes(t?.slug ?? "");
            return (
              <Link
                key={sub.id}
                href={`/forum/${t?.league?.slug}/${t?.slug}`}
                className={cn(
                  "flex items-center gap-2.5 px-4 py-1.5 text-sm font-semibold transition-all border-l-2",
                  active
                    ? "border-l-mp-red text-mp-t0 bg-mp-s2"
                    : "border-l-transparent text-mp-t1 hover:text-mp-t0 hover:bg-mp-s2/50",
                )}
              >
                <TeamBadge color={t?.color ?? '#333'} shortName={t?.short_name ?? ''} size="xs" />
                <span className="truncate">{t?.name}</span>
              </Link>
            );
          })}
        </div>
      )}

      {/* ── SPORT SECTIONS ─────────────────────────── */}
      <div className="border-t border-mp-border flex-1">
        {/* ⚽ Football */}
        <button
          onClick={() => toggleSport("football")}
          className={cn(
            "w-full flex items-center justify-between px-4 py-3 transition-colors",
            sportOpen.football ? "text-mp-t0" : "text-mp-t1 hover:text-mp-t0",
          )}
        >
          <span className="flex items-center gap-2 font-bold text-sm">
            <span className="text-base">
              <i className="fa-regular fa-futbol"></i>
            </span>{" "}
            Fotboll
          </span>
          <span
            className={cn(
              "transition-transform duration-200 text-mp-t2",
              sportOpen.football && "rotate-90",
            )}
          >
            <ChevronRight size={14} />
          </span>
        </button>

        {sportOpen.football && (
          <div className="pb-2">
            {leagues.map((lg) => (
              <div key={lg.slug}>
                <button
                  onClick={() => toggleLeague(lg.slug)}
                  className={cn(
                    "w-full flex items-center justify-between pl-6 pr-4 py-1.5 text-sm transition-all border-l-2 ml-0",
                    leagueOpen[lg.slug]
                      ? "border-l-mp-red/60 text-mp-t0 bg-mp-s2/40"
                      : "border-l-transparent text-mp-t2 hover:text-mp-t1",
                  )}
                >
                  <span className="flex items-center gap-2">
                    <span>{lg.flag_emoji}</span>
                    <span className="font-semibold">{lg.name}</span>
                  </span>
                  <ChevronDown
                    size={11}
                    className={cn(
                      "transition-transform duration-200 text-mp-t2",
                      !leagueOpen[lg.slug] && "-rotate-90",
                    )}
                  />
                </button>

                {leagueOpen[lg.slug] && (
                  <div className="pl-6 border-l border-mp-border ml-0 pb-1">
                    {[...(lg.teams ?? [])].sort((a, b) => a.name.localeCompare(b.name, 'sv')).map((team) => {
                      const active =
                        pathname === `/league/${lg.slug}/${team.slug}`;
                      return (
                        <Link
                          key={team.slug}
                          href={`/league/${lg.slug}/${team.slug}`}
                          className={cn(
                            "flex items-center gap-2 pl-3 pr-4 py-1.5 text-xs transition-all border-l-2",
                            active
                              ? "border-l-mp-red text-mp-t0 bg-mp-s2"
                              : "border-l-transparent text-mp-t2 hover:text-mp-t1 hover:border-l-mp-border",
                          )}
                        >
                          <TeamBadge color={team.color} shortName={team.short_name} size="xs" />
                          <span className="truncate">{team.name}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* 🏒 Hockey */}
        <button
          onClick={() => toggleSport("hockey")}
          className={cn(
            "w-full flex items-center justify-between px-4 py-3 border-t border-mp-border transition-colors",
            sportOpen.hockey ? "text-mp-t0" : "text-mp-t1 hover:text-mp-t0",
          )}
        >
          <span className="flex items-center gap-2 font-bold text-sm">
            <span className="text-base">
              <i className="fa-solid fa-hockey-puck"></i>
            </span>{" "}
            Hockey
          </span>
          <span
            className={cn(
              "transition-transform duration-200 text-mp-t2",
              sportOpen.hockey && "rotate-90",
            )}
          >
            <ChevronRight size={14} />
          </span>
        </button>

        {sportOpen.hockey && (
          <div className="pl-6 pr-4 py-3 border-l-2 border-l-transparent ml-0">
            <span className="text-[10px] text-mp-t2 font-bold uppercase tracking-widest">
              Snart
            </span>
          </div>
        )}
      </div>
    </aside>
  );
}
