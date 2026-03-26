'use client'
import { useState, useEffect } from 'react'
import { RefreshCw } from 'lucide-react'
import type { LiveMatch } from '@/types'
interface Props { teamApiId:number; fixtureId?:number }
interface StatBar { label:string; home:number|string; away:number|string }
export function MatchStatsWidget({ teamApiId, fixtureId }: Props) {
  const [match, setMatch] = useState<LiveMatch|null>(null)
  const [stats, setStats] = useState<StatBar[]>([])
  const [loading, setLoading] = useState(true)
  const [updated, setUpdated] = useState<Date|null>(null)
  const fetch_ = async() => {
    setLoading(true)
    try {
      const res=await fetch(`/api/stats?teamId=${teamApiId}${fixtureId?`&fixtureId=${fixtureId}`:''}`)
      const data=await res.json()
      if(data.match)setMatch(data.match); if(data.stats)setStats(data.stats); setUpdated(new Date())
    } catch{}
    setLoading(false)
  }
  useEffect(()=>{ fetch_(); const iv=setInterval(fetch_,60000); return()=>clearInterval(iv) },[teamApiId,fixtureId])
  if(loading&&!match)return<div className="bg-mp-s2 border border-mp-border rounded-xl p-4 flex items-center gap-2 text-mp-t2 text-sm"><RefreshCw size={14} className="animate-spin"/>Laddar statistik...</div>
  if(!match)return null
  const isLive=['LIVE','1H','2H','ET'].includes(match.fixture.status.short)
  return(
    <div className="bg-mp-s1 border border-mp-border rounded-xl overflow-hidden">
      <div className="bg-mp-s2 px-4 py-3 border-b border-mp-border">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[9px] font-bold uppercase tracking-widest text-mp-t2">{match.league.name}</span>
          <div className="flex items-center gap-2">
            {isLive&&<span className="flex items-center gap-1 text-[9px] font-bold text-mp-red"><span className="w-1.5 h-1.5 rounded-full bg-mp-red animate-pulse-slow"/>LIVE {match.fixture.status.elapsed}'</span>}
            <button onClick={fetch_} className="text-mp-t2 hover:text-mp-t1"><RefreshCw size={11} className={loading?'animate-spin':''}/></button>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={match.teams.home.logo} alt={match.teams.home.name} className="w-6 h-6 object-contain"/>
            <span className="text-xs font-bold">{match.teams.home.name}</span>
          </div>
          <div className="font-display text-2xl tracking-wide px-3">{match.goals.home??0} – {match.goals.away??0}</div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold">{match.teams.away.name}</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={match.teams.away.logo} alt={match.teams.away.name} className="w-6 h-6 object-contain"/>
          </div>
        </div>
      </div>
      {match.events&&match.events.length>0&&(
        <div className="px-3 py-2 border-b border-mp-border space-y-1 max-h-28 overflow-y-auto">
          {match.events.slice(-5).map((e,i)=>(
            <div key={i} className="flex items-center gap-2 text-[11px] text-mp-t1">
              <span className="text-mp-t2 w-6 text-right flex-shrink-0">{e.time.elapsed}'</span>
              <span>{e.type==='Goal'?'⚽':e.type==='Card'?(e.detail==='Red Card'?'🟥':'🟨'):'🔄'}</span>
              <span className="font-semibold">{e.player.name}</span>
            </div>
          ))}
        </div>
      )}
      {stats.length>0&&(
        <div className="px-4 py-3 space-y-2.5">
          <p className="section-label">Statistik</p>
          {stats.map((s,i)=>{
            const h=parseFloat(String(s.home))||0; const a=parseFloat(String(s.away))||0
            const total=h+a; const hPct=total>0?Math.round(h/total*100):50
            return(
              <div key={i}>
                <div className="flex justify-between text-[10px] text-mp-t2 mb-1"><span className="font-bold text-mp-t1">{s.home}</span><span>{s.label}</span><span className="font-bold text-mp-t1">{s.away}</span></div>
                <div className="flex h-1.5 rounded-full overflow-hidden bg-mp-border">
                  <div className="bg-mp-red/70 transition-all duration-500" style={{width:`${hPct}%`}}/>
                  <div className="bg-mp-blue/70 transition-all duration-500" style={{width:`${100-hPct}%`}}/>
                </div>
              </div>
            )
          })}
        </div>
      )}
      {updated&&<div className="px-4 pb-2 text-[9px] text-mp-t2">Uppdaterad {updated.toLocaleTimeString('sv-SE',{hour:'2-digit',minute:'2-digit'})}</div>}
    </div>
  )
}
