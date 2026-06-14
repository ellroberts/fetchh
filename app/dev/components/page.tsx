"use client";
import { Icon } from "@/components/Icon";
import { SectionCard } from "@/components/SectionCard";
import { EmptyState } from "@/components/EmptyState";

import { useState } from "react";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { IconButton } from "@/components/IconButton";
import { Badge } from "@/components/Badge";
import { Checkbox } from "@/components/Checkbox";
import { Radio } from "@/components/Radio";
import { Alert } from "@/components/Alert";
import { Toast } from "@/components/Toast";
import { Divider } from "@/components/Divider";
import { Heading } from "@/components/Heading";
import { Logo } from "@/components/Logo";
import { Counter } from "@/components/Counter";
import { PageHeader } from "@/components/layout/PageHeader";
import { DeleteConversationModal } from "@/components/DeleteConversationModal";
import { ClaimModal, ClaimableConversation } from "@/components/ClaimModal";
import { ModalHeader } from "@/components/ModalHeader";
import { ModalFooter } from "@/components/ModalFooter";
import { NewProjectModal } from "@/components/NewProjectModal";
import { DeleteProjectModal } from "@/components/DeleteProjectModal";
import { AddToProjectModal } from "@/components/AddToProjectModal";
import { PinInsightModal } from "@/components/projects/PinInsightModal";
import { SelectableChip } from "@/components/SelectableChip";
import { ClaimBanner } from "@/components/ClaimBanner";
import { Menu } from "@/components/Menu";
import QuickSummary from "@/components/QuickSummary";
import { SocialButton } from "@/components/SocialButton";
import { StatsCard } from "@/components/StatsCard";
import { TabFilterPanel, DEFAULT_TAB_FILTER_STATE, type TabFilterState } from "@/components/TabFilterPanel";
import { JumpBackCard, ALL_TYPE_OPTIONS, type JumpBackItem, type JumpBackType } from "@/components/JumpBackCard";
import {
  MessageSquare,
  FileText,
  Sparkles,
  AlertCircle,
  Zap,
  Bot,
  SquarePen,
  Lightbulb,
  TriangleAlert,
  RotateCcw,
  Flame,
  Star,
  Heart,
  Tag,
  Layers,
} from "lucide-react";
import { HighlightCard } from "@/components/HighlightCard";
import { HighlightRowCard } from "@/components/HighlightRowCard";
import { ActionRowCard } from "@/components/ActionRowCard";
import { ReminderRowCard } from "@/components/ReminderRowCard";
import { SaveHighlightModal } from "@/components/SaveHighlightModal";
import { AddActionModal } from "@/components/AddActionModal";
import { AddReminderModal } from "@/components/AddReminderModal";
import { EditNoteTagModal } from "@/components/EditNoteTagModal";
import { SelectionActionBar } from "@/components/SelectionActionBar";
import { ThreadSelectionMenu } from "@/components/ThreadSelectionMenu";
import { TagPicker, PRESET_TAGS } from "@/components/TagPicker";
import { ConversationCard } from "@/components/ConversationCard";
import { ProjectCard } from "@/components/ProjectCard";
import {
  AuthCard,
  ResetPasswordCard,
  UpdatePasswordCard,
} from "@/components/AuthCard";
import { ExtensionCallbackCard } from "@/components/ExtensionCallbackCard";
import { ThreadFilters } from "@/components/ThreadFilters";
import { SideNav } from "@/components/layout/SideNav";
import { TabPill } from "@/components/TabPill";
import { EmbedStatus } from "@/components/EmbedStatus";
import { Tooltip } from "@/components/Tooltip";
import { PlanCard } from "@/components/billing/PlanCard";
import { OverflowMenu } from "@/components/OverflowMenu";
import { SideNavItem } from "@/components/layout/SideNavItem";
import { SideNavHeader } from "@/components/layout/SideNavHeader";
import { SideNavSearch } from "@/components/layout/SideNavSearch";
import {
  LayoutDashboard,
  MessagesSquare,
  FolderOpen,
  PawPrint,
  LibraryBig,
  Upload,
} from "lucide-react";
import { UserSection } from "@/components/layout/UserSection";
import { UserMenu } from "@/components/layout/UserMenu";
import { CodaModal } from "@/components/onboarding/CodaModal";
import {
  OnboardingBtnPrimary,
  OnboardingBtnOutline,
} from "@/components/onboarding/OnboardingFlow";

// ── Block production ────────────────────────────────────────────────────────
if (typeof window !== "undefined" && process.env.NODE_ENV === "production") {
  throw new Error("Not found");
}

// ── The Layout helpers ──────────────────────────────────────────────────────────

function PageLayout({
  children,
  darkMode,
  onToggleDark,
}: {
  children: React.ReactNode;
  darkMode: boolean;
  onToggleDark: () => void;
}) {
  return (
    <div
      className={darkMode ? "dark" : ""}
      style={{
        minHeight: "100vh",
        backgroundColor: "var(--color-surface-default)",
        fontFamily: "var(--font-family-primary)",
        colorScheme: darkMode ? "dark" : "light",
      }}
    >
      {/* Header */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          backgroundColor: "var(--color-surface-raised)",
          borderBottom: "1px solid var(--color-border-default)",
          padding: "0 32px",
          height: "52px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ fontSize: "18px" }}>🧸</span>
          <span
            style={{
              fontWeight: "var(--font-weight-semibold)",
              color: "var(--color-text-title)",
              fontSize: "var(--font-size-sm)",
            }}
          >
            ThreadCub
          </span>
          <span style={{ color: "var(--color-text-muted)" }}>/</span>
          <span
            style={{
              color: "var(--color-text-secondary)",
              fontSize: "var(--font-size-sm)",
            }}
          >
            Component Playground
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {/* Dark mode toggle */}
          <button
            onClick={onToggleDark}
            title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "5px 12px",
              borderRadius: "20px",
              border: "1px solid var(--color-border-default)",
              backgroundColor: "var(--color-surface-default)",
              color: "var(--color-text-secondary)",
              fontSize: "12px",
              fontFamily: "var(--font-family-primary)",
              fontWeight: 500,
              cursor: "pointer",
              transition: "background-color 0.2s ease, border-color 0.2s ease",
            }}
          >
            <span style={{ fontSize: "14px", lineHeight: 1 }}>
              {darkMode ? "☀️" : "🌙"}
            </span>
            <span>{darkMode ? "Light" : "Dark"}</span>
          </button>
          <span
            style={{
              fontSize: "11px",
              fontWeight: "600",
              letterSpacing: "0.05em",
              color: "#FFFFFF",
              backgroundColor: "var(--color-accent-amber)",
              padding: "3px 8px",
              borderRadius: "4px",
            }}
          >
            DEV ONLY
          </span>
        </div>
      </div>

      {/* Body */}
      <div style={{ display: "flex" }}>{children}</div>
    </div>
  );
}

function Sidebar({
  active,
  onSelect,
}: {
  active: string;
  onSelect: (s: string) => void;
}) {
  const groups = [
    {
      label: "Foundations",
      items: ["Tokens", "TypeScale", "Icon", "Heading", "Divider", "Logo"],
    },
    {
      label: "Inputs & Controls",
      items: [
        "Input",
        "Button",
        "IconButton",
        "Checkbox",
        "Radio",
        "SocialButton",
        "SelectableChip",
        "TagPicker",
      ],
    },
    {
      label: "Feedback & Status",
      items: [
        "Badge",
        "Counter",
        "Alert",
        "Toast",
        "ClaimBanner",
        "EmbedStatus",
      ],
    },
    {
      label: "Navigation",
      items: [
        "SideNav",
        "SideNavSearch",
        "TabFilterPanel",
        "Menu",
        "OverflowMenu",
        "PageHeader",
        "ThreadFilters",
        "TabPill",
        "Tooltip",
      ],
    },
    {
      label: "Cards & Layout",
      items: [
        "StatsCard",
        "JumpBackCard",
        "HighlightCard",
        "HighlightRowCard",
        "ActionRowCard",
        "ReminderRowCard",
        "SectionCard",
        "CodaModal",
        "ConversationCard",
        "ProjectCard",
        "AuthCard",
        "ExtensionCallbackCard",
        "PlanCard",
        "EmptyState",
      ],
    },
    {
      label: "Modals & Overlays",
      items: [
        "SelectionActionBar",
        "ThreadSelectionMenu",
        "ModalHeader",
        "ModalFooter",
        "ClaimModal",
        "DeleteConversationModal",
        "PinInsightModal",
        "QuickSummary",
        "SaveHighlightModal",
        "AddActionModal",
        "AddReminderModal",
        "EditNoteTagModal",
        "NewProjectModal",
        "DeleteProjectModal",
        "AddToProjectModal",
      ],
    },
  ];
  return (
    <nav
      style={{
        width: "220px",
        flexShrink: 0,
        padding: "24px 16px",
        position: "sticky",
        top: "52px",
        height: "calc(100vh - 52px)",
        overflowY: "auto",
        borderRight: "1px solid var(--color-border-default)",
        backgroundColor: "var(--color-surface-raised)",
      }}
    >
      {groups.map((group, gi) => (
        <div key={group.label} style={{ marginBottom: "20px" }}>
          <p
            style={{
              fontSize: "11px",
              fontWeight: "700",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--color-text-muted)",
              margin: gi === 0 ? "0 0 8px 8px" : "0 0 8px 8px",
            }}
          >
            {group.label}
          </p>
          {group.items.map((item) => (
            <button
              key={item}
              onClick={() => onSelect(item)}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "7px 10px",
                borderRadius: "6px",
                border: "none",
                cursor: "pointer",
                fontFamily: "var(--font-family-primary)",
                fontSize: "var(--font-size-sm)",
                fontWeight: active === item ? 600 : 400,
                color:
                  active === item
                    ? "var(--color-primary)"
                    : "var(--color-text-secondary)",
                backgroundColor:
                  active === item
                    ? "var(--color-primary-subtle)"
                    : "transparent",
                marginBottom: "1px",
              }}
            >
              {item}
            </button>
          ))}
        </div>
      ))}
    </nav>
  );
}

function Main({ children }: { children: React.ReactNode }) {
  return (
    <main style={{ flex: 1, padding: "40px 48px", maxWidth: "900px" }}>
      {children}
    </main>
  );
}

function ComponentTitle({
  name,
  description,
}: {
  name: string;
  description: string;
}) {
  return (
    <div style={{ marginBottom: "40px" }}>
      <h1
        style={{
          margin: "0 0 8px",
          fontSize: "var(--font-size-2xl)",
          fontWeight: "var(--font-weight-bold)",
          color: "var(--color-text-title)",
        }}
      >
        {name}
      </h1>
      <p
        style={{
          margin: 0,
          color: "var(--color-text-muted)",
          fontSize: "var(--font-size-sm)",
        }}
      >
        {description}
      </p>
    </div>
  );
}

function Group({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: "40px" }}>
      <p
        style={{
          margin: "0 0 16px",
          fontSize: "11px",
          fontWeight: "700",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--color-warm-500)",
          paddingBottom: "8px",
          borderBottom: "1px solid var(--color-warm-400)",
        }}
      >
        {title}
      </p>
      {children}
    </div>
  );
}

function Canvas({
  label,
  dark,
  children,
  style,
}: {
  label: string;
  dark?: boolean;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div style={{ marginBottom: "16px" }}>
      <p
        style={{
          margin: "0 0 8px",
          fontSize: "12px",
          color: "var(--color-warm-500)",
        }}
      >
        {label}
      </p>
      <div
        style={{
          padding: "24px",
          borderRadius: "8px",
          border: "1px solid var(--color-warm-400)",
          backgroundColor: dark ? "var(--color-warm-900)" : "transparent",
          display: "flex",
          flexWrap: "wrap" as const,
          gap: "16px",
          alignItems: "flex-start",
          ...style,
        }}
      >
        {children}
      </div>
    </div>
  );
}

// ── Star icon for examples ──────────────────────────────────────────────────
const StarIcon = () => (
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
      d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
    />
  </svg>
);

const PlusIcon = () => (
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
      d="M12 4v16m8-8H4"
    />
  </svg>
);

const CloseIcon = () => (
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
      d="M6 18L18 6M6 6l12 12"
    />
  </svg>
);

const DotsIcon = () => (
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
      d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
    />
  </svg>
);

// ── Component panels ────────────────────────────────────────────────────────

function InputPanel() {
  const [text, setText] = useState("");
  const [search, setSearch] = useState("");
  const [password, setPassword] = useState("");
  const [textarea, setTextarea] = useState("");

  return (
    <>
      <ComponentTitle
        name="Input"
        description="Text input component supporting text, email, password, search and multiline variants."
      />

      <Group title="Types">
        <Canvas label="Text">
          <div style={{ width: "320px" }}>
            <Input
              type="text"
              label="Text"
              placeholder="Enter text..."
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </div>
        </Canvas>
        <Canvas label="Email">
          <div style={{ width: "320px" }}>
            <Input
              type="email"
              label="Email address"
              placeholder="you@example.com"
            />
          </div>
        </Canvas>
        <Canvas label="Password">
          <div style={{ width: "320px" }}>
            <Input
              type="password"
              label="Password"
              placeholder="Enter password..."
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </Canvas>
        <Canvas label="Search">
          <div style={{ width: "320px" }}>
            <Input
              type="search"
              placeholder="Search projects..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClear={() => setSearch("")}
            />
          </div>
        </Canvas>
        <Canvas label="Multiline / Textarea">
          <div style={{ width: "320px" }}>
            <Input
              multiline
              label="Description"
              placeholder="Enter a description..."
              rows={3}
              value={textarea}
              onChange={(e) => setTextarea(e.target.value)}
            />
          </div>
        </Canvas>
      </Group>

      <Group title="States">
        <Canvas label="Default / Hover / Focus — interact to see states">
          <div style={{ width: "260px" }}>
            <Input type="text" placeholder="Default" />
          </div>
          <div style={{ width: "260px" }}>
            <Input type="text" placeholder="With label" label="Label" />
          </div>
        </Canvas>
        <Canvas label="Disabled">
          <div style={{ width: "260px" }}>
            <Input
              type="text"
              label="Disabled"
              placeholder="Cannot edit"
              disabled
            />
          </div>
          <div style={{ width: "260px" }}>
            <Input type="search" placeholder="Disabled search" disabled />
          </div>
        </Canvas>
        <Canvas label="Error">
          <div style={{ width: "260px" }}>
            <Input
              type="text"
              label="Name"
              value="bad input"
              error
              errorMessage="This field is required"
              onChange={() => {}}
            />
          </div>
          <div style={{ width: "260px" }}>
            <Input
              type="email"
              label="Email"
              value="notanemail"
              error
              errorMessage="Please enter a valid email"
              onChange={() => {}}
            />
          </div>
        </Canvas>
        <Canvas label="With hint text">
          <div style={{ width: "260px" }}>
            <Input
              type="text"
              label="Username"
              placeholder="e.g. coda_bear"
              hintText="Must be unique across ThreadCub"
            />
          </div>
        </Canvas>
      </Group>

      <Group title="With icons">
        <Canvas label="Leading icon">
          <div style={{ width: "260px" }}>
            <Input
              type="text"
              label="With leading icon"
              placeholder="Enter text..."
              leadingIcon={<StarIcon />}
            />
          </div>
        </Canvas>
        <Canvas label="Trailing icon">
          <div style={{ width: "260px" }}>
            <Input
              type="text"
              label="With trailing icon"
              placeholder="Enter text..."
              trailingIcon={<StarIcon />}
            />
          </div>
        </Canvas>
      </Group>

      <Group title="On different backgrounds">
        <Canvas label="On warm-100 (page canvas)">
          <div style={{ width: "260px" }}>
            <Input type="text" placeholder="Transparent default" />
          </div>
          <div style={{ width: "260px" }}>
            <Input type="search" placeholder="Search..." />
          </div>
        </Canvas>
        <Canvas label="On white (modal / card)">
          <div
            style={{
              width: "260px",
              backgroundColor: "var(--color-warm-white)",
              padding: "16px",
              borderRadius: "8px",
            }}
          >
            <Input
              type="text"
              label="Name"
              placeholder="Enter project name..."
            />
          </div>
          <div
            style={{
              width: "260px",
              backgroundColor: "var(--color-warm-white)",
              padding: "16px",
              borderRadius: "8px",
            }}
          >
            <Input
              multiline
              label="Description"
              placeholder="Enter description..."
              rows={2}
            />
          </div>
        </Canvas>
      </Group>

      <Group title="variant=on-primary">
        <Canvas label="On primary surface — interact to see hover / focus states">
          <div
            style={{
              backgroundColor: "var(--color-surface-primary-strong)",
              padding: "var(--spacing-6)",
              borderRadius: "var(--border-radius-lg)",
              display: "flex",
              flexDirection: "column",
              gap: "var(--spacing-4)",
              width: "320px",
            }}
          >
            <Input
              variant="on-primary"
              placeholder="Search or ask a question…"
            />
            <Input
              variant="on-primary"
              label="With label"
              placeholder="Enter text…"
            />
          </div>
        </Canvas>
      </Group>
    </>
  );
}

function ButtonPanel() {
  return (
    <>
      <ComponentTitle
        name="Button"
        description="Action button supporting primary, secondary, tertiary, ghost and neutral variants across three sizes."
      />

      <Group title="Variants">
        <Canvas label="Primary / Secondary / Tertiary / Ghost / Neutral">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="tertiary">Tertiary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="neutral">Neutral</Button>
        </Canvas>
        <Canvas label="Ghost White — on brand/coloured surface (hover to see state)" style={{ backgroundColor: 'var(--color-primary-500)' }}>
          <Button variant="ghost-white">Ghost White</Button>
        </Canvas>
      </Group>

      <Group title="Sizes">
        <Canvas label="Small / Medium / Large">
          <Button variant="primary" size="sm">
            Small
          </Button>
          <Button variant="primary" size="md">
            Medium
          </Button>
          <Button variant="primary" size="lg">
            Large
          </Button>
        </Canvas>
        <Canvas label="Neutral sizes">
          <Button variant="neutral" size="sm">Small</Button>
          <Button variant="neutral" size="md">Medium</Button>
          <Button variant="neutral" size="lg">Large</Button>
        </Canvas>
        <Canvas label="Secondary sizes">
          <Button variant="secondary" size="sm">
            Small
          </Button>
          <Button variant="secondary" size="md">
            Medium
          </Button>
          <Button variant="secondary" size="lg">
            Large
          </Button>
        </Canvas>
      </Group>

      <Group title="States">
        <Canvas label="Disabled">
          <Button variant="primary" disabled>
            Primary
          </Button>
          <Button variant="secondary" disabled>
            Secondary
          </Button>
          <Button variant="tertiary" disabled>
            Tertiary
          </Button>
        </Canvas>
        <Canvas label="Loading">
          <Button variant="primary" loading>
            Saving...
          </Button>
          <Button variant="secondary" loading>
            Loading
          </Button>
        </Canvas>
      </Group>

      <Group title="With icons">
        <Canvas label="Icon left (default)">
          <Button variant="primary" icon={<PlusIcon />}>
            New project
          </Button>
          <Button variant="secondary" icon={<StarIcon />}>
            Favourite
          </Button>
          <Button variant="tertiary" icon={<CloseIcon />}>
            Cancel
          </Button>
        </Canvas>
        <Canvas label="Icon right">
          <Button variant="primary" icon={<PlusIcon />} iconPosition="right">
            New project
          </Button>
          <Button variant="secondary" icon={<StarIcon />} iconPosition="right">
            Favourite
          </Button>
        </Canvas>
      </Group>

      <Group title="Common pairings">
        <Canvas label="Modal footer (Cancel + Create)">
          <Button variant="tertiary" size="sm">
            Cancel
          </Button>
          <Button variant="primary" size="sm">
            Create
          </Button>
        </Canvas>
        <Canvas label="Destructive context">
          <Button variant="tertiary" size="sm">
            Cancel
          </Button>
          <Button variant="danger" size="sm">
            Delete
          </Button>
        </Canvas>
      </Group>
    </>
  );
}

function IconButtonPanel() {
  return (
    <>
      <ComponentTitle
        name="IconButton"
        description="Square icon-only button used for toolbar actions, close buttons, and contextual actions."
      />

      <Group title="Variants">
        <Canvas label="Default">
          <IconButton title="Close">
            <CloseIcon />
          </IconButton>
          <IconButton title="More options">
            <DotsIcon />
          </IconButton>
          <IconButton title="Star">
            <StarIcon />
          </IconButton>
          <IconButton title="Add">
            <PlusIcon />
          </IconButton>
        </Canvas>
      </Group>

      <Group title="Sizes">
        <Canvas label="Small / Medium / Large">
          <IconButton title="Small" size="sm">
            <CloseIcon />
          </IconButton>
          <IconButton title="Medium" size="md">
            <CloseIcon />
          </IconButton>
          <IconButton title="Large" size="lg">
            <CloseIcon />
          </IconButton>
        </Canvas>
      </Group>

      <Group title="States">
        <Canvas label="Selected">
          <IconButton title="Selected" selected>
            <StarIcon />
          </IconButton>
          <IconButton title="Selected outline" selected variant="outline">
            <StarIcon />
          </IconButton>
        </Canvas>
        <Canvas label="Danger">
          <IconButton title="Danger" danger>
            <CloseIcon />
          </IconButton>
          <IconButton title="Danger outline" danger variant="outline">
            <CloseIcon />
          </IconButton>
        </Canvas>
        <Canvas label="Disabled">
          <IconButton title="Disabled" disabled>
            <StarIcon />
          </IconButton>
          <IconButton title="Disabled outline" disabled variant="outline">
            <CloseIcon />
          </IconButton>
        </Canvas>
      </Group>
      <Group title="Variants">
        <Canvas label="Ghost / Outline">
          <IconButton title="Ghost">
            <DotsIcon />
          </IconButton>
          <IconButton title="Outline" variant="outline">
            <DotsIcon />
          </IconButton>
        </Canvas>
      </Group>
    </>
  );
}

function BadgePanel() {
  return (
    <>
      <ComponentTitle
        name="Badge"
        description="Status and label badges used across threads, projects and tags."
      />

      <Group title="Variants — interact to explore">
        <Canvas label="All variants">
          <Badge>Default</Badge>
          <Badge variant="base" active>
            Primary
          </Badge>
          <Badge variant="success">Success</Badge>
          <Badge variant="warning">Warning</Badge>
          <Badge variant="error">Error</Badge>
          <Badge variant="info">Info</Badge>
        </Canvas>
      </Group>
    </>
  );
}

