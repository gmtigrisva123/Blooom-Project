-- ===========================================================================
-- BLOOOM — LƯỢC ĐỒ CƠ SỞ DỮ LIỆU (PostgreSQL / Supabase)
--
-- Nguyên tắc thiết kế:
--
--   1. KHÔNG CÓ DỮ LIỆU MẪU. Không một dòng INSERT nào trong file này tạo ra
--      nhóm học, bài viết, phiên học hay thẻ ghi nhớ. Mọi hàng trong cơ sở dữ
--      liệu đều do một người dùng thật tạo ra qua giao diện.
--
--   2. MỖI HÀNG THUỘC VỀ MỘT NGƯỜI. Row Level Security được bật trên mọi
--      bảng và mặc định là từ chối; người dùng chỉ đọc/ghi được dữ liệu của
--      chính mình, trừ hai ngoại lệ có chủ đích (nhóm học công khai và bài
--      viết đã xuất bản).
--
--   3. DỮ LIỆU THÔ ĐƯỢC GIỮ LẠI, SỐ LIỆU DẪN XUẤT THÌ KHÔNG. Bảng
--      card_reviews lưu từng lần chấm thẻ, experiment_trials lưu từng phiên
--      thí nghiệm. Chuỗi ngày học, huy hiệu, XP, đường cong quên đều được
--      tính lại từ dữ liệu thô ở phía client — không bao giờ lưu, nên không
--      bao giờ mâu thuẫn với dữ liệu gốc.
--
--   4. TỐI THIỂU HÓA DỮ LIỆU CÁ NHÂN. Người dùng nền tảng này phần lớn là
--      học sinh vị thành niên. Không thu thập IP, không user-agent, không
--      dấu vết trình duyệt. Trường duy nhất mang tính "môi trường" là múi
--      giờ, và nó được thu thập vì phân tích cosinor nhịp sinh học cần biết
--      giờ địa phương của phiên học mới có ý nghĩa.
--
-- Cách chạy: dán toàn bộ file này vào Supabase Dashboard › SQL Editor › Run.
-- File có tính idempotent (chạy lại nhiều lần không lỗi).
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 0. TIỆN ÍCH CHUNG
-- ---------------------------------------------------------------------------

-- Tự động cập nhật updated_at mỗi lần UPDATE, để client không phải tự nhớ.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


-- ---------------------------------------------------------------------------
-- 1. PROFILES — hồ sơ công khai, ánh xạ 1-1 với auth.users
--
-- auth.users là bảng do Supabase quản lý và chứa email + digest mật khẩu;
-- ứng dụng không đọc thẳng vào đó. profiles là phần hồ sơ mà ứng dụng sở hữu.
-- ---------------------------------------------------------------------------
-- profiles là DANH BẠ HIỂN THỊ: mọi người dùng đã đăng nhập đều đọc được, vì
-- tên người tạo nhóm và tên tác giả bài viết phải hiện ra được.
--
-- Vì vậy bảng này cố ý KHÔNG chứa email. Email đã nằm sẵn trong auth.users,
-- nơi chỉ chính chủ đọc được qua phiên đăng nhập của mình. Chép nó sang đây
-- sẽ biến một danh bạ tên gọi thành một danh sách địa chỉ email của toàn bộ
-- học sinh, đọc được bởi bất kỳ ai tạo được một tài khoản.
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text        not null default '',
  avatar_url  text,
  grade_level text,
  role        text        not null default 'student',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint profiles_role_check       check (role in ('student', 'admin')),
  constraint profiles_full_name_length check (char_length(full_name) <= 120)
);

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();


-- Dấu vết hoạt động tách khỏi profiles vì nó KHÔNG công khai: số lần đăng
-- nhập và thời điểm truy cập gần nhất là thông tin về thói quen của một học
-- sinh, chỉ chính họ mới được đọc.
create table if not exists public.user_activity (
  user_id         uuid primary key references auth.users (id) on delete cascade,
  sign_in_count   integer     not null default 0,
  last_sign_in_at timestamptz,
  last_seen_at    timestamptz,
  timezone        text
);


