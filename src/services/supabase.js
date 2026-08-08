/* ==========================================================================
   BLOOOM — KẾT NỐI CƠ SỞ DỮ LIỆU

   Toàn bộ dữ liệu của Blooom nằm trong một cơ sở dữ liệu PostgreSQL do
   Supabase quản lý. Tệp này là nơi duy nhất trong mã nguồn biết cách mở kết
   nối đó; mọi tệp khác đi qua `supabase` hoặc `requireClient()`.

   Khóa cấu hình đọc từ biến môi trường lúc build (Vite). Anon key là khóa
   CÔNG KHAI theo thiết kế của Supabase — nó chỉ định danh dự án, còn quyền
   truy cập từng hàng do Row Level Security quyết định (xem
   supabase/migrations/0001_init.sql). Vì vậy nó nằm trong bundle phía trình
   duyệt là bình thường và an toàn. Khóa `service_role` thì tuyệt đối không
   bao giờ được đặt vào tệp .env của dự án này.
   ========================================================================== */

import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

/* Chưa cấu hình thì ứng dụng không đoán mò và cũng không âm thầm quay về lưu
   cục bộ — nó hiện màn hình hướng dẫn cấu hình (xem App.jsx). Im lặng nuốt
   lỗi ở đây sẽ dẫn tới cảnh tệ nhất khi trình bày: giao diện chạy mượt nhưng
   không có gì được lưu thật. */
export const isSupabaseConfigured = Boolean(url && anonKey);

export const supabase = isSupabaseConfigured
  ? createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        /* BẮT BUỘC phải bật khi dự án Supabase có xác nhận email.
           Liên kết trong thư xác nhận đưa người dùng trở lại trang với token
           nằm trong phần hash của URL; tắt tùy chọn này thì thư viện sẽ không
           đọc token đó, và người vừa bấm xác nhận sẽ quay lại đúng màn hình
           đăng nhập như chưa có gì xảy ra — một ngõ cụt không có lối thoát. */
        detectSessionInUrl: true,
        /* Luồng ẩn (token nằm trong hash) là mặc định của supabase-js v2 và là
           thứ hợp với Blooom: không có máy chủ backend nào để giữ code
           verifier của luồng PKCE. Ghi rõ ra đây thay vì dựa vào mặc định, để
           một lần nâng cấp thư viện đổi mặc định không âm thầm làm hỏng liên
           kết xác nhận email. */
        flowType: 'implicit'
      },
      db: { schema: 'public' },
      global: {
        headers: { 'x-application-name': 'blooom' }
      }
    })
  : null;

export const requireClient = () => {
  if (!supabase) {
    throw new Error(
      'Chưa cấu hình cơ sở dữ liệu. Hãy tạo tệp .env với VITE_SUPABASE_URL và VITE_SUPABASE_ANON_KEY.'
    );
  }
  return supabase;
};

/* --------------------------------------------------------------------------
   MÚI GIỜ

   Phiên học được lưu kèm múi giờ của thiết bị vì phân tích cosinor nhịp sinh
   học (services/chronobiology.js) cần biết phiên diễn ra lúc mấy giờ THEO
   GIỜ CỦA HỌC SINH. Một phiên lúc 21 giờ tối ở Hà Nội và một phiên lúc 21
   giờ tối ở Paris là cùng một hiện tượng sinh học nhưng khác nhau 6 tiếng
   UTC — bỏ qua múi giờ là làm hỏng chính mô hình.
   -------------------------------------------------------------------------- */
export const deviceTimezone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
};

/* --------------------------------------------------------------------------
   LỖI

   postgrest-js ném về đối tượng lỗi có `message`, `code`, `details`. Người
   dùng cuối là học sinh, nên thông báo phải là tiếng Việt và nói được nên
   làm gì tiếp; chi tiết kỹ thuật vẫn giữ trong `cause` để còn gỡ lỗi.
   -------------------------------------------------------------------------- */
const FRIENDLY_BY_CODE = {
  /* Vi phạm RLS — thường là phiên đăng nhập đã hết hạn. */
  42501: 'Bạn không có quyền thực hiện thao tác này. Hãy thử đăng nhập lại.',
  /* Trùng khóa chính / unique. */
  23505: 'Dữ liệu này đã tồn tại.',
  /* Vi phạm khóa ngoại. */
  23503: 'Dữ liệu liên quan không còn tồn tại. Hãy tải lại trang.',
  /* Vi phạm CHECK constraint. */
  23514: 'Dữ liệu nhập vào không hợp lệ.',
  /* Bảng chưa tồn tại — gần như luôn là chưa chạy migration. */
  '42P01':
    'Cơ sở dữ liệu chưa có bảng nào. Hãy chạy supabase/migrations/0001_init.sql trong SQL Editor.'
};

export const toFriendlyError = (error, fallback = 'Không kết nối được cơ sở dữ liệu.') => {
  if (!error) return new Error(fallback);

  const friendly = FRIENDLY_BY_CODE[error.code];
  if (friendly) return Object.assign(new Error(friendly), { cause: error });

  /* Mất mạng: fetch ném TypeError chứ không phải lỗi PostgREST. */
  if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
    return Object.assign(new Error('Mất kết nối mạng. Kiểm tra đường truyền rồi thử lại.'), {
      cause: error
    });
  }

  return Object.assign(new Error(error.message || fallback), { cause: error });
};

/* Bọc một truy vấn PostgREST: trả dữ liệu, hoặc ném lỗi đã dịch. */
export const unwrap = async (query, fallback) => {
  const { data, error } = await query;
  if (error) throw toFriendlyError(error, fallback);
  return data;
};
