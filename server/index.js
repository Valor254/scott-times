// 1. Import required libraries
const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
require("dotenv").config();

// 2. Create the Express app
const app = express();

// 3. Middleware (runs on every request)
app.use(cors());
app.use(express.json());

// 4. Database connectionpool (using environment variables for security)
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

// 5. Authentication middleware (to protect routes)
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];

  if (!authHeader) {
    return res.status(401).json({
      status: "error",
      message: "Access token required.",
    });
  }

  const token = authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      status: "error",
      message: "Invalid token format.",
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach decoded user info to request
    req.user = decoded;

    next(); // Allow request to continue
  } catch (error) {
    return res.status(403).json({
      status: "error",
      message: "Invalid or expired token.",
    });
  }
}

// 6. Role-based access control middleware (optional, for future use)

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({
        status: "error",
        message: "Not authenticated.",
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        status: "error",
        message: "Forbidden: you do not have permission.",
      });
    }

    next();
  };
}
// 6. Role-based access control middleware (optional, for future use)
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({
        status: "error",
        message: "Not authenticated.",
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        status: "error",
        message: "Forbidden: you do not have permission.",
      });
    }

    next();
  };
}

// Example of a helper function to get a post by ID (not an API route, just internal logic)
async function getPostById(postId) {
  const [rows] = await pool.execute(
    `SELECT * FROM posts WHERE id = ? LIMIT 1`,
    [postId]
  );
  return rows.length ? rows[0] : null;
}

// Example of a helper function to check if a user is a club admin (not an API route, just internal logic)
async function isClubAdmin(clubId, userId) {
  const [rows] = await pool.execute(
    `SELECT id FROM club_members
     WHERE club_id = ? AND user_id = ? AND role = 'CLUB_ADMIN' AND status = 'ACTIVE'
     LIMIT 1`,
    [clubId, userId]
  );
  return rows.length > 0;
}

// Example of a helper function to check if a user is a club member (not an API route, just internal logic)
async function isClubMember(clubId, userId) {
  const [rows] = await pool.execute(
    `SELECT id FROM club_members
     WHERE club_id = ? AND user_id = ? AND status = 'ACTIVE'
     LIMIT 1`,
    [clubId, userId]
  );
  return rows.length > 0;
}
// 6. Role-based access control middleware (optional, for future use)
function requireAnyRole(roles = []) {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({ status: "error", message: "Unauthorized." });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ status: "error", message: "Access denied." });
    }
    next();
  };
}

// 4. Root route (basic test)
app.get("/", (req, res) => {
  res.send("Scott Times backend is running ✅");
});

// 5. Health check route (industry standard)
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    message: "Backend healthy ✅",
    timestamp: new Date().toISOString(),
  });
});

// 6. Database test route (to verify DB connection)
app.get("/db-test", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT 1 + 1 AS result");
    res.json({
      status: "ok",
      db: "connected",
      testResult: rows[0].result,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      db: "not connected",
      message: error.message,
    });
  }
});

// 7. Register a new user
app.post("/api/auth/register", async (req, res) => {
  try {
    const { full_name, email, password, role } = req.body;

    // Basic validation (keep it simple for now)
    if (!full_name || !email || !password) {
      return res.status(400).json({
        status: "error",
        message: "full_name, email, and password are required.",
      });
    }

    // Optional: restrict role values (avoid random values)
    const allowedRoles = ["STUDENT", "PARENT", "CLUB_ADMIN", "ADMIN"];
    const safeRole = role && allowedRoles.includes(role) ? role : "STUDENT";

    // Hash password (never store plain password)
    const password_hash = await bcrypt.hash(password, 10);

    // Insert user into DB
    const sql = `
      INSERT INTO users (full_name, email, password_hash, role)
      VALUES (?, ?, ?, ?)
    `;

    const [result] = await pool.execute(sql, [
      full_name,
      email.toLowerCase(),
      password_hash,
      safeRole,
    ]);

    return res.status(201).json({
      status: "ok",
      message: "User registered successfully ✅",
      user: {
        id: result.insertId,
        full_name,
        email: email.toLowerCase(),
        role: safeRole,
      },
    });
  } catch (error) {
    // Common issue: duplicate email (MySQL UNIQUE)
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        status: "error",
        message: "Email already exists. Try logging in instead.",
      });
    }

    return res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
});

// 8. Login user and return JWT token

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        status: "error",
        message: "email and password are required.",
      });
    }

    // Find user by email
    const sql = `SELECT * FROM users WHERE email = ? LIMIT 1`;
    const [rows] = await pool.execute(sql, [email.toLowerCase()]);

    if (rows.length === 0) {
      return res.status(401).json({
        status: "error",
        message: "Invalid email or password.",
      });
    }

    const user = rows[0];

    // Compare password with hash
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({
        status: "error",
        message: "Invalid email or password.",
      });
    }

    // Create JWT token
    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
        email: user.email,
      },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    );

    return res.json({
      status: "ok",
      message: "Login successful ✅",
      token,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
});

// 9. Protected route example (only accessible with valid token)

app.get("/api/profile", authenticateToken, (req, res) => {
  res.json({
    status: "ok",
    message: "Protected route accessed ✅",
    user: req.user,
  });
});

// 10. Admin-only route example (requires token + ADMIN role)

app.get("/api/admin/check", authenticateToken, requireRole("ADMIN"), (req, res) => {
  res.json({
    status: "ok",
    message: "Welcome Admin ✅",
    user: req.user,
  });
});

// 11. Get all open reports (admin only)
app.get("/api/admin/reports", authenticateToken, requireRole("ADMIN"), async (req, res) => {
  try {
    const sql = `
      SELECT
        r.id AS report_id,
        r.reason,
        r.details,
        r.status,
        r.created_at AS reported_at,

        reporter.id AS reporter_id,
        reporter.full_name AS reporter_name,
        reporter.email AS reporter_email,

        p.id AS post_id,
        p.content AS post_content,
        p.audience AS post_audience,
        p.is_deleted,
        p.is_hidden,
        p.hidden_reason,
        p.hidden_at,

        author.id AS author_id,
        author.full_name AS author_name,
        author.role AS author_role
      FROM reports r
      JOIN users reporter ON reporter.id = r.reporter_user_id
      JOIN posts p ON p.id = r.post_id
      JOIN users author ON author.id = p.author_user_id
      WHERE r.status = 'OPEN'
      ORDER BY r.created_at DESC
      LIMIT 100
    `;

    const [rows] = await pool.execute(sql);

    return res.json({
      status: "ok",
      count: rows.length,
      reports: rows,
    });
  } catch (error) {
    return res.status(500).json({ status: "error", message: error.message });
  }
});