-- Khi Supabase Auth tạo một user mới (đăng ký), tạo luôn hàng profiles tương
-- ứng. Làm bằng trigger phía cơ sở dữ liệu thay vì gọi từ client, vì client
-- có thể mất mạng ngay sau khi đăng ký thành công và khi đó tài khoản sẽ tồn
-- tại mà không có hồ sơ.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, grade_level, created_at)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'grade_level', ''),
    now()
  )
  on conflict (id) do nothing;

  insert into public.user_activity (user_id, timezone)
  values (new.id, nullif(new.raw_user_meta_data ->> 'timezone', ''))
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ---------------------------------------------------------------------------
-- 2. AUTH_EVENTS — nhật ký đăng ký / đăng nhập / đăng xuất
--
-- Đây là phần trả lời trực tiếp cho yêu cầu "lưu dữ liệu người dùng mỗi khi
-- đăng nhập hoặc đăng ký". Mỗi sự kiện là một hàng bất biến (không sửa,
-- không xóa được — xem policy bên dưới), nên nó dùng được như một sổ nhật ký
-- kiểm chứng: bao nhiêu người dùng thật, quay lại bao nhiêu lần, vào lúc nào.
--
-- Cố ý KHÔNG lưu: địa chỉ IP, user-agent, vị trí. Múi giờ được lưu vì mô hình
-- cosinor cần giờ địa phương.
-- ---------------------------------------------------------------------------
create table if not exists public.auth_events (
  id           bigint generated always as identity primary key,
  user_id      uuid        not null references auth.users (id) on delete cascade,
  event_type   text        not null,
  timezone     text,
  occurred_at  timestamptz not null default now(),

  constraint auth_events_type_check
    check (event_type in ('sign_up', 'sign_in', 'sign_out'))
);

create index if not exists auth_events_user_time_idx
  on public.auth_events (user_id, occurred_at desc);


