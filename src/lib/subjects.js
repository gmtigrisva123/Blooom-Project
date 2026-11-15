/* ==========================================================================
   SUBJECTS · one list for groups, files, cards, the timer and every chart.
   Each subject owns one colour token, so it looks the same wherever it
   appears. The `value` strings are what the database stores; never rename
   them.
   ========================================================================== */

export const SUBJECTS = [
  { value: 'Toán', label: 'Toán', color: 'var(--subject-toan)' },
  { value: 'Ngữ Văn', label: 'Ngữ văn', color: 'var(--subject-van)' },
  { value: 'Tiếng Anh', label: 'Tiếng Anh', color: 'var(--subject-anh)' },
  { value: 'Vật Lý', label: 'Vật lý', color: 'var(--subject-ly)' },
  { value: 'Hóa Học', label: 'Hóa học', color: 'var(--subject-hoa)' },
  { value: 'Sinh Học', label: 'Sinh học', color: 'var(--subject-sinh)' },
  { value: 'Tin Học', label: 'Tin học', color: 'var(--subject-tin)' },
  { value: 'Khác', label: 'Môn khác', color: 'var(--subject-khac)' }
];

export const subjectColor = (value) =>
  SUBJECTS.find((s) => s.value === value)?.color || 'var(--subject-khac)';

export const subjectLabel = (value) =>
  SUBJECTS.find((s) => s.value === value)?.label || value || 'Môn khác';
