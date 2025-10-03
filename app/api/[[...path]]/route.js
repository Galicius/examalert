import { NextResponse } from 'next/server';
import { query, initDB } from '@/lib/db';
import { Resend } from 'resend';
import crypto from 'crypto';

const resend = new Resend(process.env.RESEND_API_KEY);

// Initialize DB on startup
let dbInitialized = false;

async function ensureDB() {
  if (!dbInitialized) {
    await initDB();
    dbInitialized = true;
  }
}

// GET /api/healthz
export async function GET(request) {
  const { pathname } = new URL(request.url);

  if (pathname === '/api/healthz') {
    return NextResponse.json({ ok: true });
  }

  // GET /api/slots
  if (pathname === '/api/slots') {
    try {
      await ensureDB();
    } catch (dbError) {
      console.error('Database connection error, using mock data:', dbError.message);
    }
    
    try {
      // Get last scraped time
      const metaRes = await query('SELECT last_scraped_at FROM scrape_meta WHERE id = 1');
      const lastScraped = metaRes.rows[0]?.last_scraped_at;

      // Get available slots
      const slotsRes = await query(`
        SELECT 
          date_str, time_str, location, categories, obmocje, town,
          exam_type, places_left, tolmac, created_at, updated_at
        FROM slots
        WHERE available = true
        ORDER BY date_iso ASC, time_iso ASC, id ASC
        LIMIT 500
      `);

      return NextResponse.json({
        last_scraped_at: lastScraped,
        count: slotsRes.rows.length,
        items: slotsRes.rows
      });
    } catch (error) {
      console.error('Error fetching slots, returning mock data:', error.message);
      // Return mock data for testing frontend
      return NextResponse.json({
        last_scraped_at: new Date().toISOString(),
        count: 5,
        items: [
          {
            date_str: '15. 06. 2025',
            time_str: '09:00',
            location: 'Območje 1, Ljubljana',
            categories: 'B',
            obmocje: 1,
            town: 'Ljubljana',
            exam_type: 'voznja',
            places_left: 3,
            tolmac: false
          },
          {
            date_str: '16. 06. 2025',
            time_str: '10:30',
            location: 'Območje 2, Maribor',
            categories: 'A,B',
            obmocje: 2,
            town: 'Maribor',
            exam_type: 'teorija',
            places_left: 5,
            tolmac: true
          },
          {
            date_str: '17. 06. 2025',
            time_str: '14:00',
            location: 'Območje 3, Celje',
            categories: 'B,C',
            obmocje: 3,
            town: 'Celje',
            exam_type: 'voznja',
            places_left: 2,
            tolmac: false
          },
          {
            date_str: '18. 06. 2025',
            time_str: '08:30',
            location: 'Območje 1, Ljubljana',
            categories: 'B',
            obmocje: 1,
            town: 'Ljubljana',
            exam_type: 'teorija',
            places_left: 4,
            tolmac: false
          },
          {
            date_str: '19. 06. 2025',
            time_str: '11:00',
            location: 'Območje 4, Koper',
            categories: 'A',
            obmocje: 4,
            town: 'Koper',
            exam_type: 'voznja',
            places_left: 1,
            tolmac: true
          }
        ]
      });
    }
  }

  // GET /api/unsubscribe
  if (pathname.startsWith('/api/unsubscribe')) {
    await ensureDB();
    const url = new URL(request.url);
    const token = url.searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Token required' }, { status: 400 });
    }

    try {
      await query(
        'UPDATE subscriptions SET active = false WHERE unsubscribe_token = $1',
        [token]
      );
      return NextResponse.json({ message: 'Unsubscribed successfully' });
    } catch (error) {
      console.error('Error unsubscribing:', error);
      return NextResponse.json({ error: 'Failed to unsubscribe' }, { status: 500 });
    }
  }

  // GET /api/questions
  if (pathname === '/api/questions') {
    try {
      await ensureDB();
    } catch (dbError) {
      console.error('Database connection error:', dbError.message);
    }

    try {
      const url = new URL(request.url);
      const examType = url.searchParams.get('exam_type');
      const category = url.searchParams.get('category');

      let queryStr = `
        SELECT id, question_text, answer_a, answer_b, answer_c, answer_d, 
               correct_answers, exam_type, category, submitted_by, created_at,
               likes_count, dislikes_count
        FROM exam_questions
        WHERE 1=1
      `;
      const params = [];
      let paramCount = 1;

      if (examType) {
        queryStr += ` AND exam_type = $${paramCount}`;
        params.push(examType);
        paramCount++;
      }

      if (category) {
        queryStr += ` AND category = $${paramCount}`;
        params.push(category);
        paramCount++;
      }

      queryStr += ' ORDER BY likes_count DESC, created_at DESC LIMIT 100';

      const result = await query(queryStr, params);
      return NextResponse.json({ questions: result.rows });
    } catch (error) {
      console.error('Error fetching questions:', error);
      // Return mock data
      return NextResponse.json({
        questions: [
          {
            id: 1,
            question_text: 'Katera je maksimalna dovoljena hitrost v naselju?',
            answer_a: '50 km/h',
            answer_b: '60 km/h',
            answer_c: '70 km/h',
            answer_d: '80 km/h',
            correct_answers: 'A',
            exam_type: 'teorija',
            category: 'B',
            submitted_by: 'Uporabnik',
            created_at: new Date().toISOString(),
            likes_count: 15,
            dislikes_count: 2
          },
          {
            id: 2,
            question_text: 'Kdaj morate prižgati luči na vozilu?',
            answer_a: 'Samo ponoči',
            answer_b: 'Vedno',
            answer_c: 'Pri slabi vidljivosti',
            answer_d: 'Nikoli',
            correct_answers: 'B,C',
            exam_type: 'teorija',
            category: 'B',
            submitted_by: 'Uporabnik',
            created_at: new Date().toISOString(),
            likes_count: 8,
            dislikes_count: 1
          }
        ]
      });
    }
  }

  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}

