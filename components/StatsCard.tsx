'use client'
import React, { cloneElement, isValidElement } from "react";
import { Plus } from "lucide-react";
import { IconButton } from "@/components/IconButton";
import { Badge } from "@/components/Badge";

export interface StatsCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  accent?: "teal" | "blue" | "amber" | "rose" | "green" | "default";
  isEmpty?: boolean;
  icon?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onAdd?: (e?: React.MouseEvent) => void;
  onClick?: () => void;
  "data-onboarding-card"?: string;
  selected?: boolean;
  comingSoon?: boolean;
  skeleton?: boolean;
  /** URL string → renders as <a>. Callback → fires on click. */
  learnHow?: string | (() => void);
  cap?: string | number;
  /** @deprecated use bottomSlot instead */
  resetDate?: string;
  bottomSlot?: React.ReactNode;
  children?: React.ReactNode;
}

export const StatsCard: React.FC<StatsCardProps> = ({
  label,
  value,
  subtitle,
  accent = "blue",
  isEmpty = false,
  icon,
  className = "",
  style,
  onAdd,
  onClick,
  "data-onboarding-card": dataOnboardingCard,
  selected = false,
  comingSoon = false,
  learnHow,
  cap,
  bottomSlot,
  skeleton = false,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  resetDate: _resetDate,
  children,
}) => {

  if (skeleton) {
    const shimmer: React.CSSProperties = {
      backgroundColor: 'var(--color-border-subtle)',
      borderRadius: 'var(--border-radius-sm)',
      animation: 'skeleton-pulse 1.5s ease-in-out infinite',
    };
    return (
      <div style={{
        position: 'relative',
        backgroundColor: 'transparent',
        borderRadius: 'var(--border-radius-lg)',
        border: '1px solid var(--color-border-subtle)',
        padding: '24px',
        minHeight: '188px',
        display: 'flex',
        flexDirection: 'column',
      }}>
        <div style={{ ...shimmer, width: 24, height: 24, marginBottom: '8px' }} />
        <div style={{ ...shimmer, width: '55%', height: 14, marginBottom: '8px' }} />
        <div style={{ ...shimmer, width: '40%', height: 48, marginBottom: '8px' }} />
        <div style={{ ...shimmer, width: '65%', height: 12 }} />
      </div>
    );
  }

  const getAccentColor = () => {
    if (isEmpty) return "var(--color-icon-muted)";
    switch (accent) {
      case "default": return "var(--color-icon-default)";
      case "teal":    return "var(--color-accent-teal)";
      case "blue":    return "var(--color-accent-blue)";
      case "amber":   return "var(--color-icon-accent-amber)";
      case "rose":    return "var(--color-accent-rose)";
      case "green":   return "var(--color-accent-green)";
      default:        return "var(--color-accent-blue)";
    }
  };

  const getBorder = () => {
    if (selected)   return "2px solid var(--color-border-focus)";
    if (comingSoon) return "1px solid var(--color-border-default)";
    return "1px solid var(--color-border-strong)";
  };

  const iconColor = isEmpty || comingSoon ? "var(--color-icon-muted)" : getAccentColor();

  const resolvedIcon =
    icon && isValidElement(icon)
      ? cloneElement(icon as React.ReactElement<{ color?: string }>, { color: iconColor })
      : icon;

  const cardStyles: React.CSSProperties = {
    position: "relative",
    backgroundColor: "transparent",
    borderRadius: "var(--border-radius-lg)",
    border: getBorder(),
    boxShadow: "none",
    padding: "24px",
    height: "188px",
    fontFamily: "var(--font-family-primary)",
    transition: "var(--transition-base)",
    cursor: onClick ? "pointer" : undefined,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    ...style,
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    if (onAdd || onClick)
      e.currentTarget.style.border = "1px solid var(--color-border-inverse)";
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    if (onAdd || onClick) e.currentTarget.style.border = getBorder();
  };

  // ── Render the "Learn how" / "Learn more..." link ──────────────────────────────
  const renderLearnHow = (label: string) => {
    if (!learnHow) return null
    if (typeof learnHow === 'function') {
      return (
        <button
          onClick={(e) => { e.stopPropagation(); learnHow() }}
          style={{
            background: 'none', border: 'none', padding: 0, cursor: 'pointer',
            fontSize: 'var(--font-size-sm)', lineHeight: 'var(--line-height-normal)',
          }}
          className="stats-card-learn-how"
        >
          {label}
        </button>
      )
    }
    return (
      <a
        href={learnHow}
        className="stats-card-learn-how"
        onClick={(e) => e.stopPropagation()}
        style={{ fontSize: 'var(--font-size-sm)', lineHeight: 'var(--line-height-normal)' }}
      >
        {label}
      </a>
    )
  }

  return (
    <div
      className={className}
      style={cardStyles}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      data-onboarding-card={dataOnboardingCard}
    >
      {/* ── + button ── */}
      {onAdd && (
        <div style={{ position: "absolute", top: "var(--spacing-2)", right: "var(--spacing-2)" }}>
          <IconButton size="sm" disabled={comingSoon} onClick={(e) => onAdd?.(e)}>
            <Plus size={14} />
          </IconButton>
        </div>
      )}

      {/* ── Icon — 8px gap below ── */}
      {resolvedIcon && (
        <div style={{ width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginBottom: "8px" }}>
          {resolvedIcon}
        </div>
      )}

      {/* ── Label — 8px gap below ── */}
      <div style={{
        fontSize: "var(--font-size-lg)",
        fontWeight: "var(--font-weight-medium)",
        color: isEmpty ? "var(--color-text-secondary)" : "var(--color-text-title)",
        lineHeight: "var(--line-height-normal)",
        marginBottom: "8px",
      }}>
        {label}
      </div>

      {/* ── Custom children (e.g. platform bar) ── */}
      {children ? (
        <>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {children}
          </div>
          {bottomSlot && (
            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', lineHeight: 'var(--line-height-normal)', marginTop: '8px' }}>
              {bottomSlot}
            </div>
          )}
        </>
      ) : (
        <>
          {/* ── Value row — 8px gap below ── */}
          <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-1)", marginBottom: "8px" }}>
            {comingSoon ? (
              <div style={{ height: 48, display: "flex", alignItems: "center" }}>
                <Badge variant="allCaps">Coming Soon</Badge>
              </div>
            ) : (
              <>
                <div style={{
                  fontSize: "var(--font-size-4xl)",
                  fontWeight: "var(--font-weight-bold)",
                  color: isEmpty ? "var(--color-text-disabled)" : "var(--color-text-title)",
                  lineHeight: "var(--line-height-tight)",
                }}>
                  {value}
                </div>
                {cap && (
                  <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)", lineHeight: "var(--line-height-normal)" }}>
                    / {cap}
                  </div>
                )}
                {subtitle && (
                  <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)", lineHeight: "var(--line-height-normal)" }}>
                    {subtitle}
                  </div>
                )}
              </>
            )}
          </div>

          {/* ── Bottom slot ── */}
          {comingSoon ? (
            // Coming soon cards: show "Learn more" link
            <div style={{ fontSize: 'var(--font-size-sm)', lineHeight: 'var(--line-height-normal)' }}>
              {renderLearnHow('Learn more')}
            </div>
          ) : isEmpty ? (
            // Empty cards: show "Learn how" link
            <div style={{ fontSize: 'var(--font-size-sm)', lineHeight: 'var(--line-height-normal)' }}>
              {renderLearnHow('Learn how')}
            </div>
          ) : (
            // Populated cards: show bottomSlot
            bottomSlot && (
              <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', lineHeight: 'var(--line-height-normal)' }}>
                {bottomSlot}
              </div>
            )
          )}
        </>
      )}
    </div>
  );
};

export default StatsCard;