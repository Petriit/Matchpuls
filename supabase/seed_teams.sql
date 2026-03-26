-- ============================================================
-- STEG 1: Lägg till badge-kolumn i profiles
-- ============================================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS badge text DEFAULT NULL;

-- ============================================================
-- STEG 2: Lag + Forum för alla toppligor
-- Kör hela detta block i Supabase SQL-editorn
-- ============================================================
DO $$
DECLARE
  pl_id   uuid;
  ll_id   uuid;
  bl_id   uuid;
  sa_id   uuid;
  l1_id   uuid;
  sv_id   uuid;
BEGIN
  SELECT id INTO pl_id FROM leagues WHERE slug = 'premier-league';
  SELECT id INTO ll_id FROM leagues WHERE slug = 'la-liga';
  SELECT id INTO bl_id FROM leagues WHERE slug = 'bundesliga';
  SELECT id INTO sa_id FROM leagues WHERE slug = 'serie-a';
  SELECT id INTO l1_id FROM leagues WHERE slug = 'ligue-1';
  SELECT id INTO sv_id FROM leagues WHERE slug = 'allsvenskan';

  -- ── PREMIER LEAGUE ──────────────────────────────────────────
  INSERT INTO teams (league_id, name, short_name, color, slug) VALUES
    (pl_id, 'Arsenal',                  'ARS', '#EF0107', 'arsenal'),
    (pl_id, 'Aston Villa',              'AVL', '#95BFE5', 'aston-villa'),
    (pl_id, 'Bournemouth',              'BOU', '#DA291C', 'bournemouth'),
    (pl_id, 'Brentford',               'BRE', '#E30613', 'brentford'),
    (pl_id, 'Brighton & Hove Albion',  'BHA', '#0057B8', 'brighton'),
    (pl_id, 'Chelsea',                 'CHE', '#034694', 'chelsea'),
    (pl_id, 'Crystal Palace',          'CRY', '#1B458F', 'crystal-palace'),
    (pl_id, 'Everton',                 'EVE', '#003399', 'everton'),
    (pl_id, 'Fulham',                  'FUL', '#CC0000', 'fulham'),
    (pl_id, 'Liverpool',               'LIV', '#C8102E', 'liverpool'),
    (pl_id, 'Luton Town',              'LUT', '#F78F1E', 'luton-town'),
    (pl_id, 'Manchester City',         'MCI', '#6CABDD', 'manchester-city'),
    (pl_id, 'Manchester United',       'MUN', '#DA291C', 'manchester-united'),
    (pl_id, 'Newcastle United',        'NEW', '#241F20', 'newcastle-united'),
    (pl_id, 'Nottingham Forest',       'NFO', '#DD0000', 'nottingham-forest'),
    (pl_id, 'Sheffield United',        'SHU', '#EE2737', 'sheffield-united'),
    (pl_id, 'Tottenham Hotspur',       'TOT', '#132257', 'tottenham'),
    (pl_id, 'West Ham United',         'WHU', '#7A263A', 'west-ham'),
    (pl_id, 'Wolverhampton Wanderers', 'WOL', '#FDB913', 'wolverhampton'),
    (pl_id, 'Burnley',                 'BUR', '#6C1D45', 'burnley')
  ON CONFLICT (slug) DO NOTHING;

  -- ── LA LIGA ─────────────────────────────────────────────────
  INSERT INTO teams (league_id, name, short_name, color, slug) VALUES
    (ll_id, 'Real Madrid',       'RMA', '#FFFFFF', 'real-madrid'),
    (ll_id, 'Barcelona',         'BAR', '#A50044', 'barcelona'),
    (ll_id, 'Atlético Madrid',   'ATM', '#CC0000', 'atletico-madrid'),
    (ll_id, 'Sevilla',           'SEV', '#D71920', 'sevilla'),
    (ll_id, 'Real Sociedad',     'RSO', '#0066B2', 'real-sociedad'),
    (ll_id, 'Real Betis',        'BET', '#00954C', 'real-betis'),
    (ll_id, 'Villarreal',        'VIL', '#FFD700', 'villarreal'),
    (ll_id, 'Valencia',          'VAL', '#FF7F00', 'valencia'),
    (ll_id, 'Athletic Bilbao',   'ATH', '#EE2523', 'athletic-bilbao'),
    (ll_id, 'Celta Vigo',        'CEL', '#75AADB', 'celta-vigo'),
    (ll_id, 'Getafe',            'GET', '#265AA5', 'getafe'),
    (ll_id, 'Osasuna',           'OSA', '#D81E27', 'osasuna'),
    (ll_id, 'Mallorca',          'MAL', '#E72428', 'mallorca'),
    (ll_id, 'Rayo Vallecano',    'RAY', '#CC0000', 'rayo-vallecano'),
    (ll_id, 'Girona',            'GIR', '#CC0000', 'girona'),
    (ll_id, 'Almería',           'ALM', '#D62A30', 'almeria'),
    (ll_id, 'Granada',           'GRA', '#BA000D', 'granada'),
    (ll_id, 'Las Palmas',        'LPA', '#FFDA00', 'las-palmas'),
    (ll_id, 'Cádiz',             'CAD', '#FFCC00', 'cadiz'),
    (ll_id, 'Alavés',            'ALA', '#0033A0', 'alaves')
  ON CONFLICT (slug) DO NOTHING;

  -- ── BUNDESLIGA ──────────────────────────────────────────────
  INSERT INTO teams (league_id, name, short_name, color, slug) VALUES
    (bl_id, 'Bayern Munich',               'BAY', '#DC052D', 'bayern-munich'),
    (bl_id, 'Borussia Dortmund',           'BVB', '#FDE100', 'borussia-dortmund'),
    (bl_id, 'RB Leipzig',                  'RBL', '#DD0741', 'rb-leipzig'),
    (bl_id, 'Bayer Leverkusen',            'B04', '#E32221', 'bayer-leverkusen'),
    (bl_id, 'Union Berlin',                'FCU', '#EB1923', 'union-berlin'),
    (bl_id, 'Eintracht Frankfurt',         'SGE', '#E1000F', 'eintracht-frankfurt'),
    (bl_id, 'Freiburg',                    'SCF', '#CC0033', 'freiburg'),
    (bl_id, 'Wolfsburg',                   'WOB', '#65B32E', 'wolfsburg'),
    (bl_id, 'Borussia Mönchengladbach',    'BMG', '#1C5CAB', 'borussia-monchengladbach'),
    (bl_id, 'Mainz',                       'M05', '#C3082F', 'mainz'),
    (bl_id, 'Augsburg',                    'FCA', '#BA3733', 'augsburg'),
    (bl_id, 'Hoffenheim',                  'TSG', '#1463B1', 'hoffenheim'),
    (bl_id, 'Stuttgart',                   'VFB', '#E32219', 'stuttgart'),
    (bl_id, 'Werder Bremen',               'SVW', '#1D9053', 'werder-bremen'),
    (bl_id, 'Bochum',                      'BOC', '#005CA9', 'bochum'),
    (bl_id, 'Heidenheim',                  'HDH', '#CC0000', 'heidenheim'),
    (bl_id, 'Darmstadt',                   'D98', '#003F7C', 'darmstadt'),
    (bl_id, 'Köln',                        'KOE', '#FC4F00', 'koln')
  ON CONFLICT (slug) DO NOTHING;

  -- ── SERIE A ─────────────────────────────────────────────────
  INSERT INTO teams (league_id, name, short_name, color, slug) VALUES
    (sa_id, 'Juventus',      'JUV', '#1A1A1A', 'juventus'),
    (sa_id, 'Inter Milan',   'INT', '#010E80', 'inter-milan'),
    (sa_id, 'AC Milan',      'MIL', '#FB090B', 'ac-milan'),
    (sa_id, 'Napoli',        'NAP', '#12A0D7', 'napoli'),
    (sa_id, 'Roma',          'ROM', '#8E1F2F', 'roma'),
    (sa_id, 'Lazio',         'LAZ', '#87D8F7', 'lazio'),
    (sa_id, 'Atalanta',      'ATA', '#1E73BE', 'atalanta'),
    (sa_id, 'Fiorentina',    'FIO', '#56267E', 'fiorentina'),
    (sa_id, 'Bologna',       'BOL', '#CC0000', 'bologna'),
    (sa_id, 'Torino',        'TOR', '#8B1A1A', 'torino'),
    (sa_id, 'Genoa',         'GEN', '#CC0000', 'genoa'),
    (sa_id, 'Udinese',       'UDI', '#1A1A1A', 'udinese'),
    (sa_id, 'Sassuolo',      'SAS', '#00774A', 'sassuolo'),
    (sa_id, 'Empoli',        'EMP', '#0068A8', 'empoli'),
    (sa_id, 'Lecce',         'LEC', '#FFD700', 'lecce'),
    (sa_id, 'Cagliari',      'CAG', '#C41230', 'cagliari'),
    (sa_id, 'Verona',        'VER', '#0033A0', 'verona'),
    (sa_id, 'Frosinone',     'FRO', '#FFD700', 'frosinone'),
    (sa_id, 'Salernitana',   'SAL', '#8B0000', 'salernitana'),
    (sa_id, 'Monza',         'MON', '#CC0000', 'monza')
  ON CONFLICT (slug) DO NOTHING;

  -- ── LIGUE 1 ─────────────────────────────────────────────────
  INSERT INTO teams (league_id, name, short_name, color, slug) VALUES
    (l1_id, 'Paris Saint-Germain', 'PSG', '#004170', 'psg'),
    (l1_id, 'Marseille',           'OM',  '#009BDE', 'marseille'),
    (l1_id, 'Lyon',                'OL',  '#B6230A', 'lyon'),
    (l1_id, 'Monaco',              'ASM', '#CC0000', 'monaco'),
    (l1_id, 'Lille',               'LIL', '#AA0029', 'lille'),
    (l1_id, 'Rennes',              'REN', '#CC0000', 'rennes'),
    (l1_id, 'Nice',                'OGC', '#C6000B', 'nice'),
    (l1_id, 'Lens',                'RCL', '#E1B519', 'lens'),
    (l1_id, 'Strasbourg',          'RCS', '#005CA9', 'strasbourg'),
    (l1_id, 'Nantes',              'FCN', '#F8D54A', 'nantes'),
    (l1_id, 'Montpellier',         'MHC', '#F48024', 'montpellier'),
    (l1_id, 'Toulouse',            'TFC', '#7B2D8B', 'toulouse'),
    (l1_id, 'Reims',               'SDR', '#CC0000', 'reims'),
    (l1_id, 'Clermont Foot',       'CF63','#D31417', 'clermont'),
    (l1_id, 'Metz',                'FC57','#78015B', 'metz'),
    (l1_id, 'Le Havre',            'HAC', '#0065A3', 'le-havre'),
    (l1_id, 'Brest',               'SB29','#D20A11', 'brest'),
    (l1_id, 'Lorient',             'FCL', '#E87722', 'lorient')
  ON CONFLICT (slug) DO NOTHING;

  -- ── ALLSVENSKAN ─────────────────────────────────────────────
  INSERT INTO teams (league_id, name, short_name, color, slug) VALUES
    (sv_id, 'AIK',              'AIK', '#000000', 'aik'),
    (sv_id, 'Djurgården',       'DIF', '#005B9A', 'djurgarden'),
    (sv_id, 'Hammarby',         'HIF', '#29591A', 'hammarby'),
    (sv_id, 'Malmö FF',         'MFF', '#00529F', 'malmo-ff'),
    (sv_id, 'IFK Göteborg',     'IFK', '#003F7C', 'ifk-goteborg'),
    (sv_id, 'IFK Norrköping',   'NOR', '#0057A8', 'ifk-norrkoping'),
    (sv_id, 'BK Häcken',        'HCK', '#FFD700', 'bk-hacken'),
    (sv_id, 'IF Elfsborg',      'IFE', '#FFD700', 'if-elfsborg'),
    (sv_id, 'Kalmar FF',        'KFF', '#DA291C', 'kalmar-ff'),
    (sv_id, 'Degerfors IF',     'DEG', '#CC0000', 'degerfors'),
    (sv_id, 'Halmstads BK',     'HBK', '#0057A8', 'halmstads-bk'),
    (sv_id, 'Mjällby AIF',      'MJA', '#0066CC', 'mjallby'),
    (sv_id, 'IK Sirius',        'IKS', '#002060', 'ik-sirius'),
    (sv_id, 'Varbergs BoIS',    'VBO', '#FFD700', 'varbergs-bois'),
    (sv_id, 'Värnamo',          'IFV', '#FFD700', 'varnamo'),
    (sv_id, 'Brommapojkarna',   'BPK', '#0047BB', 'brommapojkarna')
  ON CONFLICT (slug) DO NOTHING;

  -- ── SKAPA FORUM FÖR ALLA LAG SOM SAKNAR ETT ─────────────────
  INSERT INTO forums (team_id)
  SELECT t.id FROM teams t
  LEFT JOIN forums f ON f.team_id = t.id
  WHERE f.id IS NULL;

END $$;
