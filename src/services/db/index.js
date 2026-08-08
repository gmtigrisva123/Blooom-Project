/* ==========================================================================
   BLOOOM — TẦNG TRUY CẬP DỮ LIỆU

   Mỗi nhóm hàm bên dưới bọc đúng một bảng trong PostgreSQL. Không component
   nào gọi thẳng `supabase.from(...)`; tất cả đi qua đây, nên khi lược đồ thay
   đổi thì chỉ tệp này phải sửa.

   Ba quy ước áp dụng cho toàn bộ tệp:

     1. Mọi hàm đều bất đồng bộ và ném lỗi đã được dịch sang tiếng Việt
        (xem services/supabase.js). Không hàm nào nuốt lỗi rồi trả về mảng
        rỗng — một lần ghi thất bại phải nhìn thấy được, chứ không được giả
        vờ là "chưa có dữ liệu".
     2. user_id không bao giờ do phía gọi truyền vào tùy ý; nó luôn lấy từ
        phiên đăng nhập hiện tại. Row Level Security phía máy chủ cũng cưỡng
        chế điều này lần nữa, nên kể cả khi mã client bị sửa thì cũng không
        ghi được sang tài khoản khác.
     3. Số liệu dẫn xuất (chuỗi ngày, XP, huy hiệu, đường cong quên) không
        nằm ở đây và không nằm trong cơ sở dữ liệu. Chúng luôn được tính lại
        từ dữ liệu thô.
   ========================================================================== */

import { requireClient, unwrap, deviceTimezone } from '../supabase';
import {
  groupFromRow,
  groupToRow,
  sessionFromRow,
  noteFromRow,
  cardFromRow,
  cardScheduleToRow,
  experimentFromRow,
  articleFromRow
} from './mappers';

/* Danh tính của phiên hiện tại. Mọi thao tác ghi đều bắt đầu bằng hàm này. */
const currentUserId = async () => {
  const client = requireClient();
  const { data } = await client.auth.getSession();
  const userId = data.session?.user?.id;
  if (!userId) throw new Error('Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.');
  return userId;
};

/* ==========================================================================
   NHÓM HỌC
   ========================================================================== */
export const groupsRepo = {
  list: async () => {
    const client = requireClient();
    const rows = await unwrap(
      client
        .from('study_groups')
        .select(
          '*, owner:profiles!study_groups_owner_id_fkey(full_name), group_members(user_id)'
        )
        .order('created_at', { ascending: false }),
      'Không tải được danh sách nhóm học.'
    );
    return (rows || []).map(groupFromRow);
  },

  /* Người tạo được thêm làm thành viên bởi trigger on_study_group_created,
     nên hàng vừa tạo phải được đọc lại thì memberCount mới đúng là 1. */
  create: async (groupData) => {
    const client = requireClient();
    const userId = await currentUserId();

    const inserted = await unwrap(
      client.from('study_groups').insert(groupToRow(groupData, userId)).select('id').single(),
      'Không tạo được nhóm học.'
    );

    const row = await unwrap(
      client
        .from('study_groups')
        .select(
          '*, owner:profiles!study_groups_owner_id_fkey(full_name), group_members(user_id)'
        )
        .eq('id', inserted.id)
        .single(),
      'Không đọc lại được nhóm vừa tạo.'
    );

    return groupFromRow(row);
  },

  join: async (groupId) => {
    const client = requireClient();
    const userId = await currentUserId();
    await unwrap(
      client.from('group_members').insert({ group_id: groupId, user_id: userId }),
      'Không tham gia được nhóm này.'
    );
  },

  leave: async (groupId) => {
    const client = requireClient();
    const userId = await currentUserId();
    await unwrap(
      client.from('group_members').delete().eq('group_id', groupId).eq('user_id', userId),
      'Không rời được nhóm này.'
    );
  },

  remove: async (groupId) => {
    const client = requireClient();
    await unwrap(
      client.from('study_groups').delete().eq('id', groupId),
      'Không xóa được nhóm học.'
    );
  }
};