// 12. Hide a post (admin only)

app.post("/api/admin/posts/:id/hide", authenticateToken, requireRole("ADMIN"), async (req, res) => {
  try {
    const postId = Number(req.params.id);
    const { reason } = req.body;

    if (!postId) {
      return res.status(400).json({ status: "error", message: "Invalid post id." });
    }

    const post = await getPostById(postId);
    if (!post || post.is_deleted === 1) {
      return res.status(404).json({ status: "error", message: "Post not found." });
    }

    if (post.is_hidden === 1) {
      return res.status(409).json({ status: "error", message: "Post is already hidden." });
    }

    const safeReason = (reason && reason.trim().length > 0) ? reason.trim().slice(0, 255) : "Hidden by admin";

    await pool.execute(
      `UPDATE posts
       SET is_hidden = 1,
           hidden_reason = ?,
           hidden_by_user_id = ?,
           hidden_at = NOW()
       WHERE id = ?`,
      [safeReason, req.user.id, postId]
    );

    return res.json({
      status: "ok",
      message: "Post hidden ✅",
      post: { id: postId, is_hidden: 1, hidden_reason: safeReason },
    });
  } catch (error) {
    return res.status(500).json({ status: "error", message: error.message });
  }
});

// 13. Unhide a post (admin only)

app.post("/api/admin/posts/:id/unhide", authenticateToken, requireRole("ADMIN"), async (req, res) => {
  try {
    const postId = Number(req.params.id);

    if (!postId) {
      return res.status(400).json({ status: "error", message: "Invalid post id." });
    }

    const post = await getPostById(postId);
    if (!post || post.is_deleted === 1) {
      return res.status(404).json({ status: "error", message: "Post not found." });
    }

    if (post.is_hidden === 0) {
      return res.status(409).json({ status: "error", message: "Post is not hidden." });
    }

    await pool.execute(
      `UPDATE posts
       SET is_hidden = 0,
           hidden_reason = NULL,
           hidden_by_user_id = NULL,
           hidden_at = NULL
       WHERE id = ?`,
      [postId]
    );

    return res.json({
      status: "ok",
      message: "Post unhidden ✅",
      post: { id: postId, is_hidden: 0 },
    });
  } catch (error) {
    return res.status(500).json({ status: "error", message: error.message });
  }
});

// 14. Resolve a report (admin only)

app.post("/api/admin/reports/:id/resolve", authenticateToken, requireRole("ADMIN"), async (req, res) => {
  try {
    const reportId = Number(req.params.id);

    if (!reportId) {
      return res.status(400).json({ status: "error", message: "Invalid report id." });
    }

    const [rows] = await pool.execute(
      `SELECT id, status FROM reports WHERE id = ? LIMIT 1`,
      [reportId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ status: "error", message: "Report not found." });
    }

    if (rows[0].status !== "OPEN") {
      return res.status(409).json({ status: "error", message: "Report is not OPEN." });
    }

    await pool.execute(
      `UPDATE reports SET status = 'RESOLVED' WHERE id = ?`,
      [reportId]
    );

    return res.json({
      status: "ok",
      message: "Report resolved ✅",
      report: { id: reportId, status: "RESOLVED" },
    });
  } catch (error) {
    return res.status(500).json({ status: "error", message: error.message });
  }
});

// 15. Get confession reports (admin only)

app.get("/api/admin/confession-reports", authenticateToken, requireRole("ADMIN"), async (req, res) => {
  try {
    const sql = `
      SELECT
        cr.id AS report_id,
        cr.reason,
        cr.details,
        cr.status,
        cr.created_at AS reported_at,

        reporter.id AS reporter_id,
        reporter.full_name AS reporter_name,
        reporter.email AS reporter_email,

        c.id AS confession_id,
        c.content AS confession_content,
        c.is_hidden,
        c.hidden_reason,
        c.hidden_at
      FROM confession_reports cr
      JOIN users reporter ON reporter.id = cr.reporter_user_id
      JOIN confessions c ON c.id = cr.confession_id
      WHERE cr.status = 'OPEN'
      ORDER BY cr.created_at DESC
      LIMIT 100
    `;

    const [rows] = await pool.execute(sql);

    return res.json({ status: "ok", count: rows.length, reports: rows });
  } catch (error) {
    return res.status(500).json({ status: "error", message: error.message });
  }
});
// 16. Hide a confession (admin only)

app.post("/api/admin/confessions/:id/hide", authenticateToken, requireRole("ADMIN"), async (req, res) => {
  try {
    const confessionId = Number(req.params.id);
    const { reason } = req.body;

    if (!confessionId) {
      return res.status(400).json({ status: "error", message: "Invalid confession id." });
    }

    const [rows] = await pool.execute(
      `SELECT * FROM confessions WHERE id = ? LIMIT 1`,
      [confessionId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ status: "error", message: "Confession not found." });
    }

    if (rows[0].is_hidden === 1) {
      return res.status(409).json({ status: "error", message: "Confession is already hidden." });
    }

    const safeReason = (reason && reason.trim().length > 0) ? reason.trim().slice(0, 255) : "Hidden by admin";

    await pool.execute(
      `UPDATE confessions
       SET is_hidden = 1,
           hidden_reason = ?,
           hidden_by_user_id = ?,
           hidden_at = NOW()
       WHERE id = ?`,
      [safeReason, req.user.id, confessionId]
    );

    return res.json({
      status: "ok",
      message: "Confession hidden ✅",
      confession: { id: confessionId, is_hidden: 1, hidden_reason: safeReason },
    });
  } catch (error) {
    return res.status(500).json({ status: "error", message: error.message });
  }
});

// 17. Unhide a confession (admin only)

app.post("/api/admin/confessions/:id/unhide", authenticateToken, requireRole("ADMIN"), async (req, res) => {
  try {
    const confessionId = Number(req.params.id);

    if (!confessionId) {
      return res.status(400).json({ status: "error", message: "Invalid confession id." });
    }

    const [rows] = await pool.execute(
      `SELECT * FROM confessions WHERE id = ? LIMIT 1`,
      [confessionId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ status: "error", message: "Confession not found." });
    }

    if (rows[0].is_hidden === 0) {
      return res.status(409).json({ status: "error", message: "Confession is not hidden." });
    }

    await pool.execute(
      `UPDATE confessions
       SET is_hidden = 0,
           hidden_reason = NULL,
           hidden_by_user_id = NULL,
           hidden_at = NULL
       WHERE id = ?`,
      [confessionId]
    );

    return res.json({
      status: "ok",
      message: "Confession unhidden ✅",
      confession: { id: confessionId, is_hidden: 0 },
    });
  } catch (error) {
    return res.status(500).json({ status: "error", message: error.message });
  }
});

