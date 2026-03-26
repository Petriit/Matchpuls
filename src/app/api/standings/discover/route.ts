import { NextResponse } from 'next/server'

// Test route: visit /api/standings/discover to verify football-data.org is working

export async function GET() {
  const key = process.env.FOOTBALL_DATA_KEY

  if (!key || key === 'KLISTRA_IN_DIN_NYCKEL_HÄR') {
    return NextResponse.json({ error: 'FOOTBALL_DATA_KEY saknas — lägg till den i .env.local' })
  }

  const res = await fetch('https://api.football-data.org/v4/competitions/PL/standings', {
    headers: { 'X-Auth-Token': key },
    cache: 'no-store',
  })

  const json = await res.json()
  const table = json.standings?.find((s: { type: string }) => s.type === 'TOTAL')?.table ?? []

  return NextResponse.json({
    status:    res.status,
    ok:        res.ok,
    message:   json.message ?? null,
    firstTeam: table[0]?.team?.shortName ?? null,
    top3:      table.slice(0, 3).map((r: Record<string, unknown>) => ({
      pos:    r.position,
      team:   (r.team as Record<string, unknown>)?.shortName,
      points: r.points,
    })),
  })
}
