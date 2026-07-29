/* ==========================================================================
   SUBJECTS — single source of truth for the school subjects used across the
   app (groups, notes, timer, charts). Each subject owns a colour so badges,
   bars and card stripes stay consistent everywhere.
   ========================================================================== */

export const SUBJECTS = [
  { value: 'Toán', label: 'Toán Học', color: '#3b82f6' },
  { value: 'Tiếng Anh', label: 'Tiếng Anh', color: '#a855f7' },
  { value: 'Vật Lý', label: 'Vật Lý', color: '#06b6d4' },
  { value: 'Hóa Học', label: 'Hóa Học', color: '#10b981' },
  { value: 'Sinh Học', label: 'Sinh Học', color: '#f43f5e' },
  { value: 'Ngữ Văn', label: 'Ngữ Văn', color: '#f59e0b' },
  { value: 'Tin Học', label: 'Tin Học', color: '#6366f1' },
  { value: 'Khác', label: 'Môn Khác', color: '#94a3b8' }
];

const FALLBACK_COLOR = '#94a3b8';

export const subjectColor = (value) =>
  SUBJECTS.find((s) => s.value === value)?.color || FALLBACK_COLOR;

export const subjectLabel = (value) => SUBJECTS.find((s) => s.value === value)?.label || value;

/* Subject lists used by the filter toolbars. */
export const SUBJECT_VALUES = SUBJECTS.map((s) => s.value);
export const NOTE_SUBJECTS = SUBJECT_VALUES.filter((s) => s !== 'Khác');
