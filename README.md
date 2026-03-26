# Matchpuls – Komplett installationsguide

Följ dessa steg i ordning. Hela processen tar ca 30 minuter.

---

## Steg 1 – Packa upp och installera

```bash
# Packa upp zip-filen
unzip matchpuls-final.zip
cd matchpuls-final

# Installera alla paket (tar 1–2 minuter)
npm install
```

---

## Steg 2 – Skapa Supabase-projekt (gratis)

1. Gå till **https://supabase.com** och logga in / skapa konto
2. Klicka **New project**
3. Välj ett namn, t.ex. `matchpuls`, och ett starkt databas-lösenord – **spara det!**
4. Välj region: **EU West (Ireland)** eller närmaste
5. Vänta ca 2 minuter tills projektet är klart

### Hämta nycklar:
1. Klicka på **Settings** (kugghjulet) i vänstermenyn
2. Klicka på **API**
3. Kopiera dessa tre värden:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon / public** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** (klicka "Reveal") → `SUPABASE_SERVICE_ROLE_KEY`

---

## Steg 3 – Konfigurera miljövariabler

```bash
# Kopiera exempelfilen
cp .env.local.example .env.local

# Öppna .env.local i din editor och fyll i:
#   NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
#   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
#   SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

De andra variablerna (Daily.co, API-Football) kan du lägga till senare.

---

## Steg 4 – Skapa databasen

1. I Supabase Dashboard, klicka på **SQL Editor** i vänstermenyn
2. Klicka på **New query**
3. Öppna filen `supabase/migrations/001_schema.sql` från din dator
4. Kopiera **hela** innehållet och klistra in i SQL Editor
5. Klicka **Run** (eller Ctrl+Enter)
6. Du ska se: `Success. No rows returned` — det är korrekt!

---

## Steg 5 – Lägg till lag i databasen

I SQL Editor, kör detta för att lägga till några testlag:

```sql
-- AIK i Allsvenskan
WITH lg AS (SELECT id FROM leagues WHERE slug = 'allsvenskan')
INSERT INTO teams (league_id, name, short_name, color, slug)
SELECT lg.id, 'AIK', 'AIK', '#000000', 'aik' FROM lg;

-- Arsenal i Premier League
WITH lg AS (SELECT id FROM leagues WHERE slug = 'premier-league')
INSERT INTO teams (league_id, name, short_name, color, slug)
SELECT lg.id, 'Arsenal', 'ARS', '#EF0107', 'arsenal' FROM lg;

-- IFK Göteborg i Allsvenskan
WITH lg AS (SELECT id FROM leagues WHERE slug = 'allsvenskan')
INSERT INTO teams (league_id, name, short_name, color, slug)
SELECT lg.id, 'IFK Göteborg', 'IFK', '#003399', 'ifk-goteborg' FROM lg;

-- Skapa forum för varje lag (kör efter ovanstående)
INSERT INTO forums (team_id)
SELECT id FROM teams
WHERE slug IN ('aik', 'arsenal', 'ifk-goteborg')
ON CONFLICT DO NOTHING;
```

---

## Steg 6 – Starta appen lokalt

```bash
npm run dev
```

Öppna **http://localhost:3000** i din webbläsare.

Skapa ett konto via "Skapa konto" — välj ett användarnamn och alias.

---

## Steg 7 – Sätt dig som admin

1. Skapa ett konto i appen
2. Gå till Supabase → SQL Editor och kör:

```sql
UPDATE profiles
SET role = 'admin'
WHERE username = 'DITT_ANVÄNDARNAMN';
```

3. Logga ut och in igen i appen
4. Adminpanelen finns nu på **/admin**

---

## Steg 8 – Konfigurera Daily.co (Röstchatt)

*Gratis-tier: 500 minuter/månad – räcker länge för testning*

1. Gå till **https://dashboard.daily.co** och skapa ett konto
2. Klicka på **Developers** → **API Keys**
3. Kopiera din API-nyckel
4. Ditt subdomain är det som visas i URL:en, t.ex. `dittnamn.daily.co`
5. Lägg till i `.env.local`:
   ```
   DAILY_API_KEY=din_nyckel_här
   NEXT_PUBLIC_DAILY_DOMAIN=dittnamn.daily.co
   ```
6. Starta om servern: Ctrl+C och `npm run dev`

---

## Steg 9 – Konfigurera API-Football (Matchstatistik)

*Gratis-tier: 100 anrop/dag*

1. Gå till **https://rapidapi.com** och skapa ett konto
2. Sök efter **API-Football** och klicka Subscribe (välj Basic / Free)
3. Gå till API → **Endpoints** → kopiera din `X-RapidAPI-Key`
4. Lägg till i `.env.local`:
   ```
   API_FOOTBALL_KEY=din_nyckel_här
   ```
5. Starta om servern

---

## Steg 10 – Deploya till Vercel (publicera online)

```bash
# Installera Vercel CLI (en gång)
npm install -g vercel