-- Ghi một sự kiện đăng nhập VÀ cập nhật bộ đếm trên hồ sơ trong cùng một
-- giao dịch. Làm bằng RPC thay vì hai lệnh riêng từ client vì hai lý do:
-- bộ đếm sign_in_count là read-modify-write nên hai tab mở cùng lúc sẽ ghi đè
-- lẫn nhau nếu tính ở client; và nếu client mất mạng giữa chừng thì nhật ký
-- sẽ có sự kiện mà hồ sơ không được cập nhật.
create or replace function public.record_auth_event(
  p_event_type text,
  p_timezone   text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Chưa đăng nhập.';
  end if;

  if p_event_type not in ('sign_up', 'sign_in', 'sign_out') then
    raise exception 'Loại sự kiện không hợp lệ: %', p_event_type;
  end if;

  insert into public.auth_events (user_id, event_type, timezone)
  values (current_user_id, p_event_type, p_timezone);

  -- Đăng xuất không làm tăng số lần đăng nhập, chỉ cập nhật lần cuối thấy.
  insert into public.user_activity (user_id, sign_in_count, last_sign_in_at, last_seen_at, timezone)
  values (
    current_user_id,
    case when p_event_type in ('sign_up', 'sign_in') then 1 else 0 end,
    case when p_event_type in ('sign_up', 'sign_in') then now() else null end,
    now(),
    nullif(p_timezone, '')
  )
  on conflict (user_id) do update
  set
    sign_in_count = public.user_activity.sign_in_count
      + case when p_event_type in ('sign_up', 'sign_in') then 1 else 0 end,
    last_sign_in_at = case
      when p_event_type in ('sign_up', 'sign_in') then now()
      else public.user_activity.last_sign_in_at
    end,
    last_seen_at = now(),
    timezone     = coalesce(nullif(p_timezone, ''), public.user_activity.timezone);
end;
$$;

revoke all on function public.record_auth_event(text, text) from public;
grant execute on function public.record_auth_event(text, text) to authenticated;


-- ---------------------------------------------------------------------------
-- 3. STUDY_GROUPS + GROUP_MEMBERS
--
-- Số thành viên KHÔNG được lưu thành cột. Nó là COUNT(*) trên group_members,
-- nên không thể lệch khỏi danh sách thành viên thật — đúng một nguồn sự thật.
-- ---------------------------------------------------------------------------
-- owner_id trỏ tới public.profiles chứ không phải auth.users. Toàn vẹn dữ
-- liệu là như nhau (profiles.id lại trỏ tới auth.users và cùng cascade),
-- nhưng chỉ khóa ngoại này mới cho phép đọc tên chủ nhóm trong cùng một truy
-- vấn — PostgREST chỉ nối được những bảng nằm trong schema nó phục vụ, và
-- auth.users thì không.
create table if not exists public.study_groups (
  id          uuid        primary key default gen_random_uuid(),
  owner_id    uuid        not null references public.profiles (id) on delete cascade,
  name        text        not null,
  subject     text        not null,
  description text        not null default '',
  is_private  boolean     not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint study_groups_name_length check (char_length(name) between 1 and 160)
);

create index if not exists study_groups_owner_idx   on public.study_groups (owner_id);
create index if not exists study_groups_subject_idx on public.study_groups (subject);

drop trigger if exists study_groups_touch_updated_at on public.study_groups;
create trigger study_groups_touch_updated_at
  before update on public.study_groups
  for each row execute function public.touch_updated_at();


create table if not exists public.group_members (
  group_id  uuid        not null references public.study_groups (id) on delete cascade,
  user_id   uuid        not null references auth.users (id) on delete cascade,
  role      text        not null default 'member',
  joined_at timestamptz not null default now(),

  primary key (group_id, user_id),
  constraint group_members_role_check check (role in ('owner', 'member'))
);

create index if not exists group_members_user_idx on public.group_members (user_id);


-- Người tạo nhóm mặc nhiên là thành viên đầu tiên. Làm ở tầng cơ sở dữ liệu
-- để một nhóm không bao giờ tồn tại ở trạng thái "không có ai trong đó".
create or replace function public.handle_new_group()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.group_members (group_id, user_id, role)
  values (new.id, new.owner_id, 'owner')
  on conflict do nothing;

  return new;
end;
$$;

drop trigger if exists on_study_group_created on public.study_groups;
create trigger on_study_group_created
  after insert on public.study_groups
  for each row execute function public.handle_new_group();


-- Hàm phụ trợ cho RLS: người dùng hiện tại có ở trong nhóm này không?
-- Đặt trong SECURITY DEFINER để policy của group_members không tự tham chiếu
-- chính nó (Postgres sẽ báo đệ quy vô hạn nếu policy tự SELECT lại bảng đó).
create or replace function public.is_group_member(target_group uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.group_members
    where group_id = target_group
      and user_id  = auth.uid()
  );
$$;


-- ---------------------------------------------------------------------------
-- 4. TIMER_SESSIONS — phiên Pomodoro, đơn vị quan sát cơ bản của cả nền tảng
--
-- started_at là timestamptz và luôn được ghi kèm timezone của thiết bị, vì
-- phân tích cosinor cần biết phiên diễn ra lúc mấy giờ SÁNG THEO GIỜ CỦA HỌC
-- SINH, không phải theo UTC.
-- ---------------------------------------------------------------------------
create table if not exists public.timer_sessions (
  id               uuid        primary key default gen_random_uuid(),
  user_id          uuid        not null references auth.users (id) on delete cascade,
  subject          text        not null,
  duration_minutes integer     not null,
  started_at       timestamptz not null default now(),
  ended_at         timestamptz,
  completed        boolean     not null default true,
  timezone         text,
  created_at       timestamptz not null default now(),

  constraint timer_sessions_duration_check check (duration_minutes between 1 and 600)
);

create index if not exists timer_sessions_user_time_idx
  on public.timer_sessions (user_id, started_at desc);


-- ---------------------------------------------------------------------------
-- 5. NOTES — ghi chú số hóa
--
-- file_url giữ đường dẫn công khai tới Supabase Storage; storage_path giữ
-- khóa nội bộ để còn xóa được tệp khi hàng bị xóa.
-- ---------------------------------------------------------------------------
create table if not exists public.notes (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references auth.users (id) on delete cascade,
  group_id     uuid        references public.study_groups (id) on delete set null,
  title        text        not null,
  subject      text        not null,
  file_url     text,
  storage_path text,
  file_name    text,
  file_type    text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  constraint notes_title_length check (char_length(title) between 1 and 200)
);

create index if not exists notes_user_idx  on public.notes (user_id, created_at desc);
create index if not exists notes_group_idx on public.notes (group_id);

drop trigger if exists notes_touch_updated_at on public.notes;
create trigger notes_touch_updated_at
  before update on public.notes
  for each row execute function public.touch_updated_at();


-- ---------------------------------------------------------------------------
-- 6. CARDS + CARD_REVIEWS — thẻ ghi nhớ và lịch SM-2
--
-- Trạng thái lịch (ease_factor, interval_days, due_at) BẮT BUỘC phải lưu:
-- khác với huy hiệu, nó không tính lại được, vì nó phụ thuộc vào những điểm
-- số học sinh đã chấm tại các thời điểm đã trôi qua.
--
-- card_reviews lưu từng lần chấm. Bảng này là thứ biến ứng dụng thành một
-- công cụ thu thập dữ liệu: nó cho phép dựng lại toàn bộ quỹ đạo học của một
-- thẻ, và là dữ liệu thô để kiểm chứng lại chính thuật toán SM-2.
--
-- Lưu ý: "interval" là từ khóa của PostgreSQL nên cột được đặt tên
-- interval_days.
-- ---------------------------------------------------------------------------
create table if not exists public.cards (
  id               uuid        primary key default gen_random_uuid(),
  user_id          uuid        not null references auth.users (id) on delete cascade,
  note_id          uuid        references public.notes (id) on delete set null,
  front            text        not null,
  back             text        not null,
  subject          text        not null default 'Khác',

  ease_factor      real        not null default 2.5,
  interval_days    integer     not null default 0,
  repetitions      integer     not null default 0,
  lapses           integer     not null default 0,
  review_count     integer     not null default 0,
  last_reviewed_at timestamptz,
  due_at           timestamptz not null default now(),

  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  constraint cards_front_not_blank  check (char_length(btrim(front)) > 0),
  constraint cards_back_not_blank   check (char_length(btrim(back))  > 0),
  constraint cards_ease_factor_check check (ease_factor >= 1.3)
);

create index if not exists cards_user_due_idx on public.cards (user_id, due_at);
create index if not exists cards_note_idx     on public.cards (note_id);

drop trigger if exists cards_touch_updated_at on public.cards;
create trigger cards_touch_updated_at
  before update on public.cards
  for each row execute function public.touch_updated_at();


create table if not exists public.card_reviews (
  id                uuid        primary key default gen_random_uuid(),
  card_id           uuid        not null references public.cards (id) on delete cascade,
  user_id           uuid        not null references auth.users (id) on delete cascade,
  quality           smallint    not null,
  previous_interval integer     not null default 0,
  new_interval      integer     not null default 0,
  previous_ease     real,
  new_ease          real,
  reviewed_at       timestamptz not null default now(),

  constraint card_reviews_quality_check check (quality between 0 and 5)
);

create index if not exists card_reviews_card_idx on public.card_reviews (card_id, reviewed_at desc);
create index if not exists card_reviews_user_idx on public.card_reviews (user_id, reviewed_at desc);


-- ---------------------------------------------------------------------------
-- 7. EXPERIMENTS + EXPERIMENT_TRIALS — thí nghiệm N-of-1
--
-- Tính toàn vẹn của thiết kế thí nghiệm được cưỡng chế ở tầng cơ sở dữ liệu,
-- không chỉ ở giao diện: khi đã có ít nhất một phiên được ghi, giả thuyết,
-- hai điều kiện và biến đo KHÔNG còn sửa được nữa (xem trigger bên dưới).
-- Đây là điều làm nên khác biệt giữa một thí nghiệm và một cuốn nhật ký.
--
-- pending_condition được bốc TRƯỚC khi phiên diễn ra và lưu xuống, nên học
-- sinh không thể chọn điều kiện sau khi đã biết kết quả.
-- ---------------------------------------------------------------------------
create table if not exists public.experiments (
  id                uuid        primary key default gen_random_uuid(),
  user_id           uuid        not null references auth.users (id) on delete cascade,
  title             text        not null,
  hypothesis        text        not null default '',
  condition_a       text        not null,
  condition_b       text        not null,
  metric            text        not null,
  target_per_arm    integer     not null default 8,
  status            text        not null default 'running',
  pending_condition text        not null,
  created_at        timestamptz not null default now(),
  completed_at      timestamptz,
  updated_at        timestamptz not null default now(),

  constraint experiments_status_check    check (status in ('running', 'completed')),
  constraint experiments_pending_check   check (pending_condition in ('A', 'B')),
  constraint experiments_target_check    check (target_per_arm between 2 and 100),
  constraint experiments_title_length    check (char_length(title) between 1 and 200)
);

create index if not exists experiments_user_idx on public.experiments (user_id, created_at desc);

drop trigger if exists experiments_touch_updated_at on public.experiments;
create trigger experiments_touch_updated_at
  before update on public.experiments
  for each row execute function public.touch_updated_at();


create table if not exists public.experiment_trials (
  id            uuid        primary key default gen_random_uuid(),
  experiment_id uuid        not null references public.experiments (id) on delete cascade,
  user_id       uuid        not null references auth.users (id) on delete cascade,
  condition     text        not null,
  value         double precision not null,
  note          text        not null default '',
  recorded_at   timestamptz not null default now(),

  constraint experiment_trials_condition_check check (condition in ('A', 'B'))
);

create index if not exists experiment_trials_experiment_idx
  on public.experiment_trials (experiment_id, recorded_at);


-- Khóa thiết kế thí nghiệm lại sau phiên đầu tiên.
create or replace function public.lock_experiment_design()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  trial_count integer;
begin
  select count(*) into trial_count
  from public.experiment_trials
  where experiment_id = old.id;

  if trial_count > 0 and (
       new.hypothesis  is distinct from old.hypothesis
    or new.condition_a is distinct from old.condition_a
    or new.condition_b is distinct from old.condition_b
    or new.metric      is distinct from old.metric
  ) then
    raise exception
      'Không thể sửa thiết kế thí nghiệm sau khi đã ghi phiên đầu tiên (đã có % phiên).',
      trial_count;
  end if;

  return new;
end;
$$;

drop trigger if exists experiments_lock_design on public.experiments;
create trigger experiments_lock_design
  before update on public.experiments
  for each row execute function public.lock_experiment_design();


-- ---------------------------------------------------------------------------
-- 8. ARTICLES + BOOKMARKS — Editor's Pick
--
-- Bảng khởi tạo RỖNG. Bài viết chỉ xuất hiện khi một tài khoản có role
-- 'admin' thật sự soạn và đăng nó.
-- ---------------------------------------------------------------------------
-- author_id trỏ tới public.profiles vì cùng lý do như study_groups.owner_id:
-- tên tác giả phải đọc được kèm bài viết trong một truy vấn.
create table if not exists public.articles (
  id           uuid        primary key default gen_random_uuid(),
  author_id    uuid        not null references public.profiles (id) on delete cascade,
  title        text        not null,
  category     text        not null default 'Mẹo học tập',
  content      text        not null default '',
  image_url    text,
  source_url   text,
  source_label text,
  published    boolean     not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  constraint articles_title_length check (char_length(title) between 1 and 240)
);

create index if not exists articles_published_idx on public.articles (published, created_at desc);

drop trigger if exists articles_touch_updated_at on public.articles;
create trigger articles_touch_updated_at
  before update on public.articles
  for each row execute function public.touch_updated_at();


create table if not exists public.bookmarks (
  user_id    uuid        not null references auth.users (id) on delete cascade,
  article_id uuid        not null references public.articles (id) on delete cascade,
  created_at timestamptz not null default now(),

  primary key (user_id, article_id)
);


-- Số lượt lưu là COUNT trên bookmarks, không phải một cột đếm rời có thể
-- lệch khỏi số lượt lưu thật.
--
-- Nó phải là một hàm SECURITY DEFINER chứ không thể là một view thường:
-- chính sách RLS của bảng bookmarks chỉ cho mỗi người thấy hàng của chính
-- mình, nên một phép đếm chạy dưới quyền người gọi sẽ luôn trả về 0 hoặc 1 —
-- tức là một con số sai, được trình bày như số liệu thật.
--
-- Hàm chỉ trả về (article_id, số lượt). Không cột nào trong kết quả cho biết
-- AI đã lưu bài nào, nên việc bỏ qua RLS ở đây không làm lộ danh tính.
drop view if exists public.article_bookmark_counts;

create or replace function public.article_bookmark_counts()
returns table (article_id uuid, bookmark_count integer)
language sql
security definer
stable
set search_path = public
as $$
  select b.article_id, count(*)::integer
  from public.bookmarks b
  group by b.article_id;
$$;

revoke all on function public.article_bookmark_counts() from public;
grant execute on function public.article_bookmark_counts() to authenticated;


-- ---------------------------------------------------------------------------
-- 9. PERFORMANCE_GOALS — mục tiêu tuần, một hàng cho mỗi người dùng
-- ---------------------------------------------------------------------------
create table if not exists public.performance_goals (
  user_id                   uuid        primary key references auth.users (id) on delete cascade,
  target_hours_per_week     integer     not null default 10,
  target_sessions_per_week  integer     not null default 10,
  updated_at                timestamptz not null default now(),

  constraint goals_hours_check    check (target_hours_per_week    between 1 and 168),
  constraint goals_sessions_check check (target_sessions_per_week between 1 and 200)
);

drop trigger if exists performance_goals_touch_updated_at on public.performance_goals;
create trigger performance_goals_touch_updated_at
  before update on public.performance_goals
  for each row execute function public.touch_updated_at();


-- ---------------------------------------------------------------------------
-- 10. BADGE_ACKNOWLEDGEMENTS
--
-- Việc MỞ KHÓA huy hiệu luôn được tính lại từ dữ liệu phiên học thật (xem
-- services/gamification.js) và không bao giờ được lưu. Bảng này chỉ ghi nhớ
-- huy hiệu nào đã được hiển thị rồi, để nhãn "MỚI" chỉ xuất hiện đúng một lần.
-- ---------------------------------------------------------------------------
create table if not exists public.badge_acknowledgements (
  user_id  uuid        not null references auth.users (id) on delete cascade,
  badge_id text        not null,
  seen_at  timestamptz not null default now(),

  primary key (user_id, badge_id)
);


-- ===========================================================================
-- ROW LEVEL SECURITY
--
-- Bật trên mọi bảng. Không có policy nào dùng `using (true)` cho thao tác
-- ghi; mọi INSERT/UPDATE/DELETE đều phải chứng minh quyền sở hữu qua
-- auth.uid().
-- ===========================================================================

alter table public.profiles              enable row level security;
alter table public.user_activity         enable row level security;
alter table public.auth_events           enable row level security;
alter table public.study_groups          enable row level security;
alter table public.group_members         enable row level security;
alter table public.timer_sessions        enable row level security;
alter table public.notes                 enable row level security;
alter table public.cards                 enable row level security;
alter table public.card_reviews          enable row level security;
alter table public.experiments           enable row level security;
alter table public.experiment_trials     enable row level security;
alter table public.articles              enable row level security;
alter table public.bookmarks             enable row level security;
alter table public.performance_goals     enable row level security;
alter table public.badge_acknowledgements enable row level security;


-- --- profiles --------------------------------------------------------------
-- Đọc được bởi mọi người dùng đã đăng nhập, vì tên người tạo nhóm và tác giả
-- bài viết cần hiển thị được. Bảng này chỉ chứa dữ liệu hiển thị — không có
-- email, không có dấu vết đăng nhập. Chỉ ghi được hồ sơ của chính mình.
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated using (true);

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles
  for insert to authenticated with check (id = auth.uid());

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());


