import { formatDate } from '@/lib/utils'
import { avatarColor, avatarInitials } from '@/lib/utils'
import { ForumLiveStats } from './ForumLiveStats'
import type { Session } from '@supabase/supabase-js'
interface Props { forum:Record<string,unknown>; moderators:Record<string,unknown>[]; nextFixture:Record<string,unknown>|null; session:Session|null }
export function ForumSidebarRight({ forum, moderators, nextFixture, session }: Props) {
  return (
    <div className="space-y-4">
      <div>
        <p className="section-label mb-2">Forum-statistik</p>
        <ForumLiveStats forumId={forum.id as string} />
      </div>
      {moderators.length>0&&(
        <div>
          <p className="section-label mb-2">Moderatorer</p>
          <div className="space-y-1">
            {moderators.map((m:Record<string,unknown>)=>{
              const p=m.profile as Record<string,unknown>
              return(
                <div key={m.id as string} className="flex items-center gap-2 py-1 border-b border-mp-border last:border-0">
                  <div className="w-6 h-6 rounded flex items-center justify-center text-[7px] font-black text-white flex-shrink-0" style={{background:avatarColor(p?.username as string??'m')}}>{avatarInitials(p?.username as string??'M')}</div>
                  <div className="flex-1"><div className="text-xs font-semibold">{p?.username as string}</div><div className="text-[9px] text-mp-amber">{m.role as string}</div></div>
                </div>
              )
            })}
          </div>
        </div>
      )}
      {nextFixture&&(
        <div>
          <p className="section-label mb-2">🎯 Gissa matchen</p>
          <div className="bg-mp-s2 border border-mp-border rounded-lg p-3">
            <div className="text-xs font-semibold mb-1">{nextFixture.home_team as string} vs {nextFixture.away_team as string}</div>
            <div className="text-[10px] text-mp-t2 mb-3">{formatDate(nextFixture.kickoff_at as string)}</div>
            {session?(
              <form action="/api/predict" method="POST" className="space-y-2">
                <input type="hidden" name="fixtureId" value={nextFixture.id as string}/>
                <div className="flex gap-1">
                  {[{v:'home',l:(nextFixture.home_team as string).split(' ')[0]},{v:'draw',l:'Oavgjort'},{v:'away',l:(nextFixture.away_team as string).split(' ')[0]}].map(b=>(
                    <button key={b.v} type="submit" name="pick" value={b.v} className="flex-1 py-1.5 text-[10px] font-bold rounded border border-mp-border bg-mp-s1 text-mp-t1 hover:border-mp-red hover:text-mp-red transition-colors">{b.l}</button>
                  ))}
                </div>
              </form>
            ):<p className="text-[10px] text-mp-t2 text-center">Logga in för att gissa</p>}
          </div>
        </div>
      )}
      <div className="bg-mp-s2 border border-dashed border-mp-border rounded-lg h-28 flex items-center justify-center">
        <span className="text-[8px] font-bold tracking-widest text-mp-t2 uppercase">Annons 300×250</span>
      </div>
    </div>
  )
}
