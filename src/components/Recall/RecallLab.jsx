import { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useNow } from '../../hooks/useNow';
import { Modal } from '../common/Modal';
import { Hero, EmptyState, StatCard, SubjectBadge } from '../common/ui';
import { MathInline } from '../common/Math';
import { NOTE_SUBJECTS, subjectColor } from '../../constants/subjects';
import {
  REVIEW_GRADES,
  TARGET_RETENTION,
  deckStats,
  dueForecast,
  dueQueue,
  retentionCurve,
  retentionOf,
  stabilityOf
} from '../../services/srs';
import {
  Layers,
  Plus,
  Eye,
  Trash2,
  CircleCheckBig,
  BrainCircuit,
  CalendarDays,
  TrendingUp,
  Info
} from 'lucide-react';

/* ==========================================================================
   FORGETTING CURVE — one card's R(t), drawn from the same function the
   scheduler uses. The marker shows where the card sits on the curve today.
   ========================================================================== */
const CurvePlot = ({ card, now }) => {
  const days = Math.max(6, Math.ceil(stabilityOf(card) * 2.2));
  const points = useMemo(() => retentionCurve(card, days), [card, days]);

  const W = 520;
  const H = 190;
  const PAD = { top: 12, right: 12, bottom: 24, left: 32 };

  const x = (day) => PAD.left + (day / days) * (W - PAD.left - PAD.right);
  const y = (r) => PAD.top + (1 - r) * (H - PAD.top - PAD.bottom);

  const path = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.day).toFixed(1)} ${y(p.retention).toFixed(1)}`)
    .join(' ');

  const area = `${path} L${x(days).toFixed(1)} ${y(0).toFixed(1)} L${x(0).toFixed(1)} ${y(0).toFixed(1)} Z`;

  const elapsed = card.lastReviewedAt
    ? Math.min(days, (now.getTime() - new Date(card.lastReviewedAt).getTime()) / 86400000)
    : 0;
  const nowRetention = card.lastReviewedAt ? retentionOf(card, now) : 1;

  return (
    <svg
      className="curve-svg"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={`Đường cong quên của thẻ này: hiện còn khoảng ${Math.round(nowRetention * 100)} phần trăm xác suất nhớ lại.`}
    >
      {[0, 0.5, 1].map((v) => (
        <g key={v}>
          <line x1={PAD.left} x2={W - PAD.right} y1={y(v)} y2={y(v)} className="plot-grid" />
          <text x={PAD.left - 6} y={y(v) + 3.5} className="plot-axis-label" textAnchor="end">
            {v * 100}
          </text>
        </g>
      ))}

      <line
        x1={PAD.left}
        x2={W - PAD.right}
        y1={y(TARGET_RETENTION)}
        y2={y(TARGET_RETENTION)}
        className="plot-target"
      />

      <path d={area} className="curve-area" />
      <path d={path} className="curve-line" />

      {card.lastReviewedAt && (
        <>
          <line x1={x(elapsed)} x2={x(elapsed)} y1={PAD.top} y2={y(0)} className="curve-now" />
          <circle cx={x(elapsed)} cy={y(nowRetention)} r="4.5" className="curve-dot" />
        </>
      )}

      <text x={W - PAD.right} y={H - 6} className="plot-axis-label" textAnchor="end">
        {days} ngày
      </text>
    </svg>
  );
};

/* ==========================================================================
   FORECAST — how many cards fall due on each of the next 14 days.
   ========================================================================== */
const ForecastBars = ({ forecast }) => {
  const peak = Math.max(1, ...forecast.map((d) => d.count));

  return (
    <div className="forecast">
      {forecast.map((day) => (
        <div
          className={`forecast-col ${day.isToday ? 'is-today' : ''}`}
          key={day.date.toISOString()}
          title={`${day.date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}: ${day.count} thẻ`}
        >
          <span className="forecast-count mono">{day.count > 0 ? day.count : ''}</span>
          <div className="forecast-bar-wrap">
            <div
              className={`forecast-bar ${day.count === 0 ? 'is-empty' : ''}`}
              style={{ height: day.count > 0 ? `${(day.count / peak) * 100}%` : '3px' }}
            />
          </div>
          <span className="forecast-day mono">{day.isToday ? 'nay' : day.date.getDate()}</span>
        </div>
      ))}
    </div>
  );
};

/* ==========================================================================
   RECALL LAB
   ========================================================================== */
export const RecallLab = () => {
  const { cards, handleAddCard, handleReviewCard, handleDeleteCard, showToast } = useApp();

  const [revealed, setRevealed] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [draft, setDraft] = useState({ front: '', back: '', subject: NOTE_SUBJECTS[0] });

  /* One clock for the whole page, so every retention figure on screen is read
     off the same instant. */
  const now = useNow();

  const stats = useMemo(() => deckStats(cards, now), [cards, now]);
  const queue = useMemo(() => dueQueue(cards, now), [cards, now]);
  const forecast = useMemo(() => dueForecast(cards, 14, now), [cards, now]);

  const current = queue[0] || null;

  /* Kết quả chỉ hiện sau khi máy chủ đã xác nhận lịch mới. Hiện trước rồi ghi
     sau sẽ có lúc báo "ôn lại sau 6 ngày" trong khi lần chấm đó chưa hề được
     lưu — và lần mở tiếp theo thẻ vẫn nằm nguyên trong hàng đợi. */
  const grade = async (quality) => {
    if (!current) return;

    const updated = await handleReviewCard(current, quality);
    if (!updated) return;

    setLastResult({
      front: current.front,
      interval: updated.interval,
      easeFactor: updated.easeFactor,
      lapsed: quality < 3
    });
    setRevealed(false);
  };

  const submitCard = async (event) => {
    event.preventDefault();
    if (!draft.front.trim() || !draft.back.trim()) {
      showToast('Cần nhập cả mặt hỏi và mặt trả lời.', 'error');
      return;
    }

    const created = await handleAddCard(draft);
    if (!created) return;

    setDraft({ front: '', back: '', subject: draft.subject });
    setIsAddOpen(false);
  };

  const retentionPct = stats.retention === null ? null : Math.round(stats.retention * 100);

  return (
    <div className="stack-5">
      <Hero
        eyebrow="Ôn tập ngắt quãng"
        icon={<Layers size={12} />}
        title="Ôn Đúng Lúc Sắp Quên, Không Sớm Hơn"
        description="Mỗi thẻ được lên lịch bằng thuật toán SM-2 và theo dõi bằng mô hình quên Ebbinghaus. Lịch ôn không cố định — nó đổi theo chính mức độ khó bạn tự chấm."
        action={
          <button className="btn btn-primary" onClick={() => setIsAddOpen(true)}>
            <Plus size={16} /> Thêm Thẻ
          </button>
        }
      />

      <div className="grid grid-4 stagger">
        <StatCard
          icon={<CircleCheckBig size={20} />}
          label="Đến hạn hôm nay"
          value={stats.due}
          unit="thẻ"
          note={`${stats.new} thẻ chưa từng ôn`}
          color="var(--d-1)"
        />
        <StatCard
          icon={<BrainCircuit size={20} />}
          label="Xác suất nhớ trung bình"
          value={retentionPct === null ? '—' : `${retentionPct}%`}
          note={
            retentionPct === null
              ? 'Chưa có thẻ nào được ôn'
              : `Trên ${stats.reviewed} thẻ đã ôn ít nhất 1 lần`
          }
          color="var(--d-2)"
        />
        <StatCard
          icon={<TrendingUp size={20} />}
          label="Khoảng ôn trung bình"
          value={stats.averageInterval.toFixed(1)}
          unit="ngày"
          note={`Hệ số dễ trung bình ${stats.averageEase.toFixed(2)}`}
          color="var(--d-3)"
        />
        <StatCard
          icon={<Layers size={20} />}
          label="Thẻ đã vững"
          value={`${stats.mature}/${stats.total}`}
          note={`Khoảng ôn ≥ 21 ngày • ${stats.lapses} lần quên`}
          color="var(--d-5)"
        />
      </div>

      <div className="split">
        {/* -------------------------------------------------------------- */}
        {/* Review session                                                  */}
        {/* -------------------------------------------------------------- */}
        <section className="panel panel-pad">
          <div className="section-head">
            <span className="section-head-icon">
              <BrainCircuit size={16} />
            </span>
            <div className="grow">
              <h3>Phiên Ôn Tập</h3>
              <span className="t-xs t-dim">
                {queue.length > 0
                  ? `Còn ${queue.length} thẻ đến hạn — thẻ yếu nhất lên trước`
                  : 'Hàng đợi trống'}
              </span>
            </div>
          </div>

          {!current ? (
            <EmptyState
              icon={<CircleCheckBig size={28} />}
              title="Bạn đã ôn hết thẻ đến hạn"
              description={
                stats.total === 0
                  ? 'Thêm thẻ đầu tiên để bắt đầu xây bộ ôn tập của bạn.'
                  : 'Quay lại khi thẻ tiếp theo đến hạn — ôn sớm hơn không giúp nhớ lâu hơn.'
              }
              action={
                stats.total === 0 ? (
                  <button className="btn btn-primary btn-sm" onClick={() => setIsAddOpen(true)}>
                    <Plus size={15} /> Thêm Thẻ
                  </button>
                ) : null
              }
            />
          ) : (
            <div className="review">
              <div className="review-meta">
                <SubjectBadge subject={current.subject} />
                <span className="t-xs t-dim mono">
                  EF {current.easeFactor.toFixed(2)} · lần ôn {current.reviewCount} ·{' '}
                  {current.lastReviewedAt
                    ? `nhớ ~${Math.round(retentionOf(current, now) * 100)}%`
                    : 'thẻ mới'}
                </span>
              </div>

              <div className="review-card">
                <span className="review-label mono">Mặt hỏi</span>
                <p className="review-front">{current.front}</p>

                {revealed ? (
                  <>
                    <span className="review-label mono">Mặt trả lời</span>
                    <p className="review-back">{current.back}</p>
                  </>
                ) : (
                  <button className="btn btn-secondary" onClick={() => setRevealed(true)}>
                    <Eye size={16} /> Hiện đáp án
                  </button>
                )}
              </div>

              {revealed && (
                <>
                  <p className="t-xs t-dim" style={{ margin: 0 }}>
                    Tự chấm trung thực — điểm bạn cho chính là dữ liệu đầu vào của thuật toán.
                  </p>
                  <div className="grade-row">
                    {REVIEW_GRADES.map((g) => (
                      <button
                        key={g.id}
                        className="grade-btn"
                        style={{ '--grade-color': g.color }}
                        onClick={() => grade(g.quality)}
                        title={g.hint}
                      >
                        <span className="grade-label">{g.label}</span>
                        <span className="grade-hint">{g.hint}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}

              {lastResult && (
                <div className="review-result" role="status">
                  <strong>{lastResult.lapsed ? 'Đặt lại lịch' : 'Đã giãn lịch'}</strong>
                  <span>
                    “{lastResult.front.slice(0, 42)}
                    {lastResult.front.length > 42 ? '…' : ''}” sẽ quay lại sau{' '}
                    <b className="mono">{lastResult.interval}</b> ngày (EF{' '}
                    <b className="mono">{lastResult.easeFactor.toFixed(2)}</b>).
                  </span>
                </div>
              )}
            </div>
          )}
        </section>

        {/* -------------------------------------------------------------- */}
        {/* Curve + forecast                                                */}
        {/* -------------------------------------------------------------- */}
        <div className="stack-5">
          <section className="panel panel-pad">
            <div className="section-head">
              <span className="section-head-icon">
                <TrendingUp size={16} />
              </span>
              <div className="grow">
                <h3>Đường Cong Quên</h3>
                <span className="t-xs t-dim">
                  {current ? 'Của thẻ đang ôn' : 'Chọn một thẻ đến hạn để xem'}
                </span>
              </div>
            </div>

            {current ? (
              <>
                <CurvePlot card={current} now={now} />
                <p className="t-xs t-dim" style={{ marginTop: 'var(--sp-3)' }}>
                  Đường gạch ngang là mốc {Math.round(TARGET_RETENTION * 100)}% — mức mà SM-2
                  nhắm tới khi hẹn ngày ôn kế tiếp. Vạch dọc là vị trí của hôm nay.
                </p>
              </>
            ) : (
              <p className="t-sm t-dim t-center" style={{ padding: '2.5rem 0' }}>
                Không có thẻ đến hạn nên chưa có đường cong nào để vẽ.
              </p>
            )}
          </section>

          <section className="panel panel-pad">
            <div className="section-head">
              <span className="section-head-icon">
                <CalendarDays size={16} />
              </span>
              <div className="grow">
                <h3>Khối Lượng Ôn 14 Ngày Tới</h3>
                <span className="t-xs t-dim">Số thẻ đến hạn mỗi ngày</span>
              </div>
            </div>
            <ForecastBars forecast={forecast} />
          </section>
        </div>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* Deck                                                              */}
      {/* ---------------------------------------------------------------- */}
      <section className="panel panel-pad">
        <div className="section-head">
          <span className="section-head-icon">
            <Layers size={16} />
          </span>
          <div className="grow">
            <h3>Bộ Thẻ Của Bạn</h3>
            <span className="t-xs t-dim">{cards.length} thẻ</span>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => setIsAddOpen(true)}>
            <Plus size={15} /> Thêm
          </button>
        </div>

        {cards.length === 0 ? (
          <EmptyState
            icon={<Layers size={28} />}
            title="Bộ thẻ đang trống"
            description="Viết câu hỏi ở mặt trước và đáp án ngắn gọn ở mặt sau — thẻ càng nhỏ, lịch ôn càng chính xác."
          />
        ) : (
          <div className="card-table">
            {cards.map((card) => (
              <div
                className="card-row"
                key={card.id}
                style={{ '--row-color': subjectColor(card.subject) }}
              >
                <div className="card-row-main">
                  <span className="card-row-front">{card.front}</span>
                  <span className="card-row-back">{card.back}</span>
                </div>
                <SubjectBadge subject={card.subject} />
                <span className="card-row-stat mono" title="Khoảng ôn hiện tại">
                  {card.interval}d
                </span>
                <span className="card-row-stat mono" title="Xác suất nhớ lại ước lượng">
                  {card.lastReviewedAt ? `${Math.round(retentionOf(card, now) * 100)}%` : '—'}
                </span>
                <button
                  className="icon-btn icon-btn-danger"
                  onClick={() => handleDeleteCard(card.id)}
                  aria-label={`Xóa thẻ ${card.front}`}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        )}

        <p className="method-note">
          <Info size={14} aria-hidden="true" />
          <span>
            Xác suất nhớ lại là ước lượng của mô hình <MathInline id="forgettingShort" />, trong
            đó S suy ra từ khoảng ôn hiện tại. Đây là dự đoán của mô hình, không phải kết quả đo
            trí nhớ thật của bạn.
          </span>
        </p>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Add card                                                          */}
      {/* ---------------------------------------------------------------- */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Thêm Thẻ Ghi Nhớ"
        icon={
          <span className="section-head-icon">
            <Plus size={16} />
          </span>
        }
      >
        <form onSubmit={submitCard}>
          <div className="modal-body">
            <div className="field">
              <label htmlFor="cardFront">Mặt hỏi</label>
              <textarea
                id="cardFront"
                value={draft.front}
                onChange={(e) => setDraft({ ...draft, front: e.target.value })}
                placeholder="Đạo hàm của hàm số y = ln(x) là gì?"
                required
              />
              <span className="field-hint">
                Một thẻ chỉ nên hỏi một ý. Câu hỏi càng hẹp, việc tự chấm càng đáng tin.
              </span>
            </div>

            <div className="field">
              <label htmlFor="cardBack">Mặt trả lời</label>
              <textarea
                id="cardBack"
                value={draft.back}
                onChange={(e) => setDraft({ ...draft, back: e.target.value })}
                placeholder="y′ = 1/x (với x > 0)"
                required
              />
            </div>

            <div className="field">
              <label htmlFor="cardSubject">Môn học</label>
              <select
                id="cardSubject"
                value={draft.subject}
                onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
              >
                {NOTE_SUBJECTS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsAddOpen(false)}
            >
              Hủy
            </button>
            <button type="submit" className="btn btn-primary">
              Thêm Thẻ
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
