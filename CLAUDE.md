# Matchpuls – Projektkontext för Claude Code

## Vad är Matchpuls?
En modern svensk sportforum-app som ersätter Svenskafans.com. Live-forum, dark mode, mobilapp och avancerade funktioner. Byggt av Petrit.

## Tech Stack
- **Framework:** Next.js 14 (App Router + SSR)
- **Språk:** TypeScript
- **Styling:** Tailwind CSS med custom `mp-*` färgpalett
- **Databas + Auth:** Supabase (PostgreSQL + Supabase Auth + Realtime)
- **Röstchatt:** LiveKit (WebRTC) — ersatte Daily.co
- **Matchstatistik:** football-data.org (tabeller + fixtures), API-Football via RapidAPI (live stats)
- **Hosting:** Vercel (med cron-jobb)
- **Typsnitt:** Space Grotesk + Bebas Neue
- **Ikoner:** Lucide React + Font Awesome (fa-solid, fa-regular)

## Färgpalett (Tailwind `mp-*`)
```
bg:     #080b14  (mörkaste bakgrund)
s1:     #0d1120  (kort/sidebars)
s2:     #121829  (input-bakgrund)
s3:     #1a2235  (hover-states)
border: #1e2840
t0:     #f0f4ff  (primär text)
t1:     #8a9ac0  (sekundär text)
t2:     #4a5470  (dämpad text)
red:    #e8304a  (primär accent)
blue:   #3b7fff
green:  #00e676
amber:  #ffab00
purple: #9c6fff
```

## Projektstruktur
```
src/
├── app/
│   ├── page.tsx                          # Startsida
│   ├── layout.tsx                        # Root layout (Navbar, Sidebar, MobileBottomNav)
│   ├── globals.css                       # Tailwind + custom klasser
│   ├── welcome/page.tsx                  # Välkomstsida efter registrering
│   ├── auth/
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   ├── confirm-email/page.tsx
│   │   ├── forgot-password/page.tsx
│   │   ├── reset-password/page.tsx
│   │   └── logout/route.ts
│   ├── forum/[leagueSlug]/[teamSlug]/page.tsx
│   ├── league/[leagueSlug]/[teamSlug]/page.tsx  # Lagsida med nästa match, artiklar, statistik
│   ├── profile/page.tsx                  # Min sida (alias, märken, lösenord, senaste inlägg)
│   ├── profile/[username]/page.tsx       # Publik profilsida
│   ├── mina-forum/page.tsx               # Mobilanpassad prenumerationssida
│   ├── admin/
│   │   ├── page.tsx
│   │   └── AdminTabs.tsx
│   └── api/
│       ├── voice/room/route.ts           # LiveKit token-generering
│       ├── match-forum/route.ts          # Cron: aktivera/stäng matchforum
│       ├── fixtures/sync/route.ts        # Cron: synka kommande matcher från football-data.org
│       ├── badges/check/route.ts         # Kolla och tilldela forum-märken
│       ├── badges/sync-posts/route.ts    # Backfill author_badge på alla gamla inlägg
│       ├── standings/route.ts            # Tabellställning från football-data.org
│       ├── stats/route.ts                # API-Football proxy
│       └── subscribe/route.ts
├── components/
│   ├── layout/
│   │   ├── Navbar.tsx
│   │   ├── Sidebar.tsx
│   │   └── MobileBottomNav.tsx
│   ├── forum/
│   │   ├── ForumFeed.tsx                 # Huvudkomponent med sökning, filter, realtime
│   │   ├── PostCard.tsx                  # Inlägg med likes, reaktioner, kommentarer
│   │   ├── CommentThread.tsx             # Nestade kommentarer (max 3 nivåer, 1 visas default)
│   │   ├── NewPostModal.tsx              # Modal för nytt inlägg (alias-val, validering)
│   │   └── ForumSidebarRight.tsx
│   ├── auth/
│   │   └── AuthForms.tsx                 # Login, Register, ForgotPassword, ResetPassword
│   ├── voice/
│   │   └── VoiceChat.tsx                 # LiveKit WebRTC röstkanal (avatarer, FA-ikoner)
│   ├── reactions/
│   │   └── EmojiReactions.tsx            # 8 emojis: 🔥😂😤👏💔🎯😊💯
│   ├── match-forum/
│   │   └── MatchForumChat.tsx            # Live matchforum-chatt (Discord-stil)
│   ├── stats/
│   │   └── MatchStatsWidget.tsx          # Live matchstatistik
│   ├── team/
│   │   ├── TeamArticles.tsx              # Artiklar med redigering för admin
│   │   └── CreateArticleModal.tsx        # Skapa/redigera artikel (edit-mode via article prop)
│   └── ui/
│       ├── AliasEditor.tsx               # Alias + forum-märken på Min sida
│       ├── SyncBadgesButton.tsx          # Manuell badge-sync på Min sida
│       ├── ChangePasswordForm.tsx        # Byt lösenord (collapsible)
│       ├── ForumMemberList.tsx           # Popover med forum-medlemskap
│       ├── TeamBadge.tsx
│       ├── AvatarUpload.tsx
│       └── UserMenu.tsx
├── hooks/index.ts                        # useForumRealtime, useSearch
├── lib/
│   ├── supabase.ts                       # Browser client + realtime helpers (subscribeToForumPosts, subscribeToOnlinePresence)
│   ├── supabase.server.ts                # Server client + createServiceClient() (kringgår RLS)
│   ├── badges.ts                         # BADGES, BADGE_MAP, RARITY_STYLE – badge-definitioner
│   ├── globalBadges.ts                   # GLOBAL_BADGES – profilsidans globala märken
│   └── utils.ts                          # cn(), highlightText(), timeAgo(), avatarColor()
└── types/index.ts                        # Alla TypeScript-interfaces, REACTION_EMOJIS
```