function CheckboxPanel() {
  const [checked1, setChecked1] = useState(false);
  const [checked2, setChecked2] = useState(true);
  const [checked3, setChecked3] = useState(false);
  return (
    <>
      <ComponentTitle
        name="Checkbox"
        description="Checkbox input used for selection in forms, cards, and bulk actions."
      />
      <Group title="States">
        <Canvas label="Unchecked / Checked">
          <Checkbox
            label="Unchecked"
            checked={checked1}
            onChange={setChecked1}
          />
          <Checkbox label="Checked" checked={checked2} onChange={setChecked2} />
        </Canvas>
        <Canvas label="Disabled">
          <Checkbox label="Disabled unchecked" checked={false} disabled />
          <Checkbox label="Disabled checked" checked={true} disabled />
        </Canvas>
      </Group>
      <Group title="Sizes">
        <Canvas label="Small / Medium / Large">
          <Checkbox
            label="Small"
            size="sm"
            checked={checked3}
            onChange={setChecked3}
          />
          <Checkbox
            label="Medium"
            size="md"
            checked={checked3}
            onChange={setChecked3}
          />
          <Checkbox
            label="Large"
            size="lg"
            checked={checked3}
            onChange={setChecked3}
          />
        </Canvas>
      </Group>
    </>
  );
}

function SideNavSearchPanel() {
  return (
    <>
      <ComponentTitle
        name="SideNavSearch"
        description="Global search control for the sidebar. Self-contained — owns query state, hits /api/search, shows grouped results dropdown."
      />
      <Group title="Expanded">
        <Canvas
          label="Idle / hover / active"
          style={{
            backgroundColor: "var(--color-surface)",
            padding: "8px",
            alignItems: "flex-start",
          }}
        >
          <div
            style={{
              width: "260px",
              backgroundColor: "var(--color-surface)",
              borderRadius: "4px",
              padding: "4px 0 0",
            }}
          >
            <SideNavSearch collapsed={false} />
          </div>
        </Canvas>
      </Group>
      <Group title="Collapsed">
        <Canvas label="Icon only">
          <div
            style={{
              width: "64px",
              backgroundColor: "var(--color-surface)",
              borderRadius: "4px",
              padding: "4px 8px 0",
            }}
          >
            <SideNavSearch collapsed={true} />
          </div>
        </Canvas>
      </Group>
    </>
  );
}

function SideNavPanel() {
  const [collapsed, setCollapsed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeItem, setActiveItem] = useState("projects");

  const navItems = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: "",
      iconHover: "",
      iconComponent: LayoutDashboard,
      iconColor: "var(--color-primary-500)",
    },
    {
      id: "threads",
      label: "Threads",
      icon: "",
      iconHover: "",
      iconComponent: MessagesSquare,
      iconColor: "var(--color-accent-teal)",
      badge: 3,
    },
    {
      id: "projects",
      label: "Projects",
      icon: "",
      iconHover: "",
      iconComponent: FolderOpen,
      iconColor: "var(--color-accent-rose)",
    },
    {
      id: "pawmarks",
      label: "Pawmarks",
      icon: "",
      iconHover: "",
      iconComponent: PawPrint,
      iconColor: "var(--color-accent-amber)",
    },
    {
      id: "library",
      label: "Library",
      icon: "",
      iconHover: "",
      iconComponent: LibraryBig,
      iconColor: "var(--color-bear-500)",
    },
    {
      id: "import",
      label: "Import",
      icon: "",
      iconHover: "",
      iconComponent: Upload,
      iconColor: "var(--color-warm-700)",
    },
  ];

  const mockUser = {
    name: "Ells Roberts",
    email: "ells@threadcub.com",
    avatar: undefined,
  };

  return (
    <>
      <ComponentTitle
        name="SideNav"
        description="Collapsible navigation sidebar with header, nav items, user section, and overflow menu."
      />

      {/* Full SideNav */}
      <Group title="Full component">
        <Canvas
          label="Expanded"
          style={{
            padding: 0,
            overflow: "hidden",
            height: "480px",
            alignItems: "stretch",
            backgroundColor: "var(--color-page-bg)",
          }}
        >
          <div
            style={{
              width: "280px",
              height: "480px",
              backgroundColor: "var(--color-surface)",
              borderRadius: "4px",
              position: "relative",
              flexShrink: 0,
            }}
          >
            <SideNav
              items={navItems.map((i) => ({
                ...i,
                active: i.id === activeItem,
                onClick: () => setActiveItem(i.id),
              }))}
              user={mockUser}
              subscriptionTier="free"
              defaultCollapsed={false}
            />
          </div>
        </Canvas>
        <Canvas
          label="Collapsed"
          style={{
            padding: 0,
            overflow: "hidden",
            height: "480px",
            alignItems: "stretch",
            backgroundColor: "var(--color-page-bg)",
          }}
        >
          <div
            style={{
              width: "64px",
              height: "480px",
              backgroundColor: "var(--color-surface)",
              borderRadius: "4px",
              position: "relative",
              flexShrink: 0,
            }}
          >
            <SideNav
              items={navItems.map((i) => ({
                ...i,
                active: i.id === activeItem,
                onClick: () => setActiveItem(i.id),
              }))}
              user={mockUser}
              subscriptionTier="free"
              defaultCollapsed={true}
            />
          </div>
        </Canvas>
      </Group>

      {/* SideNavItem states */}
      <Group title="SideNavItem">
        <Canvas label="Default / Active / Badge">
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "4px",
              width: "260px",
              backgroundColor: "var(--color-surface)",
              padding: "8px",
              borderRadius: "4px",
            }}
          >
            <SideNavItem
              label="Projects"
              icon="/sidenav-projects.svg"
              iconHover="/sidenav-projects-hover.svg"
            />
            <SideNavItem
              label="Conversations"
              active
              icon="/sidenav-conversations.svg"
              iconHover="/sidenav-conversations-hover.svg"
            />
            <SideNavItem
              label="Insights"
              badge={5}
              icon="/sidenav-import.svg"
              iconHover="/sidenav-import-hover.svg"
            />
          </div>
        </Canvas>
        <Canvas label="Collapsed">
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "4px",
              width: "64px",
              backgroundColor: "var(--color-surface)",
              padding: "8px",
              borderRadius: "4px",
            }}
          >
            <SideNavItem
              label="Projects"
              collapsed
              icon="/sidenav-projects.svg"
              iconHover="/sidenav-projects-hover.svg"
            />
            <SideNavItem
              label="Conversations"
              active
              collapsed
              icon="/sidenav-conversations.svg"
              iconHover="/sidenav-conversations-hover.svg"
            />
            <SideNavItem
              label="Insights"
              badge={5}
              collapsed
              icon="/sidenav-import.svg"
              iconHover="/sidenav-import-hover.svg"
            />
          </div>
        </Canvas>
      </Group>

      {/* SideNavHeader */}
      <Group title="SideNavHeader">
        <Canvas label="Expanded">
          <div
            style={{
              width: "280px",
              backgroundColor: "var(--color-surface)",
              borderRadius: "4px",
            }}
          >
            <SideNavHeader
              isCollapsed={false}
              onToggle={() => {}}
              appName="ThreadCub"
            />
          </div>
        </Canvas>
        <Canvas label="Collapsed">
          <div
            style={{
              width: "64px",
              backgroundColor: "var(--color-surface)",
              borderRadius: "4px",
            }}
          >
            <SideNavHeader
              isCollapsed={true}
              onToggle={() => {}}
              appName="ThreadCub"
            />
          </div>
        </Canvas>
      </Group>

      {/* SideNavSearch */}
      <Group title="SideNavSearch">
        <Canvas label="Expanded">
          <div
            style={{
              width: "280px",
              backgroundColor: "var(--color-surface)",
              borderRadius: "4px",
              padding: "4px 8px 0",
            }}
          >
            <SideNavSearch collapsed={false} />
          </div>
        </Canvas>
        <Canvas label="Collapsed">
          <div
            style={{
              width: "64px",
              backgroundColor: "var(--color-surface)",
              borderRadius: "4px",
              padding: "4px 8px 0",
            }}
          >
            <SideNavSearch collapsed={true} />
          </div>
        </Canvas>
      </Group>

      {/* UserSection */}
      <Group title="UserSection">
        <Canvas label="Expanded">
          <div
            style={{
              width: "280px",
              backgroundColor: "var(--color-warm-50)",
              borderRadius: "8px",
              border: "1px solid var(--color-warm-400)",
            }}
          >
            <UserSection
              userName="Ells Roberts"
              isMenuOpen={false}
              onClick={() => {}}
              subscriptionTier="free"
              collapsed={false}
            />
          </div>
        </Canvas>
        <Canvas label="Collapsed">
          <div
            style={{
              width: "64px",
              backgroundColor: "var(--color-warm-50)",
              borderRadius: "8px",
              border: "1px solid var(--color-warm-400)",
            }}
          >
            <UserSection
              userName="Ells Roberts"
              isMenuOpen={false}
              onClick={() => {}}
              subscriptionTier="free"
              collapsed={true}
            />
          </div>
        </Canvas>
        <Canvas label="Menu open">
          <div
            style={{
              width: "280px",
              backgroundColor: "var(--color-warm-50)",
              borderRadius: "8px",
              border: "1px solid var(--color-warm-400)",
            }}
          >
            <UserSection
              userName="Ells Roberts"
              isMenuOpen={true}
              onClick={() => {}}
              subscriptionTier="pro"
              collapsed={false}
            />
          </div>
        </Canvas>
      </Group>
    </>
  );
}

function RadioPanel() {
  const [selected, setSelected] = useState<string>("b");
  return (
    <div>
      <ComponentTitle
        name="Radio"
        description="Radio indicator used inside Menu for single-selection lists. Matches Checkbox styling."
      />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--spacing-3)",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {["Option A", "Option B", "Option C"].map((label, i) => {
            const val = ["a", "b", "c"][i];
            return (
              <label
                key={val}
                onClick={() => setSelected(val)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  cursor: "pointer",
                  fontSize: "14px",
                  color: "var(--color-warm-900)",
                  fontFamily: "var(--font-family-primary)",
                  userSelect: "none",
                }}
              >
                <Radio checked={selected === val} />
                {label}
              </label>
            );
          })}
        </div>
        <div
          style={{
            display: "flex",
            gap: "var(--spacing-4)",
            marginTop: "var(--spacing-2)",
          }}
        >
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              cursor: "not-allowed",
              fontSize: "14px",
              color: "var(--color-warm-500)",
              fontFamily: "var(--font-family-primary)",
            }}
          >
            <Radio checked={false} disabled />
            Disabled unchecked
          </label>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              cursor: "not-allowed",
              fontSize: "14px",
              color: "var(--color-warm-500)",
              fontFamily: "var(--font-family-primary)",
            }}
          >
            <Radio checked={true} disabled />
            Disabled checked
          </label>
        </div>
        <div style={{ display: "flex", gap: "var(--spacing-4)" }}>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              cursor: "pointer",
              fontSize: "13px",
              color: "var(--color-warm-900)",
              fontFamily: "var(--font-family-primary)",
            }}
          >
            <Radio checked={true} size="sm" />
            Small
          </label>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              cursor: "pointer",
              fontSize: "14px",
              color: "var(--color-warm-900)",
              fontFamily: "var(--font-family-primary)",
            }}
          >
            <Radio checked={true} size="md" />
            Medium
          </label>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              cursor: "pointer",
              fontSize: "15px",
              color: "var(--color-warm-900)",
              fontFamily: "var(--font-family-primary)",
            }}
          >
            <Radio checked={true} size="lg" />
            Large
          </label>
        </div>
      </div>
    </div>
  );
}

function AlertPanel() {
  return (
    <>
      <ComponentTitle
        name="Alert"
        description="Feedback banners for success, error, warning, insight and info states. Supports sm/md/lg sizes, dismissible close, and an inline action button."
      />
      <Group title="Types">
        <Canvas
          label="All types"
          style={{
            flexDirection: "column",
            alignItems: "stretch",
            gap: "12px",
          }}
        >
          <Alert type="success">
            Your changes have been saved successfully.
          </Alert>
          <Alert type="warning">
            This action cannot be undone. Please review before continuing.
          </Alert>
          <Alert type="error">Something went wrong. Please try again.</Alert>
          <Alert type="info">A new version of ThreadCub is available.</Alert>
          <Alert type="insight">
            Tip: conversations with 50+ messages tend to have richer AI
            summaries.
          </Alert>
        </Canvas>
      </Group>
      <Group title="With title">
        <Canvas
          label="Title + body"
          style={{
            flexDirection: "column",
            alignItems: "stretch",
            gap: "12px",
          }}
        >
          <Alert type="success" title="Changes saved">
            Your project has been updated successfully.
          </Alert>
          <Alert type="error" title="Upload failed">
            The file exceeded the maximum size of 10MB.
          </Alert>
          <Alert type="warning" title="Plan limit reached">
            You've used 10 of 10 conversations on the Free plan.
          </Alert>
          <Alert type="info" title="New version available">
            Refresh to get the latest ThreadCub improvements.
          </Alert>
          <Alert type="insight" title="Did you know?">
            You can ask Coda questions across all your saved threads at once.
          </Alert>
        </Canvas>
      </Group>
      <Group title="With action button">
        <Canvas
          label="Inline action"
          style={{
            flexDirection: "column",
            alignItems: "stretch",
            gap: "12px",
          }}
        >
          <Alert
            type="info"
            dismissible={false}
            action={{ label: "Claim Now", onClick: () => {} }}
          >
            Found 8 conversations from before you signed in!
          </Alert>
          <Alert
            type="warning"
            action={{ label: "Upgrade", onClick: () => {} }}
          >
            You've reached your Free plan limit.
          </Alert>
          <Alert type="success" action={{ label: "View", onClick: () => {} }}>
            3 conversations were imported successfully.
          </Alert>
          <Alert type="error" action={{ label: "Retry", onClick: () => {} }}>
            Embedding generation failed for 2 conversations.
          </Alert>
        </Canvas>
      </Group>
      <Group title="Sizes">
        <Canvas
          label="sm"
          style={{ flexDirection: "column", alignItems: "stretch", gap: "8px" }}
        >
          <Alert type="success" size="sm">
            Small success — compact messaging.
          </Alert>
          <Alert type="warning" size="sm">
            Small warning.
          </Alert>
          <Alert type="error" size="sm">
            Small error.
          </Alert>
          <Alert type="info" size="sm">
            Small info.
          </Alert>
        </Canvas>
        <Canvas
          label="md (default)"
          style={{
            flexDirection: "column",
            alignItems: "stretch",
            gap: "12px",
          }}
        >
          <Alert type="success" size="md">
            Medium success — default size.
          </Alert>
          <Alert type="warning" size="md">
            Medium warning.
          </Alert>
          <Alert type="error" size="md">
            Medium error.
          </Alert>
          <Alert type="info" size="md">
            Medium info.
          </Alert>
        </Canvas>
        <Canvas
          label="lg"
          style={{
            flexDirection: "column",
            alignItems: "stretch",
            gap: "12px",
          }}
        >
          <Alert type="success" size="lg">
            Large success — prominent messaging.
          </Alert>
          <Alert type="warning" size="lg">
            Large warning.
          </Alert>
          <Alert type="error" size="lg">
            Large error.
          </Alert>
          <Alert type="info" size="lg">
            Large info.
          </Alert>
        </Canvas>
      </Group>
      <Group title="Dismissible">
        <Canvas
          label="With close button"
          style={{
            flexDirection: "column",
            alignItems: "stretch",
            gap: "12px",
          }}
        >
          <Alert type="success" title="Dismissible" onClose={() => {}}>
            Click × to dismiss.
          </Alert>
          <Alert type="warning" onClose={() => {}}>
            This warning can be dismissed.
          </Alert>
          <Alert type="error" dismissible={false}>
            Non-dismissible — no close button rendered.
          </Alert>
        </Canvas>
      </Group>
      <Group title="Shadow">
        <Canvas
          label="sm / md / lg"
          style={{
            flexDirection: "column",
            alignItems: "stretch",
            gap: "12px",
          }}
        >
          <Alert type="info" shadow="sm" dismissible={false}>
            Shadow sm — subtle lift.
          </Alert>
          <Alert type="info" shadow="md" dismissible={false}>
            Shadow md — default lift, used on claim banner.
          </Alert>
          <Alert type="info" shadow="lg" dismissible={false}>
            Shadow lg — prominent lift.
          </Alert>
        </Canvas>
        <Canvas
          label="With action + shadow"
          style={{
            flexDirection: "column",
            alignItems: "stretch",
            gap: "12px",
          }}
        >
          <Alert
            type="info"
            shadow="md"
            dismissible={false}
            action={{ label: "Claim Now", onClick: () => {} }}
          >
            Found 8 conversations from before you signed in!
          </Alert>
          <Alert
            type="warning"
            shadow="md"
            action={{ label: "Upgrade", onClick: () => {} }}
          >
            You've reached your Free plan limit.
          </Alert>
        </Canvas>
      </Group>
    </>
  );
}

function ClaimBannerPanel() {
  return (
    <>
      <ComponentTitle
        name="ClaimBanner"
        description="Persistent info banner shown to users with unclaimed guest conversations. Renders a 'Review' button that opens the ClaimModal. Handles free-tier limits with an 'Upgrade to Claim' variant."
      />
      <Group title="Default">
        <Canvas
          label="Standard"
          style={{
            flexDirection: "column",
            alignItems: "stretch",
            gap: "12px",
          }}
        >
          <ClaimBanner count={8} onReview={() => {}} onDismiss={() => {}} />
        </Canvas>
      </Group>
      <Group title="Plural / singular">
        <Canvas
          label="1 conversation"
          style={{
            flexDirection: "column",
            alignItems: "stretch",
            gap: "12px",
          }}
        >
          <ClaimBanner count={1} onReview={() => {}} onDismiss={() => {}} />
        </Canvas>
        <Canvas
          label="30 conversations"
          style={{
            flexDirection: "column",
            alignItems: "stretch",
            gap: "12px",
          }}
        >
          <ClaimBanner count={30} onReview={() => {}} onDismiss={() => {}} />
        </Canvas>
      </Group>
      <Group title="Free tier at limit">
        <Canvas
          label="Upgrade to Claim"
          style={{
            flexDirection: "column",
            alignItems: "stretch",
            gap: "12px",
          }}
        >
          <ClaimBanner
            count={12}
            conversationCount={10}
            subscriptionTier="free"
            onReview={() => {}}
            onDismiss={() => {}}
          />
        </Canvas>
      </Group>
    </>
  );
}

function DividerPanel() {
  return (
    <>
      <ComponentTitle
        name="Divider"
        description="Horizontal rule used to separate content sections, with optional label."
      />
      <Group title="Variants">
        <Canvas
          label="With text"
          style={{ flexDirection: "column", alignItems: "stretch", gap: "0" }}
        >
          <Divider text="OR" />
          <Divider text="CONTINUE WITH" />
          <Divider text="SECTION" color="light" />
        </Canvas>
        <Canvas
          label="No text"
          style={{ flexDirection: "column", alignItems: "stretch" }}
        >
          <Divider text="" />
        </Canvas>
      </Group>
      <Group title="Colours">
        <Canvas
          label="gray / light / muted"
          style={{ flexDirection: "column", alignItems: "stretch" }}
        >
          <Divider text="gray" color="gray" />
          <Divider text="light" color="light" />
          <Divider text="muted" color="muted" />
        </Canvas>
      </Group>
    </>
  );
}

function HeadingPanel() {
  return (
    <>
      <ComponentTitle
        name="Heading"
        description="Semantic heading element with level, colour, and alignment variants."
      />
      <Group title="Levels">
        <Canvas
          label="h1 → h4"
          style={{
            flexDirection: "column",
            alignItems: "flex-start",
            gap: "8px",
          }}
        >
          <Heading level={1}>Heading level 1</Heading>
          <Heading level={2}>Heading level 2</Heading>
          <Heading level={3}>Heading level 3</Heading>
          <Heading level={4}>Heading level 4</Heading>
        </Canvas>
      </Group>
      <Group title="Colours">
        <Canvas
          label="primary / secondary / muted"
          style={{
            flexDirection: "column",
            alignItems: "flex-start",
            gap: "8px",
          }}
        >
          <Heading level={3} color="primary">
            Primary heading
          </Heading>
          <Heading level={3} color="secondary">
            Secondary heading
          </Heading>
          <Heading level={3} color="muted">
            Muted heading
          </Heading>
        </Canvas>
      </Group>
      <Group title="Alignment">
        <Canvas
          label="left / center / right"
          style={{ flexDirection: "column", alignItems: "stretch", gap: "8px" }}
        >
          <Heading level={3} align="left">
            Left aligned
          </Heading>
          <Heading level={3} align="center">
            Centre aligned
          </Heading>
          <Heading level={3} align="right">
            Right aligned
          </Heading>
        </Canvas>
      </Group>
    </>
  );
}

function LogoPanel() {
  return (
    <>
      <ComponentTitle
        name="Logo"
        description="ThreadCub brand mark. Auto-switches between light/dark based on theme."
      />
      <Group title="Sizes">
        <Canvas label="xs to xl">
          <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
            <Logo size="xs" />
            <Logo size="sm" />
            <Logo size="md" />
            <Logo size="lg" />
            <Logo size="xl" />
          </div>
        </Canvas>
      </Group>
      <Group title="Variants">
        <Canvas label="default / dark / clickable">
          <Logo size="lg" variant="default" />
          <Logo size="lg" variant="dark" />
          <Logo size="lg" clickable onClick={() => alert("clicked")} />
        </Canvas>
      </Group>
    </>
  );
}