-- --- user_activity ---------------------------------------------------------
-- Thói quen truy cập của một học sinh chỉ chính họ được đọc. Ghi thì đi qua
-- RPC record_auth_event, nên không cần policy INSERT/UPDATE cho client.
drop policy if exists user_activity_select_own on public.user_activity;
create policy user_activity_select_own on public.user_activity
  for select to authenticated using (user_id = auth.uid());


-- --- auth_events -----------------------------------------------------------
-- Chỉ đọc và thêm. Cố ý KHÔNG có policy UPDATE hay DELETE: nhật ký đăng nhập
-- là bất biến, kể cả với chính chủ tài khoản. Xóa tài khoản vẫn xóa sạch
-- được (qua ON DELETE CASCADE), nên quyền được lãng quên vẫn nguyên vẹn.
drop policy if exists auth_events_select_own on public.auth_events;
create policy auth_events_select_own on public.auth_events
  for select to authenticated using (user_id = auth.uid());

drop policy if exists auth_events_insert_own on public.auth_events;
create policy auth_events_insert_own on public.auth_events
  for insert to authenticated with check (user_id = auth.uid());


-- --- study_groups ----------------------------------------------------------
-- Nhóm công khai ai cũng thấy; nhóm riêng tư chỉ thành viên thấy.
drop policy if exists study_groups_select on public.study_groups;
create policy study_groups_select on public.study_groups
  for select to authenticated
  using (
    not is_private
    or owner_id = auth.uid()
    or public.is_group_member(id)
  );