## Viktiga regler
- `createClient()` från `@/lib/supabase` – används i Client Components ('use client')
- `createServerComponentClient()` från `@/lib/supabase.server` – används i Server Components, Route Handlers
- `createServiceClient()` från `@/lib/supabase.server` – kringgår RLS, använd BARA i Route Handlers för skriv-operationer
- Blanda aldrig browser- och server-klienter i samma fil
- Font Awesome används med `<i className="fa-solid fa-..." />` (inte emoji) för ikoner i UI

## CSS-klasser (globals.css)
```
.post-card         – inläggskort
.action-btn        – gilla/kommentera-knappar (modifier: .liked, .rp)
.mp-input          – formulärfält
.btn-primary       – röd primär knapp
.btn-ghost         – genomskinlig knapp
.show-more         – "visa fler"-knapp
.sidebar-label     – rubrik i sidebar
.section-label     – rubrik på sidor
.tag-pill          – ämnesetikett på inlägg
```

## Databasschema (Supabase)
Migrationsfiler i `supabase/migrations/`:
- `001_schema.sql` – all grundstruktur
- `002_badges.sql` – forum-märken (forum_badges, user_forum_badges, selected_badge på user_aliases, author_badge på posts/comments, triggers, get_forum_badge_progress RPC)
- `003_public_rls.sql` – gör subscriptions och user_forum_badges publikt läsbara
- `004_reset_online.sql` – nollställer is_online (kör en gång)
- `005_refresh_member_counts.sql` – räknar om forums.member_count + fixar trigger
- `006_fixtures_external_id.sql` – lägger till external_id på fixtures + unik index

Viktiga tabeller:
- `profiles` – användarprofiler (username, default_alias, role, avatar_url)
- `leagues`, `teams`, `forums` – ligastruktur
- `subscriptions` – användares prenumerationer på forum
- `user_aliases` – per-forum alias + `selected_badge` (FK → forum_badges.id)
- `posts`, `comments` – foruminnehåll (posts med title='' är foruminlägg, title≠'' är artiklar; author_badge kopieras från valt märke)
- `post_likes`, `comment_likes` – gillningar (triggers synkar count)
- `post_reactions` – emoji-reaktioner (🔥😂😤👏💔🎯😊💯)
- `forum_badges` – badge-definitioner (id=text t.ex. 'megaphone', 'ultras')
- `user_forum_badges` – intjänade badges per användare per forum
- `fixtures` – matcher (status: scheduled/live/finished, external_id från football-data.org)
- `match_forums` – live matchforum (status: pending/active/closed/cleaned)
- `match_forum_posts` – inlägg i matchforum (raderas 12h efter stängning)
- `voice_sessions` – aktiva röstrum (unique forum_id)
- `voice_participants` – deltagare i röstrum
- `admin_actions`, `user_bans` – adminlogg och spärrar

## Badge-system
- **Forum-märken** (per forum): definieras i `src/lib/badges.ts` och `forum_badges`-tabellen (speglar varandra exakt)
- Märken tjänas in via `/api/badges/check` (RPC `get_forum_badge_progress` eller fallback-queries)
- Valt märke lagras i `user_aliases.selected_badge` → stamp på nya inlägg via DB-trigger
- Backfill gamla inlägg: `/api/badges/sync-posts` (POST) – anropas automatiskt när märke equipas
- **Globala märken** (på profilen): definieras i `src/lib/globalBadges.ts`, beräknas client-side