// 18. Resolve a confession report (admin only)
app.post("/api/admin/confession-reports/:id/resolve", authenticateToken, requireRole("ADMIN"), async (req, res) => {
  try {
    const reportId = Number(req.params.id);

    if (!reportId) {
      return res.status(400).json({ status: "error", message: "Invalid report id." });
    }

    const [rows] = await pool.execute(
      `SELECT id, status FROM confession_reports WHERE id = ? LIMIT 1`,
      [reportId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ status: "error", message: "Report not found." });
    }

    if (rows[0].status !== "OPEN") {
      return res.status(409).json({ status: "error", message: "Report is not OPEN." });
    }

    await pool.execute(
      `UPDATE confession_reports SET status = 'RESOLVED' WHERE id = ?`,
      [reportId]
    );

    return res.json({
      status: "ok",
      message: "Confession report resolved ✅",
      report: { id: reportId, status: "RESOLVED" },
    });
  } catch (error) {
    return res.status(500).json({ status: "error", message: error.message });
  }
});

// 9B-3A. Admin: list club join requests
app.get("/api/admin/club-join-requests", authenticateToken, requireRole("ADMIN"), async (req, res) => {
  try {
    const status = (req.query.status || "PENDING").toUpperCase();
    const allowed = ["PENDING", "APPROVED", "REJECTED"];

    if (!allowed.includes(status)) {
      return res.status(400).json({ status: "error", message: "Invalid status." });
    }

const [rows] = await pool.execute(
  `
  SELECT 
    r.id AS request_id,
    r.club_id,
    c.name AS club_name,
    r.user_id,
    u.full_name,
    u.email,
    u.role AS user_role,
    r.status,
    r.requested_at
  FROM club_join_requests r
  JOIN clubs c ON c.id = r.club_id
  JOIN users u ON u.id = r.user_id
  WHERE r.status = ?
  ORDER BY r.requested_at DESC
  LIMIT 100
  `,
  [status]
);

    return res.json({ status: "ok", count: rows.length, requests: rows });
  } catch (error) {
    return res.status(500).json({ status: "error", message: error.message });
  }
});


// 9B-3B. Admin: approve a club join request
app.post(
  "/api/admin/club-join-requests/:requestId/approve",
  authenticateToken,
  requireRole("ADMIN"),
  async (req, res) => {
    try {
      const requestId = Number(req.params.requestId);
      if (!requestId) {
        return res.status(400).json({ status: "error", message: "Invalid request id." });
      }

      // Fetch request
      const [reqRows] = await pool.execute(
        `SELECT id, club_id, user_id, status FROM club_join_requests WHERE id = ? LIMIT 1`,
        [requestId]
      );

      if (reqRows.length === 0) {
        return res.status(404).json({ status: "error", message: "Join request not found." });
      }

      const jr = reqRows[0];

      if (jr.status !== "PENDING") {
        return res.status(409).json({
          status: "error",
          message: `Request already ${jr.status}.`,
        });
      }

await pool.execute(
  `UPDATE club_join_requests
   SET status = 'APPROVED',
       decided_at = CURRENT_TIMESTAMP,
       decided_by_user_id = ?
   WHERE id = ?`,
  [req.user.id, requestId]
);

      // Add/activate membership (upsert behavior)
      // If user already exists in club_members (LEFT), set ACTIVE again
      const [existingMember] = await pool.execute(
        `SELECT id FROM club_members WHERE club_id = ? AND user_id = ? LIMIT 1`,
        [jr.club_id, jr.user_id]
      );

      if (existingMember.length > 0) {
        await pool.execute(
          `UPDATE club_members SET status = 'ACTIVE', role = 'MEMBER' WHERE club_id = ? AND user_id = ?`,
          [jr.club_id, jr.user_id]
        );
      } else {
        await pool.execute(
          `INSERT INTO club_members (club_id, user_id, role, status) VALUES (?, ?, 'MEMBER', 'ACTIVE')`,
          [jr.club_id, jr.user_id]
        );
      }

      return res.json({
        status: "ok",
        message: "Join request approved ✅",
        approved: { request_id: requestId, club_id: jr.club_id, user_id: jr.user_id },
      });
    } catch (error) {
      return res.status(500).json({ status: "error", message: error.message });
    }
  }
);

// 9B-3C. Admin: reject a club join request
app.post(
  "/api/admin/club-join-requests/:requestId/reject",
  authenticateToken,
  requireRole("ADMIN"),
  async (req, res) => {
    try {
      const requestId = Number(req.params.requestId);
      if (!requestId) {
        return res.status(400).json({ status: "error", message: "Invalid request id." });
      }

      const [reqRows] = await pool.execute(
        `SELECT id, status FROM club_join_requests WHERE id = ? LIMIT 1`,
        [requestId]
      );

      if (reqRows.length === 0) {
        return res.status(404).json({ status: "error", message: "Join request not found." });
      }

      if (reqRows[0].status !== "PENDING") {
        return res.status(409).json({
          status: "error",
          message: `Request already ${reqRows[0].status}.`,
        });
      }

await pool.execute(
  `UPDATE club_join_requests
   SET status = 'REJECTED',
       decided_at = CURRENT_TIMESTAMP,
       decided_by_user_id = ?
   WHERE id = ?`,
  [req.user.id, requestId]
);

      return res.json({ status: "ok", message: "Join request rejected ✅", request_id: requestId });
    } catch (error) {
      return res.status(500).json({ status: "error", message: error.message });
    }
  }
);

// 9C-2B. Admin: Pin a Parents Hub post (only one pinned at a time)
app.post("/api/admin/posts/:id/pin", authenticateToken, requireRole("ADMIN"), async (req, res) => {
  try {
    const postId = Number(req.params.id);
    if (!postId) {
      return res.status(400).json({ status: "error", message: "Invalid post id." });
    }

    // Ensure post exists and is a Parents Hub post
    const [rows] = await pool.execute(
      `SELECT id, audience, is_deleted, is_hidden FROM posts WHERE id = ? LIMIT 1`,
      [postId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ status: "error", message: "Post not found." });
    }

    if (rows[0].audience !== "PARENTS") {
      return res.status(403).json({
        status: "error",
        message: "Only Parents Hub posts can be pinned.",
      });
    }

    if (rows[0].is_deleted === 1 || rows[0].is_hidden === 1) {
      return res.status(409).json({
        status: "error",
        message: "Cannot pin a hidden/deleted post.",
      });
    }

    // Unpin any existing pinned Parents Hub post
    await pool.execute(`UPDATE posts SET is_pinned = 0 WHERE audience = 'PARENTS' AND is_pinned = 1`);

    // Pin the selected post
    await pool.execute(`UPDATE posts SET is_pinned = 1 WHERE id = ?`, [postId]);

    return res.json({ status: "ok", message: "Post pinned ✅", post_id: postId });
  } catch (error) {
    return res.status(500).json({ status: "error", message: error.message });
  }
});

