import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";
import express from "express";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, "..", "dist");
const hasDist = fs.existsSync(distDir);

const app = express();
const port = Number(process.env.PORT || 8080);
const allowedOrigin = process.env.CORS_ORIGIN || "*";

app.use(
  cors({
    origin: allowedOrigin,
  })
);
app.use(express.json({ limit: "1mb" }));

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabase =
  supabaseUrl && supabaseServiceRoleKey
    ? createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;

const getBearerToken = (req) => {
  const authHeader = req.headers.authorization || "";
  if (!authHeader.startsWith("Bearer ")) {
    return null;
  }
  const token = authHeader.slice("Bearer ".length).trim();
  return token.length > 0 ? token : null;
};

const createAuthedSupabaseClient = (accessToken) => {
  if (!supabaseUrl || !supabaseAnonKey || !accessToken) {
    return null;
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
};

const invokeEdgeFunction = async (functionName, payload, accessToken) => {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Server is missing SUPABASE_URL or SUPABASE_ANON_KEY.");
  }

  const authToken = accessToken || supabaseAnonKey;
  const response = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
      apikey: supabaseAnonKey,
    },
    body: JSON.stringify(payload ?? {}),
  });

  const result = await response.json().catch(() => ({ error: "Unknown error" }));
  if (!response.ok) {
    const errorMessage = result?.error || `HTTP ${response.status}: ${functionName} failed`;
    const error = new Error(errorMessage);
    error.status = response.status;
    throw error;
  }

  return result;
};