## Röstkanal (LiveKit)
- Kräver HTTPS (fungerar på localhost och Vercel, ej 192.168.x.x)
- Token genereras i `/api/voice/room` med `livekit-server-sdk`; avatar_url hämtas från `profiles`-tabellen
- `voice_sessions` INSERT kräver service role client (RLS-policy saknar write)
- Miljövariabler: `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `LIVEKIT_URL` (wss://...)

## Fixture-synk
- `/api/fixtures/sync` (POST) – hämtar kommande matcher från football-data.org för PL, PD, BL1, SA, FL1
- Matchar lagnamn mot DB med normalisering (accenter, case, symboler borttagna)
- Varje match ger en fixture-rad per lag (home_team + away_team som text)
- Kör dagligen 06:00 UTC via Vercel cron
- Manuell trigger: besök `/api/fixtures/sync` i webbläsaren (GET)

## Matchforum-logik
1. Vercel cron kör `/api/match-forum` var 5:e minut
2. Om fixture.status = 'live' → aktivera matchforum, lås vanliga forumet
3. Om fixture.status = 'finished' → stäng matchforum, sätt cleanup_at = nu + 12h
4. cleanup_at passerad → radera match_forum_posts, status = 'cleaned'

## Alias-system
- `default_alias` på profiles = standard-alias (väljs vid registrering)
- `user_aliases` = per-forum alias + valt märke
- Alias visas som namn, riktigt username visas i grå lapp bredvid

## Admin
- `/admin` – kräver role = 'admin' eller 'moderator' i profiles
- Flikar: Användare, Inlägg, Mod-logg, Spärrade
- Sätt admin: `UPDATE profiles SET role = 'admin' WHERE username = 'namn';`

## Miljövariabler (.env.local)
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
LIVEKIT_API_KEY=
LIVEKIT_API_SECRET=
LIVEKIT_URL=                    # wss://ditt-projekt.livekit.cloud
API_FOOTBALL_KEY=
FOOTBALL_DATA_KEY=
CRON_SECRET=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Kända issues och lösningar
- **"relation profiles does not exist"** – triggern måste ha `SET search_path = public`
- **supabase.ts build error** – `next/headers` får inte importeras i klient-kod, använd `supabase.server.ts`
- **Email not confirmed** – stäng av i Supabase Auth Settings, eller bekräfta via länk
- **voice_sessions INSERT blockeras** – använd `createServiceClient()` i route handler (kringgår RLS)
- **Fixtures visas inte** – kör migration `006` och anropa `/api/fixtures/sync` manuellt

## Appens nuvarande status
- ✅ Auth: registrering, inloggning, utloggning, glömt lösenord, e-postbekräftelse
- ✅ Forum: inlägg, kommentarer, likes, sökning med highlight, tagfilter, datumfilter
- ✅ Realtime: live-inlägg, typing indicator, presence/online-räknare
- ✅ Emoji-reaktioner: 8 emojis (🔥😂😤👏💔🎯😊💯)
- ✅ Prenumerationer: startsida + sidebar + mina-forum-sida
- ✅ Alias: standard-alias vid registrering, per-forum alias med märken
- ✅ Forum-märken: 13 märken (brons/silver/guld/legend), intjänas via aktivitet, visas på inlägg
- ✅ Globala märken: profilsidans märken baserade på total aktivitet
- ✅ Matchforum: live-chatt under match, lås vanliga forumet, cleanup efter 12h
- ✅ Röstkanal: LiveKit WebRTC, avatarer, FA-ikoner, participant-tracking
- ✅ Matchstatistik: live-score, events, statistikbars
- ✅ Fixture-synk: kommande matcher från football-data.org (daglig cron)
- ✅ Lagsida: nästa match, artiklar (med redigering för admin), forum-statistik
- ✅ Profilsida: publik + privat, forum-lista i aside
- ✅ Ändra lösenord: collapsible sektion på Min sida
- ✅ Admin-panel: användare, inlägg, mod-logg, spärrar
- ✅ Mobilvy: bottom navigation, safe-area, PWA
- ✅ Välkomstsida efter registrering
- 🔲 Push-notifikationer
- 🔲 Transferfönster-tracker
- 🔲 Hockey-ligor
