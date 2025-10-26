import { NextResponse } from "next/server";
import { query, initDB } from "@/lib/db";
import { Resend } from "resend";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export const runtime = 'nodejs';         // force Node, not Edge
export const dynamic = 'force-dynamic';  // avoid caching of API responses


// Initialize Resend only if API key is available
let resend;
if (process.env.RESEND_API_KEY) {
  resend = new Resend(process.env.RESEND_API_KEY);
}

// Initialize DB on startup
let dbInitialized = false;

async function ensureDB() {
  if (!dbInitialized) {
    await initDB();
    dbInitialized = true;
  }
}

// Helper function to verify admin token
function verifyAdminToken(request) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  
  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "default-secret-key");
    return decoded;
  } catch (error) {
    return null;
  }
}

// Helper function to verify user token
function verifyUserToken(request) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  
  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "default-secret-key");
    return decoded;
  } catch (error) {
    return null;
  }
}

// GET /api/healthz
export async function GET(request) {
  const { pathname } = new URL(request.url);

  if (pathname === "/api/healthz") {
    return NextResponse.json({ ok: true });
  }

  // GET /api/slots
  if (pathname === "/api/slots") {
    try {
      // Fetch from external scraper API
      const externalApiUrl = 'https://cppapp-v25wkpukcq-ew.a.run.app/slots_all?include_fields=obmocje,town,exam_type,places_left,tolmac,created_at,updated_at,date_str,time_str,location,categories';
      
      const response = await fetch(externalApiUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`External API returned ${response.status}`);
      }

      const data = await response.json();
      
      return NextResponse.json({
        last_scraped_at: data.last_scraped_at || new Date().toISOString(),
        count: data.count || data.items?.length || 0,
        items: data.items || [],
      });
    } catch (error) {
      console.error('Error fetching slots from external API:', error.message);
      
      // Return empty result on error
      return NextResponse.json({
        last_scraped_at: new Date().toISOString(),
        count: 0,
        items: [],
        error: 'Failed to fetch slots from external API',
      });
    }
  }

  // GET /api/unsubscribe
  if (pathname.startsWith("/api/unsubscribe")) {
    await ensureDB();
    const url = new URL(request.url);
    const token = url.searchParams.get("token");

    if (!token) {
      return NextResponse.json({ error: "Token required" }, { status: 400 });
    }

    try {
      await query(
        "UPDATE subscriptions SET active = false WHERE unsubscribe_token = $1",
        [token]
      );
      return NextResponse.json({ message: "Unsubscribed successfully" });
    } catch (error) {
      console.error("Error unsubscribing:", error);
      return NextResponse.json(
        { error: "Failed to unsubscribe" },
        { status: 500 }
      );
    }
  }

  // GET /api/admin/verify - Verify admin token
  if (pathname === "/api/admin/verify") {
    const admin = verifyAdminToken(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ valid: true, username: admin.username });
  }

  // GET /api/auth/verify - Verify user token
  if (pathname === "/api/auth/verify") {
    const user = verifyUserToken(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ valid: true, id: user.id, username: user.username, email: user.email });
  }

  // GET /api/auth/confirm-email - Confirm email via token
  if (pathname === "/api/auth/confirm-email") {
    await ensureDB();
    const url = new URL(request.url);
    const token = url.searchParams.get("token");

    if (!token) {
      return NextResponse.json({ error: "Token required" }, { status: 400 });
    }

    try {
      // Find user by confirmation token
      const result = await query(
        "SELECT id, email, username FROM users WHERE confirmation_token = $1 AND email_confirmed = FALSE",
        [token]
      );

      if (result.rows.length === 0) {
        return NextResponse.json(
          { error: "Invalid or expired token" },
          { status: 400 }
        );
      }

      const user = result.rows[0];

      // Mark email as confirmed
      await query(
        "UPDATE users SET email_confirmed = TRUE, confirmation_token = NULL WHERE id = $1",
        [user.id]
      );

      // Generate JWT token for auto-login
      const authToken = jwt.sign(
        { id: user.id, username: user.username, email: user.email },
        process.env.JWT_SECRET || "default-secret-key",
        { expiresIn: "7d" }
      );

      return NextResponse.json({
        message: "Email confirmed successfully",
        token: authToken,
        user: { id: user.id, username: user.username, email: user.email }
      });
    } catch (error) {
      console.error("Error confirming email:", error);
      return NextResponse.json(
        { error: "Failed to confirm email" },
        { status: 500 }
      );
    }
  }

  // GET /api/profile - Get user profile
  if (pathname === "/api/profile") {
    const user = verifyUserToken(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensureDB();

    try {
      // Get user details
      const userResult = await query(
        "SELECT id, email, username, email_confirmed, notification_count, created_at FROM users WHERE id = $1",
        [user.id]
      );

      if (userResult.rows.length === 0) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      // Get user's subscriptions
      const subsResult = await query(
        "SELECT id, filter_obmocje, filter_town, filter_exam_type, filter_tolmac, filter_categories, active, created_at FROM subscriptions WHERE user_id = $1 ORDER BY created_at DESC",
        [user.id]
      );

      return NextResponse.json({
        user: userResult.rows[0],
        subscriptions: subsResult.rows
      });
    } catch (error) {
      console.error("Error fetching profile:", error);
      return NextResponse.json(
        { error: "Failed to fetch profile" },
        { status: 500 }
      );
    }
  }

  // GET /api/questions
  if (pathname === "/api/questions") {
    await ensureDB();

    try {
      const url = new URL(request.url);
      const examType = url.searchParams.get("exam_type");
      const category = url.searchParams.get("category");

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

      queryStr += " ORDER BY likes_count DESC, created_at DESC LIMIT 100";

      const result = await query(queryStr, params);
      return NextResponse.json({ questions: result.rows });
    } catch (error) {
      console.error("Error fetching questions:", error);
      return NextResponse.json(
        { error: "Failed to fetch questions", message: error.message },
        { status: 500 }
      );
    }
  }

  // GET /api/learning/sessions - Get learning sessions for a date
  if (pathname === "/api/learning/sessions") {
    await ensureDB();

    try {
      const url = new URL(request.url);
      const date = url.searchParams.get("date"); // Format: YYYY-MM-DD

      if (!date) {
        return NextResponse.json(
          { error: "Date parameter required" },
          { status: 400 }
        );
      }

      // Define the three time slots
      const timeSlots = ['16:00:00', '18:00:00', '20:00:00'];
      const sessions = [];

      for (const timeSlot of timeSlots) {
        // Ensure session exists
        const sessionResult = await query(
          `INSERT INTO learning_sessions (session_date, session_time)
           VALUES ($1, $2)
           ON CONFLICT (session_date, session_time) DO UPDATE SET session_date = $1
           RETURNING id`,
          [date, timeSlot]
        );
        
        const sessionId = sessionResult.rows[0].id;

        // Get participants
        const participantsResult = await query(
          `SELECT sp.id, sp.note, sp.joined_at, u.username, u.email
           FROM session_participants sp
           JOIN users u ON sp.user_id = u.id
           WHERE sp.session_id = $1
           ORDER BY sp.joined_at ASC`,
          [sessionId]
        );

        sessions.push({
          id: sessionId,
          date,
          time: timeSlot.substring(0, 5), // Format as HH:MM
          participants: participantsResult.rows,
          availableSpots: Math.max(0, 5 - participantsResult.rows.length),
          isFull: participantsResult.rows.length >= 5
        });
      }

      return NextResponse.json({ sessions });
    } catch (error) {
      console.error("Error fetching learning sessions:", error);
      return NextResponse.json(
        { error: "Failed to fetch sessions", message: error.message },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ error: "Not found" }, { status: 404 });
}

// POST handlers
export async function POST(request) {
  const { pathname } = new URL(request.url);

  // POST /api/auth/register - User registration
  if (pathname === "/api/auth/register") {
    await ensureDB();

    try {
      const body = await request.json();
      const { email, username, password } = body;

      if (!email || !username || !password) {
        return NextResponse.json(
          { error: "Email, username, and password required" },
          { status: 400 }
        );
      }

      // Validate email format
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return NextResponse.json(
          { error: "Invalid email format" },
          { status: 400 }
        );
      }

      // Check if email or username already exists
      const existingUser = await query(
        "SELECT id FROM users WHERE email = $1 OR username = $2",
        [email, username]
      );

      if (existingUser.rows.length > 0) {
        return NextResponse.json(
          { error: "Email or username already exists" },
          { status: 400 }
        );
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);

      // Insert user
      const result = await query(
        `INSERT INTO users (email, username, password_hash)
         VALUES ($1, $2, $3)
         RETURNING id, email, username, created_at`,
        [email, username, passwordHash]
      );

      const user = result.rows[0];

      // Generate JWT token
      const token = jwt.sign(
        { id: user.id, username: user.username, email: user.email },
        process.env.JWT_SECRET || "default-secret-key",
        { expiresIn: "7d" }
      );

      return NextResponse.json({ 
        token, 
        user: { 
          id: user.id, 
          username: user.username, 
          email: user.email 
        } 
      });
    } catch (error) {
      console.error("Error registering user:", error);
      return NextResponse.json(
        { error: "Registration failed", message: error.message },
        { status: 500 }
      );
    }
  }

  // POST /api/auth/login - User login
  if (pathname === "/api/auth/login") {
    await ensureDB();

    try {
      const body = await request.json();
      const { email, password } = body;

      if (!email || !password) {
        return NextResponse.json(
          { error: "Email and password required" },
          { status: 400 }
        );
      }

      // Get user from database
      const result = await query(
        "SELECT id, email, username, password_hash FROM users WHERE email = $1",
        [email]
      );

      if (result.rows.length === 0) {
        return NextResponse.json(
          { error: "Invalid credentials" },
          { status: 401 }
        );
      }

      const user = result.rows[0];

      // Verify password
      const validPassword = await bcrypt.compare(password, user.password_hash);
      if (!validPassword) {
        return NextResponse.json(
          { error: "Invalid credentials" },
          { status: 401 }
        );
      }

      // Generate JWT token
      const token = jwt.sign(
        { id: user.id, username: user.username, email: user.email },
        process.env.JWT_SECRET || "default-secret-key",
        { expiresIn: "7d" }
      );

      return NextResponse.json({ 
        token, 
        user: { 
          id: user.id, 
          username: user.username, 
          email: user.email 
        } 
      });
    } catch (error) {
      console.error("Error logging in:", error);
      return NextResponse.json(
        { error: "Login failed" },
        { status: 500 }
      );
    }
  }

  // POST /api/admin/login - Admin login
  if (pathname === "/api/admin/login") {
    await ensureDB();

    try {
      const body = await request.json();
      const { username, password } = body;

      if (!username || !password) {
        return NextResponse.json(
          { error: "Username and password required" },
          { status: 400 }
        );
      }

      // Get admin user from database
      const result = await query(
        "SELECT id, username, password_hash FROM admin_users WHERE username = $1",
        [username]
      );

      if (result.rows.length === 0) {
        return NextResponse.json(
          { error: "Invalid credentials" },
          { status: 401 }
        );
      }

      const admin = result.rows[0];

      // Verify password
      const validPassword = await bcrypt.compare(password, admin.password_hash);
      if (!validPassword) {
        return NextResponse.json(
          { error: "Invalid credentials" },
          { status: 401 }
        );
      }

      // Generate JWT token
      const token = jwt.sign(
        { id: admin.id, username: admin.username },
        process.env.JWT_SECRET || "default-secret-key",
        { expiresIn: "24h" }
      );

      return NextResponse.json({ token, username: admin.username });
    } catch (error) {
      console.error("Error logging in:", error);
      return NextResponse.json(
        { error: "Login failed" },
        { status: 500 }
      );
    }
  }

  if (pathname === "/api/subscribe") {
    await ensureDB();

    try {
      const body = await request.json();
      const {
        email,
        filter_obmocje,
        filter_town,
        filter_exam_type,
        filter_tolmac,
        filter_categories,
      } = body;

      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return NextResponse.json(
          { error: "Valid email required" },
          { status: 400 }
        );
      }

      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Generate confirmation token
      const confirmationToken = crypto.randomBytes(32).toString("hex");
      
      // Generate unsubscribe token
      const unsubscribeToken = crypto.randomBytes(32).toString("hex");

      // Hash OTP for password
      const passwordHash = await bcrypt.hash(otp, 10);

      // Check if user already exists
      let userId;
      const existingUser = await query(
        "SELECT id, email_confirmed FROM users WHERE email = $1",
        [email]
      );

      if (existingUser.rows.length > 0) {
        userId = existingUser.rows[0].id;
        
        // Update OTP and confirmation token if email not confirmed
        if (!existingUser.rows[0].email_confirmed) {
          await query(
            "UPDATE users SET otp = $1, password_hash = $2, confirmation_token = $3 WHERE id = $4",
            [otp, passwordHash, confirmationToken, userId]
          );
        }
      } else {
        // Create new user
        const userResult = await query(
          `INSERT INTO users (email, password_hash, otp, confirmation_token, email_confirmed)
           VALUES ($1, $2, $3, $4, FALSE)
           RETURNING id`,
          [email, passwordHash, otp, confirmationToken]
        );
        userId = userResult.rows[0].id;
      }

      // Create subscription
      await query(
        `INSERT INTO subscriptions 
         (user_id, email, filter_obmocje, filter_town, filter_exam_type, filter_tolmac, filter_categories, unsubscribe_token)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          userId,
          email,
          filter_obmocje,
          filter_town,
          filter_exam_type,
          filter_tolmac,
          filter_categories,
          unsubscribeToken,
        ]
      );

      // Send confirmation email with OTP and confirmation link
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
      const confirmUrl = `${baseUrl}/api/auth/confirm-email?token=${confirmationToken}`;
      const unsubscribeUrl = `${baseUrl}/api/unsubscribe?token=${unsubscribeToken}`;

      if (resend) {
        await resend.emails.send({
          from: "Vozniski.si <obvestila@vozniski.si>",
          to: email,
          subject: "Potrdite vašo naročnino - Confirm Your Subscription",
          html: `
            <h2>Dobrodošli / Welcome!</h2>
            <p><strong>Vaša začasna koda za prijavo / Your temporary login code (OTP):</strong></p>
            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 4px; margin: 20px 0;">
              ${otp}
            </div>
            <p>Uporabite to kodo za prijavo. Kodo lahko kasneje spremenite v profilu.</p>
            <p>Use this code to login. You can change it later in your profile.</p>
            
            <div style="margin: 30px 0; text-align: center;">
              <a href="${confirmUrl}" style="background: linear-gradient(to right, #ff8a05, #ff5478, #ff00c6); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                Potrdite e-pošto in se prijavite / Confirm Email & Login
              </a>
            </div>

            <p><strong>Vaši filtri / Your filters:</strong></p>
            <ul>
              ${filter_obmocje ? `<li>Območje / Region: ${filter_obmocje}</li>` : ""}
              ${filter_town ? `<li>Mesto / Town: ${filter_town}</li>` : ""}
              ${filter_exam_type ? `<li>Tip izpita / Exam type: ${filter_exam_type}</li>` : ""}
              ${filter_tolmac ? `<li>S tolmačem / With translator</li>` : ""}
              ${filter_categories ? `<li>Kategorije / Categories: ${filter_categories}</li>` : ""}
            </ul>
            
            <p style="margin-top: 40px; font-size: 12px; color: #6b7280;">
              <a href="${unsubscribeUrl}">Odjava / Unsubscribe</a>
            </p>
          `,
        });
      }

      return NextResponse.json({ 
        message: "Subscribed successfully. Please check your email for OTP and confirmation link.",
        otp: otp // Only for development/testing
      });
    } catch (error) {
      console.error("Error subscribing:", error);
      return NextResponse.json(
        { error: "Failed to subscribe", message: error.message },
        { status: 500 }
      );
    }
  }

  // POST /api/questions (protected - requires authentication)
  if (pathname === "/api/questions") {
    // Verify user is authenticated
    const user = verifyUserToken(request);
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    await ensureDB();

    try {
      const body = await request.json();
      const {
        question_text,
        answer_a,
        answer_b,
        answer_c,
        answer_d,
        correct_answers,
        exam_type,
        category,
      } = body;

      if (
        !question_text ||
        !answer_a ||
        !answer_b ||
        !answer_c ||
        !answer_d ||
        !correct_answers
      ) {
        return NextResponse.json(
          { error: "All fields required" },
          { status: 400 }
        );
      }

      const result = await query(
        `INSERT INTO exam_questions 
         (question_text, answer_a, answer_b, answer_c, answer_d, correct_answers, exam_type, category, submitted_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [
          question_text,
          answer_a,
          answer_b,
          answer_c,
          answer_d,
          correct_answers,
          exam_type,
          category,
          user.username, // Use authenticated user's username
        ]
      );

      return NextResponse.json({ question: result.rows[0] });
    } catch (error) {
      console.error("Error creating question:", error);
      return NextResponse.json(
        { error: "Failed to create question", message: error.message },
        { status: 500 }
      );
    }
  }

  // POST /api/learning/sessions/join - Join a learning session
  if (pathname === "/api/learning/sessions/join") {
    const user = verifyUserToken(request);
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    await ensureDB();

    try {
      const body = await request.json();
      const { session_id, note } = body;

      if (!session_id) {
        return NextResponse.json(
          { error: "Session ID required" },
          { status: 400 }
        );
      }

      // Check if session is full
      const participantsCount = await query(
        "SELECT COUNT(*) as count FROM session_participants WHERE session_id = $1",
        [session_id]
      );

      if (parseInt(participantsCount.rows[0].count) >= 5) {
        return NextResponse.json(
          { error: "Session is full" },
          { status: 400 }
        );
      }

      // Check if already joined
      const existing = await query(
        "SELECT id FROM session_participants WHERE session_id = $1 AND user_id = $2",
        [session_id, user.id]
      );

      if (existing.rows.length > 0) {
        return NextResponse.json(
          { error: "Already joined this session" },
          { status: 400 }
        );
      }

      // Join session
      await query(
        `INSERT INTO session_participants (session_id, user_id, note)
         VALUES ($1, $2, $3)`,
        [session_id, user.id, note || null]
      );

      return NextResponse.json({ message: "Successfully joined session" });
    } catch (error) {
      console.error("Error joining session:", error);
      return NextResponse.json(
        { error: "Failed to join session", message: error.message },
        { status: 500 }
      );
    }
  }

  // POST /api/learning/sessions/leave - Leave a learning session
  if (pathname === "/api/learning/sessions/leave") {
    const user = verifyUserToken(request);
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    await ensureDB();

    try {
      const body = await request.json();
      const { session_id } = body;

      if (!session_id) {
        return NextResponse.json(
          { error: "Session ID required" },
          { status: 400 }
        );
      }

      // Leave session
      const result = await query(
        "DELETE FROM session_participants WHERE session_id = $1 AND user_id = $2 RETURNING id",
        [session_id, user.id]
      );

      if (result.rows.length === 0) {
        return NextResponse.json(
          { error: "Not joined in this session" },
          { status: 400 }
        );
      }

      return NextResponse.json({ message: "Successfully left session" });
    } catch (error) {
      console.error("Error leaving session:", error);
      return NextResponse.json(
        { error: "Failed to leave session", message: error.message },
        { status: 500 }
      );
    }
  }

  // POST /api/learning/sessions/note - Update note for a session
  if (pathname === "/api/learning/sessions/note") {
    const user = verifyUserToken(request);
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    await ensureDB();

    try {
      const body = await request.json();
      const { session_id, note } = body;

      if (!session_id) {
        return NextResponse.json(
          { error: "Session ID required" },
          { status: 400 }
        );
      }

      // Update note
      const result = await query(
        `UPDATE session_participants 
         SET note = $1 
         WHERE session_id = $2 AND user_id = $3
         RETURNING id`,
        [note || null, session_id, user.id]
      );

      if (result.rows.length === 0) {
        return NextResponse.json(
          { error: "Not joined in this session" },
          { status: 400 }
        );
      }

      return NextResponse.json({ message: "Note updated successfully" });
    } catch (error) {
      console.error("Error updating note:", error);
      return NextResponse.json(
        { error: "Failed to update note", message: error.message },
        { status: 500 }
      );
    }
  }

  // POST /api/questions/:id/vote
  if (pathname.match(/^\/api\/questions\/\d+\/vote$/)) {
    await ensureDB();

    try {
      const questionId = pathname.split("/")[3];
      const body = await request.json();
      const { vote_type } = body; // 'like' or 'dislike'

      if (!["like", "dislike"].includes(vote_type)) {
        return NextResponse.json(
          { error: "Invalid vote type" },
          { status: 400 }
        );
      }

      // Get voter IP (simplified)
      const voterIp = request.headers.get("x-forwarded-for") || "unknown";

      // Check if already voted
      const existingVote = await query(
        "SELECT vote_type FROM question_votes WHERE question_id = $1 AND voter_ip = $2",
        [questionId, voterIp]
      );

      if (existingVote.rows.length > 0) {
        const oldVote = existingVote.rows[0].vote_type;

        if (oldVote === vote_type) {
          // Remove vote
          await query(
            "DELETE FROM question_votes WHERE question_id = $1 AND voter_ip = $2",
            [questionId, voterIp]
          );

          // Update count
          const countField =
            vote_type === "like" ? "likes_count" : "dislikes_count";
          await query(
            `UPDATE exam_questions SET ${countField} = ${countField} - 1 WHERE id = $1`,
            [questionId]
          );
        } else {
          // Change vote
          await query(
            "UPDATE question_votes SET vote_type = $1 WHERE question_id = $2 AND voter_ip = $3",
            [vote_type, questionId, voterIp]
          );

          // Update counts
          const oldCountField =
            oldVote === "like" ? "likes_count" : "dislikes_count";
          const newCountField =
            vote_type === "like" ? "likes_count" : "dislikes_count";
          await query(
            `UPDATE exam_questions 
             SET ${oldCountField} = ${oldCountField} - 1, ${newCountField} = ${newCountField} + 1 
             WHERE id = $1`,
            [questionId]
          );
        }
      } else {
        // New vote
        await query(
          "INSERT INTO question_votes (question_id, voter_ip, vote_type) VALUES ($1, $2, $3)",
          [questionId, voterIp, vote_type]
        );

        // Update count
        const countField =
          vote_type === "like" ? "likes_count" : "dislikes_count";
        await query(
          `UPDATE exam_questions SET ${countField} = ${countField} + 1 WHERE id = $1`,
          [questionId]
        );
      }

      // Get updated question
      const updated = await query(
        "SELECT likes_count, dislikes_count FROM exam_questions WHERE id = $1",
        [questionId]
      );

      return NextResponse.json({ question: updated.rows[0] });
    } catch (error) {
      console.error("Error voting:", error);
      return NextResponse.json(
        { error: "Failed to record vote", message: error.message },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ error: "Not found" }, { status: 404 });
}

// PUT /api/questions/:id - Update question (admin only)
export async function PUT(request) {
  const { pathname } = new URL(request.url);

  // PUT /api/profile - Update user profile
  if (pathname === "/api/profile") {
    const user = verifyUserToken(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensureDB();

    try {
      const body = await request.json();
      const { username, current_password, new_password } = body;

      // Validate inputs
      if (username) {
        // Check if username already exists
        const existing = await query(
          "SELECT id FROM users WHERE username = $1 AND id != $2",
          [username, user.id]
        );
        
        if (existing.rows.length > 0) {
          return NextResponse.json(
            { error: "Username already taken" },
            { status: 400 }
          );
        }

        await query(
          "UPDATE users SET username = $1 WHERE id = $2",
          [username, user.id]
        );
      }

      // Change password if provided
      if (new_password) {
        if (!current_password) {
          return NextResponse.json(
            { error: "Current password required" },
            { status: 400 }
          );
        }

        // Verify current password
        const userResult = await query(
          "SELECT password_hash FROM users WHERE id = $1",
          [user.id]
        );

        const validPassword = await bcrypt.compare(
          current_password,
          userResult.rows[0].password_hash
        );

        if (!validPassword) {
          return NextResponse.json(
            { error: "Invalid current password" },
            { status: 401 }
          );
        }

        // Hash and update new password
        const newPasswordHash = await bcrypt.hash(new_password, 10);
        await query(
          "UPDATE users SET password_hash = $1, otp = NULL WHERE id = $2",
          [newPasswordHash, user.id]
        );
      }

      return NextResponse.json({ message: "Profile updated successfully" });
    } catch (error) {
      console.error("Error updating profile:", error);
      return NextResponse.json(
        { error: "Failed to update profile", message: error.message },
        { status: 500 }
      );
    }
  }

  if (pathname.match(/^\/api\/questions\/\d+$/)) {
    // Verify admin
    const admin = verifyAdminToken(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensureDB();

    try {
      const questionId = pathname.split("/")[3];
      const body = await request.json();
      const {
        question_text,
        answer_a,
        answer_b,
        answer_c,
        answer_d,
        correct_answers,
        exam_type,
        category,
      } = body;

      const result = await query(
        `UPDATE exam_questions 
         SET question_text = $1, answer_a = $2, answer_b = $3, answer_c = $4, 
             answer_d = $5, correct_answers = $6, exam_type = $7, category = $8
         WHERE id = $9
         RETURNING *`,
        [
          question_text,
          answer_a,
          answer_b,
          answer_c,
          answer_d,
          correct_answers,
          exam_type,
          category,
          questionId,
        ]
      );

      if (result.rows.length === 0) {
        return NextResponse.json(
          { error: "Question not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({ question: result.rows[0] });
    } catch (error) {
      console.error("Error updating question:", error);
      return NextResponse.json(
        { error: "Failed to update question", message: error.message },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ error: "Not found" }, { status: 404 });
}

// DELETE /api/questions/:id - Delete question (admin only)
export async function DELETE(request) {
  const { pathname } = new URL(request.url);

  if (pathname.match(/^\/api\/questions\/\d+$/)) {
    // Verify admin
    const admin = verifyAdminToken(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensureDB();

    try {
      const questionId = pathname.split("/")[3];

      const result = await query(
        "DELETE FROM exam_questions WHERE id = $1 RETURNING id",
        [questionId]
      );

      if (result.rows.length === 0) {
        return NextResponse.json(
          { error: "Question not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({ message: "Question deleted successfully" });
    } catch (error) {
      console.error("Error deleting question:", error);
      return NextResponse.json(
        { error: "Failed to delete question", message: error.message },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