// 9C-2C. Admin: Unpin a Parents Hub post
app.post("/api/admin/posts/:id/unpin", authenticateToken, requireRole("ADMIN"), async (req, res) => {
  try {
    const postId = Number(req.params.id);
    if (!postId) {
      return res.status(400).json({ status: "error", message: "Invalid post id." });
    }

    const [result] = await pool.execute(
      `UPDATE posts SET is_pinned = 0 WHERE id = ? AND audience = 'PARENTS'`,
      [postId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        status: "error",
        message: "Pinned Parents Hub post not found.",
      });
    }

    return res.json({ status: "ok", message: "Post unpinned ✅", post_id: postId });
  } catch (error) {
    return res.status(500).json({ status: "error", message: error.message });
  }
});

// 9C-3B. Get active campus alert (any authenticated user)
app.get("/api/alerts/active", authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT id, message, level, created_at
       FROM campus_alerts
       WHERE is_active = 1
       ORDER BY created_at DESC
       LIMIT 1`
    );

    if (rows.length === 0) {
      return res.json({ status: "ok", active: false, alert: null });
    }

    return res.json({ status: "ok", active: true, alert: rows[0] });
  } catch (error) {
    return res.status(500).json({ status: "error", message: error.message });
  }
});

// 9C-3C. Admin: Create a new active alert (deactivates previous)
app.post("/api/admin/alerts", authenticateToken, requireRole("ADMIN"), async (req, res) => {
  try {
    const { message, level } = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ status: "error", message: "Alert message is required." });
    }

    if (message.length > 280) {
      return res.status(400).json({ status: "error", message: "Alert too long. Max 280 characters." });
    }

    const allowed = ["INFO", "WARNING", "URGENT"];
    const safeLevel = allowed.includes((level || "INFO").toUpperCase())
      ? level.toUpperCase()
      : "INFO";

    // deactivate any existing active alert
    await pool.execute(`UPDATE campus_alerts SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE is_active = 1`);

    // create new active alert
    const [result] = await pool.execute(
      `INSERT INTO campus_alerts (message, level, is_active, created_by_user_id)
       VALUES (?, ?, 1, ?)`,
      [message.trim(), safeLevel, req.user.id]
    );

    return res.status(201).json({
      status: "ok",
      message: "Campus alert created ✅",
      alert: { id: result.insertId, level: safeLevel, message: message.trim(), is_active: 1 },
    });
  } catch (error) {
    return res.status(500).json({ status: "error", message: error.message });
  }
});

// 9C-3D. Admin: Clear active campus alert
app.post("/api/admin/alerts/clear", authenticateToken, requireRole("ADMIN"), async (req, res) => {
  try {
    const [result] = await pool.execute(
      `UPDATE campus_alerts SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE is_active = 1`
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ status: "error", message: "No active alert to clear." });
    }

    return res.json({ status: "ok", message: "Campus alert cleared ✅" });
  } catch (error) {
    return res.status(500).json({ status: "error", message: error.message });
  }
});
// 9C-3C. Admin: Create a new active alert (deactivates previous)
app.post("/api/admin/alerts", authenticateToken, requireRole("ADMIN"), async (req, res) => {
  try {
    const { message, level } = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ status: "error", message: "Alert message is required." });
    }

    if (message.length > 280) {
      return res.status(400).json({ status: "error", message: "Alert too long. Max 280 characters." });
    }

    const allowed = ["INFO", "WARNING", "URGENT"];
    const safeLevel = allowed.includes((level || "INFO").toUpperCase())
      ? level.toUpperCase()
      : "INFO";

    // Deactivate any existing active alerts
    await pool.execute(
      `UPDATE campus_alerts
       SET is_active = 0, updated_at = CURRENT_TIMESTAMP
       WHERE is_active = 1`
    );

    // Create new active alert
    const [result] = await pool.execute(
      `INSERT INTO campus_alerts (message, level, is_active, created_by_user_id)
       VALUES (?, ?, 1, ?)`,
      [message.trim(), safeLevel, req.user.id]
    );

    return res.status(201).json({
      status: "ok",
      message: "Campus alert created ✅",
      alert: {
        id: result.insertId,
        message: message.trim(),
        level: safeLevel,
        is_active: 1,
      },
    });
  } catch (error) {
    return res.status(500).json({ status: "error", message: error.message });
  }
});

// 9C-3D. Admin: Clear active campus alert
app.post("/api/admin/alerts/clear", authenticateToken, requireRole("ADMIN"), async (req, res) => {
  try {
    const [result] = await pool.execute(
      `UPDATE campus_alerts
       SET is_active = 0, updated_at = CURRENT_TIMESTAMP
       WHERE is_active = 1`
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ status: "error", message: "No active alert to clear." });
    }

    return res.json({ status: "ok", message: "Campus alert cleared ✅" });
  } catch (error) {
    return res.status(500).json({ status: "error", message: error.message });
  }
});

// 11. Create a new post (protected route)

app.post("/api/posts", authenticateToken, async (req, res) => {
  try {
    const { content, audience } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        status: "error",
        message: "Post content is required.",
      });
    }

    // Keep it simple: limit post length (like social platforms)
    if (content.length > 500) {
      return res.status(400).json({
        status: "error",
        message: "Post too long. Maximum is 500 characters.",
      });
    }

    const allowedAudiences = ["STUDENTS", "PARENTS"];
    const safeAudience = allowedAudiences.includes(audience) ? audience : "STUDENTS";

    // ✅ RBAC: Only PARENT or ADMIN can post in Parents Hub
    if (safeAudience === "PARENTS" && !["PARENT", "ADMIN"].includes(req.user.role)) {
      return res.status(403).json({
        status: "error",
        message: "Only PARENT or ADMIN can post in Parents Hub.",
      });
    }

    // (Optional but recommended) Prevent parents from posting into STUDENTS feed
    // If you want parents to ONLY use Parents Hub, keep this block ON.
    if (safeAudience === "STUDENTS" && req.user.role === "PARENT") {
      return res.status(403).json({
        status: "error",
        message: "Parents cannot post in the Students feed.",
      });
    }

    const sql = `
      INSERT INTO posts (author_user_id, audience, content)
      VALUES (?, ?, ?)
    `;

    const [result] = await pool.execute(sql, [req.user.id, safeAudience, content]);

    return res.status(201).json({
      status: "ok",
      message: "Post created ✅",
      post: {
        id: result.insertId,
        author_user_id: req.user.id,
        audience: safeAudience,
        content,
      },
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
});

// 12. Get all posts (protected route)
app.get("/api/posts", authenticateToken, async (req, res) => {
  try {
    const audience = (req.query.audience || "STUDENTS").toUpperCase();
    const allowedAudiences = ["STUDENTS", "PARENTS"];

    if (!allowedAudiences.includes(audience)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid audience. Use STUDENTS or PARENTS.",
      });
    }

    // ✅ RBAC: Only PARENT or ADMIN can READ Parents Hub posts
    if (audience === "PARENTS" && !["PARENT", "ADMIN"].includes(req.user.role)) {
      return res.status(403).json({
        status: "error",
        message: "Access denied: Parents Hub is for PARENT and ADMIN only.",
      });
    }

const sql = `
  SELECT 
    p.id,
    p.content,
    p.audience,
    p.created_at,
    p.updated_at,
    u.id AS author_id,
    u.full_name AS author_name,
    u.role AS author_role,
    CASE WHEN u.role = 'ADMIN' THEN 1 ELSE 0 END AS author_is_verified
  FROM posts p
  JOIN users u ON u.id = p.author_user_id
  WHERE p.audience = ? AND p.is_deleted = 0 AND p.is_hidden = 0
  ORDER BY p.created_at DESC
  LIMIT 50
`;

    const [rows] = await pool.execute(sql, [audience]);

    return res.json({
      status: "ok",
      audience,
      count: rows.length,
      posts: rows,
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
});
// 13. Get all confessions (protected route, but confessions are anonymous and not linked to users)

app.get("/api/confessions", authenticateToken, async (req, res) => {

  // 🔐 RBAC: Only STUDENT or ADMIN can access confessions
if (!["STUDENT", "ADMIN"].includes(req.user.role)) {
  return res.status(403).json({
    status: "error",
    message: "Access denied: Confessions are for students only.",
  });
}
  try {
    const [rows] = await pool.execute(
      `SELECT id, content, created_at
       FROM confessions
       WHERE is_hidden = 0
       ORDER BY created_at DESC
       LIMIT 50`
    );

    return res.json({
      status: "ok",
      count: rows.length,
      confessions: rows,
    });
  } catch (error) {
    return res.status(500).json({ status: "error", message: error.message });
  }
});

// 14. Get all clubs (protected route, but anyone can see clubs; only members can post in them; club details are public)
app.get("/api/clubs", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const sql = `
      SELECT
        c.id,
        c.name,
        c.description,
        c.category,
        c.is_active,
        c.created_at,
        u.full_name AS created_by_name,

        -- total active members
        (
          SELECT COUNT(*)
          FROM club_members m
          WHERE m.club_id = c.id AND m.status = 'ACTIVE'
        ) AS members_count,

        -- membership status for THIS logged-in user
        CASE
          WHEN EXISTS (
            SELECT 1 FROM club_members m2
            WHERE m2.club_id = c.id AND m2.user_id = ? AND m2.status = 'ACTIVE'
          ) THEN 'MEMBER'

          WHEN EXISTS (
            SELECT 1 FROM club_join_requests r
            WHERE r.club_id = c.id AND r.user_id = ? AND r.status = 'PENDING'
          ) THEN 'REQUESTED'

          ELSE 'NONE'
        END AS membership_status
      FROM clubs c
      JOIN users u ON u.id = c.created_by_user_id
      ORDER BY c.created_at DESC
    `;

    const [rows] = await pool.execute(sql, [userId, userId]);

    return res.json({
      status: "ok",
      count: rows.length,
      clubs: rows,
    });
  } catch (error) {
    return res.status(500).json({ status: "error", message: error.message });
  }
});

// 15. Get club join requests (protected route, only CLUB_ADMIN or ADMIN can access)
app.get("/api/clubs/:id/requests", authenticateToken, async (req, res) => {
  try {
    const clubId = Number(req.params.id);
    if (!clubId) return res.status(400).json({ status: "error", message: "Invalid club id." });

    const admin = await isClubAdmin(clubId, req.user.id);
    if (!admin && req.user.role !== "ADMIN") {
      return res.status(403).json({ status: "error", message: "Forbidden." });
    }

    const [rows] = await pool.execute(
      `SELECT r.id, r.status, r.requested_at,
              u.id AS user_id, u.full_name, u.email
       FROM club_join_requests r
       JOIN users u ON u.id = r.user_id
       WHERE r.club_id = ? AND r.status = 'PENDING'
       ORDER BY r.requested_at ASC`,
      [clubId]
    );

    return res.json({ status: "ok", count: rows.length, requests: rows });
  } catch (error) {
    return res.status(500).json({ status: "error", message: error.message });
  }
});

// 16. Get club members (protected route, only CLUB_ADMIN or ADMIN can access)
app.get("/api/clubs/:id/members", authenticateToken, async (req, res) => {
  try {
    const clubId = Number(req.params.id);
    if (!clubId) return res.status(400).json({ status: "error", message: "Invalid club id." });

    const [rows] = await pool.execute(
      `SELECT m.role, m.status, m.joined_at,
              u.id AS user_id, u.full_name, u.email, u.role AS system_role
       FROM club_members m
       JOIN users u ON u.id = m.user_id
       WHERE m.club_id = ? AND m.status = 'ACTIVE'
       ORDER BY m.role DESC, u.full_name ASC`,
      [clubId]
    );

    return res.json({ status: "ok", count: rows.length, members: rows });
  } catch (error) {
    return res.status(500).json({ status: "error", message: error.message });
  }
});

// 17. Get club posts (protected route, only members can access)j
app.get("/api/clubs/:id/posts", authenticateToken, async (req, res) => {
  try {
    const clubId = Number(req.params.id);
    if (!clubId) return res.status(400).json({ status: "error", message: "Invalid club id." });

    const member = await isClubMember(clubId, req.user.id);
    if (!member && req.user.role !== "ADMIN") {
      return res.status(403).json({ status: "error", message: "Forbidden: members only." });
    }

    const [rows] = await pool.execute(
      `SELECT cp.id, cp.content, cp.created_at,
              u.id AS author_id, u.full_name AS author_name
       FROM club_posts cp
       JOIN users u ON u.id = cp.author_user_id
       WHERE cp.club_id = ? AND cp.is_hidden = 0
       ORDER BY cp.created_at DESC
       LIMIT 50`,
      [clubId]
    );

    return res.json({ status: "ok", count: rows.length, posts: rows });
  } catch (error) {
    return res.status(500).json({ status: "error", message: error.message });
  }
});

// 9C-3B. Get active campus alert (any authenticated user)
app.get("/api/alerts/active", authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT id, message, level, created_at
       FROM campus_alerts
       WHERE is_active = 1
       ORDER BY created_at DESC
       LIMIT 1`
    );

    if (rows.length === 0) {
      return res.json({ status: "ok", active: false, alert: null });
    }

    return res.json({ status: "ok", active: true, alert: rows[0] });
  } catch (error) {
    return res.status(500).json({ status: "error", message: error.message });
  }
});

