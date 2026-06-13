console.log('🎨 LOADING: rebrand-tokens.js');
// ThreadCub Rebrand Design Tokens
// New source of truth — JS components reference window.ThreadCubRebrand
// CSS components reference tokens.css
// Old design-tokens.js is orphaned legacy — do not use.

const rebrandColors = {
  // ===== PRIMARY =====
  primary100: '#EEEFFE',
  primary200: '#D5D8FD',
  primary300: '#BABEFB',
  primary400: '#9BA2F9',
  primary500: '#6C74FB',
  primary600: '#5760F4',
  primary700: '#3F48E8',
  primary800: '#2D35C4',
  primary900: '#1E259E',
  primary:        '#6C74FB',
  primaryHover:   '#5760F4',
  primaryText:    '#3F48E8',
  primarySubtle:  '#EEEFFE',

  // ===== WARM SCALE =====
  warmWhite: '#FFFFFF',
  warm50:    '#FAF8F5',
  warm100:   '#F7F3EE',
  warm200:   '#EFECE6',
  warm300:   '#E6E2DB',
  warm400:   '#D4CFC8',
  warm500:   '#B8B2AB',
  warm600:   '#948E88',
  warm700:   '#6B6560',
  warm800:   '#3D3830',
  warm900:   '#231F1A',

  // ===== NEUTRALS =====
  white:     '#FFFFFF',
  gray50:    '#F9FAFB',
  gray100:   '#F3F4F6',
  gray200:   '#E5E7EB',
  gray300:   '#D1D5DB',
  gray400:   '#9CA3AF',
  gray500:   '#6B7280',
  gray600:   '#4B5563',
  gray700:   '#374151',
  gray800:   '#1F2937',
  gray900:   '#111827',

  // ===== SEMANTIC =====
  textPrimary:   '#231F1A',
  textSecondary: '#6B6560',
  textMuted:     '#948E88',
  border:        '#EAEAEA',
  borderLight:   '#EFECE6',
  surface:       '#FAF8F5',

  // ===== STATUS =====
  success:      '#10B981',
  error:        '#EF4444',
  errorLight:   '#FEF2F2',
  warning:      '#F59E0B',
  info:         '#3B82F6',

  // ===== BEAR / CODA =====
  bear100: '#FDF0E0',
  bear200: '#F9D9B0',
  bear300: '#F2B870',
  bear400: '#E89840',
  bear500: '#C97A28',
  bear600: '#A86020',
  bear700: '#874A18',
  bear800: '#623310',
  bear900: '#3D1E08',
  bear:        '#C97A28',
  bearSubtle:  '#FDF0E0',
  bearLight:   '#F9D9B0',
  bearDark:    '#A86020',
  bearText:    '#874A18',

  // ===== CORAL =====
  coral100: '#FDEEE9',
  coral200: '#FAD4C8',
  coral300: '#F5B09D',
  coral500: '#E86A4A',
  coral600: '#D4532F',
  coral700: '#B03E1F',

  // ===== ACCENTS =====
  teal:      '#4AADA8',
  tealHover: '#3D9490',
  tealBg:    '#E6F5F4',

  blue:      '#5B8FF5',
  blueHover: '#4A7EE4',
  blueBg:    '#EBF1FE',

  amber:      '#E8A030',
  amberHover: '#D4902A',
  amberBg:    '#FDF0DC',

  rose:      '#E8607A',
  roseHover: '#D4506A',
  roseBg:    '#FDEEF1',

  green:      '#52A878',
  greenHover: '#429768',
  green100:   '#E8F5EE',
  greenBg:    '#E8F5EE',
};

const rebrandSpacing = {
  0:  '0px',
  1:  '4px',
  2:  '8px',
  3:  '12px',
  4:  '16px',
  5:  '20px',
  6:  '24px',
  7:  '28px',
  8:  '32px',
  9:  '36px',
  10: '40px',
  11: '44px',
  12: '48px',
};

const rebrandBorders = {
  radius: {
    base: '4px',
    md:   '6px',
    lg:   '8px',
    xl:   '12px',
    full: '9999px',
  }
};

const rebrandShadows = {
  card:      '0 2px 8px rgba(0, 0, 0, 0.08)',
  cardHover: '0 4px 12px rgba(0, 0, 0, 0.1)',
};

const rebrandTransitions = {
  base: '0.2s ease',
  slow: '0.3s ease',
};

window.ThreadCubRebrand = {
  colors:      rebrandColors,
  spacing:     rebrandSpacing,
  borders:     rebrandBorders,
  shadows:     rebrandShadows,
  transitions: rebrandTransitions,
};

console.log('✅ ThreadCubRebrand defined:', typeof window.ThreadCubRebrand);
