'use client'
import { useEffect, useState } from 'react'

interface Standing {
  rank: number
  name: string
  played: number
  win: number
  draw: number
  lose: number
  points: number
  goalsDiff: number
  form: string
}

interface Props {
  leagueSlug: string
  highlightTeam?: string
  limit?: number
}

export function LeagueStandingsWidget({ leagueSlug, highlightTeam, limit }: Props) {
  const [table, setTable] = useState<Standing[]>([])
  const [season, setSeason] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`/api/standings?league=${leagueSlug}`)
      .then(r => r.json())
      .then(d => {
        if (d.table && d.table.length > 0) { setTable(d.table); setSeason(d.season) }
        else setError(d.error ?? 'Ingen data för denna liga')
      })
      .catch(() => setError('Nätverksfel'))
      .finally(() => setLoading(false))
  }, [leagueSlug])

  if (loading) return (
    <div className="bg-mp-s1 border border-mp-border rounded-xl p-4 animate-pulse">
      <div className="h-3 w-24 bg-mp-s3 rounded mb-3" />
      {[...Array(6)].map((_, i) => <div key={i} className="h-5 bg-mp-s2 rounded mb-1.5" />)}
    </div>
  )

  if (error) return (
    <div className="bg-mp-s1 border border-mp-border rounded-xl p-4">
      <p className="text-xs font-bold text-mp-t2 uppercase tracking-widest mb-1">Tabellställning</p>
      <p className="text-xs text-mp-red">⚠ {error}</p>
    </div>
  )

  return (
    <div className="bg-mp-s1 border border-mp-border rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-mp-border">
        <h3 className="text-xs font-bold text-mp-t0 uppercase tracking-widest">Tabellställning</h3>
        {season && <span className="text-[10px] text-mp-t2">{season}/{String(season + 1).slice(2)}</span>}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-mp-t2 border-b border-mp-border">
              <th className="text-left px-2 py-1.5 w-6">#</th>
              <th className="text-left px-1 py-1.5">Lag</th>
              <th className="text-center px-1 py-1.5 w-6">S</th>
              <th className="text-center px-1 py-1.5 w-6">V</th>
              <th className="text-center px-1 py-1.5 w-6">O</th>
              <th className="text-center px-1 py-1.5 w-6">F</th>
              <th className="text-center px-1 py-1.5 w-8 font-bold text-mp-t0">P</th>
            </tr>
          </thead>
          <tbody>
            {(limit ? table.slice(0, limit) : table).map((row) => {
              const isHighlight = highlightTeam &&
                row.name.toLowerCase().includes(highlightTeam.toLowerCase())
              return (
                <tr key={row.rank}
                  className={`border-b border-mp-border/50 last:border-0 transition-colors ${
                    isHighlight ? 'bg-mp-red/10' : 'hover:bg-mp-s2'
                  }`}>
                  <td className={`px-2 py-1.5 font-bold ${isHighlight ? 'text-mp-red' : 'text-mp-t2'}`}>
                    {row.rank}
                  </td>
                  <td className={`px-1 py-1.5 font-medium truncate max-w-[90px] ${
                    isHighlight ? 'text-mp-t0 font-bold' : 'text-mp-t1'
                  }`}>
                    {row.name}
                  </td>
                  <td className="text-center px-1 py-1.5 text-mp-t2">{row.played}</td>
                  <td className="text-center px-1 py-1.5 text-mp-t2">{row.win}</td>
                  <td className="text-center px-1 py-1.5 text-mp-t2">{row.draw}</td>
                  <td className="text-center px-1 py-1.5 text-mp-t2">{row.lose}</td>
                  <td className="text-center px-1 py-1.5 font-bold text-mp-t0">{row.points as number}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Form dots for highlighted team */}
      {highlightTeam && (() => {
        const row = table.find(r => r.name.toLowerCase().includes(highlightTeam.toLowerCase()))
        if (!row?.form) return null
        const FORM_COLOR: Record<string, string> = { W: 'bg-mp-green', D: 'bg-mp-amber', L: 'bg-mp-red' }
        return (
          <div className="px-3 py-2 border-t border-mp-border flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] text-mp-t2 mr-1">Form:</span>
            {row.form.split('').map((f, i) => (
              <span key={i} className={`w-4 h-4 text-[8px] font-black text-white flex items-center justify-center ${FORM_COLOR[f] ?? 'bg-mp-t2'}`}>
                {f}
              </span>
            ))}
          </div>
        )
      })()}
    </div>
  )
}
