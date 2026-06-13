"use client";

import { useState, useEffect } from "react";
import { createSupabaseClient } from "@/lib/supabase";
import { useSearchParams } from "next/navigation";
import { ExtensionCallbackCard } from "@/components/ExtensionCallbackCard";


export default function ExtensionCallbackPage() {
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading",
  );
  const [errorMessage, setErrorMessage] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const searchParams = useSearchParams();
  const supabase = createSupabaseClient();

  const handleRetry = () => {
    setStatus("loading");
    setErrorMessage("");
    setRetryCount((c) => c + 1);
  };

  useEffect(() => {
    let dispatched = false;

    const dispatch = async (session: any) => {
      if (dispatched) return;
      dispatched = true;

      const extensionId =
        searchParams.get("extensionId") ||
        process.env.NEXT_PUBLIC_EXTENSION_ID;

      let sent = false;

      // Send token immediately — before encryption key fetch so the tab can close safely
      const chromeGlobal =
        typeof window !== "undefined" ? (window as any).chrome : undefined;
      if (chromeGlobal?.runtime && extensionId) {
        try {
          chromeGlobal.runtime.sendMessage(extensionId, {
            action: "storeAuthToken",
            token: session.access_token,
            refreshToken: session.refresh_token,
            encryptionKey: null,
          });
          sent = true;
        } catch (err) {
          console.warn(
            "[extension-callback] Failed to send via chrome.runtime:",
            err,
          );
        }
      }

      // Fallback: write to localStorage for content script to pick up
      try {
        localStorage.setItem(
          "threadcub_pending_auth",
          JSON.stringify({
            token: session.access_token,
            refreshToken: session.refresh_token,
            encryptionKey: null,
            ts: Date.now(),
          }),
        );
        sent = true;
      } catch (e) {
        console.warn("[extension-callback] localStorage fallback failed:", e);
      }

      if (!sent) {
        setErrorMessage("Failed to connect to the extension. Please try again.");
        setStatus("error");
        return;
      }

      setStatus("success");
      setTimeout(() => window.close(), 800);

      // Fetch encryption key in background and update both channels
      try {
        const siteUrl =
          process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
        const keyRes = await fetch(`${siteUrl}/api/user/encryption-key`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (keyRes.ok) {
          const keyData = await keyRes.json();
          const encryptionKey: string | null = keyData.encryptionKey || null;
          if (encryptionKey) {
            if (chromeGlobal?.runtime && extensionId) {
              try {
                chromeGlobal.runtime.sendMessage(extensionId, {
                  action: "storeAuthToken",
                  token: session.access_token,
                  refreshToken: session.refresh_token,
                  encryptionKey,
                });
              } catch (err) {
                console.warn(
                  "[extension-callback] Failed to update chrome.runtime with key:",
                  err,
                );
              }
            }
            try {
              localStorage.setItem(
                "threadcub_pending_auth",
                JSON.stringify({
                  token: session.access_token,
                  refreshToken: session.refresh_token,
                  encryptionKey,
                  ts: Date.now(),
                }),
              );
            } catch (e) {
              console.warn(
                "[extension-callback] localStorage key update failed:",
                e,
              );
            }
          }
        }
      } catch (keyErr) {
        console.warn("[extension-callback] Encryption key fetch error:", keyErr);
      }
    };

    // Primary path: works for sign-in where session cookies already exist
    supabase.auth.getSession().then(({ data: { session } }: { data: { session: any } }) => {
      if (session) dispatch(session);
    });

    // Fallback: for new-account signup, verifyOtp writes cookies asynchronously
    // so getSession() above may return null; onAuthStateChange fires once cookies land
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      if (session) dispatch(session);
    });

    const timeout = setTimeout(() => {
      if (!dispatched) {
        setErrorMessage("We couldn't connect to the extension. Close this tab and try signing in again from the extension popup.");
        setStatus("error");
      }
    }, 8000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [searchParams, supabase.auth, retryCount]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "var(--color-page-bg)",
        padding: "var(--spacing-16) var(--spacing-4)",
      }}
    >
      <ExtensionCallbackCard status={status} errorMessage={errorMessage} onRetry={handleRetry} />
    </div>
  );
}
