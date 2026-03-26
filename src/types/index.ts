// ─── Core types ───────────────────────────────────────────────────────────────
export interface Profile {
  id: string
  username: string
  default_alias: string | null
  avatar_url: string | null
  bio: string | null
  joined_at: string
  post_count: number
  like_count: number
  is_online: boolean
  last_seen_at: string
  role: 'user' | 'moderator' | 'admin'
  badge?: string | null
}

export interface League {
  id: string
  name: string
  country: string
  flag_emoji: string
  slug: string
  sport: string
}

export interface Team {
  id: string
  league_id: string
  name: string
  short_name: string
  color: string
  slug: string
  league?: League
}

export interface Forum {
  id: string
  team_id: string
  post_count: number
  member_count: number
  today_count: number
  team?: Team
}

export interface ForumModerator {
  id: string
  forum_id: string
  user_id: string
  role: string
  profile?: Profile
}

export type PostTag = 'match' | 'transfer' | 'general' | 'tactic' | 'other'

export interface Post {
  id: string
  forum_id: string
  author_id: string
  title: string
  content: string
  tag: PostTag
  link_url: string | null
  like_count: number
  comment_count: number
  is_pinned: boolean
  created_at: string
  updated_at: string
  author?: Profile
  alias?: string | null
  author_badge?: string | null
  user_liked?: boolean
  reactions?: { emoji: string; user_id: string }[]
}

export interface Comment {
  id: string
  post_id: string
  parent_id: string | null
  author_id: string
  content: string
  like_count: number
  created_at: string
  author?: Profile
  alias?: string | null
  author_badge?: string | null
  user_liked?: boolean
  replies?: Comment[]
}

export interface Subscription {
  id: string
  user_id: string
  forum_id: string
  created_at: string
  forum?: Forum & { team?: Team & { league?: League } }
}

export interface Fixture {
  id: string
  team_id: string
  home_team: string
  away_team: string
  kickoff_at: string
  competition: string
  score_home: number | null
  score_away: number | null
  status: 'scheduled' | 'live' | 'finished'
  minute: number | null
}

// ─── Emoji reactions ──────────────────────────────────────────────────────────
export const REACTION_EMOJIS = ['🔥', '😂', '😤', '👏', '💔', '🎯', '😊', '💯'] as const
export type ReactionEmoji = typeof REACTION_EMOJIS[number]

export interface ReactionCounts {
  [emoji: string]: { count: number; userReacted: boolean }
}

// ─── Match forum ──────────────────────────────────────────────────────────────
export type MatchForumStatus = 'pending' | 'active' | 'closed' | 'cleaned'

export interface MatchForum {
  id: string
  forum_id: string
  fixture_id: string
  status: MatchForumStatus
  opened_at: string | null
  closed_at: string | null
  cleanup_at: string | null
  created_at: string
  fixture?: Fixture
}

export interface MatchForumPost {
  id: string
  match_forum_id: string
  author_id: string
  content: string
  like_count: number
  created_at: string
  author?: Profile
}

// ─── Voice chat ───────────────────────────────────────────────────────────────
export interface VoiceParticipant {
  id: string
  session_id: string
  user_id: string
  is_muted: boolean
  joined_at: string
  profile?: { username: string; default_alias?: string | null; is_online?: boolean }
}

// ─── Match stats ──────────────────────────────────────────────────────────────
export interface LiveMatch {
  fixture: {
    id: number
    status: { short: string; elapsed: number | null }
    date: string
  }
  league: { name: string; logo: string }
  teams: {
    home: { id: number; name: string; logo: string; winner: boolean | null }
    away: { id: number; name: string; logo: string; winner: boolean | null }
  }
  goals: { home: number | null; away: number | null }
  events: Array<{
    time: { elapsed: number }
    team: { name: string }
    player: { name: string }
    type: string
    detail: string
  }>
}
