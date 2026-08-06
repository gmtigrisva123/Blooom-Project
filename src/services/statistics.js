/* ==========================================================================
   BLOOOM — INFERENTIAL STATISTICS
   Everything the Experiment Lab and the Insights page need to make a claim
   about a student's own data: descriptive summaries, Welch's t-test with an
   exact p-value, effect sizes, confidence intervals and ordinary least
   squares regression.

   No dependency does this for us, so the two special functions the t and F
   distributions are built on — the log-gamma and the regularised incomplete
   beta — are implemented here. Both are standard numerical recipes and are
   accurate to well past the precision a student report needs.
   ========================================================================== */

/* --------------------------------------------------------------------------
   SPECIAL FUNCTIONS
   -------------------------------------------------------------------------- */

/* Lanczos approximation, g = 7, n = 9. Relative error < 1e-13 for x > 0. */
const LANCZOS = [
  0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
  -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6,
  1.5056327351493116e-7
];

export const logGamma = (x) => {
  if (x < 0.5) {
    // Reflection formula keeps the series in its convergent range.
    return Math.log(Math.PI / Math.sin(Math.PI * x)) - logGamma(1 - x);
  }
  const z = x - 1;
  let a = LANCZOS[0];
  const t = z + 7.5;
  for (let i = 1; i < 9; i += 1) a += LANCZOS[i] / (z + i);
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(a);
};

/* Continued fraction for the incomplete beta, evaluated with Lentz's method. */
const betaContinuedFraction = (a, b, x) => {
  const TINY = 1e-30;
  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;

  let c = 1;
  let d = 1 - (qab * x) / qap;
  if (Math.abs(d) < TINY) d = TINY;
  d = 1 / d;
  let h = d;

  for (let m = 1; m <= 200; m += 1) {
    const m2 = 2 * m;

    // Even step.
    let numerator = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + numerator * d;
    if (Math.abs(d) < TINY) d = TINY;
    c = 1 + numerator / c;
    if (Math.abs(c) < TINY) c = TINY;
    d = 1 / d;
    h *= d * c;

    // Odd step.
    numerator = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + numerator * d;
    if (Math.abs(d) < TINY) d = TINY;
    c = 1 + numerator / c;
    if (Math.abs(c) < TINY) c = TINY;
    d = 1 / d;
    const delta = d * c;
    h *= delta;

    if (Math.abs(delta - 1) < 3e-12) break;
  }

  return h;
};

/* Regularised incomplete beta I_x(a, b). */
export const incompleteBeta = (a, b, x) => {
  if (!(x > 0)) return 0;
  if (x >= 1) return 1;

  const front =
    Math.exp(
      logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log(1 - x)
    ) / a;

  // The fraction only converges quickly on one side of the mean; swap if needed.
  return x < (a + 1) / (a + b + 2)
    ? front * betaContinuedFraction(a, b, x)
    : 1 - (front * a * betaContinuedFraction(b, a, 1 - x)) / b;
};

/* --------------------------------------------------------------------------
   STUDENT'S t DISTRIBUTION
   -------------------------------------------------------------------------- */

/* Two-tailed p-value for a t statistic on `df` degrees of freedom.
   P(|T| >= |t|) = I_{df/(df+t^2)}(df/2, 1/2). */
export const tTestPValue = (t, df) => {
  if (!Number.isFinite(t) || !Number.isFinite(df) || df <= 0) return NaN;
  const x = df / (df + t * t);
  return Math.min(1, Math.max(0, incompleteBeta(df / 2, 0.5, x)));
};

/* Critical t for a two-tailed test, found by bisection on the p-value —
   monotone in t, so 80 halvings is far more precision than we display. */
export const tCritical = (df, alpha = 0.05) => {
  if (!Number.isFinite(df) || df <= 0) return NaN;
  let low = 0;
  let high = 200;
  for (let i = 0; i < 80; i += 1) {
    const mid = (low + high) / 2;
    if (tTestPValue(mid, df) > alpha) low = mid;
    else high = mid;
  }
  return (low + high) / 2;
};

/* --------------------------------------------------------------------------
   DESCRIPTIVE STATISTICS
   -------------------------------------------------------------------------- */

export const mean = (values) =>
  values.length === 0 ? 0 : values.reduce((sum, v) => sum + v, 0) / values.length;

/* Sample variance (n - 1). One observation carries no spread information, so
   it returns 0 rather than dividing by zero. */
export const variance = (values) => {
  if (values.length < 2) return 0;
  const m = mean(values);
  return values.reduce((sum, v) => sum + (v - m) ** 2, 0) / (values.length - 1);
};

export const stdDev = (values) => Math.sqrt(variance(values));

export const median = (values) => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
};

/* Coefficient of variation — spread expressed as a share of the mean, which
   is how we report "how consistent is this student" without units. */
export const coefficientOfVariation = (values) => {
  const m = mean(values);
  return m === 0 ? 0 : stdDev(values) / m;
};

export const describe = (values) => ({
  n: values.length,
  mean: mean(values),
  sd: stdDev(values),
  median: median(values),
  min: values.length ? Math.min(...values) : 0,
  max: values.length ? Math.max(...values) : 0
});

/* --------------------------------------------------------------------------
   TWO-SAMPLE COMPARISON
   Welch's t-test rather than Student's: a student's two study conditions will
   almost never have equal variances, and Welch stays valid when they don't.
   -------------------------------------------------------------------------- */
