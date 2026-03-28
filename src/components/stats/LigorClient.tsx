'use client'
import { useState } from 'react'
import Link from 'next/link'
import { LeagueStandingsWidget } from './LeagueStandingsWidget'

const LEAGUES = [
  { slug: 'premier-league', name: 'Premier League', emoji: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', country: 'England'   },
  { slug: 'la-liga',        name: 'La Liga',        emoji: '🇪🇸',          country: 'Spanien'   },
  { slug: 'bundesliga',     name: 'Bundesliga',     emoji: '🇩🇪',          country: 'Tyskland'  },
  { slug: 'serie-a',        name: 'Serie A',        emoji: '🇮🇹',          country: 'Italien'   },
  { slug: 'ligue-1',        name: 'Ligue 1',        emoji: '🇫🇷',          country: 'Frankrike' },
]

export function LigorClient() {
  const [active, setActive] = useState(LEAGUES[0].slug)
  const league = LEAGUES.find(l => l.slug === active)!

  return (
    <>
      {/* League selector row */}
      <div className="flex gap-2 overflow-x-auto pb-1 mb-6 scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap">
        {LEAGUES.map(lg => {
          const isActive = lg.slug === active
          return (
            <button
              key={lg.slug}
              onClick={() => setActive(lg.slug)}
              className={[
                'flex items-center gap-2 px-4 py-2.5 rounded-xl border font-semibold text-sm flex-shrink-0 transition-all',
                isActive
                  ? 'bg-mp-red border-mp-red text-white shadow-[0_0_16px_rgba(232,48,74,.35)]'
                  : 'bg-mp-s1 border-mp-border text-mp-t1 hover:border-mp-red/40 hover:text-mp-t0',
              ].join(' ')}
            >
              <span className="text-lg leading-none">{lg.emoji}</span>
              <span className="hidden sm:inline">{lg.name}</span>
              <span className="sm:hidden text-xs">{lg.country}</span>
            </button>
          )
        })}
      </div>

      {/* Expanded table */}
      <div key={active} className="animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl leading-none">{league.emoji}</span>
            <div>
              <h2 className="font-display text-2xl tracking-wide leading-none">{league.name.toUpperCase()}</h2>
              <p className="text-xs text-mp-t2 mt-0.5">{league.country}</p>
            </div>
          </div>
          <Link
            href={`/league/${league.slug}`}
            className="text-xs font-semibold text-mp-red hover:underline flex-shrink-0"
          >
            Alla lag →
          </Link>
        </div>

        {/* Full standings — no limit */}
        <LeagueStandingsWidget leagueSlug={active} />
      </div>
    </>
  )
}