function StatsCardPanel() {
  return (
    <>
      <ComponentTitle
        name="StatsCard"
        description="Metric display card with label, value, optional subtitle and colour variant."
      />
      <Group title="Colour variants">
        <Canvas
          label="All variants"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "16px",
            alignItems: "start",
          }}
        >
          <StatsCard
            label="Conversations"
            value="142"
            subtitle="+12 this week"
            accent="teal"
            icon={
              <Icon
                icon={FileText}
                size="xl"
                color="var(--color-accent-teal)"
              />
            }
          />
          <StatsCard
            label="Conversations"
            value="0"
            subtitle="No data yet"
            accent="teal"
            isEmpty
            icon={
              <Icon icon={FileText} size="xl" color="var(--color-warm-500)" />
            }
          />
          <StatsCard
            label="Saved"
            value="38"
            subtitle="Across 5 projects"
            accent="green"
            icon={
              <Icon icon={Bot} size="xl" color="var(--color-accent-green)" />
            }
          />
          <StatsCard
            label="Pending"
            value="7"
            subtitle="Needs review"
            accent="amber"
            icon={
              <Icon
                icon={Sparkles}
                size="xl"
                color="var(--color-accent-amber)"
              />
            }
          />
          <StatsCard
            label="Errors"
            value="2"
            subtitle="Last 30 days"
            accent="rose"
            icon={
              <Icon
                icon={AlertCircle}
                size="xl"
                color="var(--color-accent-rose)"
              />
            }
          />
          <StatsCard
            label="API Calls"
            value="1.2k"
            subtitle="This month"
            accent="blue"
            icon={
              <Icon icon={Zap} size="xl" color="var(--color-accent-blue)" />
            }
          />
          <StatsCard
            label="Messages"
            value="890"
            subtitle="Total"
            accent="blue"
            icon={
              <Icon
                icon={MessageSquare}
                size="xl"
                color="var(--color-accent-blue)"
              />
            }
          />
        </Canvas>
      </Group>
      <Group title="With add button">
        <Canvas label="With add button" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', alignItems: 'start' }}>
          <StatsCard
            label="Thread groups"
            value="9"
            subtitle="Unlimited"
            accent="blue"
            icon={<Icon icon={Layers} size="xl" color="var(--color-accent-blue)" />}
            onAdd={() => {}}
          />
          <StatsCard
            label="Projects created"
            value="2"
            subtitle="of 10 included"
            accent="amber"
            icon={<Icon icon={Sparkles} size="xl" color="var(--color-accent-amber)" />}
            onAdd={() => {}}
          />
          <StatsCard
            label="Projects created"
            value="0"
            subtitle="of 10 included"
            accent="amber"
            isEmpty
            icon={<Icon icon={Sparkles} size="xl" color="var(--color-warm-500)" />}
            onAdd={() => {}}
          />
        </Canvas>
      </Group>
      <Group title="Coming soon variant">
        <Canvas label="comingSoon" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', alignItems: 'start' }}>
          <StatsCard
            label="Threads grouped"
            value=""
            comingSoon
            learnHow="#"
            icon={<Icon icon={Layers} size="xl" color="var(--color-icon-muted)" />}
          />
        </Canvas>
      </Group>
      <Group title="With learn how link">
        <Canvas label="Populated and empty states" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', alignItems: 'start' }}>
          <StatsCard
            label="Highlights saved"
            value="12"
            accent="amber"
            learnHow="#"
            icon={<Icon icon={Sparkles} size="xl" color="var(--color-accent-amber)" />}
          />
          <StatsCard
            label="Highlights saved"
            value="0"
            accent="amber"
            isEmpty
            learnHow="#"
            icon={<Icon icon={Sparkles} size="xl" color="var(--color-accent-amber)" />}
          />
          <StatsCard
            label="Questions asked"
            value="42"
            accent="teal"
            subtitle="Resets May 1"
            icon={<Icon icon={MessageSquare} size="xl" color="var(--color-accent-teal)" />}
          />
        </Canvas>
      </Group>
      <Group title="With cap and resetDate">
        <Canvas label="cap and resetDate props" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', alignItems: 'start' }}>
          <StatsCard
            label="Questions asked"
            value="42"
            cap={150}
            accent="teal"
            resetDate="Resets May 1"
            icon={<Icon icon={MessageSquare} size="xl" color="var(--color-accent-teal)" />}
          />
          <StatsCard
            label="Questions asked"
            value="0"
            cap={20}
            accent="teal"
            isEmpty
            resetDate="Resets May 1"
            icon={<Icon icon={MessageSquare} size="xl" color="var(--color-accent-teal)" />}
          />
          <StatsCard
            label="Highlights saved"
            value="12"
            cap={50}
            accent="amber"
            learnHow="#"
            icon={<Icon icon={Sparkles} size="xl" color="var(--color-accent-amber)" />}
          />
        </Canvas>
      </Group>
    </>
  );
}

function HighlightCardPanel() {
  return (
    <>
      <ComponentTitle
        name="HighlightCard"
        description="Saved quote card showing highlighted text, source platform, tags and date."
      />
      <Group title="Examples">
        <Canvas label="Claude source" style={{ width: "360px" }}>
          <HighlightCard
            id="1"
            highlightedText="Design systems are not just about consistency — they are about shared language between design and engineering teams."
            tags={["design-systems", "collaboration", "tokens"]}
            sourcePlatform="Claude"
            sourceUrl="https://claude.ai"
            sourceTitle="Design systems deep dive"
            createdAt={new Date().toISOString()}
          />
        </Canvas>
        <Canvas label="ChatGPT source" style={{ width: "360px" }}>
          <HighlightCard
            id="2"
            highlightedText="React Server Components fundamentally change how we think about data fetching."
            tags={["react", "nextjs"]}
            sourcePlatform="ChatGPT"
            sourceUrl="https://chatgpt.com"
            sourceTitle="Next.js architecture"
            createdAt={new Date(Date.now() - 86400000 * 3).toISOString()}
          />
        </Canvas>
      </Group>
    </>
  );
}

function SelectionActionBarPanel() {
  const [count, setCount] = useState(0);
  return (
    <>
      <ComponentTitle
        name="SelectionActionBar"
        description="Fixed bottom bar that appears when items are selected. Shows count and bulk actions."
      />
      <Group title="0 selected">
        <Canvas label="Hidden state">
          <SelectionActionBar
            selectedCount={0}
            onAskCoda={() => {}}
            onAddToProject={() => {}}
            onDownload={() => {}}
            onDelete={() => {}}
            onClear={() => {}}
          />
          <p
            style={{
              fontSize: "var(--font-size-sm)",
              color: "hsl(var(--muted-foreground))",
              margin: 0,
            }}
          >
            Bar is hidden when selectedCount is 0
          </p>
        </Canvas>
      </Group>
      <Group title="Items selected">
        <Canvas label="1 selected">
          <SelectionActionBar
            selectedCount={1}
            onAskCoda={() => {}}
            onAddToProject={() => {}}
            onDownload={() => {}}
            onDelete={() => {}}
            onClear={() => {}}
          />
        </Canvas>
        <Canvas label="5 selected">
          <SelectionActionBar
            selectedCount={5}
            onAskCoda={() => {}}
            onAddToProject={() => {}}
            onDownload={() => {}}
            onDelete={() => {}}
            onClear={() => {}}
          />
        </Canvas>
      </Group>
      <Group title="Interactive">
        <Canvas
          label="Toggle selection count"
          style={{
            flexDirection: "column",
            gap: "16px",
            alignItems: "flex-start",
          }}
        >
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={() => setCount((c) => c + 1)}
              style={{
                padding: "6px 12px",
                borderRadius: "6px",
                border: "1px solid hsl(var(--border))",
                backgroundColor: "hsl(var(--card))",
                cursor: "pointer",
                fontSize: "var(--font-size-sm)",
              }}
            >
              + Select
            </button>
            <button
              onClick={() => setCount((c) => Math.max(0, c - 1))}
              style={{
                padding: "6px 12px",
                borderRadius: "6px",
                border: "1px solid hsl(var(--border))",
                backgroundColor: "hsl(var(--card))",
                cursor: "pointer",
                fontSize: "var(--font-size-sm)",
              }}
            >
              - Deselect
            </button>
            <button
              onClick={() => setCount(0)}
              style={{
                padding: "6px 12px",
                borderRadius: "6px",
                border: "1px solid hsl(var(--border))",
                backgroundColor: "hsl(var(--card))",
                cursor: "pointer",
                fontSize: "var(--font-size-sm)",
              }}
            >
              Clear
            </button>
          </div>
          <SelectionActionBar
            selectedCount={count}
            onAskCoda={() => {}}
            onAddToProject={() => {}}
            onDownload={() => {}}
            onDelete={() => {}}
            onClear={() => setCount(0)}
          />
        </Canvas>
      </Group>
    </>
  );
}

function ThreadSelectionMenuPanel() {
  return (
    <>
      <ComponentTitle
        name="ThreadSelectionMenu"
        description="Floating toolbar that appears when a user selects text in a chat message. Shows Highlight, Action, and Reminder actions."
      />
      <Group title="Menu">
        <Canvas label="Default (idle state)">
          <ThreadSelectionMenu onChoose={() => {}} />
        </Canvas>
        <Canvas label="Dark background" dark>
          <ThreadSelectionMenu onChoose={() => {}} />
        </Canvas>
      </Group>
    </>
  );
}

function ConversationCardPanel() {
  const mockConv = {
    id: "1",
    title: "Building a design system with tokens",
    platform: "Claude",
    message_count: 24,
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    has_embeddings: true,
    summary:
      "Explored how to structure design tokens for a multi-theme SaaS product.",
    quick_summary: {
      overview: "Token architecture discussion.",
      key_topics: ["design tokens", "dark mode"],
      reading_time_minutes: 3,
    },
    tags: "design,tokens,system",
  };
  return (
    <>
      <ComponentTitle
        name="ConversationCard"
        description="Card for a saved conversation with platform badge, actions and selection."
      />
      <Group title="Card view">
        <Canvas label="Default" style={{ width: "400px" }}>
          <ConversationCard
            conversation={mockConv}
            viewMode="card"
            onContinue={() => {}}
            onDelete={() => {}}
          />
        </Canvas>
        <Canvas label="Selectable" style={{ width: "400px" }}>
          <ConversationCard
            conversation={mockConv}
            viewMode="card"
            selectable
            isSelected={false}
            onSelect={() => {}}
            onContinue={() => {}}
            onDelete={() => {}}
          />
        </Canvas>
      </Group>
      <Group title="List view">
        <Canvas label="Default" style={{ width: "100%", maxWidth: "700px" }}>
          <ConversationCard
            conversation={mockConv}
            viewMode="list"
            onContinue={() => {}}
            onDelete={() => {}}
          />
        </Canvas>
      </Group>
    </>
  );
}

function ProjectCardPanel() {
  const mockProject = {
    id: "1",
    name: "ThreadCub Rebrand",
    description:
      "Full UI overhaul with new brand tokens, dark mode and 8px grid.",
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
  };
  const mockStats = {
    totalConversations: 18,
    totalMessages: 312,
    totalPins: 7,
    totalSources: 3,
    lastActivity: new Date(Date.now() - 3600000).toISOString(),
    sources: ["Claude", "ChatGPT"],
  };
  return (
    <>
      <ComponentTitle
        name="ProjectCard"
        description="Card for a project hub showing conversation count, sources and last activity."
      />
      <Group title="Card view">
        <Canvas label="Default" style={{ width: "360px" }}>
          <ProjectCard
            project={mockProject}
            stats={mockStats}
            viewMode="card"
            onClick={() => {}}
            onDelete={() => {}}
          />
        </Canvas>
        <Canvas label="Selectable" style={{ width: "360px" }}>
          <ProjectCard
            project={mockProject}
            stats={mockStats}
            viewMode="card"
            isSelected={false}
            onSelect={() => {}}
            onClick={() => {}}
            onDelete={() => {}}
          />
        </Canvas>
      </Group>
      <Group title="List view">
        <Canvas label="Default" style={{ width: "100%", maxWidth: "700px" }}>
          <ProjectCard
            project={mockProject}
            stats={mockStats}
            viewMode="list"
            onClick={() => {}}
            onDelete={() => {}}
          />
        </Canvas>
      </Group>
    </>
  );
}

function AuthCardPanel() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");

  const pageWrapperStyle: React.CSSProperties = {
    minHeight: "600px",
    width: "100%",
    backgroundColor: "var(--color-page-bg)",
    padding: "var(--spacing-16) var(--spacing-8)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "var(--border-radius-lg)",
    boxSizing: "border-box",
  };

  return (
    <>
      <ComponentTitle
        name="Auth Flow"
        description="Sign in, sign up, reset password, and update password cards — all using design system tokens."
      />

      <Group title="Sign In / Sign Up">
        <Canvas
          label="Page context — warm background wrapper"
          style={{ padding: 0, overflow: "hidden" }}
        >
          <div style={pageWrapperStyle} data-1p-ignore data-lpignore="true">
            <AuthCard
              mode={mode}
              onToggleMode={() =>
                setMode((m) => (m === "signin" ? "signup" : "signin"))
              }
              onSubmit={async () => {}}
              onGoogleAuth={() => {}}
              onGithubAuth={() => {}}
              padding="xl"
            />
          </div>
        </Canvas>
        <Canvas label="With error message">
          <div data-1p-ignore data-lpignore="true">
            <AuthCard
              mode="signin"
              message={{
                type: "error",
                text: "Incorrect email or password. Please try again.",
                dismissible: true,
              }}
              onSubmit={async () => {}}
            />
          </div>
        </Canvas>
        <Canvas label="With success message">
          <div data-1p-ignore data-lpignore="true">
            <AuthCard
              mode="signup"
              message={{
                type: "info",
                text: "You're on the waitlist! Check your email to confirm your account.",
                dismissible: false,
              }}
              onSubmit={async () => {}}
              showToggle={false}
            />
          </div>
        </Canvas>
      </Group>

      <Group title="Reset Password">
        <Canvas label="Page context" style={{ padding: 0, overflow: "hidden" }}>
          <div style={pageWrapperStyle}>
            <ResetPasswordCard
              onSubmit={async () => {}}
              onBackToSignIn={() => {}}
            />
          </div>
        </Canvas>
        <Canvas label="Success state">
          <ResetPasswordCard
            message={{
              type: "success",
              text: "Check your email for reset instructions.",
            }}
            onSubmit={async () => {}}
            onBackToSignIn={() => {}}
          />
        </Canvas>
        <Canvas label="Error state">
          <ResetPasswordCard
            message={{
              type: "error",
              text: "No account found with that email address.",
            }}
            onDismissMessage={() => {}}
            onSubmit={async () => {}}
            onBackToSignIn={() => {}}
          />
        </Canvas>
      </Group>

      <Group title="Update Password">
        <Canvas label="Page context" style={{ padding: 0, overflow: "hidden" }}>
          <div style={pageWrapperStyle}>
            <UpdatePasswordCard
              onSubmit={async () => {}}
              onBackToSignIn={() => {}}
            />
          </div>
        </Canvas>
        <Canvas label="Success state">
          <UpdatePasswordCard
            message={{
              type: "success",
              text: "Password updated successfully! Redirecting to dashboard...",
              dismissible: false,
            }}
            onBackToSignIn={() => {}}
          />
        </Canvas>
        <Canvas label="Invalid link">
          <UpdatePasswordCard
            message={{
              type: "error",
              text: "Invalid or expired reset link. Please request a new password reset.",
              dismissible: false,
            }}
            onBackToSignIn={() => {}}
          />
        </Canvas>
      </Group>
    </>
  );
}

function ExtensionCallbackPanel() {
  const pageWrapperStyle: React.CSSProperties = {
    minHeight: "400px",
    width: "100%",
    backgroundColor: "var(--color-page-bg)",
    padding: "var(--spacing-12) var(--spacing-8)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "var(--border-radius-lg)",
    boxSizing: "border-box",
  };
  return (
    <>
      <ComponentTitle
        name="ExtensionCallbackCard"
        description="Shown after the Chrome extension auth flow — loading, success, and error states."
      />
      <Group title="States">
        <Canvas
          label="Success — page context"
          style={{ padding: 0, overflow: "hidden" }}
        >
          <div style={pageWrapperStyle}>
            <ExtensionCallbackCard status="success" />
          </div>
        </Canvas>
        <Canvas label="Loading">
          <ExtensionCallbackCard status="loading" />
        </Canvas>
        <Canvas label="Error">
          <ExtensionCallbackCard
            status="error"
            errorMessage="No active session found. Please sign in and try again."
          />
        </Canvas>
      </Group>
    </>
  );
}

function ThreadFiltersPanel() {
  const [filters, setFilters] = useState({
    platforms: [] as string[],
    dateRange: "all" as const,
    projectId: "",
    topics: [] as string[],
  });
  const mockProjects = [
    { id: "1", name: "ThreadCub Rebrand" },
    { id: "2", name: "Side Projects" },
  ];
  const mockConvs = [
    { platform: "Claude", tags: ["design", "tokens"] },
    { platform: "ChatGPT", tags: ["react", "nextjs"] },
  ];
  return (
    <>
      <ComponentTitle
        name="ThreadFilters"
        description="Filter bar for conversations — platform, date range, project and topic filters."
      />
      <Group title="Interactive">
        <Canvas
          label="Default state"
          style={{ width: "100%", alignItems: "flex-start" }}
        >
          <ThreadFilters
            filters={filters}
            onChange={(f) => setFilters(f as any)}
            projects={mockProjects}
            conversations={mockConvs}
          />
        </Canvas>
      </Group>
    </>
  );
}

function TabFilterPanelPlayground() {
  const [state, setState] = useState<TabFilterState>(DEFAULT_TAB_FILTER_STATE)
  return (
    <>
      <ComponentTitle
        name="TabFilterPanel"
        description="Filter/sort bar for Highlights, Actions and Reminders tabs. Single horizontal row with two dropdowns and two mutually-exclusive checkboxes."
      />
      <Group title="Default (no platform data)">
        <Canvas label="hasPlatformData=false — AI Platform option is disabled">
          <TabFilterPanel state={state} onChange={setState} />
          <pre style={{ marginTop: 12, fontSize: 12, color: 'var(--color-text-muted)' }}>{JSON.stringify(state, null, 2)}</pre>
        </Canvas>
      </Group>
      <Group title="With platform data">
        <Canvas label="hasPlatformData=true — all options enabled">
          <TabFilterPanel state={state} onChange={setState} />
        </Canvas>
      </Group>
    </>
  )
}

function PageHeaderPanel() {
  const [search, setSearch] = useState("");
  const [view, setView] = useState("list");
  const [filters, setFilters] = useState({
    platforms: [] as string[],
    dateRange: "all" as const,
    projectId: "all",
    topics: [] as string[],
  });
  return (
    <>
      <ComponentTitle
        name="PageHeader"
        description="Reusable page header with title, subtitle, search, filters, view toggle and refresh."
      />
      <Group title="Title only">
        <Canvas
          label="Title + subtitle"
          style={{
            flexDirection: "column",
            alignItems: "stretch",
            padding: 0,
            overflow: "hidden",
          }}
        >
          <PageHeader title="Projects" subtitle="3 active projects" />
        </Canvas>
      </Group>
      <Group title="With search">
        <Canvas
          label="Search bar"
          style={{
            flexDirection: "column",
            alignItems: "stretch",
            padding: 0,
            overflow: "hidden",
          }}
        >
          <PageHeader
            title="Threads"
            subtitle="20 threads across 2 AI platforms"
            showSearch
            searchQuery={search}
            searchPlaceholder="Search conversations..."
            onSearchChange={setSearch}
            onSearchClear={() => setSearch("")}
          />
        </Canvas>
      </Group>
      <Group title="Full featured">
        <Canvas
          label="Search + filters + view toggle + refresh"
          style={{
            flexDirection: "column",
            alignItems: "stretch",
            padding: 0,
            overflow: "hidden",
          }}
        >
          <PageHeader
            title="Threads"
            subtitle="20 threads across 2 AI platforms"
            showSearch
            searchQuery={search}
            searchPlaceholder="Search conversations..."
            onSearchChange={setSearch}
            onSearchClear={() => setSearch("")}
            showFilters
            filters={filters}
            filterProjects={[
              { id: "1", name: "ThreadCub Rebrand" },
              { id: "2", name: "Side Projects" },
            ]}
            filterConversations={[
              { platform: "Claude" },
              { platform: "ChatGPT" },
            ]}
            onFiltersChange={(f) => setFilters(f as any)}
            showViewToggle
            viewMode={view}
            onViewModeChange={setView}
            showRefresh
            isRefreshing={false}
            onRefresh={() => {}}
          />
        </Canvas>
      </Group>
      <Group title="With back button">
        <Canvas
          label="Back + title + actions"
          style={{
            flexDirection: "column",
            alignItems: "stretch",
            padding: 0,
            overflow: "hidden",
          }}
        >
          <PageHeader
            title="ThreadCub Rebrand"
            subtitle="18 conversations · Last active 1hr ago"
            showBack
            onBack={() => {}}
            actions={
              <button
                style={{
                  padding: "6px 14px",
                  borderRadius: "6px",
                  border: "1px solid hsl(var(--border))",
                  backgroundColor: "hsl(var(--primary))",
                  color: "white",
                  fontSize: "var(--font-size-sm)",
                  cursor: "pointer",
                }}
              >
                New Thread
              </button>
            }
          />
        </Canvas>
      </Group>
    </>
  );
}

function SocialButtonPanel() {
  return (
    <>
      <ComponentTitle
        name="SocialButton"
        description="OAuth provider button with icon, label, loading state and size variants."
      />
      <Group title="Providers">
        <Canvas
          label="All providers"
          style={{
            flexDirection: "column",
            gap: "8px",
            alignItems: "flex-start",
          }}
        >
          <SocialButton provider="google" action="signin" onClick={() => {}} />
          <SocialButton provider="github" action="signin" onClick={() => {}} />
          <SocialButton provider="apple" action="signin" onClick={() => {}} />
          <SocialButton
            provider="microsoft"
            action="signin"
            onClick={() => {}}
          />
        </Canvas>
      </Group>
      <Group title="Actions">
        <Canvas
          label="signin / signup / continue"
          style={{
            flexDirection: "column",
            gap: "8px",
            alignItems: "flex-start",
          }}
        >
          <SocialButton provider="google" action="signin" onClick={() => {}} />
          <SocialButton provider="google" action="signup" onClick={() => {}} />
          <SocialButton
            provider="google"
            action="continue"
            onClick={() => {}}
          />
        </Canvas>
      </Group>
      <Group title="Sizes">
        <Canvas
          label="sm / md / lg"
          style={{
            flexDirection: "column",
            gap: "8px",
            alignItems: "flex-start",
          }}
        >
          <SocialButton
            provider="google"
            action="signin"
            size="sm"
            onClick={() => {}}
          />
          <SocialButton
            provider="google"
            action="signin"
            size="md"
            onClick={() => {}}
          />
          <SocialButton
            provider="google"
            action="signin"
            size="lg"
            onClick={() => {}}
          />
        </Canvas>
      </Group>
      <Group title="States">
        <Canvas label="loading / disabled">
          <SocialButton
            provider="google"
            action="signin"
            loading
            onClick={() => {}}
          />
          <SocialButton
            provider="google"
            action="signin"
            disabled
            onClick={() => {}}
          />
        </Canvas>
      </Group>
    </>
  );
}

