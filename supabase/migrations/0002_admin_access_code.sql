-- ===========================================================================
-- BLOOOM — CỔNG MÃ TRUY CẬP CHO VAI TRÒ ADMIN
--
-- Chạy SAU 0001_init.sql. Idempotent: chạy lại nhiều lần không lỗi và không
-- ghi đè mã đã đổi.
--
-- VÌ SAO CẦN TỆP NÀY
--
-- Trước bản vá này, nút đổi vai trò trên thanh trên cùng ghi thẳng
-- profiles.role = 'admin', và policy profiles_update_own cho phép mỗi người
-- sửa hàng hồ sơ của chính mình. Nghĩa là BẤT KỲ tài khoản nào cũng tự cấp
-- được quyền Biên Tập Viên — bằng một cú bấm nút, hoặc bằng một câu update
-- gõ trong DevTools nếu nút bị giấu đi.
--
-- Đó không phải chuyện nhỏ: role = 'admin' chính là điều kiện của policy
-- articles_insert_admin, tức là quyền đăng bài lên trang Mẹo Học Tập mà mọi
-- học sinh trong hệ thống đều đọc được.
--
-- Từ nay:
--   · profiles.role KHÔNG còn đổi được bằng UPDATE từ client — trigger
--     profiles_guard_role chặn lại, kể cả khi câu lệnh được gửi thẳng tới
--     PostgREST chứ không qua giao diện.
--   · Muốn lên admin phải gọi RPC claim_admin_role(mã). Mã được so ở PHÍA
--     MÁY CHỦ với một digest nằm trong bảng không có policy nào cho đọc.
--   · Mỗi lần thử được ghi lại; sai 5 lần trong 15 phút thì khóa tạm.
--   · Hạ xuống Học Sinh thì không cần mã (release_admin_role) — bỏ bớt quyền
--     của chính mình không phải là thao tác cần canh gác.
--
-- Kiểm tra ở phía trình duyệt không được tính là canh gác: mã nào gửi xuống
-- trình duyệt để so sánh thì cũng nằm sẵn trong tệp JavaScript ai cũng tải
-- được. Đó là lý do toàn bộ phần so mã nằm trong tệp này.
-- ===========================================================================


-- ---------------------------------------------------------------------------
-- 1. MÃ TRUY CẬP — một hàng duy nhất, không ai đọc được
--
-- Bảng chỉ lưu digest SHA-256 của (salt || mã đã chuẩn hóa), không lưu mã.
-- Bật RLS mà KHÔNG tạo policy nào: với anon key, RLS mặc định là từ chối, nên
-- bảng này vô hình với mọi client. Chỉ hàm security definer bên dưới — chạy
-- bằng quyền của chủ sở hữu hàm — mới đọc được.
-- ---------------------------------------------------------------------------
create table if not exists public.admin_access_code (
  id         boolean     primary key default true,
  code_salt  text        not null,
  code_hash  text        not null,
  updated_at timestamptz not null default now(),

  constraint admin_access_code_singleton check (id is true)
);

alter table public.admin_access_code enable row level security;
revoke all on table public.admin_access_code from anon, authenticated;


-- Chuẩn hóa trước khi băm: bỏ khoảng trắng thừa và không phân biệt hoa
-- thường. Bàn phím điện thoại tự viết hoa chữ đầu, và một mã 6 chữ cái thì
-- việc phân biệt hoa thường không thêm được bao nhiêu sức mạnh — nhưng lại đủ
-- để một học sinh gõ đúng mã vẫn bị từ chối mà không hiểu vì sao.
create or replace function public.admin_code_digest(p_salt text, p_code text)
returns text
language sql
immutable
as $$
  select encode(sha256(convert_to(p_salt || lower(btrim(p_code)), 'utf8')), 'hex');
$$;

-- Hàm băm không cần có mặt trong API: client không bao giờ tự băm mã.
revoke execute on function public.admin_code_digest(text, text)
  from public, anon, authenticated;


-- Mã khởi tạo do người quản lý dự án đặt (6 ký tự). `do nothing` để lần chạy
-- lại không ghi đè mã đã được đổi bằng câu lệnh ngay bên dưới.
insert into public.admin_access_code (id, code_salt, code_hash)
values (
  true,
  'blooom.admin.2026.7f3c1a9e',
  'f9b314f9af39aa15aef962790f6fb01bc0b97adec6941d4cf5418b2eec66e157'
)
on conflict (id) do nothing;

-- ĐỔI MÃ về sau — chạy đúng một câu này trong SQL Editor, thay MÃMỚI:
--
--   update public.admin_access_code
--   set code_hash  = public.admin_code_digest(code_salt, 'MÃMỚI'),
--       updated_at = now()
--   where id;
--
-- Mã mới cũng nên dài 6 ký tự: giao diện và hàm claim_admin_role đều kiểm tra
-- độ dài đó (tìm ADMIN_CODE_LENGTH trong src/services/auth.js nếu muốn đổi).


