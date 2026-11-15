import { useState } from 'react';
import { applyReview, createCard } from '../../services/srs';
import { intervalLabel } from '../../lib/time';
import { Bar } from '../ui/bits';
import { Garden, Sheet } from '../ui/Paper';

const DECK = [
  { front: 'Diện tích hình tròn tính thế nào?', back: 'S = πr²', subject: 'Toán' },
  { front: '“Photosynthesis” nghĩa là gì?', back: 'Quang hợp', subject: 'Tiếng Anh' },
  { front: 'Nước sôi ở bao nhiêu độ C?', back: '100 °C', subject: 'Vật lý' }
];

const WEEK = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const START = [25, 50, 0, 0, 0, 0, 0];

/* The demo card behaves like one the visitor has already got right twice, so
   the two answers lead somewhere visibly different. The dates come from the
   same scheduling code the real app runs. */
const seasoned = (entry) => ({
  ...createCard(entry),
  repetitions: 2,
  interval: 6,
  reviewCount: 2
});

/* ==========================================================================
   HERO DEMO · the product doing its one job, on card stock.

   A flashcard to answer and a week's garden under it. Every card the visitor
   remembers grows the next plant: recall becomes growth, which is the whole
   idea of Blooom in one gesture. Nothing here is saved anywhere.
   ========================================================================== */
export const HeroDemo = () => {
  const [index, setIndex] = useState(0);
  const [shown, setShown] = useState(false);
  const [verdict, setVerdict] = useState(null);
  const [minutes, setMinutes] = useState(START);

  const entry = DECK[index];
  const done = index >= DECK.length;

  const grade = (remembered) => {
    const after = applyReview(seasoned(entry), remembered ? 4 : 1);
    setVerdict({ remembered, interval: after.interval });

    if (remembered) {
      setMinutes((prev) => {
        const next = [...prev];
        const plot = next.findIndex((value) => value === 0);
        if (plot >= 0) next[plot] = 25 + ((plot * 25) % 75);
        return next;
      });
    }
  };

  const advance = () => {
    setIndex((value) => value + 1);
    setShown(false);
    setVerdict(null);
  };

  const restart = () => {
    setIndex(0);
    setShown(false);
    setVerdict(null);
    setMinutes(START);
  };

  const days = WEEK.map((label, i) => ({
    key: label,
    label,
    minutes: minutes[i],
    isToday: i === 2
  }));

  return (
    <div className="hero-demo" data-slot="hero-product">
      <Sheet seed={41} depth={10} color="var(--color-sugar)" className="hero-mat">
        <span className="sr-only">Bản dùng thử thẻ nhớ</span>
      </Sheet>

      <div className="card hero-card" data-enter="sheet">
        <div className="hero-card-top">
          <span className="tag">Ôn bài hôm nay</span>
          <Bar value={Math.min(index, DECK.length) / DECK.length} label="Số thẻ đã ôn" />
          <span className="small muted num">
            {Math.min(index + 1, DECK.length)}/{DECK.length}
          </span>
        </div>

        {done ? (
          <div className="hero-quiz">
            <p className="hero-question">Ôn xong rồi. Vườn tuần này vừa cao thêm.</p>
            <div className="row wrap">
              <button type="button" className="btn" onClick={restart}>
                Ôn lại từ đầu
              </button>
            </div>
          </div>
        ) : (
          <div className="hero-quiz">
            <Sheet seed={index + 7} depth={6} color="var(--color-sand)" className="hero-strip">
              <p className="hero-question">{entry.front}</p>
            </Sheet>

            {!shown && (
              <div className="row wrap">
                <button type="button" className="btn" onClick={() => setShown(true)}>
                  Xem đáp án
                </button>
              </div>
            )}

            {shown && (
              <>
                <p className="hero-answer">{entry.back}</p>

                {verdict ? (
                  <>
                    <p className="hero-verdict" role="status">
                      {verdict.remembered
                        ? 'Thẻ này sẽ quay lại sau '
                        : 'Thẻ này sẽ quay lại vào '}
                      <mark>
                        {verdict.remembered ? intervalLabel(verdict.interval) : 'ngày mai'}
                      </mark>
                      .
                    </p>
                    <div className="row wrap">
                      <button type="button" className="btn" onClick={advance}>
                        Thẻ tiếp theo
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="row wrap">
                    <button type="button" className="btn" onClick={() => grade(false)}>
                      Quên rồi
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => grade(true)}
                    >
                      Nhớ được
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        <Garden
          days={days}
          height={64}
          label="Vườn tuần này: mỗi thẻ nhớ được làm một cây lớn lên"
        />
      </div>

      <span className="sticker" data-enter="sticker">
        Miễn phí
      </span>
    </div>
  );
};