function SelectableChipPanel() {
  const [selected, setSelected] = useState<string | null>(null);
  const [multi, setMulti] = useState<Set<string>>(new Set());

  const toggle = (key: string) =>
    setMulti((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  return (
    <>
      <ComponentTitle
        name="SelectableChip"
        description="Toggle chip for selecting one or many options. Height 40px, pill shape, icon + label. Default state uses surface-sunken; selected state uses surface-inverse for high contrast."
      />

      <Group title="Single select — insight tags">
        <Canvas label="Click to select one">
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            <SelectableChip
              label="Note"
              icon={SquarePen}
              selected={selected === "note"}
              onClick={() => setSelected(selected === "note" ? null : "note")}
            />
            <SelectableChip
              label="Breakthrough"
              icon={Lightbulb}
              selected={selected === "breakthrough"}
              onClick={() =>
                setSelected(selected === "breakthrough" ? null : "breakthrough")
              }
            />
            <SelectableChip
              label="Mistake"
              icon={TriangleAlert}
              selected={selected === "mistake"}
              onClick={() =>
                setSelected(selected === "mistake" ? null : "mistake")
              }
            />
            <SelectableChip
              label="Rework"
              icon={RotateCcw}
              selected={selected === "rework"}
              onClick={() =>
                setSelected(selected === "rework" ? null : "rework")
              }
            />
            <SelectableChip
              label="Friction"
              icon={Flame}
              selected={selected === "friction"}
              onClick={() =>
                setSelected(selected === "friction" ? null : "friction")
              }
            />
          </div>
        </Canvas>
      </Group>

      <Group title="Multi select">
        <Canvas label="Click to toggle multiple">
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            <SelectableChip
              label="Design"
              icon={Star}
              selected={multi.has("design")}
              onClick={() => toggle("design")}
            />
            <SelectableChip
              label="Research"
              icon={Sparkles}
              selected={multi.has("research")}
              onClick={() => toggle("research")}
            />
            <SelectableChip
              label="Favourite"
              icon={Heart}
              selected={multi.has("fav")}
              onClick={() => toggle("fav")}
            />
            <SelectableChip
              label="Tagged"
              icon={Tag}
              selected={multi.has("tagged")}
              onClick={() => toggle("tagged")}
            />
          </div>
        </Canvas>
      </Group>

      <Group title="States">
        <Canvas label="Default / Selected / Disabled">
          <SelectableChip
            label="Default"
            icon={SquarePen}
            selected={false}
            onClick={() => {}}
          />
          <SelectableChip
            label="Selected"
            icon={SquarePen}
            selected={true}
            onClick={() => {}}
          />
          <SelectableChip
            label="Disabled"
            icon={SquarePen}
            selected={false}
            onClick={() => {}}
            disabled
          />
        </Canvas>
      </Group>
    </>
  );
}

function TagPickerPanel() {
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [customTags, setCustomTags] = useState<string[]>([]);
  const mockAddTag = async (name: string) => {
    setCustomTags((prev) => (prev.includes(name) ? prev : [...prev, name]));
    return name;
  };
  return (
    <>
      <ComponentTitle
        name="TagPicker"
        description="Single-select tag row used inside save modals. Shows preset tags plus user-defined tags loaded from user_tags. Includes an inline Add tag flow."
      />
      <Group title="Preset tags only">
        <Canvas label="None selected">
          <TagPicker
            customTags={[]}
            selectedTag={null}
            onSelect={() => {}}
            onAddTag={mockAddTag}
          />
        </Canvas>
        <Canvas label="One selected">
          <TagPicker
            customTags={[]}
            selectedTag="breakthrough"
            onSelect={() => {}}
            onAddTag={mockAddTag}
          />
        </Canvas>
      </Group>
      <Group title="With custom tags">
        <Canvas label="Custom tags appended after presets">
          <TagPicker
            customTags={["product-thinking", "ux-debt"]}
            selectedTag="ux-debt"
            onSelect={() => {}}
            onAddTag={mockAddTag}
          />
        </Canvas>
      </Group>
      <Group title="Interactive">
        <Canvas label="Click tags to select / deselect. Use Add tag to create a new one.">
          <TagPicker
            customTags={customTags}
            selectedTag={selectedTag}
            onSelect={(t) => setSelectedTag(t)}
            onAddTag={mockAddTag}
          />
          {selectedTag && (
            <p style={{ margin: "8px 0 0", fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>
              Selected: <strong>{selectedTag}</strong>
            </p>
          )}
        </Canvas>
      </Group>
    </>
  );
}

function MenuPanel() {
  return (
    <div>
      <ComponentTitle
        name="Menu"
        description="Floating menu primitive. Portal-based, keyboard nav, viewport-aware positioning. Used by OverflowMenu and Input select."
      />
      <div
        style={{
          display: "flex",
          gap: "var(--spacing-4)",
          flexWrap: "wrap",
          alignItems: "flex-start",
        }}
      >
        <Menu
          align="left"
          options={[
            {
              label: "Edit",
              icon: (
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
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
              ),
              onClick: () => alert("Edit"),
            },
            {
              label: "Duplicate",
              icon: (
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
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
              ),
              onClick: () => alert("Duplicate"),
            },
            {
              label: "Delete",
              icon: (
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
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              ),
              onClick: () => alert("Delete"),
              danger: true,
            },
          ]}
          trigger={(open, isOpen) => (
            <button
              onClick={open}
              style={{
                padding: "8px 16px",
                background: isOpen
                  ? "var(--color-warm-200)"
                  : "var(--color-warm-100)",
                border: "1px solid var(--color-warm-300)",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "14px",
                color: "var(--color-warm-900)",
              }}
            >
              Open Menu ↓
            </button>
          )}
        />
      </div>
    </div>
  );
}

function DeleteProjectModalPanel() {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <ComponentTitle
        name="DeleteProjectModal"
        description="Confirmation modal for deleting a project. Warns that threads won't be deleted."
      />
      <button
        onClick={() => setOpen(true)}
        style={{
          padding: "8px 16px",
          background: "var(--color-error)",
          color: "#fff",
          border: "none",
          borderRadius: "8px",
          cursor: "pointer",
          fontSize: "14px",
        }}
      >
        Open Delete Project Modal
      </button>
      {open && (
        <DeleteProjectModal
          projectName="My Project"
          onConfirm={async () => {
            alert("Deleted");
            setOpen(false);
          }}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}

function AddToProjectModalPanel() {
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const mockProjects = [
    { id: "1", name: "Project Alpha" },
    { id: "2", name: "Project Beta" },
    { id: "3", name: "Project Gamma" },
  ];
  return (
    <div>
      <ComponentTitle
        name="AddToProjectModal"
        description="Modal for assigning a conversation to a project via a select dropdown."
      />
      <button
        onClick={() => setOpen(true)}
        style={{
          padding: "8px 16px",
          background: "var(--color-primary)",
          color: "#fff",
          border: "none",
          borderRadius: "8px",
          cursor: "pointer",
          fontSize: "14px",
        }}
      >
        Open Add to Project Modal
      </button>
      {open && (
        <AddToProjectModal
          conversationTitle="Example conversation title"
          projects={mockProjects}
          selectedProjectId={selectedId}
          onChangeProject={setSelectedId}
          onConfirm={async () => {
            alert("Added to: " + selectedId);
            setOpen(false);
            setSelectedId("");
          }}
          onClose={() => {
            setOpen(false);
            setSelectedId("");
          }}
        />
      )}
    </div>
  );
}

function NewProjectModalPanel() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [open, setOpen] = useState(false);
  return (
    <div>
      <ComponentTitle
        name="NewProjectModal"
        description="Modal for creating a new project with name and description fields."
      />
      <button
        onClick={() => setOpen(true)}
        style={{
          padding: "8px 16px",
          background: "var(--color-primary)",
          color: "#fff",
          border: "none",
          borderRadius: "8px",
          cursor: "pointer",
          fontSize: "14px",
        }}
      >
        Open New Project Modal
      </button>
      {open && (
        <NewProjectModal
          name={name}
          description={description}
          onChangeName={setName}
          onChangeDescription={setDescription}
          onConfirm={async () => {
            alert("Created: " + name);
            setOpen(false);
            setName("");
            setDescription("");
          }}
          onClose={() => {
            setOpen(false);
            setName("");
            setDescription("");
          }}
        />
      )}
    </div>
  );
}

function ModalHeaderPanel() {
  return (
    <>
      <ComponentTitle
        name="ModalHeader"
        description="Consistent modal header with title, optional subtitle, close button, optional children slot, and optional divider."
      />
      <Group title="Title only">
        <Canvas label="No subtitle, no divider">
          <div
            style={{
              border: "1px solid var(--color-warm-300)",
              borderRadius: "var(--border-radius-xl)",
              overflow: "hidden",
              width: "100%",
              maxWidth: 480,
            }}
          >
            <ModalHeader
              title="Modal title"
              onClose={() => {}}
              divider={false}
            />
          </div>
        </Canvas>
      </Group>
      <Group title="With subtitle">
        <Canvas label="Subtitle + divider">
          <div
            style={{
              border: "1px solid var(--color-warm-300)",
              borderRadius: "var(--border-radius-xl)",
              overflow: "hidden",
              width: "100%",
              maxWidth: 480,
            }}
          >
            <ModalHeader
              title="Modal title"
              subtitle="A short description of what this modal does."
              onClose={() => {}}
              divider={true}
            />
          </div>
        </Canvas>
      </Group>
      <Group title="With children slot">
        <Canvas label="Select-all row below subtitle">
          <div
            style={{
              border: "1px solid var(--color-warm-300)",
              borderRadius: "var(--border-radius-xl)",
              overflow: "hidden",
              width: "100%",
              maxWidth: 480,
            }}
          >
            <ModalHeader
              title="Modal title"
              subtitle="Pick the items you want."
              onClose={() => {}}
              divider={true}
            >
              <div
                style={{
                  fontSize: "var(--font-size-sm)",
                  color: "var(--color-warm-700)",
                }}
              >
                ↳ children slot (e.g. select-all)
              </div>
            </ModalHeader>
          </div>
        </Canvas>
      </Group>
    </>
  );
}

function ModalFooterPanel() {
  return (
    <>
      <ComponentTitle
        name="ModalFooter"
        description="Consistent modal footer with left-aligned buttons and optional top divider. Cancel is anchored left so dynamic button labels don't shift layout."
      />
      <Group title="Standard">
        <Canvas label="Cancel + primary action">
          <div
            style={{
              border: "1px solid var(--color-warm-300)",
              borderRadius: "var(--border-radius-xl)",
              overflow: "hidden",
              width: "100%",
              maxWidth: 480,
            }}
          >
            <ModalFooter>
              <Button variant="tertiary" size="sm" onClick={() => {}}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={() => {}}>
                Confirm
              </Button>
            </ModalFooter>
          </div>
        </Canvas>
      </Group>
      <Group title="Dynamic label">
        <Canvas label="Primary label changes width — Cancel stays put">
          <div
            style={{
              border: "1px solid var(--color-warm-300)",
              borderRadius: "var(--border-radius-xl)",
              overflow: "hidden",
              width: "100%",
              maxWidth: 480,
            }}
          >
            <ModalFooter>
              <Button variant="tertiary" size="sm" onClick={() => {}}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={() => {}}>
                Claim all 12 threads
              </Button>
            </ModalFooter>
          </div>
        </Canvas>
      </Group>
      <Group title="Destructive">
        <Canvas label="Cancel + danger action">
          <div
            style={{
              border: "1px solid var(--color-warm-300)",
              borderRadius: "var(--border-radius-xl)",
              overflow: "hidden",
              width: "100%",
              maxWidth: 480,
            }}
          >
            <ModalFooter>
              <Button variant="tertiary" size="sm" onClick={() => {}}>
                Cancel
              </Button>
              <Button variant="danger" size="sm" onClick={() => {}}>
                Delete
              </Button>
            </ModalFooter>
          </div>
        </Canvas>
      </Group>
      <Group title="noPadding">
        <Canvas label="noPadding={true} — used inside CodaModal">
          <div
            style={{
              border: "1px solid var(--color-warm-300)",
              borderRadius: "var(--border-radius-xl)",
              overflow: "hidden",
              width: "100%",
              maxWidth: 480,
            }}
          >
            <ModalFooter noPadding={true}>
              <Button variant="tertiary" size="sm" onClick={() => {}}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={() => {}}>
                Confirm
              </Button>
            </ModalFooter>
          </div>
        </Canvas>
      </Group>
    </>
  );
}

function ClaimModalPanel() {
  const [shown, setShown] = useState(false);
  const [claiming, setClaiming] = useState(false);

  const mockConversations: ClaimableConversation[] = [
    {
      id: "1",
      title: "TC fix Extension pt2",
      platform: "claude",
      created_at: "2026-03-12T09:00:00Z",
    },
    {
      id: "2",
      title: "Giacom Design Leadership - Slide Review Structure",
      platform: "chatgpt",
      created_at: "2026-03-11T14:00:00Z",
    },
    {
      id: "3",
      title: "TC improve claim flow pt1",
      platform: "claude",
      created_at: "2026-03-11T10:00:00Z",
    },
    {
      id: "4",
      title: "Product roadmap brainstorm",
      platform: "gemini",
      created_at: "2026-03-10T16:00:00Z",
    },
  ];

  return (
    <>
      <ComponentTitle
        name="ClaimModal"
        description="Modal for claiming anonymous conversations after sign-in. Supports select all, deselect, and partial selection."
      />
      <Group title="Interactive">
        <Canvas label="Click to open modal">
          <Button variant="primary" size="sm" onClick={() => setShown(true)}>
            Claim Now
          </Button>
          {shown && (
            <ClaimModal
              conversations={mockConversations}
              claiming={claiming}
              discarding={false}
              onClaim={async (ids) => {
                setClaiming(true);
                await new Promise((r) => setTimeout(r, 1500));
                setClaiming(false);
                setShown(false);
              }}
              onCancel={() => setShown(false)}
              onDiscard={async () => setShown(false)}
            />
          )}
        </Canvas>
      </Group>
    </>
  );
}

function DeleteConversationModalPanel() {
  const [isDeleting, setIsDeleting] = useState(false);
  const [shown, setShown] = useState(false);
  return (
    <>
      <ComponentTitle
        name="DeleteConversationModal"
        description="Confirmation modal for destructive delete action. Fixed overlay with cancel and confirm."
      />
      <Group title="States">
        <Canvas
          label="Idle — click button to open"
          style={{ flexDirection: "column", gap: "12px" }}
        >
          <Button variant="danger" size="sm" onClick={() => setShown(true)}>
            Delete conversation
          </Button>
          {shown && (
            <DeleteConversationModal
              title="ThreadCub Rebrand pt 16 — Claude"
              isDeleting={isDeleting}
              onConfirm={() => {
                setIsDeleting(true);
                setTimeout(() => {
                  setIsDeleting(false);
                  setShown(false);
                }, 1500);
              }}
              onCancel={() => setShown(false)}
            />
          )}
        </Canvas>
      </Group>
    </>
  );
}

function PinInsightModalPanel() {
  const [shown, setShown] = useState(false);
  const [shownWithProject, setShownWithProject] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  const mockContent = `## Core Project: Modernising Claim & Thread Management\n\nYou've been systematically rebuilding how users interact with claimed conversations and threads. The work splits into two major streams — Claim Banner & Cloud Sync.`;

  return (
    <>
      <ComponentTitle
        name="PinInsightModal"
        description="Modal for tagging and pinning a RAG response as a project insight. Supports tag selection, optional note, and an optional project picker when used outside a project context."
      />
      <Group title="Inside a project">
        <Canvas label="With projectName — click to open">
          <Button variant="secondary" size="sm" onClick={() => setShown(true)}>
            Pin as Insight
          </Button>
          {shown && (
            <PinInsightModal
              content={mockContent}
              projectName="Test Project"
              onSave={async (type, tag, note) => {
                setLastSaved(`type: ${type} · tag: ${tag ?? '—'}${note ? ` · note: ${note}` : ""}`);
                setShown(false);
              }}
              onCancel={() => setShown(false)}
            />
          )}
          {lastSaved && !shown && (
            <p
              style={{
                margin: 0,
                fontSize: "var(--font-size-xs)",
                color: "var(--color-text-success)",
              }}
            >
              Saved — {lastSaved}
            </p>
          )}
        </Canvas>
      </Group>
      <Group title="With project picker">
        <Canvas label="projects prop — choose destination project">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShownWithProject(true)}
          >
            Pin as Insight
          </Button>
          {shownWithProject && (
            <PinInsightModal
              content={mockContent}
              projects={[
                { id: "p1", name: "Test Project" },
                { id: "p2", name: "Product Research" },
                { id: "p3", name: "UX Explorations" },
              ]}
              onSave={async (type, tag, note, projectId) => {
                setLastSaved(
                  `type: ${type} · tag: ${tag ?? '—'} · project: ${projectId ?? '—'}${note ? ` · note: ${note}` : ""}`,
                );
                setShownWithProject(false);
              }}
              onCancel={() => setShownWithProject(false)}
            />
          )}
        </Canvas>
      </Group>
    </>
  );
}

function QuickSummaryPanel() {
  const mockSummary = {
    overview:
      "This conversation covered the full ThreadCub rebrand — introducing new brand colour tokens, an 8px grid layout system, dark mode support, and a collapsible side navigation overhaul across multiple components.",
    problems_solved: [
      "Token naming inconsistencies across 49 files resolved",
      "Dropdown clipping fixed using React portals",
      "SideNav collapse animation smoothed with CSS transitions",
    ],
    key_topics: [
      "design tokens",
      "dark mode",
      "rebrand",
      "component library",
      "8px grid",
      "SideNav",
      "PlanCard",
      "OverflowMenu",
      "NewProjectModal",
      "DeleteProjectModal",
      "AddToProjectModal",
      "Menu",
      "Tokens",
      "Icon",
      "SectionCard",
      "EmptyState",
    ],
    reading_time_minutes: 8,
  };
  return (
    <>
      <ComponentTitle
        name="QuickSummary"
        description="Free AI-generated summary card shown on conversation detail pages. Shows overview, topics and problems addressed."
      />
      <Group title="With upgrade prompt">
        <Canvas label="showUpgradeButton=true" style={{ width: "100%" }}>
          <QuickSummary
            conversationId="demo"
            messageCount={42}
            existingSummary={mockSummary}
            showUpgradeButton={true}
            onUpgrade={() => {}}
          />
        </Canvas>
      </Group>
      <Group title="Summary only">
        <Canvas label="showUpgradeButton=false" style={{ width: "100%" }}>
          <QuickSummary
            conversationId="demo"
            messageCount={42}
            existingSummary={mockSummary}
            showUpgradeButton={false}
          />
        </Canvas>
      </Group>
    </>
  );
}

function ScopeChipPanel() {
  const mockProjects = [
    { id: "1", name: "ThreadCub Rebrand" },
    { id: "2", name: "Side Projects" },
    { id: "3", name: "Giacom Design System" },
  ];

  function ScopeChipDemo({
    scoped,
    label,
    locked,
    open: initialOpen,
  }: {
    scoped: boolean;
    label: string;
    locked?: boolean;
    open?: boolean;
  }) {
    const [open, setOpen] = useState(initialOpen ?? false);
    return (
      <div style={{ position: "relative", display: "inline-block" }}>
        <button
          type="button"
          onClick={() => !locked && setOpen((o) => !o)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
            padding: "3px 10px 3px 8px",
            borderRadius: "9999px",
            fontSize: "12px",
            fontWeight: 500,
            border: "1.5px solid",
            cursor: locked ? "default" : "pointer",
            transition: "all 0.15s",
            borderColor: scoped ? "#6366f1" : "#d1d5db",
            backgroundColor: scoped ? "#eef2ff" : "#f9fafb",
            color: scoped ? "#4338ca" : "#6b7280",
          }}
        >
          {scoped ? (
            <svg
              width="12"
              height="12"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M2 4h12M2 8h8M2 12h5" strokeLinecap="round" />
            </svg>
          ) : (
            <svg
              width="12"
              height="12"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="8" cy="8" r="6" />
              <path
                d="M8 2a9 9 0 0 1 0 12M8 2a9 9 0 0 0 0 12M2 8h12"
                strokeLinecap="round"
              />
            </svg>
          )}
          {label}
          {!locked && (
            <svg
              width="10"
              height="10"
              viewBox="0 0 10 10"
              style={{
                transition: "transform 0.15s",
                transform: open ? "rotate(180deg)" : "rotate(0deg)",
                marginLeft: "1px",
              }}
            >
              <path
                d="M1.5 3.5l3.5 3.5 3.5-3.5"
                stroke="currentColor"
                strokeWidth="1.5"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </button>
        {open && (
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 6px)",
              left: 0,
              zIndex: 100,
              background: "white",
              border: "1px solid #e5e7eb",
              borderRadius: "10px",
              boxShadow: "0 8px 24px rgba(0,0,0,0.10)",
              minWidth: "220px",
              padding: "6px",
            }}
          >
            {[
              { id: "all", name: "All threads", global: true },
              ...mockProjects,
            ].map((p, i) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setOpen(false)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "7px 10px",
                  borderRadius: "7px",
                  border: "none",
                  background: i === 0 && !scoped ? "#eef2ff" : "none",
                  cursor: "pointer",
                  fontSize: "13px",
                  textAlign: "left",
                  color: i === 0 && !scoped ? "#4338ca" : "#374151",
                  fontWeight: i === 0 && !scoped ? 600 : 400,
                }}
              >
                {p.id === "all" ? (
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <circle cx="8" cy="8" r="6" />
                    <path
                      d="M8 2a9 9 0 0 1 0 12M8 2a9 9 0 0 0 0 12M2 8h12"
                      strokeLinecap="round"
                    />
                  </svg>
                ) : (
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <path d="M2 4h12M2 8h8M2 12h5" strokeLinecap="round" />
                  </svg>
                )}
                {p.name}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <ComponentTitle
        name="ScopeChip"
        description="Pill button for scoping the RAG chat panel to all threads or a specific project. Lives in the RAG panel header."
      />
      <Group title="States">
        <Canvas label="Global (all threads)">
          <ScopeChipDemo scoped={false} label="All threads" />
        </Canvas>
        <Canvas label="Scoped to project">
          <ScopeChipDemo scoped={true} label="ThreadCub Rebrand" />
        </Canvas>
        <Canvas label="Locked (on project page)">
          <ScopeChipDemo scoped={true} label="ThreadCub Rebrand" locked />
        </Canvas>
      </Group>
      <Group title="Interactive">
        <Canvas label="Click to open dropdown">
          <ScopeChipDemo scoped={false} label="All threads" open={false} />
        </Canvas>
      </Group>
    </>
  );
}

function CounterPanel() {
  return (
    <>
      <ComponentTitle
        name="Counter"
        description="Numeric count pill used in nav items and cards. Has inactive (outlined) and active (filled) states."
      />
      <Group title="States">
        <Canvas label="Inactive (default)">
          <Counter count={3} />
          <Counter count={20} />
          <Counter count={99} />
          <Counter count={100} />
        </Canvas>
        <Canvas label="Active (filled)">
          <Counter count={3} active />
          <Counter count={20} active />
          <Counter count={99} active />
          <Counter count={100} active />
        </Canvas>
      </Group>
      <Group title="Sizes">
        <Canvas label="md (default) / sm">
          <Counter count={20} size="md" />
          <Counter count={20} size="sm" />
          <Counter count={20} active size="md" />
          <Counter count={20} active size="sm" />
        </Canvas>
      </Group>
      <Group title="In context">
        <Canvas label="Nav item — inactive">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "14px",
              color: "var(--color-warm-600)",
            }}
          >
            <span>Conversations</span>
            <Counter count={20} />
          </div>
        </Canvas>
        <Canvas label="Nav item — active">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "14px",
              fontWeight: 500,
              color: "var(--color-warm-900)",
            }}
          >
            <span>Conversations</span>
            <Counter count={20} active />
          </div>
        </Canvas>
      </Group>
    </>
  );
}

function TypeScalePanel() {
  const sizes = [
    {
      token: "--font-size-4xl",
      value: "40px",
      label: "4XL",
      usage: "Hero headings",
    },
    {
      token: "--font-size-3xl",
      value: "32px",
      label: "3XL",
      usage: "Page titles, stat values",
    },
    {
      token: "--font-size-2xl",
      value: "24px",
      label: "2XL",
      usage: "Section headings",
    },
    {
      token: "--font-size-lg",
      value: "18px",
      label: "LG",
      usage: "Card headings",
    },
    {
      token: "--font-size-base",
      value: "16px",
      label: "Base",
      usage: "Body text",
    },
    {
      token: "--font-size-sm",
      value: "14px",
      label: "SM",
      usage: "Labels, nav items, buttons",
    },
    {
      token: "--font-size-xs",
      value: "12px",
      label: "XS",
      usage: "Subtitles, captions, badges",
    },
    {
      token: "--font-size-tooltip",
      value: "13px",
      label: "Tooltip",
      usage: "Tooltips",
    },
  ];
  const weights = [
    { token: "--font-weight-normal", value: "400", label: "Normal" },
    { token: "--font-weight-medium", value: "500", label: "Medium" },
    { token: "--font-weight-semibold", value: "600", label: "Semibold" },
    { token: "--font-weight-bold", value: "700", label: "Bold" },
  ];
  return (
    <>
      <ComponentTitle
        name="Type Scale"
        description="All font size and weight tokens available in the design system."
      />
      <Group title="Font Sizes">
        {sizes.map(({ token, value, label, usage }) => (
          <div
            key={token}
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: "24px",
              padding: "16px 0",
              borderBottom: "1px solid var(--color-warm-300)",
            }}
          >
            <div style={{ width: "120px", flexShrink: 0 }}>
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: "700",
                  color: "var(--color-warm-500)",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                }}
              >
                {label}
              </div>
              <div
                style={{
                  fontSize: "11px",
                  color: "var(--color-warm-500)",
                  marginTop: "2px",
                }}
              >
                {value}
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: `var(${token})`,
                  color: "var(--color-warm-900)",
                  fontFamily: "var(--font-family-primary)",
                  lineHeight: 1.2,
                }}
              >
                The quick brown fox
              </div>
              <div
                style={{
                  fontSize: "11px",
                  color: "var(--color-warm-500)",
                  marginTop: "4px",
                  fontFamily: "var(--font-family-primary)",
                }}
              >
                {token}
              </div>
            </div>
            <div
              style={{
                width: "200px",
                flexShrink: 0,
                fontSize: "12px",
                color: "var(--color-warm-600)",
                fontFamily: "var(--font-family-primary)",
              }}
            >
              {usage}
            </div>
          </div>
        ))}
      </Group>
      <Group title="Font Weights">
        {weights.map(({ token, value, label }) => (
          <div
            key={token}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "24px",
              padding: "16px 0",
              borderBottom: "1px solid var(--color-warm-300)",
            }}
          >
            <div style={{ width: "120px", flexShrink: 0 }}>
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: "700",
                  color: "var(--color-warm-500)",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                }}
              >
                {label}
              </div>
              <div
                style={{
                  fontSize: "11px",
                  color: "var(--color-warm-500)",
                  marginTop: "2px",
                }}
              >
                {value}
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: "var(--font-size-lg)",
                  fontWeight: `var(${token})`,
                  color: "var(--color-warm-900)",
                  fontFamily: "var(--font-family-primary)",
                }}
              >
                The quick brown fox
              </div>
              <div
                style={{
                  fontSize: "11px",
                  color: "var(--color-warm-500)",
                  marginTop: "4px",
                  fontFamily: "var(--font-family-primary)",
                }}
              >
                {token}
              </div>
            </div>
          </div>
        ))}
      </Group>
    </>
  );
}

