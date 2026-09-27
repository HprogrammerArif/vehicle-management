/**
 * Mobile App Design System & Color Tokens
 * Aligned with Floruit / co_parenting design language
 */

export const colors = {
  // Brand colors
  primary: '#2B7FFF',
  primaryHover: '#1A6EEB',
  primaryLight: '#7CB0FF',
  primaryTint: '#EFF6FF',
  primaryBorder: '#BEDBFF',

  // Secondary
  secondary: '#7CB0FF',

  // Neutrals / Surfaces
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceSubtle: '#F1F5F9',
  border: '#E2E8F0',
  borderSubtle: '#EDF2F7',
  divider: '#E5E7EB',

  // Typography
  textPrimary: '#171717',
  textSecondary: '#525252',
  textMuted: '#878787',
  textLight: '#FFFFFF',

  // Feedback & Status
  success: '#2F9B65',
  successLight: '#DCFCE7',
  successBorder: '#BBF7D0',

  warning: '#FE8C00',
  warningLight: '#FEF3C6',
  warningBorder: '#FDE68A',

  error: '#F14141',
  errorLight: '#FEE2E2',
  errorBorder: '#FCA5A5',

  // Pastel Action Tints (Floruit style)
  pastelBlue: '#DFF2FE',
  pastelBlueBorder: '#BEDBFF',
  pastelIndigo: '#EEF2FF',
  pastelIndigoBorder: '#C7D2FE',
  pastelAmber: '#FEF3C6',
  pastelAmberBorder: '#FDE68A',
  pastelPurple: '#FAE8FF',
  pastelPurpleBorder: '#F5D0FE',
  pastelGreen: '#DCFCE7',
  pastelGreenBorder: '#BBF7D0',

  // Dark Accents (contrast elements)
  darkNavy: '#181C2E',
  darkCharcoal: '#262626',
};

export const statusColors: Record<
  string,
  { bg: string; text: string; border: string; label: string }
> = {
  PENDING: {
    bg: '#FEF3C6',
    text: '#D97706',
    border: '#FDE68A',
    label: 'Pending Review',
  },
  APPROVED: {
    bg: '#DCFCE7',
    text: '#2F9B65',
    border: '#BBF7D0',
    label: 'Approved',
  },
  REJECTED: {
    bg: '#FEE2E2',
    text: '#F14141',
    border: '#FCA5A5',
    label: 'Rejected',
  },
  IN_PROGRESS: {
    bg: '#DFF2FE',
    text: '#2B7FFF',
    border: '#BEDBFF',
    label: 'In Progress',
  },
  COMPLETED: {
    bg: '#EEF2FF',
    text: '#4F46E5',
    border: '#C7D2FE',
    label: 'Completed',
  },
  CANCELLED: {
    bg: '#F1F5F9',
    text: '#64748B',
    border: '#E2E8F0',
    label: 'Cancelled',
  },
};
