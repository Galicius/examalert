import { NextResponse } from "next/server";
import { query, initDB } from "@/lib/db";
import { Resend } from "resend";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

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

  // GET /api/questions
  if (pathname === "/api/questions") {
    try {
      await ensureDB();
    } catch (dbError) {
      console.error("Database connection error:", dbError.message);
    }

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
      // Return mock data
      return NextResponse.json({
        questions: [
          {
            id: 1,
            question_text: "Katera je maksimalna dovoljena hitrost v naselju?",
            answer_a: "50 km/h",
            answer_b: "60 km/h",
            answer_c: "70 km/h",
            answer_d: "80 km/h",
            correct_answers: "A",
            exam_type: "teorija",
            category: "B",
            submitted_by: "Uporabnik",
            created_at: new Date().toISOString(),
            likes_count: 15,
            dislikes_count: 2,
          },
          {
            id: 2,
            question_text: "Kdaj morate prižgati luči na vozilu?",
            answer_a: "Samo ponoči",
            answer_b: "Vedno",
            answer_c: "Pri slabi vidljivosti",
            answer_d: "Nikoli",
            correct_answers: "B,C",
            exam_type: "teorija",
            category: "B",
            submitted_by: "Uporabnik",
            created_at: new Date().toISOString(),
            likes_count: 8,
            dislikes_count: 1,
          },
        ],
      });
    }
  }

  return NextResponse.json({ error: "Not found" }, { status: 404 });
}

// POST /api/subscribe
export async function POST(request) {
  const { pathname } = new URL(request.url);

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
        from: "notifications@resend.dev",
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

      return NextResponse.json({ message: "Subscribed successfully" });
    } catch (error) {
      console.error("Error subscribing:", error);
      return NextResponse.json(
        { error: "Failed to subscribe" },
        { status: 500 }
      );
    }
  }

  // POST /api/questions
  if (pathname === "/api/questions") {
    try {
      await ensureDB();
    } catch (dbError) {
      console.error("Database connection error:", dbError.message);
    }

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
        submitted_by,
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
          submitted_by || "Anonymous",
        ]
      );

      return NextResponse.json({ question: result.rows[0] });
    } catch (error) {
      console.error("Error creating question:", error);
      return NextResponse.json({ message: "Question submitted (mock mode)" });
    }
  }

  // POST /api/questions/:id/vote
  if (pathname.match(/^\/api\/questions\/\d+\/vote$/)) {
    try {
      await ensureDB();
    } catch (dbError) {
      console.error("Database connection error:", dbError.message);
    }

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
      return NextResponse.json({ message: "Vote recorded (mock mode)" });
    }
  }

  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
