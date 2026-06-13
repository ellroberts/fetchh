// app/api/conversations/save/route.js
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { embedConversation } from "lib/embed-conversation";
import { canImportConversation } from "lib/tier-limits";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

function getCorsHeaders(req) {
  const origin = (req && req.headers && req.headers.get("origin")) || "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, X-Requested-With",
    "Access-Control-Allow-Credentials": "true",
  };
}

const corsHeaders = getCorsHeaders(null);

export async function OPTIONS(req) {
  return new NextResponse(null, { status: 200, headers: getCorsHeaders(req) });
}

function createClientFromToken(token) {
  return createClient(supabaseUrl, supabaseAnon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}

async function createClientFromCookies() {
  const cookieStore = await cookies();
  return createServerClient(supabaseUrl, supabaseAnon, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {}
      },
    },
  });
}

function resolveBodyToken(raw) {
  try {
    const decoded = decodeURIComponent(raw);
    const arr = JSON.parse(decoded);
    if (Array.isArray(arr) && arr.length >= 1) return arr[0];
  } catch {}
  if (typeof raw === "string" && raw.split(".").length === 3) return raw;
  return null;
}

async function tryDecryptAESGCM(encryptedBase64, keyBase64) {
  try {
    const { createDecipheriv } = await import("crypto");
    const keyBuffer = Buffer.from(keyBase64, "hex");
    const encryptedBuffer = Buffer.from(encryptedBase64, "base64");
    const iv = encryptedBuffer.subarray(0, 12);
    const authTag = encryptedBuffer.subarray(encryptedBuffer.length - 16);
    const ciphertext = encryptedBuffer.subarray(
      12,
      encryptedBuffer.length - 16,
    );
    const decipher = createDecipheriv("aes-256-gcm", keyBuffer, iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);
    return JSON.parse(decrypted.toString("utf8"));
  } catch {
    return null;
  }
}

async function tryDecrypt(encryptedBase64, key) {
  return tryDecryptAESGCM(encryptedBase64, key);
}

async function getUserEncryptionKey(userId) {
  try {
    const { data, error } = await serviceClient
      .from("user_profiles")
      .select("encryption_key")
      .eq("id", userId)
      .single();
    if (error || !data?.encryption_key) return null;
    return data.encryption_key;
  } catch {
    return null;
  }
}

function detectPlatformFromData(data) {
  if (data.mapping && typeof data.mapping === "object") {
    const first = Object.values(data.mapping)[0];
    if (first?.message?.author?.role || first?.message?.content?.parts)
      return "chatgpt";
  }
  if (
    data.uuid ||
    (Array.isArray(data) &&
      data.some((m) => m.sender === "human" || m.sender === "assistant"))
  )
    return "claude";
  if (Array.isArray(data) && data.length > 0) {
    if (
      data.some(
        (m) =>
          (m.role === "user" || m.role === "assistant") &&
          (m.content || m.text) &&
          !m.parts,
      )
    )
      return "claude";
  }
  if (data.candidates || data.promptFeedback) return "gemini";
  if (data.messages && Array.isArray(data.messages)) {
    const first = data.messages[0];
    if (first?.author?.role || first?.content?.parts) return "chatgpt";
    if (first?.sender) return "claude";
  }
  return "unknown";
}

function extractNativeChatId(body, conversationData) {
  if (body.chat_id) return body.chat_id;
  const url = conversationData?.url || body.url || null;
  if (url) {
    const claudeMatch = url.match(/claude\.ai[^?]*\/chat\/([a-zA-Z0-9_-]+)/);
    if (claudeMatch) return claudeMatch[1];
    const chatgptMatch = url.match(/\/c\/([a-zA-Z0-9_-]+)/);
    if (chatgptMatch) return chatgptMatch[1];
    const grokMatch = url.match(/\/c\/([a-zA-Z0-9_-]+)/);
    if (grokMatch) return grokMatch[1];
    try {
      const urlObj = new URL(url);
      const conversationParam = urlObj.searchParams.get("conversation");
      if (conversationParam) return conversationParam;
    } catch {}
    const geminiMatch = url.match(/\/app\/([a-zA-Z0-9_-]+)/);
    if (geminiMatch) return geminiMatch[1];
    const perplexityMatch = url.match(/\/search\/([a-zA-Z0-9_-]+)/);
    if (perplexityMatch) return perplexityMatch[1];
    const deepseekMatch = url.match(/\/a\/chat\/s\/([a-zA-Z0-9_-]+)/);
    if (deepseekMatch) return deepseekMatch[1];
  }
  return null;
}

// ---------------------------------------------------------------------------
// Auto-summary trigger (fire-and-forget)
// ---------------------------------------------------------------------------

