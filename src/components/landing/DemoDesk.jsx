import { useEffect, useState } from 'react';
import { Pause, Play, RotateCcw } from 'lucide-react';
import { applyReview, createCard } from '../../services/srs';
import { clock, intervalLabel } from '../../lib/time';
import { Ring } from '../ui/bits';

const DEMO_SECONDS = 25 * 60;

const DECK = [
  { front: 'Công thức tính diện tích hình tròn?', back: 'S = πr²', subject: 'Toán' },
  { front: '“Photosynthesis” nghĩa là gì?', back: 'Quang hợp', subject: 'Tiếng Anh' },
  { front: 'Nước sôi ở bao nhiêu độ C?', back: '100 °C (ở áp suất thường)', subject: 'Vật lý' }
];

/* The demo card behaves like one the visitor has already got right twice,
   so the two answers lead somewhere visibly different: remembering pushes it
   weeks away, forgetting brings it back tomorrow. The dates come from the
   same scheduling code the real app runs. */
const seasoned = (entry) => ({
  ...createCard(entry),
  repetitions: 2,
  interval: 6,
  reviewCount: 2
});

/* ==========================================================================
   DEMO DESK — the hero's two working toys: a timer that really counts down
   and a flashcard that really flips. Nothing here is saved anywhere.
   ========================================================================== */
const DemoTimer = () => {
  const [left, setLeft] = useState(DEMO_SECONDS);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return undefined;
    const id = setInterval(() => {
      setLeft((seconds) => (seconds <= 1 ? DEMO_SECONDS : seconds - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [running]);

  const started = left !== DEMO_SECONDS;

  return (
    <div className="demo-card demo-timer">
      <div className="demo-top">
        <span className="tag" style={{ '--dot': '#3b82f6' }}>
          <span className="tag-dot" />
          Toán
        </span>
        <span className="tiny faint">25 phút</span>
      </div>

      <Ring value={left / DEMO_SECONDS} size={176} stroke={12} color="var(--orange)">
        <span className="num demo-time" aria-live="off">
          {clock(left)}
        </span>
      </Ring>

      <div className="row">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setRunning((value) => !value)}
        >
          {running ? (
            <>
              <Pause size={17} aria-hidden="true" /> Tạm dừng
            </>
          ) : (
            <>
              <Play size={17} fill="currentColor" aria-hidden="true" />
              {started ? 'Tiếp tục' : 'Bắt đầu'}
            </>
          )}
        </button>
        {started && (
          <button
            type="button"
            className="icon-btn"
            onClick={() => {
              setRunning(false);
              setLeft(DEMO_SECONDS);
            }}
            aria-label="Đặt lại đồng hồ"
          >
            <RotateCcw size={18} />
          </button>
        )}
      </div>
    </div>
  );
};

const DemoFlashcard = () => {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [verdict, setVerdict] = useState(null);

  const entry = DECK[index];

  const grade = (remembered) => {
    const after = applyReview(seasoned(entry), remembered ? 4 : 1);
    setVerdict({ remembered, interval: after.interval });
  };

  const next = () => {
    setIndex((value) => (value + 1) % DECK.length);
    setFlipped(false);
    setVerdict(null);
  };

  return (
    <div className="demo-card demo-flash">
      <div className="demo-top">
        <span className="tiny faint">Thẻ nhớ</span>
        <span className="tiny faint">{entry.subject}</span>
      </div>

      <div className={`flip ${flipped ? 'is-flipped' : ''}`}>
        <button
          type="button"
          className="flip-face flip-front"
          onClick={() => setFlipped(true)}
          tabIndex={flipped ? -1 : 0}
          aria-hidden={flipped}
        >
          <strong>{entry.front}</strong>
          <span className="tiny faint">Bấm để xem đáp án</span>
        </button>

        <div className="flip-face flip-back" aria-hidden={!flipped}>
          <strong>{entry.back}</strong>

          {verdict ? (
            <>
              <p className="small muted" role="status">
                {verdict.remembered
                  ? `Tốt! Thẻ này sẽ quay lại sau ${intervalLabel(verdict.interval)}.`
                  : 'Không sao. Thẻ này sẽ quay lại vào ngày mai.'}
              </p>
              <button
                type="button"
                className="btn btn-soft btn-sm"
                onClick={next}
                tabIndex={flipped ? 0 : -1}
              >
                Thẻ tiếp theo
              </button>
            </>
          ) : (
            <div className="row">
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => grade(false)}
                tabIndex={flipped ? 0 : -1}
              >
                Quên rồi
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => grade(true)}
                tabIndex={flipped ? 0 : -1}
              >
                Nhớ được
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const DemoDesk = () => (
  <div className="demo-desk">
    <DemoTimer />
    <DemoFlashcard />
  </div>
);