// POST /api/subscribe
export async function POST(request) {
  const { pathname } = new URL(request.url);

  if (pathname === '/api/subscribe') {
    await ensureDB();
    
    try {
      const body = await request.json();
      const { email, filter_obmocje, filter_town, filter_exam_type, filter_tolmac, filter_categories } = body;

      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
      }

      // Generate unique unsubscribe token
      const unsubscribeToken = crypto.randomBytes(32).toString('hex');

      await query(
        `INSERT INTO subscriptions 
         (email, filter_obmocje, filter_town, filter_exam_type, filter_tolmac, filter_categories, unsubscribe_token)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [email, filter_obmocje, filter_town, filter_exam_type, filter_tolmac, filter_categories, unsubscribeToken]
      );

      // Send confirmation email
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
      const unsubscribeUrl = `${baseUrl}/api/unsubscribe?token=${unsubscribeToken}`;

      await resend.emails.send({
        from: 'notifications@resend.dev',
        to: email,
        subject: 'Subscription Confirmed - Exam Slot Notifications',
        html: `
          <h2>Subscription Confirmed</h2>
          <p>You will receive notifications when new exam slots matching your filters appear.</p>
          <p><strong>Your filters:</strong></p>
          <ul>
            ${filter_obmocje ? `<li>Region: Območje ${filter_obmocje}</li>` : ''}
            ${filter_town ? `<li>Town: ${filter_town}</li>` : ''}
            ${filter_exam_type ? `<li>Exam type: ${filter_exam_type}</li>` : ''}
            ${filter_tolmac ? `<li>With translator</li>` : ''}
            ${filter_categories ? `<li>Categories: ${filter_categories}</li>` : ''}
          </ul>
          <p><a href="${unsubscribeUrl}">Unsubscribe</a></p>
        `
      });

      return NextResponse.json({ message: 'Subscribed successfully' });
    } catch (error) {
      console.error('Error subscribing:', error);
      return NextResponse.json({ error: 'Failed to subscribe' }, { status: 500 });
    }
  }

  // POST /api/trigger-scrape
  if (pathname === '/api/trigger-scrape') {
    await ensureDB();
    
    const secret = request.headers.get('x-secret');
    if (secret !== process.env.SCRAPE_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    try {
      const { scrapeSlots } = await import('@/lib/scraper');
      const slots = await scrapeSlots();
      
      const now = new Date();
      const scrapeTs = now;
      let opened = 0;
      let updated = 0;

      for (const slot of slots) {
        // Derive location if not provided
        let location = slot.location;
        if (!location && slot.obmocje) {
          location = `Območje ${slot.obmocje}`;
          if (slot.town) location += `, ${slot.town}`;
        }

        // Parse normalized dates
        let dateIso = null;
        let timeIso = null;
        try {
          const [day, month, year] = slot.date_str.split('.').map(s => s.trim());
          dateIso = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        } catch (e) {}
        
        try {
          timeIso = slot.time_str || '00:00';
        } catch (e) {}

        const placesLeft = parseInt(slot.places_left) || 0;
        const available = placesLeft > 0;

        // Check if slot exists
        const existingRes = await query(
          `SELECT id FROM slots 
           WHERE date_str = $1 AND time_str = $2 AND obmocje = $3 
           AND town = $4 AND categories = $5`,
          [slot.date_str, slot.time_str, slot.obmocje, slot.town, slot.categories]
        );

        if (existingRes.rows.length === 0) {
          // Insert new slot
          await query(
            `INSERT INTO slots 
             (date_str, time_str, date_iso, time_iso, obmocje, town, exam_type, 
              places_left, tolmac, categories, source_page, location, available, 
              created_at, updated_at, last_seen_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
            [
              slot.date_str, slot.time_str, dateIso, timeIso, slot.obmocje, slot.town,
              slot.exam_type, placesLeft, slot.tolmac || false, slot.categories,
              slot.source_page, location, available, now, now, scrapeTs
            ]
          );
          opened++;

          // Check for subscriptions that match this new slot
          await notifySubscribers(slot);
        } else {
          // Update existing slot
          await query(
            `UPDATE slots 
             SET exam_type = $1, places_left = $2, tolmac = $3, categories = $4,
                 source_page = $5, location = $6, available = $7, updated_at = $8,
                 last_seen_at = $9, date_iso = $10, time_iso = $11
             WHERE date_str = $12 AND time_str = $13 AND obmocje = $14 
             AND town = $15 AND categories = $16`,
            [
              slot.exam_type, placesLeft, slot.tolmac || false, slot.categories,
              slot.source_page, location, available, now, scrapeTs, dateIso, timeIso,
              slot.date_str, slot.time_str, slot.obmocje, slot.town, slot.categories
            ]
          );
          updated++;
        }
      }

      // Mark unseen slots as unavailable
      await query(
        `UPDATE slots 
         SET places_left = 0, available = false, updated_at = $1
         WHERE (last_seen_at IS NULL OR last_seen_at < $2) AND available = true`,
        [now, scrapeTs]
      );

      // Update scrape meta
      await query(
        'UPDATE scrape_meta SET last_scraped_at = $1 WHERE id = 1',
        [scrapeTs]
      );

      return NextResponse.json({ opened, updated, total: slots.length });
    } catch (error) {
      console.error('Error during scraping:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}

async function notifySubscribers(newSlot) {
  try {
    // Get active subscriptions
    const subsRes = await query(
      'SELECT * FROM subscriptions WHERE active = true'
    );

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

    for (const sub of subsRes.rows) {
      // Check if slot matches subscription filters
      let matches = true;
      
      if (sub.filter_obmocje && newSlot.obmocje !== sub.filter_obmocje) {
        matches = false;
      }
      if (sub.filter_town && newSlot.town !== sub.filter_town) {
        matches = false;
      }
      if (sub.filter_exam_type && newSlot.exam_type !== sub.filter_exam_type) {
        matches = false;
      }
      if (sub.filter_tolmac && !newSlot.tolmac) {
        matches = false;
      }
      if (sub.filter_categories && !newSlot.categories?.includes(sub.filter_categories)) {
        matches = false;
      }

      if (matches) {
        const unsubscribeUrl = `${baseUrl}/api/unsubscribe?token=${sub.unsubscribe_token}`;
        
        // Send notification email
        await resend.emails.send({
          from: 'notifications@resend.dev',
          to: sub.email,
          subject: 'New Exam Slot Available!',
          html: `
            <h2>New Exam Slot Available</h2>
            <p>A new slot matching your filters has been found:</p>
            <ul>
              <li><strong>Date:</strong> ${newSlot.date_str}</li>
              <li><strong>Time:</strong> ${newSlot.time_str}</li>
              <li><strong>Location:</strong> ${newSlot.location || 'N/A'}</li>
              ${newSlot.town ? `<li><strong>Town:</strong> ${newSlot.town}</li>` : ''}
              <li><strong>Categories:</strong> ${newSlot.categories}</li>
              ${newSlot.exam_type ? `<li><strong>Type:</strong> ${newSlot.exam_type}</li>` : ''}
              ${newSlot.places_left ? `<li><strong>Places left:</strong> ${newSlot.places_left}</li>` : ''}
              ${newSlot.tolmac ? '<li><strong>With translator</strong></li>' : ''}
            </ul>
            <p><a href="${unsubscribeUrl}">Unsubscribe from notifications</a></p>
          `
        });

        // Update last notified time
        await query(
          'UPDATE subscriptions SET last_notified_at = $1 WHERE id = $2',
          [new Date(), sub.id]
        );
      }
    }
  } catch (error) {
    console.error('Error notifying subscribers:', error);
  }
}