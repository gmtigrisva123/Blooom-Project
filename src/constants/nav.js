/* ==========================================================================
   NAVIGATION — the single definition of the app's sections.
   `color` drives the per-section accent (sidebar icon, hero, buttons, charts)
   and `key` is the number shortcut that jumps straight to the section.
   ========================================================================== */

import { LayoutDashboard, Users, Timer, Sparkles, LineChart, FileText } from 'lucide-react';

export const NAV_ITEMS = [
  {
    id: 'dashboard',
    label: 'Tổng Quan',
    icon: LayoutDashboard,
    color: '#6366f1',
    key: '1',
    subtitle: 'Toàn cảnh việc học của bạn hôm nay'
  },
  {
    id: 'groups',
    label: 'Nhóm Học Tập',
    icon: Users,
    color: '#8b5cf6',
    key: '2',
    subtitle: 'Tìm và tham gia nhóm học theo môn'
  },
  {
    id: 'timer',
    label: 'Bộ Đếm Giờ',
    icon: Timer,
    color: '#f97316',
    key: '3',
    subtitle: 'Pomodoro tập trung và nhật ký phiên học'
  },
  {
    id: 'editor',
    label: "Editor's Pick",
    icon: Sparkles,
    color: '#ec4899',
    key: '4',
    subtitle: 'Mẹo học tập chọn lọc từ ban biên tập'
  },
  {
    id: 'performance',
    label: 'Hiệu Suất',
    icon: LineChart,
    color: '#10b981',
    key: '5',
    subtitle: 'Tiến độ tuần và mục tiêu học tập'
  },
  {
    id: 'notes',
    label: 'Ghi Chú',
    icon: FileText,
    color: '#06b6d4',
    key: '6',
    subtitle: 'Kho tài liệu và ghi chú đã số hóa'
  }
];

export const navItem = (id) => NAV_ITEMS.find((item) => item.id === id) || NAV_ITEMS[0];
