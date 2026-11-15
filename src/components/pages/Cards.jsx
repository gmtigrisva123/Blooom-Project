import { useEffect, useMemo, useState } from 'react';
import { Check, Plus, Trash2, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { clearIntent, peekIntent } from '../../lib/intent';
import { subjectLabel } from '../../lib/subjects';
import { dueLabel, intervalLabel, useNow } from '../../lib/time';
import {
  REVIEW_GRADES,
  applyReview,
  deckStats,
  dueForecast,
  dueQueue,
  isDue
} from '../../services/srs';
import {
  Bar,
  Empty,
  PageHead,
  SearchField,
  SubjectChips,
  SubjectSelect,
  SubjectTag
} from '../ui/bits';
import { Dialog } from '../ui/Dialog';
import { ConfirmDialog } from '../ui/ConfirmDialog';

/* ==========================================================================
   REVIEW — one card at a time, nothing else on screen.
   Space shows the answer; 1–4 grade it.
   ========================================================================== */
const Review = ({ onDone }) => {
  const { cards, reviewCard } = useApp();
  const now = useNow();

  /* The pile is fixed when the review starts. Grading a card changes its due
     date, and a pile that reshuffles under the student is disorienting. */
  const [pile] = useState(() => dueQueue(cards, new Date()).map((card) => card.id));
  const [position, setPosition] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [busy, setBusy] = useState(false);

  const total = pile.length;
  const card = cards.find((item) => item.id === pile[position]) || null;
  const finished = position >= total || !card;

  const grade = async (quality) => {
    if (busy || !card) return;
    setBusy(true);
    const saved = await reviewCard(card, quality);
    setBusy(false);
    /* Not saved (no connection, say): stay on this card rather than move on
       as if the answer had counted. */
    if (!saved) return;
    setRevealed(false);
    setPosition((value) => value + 1);
  };

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === 'Escape') {
        onDone();
        return;
      }
      if (finished) return;

      if (!revealed && (event.code === 'Space' || event.key === 'Enter')) {
        event.preventDefault();
        setRevealed(true);
        return;
      }
      if (revealed) {
        const picked = REVIEW_GRADES[Number(event.key) - 1];
        if (picked) {
          event.preventDefault();
          grade(picked.quality);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  if (finished) {
    const upcoming = cards
      .filter((item) => !isDue(item, now))
      .sort((a, b) => new Date(a.dueAt) - new Date(b.dueAt))[0];

    return (
      <div className="review">
        <div className="card review-done">
          <span className="empty-art" aria-hidden="true">
            <Check size={32} />
          </span>
          <h2>Ôn xong rồi!</h2>
          <p className="muted">
            Bạn vừa ôn {total} thẻ.
            {upcoming && ` Thẻ tiếp theo sẽ quay lại ${dueLabel(upcoming.dueAt, now)}.`}
          </p>
          <button type="button" className="btn btn-primary" onClick={onDone}>
            Về danh sách thẻ
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="review">
      <div className="review-top">
        <button type="button" className="icon-btn" onClick={onDone} aria-label="Dừng ôn">
          <X size={22} />
        </button>
        <Bar value={position / total} label="Tiến độ ôn" />
        <span className="num small muted">
          {position + 1}/{total}
        </span>
      </div>

      <div className="card review-card" key={card.id}>
        <SubjectTag subject={card.subject} />
        <p className="review-front">{card.front}</p>

        {revealed ? (
          <div className="review-answer">
            <p>{card.back}</p>
          </div>
        ) : (
          <button
            type="button"
            className="btn btn-primary btn-lg review-reveal"
            onClick={() => setRevealed(true)}
          >
            Xem đáp án
          </button>
        )}
      </div>

      {revealed ? (
        <div className="grades" role="group" aria-label="Bạn nhớ thẻ này thế nào?">
          {REVIEW_GRADES.map((item, index) => (
            <button
              key={item.id}
              type="button"
              className="grade"
              style={{ '--grade': item.color }}
              onClick={() => grade(item.quality)}
              disabled={busy}
            >
              <strong>{item.label}</strong>
              <span className="tiny">
                {intervalLabel(applyReview(card, item.quality, now).interval)}
              </span>
              <kbd aria-hidden="true">{index + 1}</kbd>
            </button>
          ))}
        </div>
      ) : (
        <p className="tiny muted review-hint">
          Thử tự nhớ ra trước, rồi bấm <kbd>Space</kbd> để xem đáp án.
        </p>
      )}
    </div>
  );
};

/* ==========================================================================
   ADD CARD — stays open after saving, because cards are made in batches.
   ========================================================================== */
const AddCardForm = ({ onClose }) => {
  const { addCard } = useApp();
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [subject, setSubject] = useState('Toán');
  const [busy, setBusy] = useState(false);
  const [added, setAdded] = useState(0);

  const ready = front.trim() && back.trim();

  const save = async (keepOpen) => {
    if (!ready || busy) return;
    setBusy(true);
    const created = await addCard({ front: front.trim(), back: back.trim(), subject });
    setBusy(false);
    if (!created) return;

    if (!keepOpen) {
      onClose();
      return;
    }
    setAdded((count) => count + 1);
    setFront('');
    setBack('');
    document.getElementById('cardFront')?.focus();
  };

  return (
    <form
      className="dialog-form"
      onSubmit={(event) => {
        event.preventDefault();
        save(true);
      }}
    >
      <div className="dialog-body">
        <div className="field">
          <label htmlFor="cardFront">Câu hỏi</label>
          <textarea
            id="cardFront"
            className="textarea"
            rows={2}
            placeholder="Ví dụ: Thủ đô của Úc là gì?"
            value={front}
            onChange={(event) => setFront(event.target.value)}
            data-autofocus
          />
        </div>
        <div className="field">
          <label htmlFor="cardBack">Đáp án</label>
          <textarea
            id="cardBack"
            className="textarea"
            rows={2}
            placeholder="Ví dụ: Canberra"
            value={back}
            onChange={(event) => setBack(event.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="cardSubject">Môn</label>
          <SubjectSelect id="cardSubject" value={subject} onChange={setSubject} />
        </div>
        {added > 0 && (
          <p className="small muted" role="status">
            Đã thêm {added} thẻ. Bạn có thể nhập tiếp.
          </p>
        )}
      </div>
      <div className="dialog-foot">
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => (ready ? save(false) : onClose())}
          disabled={busy}
        >
          {ready ? 'Lưu & đóng' : 'Đóng'}
        </button>
        <button type="submit" className="btn btn-primary" disabled={!ready || busy}>
          {busy ? 'Đang lưu…' : 'Lưu & thêm thẻ nữa'}
        </button>
      </div>
    </form>
  );
};

/* How firmly a card has settled in, as four small bars. It follows the gap
   between reviews: the longer Blooom can leave a card alone, the better it
   is known. */
const STRENGTH_LABELS = ['Thẻ mới', 'Mới học', 'Đang nhớ dần', 'Nhớ khá', 'Nhớ chắc'];

const strengthOf = (card) => {
  if (!card.lastReviewedAt) return 0;
  if (card.interval >= 21) return 4;
  if (card.interval >= 7) return 3;
  if (card.interval >= 2) return 2;
  return 1;
};

const Strength = ({ card }) => {
  const level = strengthOf(card);
  const text = STRENGTH_LABELS[level];

  return (
    <span className={`strength strength-${level}`} title={text} role="img" aria-label={text}>
      <i />
      <i />
      <i />
      <i />
    </span>
  );
};

/* ==========================================================================
   CARDS
   ========================================================================== */
export const Cards = () => {
  const { cards, deleteCard } = useApp();
  const now = useNow();

  /* Arriving from "Ôn ngay" or "Tạo thẻ" on the home page opens straight
     into that job. */
  const [reviewing, setReviewing] = useState(
    () => peekIntent('review') && dueQueue(cards, new Date()).length > 0
  );
  const [adding, setAdding] = useState(() => peekIntent('add-card'));

  useEffect(() => {
    clearIntent();
  }, []);
  const [subject, setSubject] = useState(null);
  const [query, setQuery] = useState('');
  const [doomed, setDoomed] = useState(null);

  const stats = useMemo(() => deckStats(cards, now), [cards, now]);
  const forecast = useMemo(() => dueForecast(cards, 14, now), [cards, now]);
  const forecastPeak = Math.max(...forecast.map((day) => day.count), 1);

  const counts = useMemo(() => {
    const result = {};
    cards.forEach((card) => {
      result[card.subject] = (result[card.subject] || 0) + 1;
    });
    return result;
  }, [cards]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return cards
      .filter((card) => !subject || card.subject === subject)
      .filter(
        (card) =>
          !needle ||
          card.front.toLowerCase().includes(needle) ||
          card.back.toLowerCase().includes(needle)
      )
      .sort((a, b) => new Date(a.dueAt) - new Date(b.dueAt));
  }, [cards, subject, query]);

  if (reviewing) return <Review onDone={() => setReviewing(false)} />;

  const nextUp = cards
    .filter((card) => !isDue(card, now))
    .sort((a, b) => new Date(a.dueAt) - new Date(b.dueAt))[0];

  return (
    <div className="stack-lg">
      <PageHead
        title="Thẻ nhớ"
        description="Blooom nhắc bạn ôn ngay trước lúc quên."
        action={
          cards.length > 0 && (
            <button type="button" className="btn" onClick={() => setAdding(true)}>
              <Plus size={18} aria-hidden="true" /> Thêm thẻ
            </button>
          )
        }
      />

      {cards.length === 0 ? (
        <div className="card">
          <Empty
            title="Chưa có thẻ nào"
            action={
              <button type="button" className="btn btn-primary" onClick={() => setAdding(true)}>
                <Plus size={18} aria-hidden="true" /> Tạo thẻ đầu tiên
              </button>
            }
          >
            Ghi một câu hỏi ở mặt trước, đáp án ở mặt sau. Blooom sẽ nhắc bạn ôn đúng lúc.
          </Empty>
        </div>
      ) : (
        <>
          <section className={`card review-cta ${stats.due > 0 ? 'is-due' : ''}`}>
            {stats.due > 0 ? (
              <>
                <div>
                  <span className="review-cta-count num">{stats.due}</span>
                  <h2>thẻ cần ôn hôm nay</h2>
                </div>
                <button
                  type="button"
                  className="btn btn-primary btn-lg"
                  onClick={() => setReviewing(true)}
                >
                  Ôn ngay
                </button>
              </>
            ) : (
              <>
                <div className="row">
                  <span className="task-icon is-done" aria-hidden="true">
                    <Check size={18} />
                  </span>
                  <div>
                    <h2>Hôm nay bạn đã ôn xong</h2>
                    {nextUp && (
                      <p className="muted">
                        Thẻ tiếp theo quay lại {dueLabel(nextUp.dueAt, now)}.
                      </p>
                    )}
                  </div>
                </div>
                <button type="button" className="btn" onClick={() => setAdding(true)}>
                  <Plus size={18} aria-hidden="true" /> Thêm thẻ
                </button>
              </>
            )}
          </section>

          <div className="cards-overview">
            <dl className="card facts">
              <div>
                <dt>Tất cả thẻ</dt>
                <dd className="num">{stats.total}</dd>
              </div>
              <div>
                <dt>Thẻ đã nhớ chắc</dt>
                <dd className="num">{stats.mature}</dd>
              </div>
              <div>
                <dt>Mức nhớ ước tính</dt>
                <dd className="num">
                  {stats.retention === null
                    ? 'chưa có'
                    : `${Math.round(stats.retention * 100)}%`}
                </dd>
              </div>
            </dl>

            <section className="card" aria-labelledby="forecast">
              <h2 className="card-title forecast-title" id="forecast">
                14 ngày tới
              </h2>
              <div
                className="forecast"
                role="img"
                aria-label="Số thẻ cần ôn mỗi ngày trong 14 ngày tới"
              >
                {forecast.map((day) => (
                  <span
                    key={day.date.toISOString()}
                    className={`forecast-col ${day.isToday ? 'is-today' : ''}`}
                    title={`${day.date.toLocaleDateString('vi-VN', { day: 'numeric', month: 'numeric' })}: ${day.count} thẻ`}
                  >
                    <i
                      style={{
                        height: `${Math.max(day.count > 0 ? 10 : 0, (day.count / forecastPeak) * 100)}%`
                      }}
                    />
                  </span>
                ))}
              </div>
              <div className="forecast-axis tiny muted">
                <span>Hôm nay</span>
                <span>2 tuần nữa</span>
              </div>
            </section>
          </div>

          <section className="stack">
            <div className="toolbar">
              <SubjectChips value={subject} onChange={setSubject} counts={counts} />
              <SearchField value={query} onChange={setQuery} placeholder="Tìm trong thẻ…" />
            </div>

            {visible.length === 0 ? (
              <div className="card">
                <Empty title="Không tìm thấy thẻ nào">
                  Thử từ khóa khác hoặc bỏ bộ lọc môn.
                </Empty>
              </div>
            ) : (
              <ul className="deck">
                {visible.map((card) => {
                  const due = isDue(card, now);
                  return (
                    <li key={card.id} className="deck-row">
                      <div className="grow">
                        <strong className="clamp-2">{card.front}</strong>
                        <span className="small muted clamp-2">{card.back}</span>
                      </div>
                      <div className="deck-meta">
                        <span className="tag">{subjectLabel(card.subject)}</span>
                        <span className={`tag ${due ? 'tag-due' : ''}`}>
                          {due ? 'Cần ôn' : `Ôn lại ${dueLabel(card.dueAt, now)}`}
                        </span>
                        <Strength card={card} />
                      </div>
                      <button
                        type="button"
                        className="icon-btn is-danger"
                        onClick={() => setDoomed(card)}
                        aria-label={`Xóa thẻ: ${card.front}`}
                      >
                        <Trash2 size={18} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </>
      )}

      <Dialog
        open={adding}
        onClose={() => setAdding(false)}
        title="Thêm thẻ nhớ"
        description="Mỗi thẻ một ý. Ngắn thì dễ nhớ."
      >
        <AddCardForm onClose={() => setAdding(false)} />
      </Dialog>

      <ConfirmDialog
        open={Boolean(doomed)}
        onClose={() => setDoomed(null)}
        onConfirm={() => deleteCard(doomed.id)}
        title="Xóa thẻ này?"
        description={doomed ? `“${doomed.front}” sẽ bị xóa cùng lịch ôn của nó.` : ''}
      />
    </div>
  );
};