drop policy if exists study_groups_insert_own on public.study_groups;
create policy study_groups_insert_own on public.study_groups
  for insert to authenticated with check (owner_id = auth.uid());

drop policy if exists study_groups_update_own on public.study_groups;
create policy study_groups_update_own on public.study_groups
  for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists study_groups_delete_own on public.study_groups;
create policy study_groups_delete_own on public.study_groups
  for delete to authenticated using (owner_id = auth.uid());


-- --- group_members ---------------------------------------------------------
drop policy if exists group_members_select on public.group_members;
create policy group_members_select on public.group_members
  for select to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.study_groups g
      where g.id = group_members.group_id
        and (not g.is_private or g.owner_id = auth.uid())
    )
  );

-- Tự tham gia nhóm — và chỉ nhóm công khai. Nhóm riêng tư phải do chủ nhóm
-- thêm vào, nên đây không phải cửa sau vào dữ liệu riêng tư.
drop policy if exists group_members_join on public.group_members;
create policy group_members_join on public.group_members
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.study_groups g
      where g.id = group_members.group_id
        and (not g.is_private or g.owner_id = auth.uid())
    )
  );

drop policy if exists group_members_leave on public.group_members;
create policy group_members_leave on public.group_members
  for delete to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.study_groups g
      where g.id = group_members.group_id and g.owner_id = auth.uid()
    )
  );


