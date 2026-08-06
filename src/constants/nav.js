/* ==========================================================================
   NAVIGATION — the single definition of the app's sections.

   `color` is the section's marker hue (nav icon, page rule) — it no longer
   repaints the interface, only locates the user. `key` is the number shortcut
   that jumps straight to the section, and `group` decides which rail heading
   the item sits under.
   ========================================================================== */

import {
  LayoutDashboard,
  Users,
  Timer,
  Sparkles,
  LineChart,
  FileText,
  Layers,
  FlaskConical,
  Waves
} from 'lucide-react';

export const NAV_GROUPS = [
  { id: 'study', label: 'Không gian học' },
  { id: 'lab', label: 'Phòng thí nghiệm' }
];

export const NAV_ITEMS = [
  {
    id: 'dashboard',
    label: 'Tổng Quan',
    icon: LayoutDashboard,
    color: '#2dd4bf',
    key: '1',
    group: 'study',
    subtitle: 'Toàn cảnh việc học của bạn hôm nay'
  },
  {
    id: 'timer',
    label: 'Bộ Đếm Giờ',
    icon: Timer,
    color: '#f0a85c',
    key: '2',
    group: 'study',
    subtitle: 'Pomodoro tập trung và nhật ký phiên học'
  },
  {
    id: 'groups',
    label: 'Nhóm Học Tập',
    icon: Users,
    color: '#818cf8',
    key: '3',
    group: 'study',
    subtitle: 'Tìm và tham gia nhóm học theo môn'
  },
  {
    id: 'notes',
    label: 'Ghi Chú',
    icon: FileText,
    color: '#a3e635',
    key: '4',
    group: 'study',
    subtitle: 'Kho tài liệu và ghi chú đã số hóa'
  },
  {
    id: 'editor',
    label: "Editor's Pick",
    icon: Sparkles,
    color: '#f472b6',
    key: '5',
    group: 'study',
    subtitle: 'Mẹo học tập chọn lọc từ ban biên tập'
  },
  {
    id: 'recall',
    label: 'Ôn Ngắt Quãng',
    icon: Layers,
    color: '#c4b5fd',
    key: '6',
    group: 'lab',
    subtitle: 'Thẻ ghi nhớ SM-2 và đường cong quên Ebbinghaus'
  },
  {
    id: 'lab',
    label: 'Thí Nghiệm',
    icon: FlaskConical,
    color: '#5eead4',
    key: '7',
    group: 'lab',
    subtitle: 'Tự thử nghiệm có đối chứng trên chính dữ liệu của bạn'
  },
  {
    id: 'insights',
    label: 'Nhịp Sinh Học',
    icon: Waves,
    color: '#fcd34d',
    key: '8',
    group: 'lab',
    subtitle: 'Phân tích cosinor và dự báo hồi quy'
  },
  {
    id: 'performance',
    label: 'Hiệu Suất',
    icon: LineChart,
    color: '#7dd3fc',
    key: '9',
    group: 'lab',
    subtitle: 'Tiến độ tuần và mục tiêu học tập'
  }
];

export const navItem = (id) => NAV_ITEMS.find((item) => item.id === id) || NAV_ITEMS[0];

export const navItemsInGroup = (groupId) => NAV_ITEMS.filter((item) => item.group === groupId);
