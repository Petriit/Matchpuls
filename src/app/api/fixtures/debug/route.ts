import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase.server'

const LEAGUE_CODES: Record<string, string> = {
  'premier-league': 'PL',
  'la-liga':        'PD',
  'bundesliga':     'BL1',
  'serie-a':        'SA',
  'ligue-1':        'FL1',
}

function norm(s: string) {
  return s.toLowerCase()
    .replace(/[àáâãäå]/g, 'a').replace(/[èéêë]/g, 'e')
    .replace(/[ìíîï]/g, 'i').replace(/[òóôõö]/g, 'o')
    .replace(/[ùúûü]/g, 'u').replace(/ñ/g, 'n').replace(/ç/g, 'c')
    .replace(/[^a-z0-9]/g, '')
}

type DbTeam = { id: string; name: string; shortName: string }

function findTeam(teams: DbTeam[], apiTeam: Record<string, unknown>): DbTeam | undefined {
  const apiName  = norm(String(apiTeam.name  ?? ''))
  const apiShort = norm(String(apiTeam.shortName ?? ''))
  const exact = teams.find(t =>
    norm(t.name) === apiName  || norm(t.name) === apiShort ||
    norm(t.shortName) === apiShort || norm(t.shortName) === apiName
  )
  if (exact) return exact
  const MIN = 4
  return teams.find(t => {
    const dbN = norm(t.name)
    const dbS = norm(t.shortName)
    return (
      (apiName.length  >= MIN && (dbN.includes(apiName)  || apiName.includes(dbN)))  ||
      (apiShort.length >= MIN && (dbN.includes(apiShort) || apiShort.includes(dbN))) ||
      (apiName.length  >= MIN && (dbS.includes(apiName)  || apiName.includes(dbS)))  ||
      (apiShort.length >= MIN && (dbS.includes(apiShort) || apiShort.includes(dbS)))
    )
  })
}

export async function GET(req: NextRequest) {
  const league = req.nextUrl.searchParams.get('league') ?? 'la-liga'
  const code = LEAGUE_CODES[league]
  if (!code) return NextResponse.json({ error: 'Okänd liga' })

  const supabase = createServiceClient()
  const key = process.env.FOOTBALL_DATA_KEY!

  // DB teams for this league
  const { data: teamsRaw } = await supabase
    .from('teams')
    .select('id, name, short_name, league:leagues(slug)')
  const dbTeams = (teamsRaw ?? [])
    .filter(t => (t.league as Record<string,unknown>)?.slug === league)
    .map(t => ({ id: t.id, name: t.name, shortName: t.short_name }))

  // Fixtures already in DB
  const { data: existingFixtures } = await supabase
    .from('fixtures')
    .select('id, home_team, away_team, kickoff_at, status, team_id')
    .in('team_id', dbTeams.map(t => t.id))
    .order('kickoff_at')
    .limit(20)

  // football-data.org
  const res = await fetch(
    `https://api.football-data.org/v4/competitions/${code}/matches?status=SCHEDULED`,
    { headers: { 'X-Auth-Token': key }, cache: 'no-store' }
  )
  const json = await res.json()
  const matches = (json.matches ?? []).slice(0, 10).map((m: Record<string,unknown>) => {
    const ht = m.homeTeam as Record<string,unknown>
    const at = m.awayTeam as Record<string,unknown>
    const homeMatch = findTeam(dbTeams, ht)
    const awayMatch = findTeam(dbTeams, at)
    return {
      id: m.id,
      date: m.utcDate,
      home: { api: ht.shortName ?? ht.name, norm: norm(String(ht.shortName ?? ht.name ?? '')), matched: homeMatch?.name ?? null },
      away: { api: at.shortName ?? at.name, norm: norm(String(at.shortName ?? at.name ?? '')), matched: awayMatch?.name ?? null },
    }
  })

  return NextResponse.json({
    dbTeams: dbTeams.map(t => ({ name: t.name, shortName: t.shortName, norm: norm(t.name) })),
    existingFixtures: existingFixtures ?? [],
    apiMatches: matches,
  }, { headers: { 'Content-Type': 'application/json' } })
}