-- --- timer_sessions / notes / cards / experiments: hoàn toàn riêng tư -------
drop policy if exists timer_sessions_own on public.timer_sessions;
create policy timer_sessions_own on public.timer_sessions
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists notes_own on public.notes;
create policy notes_own on public.notes
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists cards_own on public.cards;
create policy cards_own on public.cards
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists card_reviews_own on public.card_reviews;
create policy card_reviews_own on public.card_reviews
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists experiments_own on public.experiments;
create policy experiments_own on public.experiments
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists experiment_trials_own on public.experiment_trials;
create policy experiment_trials_own on public.experiment_trials
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists performance_goals_own on public.performance_goals;
create policy performance_goals_own on public.performance_goals
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists badge_acks_own on public.badge_acknowledgements;
create policy badge_acks_own on public.badge_acknowledgements
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());


-- --- articles --------------------------------------------------------------
-- Bài đã xuất bản ai cũng đọc được; chỉ tài khoản role='admin' mới đăng được.
drop policy if exists articles_select on public.articles;
create policy articles_select on public.articles
  for select to authenticated
  using (published or author_id = auth.uid());

drop policy if exists articles_insert_admin on public.articles;
create policy articles_insert_admin on public.articles
  for insert to authenticated
  with check (
    author_id = auth.uid()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

drop policy if exists articles_update_own on public.articles;
create policy articles_update_own on public.articles
  for update to authenticated using (author_id = auth.uid()) with check (author_id = auth.uid());

drop policy if exists articles_delete_own on public.articles;
create policy articles_delete_own on public.articles
  for delete to authenticated using (author_id = auth.uid());


-- --- bookmarks -------------------------------------------------------------
drop policy if exists bookmarks_own on public.bookmarks;
create policy bookmarks_own on public.bookmarks
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());


