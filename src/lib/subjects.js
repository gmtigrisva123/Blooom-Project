/* ==========================================================================
   SUBJECTS — one list for groups, files, cards, the timer and every chart.
   Each subject owns a colour so it looks the same wherever it appears.
   The `value` strings are what the database stores; never rename them.
   ========================================================================== */

export const SUBJECTS = [
  { value: 'Toán', label: 'Toán', color: '#3b82f6' },
  { value: 'Ngữ Văn', label: 'Ngữ văn', color: '#f59e0b' },
  { value: 'Tiếng Anh', label: 'Tiếng Anh', color: '#8b5cf6' },
  { value: 'Vật Lý', label: 'Vật lý', color: '#0ea5e9' },
  { value: 'Hóa Học', label: 'Hóa học', color: '#10b981' },
  { value: 'Sinh Học', label: 'Sinh học', color: '#f43f5e' },
  { value: 'Tin Học', label: 'Tin học', color: '#6366f1' },
  { value: 'Khác', label: 'Môn khác', color: '#94a3b8' }
];

export const subjectColor = (value) =>
  SUBJECTS.find((s) => s.value === value)?.color || '#94a3b8';

export const subjectLabel = (value) =>
  SUBJECTS.find((s) => s.value === value)?.label || value || 'Môn khác';
