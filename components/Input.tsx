// components/Input.tsx
import React, { useState, useId } from "react";
import { Menu } from "@/components/Menu";

export interface InputProps {
  /** Input type — controls behaviour and icon */
  type?: "text" | "email" | "password" | "search" | "select";
  /** Options for select type */
  options?: { value: string; label: string; disabled?: boolean }[];
  /** Placeholder option label for select */
  selectPlaceholder?: string;
  /** Render as multiline textarea */
  multiline?: boolean;
  /** Number of rows (multiline only) */
  rows?: number;
  /** Label text */
  label?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Controlled value */
  value?: string;
  /** Change handler */
  onChange?: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => void;
  /** Clear handler (search type only) */
  onClear?: () => void;
  /** Blur handler */
  onBlur?: () => void;
  /** Focus handler */
  onFocus?: () => void;
  /** Keydown handler */
  onKeyDown?: (
    e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => void;
  /** Whether input is disabled */
  disabled?: boolean;
  /** Whether input is in error state */
  error?: boolean;
  /** Error message */
  errorMessage?: string;
  /** Hint text shown below input */
  hintText?: string;
  /** Leading icon — pass an SVG element */
  leadingIcon?: React.ReactNode;
  /** Trailing icon — pass an SVG element (not used for password/search, those are automatic) */
  trailingIcon?: React.ReactNode;
  /** Input name */
  name?: string;
  /** Input id */
  id?: string;
  /** Required field */
  required?: boolean;
  /** Auto complete */
  autoComplete?: string;
  /** Auto focus on mount */
  autoFocus?: boolean;
  /** Additional container styles */
  style?: React.CSSProperties;
  /** Additional class */
  className?: string;
  /** Input size — affects height: 'md' = 40px (default), 'lg' = 48px */
  size?: "md" | "lg";
  /** Extra styles applied directly to the <input>/<textarea> element */
  inputStyle?: React.CSSProperties;
  /** Visual variant: 'default' = standard border input, 'on-primary' = transparent input for use on primary-coloured surfaces */
  variant?: "default" | "on-primary";
}

export const Input: React.FC<InputProps> = ({
  type = "text",
  multiline = false,
  rows = 3,
  label,
  placeholder = "Enter text...",
  value,
  onChange,
  onClear,
  onBlur,
  onFocus,
  onKeyDown,
  disabled = false,
  error = false,
  errorMessage,
  hintText,
  leadingIcon,
  trailingIcon,
  name,
  id,
  required = false,
  autoComplete,
  autoFocus,
  style,
  className,
  options = [],
  selectPlaceholder,
  size = "md",
  inputStyle,
  variant = "default",
}) => {
  const [internalValue, setInternalValue] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const inputValue = value !== undefined ? value : internalValue;
  const generatedId = useId();
  const inputId = id || `input-${generatedId}`;
  const descId = `${inputId}-desc`;

  // Token set based on variant — keeps all state logic variant-aware without branching in every handler
  const variantTokens =
    variant === "on-primary"
      ? {
          idleBorder: "1px solid transparent",
          idleBg: "var(--color-surface-primary-inactive)",
          hoverBorder: "1px solid transparent",
          hoverBg: "var(--color-surface-primary-hover)",
          focusBorder: "2px solid var(--color-surface-primary-active)",
          focusBg: "var(--color-surface-primary-active)",
          focusColor: "var(--color-text-body)",
          idleColor: "var(--color-text-secondary)",
          blurBorder: "1px solid transparent",
          blurBg: "var(--color-surface-primary-inactive)",
        }
      : {
          idleBorder: "1px solid var(--color-border-default)",
          idleBg: "transparent",
          hoverBorder: "1px solid var(--color-border-strong)",
          hoverBg: "var(--color-surface-raised)",
          focusBorder: "2px solid var(--color-border-focus)",
          focusBg: "var(--color-surface-raised)",
          focusColor: "var(--color-text-title)",
          idleColor: "var(--color-text-title)",
          blurBorder: "1px solid var(--color-border-default)",
          blurBg: "transparent",
        };

  const hasLeadingIcon = !!leadingIcon || type === "search";
  const hasTrailingIcon =
    !!trailingIcon ||
    type === "password" ||
    (type === "search" && !!inputValue);

  // Padding values account for the 1px→2px border swap on focus so content never shifts
  // Base: 16px padding minus 1px border = 15px visible gap
  // Focus: 15px padding plus 2px border = 15px visible gap (same)
  const paddingLeft = hasLeadingIcon ? "40px" : "15px";
  const paddingRight = hasTrailingIcon ? "40px" : "15px";

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    if (onChange) {
      onChange(e);
    } else {
      setInternalValue(e.target.value);
    }
  };

  const handleFocus = (
    e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    if (!error) {
      e.currentTarget.style.border = variantTokens.focusBorder;
      e.currentTarget.style.backgroundColor =
        inputStyle?.backgroundColor ?? variantTokens.focusBg;
      e.currentTarget.style.color = variantTokens.focusColor;
      e.currentTarget.style.paddingLeft = hasLeadingIcon ? "39px" : "14px";
      e.currentTarget.style.paddingRight = hasTrailingIcon ? "39px" : "14px";
    }
    onFocus?.();
  };