function PlanCardPanel() {
  return (
    <>
      <ComponentTitle
        name="PlanCard"
        description="Pricing card for each subscription tier. Shows price, features and CTA based on current plan state."
      />
      <Group title="All tiers — monthly">
        <Canvas label="Free">
          <div style={{ maxWidth: "240px" }}>
            <PlanCard tier="free" billingPeriod="monthly" />
          </div>
        </Canvas>
        <Canvas label="Starter">
          <div style={{ maxWidth: "240px" }}>
            <PlanCard tier="starter" billingPeriod="monthly" />
          </div>
        </Canvas>
        <Canvas label="Pro (popular)">
          <div style={{ maxWidth: "240px" }}>
            <PlanCard tier="pro" isPopular billingPeriod="monthly" />
          </div>
        </Canvas>
        <Canvas label="Unlimited">
          <div style={{ maxWidth: "240px" }}>
            <PlanCard tier="unlimited" billingPeriod="monthly" />
          </div>
        </Canvas>
      </Group>
      <Group title="Current plan state">
        <Canvas label="Free — current">
          <div style={{ maxWidth: "240px" }}>
            <PlanCard tier="free" isCurrent billingPeriod="monthly" />
          </div>
        </Canvas>
        <Canvas label="Pro — current">
          <div style={{ maxWidth: "240px" }}>
            <PlanCard tier="pro" isCurrent billingPeriod="monthly" />
          </div>
        </Canvas>
      </Group>
      <Group title="Annual pricing">
        <Canvas label="All tiers — annual">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: "16px",
            }}
          >
            <PlanCard tier="free" billingPeriod="annual" />
            <PlanCard tier="starter" billingPeriod="annual" />
            <PlanCard tier="pro" isPopular billingPeriod="annual" />
            <PlanCard tier="unlimited" billingPeriod="annual" />
          </div>
        </Canvas>
      </Group>
    </>
  );
}

function OverflowMenuPanel() {
  return (
    <>
      <ComponentTitle
        name="OverflowMenu"
        description="Contextual action menu triggered by a ··· button. Used on conversation and project cards."
      />
      <Group title="Variants">
        <Canvas label="Standard actions">
          <OverflowMenu
            items={[
              {
                label: "View Details",
                icon: (
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <circle cx="12" cy="12" r="3" />
                    <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z" />
                  </svg>
                ),
                onClick: () => {},
              },
              {
                label: "Add to Project",
                icon: (
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                  </svg>
                ),
                onClick: () => {},
              },
              {
                label: "Download",
                icon: (
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                ),
                onClick: () => {},
              },
              {
                label: "Delete",
                icon: (
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-1 14H6L5 6" />
                    <path d="M10 11v6M14 11v6" />
                  </svg>
                ),
                onClick: () => {},
                danger: true,
              },
            ]}
          />
        </Canvas>
        <Canvas label="Without danger action">
          <OverflowMenu
            items={[
              {
                label: "View Details",
                icon: (
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <circle cx="12" cy="12" r="3" />
                    <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z" />
                  </svg>
                ),
                onClick: () => {},
              },
              {
                label: "Download",
                icon: (
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                ),
                onClick: () => {},
              },
            ]}
          />
        </Canvas>
        <Canvas label="Danger only">
          <OverflowMenu
            items={[
              {
                label: "Delete",
                icon: (
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-1 14H6L5 6" />
                    <path d="M10 11v6M14 11v6" />
                  </svg>
                ),
                onClick: () => {},
                danger: true,
              },
            ]}
          />
        </Canvas>
      </Group>
    </>
  );
}

function EmbedStatusPanel() {
  const past = new Date(Date.now() - 200000).toISOString(); // >90s ago → on hold
  const recent = new Date(Date.now() - 30000).toISOString(); // <90s ago → processing
  const ready = new Date(Date.now() - 500000).toISOString(); // has_embeddings=true

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--spacing-6)",
      }}
    >
      <ComponentTitle
        name="EmbedStatus"
        description="Inline status indicator for thread embedding state. Animated spinner for processing, solid dot for ready and on hold. Uses status tokens throughout."
      />
      <SectionCard title="All states">
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--spacing-4)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--spacing-3)",
            }}
          >
            <span
              style={{
                width: 100,
                fontSize: "13px",
                color: "var(--color-text-muted)",
                fontFamily: "var(--font-family-primary)",
              }}
            >
              Ready
            </span>
            <EmbedStatus hasEmbeddings={true} createdAt={ready} />
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--spacing-3)",
            }}
          >
            <span
              style={{
                width: 100,
                fontSize: "13px",
                color: "var(--color-text-muted)",
                fontFamily: "var(--font-family-primary)",
              }}
            >
              Processing
            </span>
            <EmbedStatus hasEmbeddings={false} createdAt={recent} />
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--spacing-3)",
            }}
          >
            <span
              style={{
                width: 100,
                fontSize: "13px",
                color: "var(--color-text-muted)",
                fontFamily: "var(--font-family-primary)",
              }}
            >
              On hold
            </span>
            <EmbedStatus hasEmbeddings={false} createdAt={past} />
          </div>
        </div>
      </SectionCard>
      <SectionCard title="Sizes">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--spacing-6)",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "var(--spacing-3)",
            }}
          >
            <span
              style={{
                fontSize: "12px",
                color: "var(--color-text-muted)",
                fontFamily: "var(--font-family-primary)",
              }}
            >
              size=6
            </span>
            <EmbedStatus hasEmbeddings={true} createdAt={ready} size={6} />
            <EmbedStatus hasEmbeddings={false} createdAt={recent} size={6} />
            <EmbedStatus hasEmbeddings={false} createdAt={past} size={6} />
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "var(--spacing-3)",
            }}
          >
            <span
              style={{
                fontSize: "12px",
                color: "var(--color-text-muted)",
                fontFamily: "var(--font-family-primary)",
              }}
            >
              size=8 (default)
            </span>
            <EmbedStatus hasEmbeddings={true} createdAt={ready} size={8} />
            <EmbedStatus hasEmbeddings={false} createdAt={recent} size={8} />
            <EmbedStatus hasEmbeddings={false} createdAt={past} size={8} />
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "var(--spacing-3)",
            }}
          >
            <span
              style={{
                fontSize: "12px",
                color: "var(--color-text-muted)",
                fontFamily: "var(--font-family-primary)",
              }}
            >
              size=10
            </span>
            <EmbedStatus hasEmbeddings={true} createdAt={ready} size={10} />
            <EmbedStatus hasEmbeddings={false} createdAt={recent} size={10} />
            <EmbedStatus hasEmbeddings={false} createdAt={past} size={10} />
          </div>
        </div>
      </SectionCard>
    </div>
  );
}


function SaveHighlightModalPanel() {
  const [open, setOpen] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  return (
    <>
      <ComponentTitle
        name="SaveHighlightModal"
        description="Modal for saving a text selection as a highlight. Supports a tag picker (single-select, preset + user-defined) and an optional note."
      />
      <Group title="Interactive">
        <Canvas label="Click to open">
          <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
            Save Highlight
          </Button>
          {open && (
            <SaveHighlightModal
              content="Design systems are not just about consistency — they are about shared language between design and engineering teams."
              onSave={async (note, _pid, tag) => {
                const parts = [];
                if (tag) parts.push(`tag: "${tag}"`);
                if (note) parts.push(`note: "${note}"`);
                setLastSaved(parts.length ? `Saved — ${parts.join(' · ')}` : 'Saved');
                setOpen(false);
              }}
              onCancel={() => setOpen(false)}
            />
          )}
          {lastSaved && !open && (
            <p style={{ margin: 0, fontSize: 'var(--font-size-xs)', color: 'var(--color-text-success)' }}>
              {lastSaved}
            </p>
          )}
        </Canvas>
      </Group>
    </>
  );
}

function AddActionModalPanel() {
  const [open, setOpen] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  return (
    <>
      <ComponentTitle
        name="AddActionModal"
        description="Modal for saving a text selection as an action item. Supports a tag picker (single-select, preset + user-defined) and an optional note."
      />
      <Group title="Interactive">
        <Canvas label="Click to open">
          <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
            Add Action
          </Button>
          {open && (
            <AddActionModal
              content="Review the component API for consistency before the next sprint."
              onSave={async (title, detail, _pid, tag) => {
                const parts = [];
                if (tag) parts.push(`tag: "${tag}"`);
                if (detail) parts.push(`note: "${detail}"`);
                setLastSaved(`Saved "${title}"${parts.length ? ' — ' + parts.join(' · ') : ''}`);
                setOpen(false);
              }}
              onCancel={() => setOpen(false)}
            />
          )}
          {lastSaved && !open && (
            <p style={{ margin: 0, fontSize: 'var(--font-size-xs)', color: 'var(--color-text-success)' }}>
              {lastSaved}
            </p>
          )}
        </Canvas>
      </Group>
    </>
  );
}

function AddReminderModalPanel() {
  const [open, setOpen] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  return (
    <>
      <ComponentTitle
        name="AddReminderModal"
        description="Modal for saving a text selection as a reminder. Supports a tag picker (single-select, preset + user-defined) and an optional note."
      />
      <Group title="Interactive">
        <Canvas label="Click to open">
          <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
            Add Reminder
          </Button>
          {open && (
            <AddReminderModal
              content="Follow up with the team about the token naming decision next week."
              onSave={async (title, detail, _pid, tag) => {
                const parts = [];
                if (tag) parts.push(`tag: "${tag}"`);
                if (detail) parts.push(`note: "${detail}"`);
                setLastSaved(`Saved "${title}"${parts.length ? ' — ' + parts.join(' · ') : ''}`);
                setOpen(false);
              }}
              onCancel={() => setOpen(false)}
            />
          )}
          {lastSaved && !open && (
            <p style={{ margin: 0, fontSize: 'var(--font-size-xs)', color: 'var(--color-text-success)' }}>
              {lastSaved}
            </p>
          )}
        </Canvas>
      </Group>
    </>
  );
}

function EditNoteTagModalPanel() {
  const [mode, setMode] = useState<'note' | 'tag'>('note')
  const [hasExisting, setHasExisting] = useState(false)
  const [open, setOpen] = useState(false)
  const [lastSaved, setLastSaved] = useState<string | null>(null)
  return (
    <>
      <ComponentTitle
        name="EditNoteTagModal"
        description="Focused modal for adding or editing a note or tag on a highlight, action, or reminder from JumpBackCard. Title and save button reflect add vs edit mode."
      />
      <Group title="Interactive">
        <Canvas label="Click to open">
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <Button variant="secondary" size="sm" onClick={() => { setMode('note'); setHasExisting(false); setOpen(true) }}>Add note</Button>
            <Button variant="secondary" size="sm" onClick={() => { setMode('note'); setHasExisting(true); setOpen(true) }}>Edit note</Button>
            <Button variant="secondary" size="sm" onClick={() => { setMode('tag'); setHasExisting(false); setOpen(true) }}>Add tag</Button>
            <Button variant="secondary" size="sm" onClick={() => { setMode('tag'); setHasExisting(true); setOpen(true) }}>Edit tag</Button>
          </div>
          {open && (
            <EditNoteTagModal
              mode={mode}
              defaultNote={hasExisting && mode === 'note' ? 'Existing note text' : undefined}
              defaultTag={hasExisting && mode === 'tag' ? 'rework' : undefined}
              onSave={async (value) => {
                setLastSaved(value ? `Saved: "${value}"` : 'Cleared')
                setOpen(false)
              }}
              onCancel={() => setOpen(false)}
            />
          )}
          {lastSaved && !open && (
            <p style={{ margin: 0, fontSize: 'var(--font-size-xs)', color: 'var(--color-text-success)' }}>
              {lastSaved}
            </p>
          )}
        </Canvas>
      </Group>
    </>
  )
}

function JumpBackCardPanel() {
  const [activeType, setActiveType] = useState<JumpBackType>('chats')

  const chatItems: JumpBackItem[] = [
    { id: '1', title: 'ThreadCub extension debugging', subtitle: 'Claude', platform: 'Claude', message_count: 83, timeAgo: '1d ago', createdAt: new Date(Date.now() - 86400000).toISOString() },
    { id: '2', title: 'Dashboard redesign planning', subtitle: 'Claude', platform: 'Claude', message_count: 36, timeAgo: '1d ago', createdAt: new Date(Date.now() - 86400000 * 1.5).toISOString() },
    { id: '3', title: 'Giacom OKR review', subtitle: 'ChatGPT', platform: 'ChatGPT', message_count: 12, timeAgo: '3d ago', createdAt: new Date(Date.now() - 86400000 * 3).toISOString() },
    { id: '4', title: 'Supabase RLS policies', subtitle: 'Claude', platform: 'Claude', message_count: 49, timeAgo: '5d ago', createdAt: new Date(Date.now() - 86400000 * 5).toISOString() },
    { id: '5', title: "Tom's Valeting site updates", subtitle: 'Claude', platform: 'Claude', message_count: 21, timeAgo: '1w ago', createdAt: new Date(Date.now() - 86400000 * 8).toISOString() },
  ]

  const highlightItems: JumpBackItem[] = [
    { id: 'h1', title: 'Use React Server Components for data-fetching layers to reduce client bundle size.', subtitle: 'ThreadCub architecture chat', timeAgo: '2d ago', createdAt: new Date(Date.now() - 86400000 * 2).toISOString() },
    { id: 'h2', title: 'Keep Supabase RLS policies tight — never rely on app-layer checks alone.', subtitle: 'Supabase RLS policies', timeAgo: '5d ago', createdAt: new Date(Date.now() - 86400000 * 5).toISOString() },
    { id: 'h3', title: 'Stripe webhooks must be idempotent — the same event can arrive more than once.', subtitle: 'Stripe webhook setup', timeAgo: '2w ago', createdAt: new Date(Date.now() - 86400000 * 14).toISOString() },
  ]

  const actionItems: JumpBackItem[] = [
    { id: 'a1', title: 'Add rate limiting to the RAG query endpoint', subtitle: 'From: Supabase RLS policies', timeAgo: '3d ago', createdAt: new Date(Date.now() - 86400000 * 3).toISOString() },
    { id: 'a2', title: 'Write migration script for the new highlights schema', subtitle: 'From: Dashboard redesign planning', timeAgo: '5d ago', createdAt: new Date(Date.now() - 86400000 * 5).toISOString() },
    { id: 'a3', title: 'Set up Sentry error tracking for production', timeAgo: '1w ago', createdAt: new Date(Date.now() - 86400000 * 8).toISOString() },
  ]

  const reminderItems: JumpBackItem[] = [
    { id: 'r1', title: 'Review Giacom OKRs before end of quarter', subtitle: 'From: Giacom OKR review', timeAgo: '3d ago', createdAt: new Date(Date.now() - 86400000 * 3).toISOString() },
    { id: 'r2', title: 'Check Stripe webhook logs after next deployment', timeAgo: '2w ago', createdAt: new Date(Date.now() - 86400000 * 14).toISOString() },
  ]

  const itemsByType: Partial<Record<JumpBackType, JumpBackItem[]>> = {
    chats: chatItems,
    highlights: highlightItems,
    actions: actionItems,
    reminders: reminderItems,
  }

  return (
    <>
      <ComponentTitle
        name="JumpBackCard"
        description="Scrollable recent-items card with time grouping. The type filter is controlled externally — render the Input select inline beside the section heading on the page."
      />
      <Group title="Interactive">
        <Canvas label="Type filter lives outside the card (inline with heading)" style={{ width: '100%', maxWidth: '560px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-4)', marginBottom: 'var(--spacing-4)' }}>
            <strong style={{ fontSize: 'var(--font-size-lg)' }}>Jump back</strong>
            <Input
              type="select"
              value={activeType}
              onChange={e => setActiveType(e.target.value as JumpBackType)}
              options={ALL_TYPE_OPTIONS.map(opt => ({ value: opt.value, label: opt.label }))}
              style={{ width: 'auto' }}
            />
          </div>
          <JumpBackCard
            items={itemsByType[activeType] ?? []}
            activeType={activeType}
            onItemClick={(id) => alert(`Clicked item ${id}`)}
          />
        </Canvas>
      </Group>
      <Group title="Loading state">
        <Canvas label="isLoading=true" style={{ width: '100%', maxWidth: '560px' }}>
          <JumpBackCard
            items={[]}
            isLoading
          />
        </Canvas>
      </Group>
      <Group title="Empty state">
        <Canvas label="No items" style={{ width: '100%', maxWidth: '560px' }}>
          <JumpBackCard
            items={[]}
          />
        </Canvas>
      </Group>
    </>
  )
}

function HighlightRowCardPanel() {
  return (
    <>
      <ComponentTitle
        name="HighlightRowCard"
        description="Read-only list-row card for highlights in the JumpBackCard highlights view. Shows highlighted text, optional source chat title, and a Jump back action."
      />
      <Group title="With source title">
        <Canvas label="content + sourceTitle" style={{ width: '100%', maxWidth: '560px' }}>
          <HighlightRowCard
            id="h1"
            content="Use React Server Components for data-fetching layers to reduce client bundle size."
            sourceTitle="ThreadCub architecture chat"
            createdAt={new Date(Date.now() - 86400000 * 2).toISOString()}
            onJumpBack={() => alert('Jump back')}
            onViewDetails={() => alert('View details')}
            onEditNote={() => alert('Add/edit note')}
            onEditTag={() => alert('Add/edit tag')}
          />
        </Canvas>
      </Group>
      <Group title="Without source title">
        <Canvas label="content only" style={{ width: '100%', maxWidth: '560px' }}>
          <HighlightRowCard
            id="h2"
            content="Keep Supabase RLS policies tight — never rely on app-layer checks alone."
            createdAt={new Date(Date.now() - 86400000 * 5).toISOString()}
            onJumpBack={() => alert('Jump back')}
            onViewDetails={() => alert('View details')}
            onEditNote={() => alert('Add/edit note')}
            onEditTag={() => alert('Add/edit tag')}
          />
        </Canvas>
      </Group>
    </>
  )
}

function ActionRowCardPanel() {
  return (
    <>
      <ComponentTitle
        name="ActionRowCard"
        description="Read-only list-row card for actions in the JumpBackCard actions view. Shows the action text, optional note, and a Jump back action."
      />
      <Group title="With tag and note">
        <Canvas label="tag + note" style={{ width: '100%', maxWidth: '560px' }}>
          <ActionRowCard
            id="a1"
            content="Add rate limiting to the RAG query endpoint"
            tag="rework"
            note="From: Supabase RLS policies"
            createdAt={new Date(Date.now() - 86400000 * 3).toISOString()}
            onJumpBack={() => alert('Jump back')}
            onViewDetails={() => alert('View details')}
            onEditNote={() => alert('Add/edit note')}
            onEditTag={() => alert('Add/edit tag')}
          />
        </Canvas>
      </Group>
      <Group title="Without tag">
        <Canvas label="content only" style={{ width: '100%', maxWidth: '560px' }}>
          <ActionRowCard
            id="a2"
            content="Set up Sentry error tracking for production"
            createdAt={new Date(Date.now() - 86400000 * 8).toISOString()}
            onJumpBack={() => alert('Jump back')}
            onViewDetails={() => alert('View details')}
            onEditNote={() => alert('Add/edit note')}
            onEditTag={() => alert('Add/edit tag')}
          />
        </Canvas>
      </Group>
    </>
  )
}

function ReminderRowCardPanel() {
  return (
    <>
      <ComponentTitle
        name="ReminderRowCard"
        description="Read-only list-row card for reminders in the JumpBackCard reminders view. Shows the reminder text, optional note, and a Jump back action."
      />
      <Group title="With tag and note">
        <Canvas label="tag + note" style={{ width: '100%', maxWidth: '560px' }}>
          <ReminderRowCard
            id="r1"
            content="Review Giacom OKRs before end of quarter"
            tag="friction"
            note="From: Giacom OKR review"
            createdAt={new Date(Date.now() - 86400000 * 3).toISOString()}
            onJumpBack={() => alert('Jump back')}
            onViewDetails={() => alert('View details')}
            onEditNote={() => alert('Add/edit note')}
            onEditTag={() => alert('Add/edit tag')}
          />
        </Canvas>
      </Group>
      <Group title="Without tag">
        <Canvas label="content only" style={{ width: '100%', maxWidth: '560px' }}>
          <ReminderRowCard
            id="r2"
            content="Check Stripe webhook logs after next deployment"
            createdAt={new Date(Date.now() - 86400000 * 14).toISOString()}
            onJumpBack={() => alert('Jump back')}
            onViewDetails={() => alert('View details')}
            onEditNote={() => alert('Add/edit note')}
            onEditTag={() => alert('Add/edit tag')}
          />
        </Canvas>
      </Group>
    </>
  )
}

