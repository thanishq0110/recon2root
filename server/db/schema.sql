CREATE TABLE IF NOT EXISTS admin (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS winners (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  rank INTEGER UNIQUE NOT NULL CHECK(rank IN (1, 2, 3)),
  team_name TEXT NOT NULL,
  members TEXT NOT NULL,
  score TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS photos (
  id TEXT PRIMARY KEY,
  filename TEXT NOT NULL,
  original_name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS videos (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('upload', 'youtube')),
  source TEXT NOT NULL,
  thumbnail TEXT,
  uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS certificates (
  id TEXT PRIMARY KEY,
  participant_name TEXT NOT NULL,
  participant_name_lower TEXT NOT NULL,
  filename TEXT NOT NULL,
  downloaded_count INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_certificates_name ON certificates(participant_name_lower);

CREATE TABLE IF NOT EXISTS organizers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  photo TEXT,
  is_faculty INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  linkedin TEXT,
  github TEXT,
  twitter TEXT,
  instagram TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS content (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO content (key, value) VALUES
  ('hero_tagline', 'From Reconnaissance to Root — You Made It.'),
  ('hero_subtitle', 'Thank you to all 1000+ participants who made Recon2Root an unforgettable experience.'),
  ('about_text', 'Recon2Root was a hands-on Capture The Flag competition organized by GDG On Campus MRCET on February 13, 2026. Participants tackled 20 real-world cybersecurity challenges spanning Web Hacking, Cryptography, Digital Forensics, OSINT, and Reverse Engineering. The event brought together over 1000 students in a competitive yet collaborative atmosphere, pushing their technical thinking to the limit.'),
  ('event_date', 'February 13, 2026'),
  ('event_venue', 'MRCET Campus, Hyderabad'),
  ('total_participants', '1000+'),
  ('total_challenges', '20'),
  ('instagram_url', 'https://instagram.com/gdgoncampusmrcet'),
  ('linkedin_url', 'https://linkedin.com/company/gdgoncampusmrcet');