// 13. Update a post (protected route)

app.put("/api/posts/:id", authenticateToken, async (req, res) => {
  try {
    const postId = Number(req.params.id);
    const { content } = req.body;

    if (!postId) {
      return res.status(400).json({ status: "error", message: "Invalid post id." });
    }

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ status: "error", message: "Post content is required." });
    }

    if (content.length > 500) {
      return res.status(400).json({ status: "error", message: "Post too long. Maximum is 500 characters." });
    }

    const post = await getPostById(postId);

    if (!post || post.is_deleted === 1) {
      return res.status(404).json({ status: "error", message: "Post not found." });
    }

    // Ownership check
    if (post.author_user_id !== req.user.id) {
      return res.status(403).json({ status: "error", message: "Forbidden: you can only edit your own posts." });
    }

    await pool.execute(
      `UPDATE posts SET content = ? WHERE id = ?`,
      [content, postId]
    );

    return res.json({
      status: "ok",
      message: "Post updated ✅",
      post: { id: postId, content },
    });
  } catch (error) {
    return res.status(500).json({ status: "error", message: error.message });
  }
});

// 14. Delete a post (protected route)

app.delete("/api/posts/:id", authenticateToken, async (req, res) => {
  try {
    const postId = Number(req.params.id);

    if (!postId) {
      return res.status(400).json({ status: "error", message: "Invalid post id." });
    }

    const post = await getPostById(postId);

    if (!post || post.is_deleted === 1) {
      return res.status(404).json({ status: "error", message: "Post not found." });
    }

    // Ownership check
    if (post.author_user_id !== req.user.id) {
      return res.status(403).json({ status: "error", message: "Forbidden: you can only delete your own posts." });
    }

    await pool.execute(
      `UPDATE posts SET is_deleted = 1 WHERE id = ?`,
      [postId]
    );

    return res.json({
      status: "ok",
      message: "Post deleted (soft) ✅. You can restore it.",
      post: { id: postId, is_deleted: 1 },
    });
  } catch (error) {
    return res.status(500).json({ status: "error", message: error.message });
  }
});

