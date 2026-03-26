export type BadgeRarity = 'bronze' | 'silver' | 'gold' | 'legend'
export type CriteriaType = 'post_count' | 'comment_count' | 'likes_received' | 'tactic_count' | 'night_post'

export interface BadgeDef {
  id: string
  emoji: string
  name: string
  description: string
  rarity: BadgeRarity
  criteria_type: CriteriaType
  criteria_value: number
}

export const BADGES: BadgeDef[] = [
  { id: 'megaphone',   emoji: '📣',  name: 'Megafon',     description: 'Ditt första inlägg i forumet',        rarity: 'bronze', criteria_type: 'post_count',     criteria_value: 1    },
  { id: 'regular',     emoji: '📝',  name: 'Fast inlägg', description: '10 inlägg i forumet',                 rarity: 'bronze', criteria_type: 'post_count',     criteria_value: 10   },
  { id: 'active',      emoji: '🎙️', name: 'Aktiv fan',   description: '50 inlägg i forumet',                 rarity: 'silver', criteria_type: 'post_count',     criteria_value: 50   },
  { id: 'ultras',      emoji: '🔥',  name: 'Ultras',       description: '100 inlägg i forumet',                rarity: 'silver', criteria_type: 'post_count',     criteria_value: 100  },
  { id: 'diamond',     emoji: '💎',  name: 'Diamant',      description: '500 inlägg i forumet',                rarity: 'gold',   criteria_type: 'post_count',     criteria_value: 500  },
  { id: 'legend',      emoji: '👑',  name: 'Legend',       description: '1 000 inlägg – en sann legend',       rarity: 'legend', criteria_type: 'post_count',     criteria_value: 1000 },
  { id: 'commentator', emoji: '💬',  name: 'Pratkvarn',    description: '25 kommentarer i forumet',            rarity: 'bronze', criteria_type: 'comment_count',  criteria_value: 25   },
  { id: 'debater',     emoji: '🗣️', name: 'Debattör',    description: '100 kommentarer i forumet',           rarity: 'silver', criteria_type: 'comment_count',  criteria_value: 100  },
  { id: 'analyst',     emoji: '📊',  name: 'Analytiker',   description: '5 inlägg med taktik-ämne',            rarity: 'bronze', criteria_type: 'tactic_count',   criteria_value: 5    },
  { id: 'night_owl',   emoji: '🌙',  name: 'Nattskift',    description: '3 inlägg publicerade 00–04',          rarity: 'silver', criteria_type: 'night_post',     criteria_value: 3    },
  { id: 'liked',       emoji: '❤️', name: 'Folkkär',     description: '50 gillningar på dina inlägg',        rarity: 'silver', criteria_type: 'likes_received', criteria_value: 50   },
  { id: 'beloved',     emoji: '⭐',  name: 'Älskad',       description: '200 gillningar på dina inlägg',       rarity: 'gold',   criteria_type: 'likes_received', criteria_value: 200  },
]

export const BADGE_MAP = Object.fromEntries(BADGES.map(b => [b.id, b])) as Record<string, BadgeDef>

export const RARITY_STYLE: Record<BadgeRarity, { border: string; bg: string; text: string; label: string }> = {
  bronze: { border: 'border-orange-500/40', bg: 'bg-orange-500/10', text: 'text-orange-400',   label: 'Brons'  },
  silver: { border: 'border-slate-400/40',  bg: 'bg-slate-400/10',  text: 'text-slate-300',    label: 'Silver' },
  gold:   { border: 'border-mp-amber/40',   bg: 'bg-mp-amber/10',   text: 'text-mp-amber',     label: 'Guld'   },
  legend: { border: 'border-mp-purple/40',  bg: 'bg-mp-purple/10',  text: 'text-mp-purple',    label: 'Legend' },
}
