"use client";
import React from "react";
import { Button } from "@/components/Button";

export interface ExtensionCallbackCardProps {
  status: "loading" | "success" | "error";
  errorMessage?: string;
  onRetry?: () => void;
}

export const ExtensionCallbackCard: React.FC<ExtensionCallbackCardProps> = ({
  status,
  errorMessage = "Failed to connect. Please try again.",
  onRetry,
}) => {
  const bannerConfig = {
    loading: {
      bg: "var(--color-status-info-bg)",
      border: "var(--color-status-info-border)",
      color: "var(--color-status-info-text)",
      icon: (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ animation: "tc-spin 1s linear infinite" }}
        >
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
      ),
      text: "Connecting your extension...",
    },
    success: {
      bg: "var(--color-status-success-bg)",
      border: "var(--color-status-success-border)",
      color: "var(--color-status-success-text)",
      icon: (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      ),
      text: "You're all set!",
    },
    error: {
      bg: "var(--color-status-error-bg)",
      border: "var(--color-status-error-border)",
      color: "var(--color-status-error-text)",
      icon: (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      ),
      text: errorMessage,
    },
  };

  const banner = bannerConfig[status];

  const headline =
    status === "loading"
      ? "Hang tight..."
      : status === "error"
        ? "Something went wrong."
        : "You can close this tab now.";

  const socialLinkStyle: React.CSSProperties = {
    color: "var(--color-text-muted)",
    transition: "color 0.2s ease",
    display: "block",
  };

  const onEnter = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.currentTarget.style.color = "var(--color-text-body)";
  };

  const onLeave = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.currentTarget.style.color = "var(--color-text-muted)";
  };

  return (
    <>
      <style>{`
        @keyframes tc-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes tc-fade-up {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .tc-card { animation: tc-fade-up 0.4s ease forwards; }
      `}</style>

      <div
        className="tc-card"
        style={{
          backgroundColor: "var(--color-surface-raised)",
          borderRadius: "var(--border-radius-2xl)",
          boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
          width: "100%",
          maxWidth: "600px",
        }}
      >
        <div
          style={{
            backgroundColor: banner.bg,
            border: `1px solid ${banner.border}`,
            color: banner.color,
            height: "48px",
            margin: "24px 24px 0 24px",
            borderRadius: "var(--border-radius-lg)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            fontFamily: "var(--font-family-primary)",
            fontSize: "var(--font-size-sm)",
            fontWeight: "var(--font-weight-semibold)",
          }}
        >
          {banner.icon}
          <span>{banner.text}</span>
        </div>

        <div
          style={{
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
          }}
        >
          <div style={{ marginTop: "24px" }}>
            <img
              src="/threadcub.svg"
              alt="ThreadCub"
              style={{ width: "80px", height: "80px", display: "block" }}
            />
          </div>

          <p
            style={{
              fontFamily: "var(--font-family-title)",
              fontSize: "var(--font-size-3xl)",
              fontWeight: "var(--font-weight-bold)",
              color: "var(--color-text-title)",
              margin: "24px 0 0 0",
              lineHeight: "var(--line-height-tight)",
            }}
          >
            {headline}
          </p>

          {status === "error" && onRetry && (
            <div style={{ marginTop: "16px" }}>
              <Button variant="primary" onClick={onRetry}>Try again</Button>
            </div>
          )}

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "6px",
              marginTop: "16px",
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--color-text-muted)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="4" r="2" />
              <circle cx="18" cy="8" r="2" />
              <circle cx="20" cy="16" r="2" />
              <path d="M9 10a5 5 0 0 1 5 5v3.5a3.5 3.5 0 0 1-6.84 1.045Q6.52 17.48 4.46 16.84A3.5 3.5 0 0 1 5.5 10Z" />
            </svg>
            <span
              style={{
                fontFamily: "var(--font-family-primary)",
                fontSize: "var(--font-size-sm)",
                color: "var(--color-text-muted)",
              }}
            >
              Tiny paws. Mighty exports.
            </span>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "24px",
              marginTop: "32px",
              paddingBottom: "8px",
            }}
          >
            <a
              href="https://discord.com/invite/PDjByPDqRR"
              target="_blank"
              rel="noopener noreferrer"
              title="Discord"
              style={socialLinkStyle}
              onMouseEnter={onEnter}
              onMouseLeave={onLeave}
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057.1 18.079.11 18.1.128 18.114a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
              </svg>
            </a>

            <a
              href="https://substack.com/@threadcub"
              target="_blank"
              rel="noopener noreferrer"
              title="Substack"
              style={socialLinkStyle}
              onMouseEnter={onEnter}
              onMouseLeave={onLeave}
            >
              <svg
                width="20"
                height="22"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M22.539 8.242H1.46V5.406h21.08v2.836zM1.46 10.812V24L12 18.11 22.54 24V10.812H1.46zM22.54 0H1.46v2.836h21.08V0z" />
              </svg>
            </a>

            <a
              href="https://x.com/threadcub"
              target="_blank"
              rel="noopener noreferrer"
              title="X (Twitter)"
              style={socialLinkStyle}
              onMouseEnter={onEnter}
              onMouseLeave={onLeave}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.91-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </>
  );
};