// 9B-1. Cancel a club join request (UNDO before approval)
app.delete("/api/clubs/:id/join-request", authenticateToken, async (req, res) => {
  try {
    // Admin shouldn't join/cancel; they supervise
    if (req.user.role === "ADMIN") {
      return res.status(403).json({
        status: "error",
        message: "Admins do not join clubs.",
      });
    }

    const clubId = Number(req.params.id);
    if (!clubId) {
      return res.status(400).json({ status: "error", message: "Invalid club id." });
    }

    // If already an ACTIVE member, you can't cancel a request (you should leave instead)
    const [memberRows] = await pool.execute(
      `SELECT status FROM club_members WHERE club_id = ? AND user_id = ? LIMIT 1`,
      [clubId, req.user.id]
    );

    if (memberRows.length > 0 && memberRows[0].status === "ACTIVE") {
      return res.status(409).json({
        status: "error",
        message: "You are already a member. Use Leave club instead.",
      });
    }

    // Delete pending request (most clean approach)
    // If your table uses a status column, this still works if you remove status filter.
    const [result] = await pool.execute(
      `DELETE FROM club_join_requests WHERE club_id = ? AND user_id = ?`,
      [clubId, req.user.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        status: "error",
        message: "No pending join request found to cancel.",
      });
    }

    return res.json({
      status: "ok",
      message: "Join request cancelled ✅",
    });
  } catch (error) {
    return res.status(500).json({ status: "error", message: error.message });
  }
});

// 9B-2. Leave a club (UNDO after approval)
app.post("/api/clubs/:id/leave", authenticateToken, async (req, res) => {
  try {
    // Admin shouldn't join/leave; they supervise
    if (req.user.role === "ADMIN") {
      return res.status(403).json({
        status: "error",
        message: "Admins do not join clubs.",
      });
    }

    const clubId = Number(req.params.id);
    if (!clubId) {
      return res.status(400).json({ status: "error", message: "Invalid club id." });
    }

    // Only ACTIVE members can leave
    const [rows] = await pool.execute(
      `SELECT role, status FROM club_members WHERE club_id = ? AND user_id = ? LIMIT 1`,
      [clubId, req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "You are not a member of this club.",
      });
    }

    if (rows[0].status !== "ACTIVE") {
      return res.status(409).json({
        status: "error",
        message: "You are not an active member.",
      });
    }

    // Optional policy: prevent club admin from leaving (keeps clubs stable)
    if (rows[0].role === "CLUB_ADMIN") {
      return res.status(403).json({
        status: "error",
        message: "Club admins cannot leave. Assign another admin first.",
      });
    }

    await pool.execute(
      `UPDATE club_members SET status = 'LEFT' WHERE club_id = ? AND user_id = ?`,
      [clubId, req.user.id]
    );

    return res.json({
      status: "ok",
      message: "You left the club ✅",
    });
  } catch (error) {
    return res.status(500).json({ status: "error", message: error.message });
  }
});

// 15. Restore a deleted post (protected route)

