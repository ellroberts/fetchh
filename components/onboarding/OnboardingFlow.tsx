"use client";

import React, { useState, useEffect, useLayoutEffect } from "react";
import { PawPrint } from "lucide-react";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { createSupabaseClient } from "@/lib/supabase";
import { CodaModal } from "./CodaModal";
import { SpotlightOverlay } from "./SpotlightOverlay";

// ─── Types ────────────────────────────────────────────────────────────────────

export type OnboardingStep =
  | "intro"
  | "tour_chats"
  | "tour_projects"
  | "tour_highlights"
  | "tour_jumpback"
  | "tour_name"
  | "declined_name"
  | "declined_thanks"
  | "completed_thanks"
  | "done";

// RAGFloatingButton is visible only on these steps (Coda is near bottom-right)
const STEPS_WITH_RAG_VISIBLE: OnboardingStep[] = [
  "tour_name",
  "declined_thanks",
  "completed_thanks",
];

// ─── Positioning ──────────────────────────────────────────────────────────────

// Maps each tour step to the data-onboarding-card value of its target card.
// Steps not in this map (intro, declined_name) get centered positioning.
const STEP_CARD: Partial<Record<OnboardingStep, string>> = {
  tour_chats:      "chats",
  tour_projects:   "projects",
  tour_highlights: "highlights",
  tour_jumpback:   "jump-back",
};

const MODAL_WIDTH = 480;
const CARD_GAP = 12; // px gap between target card bottom and modal top