export default function ComponentPlayground() {
  const [active, setActive] = useState("Input");
  const [darkMode, setDarkMode] = useState(false);

  const panels: Record<string, React.ReactNode> = {
    TypeScale: <TypeScalePanel />,
    Input: <InputPanel />,
    Button: <ButtonPanel />,
    IconButton: <IconButtonPanel />,
    Badge: <BadgePanel />,
    Counter: <CounterPanel />,
    Checkbox: <CheckboxPanel />,
    Radio: <RadioPanel />,
    Alert: <AlertPanel />,
    ClaimBanner: <ClaimBannerPanel />,
    Divider: <DividerPanel />,
    Heading: <HeadingPanel />,
    Logo: <LogoPanel />,
    StatsCard: <StatsCardPanel />,
    JumpBackCard: <JumpBackCardPanel />,
    HighlightCard: <HighlightCardPanel />,
    HighlightRowCard: <HighlightRowCardPanel />,
    ActionRowCard: <ActionRowCardPanel />,
    ReminderRowCard: <ReminderRowCardPanel />,
    SelectionActionBar: <SelectionActionBarPanel />,
    ThreadSelectionMenu: <ThreadSelectionMenuPanel />,
    EmbedStatus: <EmbedStatusPanel />,
    ConversationCard: <ConversationCardPanel />,
    ProjectCard: <ProjectCardPanel />,
    AuthCard: <AuthCardPanel />,
    ExtensionCallbackCard: <ExtensionCallbackPanel />,
    ThreadFilters: <ThreadFiltersPanel />,
    TabFilterPanel: <TabFilterPanelPlayground />,
    PageHeader: <PageHeaderPanel />,
    SocialButton: <SocialButtonPanel />,
    Menu: <MenuPanel />,
    NewProjectModal: <NewProjectModalPanel />,
    DeleteProjectModal: <DeleteProjectModalPanel />,
    AddToProjectModal: <AddToProjectModalPanel />,
    ModalHeader: <ModalHeaderPanel />,
    ModalFooter: <ModalFooterPanel />,
    ClaimModal: <ClaimModalPanel />,
    DeleteConversationModal: <DeleteConversationModalPanel />,
    PinInsightModal: <PinInsightModalPanel />,
    SaveHighlightModal: <SaveHighlightModalPanel />,
    AddActionModal: <AddActionModalPanel />,
    AddReminderModal: <AddReminderModalPanel />,
    EditNoteTagModal: <EditNoteTagModalPanel />,
    SelectableChip: <SelectableChipPanel />,
    TagPicker: <TagPickerPanel />,
    QuickSummary: <QuickSummaryPanel />,
    ScopeChip: <ScopeChipPanel />,
    SideNav: <SideNavPanel />,
    SideNavSearch: <SideNavSearchPanel />,
    PlanCard: <PlanCardPanel />,
    OverflowMenu: <OverflowMenuPanel />,
    Toast: <ToastPanel />,
    Tokens: <TokensPanel />,
    Icon: <IconPanel />,
    SectionCard: <SectionCardPanel />,
    CodaModal: <CodaModalPanel />,
    EmptyState: <EmptyStatePanel />,
    TabPill: <TabPillPanel />,
    Tooltip: <TooltipPanel />,
  };

  return (
    <PageLayout darkMode={darkMode} onToggleDark={() => setDarkMode((d) => !d)}>
      <Sidebar active={active} onSelect={setActive} />
      <Main>{panels[active]}</Main>
    </PageLayout>
  );
}