app.post("/api/posts/:id/restore", authenticateToken, async (req, res) => {
  try {
    const postId = Number(req.params.id);

    if (!postId) {
      return res.status(400).json({ status: "error", message: "Invalid post id." });
    }

    const post = await getPostById(postId);

    if (!post) {
      return res.status(404).json({ status: "error", message: "Post not found." });
    }

    // Ownership check
    if (post.author_user_id !== req.user.id) {
      return res.status(403).json({ status: "error", message: "Forbidden: you can only restore your own posts." });
    }

    await pool.execute(
      `UPDATE posts SET is_deleted = 0 WHERE id = ?`,
      [postId]
    );

    return res.json({
      status: "ok",
      message: "Post restored ✅",
      post: { id: postId, is_deleted: 0 },
    });
  } catch (error) {
    return res.status(500).json({ status: "error", message: error.message });
  }
});

// 16. Report a post (protected route)
app.post("/api/posts/:id/report", authenticateToken, async (req, res) => {
  try {
    const postId = Number(req.params.id);
    const { reason, details } = req.body;

    if (!postId) {
      return res.status(400).json({ status: "error", message: "Invalid post id." });
    }

    const allowedReasons = [
      "SPAM",
      "HARASSMENT",
      "HATE",
      "NUDITY",
      "VIOLENCE",
      "MISINFORMATION",
      "OTHER",
    ];

    const safeReason = allowedReasons.includes((reason || "").toUpperCase())
      ? reason.toUpperCase()
      : "OTHER";

    // Check post exists (even if hidden, reporting should still work; but if deleted, not found)
    const post = await getPostById(postId);
    if (!post || post.is_deleted === 1) {
      return res.status(404).json({ status: "error", message: "Post not found." });
    }

    // Prevent duplicate open reports from the same user for the same post
    const [existing] = await pool.execute(
      `SELECT id FROM reports WHERE reporter_user_id = ? AND post_id = ? AND status = 'OPEN' LIMIT 1`,
      [req.user.id, postId]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        status: "error",
        message: "You already reported this post. Admin will review it.",
      });
    }

    const sql = `
      INSERT INTO reports (reporter_user_id, post_id, reason, details)
      VALUES (?, ?, ?, ?)
    `;

    const [result] = await pool.execute(sql, [
      req.user.id,
      postId,
      safeReason,
      details || null,
    ]);

    return res.status(201).json({
      status: "ok",
      message: "Report submitted ✅",
      report: {
        id: result.insertId,
        post_id: postId,
        reason: safeReason,
      },
    });
  } catch (error) {
    return res.status(500).json({ status: "error", message: error.message });
  }
});

// 17. Post an anonymous confession (protected route, but no user info stored with confession)
app.post("/api/confessions", authenticateToken, async (req, res) => {

  // 🔐 RBAC: Only STUDENT or ADMIN can post confessions
if (!["STUDENT", "ADMIN"].includes(req.user.role)) {
  return res.status(403).json({
    status: "error",
    message: "Only students can post confessions.",
  });
}
  try {
    const { content } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ status: "error", message: "Confession content is required." });
    }

    if (content.length > 800) {
      return res.status(400).json({ status: "error", message: "Confession too long. Maximum is 800 characters." });
    }

    const [result] = await pool.execute(
      `INSERT INTO confessions (content) VALUES (?)`,
      [content.trim()]
    );

    return res.status(201).json({
      status: "ok",
      message: "Confession posted anonymously ✅",
      confession: { id: result.insertId, content: content.trim() },
    });
  } catch (error) {
    return res.status(500).json({ status: "error", message: error.message });
  }
});
// 18. Report a confession (protected route, but no user info stored with confession; reports are linked to users for accountability)
app.post("/api/confessions/:id/report", authenticateToken, async (req, res) => {

  // 🔐 RBAC: Only STUDENT or ADMIN can report confessions
if (!["STUDENT", "ADMIN"].includes(req.user.role)) {
  return res.status(403).json({
    status: "error",
    message: "Access denied: Confessions are for students only.",
  });
}
  try {
    const confessionId = Number(req.params.id);
    const { reason, details } = req.body;

    if (!confessionId) {
      return res.status(400).json({ status: "error", message: "Invalid confession id." });
    }

    const allowedReasons = ["SPAM", "HARASSMENT", "HATE", "NUDITY", "VIOLENCE", "MISINFORMATION", "OTHER"];
    const safeReason = allowedReasons.includes((reason || "").toUpperCase())
      ? reason.toUpperCase()
      : "OTHER";

    // Check confession exists
    const [confRows] = await pool.execute(
      `SELECT id, is_hidden FROM confessions WHERE id = ? LIMIT 1`,
      [confessionId]
    );

    if (confRows.length === 0) {
      return res.status(404).json({ status: "error", message: "Confession not found." });
    }

    // Prevent duplicate OPEN report by same user (works with your unique index too)
    const [existing] = await pool.execute(
      `SELECT id FROM confession_reports
       WHERE reporter_user_id = ? AND confession_id = ? AND status = 'OPEN'
       LIMIT 1`,
      [req.user.id, confessionId]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        status: "error",
        message: "You already reported this confession. Admin will review it.",
      });
    }

    const [result] = await pool.execute(
      `INSERT INTO confession_reports (reporter_user_id, confession_id, reason, details)
       VALUES (?, ?, ?, ?)`,
      [req.user.id, confessionId, safeReason, details || null]
    );

    return res.status(201).json({
      status: "ok",
      message: "Confession report submitted ✅",
      report: { id: result.insertId, confession_id: confessionId, reason: safeReason },
    });
  } catch (error) {
    // In case the unique index triggers (duplicate OPEN report)
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        status: "error",
        message: "You already reported this confession. Admin will review it.",
      });
    }

    return res.status(500).json({ status: "error", message: error.message });
  }
});

// 19. Create a new club (protected route, creator becomes CLUB_ADMIN)
app.post("/api/clubs", authenticateToken, async (req, res) => {
  try {
    const { name, description, category } = req.body;

    if (!name || name.trim().length < 3) {
      return res.status(400).json({ status: "error", message: "Club name must be at least 3 characters." });
    }

    const clubName = name.trim();

    // Create club
    const [result] = await pool.execute(
      `INSERT INTO clubs (name, description, category, created_by_user_id)
       VALUES (?, ?, ?, ?)`,
      [clubName, description || null, category || null, req.user.id]
    );

    const clubId = result.insertId;

    // Add creator as CLUB_ADMIN member
    await pool.execute(
      `INSERT INTO club_members (club_id, user_id, role)
       VALUES (?, ?, 'CLUB_ADMIN')`,
      [clubId, req.user.id]
    );

    return res.status(201).json({
      status: "ok",
      message: "Club created ✅",
      club: { id: clubId, name: clubName, description: description || null, category: category || null },
    });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ status: "error", message: "A club with that name already exists." });
    }
    return res.status(500).json({ status: "error", message: error.message });
  }
});

