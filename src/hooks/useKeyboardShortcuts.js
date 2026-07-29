import { useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { NAV_ITEMS } from '../constants/nav';

/* Typing in a field must never trigger a shortcut. */
const isTyping = (target) => {
  if (!target) return false;
  const tag = target.tagName;
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    target.isContentEditable === true
  );
};

/* --------------------------------------------------------------------------
   Global keyboard shortcuts.
   Ctrl/⌘+K always works. Everything else stays out of the way while the user
   is typing or while an overlay owns the keyboard.
   -------------------------------------------------------------------------- */
export const useKeyboardShortcuts = () => {
  const {
    setActiveTab,
    activeTab,
    paletteOpen,
    setPaletteOpen,
    shortcutsOpen,
    setShortcutsOpen,
    timerControlsRef,
    toggleTheme
  } = useApp();

  useEffect(() => {
    const onKeyDown = (event) => {
      const mod = event.metaKey || event.ctrlKey;

      // Ctrl/⌘ + K — command palette, available from anywhere.
      if (mod && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen((open) => !open);
        return;
      }

      if (isTyping(event.target) || event.altKey || mod) return;

      // While an overlay is open it handles its own keys.
      if (paletteOpen) return;

      if (event.key === 'Escape' && shortcutsOpen) {
        setShortcutsOpen(false);
        return;
      }

      if (shortcutsOpen) return;

      // "?" — shortcuts cheat sheet.
      if (event.key === '?') {
        event.preventDefault();
        setShortcutsOpen(true);
        return;
      }

      // 1..6 — jump straight to a section.
      const target = NAV_ITEMS.find((item) => item.key === event.key);
      if (target) {
        event.preventDefault();
        setActiveTab(target.id);
        return;
      }

      // Shift + D — toggle dark/light.
      if (event.shiftKey && event.key.toLowerCase() === 'd') {
        event.preventDefault();
        toggleTheme();
        return;
      }

      // Timer controls, only meaningful on the timer screen.
      if (activeTab !== 'timer' || !timerControlsRef.current) return;

      if (event.code === 'Space') {
        event.preventDefault();
        timerControlsRef.current.toggle();
      } else if (event.key.toLowerCase() === 'r') {
        event.preventDefault();
        timerControlsRef.current.reset();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    activeTab,
    paletteOpen,
    setPaletteOpen,
    shortcutsOpen,
    setShortcutsOpen,
    setActiveTab,
    timerControlsRef,
    toggleTheme
  ]);
};

export const SHORTCUT_GROUPS = [
  {
    title: 'Điều hướng',
    items: [
      { keys: ['Ctrl', 'K'], label: 'Mở tìm kiếm nhanh (Command Palette)' },
      ...NAV_ITEMS.map((item) => ({ keys: [item.key], label: `Đến ${item.label}` }))
    ]
  },
  {
    title: 'Bộ đếm giờ Pomodoro',
    items: [
      { keys: ['Space'], label: 'Bắt đầu / Tạm dừng phiên học' },
      { keys: ['R'], label: 'Đặt lại bộ đếm' }
    ]
  },
  {
    title: 'Giao diện',
    items: [
      { keys: ['Shift', 'D'], label: 'Đổi giao diện sáng / tối' },
      { keys: ['?'], label: 'Mở bảng phím tắt này' },
      { keys: ['Esc'], label: 'Đóng hộp thoại đang mở' }
    ]
  }
];
