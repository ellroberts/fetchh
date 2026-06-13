// TypeScript types for Pinned Insights feature

export type SectionType = 'summary' | 'decisions' | 'actions' | 'insights' | 'problems' | 'custom';
export type DisplayStyle = 'card' | 'list' | 'highlight' | 'collapsed';

export interface PinnedInsight {
  id: string;
  conversation_id: string;
  user_id: string;
  section_type: SectionType;
  custom_title: string | null;
  content: string;
  display_style: DisplayStyle;
  order: number;
  source_question: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreatePinnedInsightInput {
  conversation_id: string;
  section_type: SectionType;
  custom_title?: string | null;
  content: string;
  display_style?: DisplayStyle;
  order?: number;
  source_question?: string | null;
}

export interface UpdatePinnedInsightInput {
  id: string;
  section_type?: SectionType;
  custom_title?: string | null;
  content?: string;
  display_style?: DisplayStyle;
  order?: number;
  source_question?: string | null;
}

export interface ReorderPinnedInsightsInput {
  conversation_id: string;
  insight_ids: string[]; // Array of IDs in the desired order
}

// UI-friendly labels for section types
export const SECTION_TYPE_LABELS: Record<SectionType, string> = {
  summary: 'Summary',
  decisions: 'Key Decisions',
  actions: 'Action Items',
  insights: 'Key Insights',
  problems: 'Problems & Solutions',
  custom: 'Custom',
};

// UI-friendly labels for display styles
export const DISPLAY_STYLE_LABELS: Record<DisplayStyle, string> = {
  card: 'Card',
  list: 'List',
  highlight: 'Highlight',
  collapsed: 'Collapsed',
};

// Suggested questions for quick access
export const SUGGESTED_QUESTIONS = [
  { label: 'Summarize', question: 'Provide a comprehensive summary of this conversation.' },
  { label: 'Key decisions', question: 'What key decisions were made in this conversation?' },
  { label: 'Action items', question: 'What action items or next steps were identified?' },
  { label: 'Problems solved', question: 'What problems were solved or addressed in this conversation?' },
];
