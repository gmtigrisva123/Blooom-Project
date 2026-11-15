import {
  Sun,
  Timer,
  Layers,
  Users,
  FolderOpen,
  TrendingUp,
  FlaskConical,
  Lightbulb
} from 'lucide-react';

/* ==========================================================================
   NAVIGATION — the app's eight places, named the way a student would say them.
   `route` is the address; `mobile` marks the four that sit on the phone's tab
   bar (everything else lives under "Thêm").
   ========================================================================== */

export const PAGES = [
  {
    id: 'today',
    route: 'hom-nay',
    label: 'Hôm nay',
    icon: Sun,
    group: 'learn',
    mobile: true,
    hint: 'Việc cần làm hôm nay'
  },
  {
    id: 'focus',
    route: 'tap-trung',
    label: 'Tập trung',
    icon: Timer,
    group: 'learn',
    mobile: true,
    hint: 'Đồng hồ đếm giờ học'
  },
  {
    id: 'cards',
    route: 'the-nho',
    label: 'Thẻ nhớ',
    icon: Layers,
    group: 'learn',
    mobile: true,
    hint: 'Ôn bài đúng lúc sắp quên'
  },
  {
    id: 'library',
    route: 'tai-lieu',
    label: 'Tài liệu',
    icon: FolderOpen,
    group: 'learn',
    hint: 'Ảnh chụp vở và tệp PDF'
  },
  {
    id: 'groups',
    route: 'nhom-hoc',
    label: 'Nhóm học',
    icon: Users,
    group: 'more',
    mobile: true,
    hint: 'Học cùng bạn bè theo môn'
  },
  {
    id: 'progress',
    route: 'tien-do',
    label: 'Tiến độ',
    icon: TrendingUp,
    group: 'more',
    hint: 'Mục tiêu tuần, giờ vàng, huy hiệu'
  },
  {
    id: 'experiments',
    route: 'thu-nghiem',
    label: 'Thử nghiệm',
    icon: FlaskConical,
    group: 'more',
    hint: 'So sánh hai cách học'
  },
  {
    id: 'tips',
    route: 'meo-hoc',
    label: 'Mẹo học',
    icon: Lightbulb,
    group: 'more',
    hint: 'Bài viết ngắn về cách học'
  }
];

export const NAV_GROUPS = [
  { id: 'learn', label: 'Học' },
  { id: 'more', label: 'Cùng nhau & khám phá' }
];

export const pageByRoute = (route) => PAGES.find((p) => p.route === route) || null;
export const pageById = (id) => PAGES.find((p) => p.id === id) || PAGES[0];
export const HOME_ROUTE = PAGES[0].route;
