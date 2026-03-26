import Link from 'next/link'
import { LeagueStandingsWidget } from '@/components/stats/LeagueStandingsWidget'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Ligatabeller' }

const LEAGUES = [
  { slug: 'premier-league', name: 'Premier League', emoji: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', country: 'England' },
  { slug: 'la-liga',        name: 'La Liga',        emoji: '🇪🇸',         country: 'Spanien'  },
  { slug: 'bundesliga',     name: 'Bundesliga',     emoji: '🇩🇪',         country: 'Tyskland' },
  { slug: 'serie-a',        name: 'Serie A',        emoji: '🇮🇹',         country: 'Italien'  },
  { slug: 'ligue-1',        name: 'Ligue 1',        emoji: '🇫🇷',         country: 'Frankrike'},
]

export default function LigorPage() {
  return (
    <div className="px-4 py-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="font-display text-3xl tracking-wide mb-1">LIGATABELLER</h1>
        <p className="text-sm text-mp-t2">Europas stora ligor</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {LEAGUES.map(league => (
          <div key={league.slug}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">{league.emoji}</span>
                <div>
                  <h2 className="text-sm font-bold leading-none">{league.name}</h2>
                  <p className="text-[10px] text-mp-t2 mt-0.5">{league.country}</p>
                </div>
              </div>
              <Link href={`/league/${league.slug}`}
                className="text-[11px] font-semibold text-mp-red hover:underline">
                Alla lag →
              </Link>
            </div>
            <LeagueStandingsWidget leagueSlug={league.slug} />
          </div>
        ))}
      </div>
    </div>
  )
}