// 20. Request to join a club (protected route)
app.post("/api/clubs/:id/join-request", authenticateToken, async (req, res) => {
  try {
    const clubId = Number(req.params.id);
    if (!clubId) return res.status(400).json({ status: "error", message: "Invalid club id." });

    // Ensure club exists and active
    const [clubRows] = await pool.execute(
      `SELECT id, is_active FROM clubs WHERE id = ? LIMIT 1`,
      [clubId]
    );
    if (clubRows.length === 0 || clubRows[0].is_active === 0) {
      return res.status(404).json({ status: "error", message: "Club not found." });
    }

    // If already a member (ACTIVE), block
    const [memberRows] = await pool.execute(
      `SELECT id FROM club_members WHERE club_id = ? AND user_id = ? AND status = 'ACTIVE' LIMIT 1`,
      [clubId, req.user.id]
    );
    if (memberRows.length > 0) {
      return res.status(409).json({ status: "error", message: "You are already a member of this club." });
    }

    // If already has a pending request, block
    const [pendingRows] = await pool.execute(
      `SELECT id FROM club_join_requests
       WHERE club_id = ? AND user_id = ? AND status = 'PENDING' LIMIT 1`,
      [clubId, req.user.id]
    );
    if (pendingRows.length > 0) {
      return res.status(409).json({ status: "error", message: "You already have a pending request." });
    }

    const [result] = await pool.execute(
      `INSERT INTO club_join_requests (club_id, user_id) VALUES (?, ?)`,
      [clubId, req.user.id]
    );

    return res.status(201).json({
      status: "ok",
      message: "Join request submitted ✅",
      request: { id: result.insertId, club_id: clubId, status: "PENDING" },
    });
  } catch (error) {
    return res.status(500).json({ status: "error", message: error.message });
  }
});

// 21. Decide on a club join request (protected route, only CLUB_ADMIN or ADMIN can access)
app.post("/api/clubs/requests/:requestId/decide", authenticateToken, async (req, res) => {
  try {
    const requestId = Number(req.params.requestId);
    const { decision, club_id } = req.body;

    if (!requestId || !club_id) {
      return res.status(400).json({ status: "error", message: "requestId and club_id are required." });
    }

    const clubId = Number(club_id);
    const allowed = await isClubAdmin(clubId, req.user.id);
    if (!allowed && req.user.role !== "ADMIN") {
      return res.status(403).json({ status: "error", message: "Forbidden." });
    }

    const [rows] = await pool.execute(
      `SELECT * FROM club_join_requests WHERE id = ? AND club_id = ? LIMIT 1`,
      [requestId, clubId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ status: "error", message: "Join request not found." });
    }

    if (rows[0].status !== "PENDING") {
      return res.status(409).json({ status: "error", message: "Request is not PENDING." });
    }

    const upperDecision = (decision || "").toUpperCase();
    if (!["APPROVE", "REJECT"].includes(upperDecision)) {
      return res.status(400).json({ status: "error", message: "decision must be APPROVE or REJECT." });
    }

    const newStatus = upperDecision === "APPROVE" ? "APPROVED" : "REJECTED";

    await pool.execute(
      `UPDATE club_join_requests
       SET status = ?, decided_at = NOW(), decided_by_user_id = ?
       WHERE id = ?`,
      [newStatus, req.user.id, requestId]
    );

    // If approved: add as ACTIVE member
    if (newStatus === "APPROVED") {
      const userId = rows[0].user_id;

      // Upsert-ish: if exists with LEFT, set ACTIVE; else insert
      const [existingMember] = await pool.execute(
        `SELECT id, status FROM club_members WHERE club_id = ? AND user_id = ? LIMIT 1`,
        [clubId, userId]
      );

      if (existingMember.length === 0) {
        await pool.execute(
          `INSERT INTO club_members (club_id, user_id, role, status)
           VALUES (?, ?, 'MEMBER', 'ACTIVE')`,
          [clubId, userId]
        );
      } else {
        await pool.execute(
          `UPDATE club_members SET status = 'ACTIVE' WHERE id = ?`,
          [existingMember[0].id]
        );
      }
    }

    return res.json({
      status: "ok",
      message: `Request ${newStatus.toLowerCase()} ✅`,
      request: { id: requestId, status: newStatus },
    });
  } catch (error) {
    return res.status(500).json({ status: "error", message: error.message });
  }
});

// 22. Post an announcement in a club (protected route, only CLUB_ADMIN or ADMIN can post)
app.post("/api/clubs/:id/posts", authenticateToken, async (req, res) => {
  try {
    const clubId = Number(req.params.id);
    const { content } = req.body;

    if (!clubId) return res.status(400).json({ status: "error", message: "Invalid club id." });

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ status: "error", message: "Post content is required." });
    }

    if (content.length > 800) {
      return res.status(400).json({ status: "error", message: "Post too long. Maximum is 800 characters." });
    }

    const admin = await isClubAdmin(clubId, req.user.id);
    if (!admin && req.user.role !== "ADMIN") {
      return res.status(403).json({ status: "error", message: "Forbidden: only club admins can post announcements." });
    }

    const [result] = await pool.execute(
      `INSERT INTO club_posts (club_id, author_user_id, content)
       VALUES (?, ?, ?)`,
      [clubId, req.user.id, content.trim()]
    );

    return res.status(201).json({
      status: "ok",
      message: "Club announcement posted ✅",
      post: { id: result.insertId, club_id: clubId, content: content.trim() },
    });
  } catch (error) {
    return res.status(500).json({ status: "error", message: error.message });
  }
});
// 23. Cancel a club join request (protected route, user can cancel their own pending request)
app.post("/api/clubs/:id/join-request/cancel", authenticateToken, async (req, res) => {
  try {
    const clubId = Number(req.params.id);
    if (!clubId) {
      return res.status(400).json({ status: "error", message: "Invalid club id." });
    }

    const [result] = await pool.execute(
      `UPDATE club_join_requests
       SET status = 'REJECTED', decided_at = NOW(), decided_by_user_id = ?
       WHERE club_id = ? AND user_id = ? AND status = 'PENDING'`,
      [req.user.id, clubId, req.user.id]
    );

    if (result.affectedRows === 0) {
      return res.status(409).json({
        status: "error",
        message: "No pending join request to cancel.",
      });
    }

    return res.json({ status: "ok", message: "Join request cancelled ✅" });
  } catch (error) {
    return res.status(500).json({ status: "error", message: error.message });
  }
});
// 6. Start the server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
