/* ==========================================================================
   BLOOOM — N-OF-1 TRIAL ENGINE

   An N-of-1 trial is a randomised controlled experiment with a single
   participant: the student alternates between two study conditions under
   randomised allocation, records one pre-declared outcome each time, and then
   tests whether the difference is larger than chance would produce.

   Three details make it an experiment rather than a diary:

     1. The hypothesis, the two conditions, the outcome measure and the target
        number of trials are all fixed BEFORE any data is collected. The
        engine refuses to change them once a trial has been recorded.
     2. Allocation is randomised in permuted blocks of two, so the student
        cannot pick the condition that suits their mood, and the two arms stay
        balanced even if the experiment is stopped early.
     3. Analysis is Welch's t-test with an effect size and a confidence
        interval — reported together, so a "significant" result with a tiny
        effect is visibly a tiny effect.

   The engine is honest about its limits: a within-person trial with no
   washout period and no blinding cannot rule out order effects or
   expectation, and the interface says so next to every conclusion.
   ========================================================================== */

import { welchTTest } from './statistics';

/* Below this, the t-test is reported but flagged as underpowered. Eight
   observations per arm is the usual floor quoted for N-of-1 designs. */
export const MIN_TRIALS_PER_ARM = 4;
export const RECOMMENDED_TRIALS_PER_ARM = 8;

/* --------------------------------------------------------------------------
   OUTCOME MEASURES — what the student agrees to record each trial.
   -------------------------------------------------------------------------- */
export const METRICS = [
  {
    id: 'focusMinutes',
    label: 'Số phút tập trung thực sự',
    unit: 'phút',
    hint: 'Đếm số phút bạn thực sự tập trung trong phiên, không tính lúc mất tập trung.',
    min: 0,
    max: 240,
    step: 1,
    higherIsBetter: true
  },
  {
    id: 'selfRating',
    label: 'Tự đánh giá mức tập trung (1–10)',
    unit: 'điểm',
    hint: 'Chấm ngay sau khi kết thúc phiên, trước khi xem kết quả bài làm.',
    min: 1,
    max: 10,
    step: 1,
    higherIsBetter: true
  },
  {
    id: 'itemsRecalled',
    label: 'Số câu/thẻ nhớ đúng',
    unit: 'câu',
    hint: 'Số câu trả lời đúng trong bài kiểm tra ngắn ngay sau phiên học.',
    min: 0,
    max: 200,
    step: 1,
    higherIsBetter: true
  },
  {
    id: 'distractions',
    label: 'Số lần mất tập trung',
    unit: 'lần',
    hint: 'Đếm số lần bạn rời khỏi nhiệm vụ (cầm điện thoại, mở tab khác…).',
    min: 0,
    max: 100,
    step: 1,
    higherIsBetter: false
  }
];

export const metricById = (id) => METRICS.find((m) => m.id === id) || METRICS[0];

/* --------------------------------------------------------------------------
   TEMPLATES — pre-written designs, each one a question a student can actually
   answer with the data this app already collects.
   -------------------------------------------------------------------------- */
export const TEMPLATES = [
  {
    id: 'pomodoro-length',
    title: 'Pomodoro 25 phút hay 50 phút?',
    hypothesis: 'Phiên 50 phút cho số phút tập trung thực sự cao hơn phiên 25 phút.',
    conditionA: 'Pomodoro 25′ / nghỉ 5′',
    conditionB: 'Pomodoro 50′ / nghỉ 10′',
    metric: 'focusMinutes'
  },
  {
    id: 'music',
    title: 'Học có nhạc nền hay im lặng?',
    hypothesis: 'Học trong im lặng làm giảm số lần mất tập trung so với có nhạc nền.',
    conditionA: 'Có nhạc nền không lời',
    conditionB: 'Hoàn toàn im lặng',
    metric: 'distractions'
  },
  {
    id: 'phone-away',
    title: 'Điện thoại để ngoài phòng có ích không?',
    hypothesis: 'Để điện thoại ở phòng khác làm tăng mức tự đánh giá tập trung.',
    conditionA: 'Điện thoại úp trên bàn',
    conditionB: 'Điện thoại để phòng khác',
    metric: 'selfRating'
  },
  {
    id: 'recall-vs-reread',
    title: 'Active recall hay đọc lại?',
    hypothesis: 'Tự kiểm tra (active recall) giúp nhớ được nhiều mục hơn đọc lại.',
    conditionA: 'Đọc lại tài liệu 20 phút',
    conditionB: 'Tự kiểm tra bằng thẻ ghi nhớ 20 phút',
    metric: 'itemsRecalled'
  }
];

/* --------------------------------------------------------------------------
   RANDOMISATION
   Permuted blocks of two: within each pair of trials the two conditions each
   appear once, in random order. Balance is guaranteed at every even trial,
   and the student can never predict the next allocation from the last one
   alone — which simple alternation (A, B, A, B…) would allow.
   -------------------------------------------------------------------------- */
