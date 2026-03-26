import { NextRequest, NextResponse } from 'next/server'
const BASE = 'https://api-football-v1.p.rapidapi.com/v3'
const H = { 'X-RapidAPI-Key': process.env.API_FOOTBALL_KEY!, 'X-RapidAPI-Host': 'api-football-v1.p.rapidapi.com' }
async function apiFetch(path: string) { return (await fetch(`${BASE}${path}`, { headers: H, next: { revalidate: 60 } })).json() }
const LABELS: Record<string,string> = { 'Ball Possession':'Bollinnehav','Total Shots':'Skott totalt','Shots on Goal':'Skott på mål','Corner Kicks':'Hörnor','Fouls':'Foul','Yellow Cards':'Gula kort','Passes %':'Passningsprecision' }
export async function GET(req: NextRequest) {
  const teamId = req.nextUrl.searchParams.get('teamId')
  const fixtureId = req.nextUrl.searchParams.get('fixtureId')
  if (!teamId) return NextResponse.json({ error: 'Missing teamId' }, { status: 400 })
  let match = null; let statsData: Record<string,unknown>[] = []
  if (fixtureId) {
    const [fr,sr] = await Promise.all([apiFetch(`/fixtures?id=${fixtureId}`), apiFetch(`/fixtures/statistics?fixture=${fixtureId}`)])
    match = fr.response?.[0]; statsData = sr.response??[]
  } else {
    const lr = await apiFetch(`/fixtures?team=${teamId}&live=all`)
    if (lr.response?.length > 0) { match = lr.response[0]; const sr = await apiFetch(`/fixtures/statistics?fixture=${match.fixture.id}`); statsData = sr.response??[] }
    else { const today = new Date().toISOString().split('T')[0]; const tr = await apiFetch(`/fixtures?team=${teamId}&date=${today}`); match = tr.response?.[0] }
  }
  const hs = (statsData[0] as Record<string,unknown>)?.statistics as {type:string;value:unknown}[]??[]
  const as_ = (statsData[1] as Record<string,unknown>)?.statistics as {type:string;value:unknown}[]??[]
  const stats = hs.filter(s=>LABELS[s.type]).map(hs=>({ label:LABELS[hs.type], home:hs.value??0, away:(as_.find(x=>x.type===hs.type)?.value??0) }))
  return NextResponse.json({ match, stats })
}
