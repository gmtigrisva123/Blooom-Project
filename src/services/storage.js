/* ==========================================================================
   BLOOOM — TÙY CHỌN GIAO DIỆN THEO THIẾT BỊ

   Tệp này từng là "cơ sở dữ liệu" của Blooom. Nó không còn giữ vai trò đó
   nữa: toàn bộ dữ liệu học tập — hồ sơ, nhóm học, phiên Pomodoro, ghi chú,
   thẻ ghi nhớ, thí nghiệm — nay nằm trong PostgreSQL và đi qua
   services/db/index.js.

   Thứ còn lại ở đây là những tùy chọn THUỘC VỀ THIẾT BỊ chứ không thuộc về
   người dùng: thanh bên đang thu gọn hay mở, giao diện sáng hay tối. Một học
   sinh mở Blooom trên máy tính ở trường và trên điện thoại ở nhà hoàn toàn
   có lý do để muốn hai thiết lập khác nhau, nên đồng bộ chúng lên máy chủ sẽ
   là làm sai. Chúng cũng không phải dữ liệu nghiên cứu, nên không có lý do
   gì để chúng rời khỏi máy.
   ========================================================================== */

const UI_PREFS_KEY = 'blooom_ui_prefs';

const DEFAULT_PREFS = { sidebarCollapsed: false };

/* localStorage ném lỗi ở chế độ ẩn danh và khi hết dung lượng. Đọc hỏng phải
   thoái lui về giá trị mặc định, không bao giờ được làm vỡ một lần render. */
export const getUiPrefs = () => {
  try {
    const raw = localStorage.getItem(UI_PREFS_KEY);
    return raw ? { ...DEFAULT_PREFS, ...JSON.parse(raw) } : DEFAULT_PREFS;
  } catch {
    return DEFAULT_PREFS;
  }
};

export const setUiPrefs = (patch) => {
  const next = { ...getUiPrefs(), ...patch };
  try {
    localStorage.setItem(UI_PREFS_KEY, JSON.stringify(next));
  } catch {
    /* Không lưu được thì thiết lập chỉ sống trong phiên này — chấp nhận được. */
  }
  return next;
};

/* ==========================================================================
   DỌN DẸP DỮ LIỆU CỦA PHIÊN BẢN CŨ

   Các phiên bản Blooom trước lưu toàn bộ dữ liệu học tập trong localStorage,
   trong đó có cả một bộ dữ liệu mẫu được sinh sẵn (nhóm học, bài viết, phiên
   học và thẻ ghi nhớ không có thật). Bộ dữ liệu đó nay đã bị gỡ khỏi mã
   nguồn, nhưng nó vẫn còn nằm trong trình duyệt của bất kỳ ai từng mở phiên
   bản cũ — và sẽ không tự biến mất.

   Hàm này xóa chúng đi, một lần, lúc ứng dụng khởi động. Nếu không dọn, một
   máy tính dùng để trình bày có thể vẫn hiện "Ôn thi THPT Quốc Gia - Toán 12
   High Scores" bên cạnh dữ liệu thật, và không có cách nào để người xem phân
   biệt được hai thứ.
   ========================================================================== */
const LEGACY_KEYS = [
  'studyhub_user_profile',
  'studyhub_study_groups',
  'studyhub_timer_sessions',
  'studyhub_performance_goals',
  'studyhub_notes',
  'studyhub_editor_picks',
  'studyhub_bookmarks',
  'studyhub_seen_badges',
  'studyhub_ui_prefs',
  'blooom_flashcards',
  'blooom_experiments',
  'blooom_accounts',
  'blooom_session'
];

export const purgeLegacyLocalData = () => {
  let removed = 0;

  try {
    /* Phiên bản cũ đặt tiền tố "blooom:<accountId>:" trước mỗi khóa để tách
       dữ liệu giữa các hồ sơ trên cùng một máy, nên không thể chỉ xóa danh
       sách khóa cố định — phải quét toàn bộ. */
    const doomed = [];

    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key) continue;

      const isNamespacedLegacy =
        key.startsWith('blooom:') && LEGACY_KEYS.some((legacy) => key.endsWith(legacy));

      if (LEGACY_KEYS.includes(key) || isNamespacedLegacy) doomed.push(key);
    }

    doomed.forEach((key) => {
      localStorage.removeItem(key);
      removed += 1;
    });
  } catch {
    /* Không đọc được localStorage thì cũng không có gì để dọn. */
  }

  return removed;
};
