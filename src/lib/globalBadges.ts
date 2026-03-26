export interface GlobalBadgeDef {
  id: string
  emoji: string
  name: string
  description: string
  secret?: boolean   // hint shown as "???" until earned
  check: (stats: GlobalBadgeStats) => boolean
}

export interface GlobalBadgeStats {
  postCount: number
  likeCount: number
  subCount: number
  accountAgeDays: number
  matchForumPosts: number
  tacticPosts: number
  voiceSessions: number
  commentCount: number
}

export const GLOBAL_BADGES: GlobalBadgeDef[] = [
  // ─── Aktivitet ─────────────────────────────────────────────────────────────
  {
    id: 'welcome',
    emoji: '👋',
    name: 'Välkommen',
    description: 'Gick med i Matchpuls',
    check: () => true,
  },
  {
    id: 'first_post',
    emoji: '✍️',
    name: 'Första inlägg',
    description: 'Publicerade sitt första inlägg',
    check: s => s.postCount >= 1,
  },
  {
    id: 'regular',
    emoji: '📣',
    name: 'Fast inlägg',
    description: '25 inlägg totalt',
    check: s => s.postCount >= 25,
  },
  {
    id: 'prolific',
    emoji: '🔥',
    name: 'Eldsjälen',
    description: '100 inlägg totalt',
    check: s => s.postCount >= 100,
  },
  {
    id: 'veteran',
    emoji: '💎',
    name: 'Veteranen',
    description: '500 inlägg totalt',
    check: s => s.postCount >= 500,
  },
  {
    id: 'legend',
    emoji: '👑',
    name: 'Legenden',
    description: '2 000 inlägg – äkta Matchpuls-legend',
    check: s => s.postCount >= 2000,
  },
  // ─── Kommentarer ────────────────────────────────────────────────────────────
  {
    id: 'chatter',
    emoji: '💬',
    name: 'Pratglad',
    description: '50 kommentarer totalt',
    check: s => s.commentCount >= 50,
  },
  {
    id: 'debater',
    emoji: '🎙️',
    name: 'Debattören',
    description: '250 kommentarer totalt',
    check: s => s.commentCount >= 250,
  },
  // ─── Gillningar ─────────────────────────────────────────────────────────────
  {
    id: 'liked',
    emoji: '❤️',
    name: 'Gillad',
    description: '25 gillningar på inlägg totalt',
    check: s => s.likeCount >= 25,
  },
  {
    id: 'popular',
    emoji: '⭐',
    name: 'Populär',
    description: '100 gillningar på inlägg totalt',
    check: s => s.likeCount >= 100,
  },
  {
    id: 'star',
    emoji: '🌟',
    name: 'Stjärnan',
    description: '500 gillningar – folk lyssnar på dig',
    check: s => s.likeCount >= 500,
  },
  // ─── Forumliv ────────────────────────────────────────────────────────────────
  {
    id: 'explorer',
    emoji: '🗺️',
    name: 'Utforskaren',
    description: 'Medlem i 3 eller fler forum',
    check: s => s.subCount >= 3,
  },
  {
    id: 'collector',
    emoji: '🏟️',
    name: 'Tribun-hopper',
    description: 'Medlem i 8 eller fler forum',
    check: s => s.subCount >= 8,
  },
  {
    id: 'old_fox',
    emoji: '🦊',
    name: 'Gammal räv',
    description: 'Konto äldre än 6 månader',
    check: s => s.accountAgeDays >= 180,
  },
  // ─── Special ─────────────────────────────────────────────────────────────────
  {
    id: 'match_mad',
    emoji: '⚡',
    name: 'Matchgalen',
    description: 'Postat i ett live matchforum',
    check: s => s.matchForumPosts >= 1,
  },
  {
    id: 'tactician',
    emoji: '📊',
    name: 'Taktikern',
    description: '10 inlägg med taktik-ämne',
    check: s => s.tacticPosts >= 10,
  },
  {
    id: 'voice_hero',
    emoji: '🎧',
    name: 'Röstaktivist',
    description: 'Deltagit i röstchatt',
    check: s => s.voiceSessions >= 1,
  },
  // ─── Hemliga ─────────────────────────────────────────────────────────────────
  {
    id: 'secret_night',
    emoji: '🌙',
    name: 'Nattuglan',
    description: 'Postat mitt i natten — vad gör du uppe?',
    secret: true,
    check: s => s.postCount >= 1,   // checked differently — handled in page
  },
  {
    id: 'secret_mega',
    emoji: '🚀',
    name: 'Raketstart',
    description: '5 inlägg under sin första dag',
    secret: true,
    check: () => false,   // handled separately in page
  },
]