-- ---------------------------------------------------------------------------
-- 2. NHẬT KÝ THỬ MÃ — vừa để giới hạn tần suất, vừa để kiểm chứng
--
-- Một cổng mã 6 ký tự mà cho thử không giới hạn thì chỉ là một cánh cửa chậm.
-- Bảng này đếm số lần sai gần đây của từng tài khoản; 5 lần trong 15 phút là
-- khóa tạm.
--
-- Ghi cả lần đúng lẫn lần sai, nên nó cũng là bằng chứng ai đã nhận quyền
-- Biên Tập Viên vào lúc nào — chính chủ đọc được lịch sử của mình.
-- ---------------------------------------------------------------------------
create table if not exists public.admin_claim_attempts (
  id           bigint      generated always as identity primary key,
  user_id      uuid        not null references auth.users (id) on delete cascade,
  succeeded    boolean     not null,
  attempted_at timestamptz not null default now()
);

create index if not exists admin_claim_attempts_user_time_idx
  on public.admin_claim_attempts (user_id, attempted_at desc);

alter table public.admin_claim_attempts enable row level security;

-- Chỉ đọc, và chỉ hàng của chính mình. Cố ý KHÔNG có policy INSERT: hàng chỉ
-- được ghi bởi claim_admin_role, nếu không thì ai cũng tự xóa dấu vết bằng
-- cách chèn thêm hàng "thành công" cho mình.
drop policy if exists admin_claim_attempts_select_own on public.admin_claim_attempts;
create policy admin_claim_attempts_select_own on public.admin_claim_attempts
  for select to authenticated using (user_id = auth.uid());


-- ---------------------------------------------------------------------------
-- 3. KHÓA CỘT role
--
-- Trigger là chỗ đặt duy nhất chặn được mọi đường: giao diện, PostgREST gọi
-- thẳng, hay một script chạy bằng anon key đều phải đi qua nó.
--
-- Hai hàm RPC bên dưới mở khóa bằng một biến cấu hình cấp GIAO DỊCH
-- (set_config với tham số thứ ba = true, nên nó tự mất khi giao dịch kết
-- thúc). Client không có cách nào tự đặt biến này: PostgREST chỉ cho gọi các
-- hàm trong schema public, mà set_config thì nằm ở pg_catalog.
--
-- Chú ý: policy profiles_update_own của 0001 vẫn giữ nguyên. Người dùng vẫn
-- sửa được tên, ảnh đại diện, khối lớp của mình như trước — chỉ riêng cột
-- role là bị khóa.
--
-- Trigger này khóa cả SQL Editor. Muốn tự tay cấp quyền cho một tài khoản mà
-- không cần mã, chạy (thay <user-id>):
--
--   do $$
--   begin
--     perform set_config('blooom.role_change', 'granted', true);
--     update public.profiles set role = 'admin' where id = '<user-id>';
--   end
--   $$;
-- ---------------------------------------------------------------------------
create or replace function public.guard_profile_role()
returns trigger
language plpgsql
as $$
begin
  if new.role is distinct from old.role
     and coalesce(current_setting('blooom.role_change', true), '') <> 'granted' then
    raise exception
      'Vai trò không đổi được trực tiếp. Hãy dùng mã truy cập trong ứng dụng.';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_guard_role on public.profiles;
create trigger profiles_guard_role
  before update on public.profiles
  for each row execute function public.guard_profile_role();