-- ===========================================================================
-- STORAGE — bucket cho tệp ghi chú
--
-- Ảnh và PDF ghi chú không nằm trong bảng (Postgres không phải nơi để tệp).
-- Đường dẫn quy ước: <user_id>/<uuid>.<ext> — policy dựa vào thư mục đầu tiên
-- để xác định chủ sở hữu.
-- ===========================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'notes',
  'notes',
  true,
  10485760,  -- 10 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']
)
on conflict (id) do update
  set file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists notes_files_read on storage.objects;
create policy notes_files_read on storage.objects
  for select to public using (bucket_id = 'notes');

drop policy if exists notes_files_insert_own on storage.objects;
create policy notes_files_insert_own on storage.objects
  for insert to authenticated
  with check (bucket_id = 'notes' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists notes_files_update_own on storage.objects;
create policy notes_files_update_own on storage.objects
  for update to authenticated
  using (bucket_id = 'notes' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists notes_files_delete_own on storage.objects;
create policy notes_files_delete_own on storage.objects
  for delete to authenticated
  using (bucket_id = 'notes' and (storage.foldername(name))[1] = auth.uid()::text);


-- ===========================================================================
-- KẾT THÚC. Không có INSERT dữ liệu mẫu nào bên dưới dòng này — và cũng
-- không nên có. Mọi hàng trong cơ sở dữ liệu này phải đến từ một người dùng
-- thật thao tác trên giao diện.
-- ===========================================================================
