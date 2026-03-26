import { NextRequest, NextResponse } from 'next/server'

// football-data.org — free API, register at football-data.org
// Competition codes (stable, never change):
const LEAGUE_CODES: Record<string, string> = {
  'premier-league': 'PL',
  'la-liga':        'PD',
  'bundesliga':     'BL1',
  'serie-a':        'SA',
  'ligue-1':        'FL1',
  // Note: Allsvenskan is not on the free tier — requires paid plan
  // 'allsvenskan': 'SWE',
}

export async function GET(req: NextRequest) {
  const leagueSlug = req.nextUrl.searchParams.get('league')
  if (!leagueSlug) return NextResponse.json({ error: 'Missing league' }, { status: 400 })

  const code = LEAGUE_CODES[leagueSlug]
  if (!code) return NextResponse.json({ error: `Liga inte tillgänglig: ${leagueSlug}` }, { status: 400 })

  const key = process.env.FOOTBALL_DATA_KEY
  if (!key || key === 'KLISTRA_IN_DIN_NYCKEL_HÄR') {
    return NextResponse.json({ error: 'FOOTBALL_DATA_KEY saknas i .env.local' }, { status: 500 })
  }

  try {
    const res = await fetch(
      `https://api.football-data.org/v4/competitions/${code}/standings`,
      {
        headers: { 'X-Auth-Token': key },
        next: { revalidate: 3600 },
      }
    )

    if (!res.ok) {
      const text = await res.text()
      console.error(`football-data.org ${res.status}:`, text.slice(0, 300))
      return NextResponse.json({ error: `API svarade ${res.status}` }, { status: 502 })
    }

    const json = await res.json()

    // football-data.org format:
    // { standings: [{ type: 'TOTAL'|'HOME'|'AWAY', table: [...] }] }
    const total = json.standings?.find((s: { type: string }) => s.type === 'TOTAL')
    const rows: Record<string, unknown>[] = total?.table ?? []

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Ingen tabell tillgänglig' }, { status: 404 })
    }

    const season = json.season?.startDate
      ? new Date(json.season.startDate as string).getFullYear()
      : new Date().getFullYear()

    const table = rows.map((row) => {
      const team = row.team as Record<string, unknown>
      return {
        rank:      row.position       as number,
        name:      team.shortName ?? team.name as string,
        played:    row.playedGames    as number,
        win:       row.won            as number,
        draw:      row.draw           as number,
        lose:      row.lost           as number,
        points:    row.points         as number,
        goalsDiff: row.goalDifference as number,
        form:      row.form           as string | null,
      }
    })

    return NextResponse.json({ table, season })

  } catch (e) {
    console.error('Standings fetch error:', e)
    return NextResponse.json({ error: 'Nätverksfel' }, { status: 500 })
  }
}