function ToastPanel() {
  const [toast, setToast] = useState<{
    type: "success" | "error" | "info" | "warning";
    message: string;
  } | null>(null);
  const show = (
    type: "success" | "error" | "info" | "warning",
    message: string,
  ) => setToast({ type, message });

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--spacing-6)",
      }}
    >
      <ComponentTitle
        name="Toast"
        description="Fixed bottom-right notification. Built on Alert — inherits all colour tokens and icons. Auto-dismisses after 3.5s with fade + slide animation."
      />
      <SectionCard title="Interactive">
        <div
          style={{ display: "flex", gap: "var(--spacing-3)", flexWrap: "wrap" }}
        >
          <Button
            variant="primary"
            size="sm"
            onClick={() => show("success", "Imported 2 conversations")}
          >
            Success
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              show("error", "Something went wrong. Please try again.")
            }
          >
            Error
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => show("info", "1 duplicate skipped")}
          >
            Info
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              show("warning", "You are approaching your plan limit.")
            }
          >
            Warning
          </Button>
        </div>
        {toast && (
          <Toast
            type={toast.type}
            message={toast.message}
            onClose={() => setToast(null)}
          />
        )}
      </SectionCard>
      <SectionCard title="All types — static preview">
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--spacing-3)",
            maxWidth: 400,
          }}
        >
          {(["success", "error", "info", "warning"] as const).map((type) => (
            <Alert
              key={type}
              type={type}
              size="md"
              shadow="sm"
              dismissible={false}
            >
              {type === "success" && "Imported 2 conversations"}
              {type === "error" && "Something went wrong. Please try again."}
              {type === "info" && "1 duplicate skipped"}
              {type === "warning" && "You are approaching your plan limit."}
            </Alert>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

function TokensPanel() {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = (name: string) => {
    navigator.clipboard.writeText(name);
    setCopied(name);
    setTimeout(() => setCopied(null), 1200);
  };

  // ── Primitive colour ramps (exact values from globals.css) ──────────────────
  const ramps = [
    {
      label: "Primary",
      steps: [
        { name: "--color-primary-50", value: "#F1F2FF", note: "50" },
        { name: "--color-primary-100", value: "#E4E6FF", note: "100" },
        { name: "--color-primary-200", value: "#CDD1FF", note: "200" },
        { name: "--color-primary-300", value: "#A9AEFF", note: "300" },
        { name: "--color-primary-400", value: "#8A90FD", note: "400" },
        { name: "--color-primary-500", value: "#6C74FB", note: "500" },
        { name: "--color-primary-600", value: "#555EE6", note: "600" },
        { name: "--color-primary-700", value: "#434ACC", note: "700" },
        { name: "--color-primary-800", value: "#3338A6", note: "800" },
        { name: "--color-primary-900", value: "#24287A", note: "900" },
      ],
    },
    {
      label: "Warm",
      steps: [
        { name: "--color-warm-white", value: "#FFFFFF", note: "white" },
        { name: "--color-warm-50", value: "#FAF8F5", note: "50" },
        { name: "--color-warm-100", value: "#F7F3EE", note: "100" },
        { name: "--color-warm-200", value: "#EFECE6", note: "200" },
        { name: "--color-warm-300", value: "#E6E2DB", note: "300" },
        { name: "--color-warm-400", value: "#D4CFC8", note: "400" },
        { name: "--color-warm-500", value: "#B8B2AB", note: "500" },
        { name: "--color-warm-600", value: "#948E88", note: "600" },
        { name: "--color-warm-700", value: "#6B6560", note: "700" },
        { name: "--color-warm-800", value: "#3D3830", note: "800" },
        { name: "--color-warm-900", value: "#231F1A", note: "900" },
      ],
    },
    {
      label: "Gray",
      steps: [
        { name: "--color-gray-50", value: "#1A1A1A", note: "50" },
        { name: "--color-gray-100", value: "#242424", note: "100" },
        { name: "--color-gray-200", value: "#2E2E2E", note: "200" },
        { name: "--color-gray-300", value: "#3D3D3D", note: "300" },
        { name: "--color-gray-400", value: "#555555", note: "400" },
        { name: "--color-gray-500", value: "#737373", note: "500" },
        { name: "--color-gray-600", value: "#959595", note: "600" },
        { name: "--color-gray-700", value: "#B8B8B8", note: "700" },
        { name: "--color-gray-800", value: "#D4D4D4", note: "800" },
        { name: "--color-gray-900", value: "#F0F0F0", note: "900" },
      ],
    },
    {
      label: "Bear",
      steps: [
        { name: "--color-bear-50", value: "#F8F2F0", note: "50" },
        { name: "--color-bear-100", value: "#F1E3DD", note: "100" },
        { name: "--color-bear-200", value: "#E6C8BC", note: "200" },
        { name: "--color-bear-300", value: "#DCB6A7", note: "300" },
        { name: "--color-bear-400", value: "#D9AE9D", note: "400" },
        { name: "--color-bear-500", value: "#C0907E", note: "500" },
        { name: "--color-bear-600", value: "#9C6F5F", note: "600" },
        { name: "--color-bear-700", value: "#775244", note: "700" },
        { name: "--color-bear-800", value: "#55372D", note: "800" },
        { name: "--color-bear-900", value: "#38231C", note: "900" },
      ],
    },
    {
      label: "Coral",
      steps: [
        { name: "--color-coral-50", value: "#FFEDEE", note: "50" },
        { name: "--color-coral-100", value: "#FFD4D8", note: "100" },
        { name: "--color-coral-200", value: "#FFB1B8", note: "200" },
        { name: "--color-coral-300", value: "#FF98A1", note: "300" },
        { name: "--color-coral-400", value: "#FC7E8A", note: "400" },
        { name: "--color-coral-500", value: "#E76673", note: "500" },
        { name: "--color-coral-600", value: "#BE4E5A", note: "600" },
        { name: "--color-coral-700", value: "#943944", note: "700" },
        { name: "--color-coral-800", value: "#6A262F", note: "800" },
        { name: "--color-coral-900", value: "#47181E", note: "900" },
      ],
    },
    {
      label: "Rose",
      steps: [
        { name: "--color-rose-50", value: "#FFF0F0", note: "50" },
        { name: "--color-rose-100", value: "#FFD6D6", note: "100" },
        { name: "--color-rose-200", value: "#FFB3B3", note: "200" },
        { name: "--color-rose-300", value: "#FF8585", note: "300" },
        { name: "--color-rose-400", value: "#F55F5F", note: "400" },
        { name: "--color-rose-500", value: "#E03E3E", note: "500" },
        { name: "--color-rose-600", value: "#C02828", note: "600" },
        { name: "--color-rose-700", value: "#9A1A1A", note: "700" },
        { name: "--color-rose-800", value: "#741212", note: "800" },
        { name: "--color-rose-900", value: "#4F0A0A", note: "900" },
      ],
    },
    {
      label: "Teal",
      steps: [
        { name: "--color-teal-50", value: "#E9F7F3", note: "50" },
        { name: "--color-teal-100", value: "#D1EFE7", note: "100" },
        { name: "--color-teal-200", value: "#A7E2D4", note: "200" },
        { name: "--color-teal-300", value: "#8BD8C7", note: "300" },
        { name: "--color-teal-400", value: "#79D2B8", note: "400" },
        { name: "--color-teal-500", value: "#5DBBA1", note: "500" },
        { name: "--color-teal-600", value: "#479C86", note: "600" },
        { name: "--color-teal-700", value: "#357C6B", note: "700" },
        { name: "--color-teal-800", value: "#255E51", note: "800" },
        { name: "--color-teal-900", value: "#163F36", note: "900" },
      ],
    },
    {
      label: "Blue",
      steps: [
        { name: "--color-blue-50", value: "#EBF9FD", note: "50" },
        { name: "--color-blue-100", value: "#D4F1FA", note: "100" },
        { name: "--color-blue-200", value: "#A8E5F4", note: "200" },
        { name: "--color-blue-300", value: "#8DDDF0", note: "300" },
        { name: "--color-blue-400", value: "#7DDDF5", note: "400" },
        { name: "--color-blue-500", value: "#5FC5DF", note: "500" },
        { name: "--color-blue-600", value: "#469FB6", note: "600" },
        { name: "--color-blue-700", value: "#347C90", note: "700" },
        { name: "--color-blue-800", value: "#235B6B", note: "800" },
        { name: "--color-blue-900", value: "#143F4A", note: "900" },
      ],
    },
    {
      label: "Amber",
      steps: [
        { name: "--color-amber-50", value: "#FDF5E7", note: "50" },
        { name: "--color-amber-100", value: "#FBE9CB", note: "100" },
        { name: "--color-amber-200", value: "#F6D79A", note: "200" },
        { name: "--color-amber-300", value: "#F0C067", note: "300" },
        { name: "--color-amber-400", value: "#EBAD44", note: "400" },
        { name: "--color-amber-500", value: "#E8A030", note: "500" },
        { name: "--color-amber-600", value: "#C88524", note: "600" },
        { name: "--color-amber-700", value: "#9E691B", note: "700" },
        { name: "--color-amber-800", value: "#734D12", note: "800" },
        { name: "--color-amber-900", value: "#4D3309", note: "900" },
      ],
    },
    {
      label: "Green",
      steps: [
        { name: "--color-green-50", value: "#ECF8F1", note: "50" },
        { name: "--color-green-100", value: "#D7F1E2", note: "100" },
        { name: "--color-green-200", value: "#B0E5C7", note: "200" },
        { name: "--color-green-300", value: "#7ED3A1", note: "300" },
        { name: "--color-green-400", value: "#56C481", note: "400" },
        { name: "--color-green-500", value: "#3CBF6D", note: "500" },
        { name: "--color-green-600", value: "#2F9F59", note: "600" },
        { name: "--color-green-700", value: "#237D45", note: "700" },
        { name: "--color-green-800", value: "#195C32", note: "800" },
        { name: "--color-green-900", value: "#0F3F22", note: "900" },
      ],
    },
    {
      label: "Taupe",
      steps: [
        { name: "--color-taupe-50", value: "#F8F2F0", note: "50" },
        { name: "--color-taupe-100", value: "#F1E3DD", note: "100" },
        { name: "--color-taupe-200", value: "#E6C8BC", note: "200" },
        { name: "--color-taupe-300", value: "#DCB6A7", note: "300" },
        { name: "--color-taupe-400", value: "#D9AE9D", note: "400" },
        { name: "--color-taupe-500", value: "#C0907E", note: "500" },
        { name: "--color-taupe-600", value: "#9C6F5F", note: "600" },
        { name: "--color-taupe-700", value: "#775244", note: "700" },
        { name: "--color-taupe-800", value: "#55372D", note: "800" },
        { name: "--color-taupe-900", value: "#38231C", note: "900" },
      ],
    },
  ];

  // ── Semantic token groups (rendered via CSS var — theme-aware) ────────────────
  const semanticGroups = [
    {
      label: "Surface",
      items: [
        {
          name: "--color-surface-page",
          note: "light: warm-300 #E6E2DB / dark: gray-50 #1A1A1A",
        },
        {
          name: "--color-surface-default",
          note: "light: warm-50 #FAF8F5 / dark: gray-100 #242424",
        },
        {
          name: "--color-surface-raised",
          note: "light: white #FFFFFF / dark: gray-200 #2E2E2E",
        },
        {
          name: "--color-surface-sunken",
          note: "light: warm-100 #F7F3EE / dark: gray-50 #1A1A1A",
        },
        {
          name: "--color-surface-overlay",
          note: "light: warm-200 #EFECE6 / dark: gray-200 #2E2E2E",
        },
        {
          name: "--color-surface-inverse",
          note: "light: warm-900 #231F1A / dark: gray-800 #D4D4D4",
        },
        {
          name: "--color-surface-primary-strong",
          note: "light: primary-500 #6C74FB / dark: primary-600 #555EE6",
        },
        {
          name: "--color-surface-primary-inactive",
          note: "light: primary-300 #A9AEFF / dark: primary-700 #434ACC",
        },
        {
          name: "--color-surface-primary-hover",
          note: "light: primary-100 #E4E6FF / dark: primary-800 #3338A6",
        },
        {
          name: "--color-surface-primary-active",
          note: "always white #FFFFFF",
        },
      ],
    },
    {
      label: "Text",
      items: [
        {
          name: "--color-text-title",
          note: "light: warm-900 #231F1A / dark: gray-900 #F0F0F0",
        },
        {
          name: "--color-text-body",
          note: "light: warm-800 #3D3830 / dark: gray-800 #D4D4D4",
        },
        {
          name: "--color-text-secondary",
          note: "light: warm-700 #6B6560 / dark: gray-700 #B8B8B8",
        },
        {
          name: "--color-text-muted",
          note: "light: warm-600 #948E88 / dark: gray-600 #959595",
        },
        {
          name: "--color-text-placeholder",
          note: "light: warm-400 #D4CFC8 / dark: gray-400 #555555",
        },
        {
          name: "--color-text-disabled",
          note: "light: warm-300 #E6E2DB / dark: gray-300 #3D3D3D",
        },
        {
          name: "--color-text-link",
          note: "light: primary-600 #555EE6 / dark: primary-300 #A9AEFF",
        },
        {
          name: "--color-text-link-hover",
          note: "light: primary-700 #434ACC / dark: primary-300 #A9AEFF",
        },
        {
          name: "--color-text-link-on-primary",
          note: "both modes: blue-300 #8DDDF0",
        },
        {
          name: "--color-text-link-on-primary-hover",
          note: "both modes: blue-200 #A8E5F4",
        },
        { name: "--color-text-on-primary", note: "always white #FFFFFF" },
        {
          name: "--color-text-on-inverse",
          note: "light: white #FFFFFF / dark: gray-900 #F0F0F0",
        },
        {
          name: "--color-text-inverse",
          note: "light: white #FFFFFF / dark: gray-900 #F0F0F0",
        },
        {
          name: "--color-text-inactive",
          note: "both modes: gray-500 #737373 — idle text on primary surfaces",
        },
        {
          name: "--color-text-active",
          note: "light: warm-900 #231F1A / dark: gray-900 #F0F0F0 — focus text on primary surfaces",
        },
      ],
    },
    {
      label: "Text on Accent",
      items: [
        {
          name: "--color-text-on-accent-teal",
          note: "light: teal-800 #255E51 / dark: teal-200 #A7E2D4",
        },
        {
          name: "--color-text-on-accent-blue",
          note: "light: blue-800 #235B6B / dark: blue-200 #A8E5F4",
        },
        {
          name: "--color-text-on-accent-amber",
          note: "light: amber-800 #734D12 / dark: amber-200 #F6D79A",
        },
        {
          name: "--color-text-on-accent-coral",
          note: "light: coral-800 #6A262F / dark: coral-200 #FFB1B8",
        },
        {
          name: "--color-text-on-accent-green",
          note: "light: green-800 #195C32 / dark: green-200 #B0E5C7",
        },
        {
          name: "--color-text-on-accent-bear",
          note: "light: bear-800 #55372D / dark: bear-200 #E6C8BC",
        },
      ],
    },
    {
      label: "Text Accent (coloured)",
      items: [
        {
          name: "--color-text-accent-teal",
          note: "light: teal-700 #357C6B / dark: teal-400 #79D2B8",
        },
        {
          name: "--color-text-accent-blue",
          note: "light: blue-700 #347C90 / dark: blue-400 #7DDDF5",
        },
        {
          name: "--color-text-accent-amber",
          note: "light: amber-700 #9E691B / dark: amber-400 #EBAD44",
        },
        {
          name: "--color-text-accent-coral",
          note: "light: coral-700 #943944 / dark: coral-400 #FC7E8A",
        },
        {
          name: "--color-text-accent-green",
          note: "light: green-700 #237D45 / dark: green-400 #56C481",
        },
        {
          name: "--color-text-accent-bear",
          note: "light: bear-700 #775244 / dark: bear-400 #D9AE9D",
        },
      ],
    },
    {
      label: "Icon",
      items: [
        {
          name: "--color-icon-default",
          note: "light: warm-700 #6B6560 / dark: gray-700 #B8B8B8",
        },
        {
          name: "--color-icon-muted",
          note: "light: warm-500 #B8B2AB / dark: gray-500 #737373",
        },
        {
          name: "--color-icon-placeholder",
          note: "light: warm-400 #D4CFC8 / dark: gray-400 #555555",
        },
        {
          name: "--color-icon-disabled",
          note: "light: warm-300 #E6E2DB / dark: gray-300 #3D3D3D",
        },
        {
          name: "--color-icon-hover",
          note: "light: warm-900 #231F1A / dark: gray-900 #F0F0F0",
        },
        {
          name: "--color-icon-strong",
          note: "light: warm-900 #231F1A / dark: gray-900 #F0F0F0",
        },
        {
          name: "--color-icon-pressed",
          note: "light: primary-500 #6C74FB / dark: primary-400 #8A90FD",
        },
        { name: "--color-icon-on-primary", note: "always white #FFFFFF" },
        {
          name: "--color-icon-on-inverse",
          note: "light: white #FFFFFF / dark: gray-900 #F0F0F0",
        },
        {
          name: "--color-icon-accent-teal",
          note: "light: teal-500 #5DBBA1 / dark: teal-400 #79D2B8",
        },
        {
          name: "--color-icon-accent-blue",
          note: "light: blue-500 #5FC5DF / dark: blue-400 #7DDDF5",
        },
        {
          name: "--color-icon-accent-amber",
          note: "light: amber-500 #E8A030 / dark: amber-400 #EBAD44",
        },
        {
          name: "--color-icon-accent-coral",
          note: "light: coral-500 #E76673 / dark: coral-400 #FC7E8A",
        },
        {
          name: "--color-icon-accent-green",
          note: "light: green-500 #3CBF6D / dark: green-400 #56C481",
        },
        {
          name: "--color-icon-accent-bear",
          note: "light: bear-500 #C0907E / dark: bear-400 #D9AE9D",
        },
      ],
    },
    {
      label: "Border",
      items: [
        {
          name: "--color-border-subtle",
          note: "light: warm-200 #EFECE6 / dark: gray-200 #2E2E2E",
        },
        {
          name: "--color-border-default",
          note: "light: warm-300 #E6E2DB / dark: gray-300 #3D3D3D",
        },
        {
          name: "--color-border-strong",
          note: "light: warm-400 #D4CFC8 / dark: gray-400 #555555",
        },
        {
          name: "--color-border-focus",
          note: "light: primary-500 #6C74FB / dark: primary-400 #8A90FD",
        },
        {
          name: "--color-border-error",
          note: "light: rose-500 #E03E3E / dark: rose-400 #F55F5F",
        },
        {
          name: "--color-border-disabled",
          note: "light: warm-200 #EFECE6 / dark: gray-200 #2E2E2E",
        },
        {
          name: "--color-border-inverse",
          note: "light: warm-700 #6B6560 / dark: gray-700 #B8B8B8",
        },
        {
          name: "--color-border-primary",
          note: "light: primary-500 #6C74FB / dark: primary-400 #8A90FD",
        },
        {
          name: "--color-border-primary-subtle",
          note: "light: primary-200 #CDD1FF / dark: primary-300 #A9AEFF",
        },
        {
          name: "--color-border-success",
          note: "light: green-300 #7ED3A1 / dark: green-700 #237D45",
        },
        {
          name: "--color-border-warning",
          note: "light: amber-300 #F0C067 / dark: amber-700 #9E691B",
        },
        {
          name: "--color-border-info",
          note: "light: blue-300 #8DDDF0 / dark: blue-700 #347C90",
        },
        {
          name: "--color-border-accent-teal",
          note: "light: teal-300 #8BD8C7 / dark: teal-700 #357C6B",
        },
        {
          name: "--color-border-accent-blue",
          note: "light: blue-300 #8DDDF0 / dark: blue-700 #347C90",
        },
        {
          name: "--color-border-accent-amber",
          note: "light: amber-300 #F0C067 / dark: amber-700 #9E691B",
        },
        {
          name: "--color-border-accent-coral",
          note: "light: coral-300 #FF98A1 / dark: coral-700 #943944",
        },
        {
          name: "--color-border-accent-green",
          note: "light: green-300 #7ED3A1 / dark: green-700 #237D45",
        },
        {
          name: "--color-border-accent-bear",
          note: "light: bear-300 #DCB6A7 / dark: bear-700 #775244",
        },
      ],
    },
    {
      label: "Accent",
      items: [
        {
          name: "--color-accent-teal",
          note: "light: teal-500 #5DBBA1 / dark: teal-400 #79D2B8",
        },
        {
          name: "--color-accent-teal-subtle",
          note: "light: teal-50 #E9F7F3 / dark: teal-900 #163F36",
        },
        {
          name: "--color-accent-teal-muted",
          note: "light: teal-100 #D1EFE7 / dark: teal-800 #255E51",
        },
        {
          name: "--color-accent-teal-strong",
          note: "light: teal-700 #357C6B / dark: teal-300 #8BD8C7",
        },
        {
          name: "--color-accent-teal-text",
          note: "light: teal-700 #357C6B / dark: teal-300 #8BD8C7",
        },
        {
          name: "--color-accent-blue",
          note: "light: blue-500 #5FC5DF / dark: blue-400 #7DDDF5",
        },
        {
          name: "--color-accent-blue-subtle",
          note: "light: blue-50 #EBF9FD / dark: blue-900 #143F4A",
        },
        {
          name: "--color-accent-blue-muted",
          note: "light: blue-100 #D4F1FA / dark: blue-800 #235B6B",
        },
        {
          name: "--color-accent-blue-strong",
          note: "light: blue-700 #347C90 / dark: blue-300 #8DDDF0",
        },
        {
          name: "--color-accent-blue-text",
          note: "light: blue-700 #347C90 / dark: blue-300 #8DDDF0",
        },
        {
          name: "--color-accent-amber",
          note: "light: amber-500 #E8A030 / dark: amber-400 #EBAD44",
        },
        {
          name: "--color-accent-amber-subtle",
          note: "light: amber-50 #FDF5E7 / dark: amber-900 #4D3309",
        },
        {
          name: "--color-accent-amber-muted",
          note: "light: amber-100 #FBE9CB / dark: amber-800 #734D12",
        },
        {
          name: "--color-accent-amber-strong",
          note: "light: amber-700 #9E691B / dark: amber-300 #F0C067",
        },
        {
          name: "--color-accent-amber-text",
          note: "light: amber-700 #9E691B / dark: amber-300 #F0C067",
        },
        {
          name: "--color-accent-coral",
          note: "light: coral-500 #E76673 / dark: coral-400 #FC7E8A",
        },
        {
          name: "--color-accent-coral-subtle",
          note: "light: coral-50 #FFEDEE / dark: coral-900 #47181E",
        },
        {
          name: "--color-accent-coral-muted",
          note: "light: coral-100 #FFD4D8 / dark: coral-800 #6A262F",
        },
        {
          name: "--color-accent-coral-strong",
          note: "light: coral-700 #943944 / dark: coral-300 #FF98A1",
        },
        {
          name: "--color-accent-coral-text",
          note: "light: coral-700 #943944 / dark: coral-300 #FF98A1",
        },
        {
          name: "--color-accent-green",
          note: "light: green-500 #3CBF6D / dark: green-400 #56C481",
        },
        {
          name: "--color-accent-green-subtle",
          note: "light: green-50 #ECF8F1 / dark: green-900 #0F3F22",
        },
        {
          name: "--color-accent-green-muted",
          note: "light: green-100 #D7F1E2 / dark: green-800 #195C32",
        },
        {
          name: "--color-accent-green-strong",
          note: "light: green-700 #237D45 / dark: green-300 #7ED3A1",
        },
        {
          name: "--color-accent-green-text",
          note: "light: green-700 #237D45 / dark: green-300 #7ED3A1",
        },
        {
          name: "--color-accent-bear",
          note: "light: bear-500 #C0907E / dark: bear-400 #D9AE9D",
        },
        {
          name: "--color-accent-bear-subtle",
          note: "light: bear-50 #F8F2F0 / dark: bear-900 #38231C",
        },
        {
          name: "--color-accent-bear-muted",
          note: "light: bear-100 #F1E3DD / dark: bear-800 #55372D",
        },
        {
          name: "--color-accent-bear-strong",
          note: "light: bear-700 #775244 / dark: bear-300 #DCB6A7",
        },
        {
          name: "--color-accent-bear-text",
          note: "light: bear-700 #775244 / dark: bear-300 #DCB6A7",
        },
      ],
    },
    {
      label: "State",
      items: [
        {
          name: "--color-state-hover",
          note: "light: warm-100 #F7F3EE / dark: gray-200 #2E2E2E",
        },
        {
          name: "--color-state-hover-bg",
          note: "light: warm-200 #EFECE6 / dark: gray-200 #2E2E2E",
        },
        {
          name: "--color-state-active-bg",
          note: "light: warm-300 #E6E2DB / dark: gray-300 #3D3D3D",
        },
        {
          name: "--color-state-pressed",
          note: "light: warm-300 #E6E2DB / dark: gray-300 #3D3D3D",
        },
        {
          name: "--color-state-selected",
          note: "light: warm-300 #E6E2DB / dark: gray-400 #555555",
        },
        {
          name: "--color-state-selected-border",
          note: "light: primary-500 #6C74FB / dark: primary-400 #8A90FD",
        },
        {
          name: "--color-state-disabled-bg",
          note: "light: warm-100 #F7F3EE / dark: gray-100 #242424",
        },
        {
          name: "--color-state-disabled-text",
          note: "light: warm-400 #D4CFC8 / dark: gray-400 #555555",
        },
        {
          name: "--color-state-focus-ring",
          note: "light: primary-500 #6C74FB / dark: primary-400 #8A90FD",
        },
        {
          name: "--color-state-drag",
          note: "light: primary-50 #F1F2FF / dark: primary-900 #24287A",
        },
        {
          name: "--color-state-loading",
          note: "light: warm-200 #EFECE6 / dark: gray-200 #2E2E2E",
        },
      ],
    },
    {
      label: "Status",
      items: [
        {
          name: "--color-status-success",
          note: "light: green-500 #3CBF6D / dark: green-400 #56C481",
        },
        {
          name: "--color-status-success-bg",
          note: "light: green-50 #ECF8F1 / dark: green-900 #0F3F22",
        },
        {
          name: "--color-status-success-border",
          note: "light: green-200 #B0E5C7 / dark: green-700 #237D45",
        },
        {
          name: "--color-status-success-text",
          note: "light: green-700 #237D45 / dark: green-300 #7ED3A1",
        },
        {
          name: "--color-status-success-icon",
          note: "light: green-500 #3CBF6D / dark: green-400 #56C481",
        },
        {
          name: "--color-status-error",
          note: "light: rose-500 #E03E3E / dark: rose-400 #F55F5F",
        },
        {
          name: "--color-status-error-bg",
          note: "light: rose-50 #FFF0F0 / dark: rose-900 #4F0A0A",
        },
        {
          name: "--color-status-error-border",
          note: "light: rose-200 #FFB3B3 / dark: rose-700 #9A1A1A",
        },
        {
          name: "--color-status-error-text",
          note: "light: rose-700 #9A1A1A / dark: rose-300 #FF8585",
        },
        {
          name: "--color-status-error-icon",
          note: "light: rose-500 #E03E3E / dark: rose-400 #F55F5F",
        },
        {
          name: "--color-status-warning",
          note: "light: amber-500 #E8A030 / dark: amber-400 #EBAD44",
        },
        {
          name: "--color-status-warning-bg",
          note: "light: amber-50 #FDF5E7 / dark: amber-900 #4D3309",
        },
        {
          name: "--color-status-warning-border",
          note: "light: amber-200 #F6D79A / dark: amber-700 #9E691B",
        },
        {
          name: "--color-status-warning-text",
          note: "light: amber-700 #9E691B / dark: amber-300 #F0C067",
        },
        {
          name: "--color-status-warning-icon",
          note: "light: amber-500 #E8A030 / dark: amber-400 #EBAD44",
        },
        {
          name: "--color-status-info",
          note: "light: blue-500 #5FC5DF / dark: blue-400 #7DDDF5",
        },
        {
          name: "--color-status-info-bg",
          note: "light: blue-50 #EBF9FD / dark: blue-900 #143F4A",
        },
        {
          name: "--color-status-info-border",
          note: "light: blue-200 #A8E5F4 / dark: blue-700 #347C90",
        },
        {
          name: "--color-status-info-text",
          note: "light: blue-700 #347C90 / dark: blue-300 #8DDDF0",
        },
        {
          name: "--color-status-info-icon",
          note: "light: blue-500 #5FC5DF / dark: blue-400 #7DDDF5",
        },
        {
          name: "--color-status-neutral",
          note: "light: warm-500 #B8B2AB / dark: gray-500 #737373",
        },
        {
          name: "--color-status-neutral-bg",
          note: "light: warm-100 #F7F3EE / dark: gray-100 #242424",
        },
        {
          name: "--color-status-neutral-border",
          note: "light: warm-300 #E6E2DB / dark: gray-400 #555555",
        },
        {
          name: "--color-status-neutral-text",
          note: "light: warm-700 #6B6560 / dark: gray-700 #B8B8B8",
        },
        {
          name: "--color-status-neutral-icon",
          note: "light: warm-500 #B8B2AB / dark: gray-500 #737373",
        },
      ],
    },
    {
      label: "Primary",
      items: [
        { name: "--color-primary", note: "primary-500 both modes — #6C74FB" },
        {
          name: "--color-primary-hover",
          note: "light: primary-600 #555EE6 / dark: primary-400 #8A90FD",
        },
        {
          name: "--color-primary-subtle",
          note: "light: primary-50 #F1F2FF / dark: primary-900 #24287A",
        },
        {
          name: "--color-primary-muted",
          note: "light: primary-100 #E4E6FF / dark: primary-800 #3338A6",
        },
        {
          name: "--color-primary-light",
          note: "light: primary-100 #E4E6FF / dark: primary-800 #3338A6",
        },
        {
          name: "--color-primary-dark",
          note: "light: primary-600 #555EE6 / dark: primary-600 #555EE6",
        },
        {
          name: "--color-primary-strong",
          note: "light: primary-800 #3338A6 / dark: primary-200 #CDD1FF",
        },
        {
          name: "--color-primary-bg",
          note: "light: primary-50 #F1F2FF / dark: primary-900 #24287A",
        },
        {
          name: "--color-primary-text",
          note: "light: primary-700 #434ACC / dark: primary-300 #A9AEFF",
        },
        {
          name: "--color-primary-border",
          note: "light: primary-300 #A9AEFF / dark: primary-700 #434ACC",
        },
      ],
    },
  ];

  // ── Primitive swatch (hex known — computes lightness for fg colour) ───────────
  const Swatch = ({
    t,
  }: {
    t: { name: string; value: string; note: string };
  }) => {
    const hex = t.value.replace("#", "");
    const r = parseInt(hex.slice(0, 2), 16) / 255;
    const g = parseInt(hex.slice(2, 4), 16) / 255;
    const b = parseInt(hex.slice(4, 6), 16) / 255;
    const lum = r * 0.2126 + g * 0.7152 + b * 0.0722;
    const fg = lum > 0.35 ? "#231F1A" : "#FAF8F5";
    return (
      <div
        onClick={() => copy(t.name)}
        title={t.name}
        style={{
          backgroundColor: t.value,
          border: `1px solid ${lum > 0.35 ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.1)"}`,
          borderRadius: 6,
          padding: "10px 12px",
          cursor: "pointer",
          minHeight: 70,
          display: "flex",
          flexDirection: "column",
          gap: 4,
          position: "relative",
          userSelect: "none" as const,
        }}
      >
        <span
          style={{ fontSize: 11, fontWeight: 600, color: fg, opacity: 0.75 }}
        >
          {t.note}
        </span>
        <span
          style={{
            fontSize: 10,
            color: fg,
            fontFamily: "monospace",
            marginTop: "auto",
            opacity: 0.85,
          }}
        >
          {t.value}
        </span>
        {copied === t.name && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: 6,
              backgroundColor: "rgba(0,0,0,0.55)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontSize: 11,
              fontWeight: 600,
            }}
          >
            COPIED
          </div>
        )}
      </div>
    );
  };

  // ── Semantic swatch (uses CSS var directly — always theme-accurate) ───────────
  const SemanticSwatch = ({ t }: { t: { name: string; note: string } }) => (
    <div
      onClick={() => copy(t.name)}
      title={t.name}
      style={{
        cursor: "pointer",
        userSelect: "none" as const,
        position: "relative",
        borderRadius: 6,
        overflow: "hidden",
        border: "1px solid var(--color-border-default)",
      }}
    >
      <div style={{ backgroundColor: `var(${t.name})`, height: 36 }} />
      <div
        style={{
          padding: "6px 8px",
          backgroundColor: "var(--color-surface-raised)",
        }}
      >
        <div
          style={{
            fontSize: 10,
            fontFamily: "monospace",
            color: "var(--color-text-body)",
            fontWeight: 600,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap" as const,
          }}
        >
          {t.name}
        </div>
        <div
          style={{
            fontSize: 10,
            color: "var(--color-text-muted)",
            marginTop: 2,
          }}
        >
          {t.note}
        </div>
      </div>
      {copied === t.name && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontSize: 11,
            fontWeight: 600,
          }}
        >
          COPIED
        </div>
      )}
    </div>
  );

  // ── Non-colour tokens ─────────────────────────────────────────────────────────
  const spacing = [
    { token: "--spacing-0", value: "0px" },
    { token: "--spacing-1", value: "4px" },
    { token: "--spacing-2", value: "8px" },
    { token: "--spacing-3", value: "12px" },
    { token: "--spacing-4", value: "16px" },
    { token: "--spacing-5", value: "20px" },
    { token: "--spacing-6", value: "24px" },
    { token: "--spacing-7", value: "28px" },
    { token: "--spacing-8", value: "32px" },
    { token: "--spacing-9", value: "36px" },
    { token: "--spacing-10", value: "40px" },
    { token: "--spacing-11", value: "44px" },
    { token: "--spacing-12", value: "48px" },
    { token: "--spacing-13", value: "56px" },
    { token: "--spacing-14", value: "64px" },
    { token: "--spacing-15", value: "72px" },
    { token: "--spacing-16", value: "80px" },
    { token: "--spacing-gap-xs", value: "6px" },
  ];

  const fontSizes = [
    { token: "--font-size-2xs", value: "10px", label: "2XS — 10px" },
    { token: "--font-size-xs", value: "12px", label: "XS — 12px" },
    { token: "--font-size-sm", value: "14px", label: "SM — 14px" },
    { token: "--font-size-base", value: "16px", label: "Base — 16px" },
    { token: "--font-size-lg", value: "18px", label: "LG — 18px" },
    { token: "--font-size-xl", value: "20px", label: "XL — 20px" },
    { token: "--font-size-2xl", value: "24px", label: "2XL — 24px" },
    { token: "--font-size-3xl", value: "32px", label: "3XL — 32px" },
    { token: "--font-size-4xl", value: "40px", label: "4XL — 40px" },
  ];

  const radii = [
    { token: "--border-radius-sm", value: "4px", label: "sm" },
    { token: "--border-radius-base", value: "4px", label: "base" },
    { token: "--border-radius-md", value: "6px", label: "md" },
    { token: "--border-radius-lg", value: "8px", label: "lg" },
    { token: "--border-radius-xl", value: "12px", label: "xl" },
    { token: "--border-radius-2xl", value: "16px", label: "2xl" },
    { token: "--border-radius-full", value: "50%", label: "full" },
  ];

  const SectionHead = ({ title, sub }: { title: string; sub?: string }) => (
    <div
      style={{
        borderTop: "2px solid var(--color-warm-300)",
        paddingTop: "var(--spacing-6)",
        marginTop: "var(--spacing-4)",
      }}
    >
      <h2
        style={{
          fontSize: "var(--font-size-lg)",
          fontWeight: 700,
          color: "var(--color-warm-900)",
          margin: "0 0 4px",
        }}
      >
        {title}
      </h2>
      {sub && (
        <p
          style={{
            fontSize: "var(--font-size-sm)",
            color: "var(--color-warm-600)",
            margin: "0 0 var(--spacing-5)",
          }}
        >
          {sub}
        </p>
      )}
    </div>
  );

  const GroupHead = ({ label }: { label: string }) => (
    <div
      style={{
        fontSize: "11px",
        fontWeight: 700,
        letterSpacing: "0.08em",
        textTransform: "uppercase" as const,
        color: "var(--color-warm-600)",
        marginBottom: 10,
      }}
    >
      {label}
    </div>
  );

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--spacing-6)",
      }}
    >
      {/* ── Colour Ramps ────────────────────────────────────────────────────── */}
      <div>
        <h2
          style={{
            fontSize: "var(--font-size-lg)",
            fontWeight: 700,
            color: "var(--color-warm-900)",
            margin: "0 0 4px",
          }}
        >
          Colour Ramps
        </h2>
        <p
          style={{
            fontSize: "var(--font-size-sm)",
            color: "var(--color-warm-600)",
            margin: "0 0 var(--spacing-5)",
          }}
        >
          11 primitive scales — Primary, Warm, Gray, Bear, Coral, Rose, Teal,
          Blue, Amber, Green, Taupe. Click any swatch to copy its token name.
        </p>
      </div>

      {ramps.map((ramp) => (
        <div key={ramp.label}>
          <GroupHead label={ramp.label} />
          <div
            style={{
              display: "flex",
              borderRadius: 8,
              overflow: "hidden",
              marginBottom: 8,
              height: 28,
            }}
          >
            {ramp.steps.map((t) => (
              <div
                key={t.name}
                style={{ flex: 1, backgroundColor: t.value }}
                title={t.name}
              />
            ))}
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${ramp.steps.length}, 1fr)`,
              gap: 3,
            }}
          >
            {ramp.steps.map((t) => (
              <Swatch key={t.name} t={t} />
            ))}
          </div>
        </div>
      ))}

      {/* ── Semantic Tokens ─────────────────────────────────────────────────── */}
      <SectionHead
        title="Semantic Tokens"
        sub="Theme-aware aliases mapping to ramp values. Always use these in components — never raw ramp tokens."
      />

      {semanticGroups.map((group) => (
        <div key={group.label} style={{ marginBottom: "var(--spacing-3)" }}>
          <GroupHead label={group.label} />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))",
              gap: "var(--spacing-2)",
            }}
          >
            {group.items.map((t) => (
              <SemanticSwatch key={t.name} t={t} />
            ))}
          </div>
        </div>
      ))}

      {/* ── Spacing ─────────────────────────────────────────────────────────── */}
      <SectionHead
        title="Spacing"
        sub="4px base unit. --spacing-1 = 4px, --spacing-2 = 8px …"
      />
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {spacing.map((s) => (
          <div
            key={s.token}
            onClick={() => copy(s.token)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--spacing-4)",
              cursor: "pointer",
            }}
          >
            <div
              style={{
                width: 148,
                flexShrink: 0,
                fontSize: 11,
                fontFamily: "monospace",
                color: "var(--color-text-muted)",
              }}
            >
              {s.token}
            </div>
            <div
              style={{
                height: 18,
                width: s.value === "0px" ? 3 : s.value,
                maxWidth: 280,
                backgroundColor: "var(--color-primary-300)",
                borderRadius: 3,
                flexShrink: 0,
              }}
            />
            <span
              style={{ fontSize: 11, color: "var(--color-text-secondary)" }}
            >
              {s.value}
            </span>
          </div>
        ))}
      </div>

      {/* ── Typography ──────────────────────────────────────────────────────── */}
      <SectionHead
        title="Typography"
        sub="Font families, size scale, weights and line heights."
      />

      <div style={{ marginBottom: "var(--spacing-4)" }}>
        <GroupHead label="Font families" />
        {[
          {
            token: "--font-family-primary",
            label: "Karla (body)",
            family: "var(--font-family-primary)",
          },
          {
            token: "--font-family-title",
            label: "Averia Sans Libre (heading)",
            family: "var(--font-family-title)",
          },
          {
            token: "--font-family-system",
            label: "System UI (fallback)",
            family: "var(--font-family-system)",
          },
        ].map((f) => (
          <div
            key={f.token}
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: "var(--spacing-4)",
              padding: "var(--spacing-3) 0",
              borderBottom: "1px solid var(--color-border-subtle)",
            }}
          >
            <span
              style={{
                fontSize: 11,
                fontFamily: "monospace",
                color: "var(--color-text-muted)",
                width: 220,
                flexShrink: 0,
              }}
            >
              {f.token}
            </span>
            <span
              style={{
                fontFamily: f.family,
                fontSize: "var(--font-size-xl)",
                color: "var(--color-text-body)",
              }}
            >
              The quick brown fox
            </span>
            <span
              style={{
                fontSize: 11,
                color: "var(--color-text-muted)",
                marginLeft: "auto",
                flexShrink: 0,
              }}
            >
              {f.label}
            </span>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: "var(--spacing-4)" }}>
        <GroupHead label="Font sizes" />
        {fontSizes.map((f) => (
          <div
            key={f.token}
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: "var(--spacing-4)",
              padding: "6px 0",
              borderBottom: "1px solid var(--color-border-subtle)",
            }}
          >
            <span
              style={{
                fontSize: 11,
                fontFamily: "monospace",
                color: "var(--color-text-muted)",
                width: 180,
                flexShrink: 0,
              }}
            >
              {f.token}
            </span>
            <span
              style={{
                fontSize: f.value,
                color: "var(--color-text-body)",
                lineHeight: 1.3,
              }}
            >
              {f.label}
            </span>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: "var(--spacing-4)" }}>
        <GroupHead label="Font weights" />
        <div
          style={{
            display: "flex",
            flexWrap: "wrap" as const,
            gap: "var(--spacing-3)",
          }}
        >
          {[
            { token: "--font-weight-normal", value: "400", label: "normal" },
            { token: "--font-weight-medium", value: "500", label: "medium" },
            {
              token: "--font-weight-semibold",
              value: "600",
              label: "semibold",
            },
            { token: "--font-weight-bold", value: "700", label: "bold" },
            {
              token: "--font-weight-extrabold",
              value: "800",
              label: "extrabold",
            },
          ].map((w) => (
            <div
              key={w.token}
              onClick={() => copy(w.token)}
              style={{
                padding: "var(--spacing-3) var(--spacing-4)",
                background: "var(--color-surface-default)",
                border: "1px solid var(--color-border-default)",
                borderRadius: 6,
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  fontWeight: Number(w.value),
                  fontSize: "var(--font-size-xl)",
                  color: "var(--color-text-body)",
                }}
              >
                Aa
              </div>
              <div
                style={{
                  fontSize: 10,
                  fontFamily: "monospace",
                  color: "var(--color-text-muted)",
                  marginTop: 4,
                }}
              >
                {w.value}
              </div>
              <div style={{ fontSize: 10, color: "var(--color-text-muted)" }}>
                {w.label}
              </div>
              {copied === w.token && (
                <div
                  style={{
                    fontSize: 10,
                    color: "var(--color-primary)",
                    marginTop: 2,
                  }}
                >
                  copied!
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: "var(--spacing-4)" }}>
        <GroupHead label="Line heights" />
        <div style={{ display: "flex", gap: "var(--spacing-4)" }}>
          {[
            { token: "--line-height-tight", value: "1.25", label: "tight" },
            { token: "--line-height-normal", value: "1.5", label: "normal" },
          ].map((lh) => (
            <div
              key={lh.token}
              onClick={() => copy(lh.token)}
              style={{
                padding: "var(--spacing-3) var(--spacing-4)",
                background: "var(--color-surface-default)",
                border: "1px solid var(--color-border-default)",
                borderRadius: 6,
                cursor: "pointer",
                maxWidth: 200,
              }}
            >
              <div
                style={{
                  lineHeight: lh.value,
                  fontSize: "var(--font-size-sm)",
                  color: "var(--color-text-body)",
                  marginBottom: 6,
                }}
              >
                The quick brown fox jumps over the lazy dog near the riverbank.
              </div>
              <div
                style={{
                  fontSize: 10,
                  fontFamily: "monospace",
                  color: "var(--color-text-muted)",
                }}
              >
                {lh.token}
              </div>
              <div
                style={{ fontSize: 10, color: "var(--color-text-secondary)" }}
              >
                {lh.value} — {lh.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Border Radii ────────────────────────────────────────────────────── */}
      <SectionHead title="Border Radii" />
      <div
        style={{
          display: "flex",
          flexWrap: "wrap" as const,
          gap: "var(--spacing-4)",
        }}
      >
        {radii.map((r) => (
          <div
            key={r.token}
            onClick={() => copy(r.token)}
            style={{
              display: "flex",
              flexDirection: "column" as const,
              alignItems: "center",
              gap: "var(--spacing-2)",
              cursor: "pointer",
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                backgroundColor: "var(--color-primary-200)",
                borderRadius: r.value,
                border: "2px solid var(--color-primary-400)",
              }}
            />
            <span
              style={{
                fontSize: 10,
                fontFamily: "monospace",
                color: "var(--color-text-muted)",
                textAlign: "center" as const,
              }}
            >
              {r.value}
            </span>
            <span
              style={{
                fontSize: 10,
                color: "var(--color-text-secondary)",
                textAlign: "center" as const,
              }}
            >
              {r.label}
            </span>
          </div>
        ))}
      </div>

      {/* ── Shadows ─────────────────────────────────────────────────────────── */}
      <SectionHead title="Shadows" />
      <div
        style={{
          display: "flex",
          gap: "var(--spacing-6)",
          flexWrap: "wrap" as const,
        }}
      >
        {[
          {
            token: "--shadow-card",
            value: "0 2px 8px rgba(0,0,0,0.08)",
            label: "card",
          },
          {
            token: "--shadow-card-hover",
            value: "0 4px 12px rgba(0,0,0,0.1)",
            label: "card-hover",
          },
          {
            token: "--shadow-tooltip",
            value: "0 4px 12px rgba(0,0,0,0.15)",
            label: "tooltip",
          },
          {
            token: "--shadow-modal",
            value: "0 8px 32px rgba(0,0,0,0.2)",
            label: "modal",
          },
        ].map((s) => (
          <div
            key={s.token}
            onClick={() => copy(s.token)}
            style={{
              padding: "var(--spacing-5) var(--spacing-6)",
              backgroundColor: "var(--color-surface-raised)",
              borderRadius: 8,
              boxShadow: s.value,
              minWidth: 160,
              cursor: "pointer",
            }}
          >
            <div
              style={{
                fontSize: 12,
                fontFamily: "monospace",
                color: "var(--color-text-body)",
                fontWeight: 600,
                marginBottom: 4,
              }}
            >
              {s.label}
            </div>
            <div style={{ fontSize: 10, color: "var(--color-text-muted)" }}>
              {s.token}
            </div>
            {copied === s.token && (
              <div
                style={{
                  fontSize: 10,
                  color: "var(--color-primary)",
                  marginTop: 4,
                }}
              >
                copied!
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── Transitions ─────────────────────────────────────────────────────── */}
      <SectionHead title="Transitions" />
      <div
        style={{
          display: "flex",
          gap: "var(--spacing-4)",
          marginBottom: "var(--spacing-4)",
        }}
      >
        {[
          { token: "--transition-base", value: "0.2s ease", label: "base" },
          { token: "--transition-slow", value: "0.3s ease", label: "slow" },
        ].map((t) => (
          <div
            key={t.token}
            onClick={() => copy(t.token)}
            style={{
              padding: "var(--spacing-3) var(--spacing-4)",
              background: "var(--color-surface-default)",
              border: "1px solid var(--color-border-default)",
              borderRadius: 6,
              cursor: "pointer",
            }}
          >
            <div
              style={{
                fontSize: 12,
                fontFamily: "monospace",
                color: "var(--color-text-body)",
                fontWeight: 600,
              }}
            >
              {t.token}
            </div>
            <div
              style={{
                fontSize: 11,
                color: "var(--color-text-muted)",
                marginTop: 4,
              }}
            >
              {t.value}
            </div>
            {copied === t.token && (
              <div
                style={{
                  fontSize: 10,
                  color: "var(--color-primary)",
                  marginTop: 4,
                }}
              >
                copied!
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── Component Sizes ─────────────────────────────────────────────────── */}
      <SectionHead title="Component Sizes" />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 6,
          marginBottom: "var(--spacing-6)",
        }}
      >
        {[
          {
            token: "--sidebar-width-expanded",
            value: "280px",
            note: "expanded sidebar",
          },
          {
            token: "--sidebar-width-collapsed",
            value: "64px",
            note: "collapsed sidebar",
          },
          {
            token: "--sidebar-nav-item-height",
            value: "40px",
            note: "nav item height",
          },
          {
            token: "--sidebar-nav-gap",
            value: "2px",
            note: "gap between nav items",
          },
          {
            token: "--min-touch-target",
            value: "48px",
            note: "WCAG min touch target",
          },
          {
            token: "--toggle-width",
            value: "52px",
            note: "toggle switch width",
          },
          {
            token: "--toggle-height",
            value: "28px",
            note: "toggle switch height",
          },
        ].map((s) => (
          <div
            key={s.token}
            onClick={() => copy(s.token)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--spacing-4)",
              cursor: "pointer",
              padding: "4px 0",
            }}
          >
            <div
              style={{
                width: 210,
                flexShrink: 0,
                fontSize: 11,
                fontFamily: "monospace",
                color: "var(--color-text-muted)",
              }}
            >
              {s.token}
            </div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "var(--color-text-body)",
                width: 44,
              }}
            >
              {s.value}
            </div>
            <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>
              {s.note}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function IconPanel() {
  const sizes = ["sm", "md", "lg", "xl"] as const;
  const sizeMap = { sm: 16, md: 20, lg: 24, xl: 32 };
  const accents = [
    {
      name: "teal",
      color: "var(--color-accent-teal)",
      label: "Conversations / Docs",
    },
    {
      name: "blue",
      color: "var(--color-accent-blue)",
      label: "Messages / Communication",
    },
    { name: "amber", color: "var(--color-accent-amber)", label: "AI Features" },
    { name: "rose", color: "var(--color-accent-rose)", label: "Projects" },
    {
      name: "green",
      color: "var(--color-accent-green)",
      label: "Tags / Organisation",
    },
  ];
  const {
    FileText,
    MessageSquare,
    Sparkles,
    FolderOpen,
    Tag,
    Bot,
    Star,
    Bell,
    Settings,
    Search,
    Plus,
    Trash2,
    Download,
    Upload,
    ChevronRight,
  } = require("lucide-react");
  const icons = [
    FileText,
    MessageSquare,
    Sparkles,
    FolderOpen,
    Tag,
    Bot,
    Star,
    Bell,
    Settings,
    Search,
    Plus,
    Trash2,
    Download,
    Upload,
    ChevronRight,
  ];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--spacing-8)",
      }}
    >
      <div>
        <div
          style={{
            fontSize: "var(--font-size-xs)",
            fontWeight: 600,
            color: "var(--color-warm-600)",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            marginBottom: "var(--spacing-3)",
          }}
        >
          Sizes
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            gap: "var(--spacing-6)",
            padding: "var(--spacing-4)",
            background: "var(--color-surface)",
            border: "1px solid var(--color-warm-400)",
            borderRadius: 8,
          }}
        >
          {sizes.map((size) => (
            <div
              key={size}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "var(--spacing-2)",
              }}
            >
              <Icon
                icon={Sparkles}
                size={size}
                color="var(--color-accent-amber)"
              />
              <span
                style={{
                  fontSize: 11,
                  color: "var(--color-warm-600)",
                  fontFamily: "monospace",
                }}
              >
                {size}
              </span>
              <span style={{ fontSize: 11, color: "var(--color-warm-500)" }}>
                {sizeMap[size]}px
              </span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div
          style={{
            fontSize: "var(--font-size-xs)",
            fontWeight: 600,
            color: "var(--color-warm-600)",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            marginBottom: "var(--spacing-3)",
          }}
        >
          Accent Colours
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--spacing-2)",
          }}
        >
          {accents.map((accent) => (
            <div
              key={accent.name}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--spacing-4)",
                padding: "var(--spacing-3) var(--spacing-4)",
                background: "var(--color-surface)",
                border: "1px solid var(--color-warm-400)",
                borderRadius: 8,
              }}
            >
              <Icon icon={FileText} size="md" color={accent.color} />
              <span
                style={{
                  fontSize: "var(--font-size-sm)",
                  fontWeight: 500,
                  color: "var(--color-warm-800)",
                  width: 60,
                }}
              >
                {accent.name}
              </span>
              <span
                style={{
                  fontSize: "var(--font-size-sm)",
                  color: "var(--color-warm-600)",
                }}
              >
                {accent.label}
              </span>
              <span
                style={{
                  marginLeft: "auto",
                  fontSize: 11,
                  fontFamily: "monospace",
                  color: "var(--color-warm-500)",
                }}
              >
                --color-accent-{accent.name}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div
          style={{
            fontSize: "var(--font-size-xs)",
            fontWeight: 600,
            color: "var(--color-warm-600)",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            marginBottom: "var(--spacing-3)",
          }}
        >
          Icon Library
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))",
            gap: "var(--spacing-2)",
          }}
        >
          {icons.map((IconComp: any, i: number) => (
            <div
              key={i}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "var(--spacing-2)",
                padding: "var(--spacing-3)",
                background: "var(--color-surface)",
                border: "1px solid var(--color-warm-400)",
                borderRadius: 8,
              }}
            >
              <Icon icon={IconComp} size="md" color="var(--color-warm-700)" />
              <span style={{ fontSize: 11, color: "var(--color-warm-600)" }}>
                {IconComp.displayName || IconComp.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SectionCardPanel() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--spacing-6)",
      }}
    >
      <ComponentTitle
        name="SectionCard"
        description="Card container with optional title, subtitle and action slot."
      />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--spacing-4)",
        }}
      >
        <SectionCard
          title="Activity"
          subtitle="Conversations saved — last 8 weeks"
        >
          <div
            style={{
              height: 80,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--color-warm-500)",
              fontSize: "var(--font-size-sm)",
            }}
          >
            Chart content goes here
          </div>
        </SectionCard>
        <SectionCard
          title="Top Topics"
          subtitle="Most frequent themes across your conversations"
          action={
            <Button variant="tertiary" size="sm">
              View all →
            </Button>
          }
        >
          <div
            style={{
              height: 80,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--color-warm-500)",
              fontSize: "var(--font-size-sm)",
            }}
          >
            Content goes here
          </div>
        </SectionCard>
        <SectionCard>
          <div
            style={{
              height: 80,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--color-warm-500)",
              fontSize: "var(--font-size-sm)",
            }}
          >
            No header — children only
          </div>
        </SectionCard>
        <SectionCard
          title="Selected state"
          subtitle="selected={true} — border-focus replaces default border"
          selected={true}
        >
          <div
            style={{
              height: 80,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--color-warm-500)",
              fontSize: "var(--font-size-sm)",
            }}
          >
            Highlighted by onboarding tour
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

function CodaModalPanel() {
  const [name, setName] = useState("");
  const primaryBg = "var(--color-surface-primary-strong)";
  const cardStyle: React.CSSProperties = {
    backgroundColor: primaryBg,
    padding: "var(--spacing-6)",
    borderRadius: "var(--border-radius-lg)",
    display: "flex",
    flexDirection: "column",
    gap: "var(--spacing-4)",
  };
  // Static pos for playground — CodaModal normally gets these from a positioning hook
  const pos: React.CSSProperties = { position: "relative", width: "480px" };
  const rowPos: React.CSSProperties = {
    position: "relative",
    width: "auto",
    maxWidth: "380px",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-6)" }}>
      <ComponentTitle
        name="CodaModal"
        description="Onboarding modal shell. Accepts avatar, step counter, children, footer (btn row), and direction prop for row layout."
      />

      {/* Intro: avatar, inline PawPrint, no step, Yes/No footer */}
      <div style={cardStyle}>
        <p style={{ margin: 0, fontSize: "var(--font-size-sm)", color: "var(--color-text-inverse)", fontFamily: "var(--font-family-primary)" }}>
          Intro — avatar, inline PawPrint, no step
        </p>
        <CodaModal
          pos={pos}
          avatar="/coda_smile.svg"
          footer={
            <>
              <OnboardingBtnPrimary onClick={() => {}}>Yeah, sure!</OnboardingBtnPrimary>
              <OnboardingBtnOutline onClick={() => {}}>No thanks</OnboardingBtnOutline>
            </>
          }
        >
          <div className="onboarding-text-block">
            <p className="onboarding-heading">
              <span>Hey! I&apos;m Coda{' '}<PawPrint size={20} color="white" style={{ display: 'inline', verticalAlign: 'middle', marginLeft: 4 }} /></span>
            </p>
            <p className="onboarding-body">I&apos;m small but make up for my size in knowledge.</p>
            <p className="onboarding-body onboarding-body--last">Can I show you around?</p>
          </div>
        </CodaModal>
      </div>

      {/* Tour step: avatar, step=2 of 5, Next/Skip footer */}
      <div style={cardStyle}>
        <p style={{ margin: 0, fontSize: "var(--font-size-sm)", color: "var(--color-text-inverse)", fontFamily: "var(--font-family-primary)" }}>
          Tour step — avatar, step=2 of 5
        </p>
        <CodaModal
          pos={pos}
          avatar="/coda_big_smile.svg"
          step={2}
          footer={
            <>
              <OnboardingBtnPrimary onClick={() => {}}>Next</OnboardingBtnPrimary>
              <OnboardingBtnOutline onClick={() => {}}>Skip</OnboardingBtnOutline>
            </>
          }
        >
          <div className="onboarding-text-block">
            <p className="onboarding-body onboarding-body--last">A place to hold what you&apos;re working on now.</p>
          </div>
        </CodaModal>
      </div>

      {/* Name input: no avatar, no step, input + IconButton, no footer */}
      <div style={cardStyle}>
        <p style={{ margin: 0, fontSize: "var(--font-size-sm)", color: "var(--color-text-inverse)", fontFamily: "var(--font-family-primary)" }}>
          Name input — no avatar, no step, no footer
        </p>
        <CodaModal pos={{ ...pos, gap: "var(--spacing-4)" }}>
          <p className="onboarding-body onboarding-body--last">
            Oh, I forgot to ask. What&apos;s your name? I&apos;d rather not have to call you User 123
          </p>
          <div className="onboarding-input-row">
            <Input
              variant="on-primary"
              placeholder="My name is..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              size="lg"
              style={{ flex: 1 }}
            />
            <IconButton
              size="xl"
              variant="white"
              disabled={!name.trim()}
              onClick={() => {}}
            >
              <PawPrint size={20} />
            </IconButton>
          </div>
        </CodaModal>
      </div>

      {/* Declined: coda_sad.svg, no step, no footer, body text only */}
      <div style={cardStyle}>
        <p style={{ margin: 0, fontSize: "var(--font-size-sm)", color: "var(--color-text-inverse)", fontFamily: "var(--font-family-primary)" }}>
          Declined — coda_sad.svg, no step, no footer
        </p>
        <CodaModal pos={pos} avatar="/coda_sad.svg">
          <div className="onboarding-text-block">
            <p className="onboarding-body">
              Oh, that&apos;s ok. If you need me I&apos;ll be hanging out down in the bottom corner.
            </p>
            <p className="onboarding-body onboarding-body--last">
              Could I at least get your name? I&apos;d hate to have to call you User 123
            </p>
          </div>
        </CodaModal>
      </div>

      {/* Thanks: avatar, no step, no footer, row direction */}
      <div style={cardStyle}>
        <p style={{ margin: 0, fontSize: "var(--font-size-sm)", color: "var(--color-text-inverse)", fontFamily: "var(--font-family-primary)" }}>
          Thanks — direction=&quot;row&quot;, avatar, no step, no footer
        </p>
        <CodaModal pos={rowPos} avatar="/coda_big_smile.svg" direction="row">
          <p className="onboarding-body onboarding-body--last">Thanks. Nice to meet you!</p>
          <PawPrint size={24} color="var(--color-text-inverse)" className="onboarding-thanks-icon" />
        </CodaModal>
      </div>
    </div>
  );
}

function TooltipPanel() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--spacing-6)",
      }}
    >
      <ComponentTitle
        name="Tooltip"
        description="Styled hover tooltip with position and alignment control. Replaces native browser title attribute."
      />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--spacing-4)",
        }}
      >
        <SectionCard title="Positions">
          <div
            style={{
              display: "flex",
              gap: "var(--spacing-8)",
              alignItems: "center",
              justifyContent: "center",
              padding: "var(--spacing-8) 0",
            }}
          >
            <Tooltip label="Top" position="top">
              <Button variant="secondary" size="sm">
                Top
              </Button>
            </Tooltip>
            <Tooltip label="Bottom" position="bottom">
              <Button variant="secondary" size="sm">
                Bottom
              </Button>
            </Tooltip>
            <Tooltip label="Left" position="left">
              <Button variant="secondary" size="sm">
                Left
              </Button>
            </Tooltip>
            <Tooltip label="Right" position="right">
              <Button variant="secondary" size="sm">
                Right
              </Button>
            </Tooltip>
          </div>
        </SectionCard>
        <SectionCard title="Alignment (top position)">
          <div
            style={{
              display: "flex",
              gap: "var(--spacing-4)",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "var(--spacing-8) 0",
            }}
          >
            <Tooltip label="Left aligned" position="top" align="left">
              <Button variant="secondary" size="sm">
                Align left
              </Button>
            </Tooltip>
            <Tooltip label="Center aligned" position="top" align="center">
              <Button variant="secondary" size="sm">
                Align center
              </Button>
            </Tooltip>
            <Tooltip label="Right aligned" position="top" align="right">
              <Button variant="secondary" size="sm">
                Align right
              </Button>
            </Tooltip>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
function TabPillPanel() {
  const [selected, setSelected] = useState<string>("threads");
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--spacing-6)",
      }}
    >
      <ComponentTitle
        name="TabPill"
        description="Pill-style tab toggle. Idle, hover and selected states. Used for in-page view switching."
      />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--spacing-4)",
        }}
      >
        <SectionCard title="Interactive">
          <div style={{ display: "flex", gap: "var(--spacing-1)" }}>
            {["Threads", "Insights", "Activity"].map((tab) => (
              <TabPill
                key={tab}
                label={tab}
                selected={selected === tab.toLowerCase()}
                onClick={() => setSelected(tab.toLowerCase())}
              />
            ))}
          </div>
        </SectionCard>
        <SectionCard title="States">
          <div
            style={{
              display: "flex",
              gap: "var(--spacing-1)",
              flexWrap: "wrap",
            }}
          >
            <TabPill label="Idle" selected={false} onClick={() => {}} />
            <TabPill label="Selected" selected={true} onClick={() => {}} />
            <TabPill label="Disabled" disabled />
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

function EmptyStatePanel() {
  const { BarChart2, Bot, MessageSquare, FolderOpen } = require("lucide-react");
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--spacing-6)",
      }}
    >
      <ComponentTitle
        name="EmptyState"
        description="Empty state with optional icon, title, subtitle and CTA action. Icon colour follows the content accent theme."
      />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--spacing-4)",
        }}
      >
        <SectionCard>
          <EmptyState
            icon={BarChart2}
            iconColor="var(--color-accent-teal)"
            title="Thread count"
            subtitle="This is where all your activity will show up."
            action={{
              label: "Get started",
              onClick: () => {},
              variant: "primary",
            }}
          />
        </SectionCard>
        <SectionCard>
          <EmptyState
            icon={Bot}
            iconColor="var(--color-accent-amber)"
            title="AI Platforms"
            subtitle="This will show once you get started."
            action={{
              label: "Learn more",
              onClick: () => {},
              variant: "secondary",
            }}
          />
        </SectionCard>
        <SectionCard>
          <EmptyState
            icon={MessageSquare}
            iconColor="var(--color-accent-blue)"
            title="Top Topics"
            subtitle="This will show once you get started."
            action={{
              label: "Learn more",
              onClick: () => {},
              variant: "secondary",
            }}
          />
        </SectionCard>
      </div>

      <ComponentTitle
        name='size="page"'
        description="Full-page empty states used on Threads and Projects pages."
      />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--spacing-4)",
        }}
      >
        <SectionCard>
          <EmptyState
            size="page"
            icon={FolderOpen}
            iconColor="var(--color-accent-teal)"
            title="It's very quiet in here..."
            subtitle="Save chats with the Chrome extension, or import one to see it here."
            action={{
              label: "Import new",
              onClick: () => {},
              variant: "primary",
            }}
          />
        </SectionCard>
        <SectionCard>
          <EmptyState
            size="page"
            icon={FolderOpen}
            iconColor="var(--color-accent-teal)"
            title="No threads in this project yet."
            subtitle="Add threads to get started — import a file or save from the Chrome extension."
            action={{ label: "+ Add", onClick: () => {}, variant: "primary" }}
          />
        </SectionCard>
        <SectionCard>
          <EmptyState
            size="page"
            icon={FolderOpen}
            iconColor="var(--color-icon-subtle)"
            title="No threads match your search."
            subtitle="Try adjusting your search or filters."
          />
        </SectionCard>
      </div>
    </div>
  );
}
