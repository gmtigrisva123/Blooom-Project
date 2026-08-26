/* ==========================================================================
   BLOOOM — TÀI KHOẢN NGƯỜI DÙNG

   Xác thực do Supabase Auth đảm nhiệm. Điều đó có nghĩa là:

     · Mật khẩu KHÔNG bao giờ đi qua mã nguồn này ở dạng có thể lưu lại. Nó
       được gửi qua TLS tới Supabase, băm bằng bcrypt phía máy chủ, và trình
       duyệt chỉ nhận về một JWT có hạn. Bản thân ứng dụng không có cách nào
       đọc được mật khẩu của bất kỳ ai, kể cả người phát triển.
     · Phiên đăng nhập tự gia hạn và tự khôi phục khi tải lại trang.
     · Mỗi lần ĐĂNG KÝ và mỗi lần ĐĂNG NHẬP đều được ghi lại thành một hàng
       trong bảng auth_events, đồng thời cập nhật sign_in_count và
       last_sign_in_at trên hồ sơ — trong cùng một giao dịch, qua RPC
       record_auth_event.

   Hàm kiểm tra định dạng (email, độ mạnh mật khẩu) vẫn chạy ở client, nhưng
   chỉ để phản hồi nhanh cho người nhập. Ràng buộc thật nằm ở phía máy chủ.
   ========================================================================== */

import { supabase, requireClient, deviceTimezone, toFriendlyError } from './supabase';

/* --------------------------------------------------------------------------
   KIỂM TRA ĐẦU VÀO — cùng một bộ quy tắc mà biểu mẫu hiển thị dưới dạng gợi
   ý, đặt ở một chỗ để gợi ý và kiểm tra không bao giờ lệch nhau.
   -------------------------------------------------------------------------- */

/* Supabase từ chối mật khẩu dưới 6 ký tự; Blooom đặt sàn cao hơn. */
export const PASSWORD_MIN_LENGTH = 8;

/* Độ dài mã truy cập vai trò Biên Tập Viên / Admin. Giao diện dùng số này để
   giới hạn ô nhập và bật/tắt nút gửi; hàm claim_admin_role trong
   supabase/migrations/0002_admin_access_code.sql kiểm tra lại đúng con số đó ở
   phía máy chủ. Đổi mã sang độ dài khác thì phải sửa cả hai chỗ. */
export const ADMIN_CODE_LENGTH = 6;

const normaliseEmail = (email) =>
  String(email || '')
    .trim()
    .toLowerCase();

export const validateEmail = (email) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(normaliseEmail(email));

export const passwordIssues = (password) => {
  const issues = [];
  const value = String(password || '');
  if (value.length < PASSWORD_MIN_LENGTH) issues.push(`Ít nhất ${PASSWORD_MIN_LENGTH} ký tự`);
  if (!/[a-zA-Z]/.test(value)) issues.push('Có ít nhất một chữ cái');
  if (!/\d/.test(value)) issues.push('Có ít nhất một chữ số');
  return issues;
};

/* Thước đo độ mạnh cho thanh hiển thị: độ dài vượt mức tối thiểu cộng với sự
   đa dạng của các lớp ký tự. Cố ý không trình bày như một lời hứa bảo mật. */
export const passwordStrength = (password) => {
  const value = String(password || '');
  if (!value) return { score: 0, label: 'Chưa nhập', percent: 0 };

  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^a-zA-Z0-9]/].filter((re) =>
    re.test(value)
  ).length;
  const lengthScore = Math.min(3, Math.floor(value.length / 5));
  const score = Math.min(4, Math.max(1, Math.round((classes + lengthScore) / 1.6)));

  const labels = ['Chưa nhập', 'Yếu', 'Trung bình', 'Khá', 'Mạnh'];
  return { score, label: labels[score], percent: (score / 4) * 100 };
};

/* --------------------------------------------------------------------------
   ÁNH XẠ HỒ SƠ
   Hàng `profiles` trong cơ sở dữ liệu dùng snake_case; phần còn lại của ứng
   dụng dùng camelCase. Việc đổi tên xảy ra đúng ở đây.

   Email KHÔNG nằm trong bảng profiles — bảng đó là danh bạ hiển thị mà mọi
   người dùng đã đăng nhập đều đọc được. Email lấy từ phiên đăng nhập, tức là
   từ auth.users, nơi chỉ chính chủ đọc được.
   -------------------------------------------------------------------------- */