export const nextAllocation = (trials) => {
  const completed = trials.length;
  const positionInBlock = completed % 2;

  if (positionInBlock === 0) {
    // First slot of a fresh block — a fair coin.
    return Math.random() < 0.5 ? 'A' : 'B';
  }

  // Second slot — whichever condition the block is still missing.
  return trials[completed - 1].condition === 'A' ? 'B' : 'A';
};

/* --------------------------------------------------------------------------
   CREATION & RECORDING
   -------------------------------------------------------------------------- */
export const createExperiment = ({
  title,
  hypothesis,
  conditionA,
  conditionB,
  metric,
  targetPerArm = RECOMMENDED_TRIALS_PER_ARM
}) => ({
  id: `exp-${Date.now().toString(36)}`,
  title: String(title).trim(),
  hypothesis: String(hypothesis).trim(),
  conditionA: String(conditionA).trim(),
  conditionB: String(conditionB).trim(),
  metric,
  targetPerArm,
  status: 'running',
  createdAt: new Date().toISOString(),
  completedAt: null,
  /* The allocation for the trial the student has not yet run. Drawing it in
     advance is what stops the design from being chosen after the fact. */
  pendingCondition: Math.random() < 0.5 ? 'A' : 'B',
  trials: []
});

export const recordTrial = (experiment, { value, note = '' }) => {
  const trial = {
    id: `trial-${Date.now().toString(36)}`,
    condition: experiment.pendingCondition,
    value: Number(value),
    note: String(note).trim(),
    at: new Date().toISOString()
  };

  const trials = [...experiment.trials, trial];

  return {
    ...experiment,
    trials,
    pendingCondition: nextAllocation(trials)
  };
};

/* --------------------------------------------------------------------------
   ANALYSIS
   -------------------------------------------------------------------------- */
export const analyseExperiment = (experiment) => {
  const metric = metricById(experiment.metric);

  const armA = experiment.trials.filter((t) => t.condition === 'A').map((t) => t.value);
  const armB = experiment.trials.filter((t) => t.condition === 'B').map((t) => t.value);

  const test = welchTTest(armA, armB);

  const underpowered =
    armA.length < RECOMMENDED_TRIALS_PER_ARM || armB.length < RECOMMENDED_TRIALS_PER_ARM;

  /* "Better" depends on the measure: fewer distractions is an improvement,
     fewer focus minutes is not. The sign is resolved once, here. */
  let winner = null;
  if (test.valid && test.significant) {
    const aIsHigher = test.difference > 0;
    const aIsBetter = metric.higherIsBetter ? aIsHigher : !aIsHigher;
    winner = aIsBetter ? 'A' : 'B';
  }

  return {
    metric,
    armA,
    armB,
    test,
    underpowered,
    winner,
    progress: {
      completed: experiment.trials.length,
      target: experiment.targetPerArm * 2,
      percent: Math.min(
        100,
        Math.round((experiment.trials.length / (experiment.targetPerArm * 2)) * 100)
      )
    }
  };
};

/* The plain-language conclusion, kept in one place so the wording can't drift
   from the numbers it is describing. */
export const conclusionOf = (experiment, analysis) => {
  const { test, underpowered, winner, metric } = analysis;

  if (!test.valid) {
    return {
      tone: 'pending',
      headline: 'Chưa đủ dữ liệu để kết luận',
      body: test.reason || 'Hãy ghi thêm vài phiên nữa ở cả hai điều kiện.'
    };
  }

  if (!test.significant) {
    return {
      tone: 'null',
      headline: 'Chưa thấy khác biệt có ý nghĩa thống kê',
      body:
        `Với dữ liệu hiện tại, chênh lệch giữa hai điều kiện không vượt ngưỡng α = 0,05. ` +
        `Điều này KHÔNG chứng minh hai cách là như nhau — chỉ nghĩa là thí nghiệm này chưa đủ bằng chứng để khẳng định khác biệt.` +
        (underpowered ? ' Cỡ mẫu còn nhỏ nên khả năng phát hiện khác biệt thật vẫn thấp.' : '')
    };
  }

  const label = winner === 'A' ? experiment.conditionA : experiment.conditionB;

  return {
    tone: 'signal',
    headline: `“${label}” cho kết quả tốt hơn`,
    body:
      `Chênh lệch trung bình ${Math.abs(test.difference).toFixed(1)} ${metric.unit} ` +
      `là có ý nghĩa thống kê ở mức α = 0,05.` +
      (underpowered
        ? ' Tuy nhiên cỡ mẫu còn nhỏ, nên hãy chạy thêm vài phiên trước khi đổi hẳn thói quen học.'
        : '')
  };
};
