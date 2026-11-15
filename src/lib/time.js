import { useEffect, useState } from 'react';

/* ==========================================================================
   TIME — a clock the render can read, and the few date phrasings the app uses.
   ========================================================================== */

/* Reading `new Date()` while rendering makes a component impure: two renders
   of the same state would draw two different pictures. Holding the instant in
   state means "due today" only changes when the clock actually ticks. */
export const useNow = (intervalMs = 60000) => {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return now;
};

export const greetingFor = (date) => {
  const hour = date.getHours();
  if (hour < 11) return 'Chào buổi sáng';
  if (hour < 14) return 'Chào buổi trưa';
  if (hour < 18) return 'Chào buổi chiều';
  return 'Chào buổi tối';
};

export const longDate = (date) =>
  date.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' });

export const clock = (totalSeconds) => {
  const safe = Math.max(0, Math.round(totalSeconds));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

/* "hôm nay", "ngày mai", "3 ngày nữa" — when a flashcard comes back. */
export const dueLabel = (dueAt, now) => {
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const due = new Date(dueAt);
  const days = Math.floor((due - startOfToday) / 86400000);

  if (days <= 0) return 'hôm nay';
  if (days === 1) return 'ngày mai';
  if (days < 30) return `${days} ngày nữa`;
  const months = Math.round(days / 30);
  return months < 12 ? `${months} tháng nữa` : 'hơn 1 năm nữa';
};

/* An interval in days, said the short way: "1 ngày", "2 tuần", "3 tháng". */
export const intervalLabel = (days) => {
  if (days < 1) return 'hôm nay';
  if (days < 14) return `${days} ngày`;
  if (days < 60) return `${Math.round(days / 7)} tuần`;
  if (days < 365) return `${Math.round(days / 30)} tháng`;
  return `${(days / 365).toFixed(1).replace('.', ',')} năm`;
};

export const hoursLabel = (minutes) => {
  const hours = minutes / 60;
  if (hours === 0) return '0';
  return (Math.round(hours * 10) / 10).toString().replace('.', ',');
};