export const welchTTest = (sampleA, sampleB, alpha = 0.05) => {
  const nA = sampleA.length;
  const nB = sampleB.length;

  if (nA < 2 || nB < 2) {
    return {
      valid: false,
      reason: 'Mỗi nhóm cần ít nhất 2 quan sát để ước lượng phương sai.',
      nA,
      nB
    };
  }

  const mA = mean(sampleA);
  const mB = mean(sampleB);
  const vA = variance(sampleA);
  const vB = variance(sampleB);

  const standardError = Math.sqrt(vA / nA + vB / nB);
  const difference = mA - mB;

  if (standardError === 0) {
    return {
      valid: false,
      reason: 'Cả hai nhóm đều không có độ biến thiên — không thể kiểm định.',
      nA,
      nB,
      meanA: mA,
      meanB: mB
    };
  }

  const t = difference / standardError;

  // Welch–Satterthwaite degrees of freedom.
  const df =
    (vA / nA + vB / nB) ** 2 /
    (vA ** 2 / (nA ** 2 * (nA - 1)) + vB ** 2 / (nB ** 2 * (nB - 1)));

  const p = tTestPValue(t, df);
  const tCrit = tCritical(df, alpha);
  const marginOfError = tCrit * standardError;

  // Hedges' g: Cohen's d with the small-sample correction, which matters a
  // lot at the sample sizes one student can realistically collect.
  const pooledSd = Math.sqrt(((nA - 1) * vA + (nB - 1) * vB) / (nA + nB - 2));
  const cohensD = pooledSd === 0 ? 0 : difference / pooledSd;
  const correction = 1 - 3 / (4 * (nA + nB) - 9);
  const hedgesG = cohensD * correction;

  return {
    valid: true,
    nA,
    nB,
    meanA: mA,
    meanB: mB,
    sdA: Math.sqrt(vA),
    sdB: Math.sqrt(vB),
    difference,
    standardError,
    t,
    df,
    p,
    alpha,
    significant: p < alpha,
    cohensD,
    hedgesG,
    ciLow: difference - marginOfError,
    ciHigh: difference + marginOfError
  };
};

/* Conventional Cohen benchmarks, stated as bands rather than a verdict. */
export const effectSizeLabel = (d) => {
  const magnitude = Math.abs(d);
  if (magnitude < 0.2) return 'không đáng kể';
  if (magnitude < 0.5) return 'nhỏ';
  if (magnitude < 0.8) return 'trung bình';
  return 'lớn';
};

/* --------------------------------------------------------------------------
   ORDINARY LEAST SQUARES — y = intercept + slope · x
   Used to project the coming week's study time from the trailing history.
   -------------------------------------------------------------------------- */
export const linearRegression = (points) => {
  const n = points.length;
  if (n < 3) {
    return { valid: false, reason: 'Cần ít nhất 3 điểm dữ liệu để ước lượng xu hướng.', n };
  }

  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const mx = mean(xs);
  const my = mean(ys);

  let sxx = 0;
  let sxy = 0;
  let syy = 0;
  for (let i = 0; i < n; i += 1) {
    sxx += (xs[i] - mx) ** 2;
    sxy += (xs[i] - mx) * (ys[i] - my);
    syy += (ys[i] - my) ** 2;
  }

  if (sxx === 0) {
    return { valid: false, reason: 'Mọi quan sát rơi vào cùng một mốc thời gian.', n };
  }

  const slope = sxy / sxx;
  const intercept = my - slope * mx;

  const residualSumSquares = ys.reduce(
    (sum, y, i) => sum + (y - (intercept + slope * xs[i])) ** 2,
    0
  );
  const rSquared = syy === 0 ? 0 : 1 - residualSumSquares / syy;

  // Residual standard error, then the standard error of the slope itself.
  const df = n - 2;
  const residualSe = df > 0 ? Math.sqrt(residualSumSquares / df) : 0;
  const slopeSe = residualSe / Math.sqrt(sxx);
  const tStat = slopeSe === 0 ? 0 : slope / slopeSe;

  return {
    valid: true,
    n,
    slope,
    intercept,
    rSquared,
    r: syy === 0 || sxx === 0 ? 0 : sxy / Math.sqrt(sxx * syy),
    residualSe,
    slopeSe,
    df,
    t: tStat,
    p: df > 0 ? tTestPValue(tStat, df) : NaN,
    meanX: mx,
    sxx,
    predict: (x) => intercept + slope * x,
    /* Prediction interval for a single future observation at x — wider than a
       confidence interval because it also carries the residual scatter. */
    predictionInterval: (x, alpha = 0.05) => {
      if (df <= 0) return { low: NaN, high: NaN };
      const centre = intercept + slope * x;
      const spread =
        tCritical(df, alpha) * residualSe * Math.sqrt(1 + 1 / n + (x - mx) ** 2 / sxx);
      return { low: centre - spread, high: centre + spread };
    }
  };
};

/* --------------------------------------------------------------------------
   FORMATTING — one place that decides how a number is shown, so the same
   value never appears with two different precisions in two panels.
   -------------------------------------------------------------------------- */
export const formatP = (p) => {
  if (!Number.isFinite(p)) return '—';
  if (p < 0.001) return 'p < 0,001';
  return `p = ${p.toFixed(3).replace('.', ',')}`;
};

export const formatNumber = (value, digits = 1) =>
  Number.isFinite(value) ? value.toFixed(digits).replace('.', ',') : '—';
