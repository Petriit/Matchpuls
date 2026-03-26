import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase.server'

// football-data.org competition codes
const LEAGUE_CODES: Record<string, string> = {
  'premier-league': 'PL',
  'la-liga':        'PD',
  'bundesliga':     'BL1',
  'serie-a':        'SA',
  'ligue-1':        'FL1',
}

// Normalize team name for fuzzy matching
function norm(s: string) {
  return s.toLowerCase()
    .replace(/[àáâãäå]/g, 'a').replace(/[èéêë]/g, 'e')
    .replace(/[ìíîï]/g, 'i').replace(/[òóôõö]/g, 'o')
    .replace(/[ùúûü]/g, 'u').replace(/ñ/g, 'n').replace(/ç/g, 'c')
    .replace(/[^a-z0-9]/g, '')
}

type TeamRow = { id: string; name: string; shortName: string; leagueSlug: string }

// Find best DB match for a football-data.org team entry
// Tries exact match first, then partial/contains as fallback for nicknames (Atleti, Barça, etc.)
function findTeam(teams: TeamRow[], apiTeam: Record<string, unknown>): TeamRow | undefined {
  const apiName  = norm(String(apiTeam.name  ?? ''))
  const apiShort = norm(String(apiTeam.shortName ?? ''))

  // 1. Exact match
  const exact = teams.find(t =>
    norm(t.name) === apiName  || norm(t.name) === apiShort ||
    norm(t.shortName) === apiShort || norm(t.shortName) === apiName
  )
  if (exact) return exact

  // 2. Partial/contains match (handles "Atleti" ↔ "Atletico Madrid", "Barça" ↔ "FC Barcelona", etc.)
  // Only use apiShort in the "api contains db" direction to avoid false positives
  // from full names like "RCD Espanyol de Barcelona" matching "Barcelona"
  const MIN = 4
  return teams.find(t => {
    const dbN = norm(t.name)
    const dbS = norm(t.shortName)
    return (
      (apiName.length  >= MIN && dbN.includes(apiName))  ||
      (apiShort.length >= MIN && dbN.includes(apiShort)) ||
      (apiShort.length >= MIN && apiShort.includes(dbN)) ||
      (apiShort.length >= MIN && apiShort.includes(dbS)) ||
      (apiName.length  >= MIN && dbS.includes(apiName))
    )
  })
}

export async function POST(req: NextRequest) {
  // Protect with cron secret (or allow internal calls without it for manual trigger)
  const secret = req.headers.get('x-cron-secret')
  if (secret && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const key = process.env.FOOTBALL_DATA_KEY
  if (!key) return NextResponse.json({ error: 'FOOTBALL_DATA_KEY saknas' }, { status: 500 })

  // Load all teams from DB grouped by league slug
  const { data: teamsRaw } = await supabase
    .from('teams')
    .select('id, name, short_name, league:leagues(slug)')

  const teams: TeamRow[] = (teamsRaw ?? []).map(t => ({
    id: t.id as string,
    name: t.name as string,
    shortName: t.short_name as string,
    leagueSlug: (t.league as unknown as Record<string, unknown>)?.slug as string,
  }))

  let inserted = 0
  let updated  = 0
  const errors: string[] = []

  for (const [leagueSlug, code] of Object.entries(LEAGUE_CODES)) {
    const leagueTeams = teams.filter(t => t.leagueSlug === leagueSlug)
    if (leagueTeams.length === 0) continue

    // Fetch next 10 scheduled matches + any live/finished in last 2 days
    const res = await fetch(
      `https://api.football-data.org/v4/competitions/${code}/matches?status=SCHEDULED`,
      { headers: { 'X-Auth-Token': key }, next: { revalidate: 0 } }
    )

    if (!res.ok) {
      errors.push(`${leagueSlug}: HTTP ${res.status}`)
      continue
    }

    const json = await res.json()
    const matches: Record<string, unknown>[] = json.matches ?? []

    for (const match of matches) {
      const externalId = String(match.id)
      const kickoffAt  = match.utcDate as string
      const status     = (match.status as string).toLowerCase() === 'scheduled' ? 'scheduled' : 'live'
      const homeTeamData = match.homeTeam as Record<string, unknown>
      const awayTeamData = match.awayTeam as Record<string, unknown>
      const homeName   = (homeTeamData.shortName ?? homeTeamData.name) as string
      const awayName   = (awayTeamData.shortName ?? awayTeamData.name) as string
      const homeScore  = (match.score as Record<string, unknown>)?.fullTime
        ? ((match.score as Record<string, unknown>).fullTime as Record<string, unknown>).home as number | null
        : null
      const awayScore  = (match.score as Record<string, unknown>)?.fullTime
        ? ((match.score as Record<string, unknown>).fullTime as Record<string, unknown>).away as number | null
        : null

      // Find matching teams in DB for both home and away
      const homeDbTeam = findTeam(leagueTeams, homeTeamData)
      const awayDbTeam = findTeam(leagueTeams, awayTeamData)

      // Insert one fixture row per team involved (so both teams get the match)
      for (const dbTeam of [homeDbTeam, awayDbTeam].filter(Boolean)) {
        const row = {
          team_id:     dbTeam!.id,
          external_id: externalId,
          home_team:   homeName,
          away_team:   awayName,
          kickoff_at:  kickoffAt,
          status,
          home_score:  homeScore,
          away_score:  awayScore,
        }

        const { error } = await supabase
          .from('fixtures')
          .upsert(row, { onConflict: 'external_id,team_id' })

        if (error) {
          errors.push(`${externalId}/${dbTeam!.id}: ${error.message}`)
        } else {
          inserted++
        }
      }
    }
  }

  return NextResponse.json({ ok: true, inserted, updated, errors })
}

// Allow GET for easy manual trigger from browser (dev only)
export async function GET() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/fixtures/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  })
  return res
}