function triggerAutoSummary(conversationId, appBaseUrl, authToken) {
  const url = `${appBaseUrl}/api/quick-summary`;
  fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(authToken && { Authorization: `Bearer ${authToken}` }),
    },
    body: JSON.stringify({ conversationId }),
  })
    .then((res) => {
      if (!res.ok)
        res
          .text()
          .then((t) =>
            console.warn("[save] Auto-summary failed:", res.status, t),
          );
      else
        console.log(
          "[save] Auto-summary triggered successfully for:",
          conversationId,
        );
    })
    .catch((err) =>
      console.warn("[save] Auto-summary fetch error (non-fatal):", err.message),
    );
}

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(req) {
  const corsHeaders = getCorsHeaders(req);
  try {
    console.log("[save] POST request received");

    const body = await req.json();
    console.log("[save] RAW capture_method:", JSON.stringify(body.capture_method), "| type:", typeof body.capture_method, "| hasKey:", Object.prototype.hasOwnProperty.call(body, 'capture_method'));
    console.log("[save] Received body keys:", Object.keys(body));
    console.log("[save] capture_method:", body.capture_method, "| source_chat_url:", body.source_chat_url, "| parent_conversation_id:", body.parent_conversation_id);
    const conversation_id = body.conversation_id || null;

    const appBaseUrl = new URL(req.url).origin;

    let userId = null;
    let userEmail = null;
    let authMethod = "none";
    let authedClient = null;
    let authSessionId = null;

    const authHeader = req.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      try {
        const {
          data: { user },
          error,
        } = await serviceClient.auth.getUser(token);
        if (user && !error) {
          userId = user.id;
          userEmail = user.email || null;
          authMethod = "bearer";
          authedClient = createClientFromToken(token);
          console.log("[save] Authenticated via Bearer header:", user.email);
          try {
            const { data: sessionData } = await authedClient.auth.getSession();
            authSessionId = sessionData?.session?.access_token
              ? sessionData.session.access_token.substring(0, 36)
              : null;
          } catch {}
        } else {
          console.warn("[save] Bearer token invalid:", error?.message);
        }
      } catch (err) {
        console.error("[save] Bearer token error:", err);
      }
    }

    if (!userId && body.userAuthToken) {
      const token = resolveBodyToken(body.userAuthToken);
      if (token) {
        try {
          const {
            data: { user },
            error,
          } = await serviceClient.auth.getUser(token);
          if (user && !error) {
            userId = user.id;
            userEmail = user.email || null;
            authMethod = "token";
            authedClient = createClientFromToken(token);
            console.log("[save] Authenticated via body token:", user.email);
          }
        } catch (err) {
          console.error("[save] Body token error:", err);
        }
      }
    }

    if (!userId) {
      try {
        const cookieClient = await createClientFromCookies();
        const {
          data: { user },
          error,
        } = await cookieClient.auth.getUser();
        if (user && !error) {
          userId = user.id;
          userEmail = user.email || null;
          authMethod = "cookie";
          authedClient = cookieClient;
          console.log("[save] Authenticated via cookies:", user.email);
          try {
            const { data: sessionData } = await cookieClient.auth.getSession();
            authSessionId = sessionData?.session?.access_token
              ? sessionData.session.access_token.substring(0, 36)
              : null;
          } catch {}
        }
      } catch (err) {
        console.error("[save] Cookie auth error:", err);
      }
    }

    let guestSessionId = null;
    const incomingSessionId =
      body.session_id &&
      typeof body.session_id === "string" &&
      body.session_id.length > 0
        ? body.session_id
        : null;

    if (!userId) {
      if (incomingSessionId) {
        guestSessionId = incomingSessionId;
        authMethod = "guest";
        console.log("[save] Guest save with session_id:", guestSessionId);
      } else {
        // No auth token and no session_id — auto-generate a guest session so
        // the request is never rejected outright. The generated ID is returned
        // in the response so the client can persist it for future saves.
        guestSessionId = `tc_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
        authMethod = "guest";
        console.log("[save] No session_id provided — auto-generated guest session:", guestSessionId);
      }
    }

    console.log("[save] Auth resolved:", {
      authMethod,
      userId,
      guestSessionId,
      incomingSessionId,
      authSessionId,
    });

    let conversationData;
    let isEncrypted = false;

    if (body.encrypted_payload && typeof body.encrypted_payload === "string") {
      if (guestSessionId) {
        console.warn(
          "[save] Guest request sent encrypted_payload — guests must send plaintext conversationData",
        );
        return NextResponse.json(
          {
            error:
              "Guests cannot send encrypted payloads. Send conversationData instead.",
          },
          { status: 400, headers: corsHeaders },
        );
      }
      isEncrypted = true;
      console.log(
        "[save] encrypted_payload detected (length:",
        body.encrypted_payload.length,
        ")",
      );
      const userKey = await getUserEncryptionKey(userId);
      if (userKey) {
        const encFormat = body.encryption_format || "cryptojs";
        console.log("[save] Decryption format:", encFormat);
        conversationData = await tryDecrypt(
          body.encrypted_payload,
          userKey,
          encFormat,
        );
      }
      if (!conversationData) {
        console.error(
          "[save] Decryption failed for user",
          userId,
          "— per-user key missing or payload corrupt",
        );
        return NextResponse.json(
          {
            error: "Decryption failed",
            message:
              "Could not decrypt payload with your encryption key. Please re-login to sync your key.",
          },
          { status: 400, headers: corsHeaders },
        );
      }
      console.log(
        "[save] Decrypted successfully. Messages count:",
        conversationData.messages?.length || 0,
      );
    } else if (body.conversationData) {
      conversationData = body.conversationData;
      console.log("[save] Using plaintext conversationData");
    } else {
      console.warn(
        "[save] Body has neither encrypted_payload nor conversationData. Keys:",
        Object.keys(body),
      );
      return NextResponse.json(
        { error: "Missing conversation data or encrypted_payload" },
        { status: 400, headers: corsHeaders },
      );
    }

    const source = body.source || "unknown";
    let resolvedSource =
      body.platform ||
      (typeof conversationData === "object" && !Array.isArray(conversationData)
        ? conversationData.source
        : null) ||
      source;
    if (resolvedSource === "unknown" && typeof conversationData === "object") {
      resolvedSource = detectPlatformFromData(conversationData);
      console.log("[save] Auto-detected platform:", resolvedSource);
    }

    const nativeChatId = extractNativeChatId(body, conversationData);
    if (nativeChatId)
      console.log("[save] Native chat ID extracted:", nativeChatId);

    const processedData = processConversationData(
      conversationData,
      resolvedSource,
    );
    const conversationTitle =
      body.title ||
      (typeof conversationData === "object" ? conversationData.title : null) ||
      generateTitle(processedData.messages) ||
      "Untitled Conversation";

    const resolvedSessionId =
      guestSessionId || body.sessionId || authSessionId || null;
    const metadata = body.metadata || {};

    const sourceCreatedAt =
      (typeof conversationData === 'object' && !Array.isArray(conversationData) && conversationData?.source_created_at)
        ? conversationData.source_created_at
        : null;

    const conversationRecord = {
      title: conversationTitle,
      platform: resolvedSource,
      chat_id: nativeChatId,
      content: JSON.stringify(conversationData),
      messages: processedData.messages,
      message_count: processedData.messageCount,
      source: resolvedSource,
      tags: [],
      summary: generateSummary(processedData.messages),
      project_id: null,
      user_id: userId,
      user_email: userEmail,
      session_id: resolvedSessionId,
      thread_id: null,
      parent_conversation_id: body.parent_conversation_id || null,
      capture_method: body.capture_method || "save",
      claim_status: userId ? "claimed" : "unclaimed",
      metadata: {
        ...metadata,
        was_encrypted: isEncrypted,
        imported_via:
          authMethod === "bearer" || authMethod === "token"
            ? "chrome_extension"
            : authMethod === "guest"
              ? "chrome_extension_guest"
              : "web_interface",
        original_source: source,
        detected_platform: resolvedSource,
        platform_detection: source === "unknown" ? "auto-detected" : "provided",
        processed_at: body.timestamp || new Date().toISOString(),
        auth_method: authMethod,
        ...(sourceCreatedAt && { source_created_at: sourceCreatedAt }),
      },
    };

    console.log("[save] Attempting insert:", {
      title: conversationRecord.title,
      source: conversationRecord.source,
      platform: conversationRecord.platform,
      chat_id: conversationRecord.chat_id,
      isEncrypted,
      messageCount: conversationRecord.message_count,
      sessionId: resolvedSessionId,
      userId,
    });

    const dbClient = guestSessionId ? serviceClient : authedClient;

    // -- Fetch user tier once up-front, so it's available in all early-return paths
    let userTier = "free";
    if (userId) {
      try {
        const { data: tierProfile, error: tierFetchError } = await serviceClient
          .from("user_profiles")
          .select("subscription_tier")
          .eq("id", userId)
          .single();
        userTier = tierProfile?.subscription_tier ?? "free";
      } catch (tierCatchErr) {
        console.warn("[save] tier fetch threw — defaulting to free:", tierCatchErr.message);
      }
    }

    // -- 6a. Session→user upgrade
    // Only upgrade if the incoming save has the same or fewer messages than the
    // guest row. More messages = this is a "Continue chat" continuation, not a
    // re-save of the same conversation — let it fall through to a fresh insert.
    if (
      userId &&
      (nativeChatId || incomingSessionId) &&
      body.capture_method !== "continue"
    ) {
      try {
        let upgradeQuery = serviceClient
          .from("conversations")
          .select("id, session_id, message_count")
          .is("user_id", null)
          .not("session_id", "is", null)
          .order("created_at", { ascending: false })
          .limit(1);

        if (nativeChatId) {
          upgradeQuery = upgradeQuery.eq("chat_id", nativeChatId);
        } else {
          upgradeQuery = upgradeQuery.eq("session_id", incomingSessionId);
        }

        const { data: guestRow } = await upgradeQuery.maybeSingle();

        if (guestRow) {
          const existingCount = guestRow.message_count ?? 0;
          const newCount = conversationRecord.message_count ?? 0;

          if (newCount > existingCount) {
            // More messages than the guest row → this is a continuation, not a
            // re-save. Skip the upgrade and fall through to insert a new row.
            console.log(
              "[save] Skipping guest upgrade: new save has more messages (" +
                newCount +
                " vs " +
                existingCount +
                ") — treating as new conversation",
            );
          } else {
            // Same or fewer messages → genuine re-save / claim of the same conversation.
            console.log(
              "[save] Found guest row for upgrade — id:",
              guestRow.id,
              "matched via:",
              nativeChatId ? "chat_id" : "session_id",
            );
            const { error: upgradeError } = await serviceClient
              .from("conversations")
              .update({
                user_id: userId,
                user_email: userEmail,
                content: conversationRecord.content,
                messages: conversationRecord.messages,
                message_count: conversationRecord.message_count,
                title: conversationRecord.title,
                summary: conversationRecord.summary,
                metadata: {
                  ...conversationRecord.metadata,
                  upgraded_from_guest: true,
                  upgraded_at: new Date().toISOString(),
                },
              })
              .eq("id", guestRow.id);

            if (!upgradeError) {
              const shareableUrl = `https://threadcub.com/api/share/${guestRow.id}`;
              console.log(
                "[save] Guest row upgraded successfully:",
                guestRow.id,
              );

              const { data: existingRow } = await serviceClient
                .from("conversations")
                .select("quick_summary, has_embeddings")
                .eq("id", guestRow.id)
                .single();

              const summaryToken = req.headers
                .get("authorization")
                ?.replace("Bearer ", "");

              if (!existingRow?.quick_summary) {
                console.log(
                  "[save] quick_summary missing on upgraded row — generating now",
                );
                fetch(`${appBaseUrl}/api/quick-summary`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    ...(summaryToken && { Authorization: `Bearer ${summaryToken}` }),
  },
  body: JSON.stringify({ conversationId: data.id }),
}).catch((e) => console.warn("[save] Auto-summary error:", e.message));
              } else {
                console.log(
                  "[save] quick_summary already exists on upgraded row — skipping generation",
                );
              }

              // Auto-index if not already embedded — paid tiers only
              if (!existingRow?.has_embeddings && userTier !== "free") {
                embedConversation(guestRow.id).catch((err) =>
                  console.warn(
                    "[save] Auto-index failed (upgrade):",
                    err.message,
                  ),
                );
              }

              return NextResponse.json(
                {
                  success: true,
                  conversationId: guestRow.id,
                  shareableUrl,
                  authenticated: true,
                  wasEncrypted: isEncrypted,
                  wasDuplicate: true,
                  message: "Conversation claimed from guest session",
                },
                { headers: corsHeaders },
              );
            } else {
              console.warn(
                "[save] Guest row upgrade failed (non-fatal), will insert new row:",
                upgradeError.message,
              );
            }
          }
        }
      } catch (upgradeErr) {
        console.warn(
          "[save] Session→user upgrade check failed (non-fatal):",
          upgradeErr.message,
        );
      }
    }

    // -- 6a2. Guest re-save dedup: same chat_id + same session_id
    // Catches duplicate guest saves fired by the extension during OAuth redirects,
    // where the 10-second soft-dedup window may have already expired.
    if (
      guestSessionId &&
      conversationRecord.chat_id &&
      body.capture_method !== 'continue'
    ) {
      try {
        const { data: existingGuestRow } = await serviceClient
          .from('conversations')
          .select('id, message_count')
          .is('user_id', null)
          .eq('session_id', guestSessionId)
          .eq('chat_id', conversationRecord.chat_id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (existingGuestRow) {
          const existingCount = existingGuestRow.message_count ?? 0;
          const newCount = conversationRecord.message_count ?? 0;

          if (newCount <= existingCount) {
            console.log('[save] Guest re-save dedup: same chat_id + session_id, returning existing row:', existingGuestRow.id);
            const shareableUrl = `https://threadcub.com/api/share/${existingGuestRow.id}`;
            return NextResponse.json(
              {
                success: true,
                conversationId: existingGuestRow.id,
                shareableUrl,
                authenticated: false,
                wasEncrypted: isEncrypted,
                wasDuplicate: true,
                session_id: guestSessionId,
                message: 'Conversation already saved',
              },
              { headers: { ...corsHeaders, 'Set-Cookie': `threadcub_session_id=${guestSessionId}; Path=/; Max-Age=2592000; SameSite=None; Secure` } },
            );
          } else {
            // More messages than the existing guest row — update in place instead of inserting a duplicate
            console.log('[save] Guest re-save: updating existing guest row with more messages:', existingGuestRow.id);
            const { error: guestUpdateErr } = await serviceClient
              .from('conversations')
              .update({
                messages: conversationRecord.messages,
                message_count: conversationRecord.message_count,
                title: conversationRecord.title,
                summary: conversationRecord.summary,
                content: conversationRecord.content,
              })
              .eq('id', existingGuestRow.id);

            if (!guestUpdateErr) {
              const shareableUrl = `https://threadcub.com/api/share/${existingGuestRow.id}`;
              return NextResponse.json(
                {
                  success: true,
                  conversationId: existingGuestRow.id,
                  shareableUrl,
                  authenticated: false,
                  wasEncrypted: isEncrypted,
                  wasDuplicate: true,
                  session_id: guestSessionId,
                  message: 'Conversation updated',
                },
                { headers: { ...corsHeaders, 'Set-Cookie': `threadcub_session_id=${guestSessionId}; Path=/; Max-Age=2592000; SameSite=None; Secure` } },
              );
            } else {
              console.warn('[save] Guest row update failed (non-fatal), will insert new row:', guestUpdateErr.message);
            }
          }
        }
      } catch (guestDedupErr) {
        console.warn('[save] Guest re-save dedup check failed (non-fatal):', guestDedupErr.message);
      }
    }

    // -- 6b. Tier limit check (authenticated users only)
    if (userId) {
      try {
        const { count: conversationCount } = await serviceClient
          .from("conversations")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId);

        const atLimit = !canImportConversation(userTier, conversationCount ?? 0);

        if (atLimit) {
          console.log(
            "[save] Tier limit reached for user:",
            userId,
            "tier:",
            userTier,
            "count:",
            conversationCount,
          );
          return NextResponse.json(
            {
              error: "Conversation limit reached",
              tier: userTier,
              conversations_used: conversationCount,
              upgrade_required: true,
              message: `You've reached the conversation limit for your ${userTier} plan. Upgrade to save more conversations.`,
            },
            { status: 402, headers: corsHeaders },
          );
        }
      } catch (tierErr) {
        console.warn(
          "[save] Tier check failed (non-fatal), allowing save:",
          tierErr.message,
        );
      }
    }

    // -- Auto-link parent for continue saves (lookup by source chat URL)
    if (
      !conversationRecord.parent_conversation_id &&
      userId &&
      body.source_chat_url
    ) {
      try {
        const sourceChatId = extractNativeChatId({ url: body.source_chat_url }, null);
        if (sourceChatId) {
          const { data: parentConvo } = await serviceClient
            .from("conversations")
            .select("id")
            .eq("user_id", userId)
            .eq("chat_id", sourceChatId)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          if (parentConvo) {
            conversationRecord.parent_conversation_id = parentConvo.id;
            console.log(
              "[save] Auto-linked parent_conversation_id by chat_id:",
              parentConvo.id,
            );
          }
        }
      } catch (parentErr) {
        console.warn(
          "[save] Auto-parent lookup failed (non-fatal):",
          parentErr.message,
        );
      }
    }

    // -- Compute continuation depth + append title suffix
    let continuationNumber = 0;
    let rootTitle = null;
    if (conversationRecord.parent_conversation_id) {
      try {
        let depth = 0;
        let currentId = conversationRecord.parent_conversation_id;
        const visited = new Set();
        while (currentId && !visited.has(currentId)) {
          visited.add(currentId);
          const { data: row } = await serviceClient
            .from("conversations")
            .select("parent_conversation_id, title")
            .eq("id", currentId)
            .maybeSingle();
          if (!row) break;
          depth += 1;
          rootTitle = row.title;
          currentId = row.parent_conversation_id;
        }
        continuationNumber = depth;
        conversationRecord.title = `${conversationRecord.title} (cont ${depth})`;
        console.log("[save] Continuation depth", depth, "— root:", rootTitle, "— title:", conversationRecord.title);
      } catch (depthErr) {
        console.warn("[save] Continuation depth lookup failed (non-fatal):", depthErr.message);
      }
    }

    // -- 6b2. Authenticated re-save dedup (same chat_id, same user)
    if (
      userId &&
      conversationRecord.chat_id &&
      body.capture_method !== "continue"
    ) {
      try {
        const { data: existingChatRow } = await serviceClient
          .from("conversations")
          .select("id, quick_summary, has_embeddings")
          .eq("user_id", userId)
          .eq("chat_id", conversationRecord.chat_id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (existingChatRow) {
          console.log(
            "[save] Authenticated re-save of same chat_id — updating existing row:",
            existingChatRow.id,
          );
          const { error: updateErr } = await serviceClient
            .from("conversations")
            .update({
              messages: conversationRecord.messages,
              message_count: conversationRecord.message_count,
              platform: conversationRecord.platform,
              updated_at: new Date().toISOString(),
              capture_method: conversationRecord.capture_method,
              parent_conversation_id: conversationRecord.parent_conversation_id,
            })
            .eq("id", existingChatRow.id);
          if (!updateErr) {
            if (!existingChatRow.has_embeddings && userTier !== "free") {
              embedConversation(existingChatRow.id).catch((err) =>
                console.warn(
                  "[save] Auto-index failed (re-save update):",
                  err.message,
                ),
              );
            }
            const shareableUrl = `https://threadcub.com/api/share/${existingChatRow.id}`;
            return NextResponse.json(
              {
                success: true,
                conversationId: existingChatRow.id,
                shareableUrl,
                authenticated: true,
                wasEncrypted: isEncrypted,
                wasDuplicate: true,
                message: "Conversation updated",
              },
              { headers: corsHeaders },
            );
          } else {
            console.warn(
              "[save] Re-save update failed (non-fatal), will insert new row:",
              updateErr.message,
            );
          }
        }
      } catch (reSaveErr) {
        console.warn(
          "[save] Re-save dedup check failed (non-fatal):",
          reSaveErr.message,
        );
      }
    }
    // -- 6c. Soft dedup
    if (body.capture_method === "continue") {
      console.log(
        "[save] Skipping dedup for continue save — inserting fresh row",
      );
    } else {
      // Fingerprint now includes message_count so that a "Continue chat" save
      // (same title + platform but more messages) is never blocked as a duplicate.
      // Window tightened from 60s → 10s to further reduce false positives.
      try {
        const tenSecondsAgo = new Date(Date.now() - 10000).toISOString();
        const dedupQuery = dbClient
          .from("conversations")
          .select("id")
          .eq("title", conversationRecord.title)
          .eq("platform", conversationRecord.platform)
          .eq("message_count", conversationRecord.message_count)
          .gte("created_at", tenSecondsAgo)
          .limit(1);

        if (userId) dedupQuery.eq("user_id", userId);
        else if (guestSessionId) dedupQuery.eq("session_id", guestSessionId);

        const { data: existingRow } = await dedupQuery.maybeSingle();

        if (existingRow) {
          console.log(
            "[save] Duplicate detected within 10s (same title, platform, message_count), skipping insert. Existing id:",
            existingRow.id,
          );
          const shareableUrl = `https://threadcub.com/api/share/${existingRow.id}`;
          return NextResponse.json(
            {
              success: true,
              conversationId: existingRow.id,
              shareableUrl,
              authenticated: !!userId,
              wasEncrypted: isEncrypted,
              wasDuplicate: true,
              message: "Conversation already saved recently",
            },
            { headers: corsHeaders },
          );
        }
      } catch (dedupErr) {
        console.warn(
          "[save] Dedup check failed (non-fatal):",
          dedupErr.message,
        );
      }
    } // end dedup skip


    // 6d. Thread assignment
    // Assign thread_id before insert based on two signals:
    // 1. parent_conversation_id - join the parent's thread
    // 2. matching chat_id - join the existing thread for that native chat
    try {
      if (conversationRecord.parent_conversation_id) {
        const { data: parentRow } = await serviceClient
          .from("conversations")
          .select("id, thread_id")
          .eq("id", conversationRecord.parent_conversation_id)
          .maybeSingle();
        if (parentRow) {
          conversationRecord.thread_id = parentRow.thread_id || parentRow.id;
        }
      } else if (nativeChatId) {
        const { data: existingChat } = await serviceClient
          .from("conversations")
          .select("id, thread_id")
          .eq("chat_id", nativeChatId)
          .not("id", "is", null)
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();
        if (existingChat) {
          conversationRecord.thread_id =
            existingChat.thread_id || existingChat.id;
        }
      }
    } catch (threadErr) {
      console.warn(
        "[save] Thread assignment failed (non-fatal):",
        threadErr.message,
      );
    }

    if (conversation_id) conversationRecord.id = conversation_id;

    const { data, error } = await dbClient
      .from("conversations")
      .upsert([conversationRecord], { onConflict: 'id' })
      .select()
      .maybeSingle();

    if (error) {
      if (error.code === "23505") {
        console.warn(
          "[save] Duplicate conversation skipped (23505):",
          error.details || error.message,
        );
        try {
          // Prefer chat_id + user/session lookup (precise); fall back to
          // title + platform only when chat_id is unavailable.
          let dedupFallback;
          if (conversationRecord.chat_id) {
            dedupFallback = dbClient
              .from("conversations")
              .select("id")
              .eq("chat_id", conversationRecord.chat_id)
              .is("parent_conversation_id", null)
              .order("created_at", { ascending: false })
              .limit(1);
            if (userId) dedupFallback = dedupFallback.eq("user_id", userId);
            else if (guestSessionId)
              dedupFallback = dedupFallback.eq("session_id", guestSessionId);
          } else {
            dedupFallback = dbClient
              .from("conversations")
              .select("id")
              .eq("title", conversationRecord.title)
              .eq("platform", conversationRecord.platform)
              .order("created_at", { ascending: false })
              .limit(1);
            if (userId) dedupFallback = dedupFallback.eq("user_id", userId);
            else if (guestSessionId)
              dedupFallback = dedupFallback.eq("session_id", guestSessionId);
          }
          const { data: existingRow23505 } = await dedupFallback.maybeSingle();
          if (existingRow23505) {
            const shareableUrl = `https://threadcub.com/api/share/${existingRow23505.id}`;
            return NextResponse.json(
              {
                success: true,
                conversationId: existingRow23505.id,
                shareableUrl,
                message: "Conversation already saved",
                wasDuplicate: true,
                authenticated: !!userId,
                wasEncrypted: isEncrypted,
              },
              { headers: corsHeaders },
            );
          }
        } catch (fallbackErr) {
          console.warn(
            "[save] 23505 fallback lookup failed:",
            fallbackErr.message,
          );
        }
        return NextResponse.json(
          {
            success: true,
            message: "Conversation already saved",
            wasDuplicate: true,
            authenticated: !!userId,
            wasEncrypted: isEncrypted,
          },
          { headers: corsHeaders },
        );
      }

      console.error(
        "[save] Supabase insert error (full):",
        JSON.stringify(error, null, 2),
      );
      const isRLS =
        error.code === "42501" ||
        (error.message && error.message.includes("row-level security"));
      return NextResponse.json(
        {
          error: "Failed to save conversation",
          details: error.message,
          hint: isRLS
            ? "Row-level security is blocking the insert. Ensure the conversations table has an INSERT policy."
            : error.hint || undefined,
          code: error.code,
        },
        { status: 500, headers: corsHeaders },
      );
    }

    if (!data) {
      console.log(
        "[save] Duplicate conversation skipped (insert returned no row)",
      );
      try {
        const dedupFallback = dbClient
          .from("conversations")
          .select("id")
          .eq("title", conversationRecord.title)
          .eq("platform", conversationRecord.platform)
          .order("created_at", { ascending: false })
          .limit(1);
        if (userId) dedupFallback.eq("user_id", userId);
        else if (guestSessionId) dedupFallback.eq("session_id", guestSessionId);
        const { data: existingRowFallback } = await dedupFallback.maybeSingle();
        if (existingRowFallback) {
          const shareableUrl = `https://threadcub.com/api/share/${existingRowFallback.id}`;
          return NextResponse.json(
            {
              success: true,
              conversationId: existingRowFallback.id,
              shareableUrl,
              message: "Conversation already saved",
              wasDuplicate: true,
              authenticated: !!userId,
              wasEncrypted: isEncrypted,
            },
            { headers: corsHeaders },
          );
        }
      } catch (fallbackErr) {
        console.warn(
          "[save] !data fallback lookup failed:",
          fallbackErr.message,
        );
      }
      return NextResponse.json(
        {
          success: true,
          message: "Conversation already saved",
          wasDuplicate: true,
          authenticated: true,
          wasEncrypted: isEncrypted,
        },
        { headers: corsHeaders },
      );
    }

    console.log("[save] Conversation saved:", data.id);

    // ------------------------------------------------------------------
    // 7. Fire background jobs (logged-in users only — fire-and-forget).
    // ------------------------------------------------------------------
    if (userId) {
      const summaryToken = req.headers
        .get("authorization")
        ?.replace("Bearer ", "");

      // 7b. Auto-index (embeddings) — paid tiers only
      if (userTier !== "free") {
        embedConversation(data.id).catch((err) =>
          console.warn("[save] Auto-index failed:", err.message),
        );
      }
    }

    const shareableUrl = `https://threadcub.com/api/share/${data.id}`;
    const responseHeaders = { ...corsHeaders };
    if (guestSessionId) {
      responseHeaders["Set-Cookie"] =
        `threadcub_session_id=${guestSessionId}; Path=/; Max-Age=2592000; SameSite=None; Secure`;
    }

    return NextResponse.json(
      {
        success: true,
        conversationId: data.id,
        shareableUrl,
        summary: conversationRecord.summary,
        authenticated: !!userId,
        wasEncrypted: isEncrypted,
        wasDuplicate: false,
        session_id: guestSessionId || null,
        continuation_number: continuationNumber || null,
        root_title: rootTitle || null,
        message: userId
          ? "Conversation saved to your account"
          : "Conversation saved as guest",
      },
      { headers: responseHeaders },
    );
  } catch (error) {
    console.error("[save] Unexpected error:", error);
    console.error("[save] Stack:", error.stack);
    return NextResponse.json(
      {
        error: "Internal server error",
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500, headers: corsHeaders },
    );
  }
}