  const handleBlur = (
    e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    e.currentTarget.style.border = error
      ? "2px solid var(--color-status-error)"
      : variantTokens.blurBorder;
    e.currentTarget.style.backgroundColor = baseBg;
    e.currentTarget.style.color = variantTokens.idleColor;
    e.currentTarget.style.paddingLeft = paddingLeft;
    e.currentTarget.style.paddingRight = paddingRight;
    onBlur?.();
  };

  const handleMouseEnter = (
    e: React.MouseEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    if (document.activeElement !== e.currentTarget && !error) {
      e.currentTarget.style.border = variantTokens.hoverBorder;
      e.currentTarget.style.backgroundColor =
        inputStyle?.backgroundColor ?? variantTokens.hoverBg;
    }
  };

  const handleMouseLeave = (
    e: React.MouseEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    if (document.activeElement !== e.currentTarget && !error) {
      e.currentTarget.style.border = variantTokens.idleBorder;
      e.currentTarget.style.backgroundColor = baseBg;
    }
  };

  const inputHeight = size === "lg" ? "48px" : "40px";
  const baseBg = disabled
    ? "var(--color-state-disabled-bg)"
    : (inputStyle?.backgroundColor ?? variantTokens.idleBg);

  // Shared base styles for both input and textarea
  const baseInputStyle: React.CSSProperties = {
    width: "100%",
    boxSizing: "border-box",
    border: error
      ? "2px solid var(--color-status-error)"
      : variantTokens.idleBorder,
    borderRadius: "var(--border-radius-lg)",
    backgroundColor: baseBg,
    fontSize: "var(--font-size-sm)",
    fontFamily: "var(--font-family-primary)",
    color: disabled ? "var(--color-border-strong)" : variantTokens.idleColor,
    outline: "none",
    paddingLeft,
    paddingRight,
    transition:
      "border-color var(--transition-base), background-color var(--transition-base)",
    cursor: disabled ? "not-allowed" : "text",
    ...inputStyle,
  };

  // Icons
  const SearchIcon = () => (
    <svg
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
  );

  const EyeIcon = () => (
    <svg
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"
      />
      <circle cx="12" cy="12" r="3" strokeWidth={2} />
    </svg>
  );

  const EyeOffIcon = () => (
    <svg
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"
      />
      <line x1="1" y1="1" x2="23" y2="23" strokeWidth={2} />
    </svg>
  );

  const ClearIcon = () => (
    <svg
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  );

  const iconColor =
    variant === "on-primary" ? "var(--color-icon-default)" : "inherit";

  const iconWrapperStyle: React.CSSProperties = {
    position: "absolute",
    top: "50%",
    transform: "translateY(-50%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    pointerEvents: "none",
    color: iconColor,
    width: "16px",
    height: "16px",
  };