/* ==========================================================================
   PHIÊN HỌC POMODORO

   Đây là đơn vị quan sát cơ bản của cả nền tảng: mọi biểu đồ, mọi huy hiệu
   và cả mô hình cosinor đều đọc từ bảng này.
   ========================================================================== */
export const sessionsRepo = {
  list: async (limit = 1000) => {
    const client = requireClient();
    const rows = await unwrap(
      client
        .from('timer_sessions')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(limit),
      'Không tải được lịch sử phiên học.'
    );
    return (rows || []).map(sessionFromRow);
  },

  create: async ({ subject, durationMinutes, startedAt = null }) => {
    const client = requireClient();
    const userId = await currentUserId();

    /* startedAt là thời điểm phiên BẮT ĐẦU, không phải lúc lưu. Ghi đúng thời
       điểm bắt đầu là điều kiện để phân tích nhịp sinh học có nghĩa: một
       phiên 90 phút bắt đầu lúc 22 giờ không phải là một quan sát lúc 23g30. */
    const start = startedAt
      ? new Date(startedAt)
      : new Date(Date.now() - durationMinutes * 60000);

    const row = await unwrap(
      client
        .from('timer_sessions')
        .insert({
          user_id: userId,
          subject,
          duration_minutes: durationMinutes,
          started_at: start.toISOString(),
          ended_at: new Date().toISOString(),
          completed: true,
          timezone: deviceTimezone()
        })
        .select()
        .single(),
      'Không lưu được phiên học.'
    );

    return sessionFromRow(row);
  }
};

/* ==========================================================================
   GHI CHÚ

   Tệp đi vào Supabase Storage (bucket `notes`), chỉ đường dẫn nằm trong
   bảng. Nhét ảnh dạng data-URL vào cột text sẽ làm hỏng cả hai thứ: hàng
   nặng vài megabyte và Postgres không phải hệ thống tệp.
   ========================================================================== */
const NOTES_BUCKET = 'notes';

export const notesRepo = {
  list: async () => {
    const client = requireClient();
    const rows = await unwrap(
      client.from('notes').select('*').order('created_at', { ascending: false }),
      'Không tải được kho ghi chú.'
    );
    return (rows || []).map(noteFromRow);
  },

  /* Tải tệp lên trước, chèn hàng sau. Nếu chèn hàng thất bại thì tệp được
     dọn đi ngay, để Storage không tích lại những tệp không hàng nào trỏ tới. */
  create: async ({ title, subject, groupId = null, file }) => {
    const client = requireClient();
    const userId = await currentUserId();

    let fileUrl = null;
    let storagePath = null;

    if (file) {
      const extension = file.name.includes('.')
        ? file.name.split('.').pop().toLowerCase()
        : 'bin';
      storagePath = `${userId}/${crypto.randomUUID()}.${extension}`;

      const { error: uploadError } = await client.storage
        .from(NOTES_BUCKET)
        .upload(storagePath, file, { contentType: file.type, upsert: false });

      if (uploadError) {
        throw new Error(`Không tải được tệp lên: ${uploadError.message}`);
      }

      fileUrl = client.storage.from(NOTES_BUCKET).getPublicUrl(storagePath).data.publicUrl;
    }

    try {
      const row = await unwrap(
        client
          .from('notes')
          .insert({
            user_id: userId,
            group_id: groupId || null,
            title: String(title).trim(),
            subject,
            file_url: fileUrl,
            storage_path: storagePath,
            file_name: file?.name || null,
            file_type: file?.type || null
          })
          .select()
          .single(),
        'Không lưu được ghi chú.'
      );

      return noteFromRow(row);
    } catch (error) {
      if (storagePath) {
        await client.storage.from(NOTES_BUCKET).remove([storagePath]);
      }
      throw error;
    }
  },

  /* Xóa hàng trước, xóa tệp sau. Ngược lại sẽ để lại hàng trỏ tới tệp không
     còn tồn tại — hỏng nhìn thấy được, trong khi một tệp mồ côi thì không. */
  remove: async (id) => {
    const client = requireClient();

    const existing = await unwrap(
      client.from('notes').select('storage_path').eq('id', id).maybeSingle(),
      'Không đọc được ghi chú cần xóa.'
    );

    await unwrap(client.from('notes').delete().eq('id', id), 'Không xóa được ghi chú.');

    if (existing?.storage_path) {
      await client.storage.from(NOTES_BUCKET).remove([existing.storage_path]);
    }
  }
};

