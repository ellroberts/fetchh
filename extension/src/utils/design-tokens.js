console.log('🔧 LOADING: design-tokens.js');

// ThreadCub Design System - Design Tokens
// This file contains all design constants used across the ThreadCub project

// ===== COLORS =====
const colors = {
  // Primary Brand Colors
  primary: '#7C3AED',
  primaryHover: '#6D28D9',
  
  // Priority Colors (from your design specs)
  priority: {
    high: {
      background: '#EDFBCD',
      text: '#67A221'
    },
    medium: {
      background: '#FEF3C9',
      text: '#D77720'
    },
    low: {
      background: '#FFF1F2',
      text: '#F24261'
    }
  },
  
  // Action Colors
  addTag: {
    background: '#7C3AED',
    text: '#FFFFFF'
  },
  
  // Neutral Colors
  white: '#FFFFFF',
  gray: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827'
  },
  
  // Semantic Colors
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',
  
  // Tooltip Colors
  tooltip: {
    background: '#475569',
    text: '#FFFFFF'
  }
};

// ===== SPACING =====
const spacing = {
  0: '0px',
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  7: '28px',
  8: '32px',
  9: '36px',
  10: '40px',
  12: '48px',
  16: '64px',
  20: '80px',
  24: '96px'
};

// ===== TYPOGRAPHY =====
const typography = {
  fontFamily: {
    primary: "'Karla', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    system: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
  },
  
  fontSize: {
    xs: '12px',
    sm: '14px',
    base: '16px',
    lg: '18px',
    xl: '20px',
    '2xl': '24px',
    '3xl': '30px'
  },
  
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800'
  },
  
  lineHeight: {
    tight: '1.25',
    normal: '1.5',
    relaxed: '1.75'
  },
  
  letterSpacing: {
    tight: '-0.025em',
    normal: '0em',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.1em'
  }
};

// ===== BORDERS & RADII =====
const borders = {
  width: {
    none: '0px',
    thin: '1px',
    medium: '2px',
    thick: '4px'
  },
  
  radius: {
    none: '0px',
    sm: '2px',
    base: '4px',
    md: '6px',
    lg: '8px',
    xl: '12px',
    '2xl': '16px',
    full: '50%'
  }
};

// ===== SHADOWS =====
const shadows = {
  none: 'none',
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  base: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  
  // Custom shadows for ThreadCub components
  contextMenu: '0 4px 12px rgba(0, 0, 0, 0.15)',
  card: '0 2px 8px rgba(0, 0, 0, 0.08)',
  cardHover: '0 4px 12px rgba(0, 0, 0, 0.12)'
};

// ===== TRANSITIONS =====
const transitions = {
  fast: '0.15s ease',
  base: '0.2s ease',
  slow: '0.3s ease',
  
  // Custom easing
  easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
  easeIn: 'cubic-bezier(0.4, 0, 1, 1)'
};

// ===== Z-INDEX SCALE =====
const zIndex = {
  base: 1,
  dropdown: 10,
  overlay: 100,
  modal: 1000,
  contextMenu: 10000000,
  tooltip: 10000001,
  maximum: 2147483647
};

// ===== COMPONENT SIZES =====
const sizes = {
  button: {
    sm: { height: '32px', padding: spacing[2] + ' ' + spacing[3] },
    base: { height: '40px', padding: spacing[3] + ' ' + spacing[4] },
    lg: { height: '48px', padding: spacing[4] + ' ' + spacing[6] }
  },
  
  icon: {
    sm: '16px',
    base: '20px',
    lg: '24px',
    xl: '32px'
  },
  
  card: {
    padding: spacing[4],
    radius: borders.radius.lg,
    shadow: shadows.card
  }
};

// ===== ICONS =====
const icons = {
  pawPrint: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="4" r="2"/><circle cx="18" cy="8" r="2"/><circle cx="20" cy="16" r="2"/><path d="M9 10a5 5 0 0 1 5 5v3.5a3.5 3.5 0 0 1-6.84 1.045Q6.52 17.48 4.46 16.84A3.5 3.5 0 0 1 5.5 10Z"/></svg>',
  
  cornerDownLeft: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 4v7a4 4 0 0 1-4 4H4"/><path d="m9 10-5 5 5 5"/></svg>',
  
  squarePen: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z"/></svg>',
  
  tag: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r=".5" fill="currentColor"/></svg>',
  
  trash: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 11v6"/><path d="M14 11v6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>'
};

// Make everything globally available for Chrome extension context
window.ThreadCubTokens = {
  colors,
  spacing,
  typography,
  borders,
  shadows,
  transitions,
  zIndex,
  sizes,
  icons
};

console.log('✅ ThreadCubTokens defined:', typeof window.ThreadCubTokens);