  const actionIconStyle: React.CSSProperties = {
    ...iconWrapperStyle,
    pointerEvents: "auto",
    cursor: "pointer",
    background: "none",
    border: "none",
    padding: "4px",
    width: "24px",
    height: "24px",
    borderRadius: "4px",
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--spacing-1)",
        fontFamily: "var(--font-family-primary)",
        ...style,
      }}
      className={className}
    >
      {/* Placeholder colour for on-primary variant — opacity applied via CSS, not inline style */}
      {variant === "on-primary" && (
        <style>{`#${CSS.escape(inputId)}::placeholder { color: var(--color-text-secondary); }`}</style>
      )}
      {/* Label */}
      {label && (
        <label
          htmlFor={inputId}
          style={{
            fontSize: "var(--font-size-sm)",
            fontWeight: "var(--font-weight-medium)",
            color: disabled
              ? "var(--color-border-strong)"
              : "var(--color-text-secondary)",
            lineHeight: "var(--line-height-normal)",
          }}
        >
          {label}
          {required && (
            <span
              style={{ color: "var(--color-status-error)", marginLeft: "3px" }}
            >
              *
            </span>
          )}
        </label>
      )}

      {/* Input wrapper — position relative for icons */}
      <div
        style={{
          position: "relative",
          color: disabled
            ? "var(--color-border-strong)"
            : "var(--color-text-secondary)",
        }}
        onMouseEnter={(e) => {
          if (!disabled)
            e.currentTarget.style.color = "var(--color-text-title)";
        }}
        onMouseLeave={(e) => {
          if (!disabled)
            e.currentTarget.style.color = "var(--color-text-secondary)";
        }}
      >
        {/* Leading icon */}
        {hasLeadingIcon && (
          <span style={{ ...iconWrapperStyle, left: "12px" }}>
            {leadingIcon || <SearchIcon />}
          </span>
        )}

        {/* Input or Textarea */}
        {type !== "select" &&
          (multiline ? (
            <textarea
              id={inputId}
              name={name}
              placeholder={placeholder}
              value={inputValue}
              disabled={disabled}
              required={required}
              rows={rows}
              autoComplete={autoComplete}
              autoFocus={autoFocus}
              aria-invalid={error}
              aria-describedby={hintText || errorMessage ? descId : undefined}
              style={{
                ...baseInputStyle,
                height: "auto",
                resize: "none",
                paddingTop: "11px",
                paddingBottom: "11px",
                lineHeight: "1.5",
              }}
              onChange={handleChange}
              onFocus={handleFocus as any}
              onBlur={handleBlur as any}
              onMouseEnter={handleMouseEnter as any}
              onMouseLeave={handleMouseLeave as any}
              onKeyDown={onKeyDown as any}
            />
          ) : (
            <input
              id={inputId}
              name={name}
              type={
                type === "password"
                  ? showPassword
                    ? "text"
                    : "password"
                  : type === "search"
                    ? "text"
                    : type
              }
              placeholder={placeholder}
              value={inputValue}
              disabled={disabled}
              required={required}
              autoComplete={autoComplete}
              autoFocus={autoFocus}
              aria-invalid={error}
              aria-describedby={hintText || errorMessage ? descId : undefined}
              style={{
                ...baseInputStyle,
                height: inputHeight,
              }}
              onChange={handleChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
              onKeyDown={onKeyDown}
            />
          ))}

        {/* Select — Menu-powered custom dropdown */}
        {type === "select" && (
          <Menu
            align="left"
            minWidth={240}
            value={inputValue}
            trigger={(openMenu, isOpen) => (
              <button
                id={inputId}
                type="button"
                disabled={disabled}
                aria-invalid={error}
                aria-describedby={hintText || errorMessage ? descId : undefined}
                onClick={openMenu}
                style={{
                  ...baseInputStyle,
                  height: "40px",
                  paddingLeft: "15px",
                  paddingRight: "36px",
                  cursor: disabled ? "not-allowed" : "pointer",
                  textAlign: "left",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  width: "100%",
                  backgroundColor: "var(--color-surface-raised)",
                  borderWidth: isOpen ? "2px" : "1px",
                  borderStyle: "solid",
                  borderColor: isOpen
                    ? "var(--color-border-focus)"
                    : "var(--color-border-default)",
                  boxSizing: "border-box",
                }}
                onMouseEnter={(e) => {
                  if (!isOpen && !disabled) {
                    e.currentTarget.style.borderColor =
                      "var(--color-border-strong)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isOpen && !disabled) {
                    e.currentTarget.style.borderColor =
                      "var(--color-border-default)";
                  }
                }}
              >
                <span
                  style={{
                    flex: 1,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    color: inputValue
                      ? "var(--color-text-title)"
                      : "var(--color-text-placeholder)",
                    fontSize: "var(--font-size-sm)",
                  }}
                >
                  {inputValue
                    ? (options.find((o) => o.value === inputValue)?.label ??
                      inputValue)
                    : (selectPlaceholder ?? "Select…")}
                </span>
                <span
                  style={{
                    position: "absolute",
                    right: "16px",
                    top: "50%",
                    transform: isOpen
                      ? "translateY(-50%) rotate(180deg)"
                      : "translateY(-50%) rotate(0deg)",
                    transition: "transform 0.15s ease",
                    width: "20px",
                    height: "20px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--color-text-title)",
                    pointerEvents: "none",
                    flexShrink: 0,
                  }}
                >
                  <svg
                    width="16"
                    height="16"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </span>
              </button>
            )}
            options={options.map((opt) => ({
              label: opt.label,
              value: opt.value,
              disabled: opt.disabled,
              onClick: () => {
                const syntheticEvent = {
                  target: { value: opt.value },
                } as React.ChangeEvent<HTMLInputElement>;
                handleChange(syntheticEvent);
              },
            }))}
          />
        )}

        {/* Trailing: password toggle */}
        {type === "password" && (
          <button
            type="button"
            style={{ ...actionIconStyle, right: "10px" }}
            onClick={() => setShowPassword((p) => !p)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            tabIndex={0}
          >
            {showPassword ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        )}

        {/* Trailing: search clear button */}
        {type === "search" && inputValue && onClear && (
          <button
            type="button"
            style={{ ...actionIconStyle, right: "10px" }}
            onClick={onClear}
            aria-label="Clear search"
            tabIndex={0}
          >
            <ClearIcon />
          </button>
        )}

        {/* Trailing: custom icon (text/email only) */}
        {type !== "password" && type !== "search" && trailingIcon && (
          <span style={{ ...iconWrapperStyle, right: "12px" }}>
            {trailingIcon}
          </span>
        )}
      </div>

      {/* Hint or error text */}
      {(hintText || (error && errorMessage)) && (
        <p
          id={descId}
          role={error ? "alert" : undefined}
          style={{
            margin: 0,
            fontSize: "var(--font-size-sm)",
            color: error
              ? "var(--color-status-error)"
              : "var(--color-text-secondary)",
            lineHeight: "var(--line-height-normal)",
          }}
        >
          {error && errorMessage ? errorMessage : hintText}
        </p>
      )}
    </div>
  );
};