/* ==========================================================================
   THẺ GHI NHỚ & LỊCH SM-2

   Hai bảng, hai vai trò khác nhau:
     · `cards` giữ TRẠNG THÁI hiện tại của lịch ôn (hệ số dễ, khoảng cách,
       ngày đến hạn). Bắt buộc phải lưu vì không tính lại được.
     · `card_reviews` giữ TỪNG LẦN chấm điểm. Đây là dữ liệu thô cho phép
       dựng lại toàn bộ quỹ đạo học của một thẻ — và là thứ khiến ứng dụng
       này trở thành một công cụ thu thập dữ liệu chứ không chỉ là một tiện ích.
   ========================================================================== */
export const cardsRepo = {
  list: async () => {
    const client = requireClient();
    const rows = await unwrap(
      client.from('cards').select('*').order('due_at', { ascending: true }),
      'Không tải được bộ thẻ ghi nhớ.'
    );
    return (rows || []).map(cardFromRow);
  },

  create: async (card) => {
    const client = requireClient();
    const userId = await currentUserId();

    const row = await unwrap(
      client
        .from('cards')
        .insert({
          user_id: userId,
          note_id: card.noteId || null,
          front: card.front,
          back: card.back,
          subject: card.subject,
          ease_factor: card.easeFactor,
          interval_days: card.interval,
          repetitions: card.repetitions,
          lapses: card.lapses,
          review_count: card.reviewCount,
          last_reviewed_at: card.lastReviewedAt,
          due_at: card.dueAt
        })
        .select()
        .single(),
      'Không thêm được thẻ ghi nhớ.'
    );

    return cardFromRow(row);
  },

  /* Ghi lịch mới VÀ ghi lại chính lần chấm đó. Lần chấm được ghi trước: nếu
     chỉ một trong hai thành công, thà có một quan sát chưa kịp phản ánh vào
     lịch còn hơn một lịch đã đổi mà không giải thích được vì sao. */
  applyReview: async ({ before, after, quality }) => {
    const client = requireClient();
    const userId = await currentUserId();

    await unwrap(
      client.from('card_reviews').insert({
        card_id: before.id,
        user_id: userId,
        quality,
        previous_interval: before.interval,
        new_interval: after.interval,
        previous_ease: before.easeFactor,
        new_ease: after.easeFactor,
        reviewed_at: after.lastReviewedAt
      }),
      'Không ghi được lần ôn tập.'
    );

    const row = await unwrap(
      client
        .from('cards')
        .update(cardScheduleToRow(after))
        .eq('id', after.id)
        .select()
        .single(),
      'Không cập nhật được lịch ôn tập.'
    );

    return cardFromRow(row);
  },

  remove: async (id) => {
    const client = requireClient();
    await unwrap(client.from('cards').delete().eq('id', id), 'Không xóa được thẻ ghi nhớ.');
  },

  /* Toàn bộ lịch sử chấm điểm — dùng khi xuất dữ liệu để phân tích ngoài. */
  listReviews: async () => {
    const client = requireClient();
    const rows = await unwrap(
      client.from('card_reviews').select('*').order('reviewed_at', { ascending: true }),
      'Không tải được lịch sử ôn tập.'
    );
    return rows || [];
  }
};

