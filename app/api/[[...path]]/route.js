import { NextResponse } from "next/server";
import { query, initDB } from "@/lib/db";
import { Resend } from "resend";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { OAuth2Client } from 'google-auth-library';

const googleClient = new OAuth2Client(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);

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

  // GET /api/user/profile - Get user profile
  if (pathname === "/api/user/profile") {
    const user = verifyUserToken(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensureDB();

    try {
      // Get user details
      const userRes = await query(
        "SELECT id, username, email FROM users WHERE id = $1",
        [user.id]
      );

      if (userRes.rows.length === 0) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      // Get active subscriptions
      const subsRes = await query(
        "SELECT * FROM subscriptions WHERE email = $1 AND active = TRUE ORDER BY created_at DESC",
        [user.email]
      );

      return NextResponse.json({
        user: userRes.rows[0],
        subscriptions: subsRes.rows
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
      
      // Ensure all sessions exist in a single query (more efficient than 3 separate INSERTs)
      const sessionValues = timeSlots.map((_, idx) => `($1, $${idx + 2})`).join(', ');
      await query(
        `INSERT INTO learning_sessions (session_date, session_time)
         VALUES ${sessionValues}
         ON CONFLICT (session_date, session_time) DO NOTHING`,
        [date, ...timeSlots]
      );

      // Fetch all sessions with participants in a single query
      const sessionsResult = await query(
        `SELECT 
          ls.id,
          ls.session_time,
          sp.id as participant_id,
          sp.note,
          sp.joined_at,
          u.username,
          u.email
         FROM learning_sessions ls
         LEFT JOIN session_participants sp ON ls.id = sp.session_id
         LEFT JOIN users u ON sp.user_id = u.id
         WHERE ls.session_date = $1 AND ls.session_time = ANY($2)
         ORDER BY ls.session_time, sp.joined_at ASC`,
        [date, timeSlots]
      );

      // Group participants by session
      const sessionsMap = new Map();
      for (const row of sessionsResult.rows) {
        if (!sessionsMap.has(row.id)) {
          sessionsMap.set(row.id, {
            id: row.id,
            date,
            time: row.session_time.substring(0, 5),
            participants: []
          });
        }
        
        // Add participant if exists (LEFT JOIN may have NULL)
        if (row.participant_id) {
          sessionsMap.get(row.id).participants.push({
            id: row.participant_id,
            note: row.note,
            joined_at: row.joined_at,
            username: row.username,
            email: row.email
          });
        }
      }

      // Convert map to array and add computed fields
      const sessions = Array.from(sessionsMap.values()).map(session => ({
        ...session,
        availableSpots: Math.max(0, 5 - session.participants.length),
        isFull: session.participants.length >= 5
      }));

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



export async function PUT(request) {
  const { pathname } = new URL(request.url);

  // PUT /api/user/profile - Update user profile
  if (pathname === "/api/user/profile") {
    const user = verifyUserToken(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensureDB();

    try {
      const body = await request.json();
      const { username, new_password } = body;

      // Update username
      if (username && username !== user.username) {
        // Check availability
        const check = await query(
          "SELECT id FROM users WHERE username = $1 AND id != $2",
          [username, user.id]
        );
        if (check.rows.length > 0) {
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

      // Update password
      if (new_password) {
        const passwordHash = await bcrypt.hash(new_password, 10);
        await query(
          "UPDATE users SET password_hash = $1 WHERE id = $2",
          [passwordHash, user.id]
        );
      }

      return NextResponse.json({ message: "Profile updated successfully" });
    } catch (error) {
      console.error("Error updating profile:", error);
      return NextResponse.json(
        { error: "Failed to update profile" },
        { status: 500 }
      );
    }
  }

  // PUT /api/questions/:id - Update question (admin only)
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
          questionId
        ]
      );

      if (result.rows.length === 0) {
        return NextResponse.json({ error: "Question not found" }, { status: 404 });
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


// POST handlers
export async function POST(request) {
  const { pathname } = new URL(request.url);

  // POST /api/auth/forgot-password - Request password reset
  if (pathname === "/api/auth/forgot-password") {
    await ensureDB();

    try {
      const body = await request.json();
      const { email } = body;

      if (!email) {
        return NextResponse.json({ error: "Email required" }, { status: 400 });
      }

      // Check if user exists
      const userRes = await query("SELECT id FROM users WHERE email = $1", [email]);
      if (userRes.rows.length === 0) {
        // Return success even if email not found to prevent enumeration
        return NextResponse.json({ message: "If an account exists, a reset link has been sent." });
      }

      // Generate token
      const token = crypto.randomBytes(32).toString("hex");
      const expires = new Date(Date.now() + 3600000); // 1 hour

      // Save token
      await query(
        "UPDATE users SET reset_token = $1, reset_token_expires = $2 WHERE email = $3",
        [token, expires, email]
      );

      // Send email
      if (resend) {
        const resetLink = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/reset-password?token=${token}`;
        
        await resend.emails.send({
          from: "ExamAlert <onboarding@resend.dev>",
          to: email,
          subject: "Reset your password",
          html: `
            <p>You requested a password reset for ExamAlert.</p>
            <p>Click the link below to reset your password:</p>
            <a href="${resetLink}">${resetLink}</a>
            <p>This link will expire in 1 hour.</p>
            <p>If you didn't request this, please ignore this email.</p>
          `
        });
      }

      return NextResponse.json({ message: "If an account exists, a reset link has been sent." });
    } catch (error) {
      console.error("Error requesting password reset:", error);
      return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
    }
  }

  // POST /api/auth/reset-password - Reset password with token
  if (pathname === "/api/auth/reset-password") {
    await ensureDB();

    try {
      const body = await request.json();
      const { token, new_password } = body;

      if (!token || !new_password) {
        return NextResponse.json({ error: "Token and new password required" }, { status: 400 });
      }

      // Verify token
      const userRes = await query(
        "SELECT id FROM users WHERE reset_token = $1 AND reset_token_expires > NOW()",
        [token]
      );

      if (userRes.rows.length === 0) {
        return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });
      }

      const userId = userRes.rows[0].id;
      const passwordHash = await bcrypt.hash(new_password, 10);

      // Update password and clear token
      await query(
        "UPDATE users SET password_hash = $1, reset_token = NULL, reset_token_expires = NULL WHERE id = $2",
        [passwordHash, userId]
      );

      return NextResponse.json({ message: "Password reset successfully" });
    } catch (error) {
      console.error("Error resetting password:", error);
      return NextResponse.json({ error: "Failed to reset password" }, { status: 500 });
    }
  }

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
        { error: "Failed to register user" },
        { status: 500 }
      );
    }
  }

  // POST /api/auth/google - Google Login
  if (pathname === "/api/auth/google") {
    await ensureDB();

    try {
      const body = await request.json();
      const { credential } = body;

      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      const { email, name } = payload;

      // Check if user exists
      let result = await query(
        "SELECT id, email, username, password_hash FROM users WHERE email = $1",
        [email]
      );

      let user;

      if (result.rows.length === 0) {
        // Create new user
        // Generate a random password for Google users
        const randomPassword = crypto.randomBytes(16).toString('hex');
        const passwordHash = await bcrypt.hash(randomPassword, 10);
        
        // Use name or part of email as username
        let username = name || email.split('@')[0];
        
        // Ensure username is unique (simple check)
        const existingUsername = await query("SELECT id FROM users WHERE username = $1", [username]);
        if (existingUsername.rows.length > 0) {
          username = `${username}_${crypto.randomBytes(4).toString('hex')}`;
        }

        const newUser = await query(
          `INSERT INTO users (email, username, password_hash)
           VALUES ($1, $2, $3)
           RETURNING id, email, username, created_at`,
          [email, username, passwordHash]
        );
        user = newUser.rows[0];
      } else {
        user = result.rows[0];
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
      console.error("Error with Google login:", error);
      return NextResponse.json(
        { error: "Google login failed" },
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

  // POST /api/auth/send-otp - Send OTP for email verification
  if (pathname === "/api/auth/send-otp") {
    await ensureDB();

    try {
      const body = await request.json();
      const { email } = body;

      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return NextResponse.json(
          { error: "Valid email required" },
          { status: 400 }
        );
      }

      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      await query(
        `INSERT INTO email_verifications (email, otp, expires_at)
         VALUES ($1, $2, $3)`,
        [email, otp, expiresAt]
      );

      // Send OTP email
      await resend.emails.send({
        from: "Vozniski.si <obvestila@vozniski.si>",
        to: email,
        subject: "Verification Code - Vozniski.si",
        html: `
          <h2>Verification Code</h2>
          <p>Your verification code is: <strong>${otp}</strong></p>
          <p>This code will expire in 10 minutes.</p>
        `,
      });

      return NextResponse.json({ message: "OTP sent successfully" });
    } catch (error) {
      console.error("Error sending OTP:", error);
      return NextResponse.json(
        { error: "Failed to send OTP" },
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
        otp,
        filter_obmocje,
        filter_town,
        filter_exam_type,
        filter_tolmac,
        filter_categories,
        google_token
      } = body;

      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return NextResponse.json(
          { error: "Valid email required" },
          { status: 400 }
        );
      }

      // Check if user is authenticated via header
      const authUser = verifyUserToken(request);
      
      // Verify OTP if not Google login AND not authenticated via header
      if (!google_token && (!authUser || authUser.email !== email)) {
        if (!otp) {
          return NextResponse.json(
            { error: "OTP required" },
            { status: 400 }
          );
        }

        const verification = await query(
          `SELECT * FROM email_verifications 
           WHERE email = $1 AND otp = $2 AND expires_at > NOW() AND verified = FALSE
           ORDER BY created_at DESC LIMIT 1`,
          [email, otp]
        );

        if (verification.rows.length === 0) {
          return NextResponse.json(
            { error: "Invalid or expired OTP" },
            { status: 400 }
          );
        }

        // Mark as verified
        await query(
          "UPDATE email_verifications SET verified = TRUE WHERE id = $1",
          [verification.rows[0].id]
        );
      }

      // Check/Create User
      let userResult = await query("SELECT * FROM users WHERE email = $1", [email]);
      let user;

      if (userResult.rows.length === 0) {
        // Create new user with random password
        const randomPassword = crypto.randomBytes(16).toString('hex');
        const passwordHash = await bcrypt.hash(randomPassword, 10);
        const username = email.split('@')[0] + '_' + crypto.randomBytes(4).toString('hex');

        const newUser = await query(
          `INSERT INTO users (email, username, password_hash)
           VALUES ($1, $2, $3)
           RETURNING id, email, username`,
          [email, username, passwordHash]
        );
        user = newUser.rows[0];
      } else {
        user = userResult.rows[0];
      }

      // Generate unique unsubscribe token
      const unsubscribeToken = crypto.randomBytes(32).toString("hex");

      await query(
        `INSERT INTO subscriptions 
         (email, filter_obmocje, filter_town, filter_exam_type, filter_tolmac, filter_categories, unsubscribe_token)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          email,
          filter_obmocje,
          filter_town,
          filter_exam_type,
          filter_tolmac,
          filter_categories,
          unsubscribeToken,
        ]
      );

      // Send confirmation email
      const baseUrl =
        process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
      const unsubscribeUrl = `${baseUrl}/api/unsubscribe?token=${unsubscribeToken}`;

      await resend.emails.send({
        from: "Vozniski.si <obvestila@vozniski.si>",
        to: email,
        subject: "Subscription Confirmed - Exam Slot Notifications",
        html: `
          <h2>Subscription Confirmed</h2>
          <p>You will receive notifications when new exam slots matching your filters appear.</p>
          <p><strong>Your filters:</strong></p>
          <ul>
            ${filter_obmocje ? `<li>Region: Območje ${filter_obmocje}</li>` : ""}
            ${filter_town ? `<li>Town: ${filter_town}</li>` : ""}
            ${filter_exam_type ? `<li>Exam type: ${filter_exam_type}</li>` : ""}
            ${filter_tolmac ? `<li>With translator</li>` : ""}
            ${filter_categories ? `<li>Categories: ${filter_categories}</li>` : ""}
          </ul>
          <p><a href="${unsubscribeUrl}">Unsubscribe</a></p>
        `,
      });

      // Generate Auth Token
      const token = jwt.sign(
        { id: user.id, username: user.username, email: user.email },
        process.env.JWT_SECRET || "default-secret-key",
        { expiresIn: "7d" }
      );

      return NextResponse.json({ 
        message: "Subscribed successfully",
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email
        }
      });
    } catch (error) {
      console.error("Error subscribing:", error);
      return NextResponse.json(
        { error: "Failed to subscribe" },
        { status: 500 }
      );
    }
  }

  // DELETE /api/subscriptions/:id
  if (pathname.match(/^\/api\/subscriptions\/\d+$/) && request.method === "DELETE") {
    await ensureDB();
    
    const user = verifyUserToken(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const id = pathname.split("/").pop();

    try {
      // Verify ownership
      const sub = await query(
        "SELECT * FROM subscriptions WHERE id = $1 AND email = $2",
        [id, user.email]
      );

      if (sub.rows.length === 0) {
        return NextResponse.json(
          { error: "Subscription not found" },
          { status: 404 }
        );
      }

      await query("DELETE FROM subscriptions WHERE id = $1", [id]);

      return NextResponse.json({ message: "Subscription deleted" });
    } catch (error) {
      console.error("Error deleting subscription:", error);
      return NextResponse.json(
        { error: "Failed to delete subscription" },
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