-- ---------------------------------------------------------------------------
-- 4. NHẬN QUYỀN ADMIN BẰNG MÃ
--
-- Trả về jsonb thay vì ném lỗi khi mã sai — và đó là một lựa chọn có chủ đích:
-- `raise exception` sẽ cuộn ngược cả giao dịch, kéo theo cả dòng nhật ký vừa
-- ghi, và bộ đếm số lần sai sẽ vĩnh viễn bằng 0. Muốn đếm được số lần sai thì
-- lần sai đó phải được commit.
--
-- Hình dạng trả về:
--   { ok, reason, message, remaining, profile }
--   reason ∈ 'granted' | 'wrong_code' | 'locked'
-- ---------------------------------------------------------------------------
create or replace function public.claim_admin_role(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  max_failures constant integer  := 5;
  window_size  constant interval := interval '15 minutes';
  code_length  constant integer  := 6;

  current_user_id uuid := auth.uid();
  clean_code      text := coalesce(btrim(p_code), '');
  stored          public.admin_access_code%rowtype;
  recent_failures integer;
  updated_profile public.profiles%rowtype;
begin
  if current_user_id is null then
    raise exception 'Chưa đăng nhập.';
  end if;

  select * into stored from public.admin_access_code where id = true;
  if not found then
    raise exception 'Máy chủ chưa được đặt mã truy cập quản trị.';
  end if;

  select count(*) into recent_failures
  from public.admin_claim_attempts
  where user_id = current_user_id
    and not succeeded
    and attempted_at > now() - window_size;

  -- Lần thử trong lúc đang khóa KHÔNG được ghi lại: nếu ghi, mỗi lần bấm lại
  -- sẽ đẩy cửa sổ 15 phút lùi thêm và người dùng không bao giờ ra khỏi khóa.
  if recent_failures >= max_failures then
    return jsonb_build_object(
      'ok',        false,
      'reason',    'locked',
      'remaining', 0,
      'message',   'Đã nhập sai ' || max_failures ||
                   ' lần. Hãy đợi khoảng 15 phút rồi thử lại.'
    );
  end if;

  if char_length(clean_code) <> code_length
     or public.admin_code_digest(stored.code_salt, clean_code) <> stored.code_hash then
    insert into public.admin_claim_attempts (user_id, succeeded)
    values (current_user_id, false);

    return jsonb_build_object(
      'ok',        false,
      'reason',    'wrong_code',
      'remaining', max_failures - recent_failures - 1,
      'message',   'Mã truy cập không đúng.'
    );
  end if;

  insert into public.admin_claim_attempts (user_id, succeeded)
  values (current_user_id, true);

  perform set_config('blooom.role_change', 'granted', true);
  update public.profiles
  set role = 'admin'
  where id = current_user_id
  returning * into updated_profile;

  /* Kiểm tra NGAY sau UPDATE, trước perform: `perform` cũng đặt lại biến
     FOUND (set_config trả về một hàng, nên FOUND thành true), và nếu để sau
     thì câu lệnh kiểm tra này sẽ không bao giờ chạy. */
  if not found then
    raise exception 'Không tìm thấy hồ sơ của tài khoản này.';
  end if;

  perform set_config('blooom.role_change', '', true);

  return jsonb_build_object(
    'ok',        true,
    'reason',    'granted',
    'remaining', max_failures,
    'profile',   to_jsonb(updated_profile)
  );
end;
$$;


-- ---------------------------------------------------------------------------
-- 5. TRẢ LẠI QUYỀN ADMIN
--
-- Không hỏi mã. Người dùng đang tự bỏ bớt quyền của chính mình, và bắt họ gõ
-- mã để làm việc đó chỉ khiến những ai lỡ tay bấm nhầm bị kẹt ở vai trò họ
-- không muốn giữ.
-- ---------------------------------------------------------------------------
create or replace function public.release_admin_role()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  updated_profile public.profiles%rowtype;
begin
  if current_user_id is null then
    raise exception 'Chưa đăng nhập.';
  end if;

  perform set_config('blooom.role_change', 'granted', true);
  update public.profiles
  set role = 'student'
  where id = current_user_id
  returning * into updated_profile;

  -- Thứ tự có ý nghĩa — xem ghi chú trong claim_admin_role.
  if not found then
    raise exception 'Không tìm thấy hồ sơ của tài khoản này.';
  end if;

  perform set_config('blooom.role_change', '', true);

  return jsonb_build_object(
    'ok',      true,
    'reason',  'released',
    'profile', to_jsonb(updated_profile)
  );
end;
$$;


-- Chỉ tài khoản đã đăng nhập mới gọi được. Khách vãng lai (anon, chưa qua
-- signInAnonymously) không có gì để nâng cấp.
revoke execute on function public.claim_admin_role(text)  from public, anon;
revoke execute on function public.release_admin_role()    from public, anon;
grant  execute on function public.claim_admin_role(text)  to authenticated;
grant  execute on function public.release_admin_role()    to authenticated;


-- ---------------------------------------------------------------------------
-- 6. DỌN DẸP TÙY CHỌN
--
-- Nếu cơ sở dữ liệu đã chạy bản trước, có thể đang tồn tại những tài khoản
-- lên admin bằng cách bấm nút chứ không phải bằng mã. Bỏ ghi chú khối dưới
-- đây để đưa tất cả về Học Sinh; ai thật sự cần quyền thì nhập mã lại.
--
-- Khối này KHÔNG tự chạy: nó hạ quyền người thật, và đó phải là một quyết
-- định có ý thức chứ không phải tác dụng phụ của việc chạy migration.
-- ---------------------------------------------------------------------------
-- do $$
-- begin
--   perform set_config('blooom.role_change', 'granted', true);
--   update public.profiles set role = 'student' where role = 'admin';
-- end
-- $$;


-- Nhắc PostgREST nạp lại lược đồ, để hai hàm mới xuất hiện trong API ngay chứ
-- không phải đợi lần làm mới định kỳ. Supabase thường tự làm việc này; câu
-- lệnh ở đây chỉ để chạy xong là dùng được luôn.
notify pgrst, 'reload schema';


-- ===========================================================================
-- KẾT THÚC. Tệp này không thêm một hàng dữ liệu học tập nào — chỉ một hàng
-- cấu hình chứa digest của mã truy cập.
-- ===========================================================================
