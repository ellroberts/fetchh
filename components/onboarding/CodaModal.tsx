"use client";
import React from "react";
import { CodaAvatar } from "./CodaAvatar";
import { ModalFooter } from "@/components/ModalFooter";

export interface CodaModalProps {
  /** Positioning styles from hook — applied to root div */
  pos: React.CSSProperties;
  /** src for CodaAvatar — omit to hide avatar */
  avatar?: string;
  /** Current step number — renders counter if provided. Omit on final step. */
  step?: number;
  /** Total steps for counter. Default: 4 */
  totalSteps?: number;
  /** Body content — text, inputs, or any ReactNode */
  children: React.ReactNode;
  /** Footer buttons — rendered in ModalFooter (no padding, no divider). Omit to hide footer. */
  footer?: React.ReactNode;
  /** Layout direction: 'row' for avatar-left / content-right (e.g. ThanksStep). Default: 'column' */
  direction?: "column" | "row";
}

export function CodaModal({
  pos,
  avatar,
  step,
  totalSteps = 4,
  children,
  footer,
  direction = "column",
}: CodaModalProps) {
  return (
    <div
      className="onboarding-card"
      style={{
        ...pos,
        ...(direction === "row"
          ? { flexDirection: "row", alignItems: "flex-start" }
          : {}),
      }}
    >
      {step !== undefined && (
        <span className="onboarding-step-counter">
          {step} of {totalSteps}
        </span>
      )}
      {avatar && <CodaAvatar src={avatar} />}
      {children}
      {footer && (
        <ModalFooter divider={false} noPadding={true}>
          {footer}
        </ModalFooter>
      )}
    </div>
  );
}