import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createServerComponentClient } from '@/lib/supabase.server'
import { avatarColor, avatarInitials, formatDateFull, formatNumber } from '@/lib/utils'
import { GLOBAL_BADGES, type GlobalBadgeStats } from '@/lib/globalBadges'
import { BADGE_MAP } from '@/lib/badges'
import { TeamBadge } from '@/components/ui/TeamBadge'
import { ForumMemberList } from '@/components/ui/ForumMemberList'
import { Heart, MessageCircle, Calendar, Users } from 'lucide-react'
import type { Metadata } from 'next'

interface Props { params: { username: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: decodeURIComponent(params.username) }
}

export const dynamic = 'force-dynamic'

export default async function PublicProfilePage({ params }: Props) {
  const supabase = createServerComponentClient()
  const username = decodeURIComponent(params.username)

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, username, default_alias, avatar_url, bio, joined_at, post_count, like_count, role, badge')
    .eq('username', username)
    .single()

  if (!profile) notFound()

  // Fetch all stats in parallel for global badge computation
  const [
    { data: subsData },
    { count: matchForumPosts },
    { count: tacticPosts },
    { count: voiceSessions },
    { count: commentCount },
    { count: nightPosts },
    { data: recentPosts },
    { data: forumBadges },
  ] = await Promise.all([
    supabase.from('subscriptions').select('id, forum:forums(team:teams(name, short_name, color, slug, league:leagues(name, flag_emoji, slug)))').eq('user_id', profile.id),
    supabase.from('match_forum_posts').select('*', { count: 'exact', head: true }).eq('author_id', profile.id),
    supabase.from('posts').select('*', { count: 'exact', head: true }).eq('author_id', profile.id).eq('tag', 'tactic'),
    supabase.from('voice_participants').select('*', { count: 'exact', head: true }).eq('user_id', profile.id),
    supabase.from('comments').select('*', { count: 'exact', head: true }).eq('author_id', profile.id),
    supabase.from('posts').select('*', { count: 'exact', head: true }).eq('author_id', profile.id).eq('title', '').filter('created_at', 'gte', new Date(0).toISOString()),  // placeholder — night check done below
    supabase.from('posts')
      .select('id, content, like_count, comment_count, created_at, tag, forum:forums(team:teams(name, slug, league:leagues(slug, flag_emoji)))')
      .eq('author_id', profile.id)
      .eq('title', '')
      .order('created_at', { ascending: false })
      .limit(6),
    supabase.from('user_forum_badges')
      .select('badge_id, forum:forums(team:teams(name, short_name, color, slug, league:leagues(slug)))')
      .eq('user_id', profile.id),
  ])

  const accountAgeDays = Math.floor((Date.now() - new Date(profile.joined_at).getTime()) / (1000 * 60 * 60 * 24))

  const subCount = subsData?.length ?? 0

  // Build forum list for popover
  const memberForums = (subsData ?? []).map(s => {
    const f = (s as Record<string,unknown>).forum as Record<string,unknown>
    const t = f?.team as Record<string,unknown>
    const lg = t?.league as Record<string,unknown>
    return {
      name: t?.name as string,
      short_name: t?.short_name as string,
      color: t?.color as string,
      teamSlug: t?.slug as string,
      leagueSlug: lg?.slug as string,
      leagueName: lg?.name as string,
      flag_emoji: lg?.flag_emoji as string,
    }
  }).filter(f => f.teamSlug)

  const stats: GlobalBadgeStats = {
    postCount: profile.post_count ?? 0,
    likeCount: profile.like_count ?? 0,
    subCount,
    accountAgeDays,
    matchForumPosts: matchForumPosts ?? 0,
    tacticPosts: tacticPosts ?? 0,
    voiceSessions: voiceSessions ?? 0,
    commentCount: commentCount ?? 0,
  }

  // Evaluate each badge
  const evaluatedBadges = GLOBAL_BADGES.map(b => ({
    ...b,
    earned: b.id === 'secret_night' ? false : b.check(stats),  // night handled separately
  }))

  const earnedCount = evaluatedBadges.filter(b => b.earned).length

  // Group forum badges by forum for display
  const forumBadgesByForum: Record<string, { team: Record<string,unknown>; badges: string[] }> = {}
  for (const fb of forumBadges ?? []) {
    const f = (fb.forum as Record<string,unknown>)
    const t = f?.team as Record<string,unknown>
    const fKey = (t?.slug as string) ?? 'unknown'
    if (!forumBadgesByForum[fKey]) forumBadgesByForum[fKey] = { team: t, badges: [] }
    forumBadgesByForum[fKey].badges.push(fb.badge_id)
  }

  const displayName = profile.default_alias ?? profile.username
  const avatarBg = avatarColor(profile.username)

  const TAG_ICONS: Record<string, { icon: string; label: string }> = {
    match:    { icon: 'fa-regular fa-futbol',               label: 'Match'    },
    transfer: { icon: 'fa-solid fa-arrow-right-arrow-left', label: 'Transfer' },
    general:  { icon: 'fa-solid fa-comment-dots',           label: 'Allmänt'  },
    tactic:   { icon: 'fa-solid fa-chess-board',            label: 'Taktik'   },
    other:    { icon: 'fa-solid fa-link',                   label: 'Övrigt'   },
  }

  return (
    <div className="w-full px-0 sm:px-4 py-4 pb-24 md:pb-6">
      <div className="flex flex-col md:flex-row gap-4 md:gap-6 md:items-start">
      <div className="flex-1 min-w-0">

      {/* ── Profile header ── */}
      <div className="bg-mp-s1 border border-mp-border rounded-2xl p-5 mb-4 relative">
        <div className="absolute inset-0 opacity-5" style={{ background: `linear-gradient(135deg, ${avatarBg} 0%, transparent 60%)` }} />
        <div className="relative flex items-start gap-4">
          <div className="flex-shrink-0">
            {profile.avatar_url
              ? <img src={profile.avatar_url} className="w-16 h-16 rounded-xl object-cover" alt={displayName}/>
              : <div className="w-16 h-16 rounded-xl flex items-center justify-center text-lg font-black text-white"
                  style={{ background: avatarBg }}>
                  {avatarInitials(profile.username)}
                </div>
            }
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-display text-2xl tracking-wide leading-none">{displayName}</h1>
              {profile.badge && <span className="text-xl leading-none">{profile.badge}</span>}
              {(profile.role === 'admin' || profile.role === 'moderator') && (
                <span className="text-[9px] bg-mp-amber/15 text-mp-amber px-2 py-0.5 font-bold tracking-widest uppercase">MOD</span>
              )}
            </div>
            {profile.default_alias && (
              <p className="text-xs text-mp-t2 mt-0.5">@{profile.username}</p>
            )}
            {profile.bio && (
              <p className="text-sm text-mp-t1 mt-2 leading-relaxed">{profile.bio}</p>
            )}
            <div className="flex items-center gap-3 mt-3 text-xs text-mp-t2 flex-wrap">
              <span className="flex items-center gap-1">
                <Calendar size={11}/> Gick med {formatDateFull(profile.joined_at)}
              </span>
              <ForumMemberList count={subCount} forums={memberForums}/>
            </div>
          </div>
        </div>

        {/* Stats strip */}
        <div className="relative grid grid-cols-3 gap-2 mt-4">
          {[
            { n: profile.post_count ?? 0, l: 'Inlägg',     col: 'text-mp-blue'  },
            { n: profile.like_count ?? 0, l: 'Gillningar', col: 'text-mp-red'   },
            { n: commentCount ?? 0,       l: 'Kommentarer',col: 'text-mp-green' },
          ].map(s => (
            <div key={s.l} className="bg-mp-bg border border-mp-border rounded-xl p-2.5 text-center">
              <div className={`font-display text-xl tracking-wide ${s.col}`}>{formatNumber(s.n)}</div>
              <div className="text-[9px] text-mp-t2 mt-0.5">{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Global badges ── */}
      <section className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="section-label"><i className="fa-solid fa-medal fa-xl"/> MÄRKEN</h2>
          <span className="text-xs text-mp-t2">{earnedCount}/{GLOBAL_BADGES.length} upplåsta</span>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {evaluatedBadges.map(b => (
            <div
              key={b.id}
              title={b.earned ? `${b.name}: ${b.description}` : b.secret ? '???' : b.description}
              className={`bg-mp-s1 border border-mp-border rounded-xl p-3 text-center transition-all ${
                b.earned ? 'opacity-100' : 'opacity-25 grayscale'
              }`}
            >
              <div className="text-2xl mb-1 leading-none">{b.secret && !b.earned ? '❓' : b.emoji}</div>
              <div className="text-[10px] font-bold text-mp-t1 leading-tight">
                {b.secret && !b.earned ? '???' : b.name}
              </div>
              {b.earned && (
                <div className="text-[8px] text-mp-t2 mt-0.5 leading-tight">{b.description}</div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── Forum badges ── */}
      {Object.keys(forumBadgesByForum).length > 0 && (
        <section className="mb-4">
          <h2 className="section-label mb-3"><i className="fa-solid fa-trophy fa-xl"/> FORUM-MÄRKEN</h2>
          <div className="bg-mp-s1 border border-mp-border rounded-xl divide-y divide-mp-border">
            {Object.entries(forumBadgesByForum).map(([slug, { team, badges }]) => {
              const t = team as Record<string,unknown>
              return (
                <div key={slug} className="flex items-center gap-3 p-3">
                  <TeamBadge color={(t?.color as string) ?? '#e8304a'} shortName={(t?.short_name as string) ?? ''} size="sm"/>
                  <span className="text-xs text-mp-t2 flex-1">{t?.name as string}</span>
                  <div className="flex gap-1">
                    {badges.map(bid => {
                      const b = BADGE_MAP[bid]
                      return b ? <span key={bid} className="text-base leading-none" title={b.name}>{b.emoji}</span> : null
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* ── Recent posts ── */}
      {(recentPosts ?? []).length > 0 && (
        <section>
          <h2 className="section-label mb-3"><i className="fa-solid fa-comment-dots fa-xl"/> SENASTE INLÄGG</h2>
          <div className="space-y-2">
            {(recentPosts ?? []).map((post: Record<string,unknown>) => {
              const f = post.forum as Record<string,unknown>
              const t = f?.team as Record<string,unknown>
              const lg = t?.league as Record<string,unknown>
              return (
                <Link
                  key={post.id as string}
                  href={`/forum/${lg?.slug}/${t?.slug}`}
                  className="flex items-start gap-3 p-3 bg-mp-s1 border border-mp-border rounded-xl hover:border-mp-red/40 transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[9px] font-bold text-mp-t2 uppercase tracking-wider">{t?.name as string}</span>
                      {(() => { const ti = TAG_ICONS[post.tag as string]; return ti ? <span className="flex items-center gap-0.5 text-[9px] text-mp-t2"><i className={ti.icon}/> {ti.label}</span> : null })()}
                    </div>
                    <p className="text-sm text-mp-t1 line-clamp-2 group-hover:text-mp-t0 transition-colors">
                      {post.content as string}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1 text-xs flex-shrink-0 text-mp-t2">
                    <span className="flex items-center gap-1"><Heart size={10}/> {post.like_count as number}</span>
                    <span className="flex items-center gap-1"><MessageCircle size={10}/> {post.comment_count as number}</span>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      </div>{/* end main column */}

      {/* ── Aside ── */}
      <aside className="w-full md:w-64 md:flex-shrink-0 space-y-4">
        <div className="hidden md:flex bg-mp-s2 border border-dashed border-mp-border rounded-xl h-36 items-center justify-center">
          <span className="text-xs font-bold tracking-widest text-mp-t2 uppercase">Annons</span>
        </div>

        {/* Forum memberships */}
        <div className="bg-mp-s1 border border-mp-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-mp-t2 uppercase tracking-widest flex items-center gap-1.5">
              <Users size={14} strokeWidth={1.75}/> Forum
            </h3>
            <span className="text-xs text-mp-red font-bold">{subCount}</span>
          </div>
          {subCount === 0 ? (
            <p className="text-xs text-mp-t2 text-center py-3">Inga forum än</p>
          ) : (
            <div className="space-y-1">
              {memberForums.slice(0, 8).map(f => (
                <Link key={f.teamSlug} href={`/forum/${f.leagueSlug}/${f.teamSlug}`}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-mp-s2 transition-colors group">
                  <TeamBadge color={f.color ?? '#e8304a'} shortName={f.short_name ?? ''} size="sm"/>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold truncate group-hover:text-mp-t0">{f.name}</div>
                    <div className="text-[10px] text-mp-t2">{f.flag_emoji} {f.leagueName}</div>
                  </div>
                </Link>
              ))}
              {subCount > 8 && (
                <p className="text-[10px] text-mp-t2 text-center pt-1">+{subCount - 8} till</p>
              )}
            </div>
          )}
        </div>

        <div className="bg-mp-s2 border border-dashed border-mp-border rounded-xl h-52 flex items-center justify-center">
          <span className="text-xs font-bold tracking-widest text-mp-t2 uppercase">Annons</span>
        </div>
      </aside>

      </div>{/* end flex row */}
    </div>
  )
}