// ---------------------------------------------------------------------------
// Conversation data processors
// ---------------------------------------------------------------------------

function processConversationData(rawData, source) {
  let messages = [];
  let messageCount = 0;
  try {
    if (rawData.messages && Array.isArray(rawData.messages)) {
      messages = rawData.messages.map((msg) => ({
        role: msg.role || msg.sender || "unknown",
        content: extractMessageContent(msg),
        timestamp: msg.timestamp || msg.created_at || new Date().toISOString(),
      }));
      messageCount = messages.length;
      return { messages, messageCount };
    }
    switch (source.toLowerCase()) {
      case "chatgpt":
        messages = processChatGPTData(rawData);
        break;
      case "claude":
      case "claude.ai":
        messages = processClaudeData(rawData);
        break;
      case "gemini":
        messages = processGeminiData(rawData);
        break;
      default:
        messages = processGenericData(rawData);
        break;
    }
    messageCount = messages.length;
  } catch (err) {
    console.error("[save] Error processing conversation data:", err);
    messages = [
      {
        role: "system",
        content: "Error processing conversation data. Raw data stored.",
        timestamp: new Date().toISOString(),
      },
    ];
    messageCount = 1;
  }
  return { messages, messageCount };
}

function extractMessageContent(msg) {
  const raw = msg.content || msg.text || "";
  if (Array.isArray(raw)) {
    return raw
      .map((block) => {
        if (typeof block === "string") return block;
        if (block.type === "text") return block.text || "";
        if (block.type === "tool_use") return `[Tool: ${block.name}]`;
        if (block.type === "tool_result") return block.content || "";
        return "";
      })
      .filter(Boolean)
      .join("\n");
  }
  return raw;
}