/* ==========================================================================
   THÍ NGHIỆM N-of-1

   Điều kiện của phiên KẾ TIẾP (`pending_condition`) được bốc ngẫu nhiên và
   lưu xuống TRƯỚC khi phiên diễn ra. Đó là chi tiết biến việc này thành một
   thí nghiệm có phân bổ ngẫu nhiên thật, chứ không phải một cuốn nhật ký
   được chọn lọc sau khi đã biết kết quả.
   ========================================================================== */
const EXPERIMENT_SELECT = '*, experiment_trials(*)';

export const experimentsRepo = {
  list: async () => {
    const client = requireClient();
    const rows = await unwrap(
      client
        .from('experiments')
        .select(EXPERIMENT_SELECT)
        .order('created_at', { ascending: false }),
      'Không tải được danh sách thí nghiệm.'
    );
    return (rows || []).map(experimentFromRow);
  },

  create: async (experiment) => {
    const client = requireClient();
    const userId = await currentUserId();

    const row = await unwrap(
      client
        .from('experiments')
        .insert({
          user_id: userId,
          title: experiment.title,
          hypothesis: experiment.hypothesis,
          condition_a: experiment.conditionA,
          condition_b: experiment.conditionB,
          metric: experiment.metric,
          target_per_arm: experiment.targetPerArm,
          status: experiment.status,
          pending_condition: experiment.pendingCondition
        })
        .select(EXPERIMENT_SELECT)
        .single(),
      'Không khởi tạo được thí nghiệm.'
    );

    return experimentFromRow(row);
  },

  /* Ghi một phiên và bốc điều kiện cho phiên sau. Phân bổ mới do
     services/experiments.js tính (khối hoán vị cỡ 2) và được truyền vào đây
     đã tính sẵn, để logic ngẫu nhiên hóa chỉ tồn tại ở đúng một nơi. */
  recordTrial: async ({ experimentId, condition, value, note, nextCondition }) => {
    const client = requireClient();
    const userId = await currentUserId();

    await unwrap(
      client.from('experiment_trials').insert({
        experiment_id: experimentId,
        user_id: userId,
        condition,
        value,
        note: String(note || '').trim()
      }),
      'Không ghi được phiên thí nghiệm.'
    );

    const row = await unwrap(
      client
        .from('experiments')
        .update({ pending_condition: nextCondition })
        .eq('id', experimentId)
        .select(EXPERIMENT_SELECT)
        .single(),
      'Không cập nhật được thí nghiệm.'
    );

    return experimentFromRow(row);
  },

  setStatus: async (experimentId, status) => {
    const client = requireClient();
    const row = await unwrap(
      client
        .from('experiments')
        .update({
          status,
          completed_at: status === 'completed' ? new Date().toISOString() : null
        })
        .eq('id', experimentId)
        .select(EXPERIMENT_SELECT)
        .single(),
      'Không thay đổi được trạng thái thí nghiệm.'
    );
    return experimentFromRow(row);
  },

  remove: async (id) => {
    const client = requireClient();
    await unwrap(
      client.from('experiments').delete().eq('id', id),
      'Không xóa được thí nghiệm.'
    );
  }
};

/* ==========================================================================
   BÀI VIẾT & ĐÁNH DẤU

   Số lượt lưu lấy từ view article_bookmark_counts (một phép COUNT), không
   phải một cột đếm rời — nên nó không thể lệch khỏi số lượt lưu thật.
   ========================================================================== */