app.get("/api/health", (_req, res) => {
  res.status(200).json({
    ok: true,
    service: "kyzer-api",
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/courses/:courseId/share-preview", async (req, res) => {
  if (!supabase) {
    return res.status(500).json({
      ok: false,
      error: "Server is missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.",
    });
  }

  const { courseId } = req.params;
  if (!courseId) {
    return res.status(400).json({ ok: false, error: "courseId is required." });
  }

  try {
    const { data, error } = await supabase.rpc("get_course_share_preview", {
      p_course_id: courseId,
    });

    if (error) {
      return res.status(400).json({
        ok: false,
        error: "Could not fetch share preview.",
      });
    }

    if (!data) {
      return res.status(404).json({
        ok: false,
        error: "Course preview not found.",
      });
    }

    return res.status(200).json({ ok: true, data });
  } catch (_error) {
    return res.status(500).json({
      ok: false,
      error: "Unexpected server error.",
    });
  }
});

app.get("/api/certificates/:shareToken", async (req, res) => {
  if (!supabase) {
    return res.status(500).json({
      ok: false,
      error: "Server is missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.",
    });
  }

  const { shareToken } = req.params;
  if (!shareToken) {
    return res.status(400).json({ ok: false, error: "shareToken is required." });
  }

  try {
    const { data, error } = await supabase.rpc("get_certificate_by_share_token", {
      p_token: shareToken,
    });

    if (error) {
      return res.status(400).json({
        ok: false,
        error: "Could not fetch certificate.",
      });
    }

    if (!data) {
      return res.status(404).json({
        ok: false,
        error: "Certificate not found.",
      });
    }

    return res.status(200).json({ ok: true, data });
  } catch (_error) {
    return res.status(500).json({
      ok: false,
      error: "Unexpected server error.",
    });
  }
});

app.post("/api/auth/check-email", async (req, res) => {
  if (!supabase) {
    return res.status(500).json({
      ok: false,
      error: "Server is missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.",
    });
  }

  const email = typeof req.body?.email === "string" ? req.body.email.trim() : "";
  if (!email) {
    return res.status(400).json({ ok: false, error: "email is required." });
  }

  try {
    const { data, error } = await supabase.rpc("check_email_exists", {
      email_to_check: email,
    });

    if (error) {
      const functionMissing =
        error.code === "42883" || String(error.message || "").toLowerCase().includes("function");

      if (functionMissing) {
        return res.status(200).json({
          ok: true,
          exists: false,
          functionMissing: true,
        });
      }

      return res.status(400).json({
        ok: false,
        error: "Could not check email availability.",
      });
    }

    return res.status(200).json({
      ok: true,
      exists: data === true,
      functionMissing: false,
    });
  } catch (_error) {
    return res.status(500).json({
      ok: false,
      error: "Unexpected server error.",
    });
  }
});

app.post("/api/certificates/:certificateId/share-token", async (req, res) => {
  const accessToken = getBearerToken(req);
  if (!accessToken) {
    return res.status(401).json({
      ok: false,
      error: "Missing authorization token.",
    });
  }

  const userSupabase = createAuthedSupabaseClient(accessToken);
  if (!userSupabase) {
    return res.status(500).json({
      ok: false,
      error: "Server is missing SUPABASE_URL or SUPABASE_ANON_KEY.",
    });
  }

  const { certificateId } = req.params;
  if (!certificateId) {
    return res.status(400).json({ ok: false, error: "certificateId is required." });
  }

  try {
    const { data, error } = await userSupabase.rpc("mint_certificate_share_token", {
      p_certificate_id: certificateId,
    });

    if (error) {
      return res.status(400).json({
        ok: false,
        error: "Could not mint certificate share token.",
      });
    }

    const token = typeof data === "string" ? data : data != null ? String(data) : null;
    return res.status(200).json({
      ok: true,
      data: token && token.length > 0 ? token : null,
    });
  } catch (_error) {
    return res.status(500).json({
      ok: false,
      error: "Unexpected server error.",
    });
  }
});

app.post("/api/corporate/send-invitation-email", async (req, res) => {
  const { email, data } = req.body || {};
  if (!email || !data) {
    return res.status(400).json({ ok: false, error: "email and data are required." });
  }

  const accessToken = getBearerToken(req);

  try {
    const result = await invokeEdgeFunction(
      "send-invitation-email",
      { email, data },
      accessToken
    );
    return res.status(200).json({ ok: true, data: result });
  } catch (error) {
    const message = error?.message || "Failed to send invitation email.";
    if (error?.status === 404 || error?.status === 500) {
      return res.status(error.status).json({
        ok: false,
        error: "Edge Function not deployed. Please deploy send-invitation-email.",
      });
    }
    return res.status(400).json({ ok: false, error: message });
  }
});

app.post("/api/corporate/create-user-direct", async (req, res) => {
  const accessToken = getBearerToken(req);
  if (!accessToken) {
    return res.status(401).json({
      ok: false,
      error: "Missing authorization token.",
    });
  }

  try {
    const result = await invokeEdgeFunction("create-user-direct", req.body || {}, accessToken);
    return res.status(200).json({ ok: true, data: result });
  } catch (error) {
    const message = error?.message || "Failed to create user.";
    if (error?.status === 404 || error?.status === 500) {
      return res.status(error.status).json({
        ok: false,
        error: "Edge Function not deployed. Please deploy create-user-direct.",
      });
    }
    return res.status(400).json({ ok: false, error: message });
  }
});

app.post("/api/corporate/refresh-members-cache", async (req, res) => {
  const accessToken = getBearerToken(req);
  if (!accessToken) {
    return res.status(401).json({
      ok: false,
      error: "Missing authorization token.",
    });
  }

  const userSupabase = createAuthedSupabaseClient(accessToken);
  if (!userSupabase) {
    return res.status(500).json({
      ok: false,
      error: "Server is missing SUPABASE_URL or SUPABASE_ANON_KEY.",
    });
  }

  const orgId = typeof req.body?.orgId === "string" ? req.body.orgId : "";
  if (!orgId) {
    return res.status(400).json({ ok: false, error: "orgId is required." });
  }

  try {
    const { error } = await userSupabase.rpc("refresh_organization_members_cache", {
      org_id: orgId,
    });

    if (error) {
      const functionMissing =
        error.code === "42883" || String(error.message || "").toLowerCase().includes("function");
      if (functionMissing) {
        return res.status(200).json({
          ok: true,
          functionMissing: true,
        });
      }

      return res.status(400).json({
        ok: false,
        error: "Could not refresh cached organization members.",
      });
    }

    return res.status(200).json({ ok: true, functionMissing: false });
  } catch (_error) {
    return res.status(500).json({
      ok: false,
      error: "Unexpected server error.",
    });
  }
});

if (hasDist) {
  app.use(
    express.static(distDir, {
      index: false,
      setHeaders: (res, filePath) => {
        if (filePath.endsWith("index.html")) {
          res.setHeader("Cache-Control", "no-cache");
        } else if (filePath.includes(`${path.sep}assets${path.sep}`)) {
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        }
      },
    })
  );

  app.use((req, res, next) => {
    if (req.method !== "GET") return next();
    if (req.path.startsWith("/api/")) return next();
    res.setHeader("Cache-Control", "no-cache");
    res.sendFile(path.join(distDir, "index.html"));
  });
}

app.use((_req, res) => {
  res.status(404).json({ ok: false, error: "Route not found." });
});

app.listen(port);
