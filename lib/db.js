import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Add connection timeout and retry settings
  connectionTimeoutMillis: 10000,
  query_timeout: 30000,
});

export async function query(text, params) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  console.log('Executed query', { text, duration, rows: res.rowCount });
  return res;
}

export async function initDB() {
  // Create slots table
  await query(`
    CREATE TABLE IF NOT EXISTS slots (
      id SERIAL PRIMARY KEY,
      date_str VARCHAR(20) NOT NULL,
      time_str VARCHAR(10) NOT NULL,
      date_iso DATE,
      time_iso TIME,
      obmocje INTEGER,
      town VARCHAR(100),
      exam_type VARCHAR(20),
      places_left INTEGER,
      tolmac BOOLEAN DEFAULT FALSE,
      categories VARCHAR(100) NOT NULL,
      source_page INTEGER,
      location VARCHAR(200),
      available BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      last_seen_at TIMESTAMP,
      UNIQUE(date_str, time_str, obmocje, town, categories)
    );
  `);

  // Create indexes
  await query(`CREATE INDEX IF NOT EXISTS idx_slots_date_iso ON slots(date_iso);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_slots_available ON slots(available);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_slots_obmocje ON slots(obmocje);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_slots_exam_type ON slots(exam_type);`);

  // Create scrape_meta table
  await query(`
    CREATE TABLE IF NOT EXISTS scrape_meta (
      id INTEGER PRIMARY KEY DEFAULT 1,
      last_scraped_at TIMESTAMP DEFAULT NOW(),
      CHECK (id = 1)
    );
  `);

  // Insert initial scrape_meta record if not exists
  await query(`
    INSERT INTO scrape_meta (id, last_scraped_at) 
    VALUES (1, NOW()) 
    ON CONFLICT (id) DO NOTHING;
  `);

  // Create subscriptions table
  await query(`
    CREATE TABLE IF NOT EXISTS subscriptions (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) NOT NULL,
      filter_obmocje INTEGER,
      filter_town VARCHAR(100),
      filter_exam_type VARCHAR(20),
      filter_tolmac BOOLEAN,
      filter_categories VARCHAR(100),
      active BOOLEAN DEFAULT TRUE,
      unsubscribe_token VARCHAR(100) UNIQUE NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      last_notified_at TIMESTAMP
    );
  `);

  await query(`CREATE INDEX IF NOT EXISTS idx_subscriptions_active ON subscriptions(active);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_subscriptions_email ON subscriptions(email);`);

  // Create exam questions table
  await query(`
    CREATE TABLE IF NOT EXISTS exam_questions (
      id SERIAL PRIMARY KEY,
      question_text TEXT NOT NULL,
      answer_a TEXT NOT NULL,
      answer_b TEXT NOT NULL,
      answer_c TEXT NOT NULL,
      answer_d TEXT NOT NULL,
      correct_answers VARCHAR(10) NOT NULL,
      exam_type VARCHAR(20),
      category VARCHAR(50),
      submitted_by VARCHAR(255),
      created_at TIMESTAMP DEFAULT NOW(),
      likes_count INTEGER DEFAULT 0,
      dislikes_count INTEGER DEFAULT 0
    );
  `);

  await query(`CREATE INDEX IF NOT EXISTS idx_questions_likes ON exam_questions(likes_count DESC);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_questions_exam_type ON exam_questions(exam_type);`);

  // Create question votes table
  await query(`
    CREATE TABLE IF NOT EXISTS question_votes (
      id SERIAL PRIMARY KEY,
      question_id INTEGER REFERENCES exam_questions(id) ON DELETE CASCADE,
      voter_ip VARCHAR(50) NOT NULL,
      vote_type VARCHAR(10) NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(question_id, voter_ip)
    );
  `);

  await query(`CREATE INDEX IF NOT EXISTS idx_votes_question ON question_votes(question_id);`);

  // Create admin_users table
  await query(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(100) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await query(`
    INSERT INTO admin_users (username, password_hash)
    VALUES ('admin', '$2b$10$3tai7U8YCc6yv0qDxJ3Oi.XON/SZ4szCzK77m8d050/v5Fm48SejG')
    ON CONFLICT (username) DO NOTHING;
  `);

  console.log('Database initialized successfully');
}

export default pool;