const toAccount = (profile, authUser, activity = null) => {
  if (!profile && !authUser) return null;

  return {
    id: profile?.id || authUser.id,
    name: profile?.full_name || authUser?.user_metadata?.full_name || '',
    email: authUser?.email || null,
    avatar: profile?.avatar_url || null,
    gradeLevel: profile?.grade_level || null,
    role: profile?.role || 'student',
    signInCount: activity?.sign_in_count ?? 0,
    lastSignInAt: activity?.last_sign_in_at || null,
    createdAt: profile?.created_at || authUser?.created_at || null,
    /* Tài khoản khách do Supabase tạo qua signInAnonymously — không có email
       và có thể nâng cấp thành tài khoản đầy đủ sau. */
    isAnonymous: Boolean(authUser?.is_anonymous)
  };
};

const fetchProfile = async (userId) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw toFriendlyError(error, 'Không tải được hồ sơ người dùng.');
  return data;
};

/* Bộ đếm đăng nhập nằm ở bảng riêng vì nó riêng tư. Đọc hỏng thì trả null:
   một con số thống kê không hiện được không phải lý do để chặn đăng nhập. */
const fetchActivity = async (userId) => {
  const { data } = await supabase
    .from('user_activity')
    .select('sign_in_count, last_sign_in_at')
    .eq('user_id', userId)
    .maybeSingle();

  return data || null;
};

/* Hàng profiles được tạo bởi trigger on_auth_user_created ngay khi Supabase
   Auth tạo user. Trigger chạy trong cùng giao dịch nên hầu như luôn sẵn sàng;
   hàm này chỉ là lưới an toàn cho trường hợp trigger chưa được cài (dự án
   chưa chạy migration) — khi đó nó tự dựng hồ sơ tối thiểu thay vì để người
   dùng mắc kẹt ở màn hình trắng. */
const ensureProfile = async (authUser) => {
  const existing = await fetchProfile(authUser.id);
  if (existing) return existing;

  const { data, error } = await supabase
    .from('profiles')
    .insert({
      id: authUser.id,
      full_name: authUser.user_metadata?.full_name || '',
      grade_level: authUser.user_metadata?.grade_level || null
    })
    .select()
    .single();

  if (error) throw toFriendlyError(error, 'Không tạo được hồ sơ người dùng.');
  return data;
};

/* Đọc hồ sơ + hoạt động rồi gộp thành đối tượng tài khoản mà giao diện dùng. */
const buildAccount = async (authUser) => {
  const [profile, activity] = await Promise.all([
    ensureProfile(authUser),
    fetchActivity(authUser.id)
  ]);
  return toAccount(profile, authUser, activity);
};

/* --------------------------------------------------------------------------
   NHẬT KÝ ĐĂNG NHẬP

   Đây là phần "lưu dữ liệu người dùng mỗi khi đăng nhập hoặc đăng ký".
   Cố ý không chặn luồng đăng nhập: nếu việc ghi nhật ký thất bại (mất mạng
   ngay sau khi xác thực xong chẳng hạn), người dùng vẫn vào được ứng dụng.
   Mất một dòng nhật ký thì chấp nhận được; chặn một học sinh ở ngoài cửa vì
   một dòng nhật ký thì không.
   -------------------------------------------------------------------------- */
const recordAuthEvent = async (eventType) => {
  try {
    const { error } = await supabase.rpc('record_auth_event', {
      p_event_type: eventType,
      p_timezone: deviceTimezone()
    });
    if (error) console.warn('[blooom] không ghi được nhật ký đăng nhập:', error.message);
  } catch (error) {
    console.warn('[blooom] không ghi được nhật ký đăng nhập:', error.message);
  }
};

/* --------------------------------------------------------------------------
   CỔNG MÃ TRUY CẬP ADMIN

   Việc so mã nằm TRỌN VẸN ở phía máy chủ (hàm claim_admin_role). Tệp này chỉ
   gửi chuỗi người dùng gõ đi và hiển thị câu trả lời — nó không biết mã đúng
   là gì, và điều đó là cố ý: mọi hằng số trong thư mục src/ đều được đóng gói
   vào tệp JavaScript mà bất kỳ ai mở trang cũng tải về được.
   -------------------------------------------------------------------------- */

