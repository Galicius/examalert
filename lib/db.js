import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
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

  console.log('Database initialized successfully');
}

export default pool;