export const articlesRepo = {
  list: async () => {
    const client = requireClient();

    const [rows, counts] = await Promise.all([
      unwrap(
        client
          .from('articles')
          .select('*, author:profiles!articles_author_id_fkey(full_name)')
          .eq('published', true)
          .order('created_at', { ascending: false }),
        'Không tải được danh sách bài viết.'
      ),
      /* RPC chứ không phải một truy vấn bảng: chính sách RLS của `bookmarks`
         chỉ cho mỗi người thấy hàng của chính mình, nên đếm ở phía client sẽ
         luôn ra 0 hoặc 1. Hàm chạy SECURITY DEFINER và chỉ trả về số lượng,
         không trả về ai đã lưu bài nào. */
      unwrap(client.rpc('article_bookmark_counts'), 'Không tải được số lượt lưu bài viết.')
    ]);

    const countById = new Map((counts || []).map((c) => [c.article_id, c.bookmark_count]));

    return (rows || []).map((row) =>
      articleFromRow({ ...row, bookmark_count: countById.get(row.id) ?? 0 })
    );
  },

  create: async ({ title, category, content, imageUrl, sourceUrl, sourceLabel }) => {
    const client = requireClient();
    const userId = await currentUserId();

    const row = await unwrap(
      client
        .from('articles')
        .insert({
          author_id: userId,
          title: String(title).trim(),
          category,
          content: String(content || '').trim(),
          image_url: imageUrl || null,
          source_url: sourceUrl || null,
          source_label: sourceLabel || null
        })
        .select('*, author:profiles!articles_author_id_fkey(full_name)')
        .single(),
      'Không đăng được bài viết. Chỉ tài khoản biên tập viên mới có quyền này.'
    );

    return articleFromRow(row);
  },

  remove: async (id) => {
    const client = requireClient();
    await unwrap(client.from('articles').delete().eq('id', id), 'Không xóa được bài viết.');
  }
};

export const bookmarksRepo = {
  list: async () => {
    const client = requireClient();
    const rows = await unwrap(
      client.from('bookmarks').select('article_id'),
      'Không tải được danh sách bài viết đã lưu.'
    );
    return (rows || []).map((r) => r.article_id);
  },

  add: async (articleId) => {
    const client = requireClient();
    const userId = await currentUserId();
    await unwrap(
      client.from('bookmarks').insert({ user_id: userId, article_id: articleId }),
      'Không lưu được bài viết.'
    );
  },

  remove: async (articleId) => {
    const client = requireClient();
    const userId = await currentUserId();
    await unwrap(
      client.from('bookmarks').delete().eq('user_id', userId).eq('article_id', articleId),
      'Không bỏ lưu được bài viết.'
    );
  }
};

/* ==========================================================================
   MỤC TIÊU TUẦN

   Một hàng cho mỗi người dùng. Hàng chỉ được tạo khi học sinh thực sự đặt
   mục tiêu; trước đó `get` trả về null và giao diện hiển thị đúng như vậy —
   "chưa đặt mục tiêu" — thay vì bịa ra một con số mặc định rồi trình bày nó
   như thể học sinh đã chọn.
   ========================================================================== */
export const goalsRepo = {
  get: async () => {
    const client = requireClient();
    const row = await unwrap(
      client.from('performance_goals').select('*').maybeSingle(),
      'Không tải được mục tiêu học tập.'
    );

    if (!row) return null;

    return {
      targetHoursPerWeek: row.target_hours_per_week,
      targetSessionsPerWeek: row.target_sessions_per_week,
      updatedAt: row.updated_at
    };
  },

  save: async ({ targetHoursPerWeek, targetSessionsPerWeek }) => {
    const client = requireClient();
    const userId = await currentUserId();

    const row = await unwrap(
      client
        .from('performance_goals')
        .upsert(
          {
            user_id: userId,
            target_hours_per_week: targetHoursPerWeek,
            target_sessions_per_week: targetSessionsPerWeek
          },
          { onConflict: 'user_id' }
        )
        .select()
        .single(),
      'Không lưu được mục tiêu học tập.'
    );

    return {
      targetHoursPerWeek: row.target_hours_per_week,
      targetSessionsPerWeek: row.target_sessions_per_week,
      updatedAt: row.updated_at
    };
  }
};

