/* ==========================================================================
   BLOOOM — ÁNH XẠ GIỮA CƠ SỞ DỮ LIỆU VÀ GIAO DIỆN

   PostgreSQL dùng snake_case, React dùng camelCase. Ranh giới giữa hai quy
   ước đó nằm trọn trong thư mục này: không một component nào được nhìn thấy
   `duration_minutes`, và không một câu lệnh SQL nào nhận `durationMinutes`.

   Mỗi cặp hàm đi liền nhau — `fromRow` và `toRow` — để khi thêm một cột mới
   thì cả hai chiều cùng được sửa ở một chỗ.
   ========================================================================== */

/* --------------------------------------------------------------------------
   NHÓM HỌC
   memberCount không phải một cột: nó là số hàng group_members đi kèm, nên
   không bao giờ lệch khỏi danh sách thành viên thật.
   -------------------------------------------------------------------------- */
export const groupFromRow = (row) => ({
  id: row.id,
  name: row.name,
  subject: row.subject,
  description: row.description || '',
  isPrivate: row.is_private,
  ownerId: row.owner_id,
  createdBy: row.owner?.full_name || '',
  members: (row.group_members || []).map((m) => m.user_id),
  memberCount: (row.group_members || []).length,
  createdAt: row.created_at
});

export const groupToRow = ({ name, subject, description, isPrivate }, ownerId) => ({
  owner_id: ownerId,
  name: String(name).trim(),
  subject,
  description: String(description || '').trim(),
  is_private: Boolean(isPrivate)
});

/* --------------------------------------------------------------------------
   PHIÊN HỌC
   -------------------------------------------------------------------------- */
export const sessionFromRow = (row) => ({
  id: row.id,
  userId: row.user_id,
  subject: row.subject,
  durationMinutes: row.duration_minutes,
  startedAt: row.started_at,
  endedAt: row.ended_at,
  completed: row.completed,
  timezone: row.timezone
});

/* --------------------------------------------------------------------------
   GHI CHÚ
   -------------------------------------------------------------------------- */
export const noteFromRow = (row) => ({
  id: row.id,
  userId: row.user_id,
  groupId: row.group_id,
  title: row.title,
  subject: row.subject,
  fileUrl: row.file_url,
  storagePath: row.storage_path,
  fileName: row.file_name,
  fileType: row.file_type,
  uploadedAt: row.created_at
});

/* --------------------------------------------------------------------------
   THẺ GHI NHỚ
   `interval` là từ khóa của PostgreSQL, nên cột tên là interval_days. Giao
   diện và thuật toán SM-2 vẫn gọi nó là `interval` như trong bài báo gốc.
   -------------------------------------------------------------------------- */
export const cardFromRow = (row) => ({
  id: row.id,
  userId: row.user_id,
  noteId: row.note_id,
  front: row.front,
  back: row.back,
  subject: row.subject,
  easeFactor: row.ease_factor,
  interval: row.interval_days,
  repetitions: row.repetitions,
  lapses: row.lapses,
  reviewCount: row.review_count,
  createdAt: row.created_at,
  lastReviewedAt: row.last_reviewed_at,
  dueAt: row.due_at
});

/* Chỉ những cột lịch trình — dùng cho UPDATE sau mỗi lần chấm điểm. */
export const cardScheduleToRow = (card) => ({
  ease_factor: card.easeFactor,
  interval_days: card.interval,
  repetitions: card.repetitions,
  lapses: card.lapses,
  review_count: card.reviewCount,
  last_reviewed_at: card.lastReviewedAt,
  due_at: card.dueAt
});

/* --------------------------------------------------------------------------
   THÍ NGHIỆM N-of-1
   `trials` là bảng con; nó được nạp kèm và sắp theo thời gian ghi, vì thứ tự
   phiên chính là thứ tự phân bổ ngẫu nhiên và không được phép xáo trộn.
   -------------------------------------------------------------------------- */
export const trialFromRow = (row) => ({
  id: row.id,
  condition: row.condition,
  value: row.value,
  note: row.note || '',
  at: row.recorded_at
});

export const experimentFromRow = (row) => ({
  id: row.id,
  userId: row.user_id,
  title: row.title,
  hypothesis: row.hypothesis || '',
  conditionA: row.condition_a,
  conditionB: row.condition_b,
  metric: row.metric,
  targetPerArm: row.target_per_arm,
  status: row.status,
  pendingCondition: row.pending_condition,
  createdAt: row.created_at,
  completedAt: row.completed_at,
  trials: (row.experiment_trials || [])
    .map(trialFromRow)
    .sort((a, b) => new Date(a.at) - new Date(b.at))
});

/* --------------------------------------------------------------------------
   BÀI VIẾT
   -------------------------------------------------------------------------- */
export const articleFromRow = (row) => ({
  id: row.id,
  authorId: row.author_id,
  title: row.title,
  category: row.category,
  content: row.content || '',
  imageUrl: row.image_url,
  sourceUrl: row.source_url,
  sourceLabel: row.source_label,
  createdBy: row.author?.full_name || '',
  createdAt: row.created_at,
  likesCount: row.bookmark_count ?? 0
});