/* Hai RPC này chỉ tồn tại sau khi migration 0002 được chạy. Nếu chưa, PostgREST
   trả về PGRST202 ("Could not find the function") — một thông báo tiếng Anh về
   bộ định tuyến API, vô nghĩa với người đang đứng trước ô nhập mã. */
const toAdminGateError = (error) => {
  const notInstalled =
    error?.code === 'PGRST202' || error?.message?.includes('Could not find the function');

  if (notInstalled) {
    return Object.assign(
      new Error(
        'Máy chủ chưa cài cổng mã truy cập. Hãy chạy supabase/migrations/0002_admin_access_code.sql trong SQL Editor.'
      ),
      { cause: error }
    );
  }

  return toFriendlyError(error, 'Không xác minh được mã truy cập.');
};

/* --------------------------------------------------------------------------
   API CÔNG KHAI
   -------------------------------------------------------------------------- */
export const authService = {
  /* Đăng ký. Supabase có thể được cấu hình bắt xác nhận email; khi đó
     `session` trả về null và người dùng phải mở hộp thư trước. Hàm này phân
     biệt hai trường hợp đó thay vì coi cả hai là thành công. */
  register: async ({ name, email, password, gradeLevel = null }) => {
    const client = requireClient();

    const cleanName = String(name || '').trim();
    const cleanEmail = normaliseEmail(email);

    if (cleanName.length < 2) throw new Error('Vui lòng nhập họ tên đầy đủ.');
    if (!validateEmail(cleanEmail)) throw new Error('Địa chỉ email không hợp lệ.');

    const issues = passwordIssues(password);
    if (issues.length > 0) {
      throw new Error(`Mật khẩu chưa đạt: ${issues.join(', ').toLowerCase()}.`);
    }

    const { data, error } = await client.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: {
          full_name: cleanName,
          grade_level: gradeLevel,
          timezone: deviceTimezone()
        }
      }
    });

    if (error) {
      if (error.message?.includes('already registered')) {
        throw new Error('Email này đã được đăng ký. Hãy đăng nhập thay vì tạo mới.');
      }
      throw toFriendlyError(error, 'Không tạo được tài khoản.');
    }

    /* Dự án Supabase có bật xác nhận email thì signUp trả về user nhưng KHÔNG
       trả về session: tài khoản đã được tạo, chỉ là chưa dùng được cho tới khi
       người dùng bấm liên kết trong thư.

       Trường hợp này trả về một trạng thái, KHÔNG ném lỗi. Bản trước ném lỗi,
       và hệ quả là một lần đăng ký thành công lại hiện ra trong khung đỏ có
       biểu tượng cảnh báo — đúng chỗ mà mọi thất bại khác hiện ra. Người dùng
       không có cách nào biết mình vừa thành công hay vừa hỏng việc. */
    if (!data.session) {
      return { status: 'confirmation_required', email: cleanEmail, account: null };
    }

    /* Ghi nhật ký TRƯỚC khi dựng đối tượng tài khoản, để sign_in_count hiển
       thị đúng ngay từ lần đầu thay vì lệch một đơn vị tới lần tải trang sau. */
    await recordAuthEvent('sign_up');
    return { status: 'active', email: cleanEmail, account: await buildAccount(data.user) };
  },

  /* Gửi lại thư xác nhận. Thư đầu tiên rơi vào hộp thư rác hay bị bỏ lỡ là
     chuyện thường; không có nút này thì người dùng mắc kẹt vĩnh viễn và cũng
     không đăng ký lại được, vì email đã tồn tại trong hệ thống. */
  resendConfirmation: async (email) => {
    const client = requireClient();
    const cleanEmail = normaliseEmail(email);

    const { error } = await client.auth.resend({ type: 'signup', email: cleanEmail });

    if (error) {
      /* Supabase giới hạn tần suất gửi thư. Thông báo mặc định là tiếng Anh và
         nói về "rate limit", nên dịch sang thứ người dùng làm được gì đó. */
      if (error.message?.toLowerCase().includes('rate limit') || error.status === 429) {
        throw new Error('Bạn vừa yêu cầu gửi thư. Hãy đợi khoảng một phút rồi thử lại.');
      }
      throw toFriendlyError(error, 'Không gửi lại được thư xác nhận.');
    }
  },

  login: async ({ email, password }) => {
    const client = requireClient();
    const cleanEmail = normaliseEmail(email);

    const { data, error } = await client.auth.signInWithPassword({
      email: cleanEmail,
      password
    });

    if (error) {
      /* Supabase trả cùng một thông báo cho "email không tồn tại" và "sai mật
         khẩu", nên không cần che thêm — chỉ dịch sang tiếng Việt. */
      if (error.message?.includes('Invalid login credentials')) {
        throw new Error('Email hoặc mật khẩu không đúng.');
      }
      if (error.message?.includes('Email not confirmed')) {
        throw new Error('Email chưa được xác nhận. Hãy kiểm tra hộp thư của bạn.');
      }
      throw toFriendlyError(error, 'Không đăng nhập được.');
    }

    await recordAuthEvent('sign_in');
    return buildAccount(data.user);
  },

  /* Chế độ khách. Không phải một đường dữ liệu riêng: Supabase tạo một tài
     khoản ẩn danh thật, nên dữ liệu vẫn nằm trong cùng cơ sở dữ liệu, vẫn
     chịu cùng Row Level Security, và sau này có thể gắn email vào để trở
     thành tài khoản đầy đủ mà không mất gì (xem upgradeGuest). */
  loginAsGuest: async () => {
    const client = requireClient();

    const { data, error } = await client.auth.signInAnonymously({
      options: { data: { full_name: 'Khách', timezone: deviceTimezone() } }
    });

    if (error) {
      if (error.message?.includes('Anonymous sign-ins are disabled')) {
        throw new Error(
          'Chế độ dùng thử chưa được bật. Trong Supabase: Authentication › Sign In / Providers › bật "Allow anonymous sign-ins".'
        );
      }
      throw toFriendlyError(error, 'Không vào được chế độ dùng thử.');
    }

    await recordAuthEvent('sign_up');
    return buildAccount(data.user);
  },

  /* Biến một phiên khách thành tài khoản thật, giữ nguyên toàn bộ dữ liệu đã
     ghi: user_id không đổi nên mọi hàng đang trỏ tới nó vẫn nguyên vẹn. */
  upgradeGuest: async ({ name, email, password }) => {
    const client = requireClient();

    const cleanName = String(name || '').trim();
    const cleanEmail = normaliseEmail(email);

    if (cleanName.length < 2) throw new Error('Vui lòng nhập họ tên đầy đủ.');
    if (!validateEmail(cleanEmail)) throw new Error('Địa chỉ email không hợp lệ.');

    const issues = passwordIssues(password);
    if (issues.length > 0) {
      throw new Error(`Mật khẩu chưa đạt: ${issues.join(', ').toLowerCase()}.`);
    }

    const { data, error } = await client.auth.updateUser({
      email: cleanEmail,
      password,
      data: { full_name: cleanName }
    });

    if (error) throw toFriendlyError(error, 'Không nâng cấp được tài khoản.');

    /* Email không được chép sang profiles — nó sống trong auth.users, nơi chỉ
       chính chủ đọc được. Ở đây chỉ cập nhật tên hiển thị. */
    await client.from('profiles').update({ full_name: cleanName }).eq('id', data.user.id);

    return buildAccount(data.user);
  },

  logout: async () => {
    if (!supabase) return;
    await recordAuthEvent('sign_out');
    await supabase.auth.signOut();
  },

  /* Tài khoản của phiên đang lưu, hoặc null. Bất đồng bộ vì Supabase phải
     đọc và có thể phải gia hạn token trước khi trả lời. */
  currentAccount: async () => {
    if (!supabase) return null;

    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session) return null;

    try {
      return await buildAccount(data.session.user);
    } catch {
      /* Có phiên nhưng không đọc được hồ sơ (mất mạng, chưa chạy migration).
         Trả về danh tính tối thiểu để ứng dụng còn hiển thị được lỗi tử tế
         thay vì đá người dùng về màn hình đăng nhập một cách khó hiểu. */
      return toAccount(null, data.session.user);
    }
  },

  /* Đăng xuất ở một tab phải làm các tab khác đăng xuất theo, và token hết
     hạn phải được phản ánh lên giao diện. Trả về hàm hủy đăng ký. */
  onAuthStateChange: (callback) => {
    if (!supabase) return () => {};

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        callback(null);
        return;
      }
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        buildAccount(session.user)
          .then(callback)
          .catch(() => callback(toAccount(null, session.user)));
      }
    });

    return () => subscription.unsubscribe();
  },

  updateProfile: async (patch) => {
    const client = requireClient();

    const { data: sessionData } = await client.auth.getSession();
    const userId = sessionData.session?.user?.id;
    if (!userId) throw new Error('Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.');

    /* Danh sách trắng: một lần sửa hồ sơ không được phép chạm tới bất cứ thứ
       gì liên quan tới xác thực. */
    const row = {};
    if (patch.name !== undefined) row.full_name = String(patch.name).trim();
    if (patch.avatar !== undefined) row.avatar_url = patch.avatar;
    if (patch.gradeLevel !== undefined) row.grade_level = patch.gradeLevel;
    /* `role` cố ý KHÔNG có trong danh sách này. Vai trò chỉ đổi được qua
       claimAdminRole / releaseAdminRole, và cột đó cũng đã bị trigger
       profiles_guard_role khóa ở phía cơ sở dữ liệu — thêm nó vào đây sẽ chỉ
       tạo ra một lệnh ghi luôn luôn bị máy chủ từ chối. */

    if (Object.keys(row).length === 0) return null;

    const { data, error } = await client
      .from('profiles')
      .update(row)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw toFriendlyError(error, 'Không cập nhật được hồ sơ.');

    const { data: userData } = await client.auth.getUser();
    return toAccount(data, userData.user, await fetchActivity(userId));
  },

  /* Nâng tài khoản hiện tại lên vai trò Biên Tập Viên / Admin bằng mã truy cập.
     Trả về { ok, reason, message, remaining, account }:

       ok = false KHÔNG phải là lỗi hệ thống — mã sai là một câu trả lời hợp lệ
       của máy chủ, nên nó đi về theo đường giá trị trả về chứ không ném ngoại
       lệ. Chỉ những thứ thật sự hỏng (mất mạng, chưa chạy migration) mới ném. */
  claimAdminRole: async (code) => {
    const client = requireClient();
    const cleanCode = String(code || '').trim();

    /* Chặn sẵn ở client cho nhanh, nhưng KHÔNG coi đây là kiểm tra: hàm phía
       máy chủ kiểm tra lại đúng điều kiện này, và đó mới là chỗ tính. */
    if (cleanCode.length !== ADMIN_CODE_LENGTH) {
      return {
        ok: false,
        reason: 'length',
        message: `Mã truy cập gồm đúng ${ADMIN_CODE_LENGTH} ký tự.`,
        account: null
      };
    }

    const { data, error } = await client.rpc('claim_admin_role', { p_code: cleanCode });
    if (error) throw toAdminGateError(error);

    if (!data?.ok) {
      return {
        ok: false,
        reason: data?.reason || 'wrong_code',
        message: data?.message || 'Mã truy cập không đúng.',
        remaining: data?.remaining,
        account: null
      };
    }

    /* Máy chủ trả về chính hàng profiles sau khi cập nhật, nên đối tượng tài
       khoản dựng ở đây là trạng thái đã lưu — không phải phỏng đoán lạc quan. */
    const { data: userData } = await client.auth.getUser();
    const account = toAccount(
      data.profile,
      userData.user,
      await fetchActivity(userData.user.id)
    );

    return { ok: true, reason: 'granted', message: null, account };
  },

  /* Quay lại vai trò Học Sinh. Không cần mã — xem ghi chú trong migration. */
  releaseAdminRole: async () => {
    const client = requireClient();

    const { data, error } = await client.rpc('release_admin_role');
    if (error) throw toAdminGateError(error);

    const { data: userData } = await client.auth.getUser();
    return toAccount(data.profile, userData.user, await fetchActivity(userData.user.id));
  },

  /* Lịch sử đăng nhập của chính người dùng — dùng cho trang tài khoản và cho
     việc kiểm chứng số liệu khi báo cáo. */
  listAuthEvents: async (limit = 50) => {
    const client = requireClient();

    const { data, error } = await client
      .from('auth_events')
      .select('id, event_type, occurred_at, timezone')
      .order('occurred_at', { ascending: false })
      .limit(limit);

    if (error) throw toFriendlyError(error, 'Không tải được lịch sử đăng nhập.');

    return (data || []).map((row) => ({
      id: row.id,
      type: row.event_type,
      at: row.occurred_at,
      timezone: row.timezone
    }));
  }
};