/* ==========================================================================
   HUY HIỆU ĐÃ XEM

   Việc MỞ KHÓA huy hiệu luôn được tính lại từ dữ liệu phiên học thật (xem
   services/gamification.js). Bảng này chỉ ghi nhớ huy hiệu nào đã được hiện
   ra rồi, để nhãn "MỚI" chỉ xuất hiện đúng một lần.
   ========================================================================== */
export const badgesRepo = {
  listSeen: async () => {
    const client = requireClient();
    const rows = await unwrap(
      client.from('badge_acknowledgements').select('badge_id'),
      'Không tải được danh sách huy hiệu.'
    );
    return (rows || []).map((r) => r.badge_id);
  },

  markSeen: async (badgeIds) => {
    if (!badgeIds || badgeIds.length === 0) return;

    const client = requireClient();
    const userId = await currentUserId();

    await unwrap(
      client.from('badge_acknowledgements').upsert(
        badgeIds.map((badgeId) => ({ user_id: userId, badge_id: badgeId })),
        { onConflict: 'user_id,badge_id' }
      ),
      'Không lưu được trạng thái huy hiệu.'
    );
  }
};

/* ==========================================================================
   NẠP TOÀN BỘ KHÔNG GIAN LÀM VIỆC

   Một lần gọi khi ứng dụng khởi động, tám truy vấn chạy song song. Dùng
   allSettled chứ không phải all: một bảng lỗi (ví dụ chưa bật anonymous
   sign-in, hay chưa tạo bucket) không được phép làm trắng cả ứng dụng —
   phần còn lại vẫn hiện, và lỗi được trả về để giao diện nói rõ cái gì hỏng.
   ========================================================================== */
export const loadWorkspace = async () => {
  const tasks = {
    groups: groupsRepo.list(),
    sessions: sessionsRepo.list(),
    notes: notesRepo.list(),
    cards: cardsRepo.list(),
    experiments: experimentsRepo.list(),
    articles: articlesRepo.list(),
    bookmarks: bookmarksRepo.list(),
    goals: goalsRepo.get(),
    seenBadges: badgesRepo.listSeen()
  };

  const keys = Object.keys(tasks);
  const settled = await Promise.allSettled(Object.values(tasks));

  const data = {};
  const errors = [];

  settled.forEach((result, index) => {
    const key = keys[index];
    if (result.status === 'fulfilled') {
      data[key] = result.value;
    } else {
      /* Rỗng, không phải dữ liệu bịa: màn hình sẽ hiện trạng thái trống thật
         cùng với thông báo lỗi bên trên. */
      data[key] = key === 'goals' ? null : [];
      errors.push(result.reason?.message || `Không tải được ${key}.`);
    }
  });

  return { ...data, errors };
};

/* ==========================================================================
   XUẤT DỮ LIỆU

   Học sinh sở hữu dữ liệu của mình và phải lấy ra được ở dạng máy đọc được.
   Ngoài lý do đạo đức, đây còn là điều kiện để kết quả kiểm chứng lại được:
   một phân tích trong ứng dụng chỉ đáng tin nếu người khác chạy lại được
   trên chính dữ liệu thô đó bằng công cụ của họ.
   ========================================================================== */
export const exportAllData = async () => {
  const [workspace, reviews, authEvents] = await Promise.all([
    loadWorkspace(),
    cardsRepo.listReviews(),
    (async () => {
      const client = requireClient();
      const { data } = await client
        .from('auth_events')
        .select('event_type, occurred_at, timezone')
        .order('occurred_at', { ascending: true });
      return data || [];
    })()
  ]);

  const { errors, ...data } = workspace;

  return {
    exportedAt: new Date().toISOString(),
    schemaVersion: 1,
    application: 'Blooom',
    timezone: deviceTimezone(),
    ...data,
    cardReviews: reviews,
    authEvents,
    ...(errors.length > 0 ? { partialExportWarnings: errors } : null)
  };
};