# Logga in på Vercel
vercel login

# Deploya (första gången)
vercel

# Följ guiden:
#   Set up and deploy? → Y
#   Which scope? → välj ditt konto
#   Link to existing project? → N
#   Project name → matchpuls
#   In which directory? → . (punkt = nuvarande mapp)
#   Override settings? → N
```

### Lägg till miljövariabler på Vercel:
1. Gå till **https://vercel.com** → ditt projekt → **Settings** → **Environment Variables**
2. Lägg till exakt samma variabler som i din `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `DAILY_API_KEY` (om du konfigurerat det)
   - `NEXT_PUBLIC_DAILY_DOMAIN` (om du konfigurerat det)
   - `API_FOOTBALL_KEY` (om du konfigurerat det)
   - `CRON_SECRET` (generera med: `openssl rand -base64 32`)
   - `NEXT_PUBLIC_APP_URL` = din Vercel-URL, t.ex. `https://matchpuls.vercel.app`

3. Klicka **Redeploy** efter att du lagt till variablerna

---

## Steg 11 – Konfigurera Supabase för din Vercel-URL

1. I Supabase → **Authentication** → **URL Configuration**
2. **Site URL**: din Vercel-URL, t.ex. `https://matchpuls.vercel.app`
3. **Redirect URLs**: lägg till `https://matchpuls.vercel.app/**`
4. Spara

---

## Steg 12 – Lägg till matchforum-trigger (valfritt)

Lägg till en testmatch och testa matchforumet:

```sql
-- Lägg till en testmatch (ändra team_id till AIK:s id)
INSERT INTO fixtures (team_id, home_team, away_team, kickoff_at, competition, status)
SELECT t.id, 'AIK', 'Djurgårdens IF', NOW() + INTERVAL '1 hour', 'Allsvenskan', 'scheduled'
FROM teams t WHERE t.slug = 'aik';

-- För att testa matchforumet, sätt statusen till 'live':
UPDATE fixtures SET status = 'live', minute = 1
WHERE home_team = 'AIK';

-- Se att matchforumet skapas automatiskt via cron (eller testa manuellt):
-- GET http://localhost:3000/api/match-forum?forumId=FORUM_ID
```

---

## Felsökning

**"Cannot find module" vid npm run dev**
→ Kör `npm install` igen

**"Invalid API key" från Supabase**
→ Kontrollera att du kopierade rätt nyckel från Settings → API

**Sidan laddas men visar ingenting**
→ Öppna webbläsarens konsol (F12) och titta efter fel

**Röstchatten fungerar inte**
→ Kontrollera att DAILY_API_KEY och NEXT_PUBLIC_DAILY_DOMAIN är rätt i .env.local

**Kan inte logga in efter deploy till Vercel**
→ Kontrollera att Site URL och Redirect URLs är konfigurerade i Supabase Authentication

---

## Projektstruktur

```
matchpuls-final/
├── src/
│   ├── app/                          ← Next.js sidor
│   │   ├── page.tsx                  ← Startsida
│   │   ├── layout.tsx                ← Gemensam layout (navbar, sidebar)
│   │   ├── globals.css               ← Global CSS + Tailwind
│   │   ├── auth/login/               ← Inloggningssida
│   │   ├── auth/register/            ← Registreringssida (med alias-val)
│   │   ├── auth/logout/              ← Utloggning
│   │   ├── forum/[leagueSlug]/[teamSlug]/  ← Forumssida per lag
│   │   ├── profile/                  ← Min sida
│   │   ├── mina-forum/               ← Mina prenumerationer (mobil)
│   │   ├── admin/                    ← Adminpanel
│   │   └── api/                      ← API-endpoints
│   │       ├── voice/room/           ← Daily.co rumskapande
│   │       ├── match-forum/          ← Cron: aktivera/stäng matchforum
│   │       ├── stats/                ← API-Football proxy
│   │       └── subscribe/            ← Prenumerera/avprenumerera
│   ├── components/
│   │   ├── layout/                   ← Navbar, Sidebar, MobileBottomNav
│   │   ├── forum/                    ← ForumFeed, PostCard, CommentThread...
│   │   ├── auth/                     ← Login/Register-formulär
│   │   ├── voice/                    ← VoiceChat (WebRTC)
│   │   ├── reactions/                ← EmojiReactions
│   │   ├── match-forum/              ← MatchForumChat
│   │   ├── stats/                    ← MatchStatsWidget
│   │   └── ui/                       ← OnlinePlupp, UserMenu
│   ├── hooks/                        ← useForumRealtime, useSearch
│   ├── lib/                          ← supabase.ts, utils.ts
│   └── types/                        ← TypeScript-typer
├── supabase/
│   └── migrations/001_schema.sql     ← Hela databasen
├── public/
│   └── manifest.json                 ← PWA-konfiguration
├── .env.local.example                ← Mall för miljövariabler
├── vercel.json                       ← Cron-konfiguration
└── README.md                         ← Denna fil
```