// Reads the target card's bounding rect and positions the modal below it.
// Uses useLayoutEffect so position is computed before the browser paints,
// avoiding any visible flash when steps change.
function useCardPosition(cardId: string | null): React.CSSProperties | null {
  const [pos, setPos] = useState<React.CSSProperties | null>(null);

  useLayoutEffect(() => {
    if (!cardId) {
      setPos({ top: "50%", left: "50%", transform: "translate(-50%, -50%)" });
      return;
    }

    const update = () => {
      const el = document.querySelector<HTMLElement>(
        `[data-onboarding-card="${cardId}"]`,
      );
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const top = Math.max(8, rect.top - CARD_GAP - 320);
      const left = Math.min(rect.left, window.innerWidth - MODAL_WIDTH - 16);
      setPos({ top, left });
    };

    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [cardId]);

  return pos;
}

// Positions the modal above the target, right-aligned to its right edge.
// Used for tour_name (above the RAG floating button, bottom-right corner).
function useAboveRightPosition(cardId: string | null): React.CSSProperties | null {
  const [pos, setPos] = useState<React.CSSProperties | null>(null);

  useEffect(() => {
    if (!cardId) {
      setPos(null);
      return;
    }

    const update = () => {
      const el = document.querySelector<HTMLElement>(
        `[data-onboarding-card="${cardId}"]`,
      );
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const bottom = window.innerHeight - rect.top + 16;
      const right = window.innerWidth - rect.right;
      setPos({ bottom, right });
    };

    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [cardId]);

  return pos;
}

// ─── Shared primitives ────────────────────────────────────────────────────────

function Heading({ children }: { children: React.ReactNode }) {
  return <p className="onboarding-heading">{children}</p>;
}

function Body({
  children,
  last = false,
}: {
  children: React.ReactNode;
  last?: boolean;
}) {
  return (
    <p className={`onboarding-body${last ? " onboarding-body--last" : ""}`}>
      {children}
    </p>
  );
}

function TextBlock({ children }: { children: React.ReactNode }) {
  return <div className="onboarding-text-block">{children}</div>;
}

// Primary button — solid white, primary colour text
export const OnboardingBtnPrimary = ({
  onClick,
  children,
  disabled,
}: {
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
}) => (
  <Button variant="white" size="md" onClick={onClick} disabled={disabled}>
    {children}
  </Button>
);

// Outlined button — transparent bg, white border + text
export const OnboardingBtnOutline = ({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) => (
  <Button variant="white-outline" size="md" onClick={onClick}>
    {children}
  </Button>
);

// ─── Step components ──────────────────────────────────────────────────────────

function IntroStep({
  onYes,
  onNo,
  pos,
}: {
  onYes: () => void;
  onNo: () => void;
  pos: React.CSSProperties;
}) {
  return (
    <CodaModal
      pos={pos}
      avatar="/coda_smile.svg"
      footer={
        <>
          <Button variant="ghost-white" size="md" onClick={onNo}>
            No thanks
          </Button>
          <OnboardingBtnPrimary onClick={onYes}>
            Yeah, show me
          </OnboardingBtnPrimary>
        </>
      }
    >
      <TextBlock>
        <Heading>
          <span>
            Hey! I'm Coda{" "}
            <PawPrint
              size={20}
              color="white"
              style={{ display: "inline", verticalAlign: "middle", marginLeft: 4 }}
            />
          </span>
        </Heading>
        <Body>I might be small, but I'm pretty good at keeping things organised.</Body>
        <Body last>Want a quick tour?</Body>
      </TextBlock>
    </CodaModal>
  );
}

function TourChatsStep({
  onNext,
  onSkip,
  pos,
}: {
  onNext: () => void;
  onSkip: () => void;
  pos: React.CSSProperties;
}) {
  return (
    <CodaModal
      pos={pos}
      avatar="/coda_big_smile.svg"
      step={1}
      footer={
        <>
          <Button variant="ghost-white" size="md" onClick={onSkip}>
            Skip for now
          </Button>
          <OnboardingBtnPrimary onClick={onNext}>Next</OnboardingBtnPrimary>
        </>
      }
    >
      <TextBlock>
        <Body>I'll keep this quick.</Body>
        <Body>This is where your chats live.</Body>
        <Body last>
          Save them from the{" "}
          <a
            href="https://chromewebstore.google.com/search/threadcub"
            target="_blank"
            rel="noopener noreferrer"
            className="onboarding-ext-link"
          >
            Chrome extension
          </a>
          , or import them manually, then come back anytime without losing context.
        </Body>
      </TextBlock>
    </CodaModal>
  );
}

function TourProjectsStep({
  onNext,
  onSkip,
  pos,
}: {
  onNext: () => void;
  onSkip: () => void;
  pos: React.CSSProperties;
}) {
  return (
    <CodaModal
      pos={pos}
      avatar="/coda_big_smile.svg"
      step={2}
      footer={
        <>
          <Button variant="ghost-white" size="md" onClick={onSkip}>
            Skip for now
          </Button>
          <OnboardingBtnPrimary onClick={onNext}>Next</OnboardingBtnPrimary>
        </>
      }
    >
      <TextBlock>
        <Body>Projects help you group related chats together.</Body>
        <Body last>
          Pull in the conversations you need, and work through them in one place
          without losing track.
        </Body>
      </TextBlock>
    </CodaModal>
  );
}

function TourHighlightsStep({
  onNext,
  onSkip,
  pos,
}: {
  onNext: () => void;
  onSkip: () => void;
  pos: React.CSSProperties;
}) {
  return (
    <CodaModal
      pos={pos}
      avatar="/coda_big_smile.svg"
      step={3}
      footer={
        <>
          <Button variant="ghost-white" size="md" onClick={onSkip}>
            Skip for now
          </Button>
          <OnboardingBtnPrimary onClick={onNext}>Next</OnboardingBtnPrimary>
        </>
      }
    >
      <TextBlock>
        <Body>Found something important?</Body>
        <Body last>
          Highlight it, turn it into an action, or set a reminder so you can
          come back to it later.
        </Body>
      </TextBlock>
    </CodaModal>
  );
}

function TourJumpBackStep({
  onDone,
  pos,
}: {
  onDone: () => void;
  pos: React.CSSProperties;
}) {
  return (
    <CodaModal
      pos={pos}
      avatar="/coda_big_smile.svg"
      step={4}
      footer={
        <OnboardingBtnPrimary onClick={onDone}>All done</OnboardingBtnPrimary>
      }
    >
      <TextBlock>
        <Body>Pick up where you left off.</Body>
        <Body last>
          Everything you've worked on is right here, ready when you are.
        </Body>
      </TextBlock>
    </CodaModal>
  );
}

function TourNameStep({
  nameInput,
  onNameChange,
  onDone,
  onSkip,
  pos,
}: {
  nameInput: string;
  onNameChange: (v: string) => void;
  onDone: () => void;
  onSkip: () => void;
  pos: React.CSSProperties;
}) {
  const hasValue = nameInput.trim().length > 0;

  return (
    <CodaModal
      pos={pos}
      footer={
        <>
          <Button variant="ghost-white" size="md" onClick={onSkip}>
            Skip for now
          </Button>
          <OnboardingBtnPrimary onClick={onDone} disabled={!hasValue}>
            Save
          </OnboardingBtnPrimary>
        </>
      }
    >
      <div style={{ marginBottom: "32px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "16px" }}>
          <p className="onboarding-body" style={{ margin: 0 }}>
            One last thing. What should I call you?
          </p>
        </div>
        <div className="onboarding-input-row">
          <Input
            variant="on-primary"
            placeholder="Your name..."
            value={nameInput}
            onChange={(e) => onNameChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && hasValue) onDone(); }}
            size="lg"
            style={{ flex: 1 }}
          />
        </div>
      </div>
    </CodaModal>
  );
}

function DeclinedNameStep({
  nameInput,
  onNameChange,
  onSubmit,
  onSkip,
  pos,
}: {
  nameInput: string;
  onNameChange: (v: string) => void;
  onSubmit: () => void;
  onSkip: () => void;
  pos: React.CSSProperties;
}) {
  const hasValue = nameInput.trim().length > 0;

  return (
    <CodaModal
      pos={pos}
      avatar="/coda_sad.svg"
      footer={
        <>
          <Button variant="ghost-white" size="md" onClick={onSkip}>
            Skip for now
          </Button>
          <OnboardingBtnPrimary onClick={onSubmit} disabled={!hasValue}>
            Save
          </OnboardingBtnPrimary>
        </>
      }
    >
      <div style={{ marginBottom: "32px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "16px" }}>
          <p className="onboarding-body" style={{ margin: 0 }}>
            Oh, ok. Could I at least get your name? I'd hate to have to call you User 123
          </p>
        </div>
        <div className="onboarding-input-row">
          <Input
            variant="on-primary"
            placeholder="Your name..."
            value={nameInput}
            onChange={(e) => onNameChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && hasValue) onSubmit(); }}
            size="lg"
            style={{ flex: 1 }}
          />
        </div>
      </div>
    </CodaModal>
  );
}

function ThanksStep({ name, onComplete }: { name: string; onComplete: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onComplete, 3000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  const pos: React.CSSProperties = {
    bottom: 112,
    right: 24,
    width: "400px",
    maxWidth: "400px",
  };

  return (
    <CodaModal pos={pos} direction="row">
      <Body>Nice to meet you {name}!</Body>
      <Body last>All set, let's get started.</Body>
      <PawPrint
        size={24}
        color="var(--color-text-inverse)"
        className="onboarding-thanks-icon"
      />
    </CodaModal>
  );
}

// ─── Scroll lock ──────────────────────────────────────────────────────────────

function ScrollLock() {
  useEffect(() => {
    document.body.classList.add("onboarding-active");
    window.scrollTo(0, 0);
    return () => document.body.classList.remove("onboarding-active");
  }, []);
  return null;
}

// ─── Main component ───────────────────────────────────────────────────────────

export function OnboardingFlow() {
  const [step, setStep] = useState<OnboardingStep | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [savedName, setSavedName] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [hasDisplayName, setHasDisplayName] = useState(false);
  const [existingName, setExistingName] = useState("");

  const supabase = createSupabaseClient();

  // ── Load profile and determine initial step ─────────────────────────────

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const { data: profile, error: profileError } = await supabase
        .from("user_profiles")
        .select("onboarding_completed, display_name")
        .eq("id", user.id)
        .single();

      console.log("[Onboarding] profile fetch result:", { data: profile, error: profileError });

      if (!profile) return;

      if (profile.onboarding_completed) {
        setStep("done");
        return;
      }

      if (profile.display_name) {
        setHasDisplayName(true);
        setExistingName(profile.display_name);
      }

      setStep("intro");
    }
    init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Broadcast onboarding state for RAGFloatingButton ───────────────────

  useEffect(() => {
    if (step === null) return;
    const active = step !== "done";
    const ragVisible = !active || STEPS_WITH_RAG_VISIBLE.includes(step);
    window.dispatchEvent(
      new CustomEvent("threadcub:onboarding-state", { detail: { active, ragVisible } }),
    );
  }, [step]);

  // ── Broadcast which cards to highlight ─────────────────────────────────

  useEffect(() => {
    if (!step) return;
    const cardMap: Partial<Record<OnboardingStep, string[]>> = {
      tour_chats:      ["chats"],
      tour_projects:   ["projects"],
      tour_highlights: ["highlights", "actions", "reminders"],
      tour_jumpback:   ["jump-back"],
    };
    window.dispatchEvent(
      new CustomEvent("threadcub:onboarding-highlight", {
        detail: { cards: cardMap[step] ?? null },
      }),
    );
  }, [step]);

  // ── ESC key closes declined_name ───────────────────────────────────────

  useEffect(() => {
    if (step !== "declined_name") return;
    const handler = async (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        await completeOnboarding();
        setStep("done");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Compute modal positions ─────────────────────────────────────────────

  const cardId = step ? (STEP_CARD[step] ?? null) : null;
  const cardPos = useCardPosition(cardId);
  const namePos = useAboveRightPosition(
    step === "tour_name" ? "rag-button" : null,
  );

  // ── Supabase helpers ────────────────────────────────────────────────────

  const saveDisplayName = async (name: string) => {
    if (!userId || !name.trim()) return;
    await supabase
      .from("user_profiles")
      .update({ display_name: name.trim() })
      .eq("id", userId);
  };

  const completeOnboarding = async () => {
    if (!userId) return;
    await supabase
      .from("user_profiles")
      .update({ onboarding_completed: true })
      .eq("id", userId);
  };

  // ── Action handlers ─────────────────────────────────────────────────────

  const handleSkipToName = () => setStep("tour_name");

  const handleSkipName = async () => {
    await completeOnboarding();
    setStep("done");
  };

  const handleNameDone = async () => {
    const name = nameInput.trim();
    if (hasDisplayName) {
      setSavedName(existingName);
      await completeOnboarding();
      setStep("completed_thanks");
    } else if (name) {
      setSavedName(name);
      await saveDisplayName(name);
      await completeOnboarding();
      setStep("completed_thanks");
    }
  };

  const handleDeclinedSubmit = async () => {
    if (!nameInput.trim()) return;
    setSavedName(nameInput.trim());
    await saveDisplayName(nameInput);
    await completeOnboarding();
    setStep("declined_thanks");
  };

  // ── Render ──────────────────────────────────────────────────────────────

  if (step === null || step === "done") return null;

  const isThanksStep = step === "declined_thanks" || step === "completed_thanks";
  if (!isThanksStep && step !== "tour_name" && !cardPos) return null;
  if (step === "tour_name" && !namePos) return null;

  return (
    <>
      <ScrollLock />

      {step === "intro" && cardPos && (
        <>
          <SpotlightOverlay cardIds={[]} />
          <IntroStep
            pos={cardPos}
            onYes={() => setStep("tour_chats")}
            onNo={() => setStep("declined_name")}
          />
        </>
      )}

      {step === "tour_chats" && cardPos && (
        <>
          <SpotlightOverlay cardIds={["chats"]} />
          <TourChatsStep
            pos={cardPos}
            onNext={() => setStep("tour_projects")}
            onSkip={handleSkipToName}
          />
        </>
      )}

      {step === "tour_projects" && cardPos && (
        <>
          <SpotlightOverlay cardIds={["projects"]} />
          <TourProjectsStep
            pos={cardPos}
            onNext={() => setStep("tour_highlights")}
            onSkip={handleSkipToName}
          />
        </>
      )}

      {step === "tour_highlights" && cardPos && (
        <>
          <SpotlightOverlay cardIds={["highlights", "actions", "reminders"]} />
          <TourHighlightsStep
            pos={cardPos}
            onNext={() => setStep("tour_jumpback")}
            onSkip={handleSkipToName}
          />
        </>
      )}

      {step === "tour_jumpback" && cardPos && (
        <>
          <SpotlightOverlay cardIds={["jump-back"]} />
          <TourJumpBackStep
            pos={cardPos}
            onDone={() => setStep("tour_name")}
          />
        </>
      )}

      {step === "tour_name" && namePos && (
        <>
          <SpotlightOverlay cardIds={[]} />
          <TourNameStep
            pos={namePos}
            nameInput={nameInput}
            onNameChange={setNameInput}
            onDone={handleNameDone}
            onSkip={handleSkipName}
          />
        </>
      )}

      {step === "declined_name" && cardPos && (
        <>
          <SpotlightOverlay cardIds={[]} />
          <DeclinedNameStep
            pos={cardPos}
            nameInput={nameInput}
            onNameChange={setNameInput}
            onSubmit={handleDeclinedSubmit}
            onSkip={handleSkipName}
          />
        </>
      )}

      {step === "declined_thanks" && (
        <ThanksStep name={savedName} onComplete={() => setStep("done")} />
      )}

      {step === "completed_thanks" && (
        <ThanksStep name={savedName} onComplete={() => setStep("done")} />
      )}
    </>
  );
}