function processChatGPTData(data) {
  if (data.mapping) {
    const messages = [];
    Object.values(data.mapping).forEach((node) => {
      if (node.message && node.message.content && node.message.content.parts) {
        messages.push({
          role: node.message.author.role,
          content: node.message.content.parts.join("\n"),
          timestamp: new Date(node.message.create_time * 1000).toISOString(),
        });
      }
    });
    return messages.filter((msg) => msg.content.trim() !== "");
  }
  return processGenericData(data);
}

function processClaudeData(data) {
  if (Array.isArray(data)) {
    return data.map((msg) => ({
      role: msg.role || (msg.sender === "human" ? "user" : "assistant"),
      content: extractMessageContent(msg),
      timestamp: msg.timestamp || new Date().toISOString(),
    }));
  }
  return processGenericData(data);
}

function processGeminiData(data) {
  return processGenericData(data);
}

function processGenericData(data) {
  if (Array.isArray(data)) {
    return data.map((item) => ({
      role: item.role || item.sender || "unknown",
      content: extractMessageContent(item) || item.message || "",
      timestamp: item.timestamp || item.created_at || new Date().toISOString(),
    }));
  }
  if (data.messages && Array.isArray(data.messages)) {
    return data.messages.map((msg) => ({
      role: msg.role || "unknown",
      content: extractMessageContent(msg),
      timestamp: msg.timestamp || new Date().toISOString(),
    }));
  }
  return [
    {
      role: "unknown",
      content: typeof data === "string" ? data : JSON.stringify(data),
      timestamp: new Date().toISOString(),
    },
  ];
}

function generateTitle(messages) {
  if (!messages || messages.length === 0) return null;
  const firstUserMessage = messages.find(
    (msg) => msg.role === "user" || msg.role === "human",
  );
  if (firstUserMessage && firstUserMessage.content) {
    const t = firstUserMessage.content.substring(0, 50).trim();
    return t.length === 50 ? t + "..." : t;
  }
  return "Conversation " + new Date().toLocaleDateString();
}

function generateSummary(messages) {
  if (!messages || messages.length === 0)
    return "No previous conversation context available.";
  const recentMessages = messages.slice(-3);
  const userMessages = messages.filter(
    (msg) => msg.role === "user" || msg.role === "human",
  );
  let summary = "";
  if (userMessages.length > 0) {
    const lastUserMessage = userMessages[userMessages.length - 1];
    summary = `Previous conversation context: "${lastUserMessage.content.substring(0, 100)}..."`;
    if (recentMessages.length > 1)
      summary += ` (${messages.length} total messages exchanged)`;
  } else {
    summary = `Continuing conversation with ${messages.length} previous messages.`;
  }
  return summary;
}
// deploy Wed Mar 25 04:36:44 PM UTC 2026
