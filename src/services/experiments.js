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
    label: 'Số phút thật sự tập trung',
    short: 'phút tập trung',
    unit: 'phút',
    hint: 'Chỉ tính những phút bạn thật sự học, bỏ lúc xao nhãng.',
    min: 0,
    max: 240,
    step: 1,
    higherIsBetter: true
  },
  {
    id: 'selfRating',
    label: 'Tự chấm mức tập trung (1–10)',
    short: 'điểm tập trung',
    unit: 'điểm',
    hint: 'Chấm ngay khi học xong, đừng nghĩ lâu.',
    min: 1,
    max: 10,
    step: 1,
    higherIsBetter: true
  },
  {
    id: 'itemsRecalled',
    label: 'Số câu trả lời đúng',
    short: 'câu đúng',
    unit: 'câu',
    hint: 'Tự kiểm tra nhanh sau buổi học rồi đếm số câu đúng.',
    min: 0,
    max: 200,
    step: 1,
    higherIsBetter: true
  },
  {
    id: 'distractions',
    label: 'Số lần xao nhãng',
    short: 'lần xao nhãng',
    unit: 'lần',
    hint: 'Mỗi lần cầm điện thoại hay mở trang khác tính là một lần.',
    min: 0,
    max: 100,
    step: 1,
    higherIsBetter: false
  }
];

export const metricById = (id) => METRICS.find((m) => m.id === id) || METRICS[0];

/* --------------------------------------------------------------------------
   TEMPLATES — ready-made questions a student can answer with a week or two
   of ordinary studying.
   -------------------------------------------------------------------------- */
export const TEMPLATES = [
  {
    id: 'session-length',
    title: 'Học 25 phút hay 50 phút?',
    hypothesis: 'Mình đoán phiên 50 phút giúp tập trung được nhiều hơn.',
    conditionA: 'Học 25 phút, nghỉ 5 phút',
    conditionB: 'Học 50 phút, nghỉ 10 phút',
    metric: 'focusMinutes'
  },
  {
    id: 'music',
    title: 'Nghe nhạc hay im lặng?',
    hypothesis: 'Mình đoán học trong im lặng sẽ ít xao nhãng hơn.',
    conditionA: 'Mở nhạc không lời',
    conditionB: 'Hoàn toàn im lặng',
    metric: 'distractions'
  },
  {
    id: 'phone-away',
    title: 'Điện thoại để xa có giúp gì không?',
    hypothesis: 'Mình đoán để điện thoại ở phòng khác sẽ tập trung hơn.',
    conditionA: 'Điện thoại úp trên bàn',
    conditionB: 'Điện thoại để phòng khác',
    metric: 'selfRating'
  },
  {
    id: 'recall-vs-reread',
    title: 'Tự kiểm tra hay đọc lại?',
    hypothesis: 'Mình đoán tự kiểm tra giúp nhớ nhiều hơn đọc lại.',
    conditionA: 'Đọc lại bài 20 phút',
    conditionB: 'Tự kiểm tra bằng thẻ nhớ 20 phút',
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

/* The conclusion in everyday words, kept in one place so the wording can't
   drift from the numbers it describes. `tone` drives the colour:
   pending (not enough data) · even (no clear difference) · lead (a clear
   winner) · hint (a winner, but on too few sessions to trust yet). */
export const conclusionOf = (experiment, analysis) => {
  const { test, underpowered, winner, metric, armA, armB } = analysis;

  if (!test.valid) {
    const missing = Math.max(0, 2 - armA.length) + Math.max(0, 2 - armB.length);
    return {
      tone: 'pending',
      headline: 'Chưa đủ dữ liệu để so sánh',
      body:
        missing > 0
          ? `Ghi thêm ${missing} buổi nữa là Blooom bắt đầu so sánh được.`
          : 'Kết quả các buổi đang giống hệt nhau. Ghi thêm vài buổi nữa nhé.'
    };
  }

  const gap = `${Math.abs(test.difference).toFixed(1).replace('.', ',')} ${metric.unit}`;

  if (!test.significant) {
    return {
      tone: 'even',
      headline: 'Chưa thấy khác biệt rõ ràng',
      body: underpowered
        ? `Hai cách đang chênh nhau ${gap}, nhưng số buổi còn ít nên chưa nói chắc được. Ghi thêm vài buổi nữa nhé.`
        : `Hai cách chỉ chênh nhau ${gap} — có thể chỉ là ngẫu nhiên. Bạn cứ chọn cách mình thấy thoải mái hơn.`
    };
  }

  const label = winner === 'A' ? experiment.conditionA : experiment.conditionB;

  return {
    tone: underpowered ? 'hint' : 'lead',
    headline: underpowered ? `“${label}” đang nhỉnh hơn` : `“${label}” hợp với bạn hơn`,
    body: underpowered
      ? `Cách này tốt hơn trung bình ${gap} mỗi buổi. Ghi đủ ${RECOMMENDED_TRIALS_PER_ARM} buổi mỗi cách để chắc chắn.`
      : `Cách này tốt hơn trung bình ${gap} mỗi buổi, và khác biệt đủ rõ để tin được.`
  };
};
