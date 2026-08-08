import { useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Hero, EmptyState, StatCard } from '../common/ui';
import { buildDailyBuckets, formatMinutes } from '../../services/gamification';
import {
  MIN_SESSIONS_FOR_FIT,
  chronotypeOf,
  cosinorFit,
  formatHour,
  peakWindow,
  weeklyMatrix
} from '../../services/chronobiology';
import {
  coefficientOfVariation,
  formatNumber,
  formatP,
  linearRegression
} from '../../services/statistics';
import { Waves, Sigma, TrendingUp, Clock, Activity, Info, ChartSpline } from 'lucide-react';
import { MathInline } from '../common/Math';

/* Days of history the trend model reads. Three weeks is long enough for a
   slope to mean something and short enough to still describe "now". */
const TREND_DAYS = 21;
const FORECAST_OFFSET = 24; // midpoint of the coming week, in days from x = 0

/* ==========================================================================
   COSINOR CHART — hourly totals as bars, the fitted 24-hour cosine on top.
   ========================================================================== */
const CosinorChart = ({ fit }) => {
  const W = 660;
  const H = 240;
  const PAD = { top: 16, right: 14, bottom: 28, left: 34 };

  const peak = Math.max(1, ...fit.profile.map((b) => b.minutes), ...fit.fitted);
  const x = (hour) => PAD.left + (hour / 23) * (W - PAD.left - PAD.right);
  const y = (value) => PAD.top + (1 - Math.max(0, value) / peak) * (H - PAD.top - PAD.bottom);

  const barWidth = (W - PAD.left - PAD.right) / 24 - 3;

  /* Sample the fitted cosine finely so the curve is smooth, not 24 segments.
     The axis runs 0–23h, matching the bars, so the sweep stops at 23. */
  const SAMPLES = 23 * 6;
  const curve = Array.from({ length: SAMPLES + 1 }, (_, i) => {
    const hour = i / 6;
    const value =
      fit.mesor + fit.amplitude * Math.cos(((2 * Math.PI) / 24) * (hour - fit.acrophase));
    return `${i === 0 ? 'M' : 'L'}${x(hour).toFixed(1)} ${y(value).toFixed(1)}`;
  }).join(' ');

  return (
    <svg
      className="cosinor-svg"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={`Biểu đồ phân bố thời gian học theo 24 giờ, với đường cosin khớp đạt đỉnh lúc ${formatHour(fit.acrophase)}.`}
    >
      {[0, 0.5, 1].map((v) => (
        <line
          key={v}
          x1={PAD.left}
          x2={W - PAD.right}
          y1={y(peak * v)}
          y2={y(peak * v)}
          className="plot-grid"
        />
      ))}

      {fit.profile.map((bucket) => (
        <rect
          key={bucket.hour}
          x={x(bucket.hour) - barWidth / 2}
          y={y(bucket.minutes)}
          width={barWidth}
          height={Math.max(0, y(0) - y(bucket.minutes))}
          className={`cosinor-bar ${bucket.minutes === 0 ? 'is-empty' : ''}`}
        >
          <title>{`${String(bucket.hour).padStart(2, '0')}:00 — ${bucket.minutes} phút, ${bucket.sessions} phiên`}</title>
        </rect>
      ))}

      {/* MESOR — the rhythm-adjusted mean. */}
      <line
        x1={PAD.left}
        x2={W - PAD.right}
        y1={y(fit.mesor)}
        y2={y(fit.mesor)}
        className="cosinor-mesor"
      />

      <path d={curve} className="cosinor-curve" />

      {/* Acrophase — where the fitted rhythm peaks. */}
      <line
        x1={x(fit.acrophase)}
        x2={x(fit.acrophase)}
        y1={PAD.top}
        y2={y(0)}
        className="cosinor-acrophase"
      />
      <circle
        cx={x(fit.acrophase)}
        cy={y(fit.mesor + fit.amplitude)}
        r="4.5"
        className="cosinor-peak"
      />

      {[0, 6, 12, 18, 23].map((hour) => (
        <text
          key={hour}
          x={x(hour)}
          y={H - PAD.bottom + 17}
          className="plot-axis-label"
          textAnchor="middle"
        >
          {String(hour).padStart(2, '0')}h
        </text>
      ))}
    </svg>
  );
};

/* ==========================================================================
   WEEK × HOUR HEATMAP
   ========================================================================== */
const RhythmHeatmap = ({ matrix }) => (
  <div className="heatmap">
    <div className="heatmap-hours mono" aria-hidden="true">
      {[0, 6, 12, 18].map((hour) => (
        <span key={hour} style={{ gridColumn: hour + 2 }}>
          {String(hour).padStart(2, '0')}h
        </span>
      ))}
    </div>

    {matrix.grid.map((row) => (
      <div className="heatmap-row" key={row.day}>
        <span className="heatmap-label mono">{row.label}</span>
        {row.hours.map((cell) => (
          <span
            key={cell.hour}
            className="heatmap-cell"
            style={{
              '--intensity': cell.minutes === 0 ? 0 : 0.16 + (cell.minutes / matrix.peak) * 0.84
            }}
            title={`${row.label} ${String(cell.hour).padStart(2, '0')}:00 — ${cell.minutes} phút`}
          />
        ))}
      </div>
    ))}
  </div>
);

/* ==========================================================================
   TREND CHART — daily minutes with the OLS line and the forecast point.
   ========================================================================== */
const TrendChart = ({ buckets, model }) => {
  const W = 660;
  const H = 220;
  const PAD = { top: 16, right: 58, bottom: 26, left: 36 };

  const maxDay = FORECAST_OFFSET + 3;
  const observed = Math.max(...buckets.map((b) => b.minutes), 1);
  const projected = model.valid ? model.predict(FORECAST_OFFSET) : 0;
  const peak = Math.max(observed, projected) * 1.15;

  const x = (day) => PAD.left + (day / maxDay) * (W - PAD.left - PAD.right);
  const y = (v) => PAD.top + (1 - Math.max(0, v) / peak) * (H - PAD.top - PAD.bottom);

  const interval = model.valid ? model.predictionInterval(FORECAST_OFFSET) : null;

  return (
    <svg
      className="trend-svg"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={
        model.valid
          ? `Xu hướng số phút học mỗi ngày trong ${TREND_DAYS} ngày, hệ số góc ${formatNumber(model.slope, 2)} phút mỗi ngày.`
          : 'Chưa đủ dữ liệu để vẽ xu hướng.'
      }
    >
      {[0, 0.5, 1].map((v) => (
        <line
          key={v}
          x1={PAD.left}
          x2={W - PAD.right}
          y1={y(peak * v)}
          y2={y(peak * v)}
          className="plot-grid"
        />
      ))}

      {buckets.map((bucket, i) => (
        <circle key={bucket.key} cx={x(i)} cy={y(bucket.minutes)} r="3" className="trend-dot">
          <title>{`${bucket.dayLabel} ${bucket.dateNumber}: ${bucket.minutes} phút`}</title>
        </circle>
      ))}

      {model.valid && (
        <>
          <line
            x1={x(0)}
            y1={y(model.predict(0))}
            x2={x(TREND_DAYS - 1)}
            y2={y(model.predict(TREND_DAYS - 1))}
            className="trend-line"
          />
          <line
            x1={x(TREND_DAYS - 1)}
            y1={y(model.predict(TREND_DAYS - 1))}
            x2={x(FORECAST_OFFSET)}
            y2={y(projected)}
            className="trend-line trend-line-future"
          />
          {interval && Number.isFinite(interval.low) && (
            <line
              x1={x(FORECAST_OFFSET)}
              x2={x(FORECAST_OFFSET)}
              y1={y(Math.max(0, interval.low))}
              y2={y(interval.high)}
              className="trend-interval"
            />
          )}
          <circle cx={x(FORECAST_OFFSET)} cy={y(projected)} r="5" className="trend-forecast" />
          <text
            x={x(FORECAST_OFFSET) + 10}
            y={y(projected) + 4}
            className="trend-forecast-label mono"
          >
            {Math.max(0, Math.round(projected))}′
          </text>
        </>
      )}

      <text x={x(0)} y={H - 6} className="plot-axis-label" textAnchor="start">
        −{TREND_DAYS} ngày
      </text>
      <text x={x(TREND_DAYS - 1)} y={H - 6} className="plot-axis-label" textAnchor="middle">
        hôm nay
      </text>
      <text x={x(FORECAST_OFFSET)} y={H - 6} className="plot-axis-label" textAnchor="middle">
        tuần tới
      </text>
    </svg>
  );
};

/* ==========================================================================
   INSIGHTS
   ========================================================================== */
export const Insights = () => {
  const { timerSessions } = useApp();

  const fit = useMemo(() => cosinorFit(timerSessions), [timerSessions]);
  const matrix = useMemo(() => weeklyMatrix(timerSessions), [timerSessions]);

  const buckets = useMemo(() => buildDailyBuckets(timerSessions, TREND_DAYS), [timerSessions]);

  const model = useMemo(
    () => linearRegression(buckets.map((bucket, i) => ({ x: i, y: bucket.minutes }))),
    [buckets]
  );

  const dailyMinutes = buckets.map((b) => b.minutes);
  const cv = coefficientOfVariation(dailyMinutes);

  const window = fit.valid ? peakWindow(fit.profile) : null;
  const chronotype = fit.valid ? chronotypeOf(fit.acrophase) : null;

  const projectedDaily = model.valid ? Math.max(0, model.predict(FORECAST_OFFSET)) : null;

  return (
    <div className="stack-5">
      <Hero
        eyebrow="Nhịp sinh học & dự báo"
        icon={<Waves size={12} />}
        title="Cơ Thể Bạn Có Lịch Riêng. Đây Là Nó."
        description="Blooom khớp một sóng cosin chu kỳ 24 giờ vào lịch sử phiên học để tìm giờ đỉnh tập trung, và chạy hồi quy bình phương tối thiểu để dự báo tuần kế tiếp."
      />

      {/* ---------------------------------------------------------------- */}
      {/* Cosinor                                                           */}
      {/* ---------------------------------------------------------------- */}
      <section className="panel panel-pad">
        <div className="section-head">
          <span className="section-head-icon">
            <Sigma size={16} />
          </span>
          <div className="grow">
            <h3>Phân Tích Cosinor 24 Giờ</h3>
            <MathInline id="cosinorShort" />
          </div>
        </div>

        {!fit.valid ? (
          <EmptyState
            icon={<Waves size={28} />}
            title="Chưa đủ dữ liệu để khớp nhịp ngày đêm"
            description={fit.reason}
          />
        ) : (
          <>
            <CosinorChart fit={fit} />

            <div className="param-row">
              <div className="param">
                <span className="param-label mono">Acrophase φ</span>
                <span className="param-value mono">{formatHour(fit.acrophase)}</span>
                <span className="param-note">Giờ đỉnh của nhịp khớp được</span>
              </div>
              <div className="param">
                <span className="param-label mono">Mesor M</span>
                <span className="param-value mono">{formatNumber(fit.mesor, 1)}′</span>
                <span className="param-note">Trung bình đã hiệu chỉnh nhịp</span>
              </div>
              <div className="param">
                <span className="param-label mono">Biên độ A</span>
                <span className="param-value mono">{formatNumber(fit.amplitude, 1)}′</span>
                <span className="param-note">
                  Bằng {Math.round(fit.relativeAmplitude * 100)}% mesor
                </span>
              </div>
              <div className="param">
                <span className="param-label mono">R²</span>
                <span className="param-value mono">{formatNumber(fit.rSquared, 3)}</span>
                <span className="param-note">Phần biến thiên mô hình giải thích</span>
              </div>
            </div>

            <div className="finding">
              <span className="finding-icon" aria-hidden="true">
                {chronotype.icon}
              </span>
              <div>
                <strong>
                  {chronotype.label} — khung mạnh nhất{' '}
                  <span className="mono">
                    {String(window.start).padStart(2, '0')}:00–
                    {String(window.end).padStart(2, '0')}:00
                  </span>
                </strong>
                <p>
                  {chronotype.description} Trong {fit.sessionCount} phiên đã ghi, khung giờ này
                  chiếm {formatMinutes(window.minutes)}.
                </p>
              </div>
            </div>

            {fit.rSquared < 0.3 && (
              <p className="method-note method-note-warn">
                <Info size={14} aria-hidden="true" />
                <span>
                  R² thấp ({formatNumber(fit.rSquared, 2)}) nghĩa là một sóng 24 giờ chưa mô tả
                  tốt thói quen học của bạn — lịch học hiện còn thất thường hơn là có nhịp. Ghi
                  thêm phiên ở nhiều khung giờ sẽ giúp ước lượng ổn định hơn.
                </span>
              </p>
            )}
          </>
        )}
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Heatmap                                                           */}
      {/* ---------------------------------------------------------------- */}
      <section className="panel panel-pad">
        <div className="section-head">
          <span className="section-head-icon">
            <Clock size={16} />
          </span>
          <div className="grow">
            <h3>Bản Đồ Nhiệt Thứ × Giờ</h3>
            <span className="t-xs t-dim">
              Ô càng đậm, tổng thời gian học vào khung đó càng nhiều
            </span>
          </div>
        </div>
        <RhythmHeatmap matrix={matrix} />
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Regression                                                        */}
      {/* ---------------------------------------------------------------- */}
      <section className="panel panel-pad">
        <div className="section-head">
          <span className="section-head-icon">
            <ChartSpline size={16} />
          </span>
          <div className="grow">
            <h3>Xu Hướng &amp; Dự Báo Tuần Tới</h3>
            <span className="t-xs t-dim">
              OLS trên {TREND_DAYS} ngày · <MathInline id="ols" />
            </span>
          </div>
        </div>

        {!model.valid ? (
          <EmptyState
            icon={<TrendingUp size={28} />}
            title="Chưa đủ dữ liệu để ước lượng xu hướng"
            description={model.reason}
          />
        ) : (
          <>
            <TrendChart buckets={buckets} model={model} />

            <div className="param-row">
              <div className="param">
                <span className="param-label mono">Hệ số góc b</span>
                <span
                  className={`param-value mono ${model.slope >= 0 ? 't-success' : 't-warn'}`}
                >
                  {model.slope >= 0 ? '+' : ''}
                  {formatNumber(model.slope, 2)}′/ngày
                </span>
                <span className="param-note">{formatP(model.p)}</span>
              </div>
              <div className="param">
                <span className="param-label mono">R²</span>
                <span className="param-value mono">{formatNumber(model.rSquared, 3)}</span>
                <span className="param-note">Tương quan r = {formatNumber(model.r, 2)}</span>
              </div>
              <div className="param">
                <span className="param-label mono">Dự báo/ngày</span>
                <span className="param-value mono">{Math.round(projectedDaily)}′</span>
                <span className="param-note">
                  KTC 95%:{' '}
                  {Math.max(0, Math.round(model.predictionInterval(FORECAST_OFFSET).low))}–
                  {Math.round(model.predictionInterval(FORECAST_OFFSET).high)}′
                </span>
              </div>
              <div className="param">
                <span className="param-label mono">Độ ổn định</span>
                <span className="param-value mono">CV {formatNumber(cv, 2)}</span>
                <span className="param-note">
                  {cv < 0.5 ? 'Rất đều' : cv < 1 ? 'Khá đều' : 'Còn thất thường'}
                </span>
              </div>
            </div>

            <div className="finding">
              <span className="finding-icon" aria-hidden="true">
                {model.p < 0.05 ? (model.slope >= 0 ? '📈' : '📉') : '➖'}
              </span>
              <div>
                <strong>
                  {model.p < 0.05
                    ? model.slope >= 0
                      ? 'Thời gian học đang tăng có ý nghĩa thống kê'
                      : 'Thời gian học đang giảm có ý nghĩa thống kê'
                    : 'Chưa thấy xu hướng rõ rệt'}
                </strong>
                <p>
                  Hệ số góc {formatNumber(model.slope, 2)} phút/ngày với {formatP(model.p)}. Nếu
                  giữ nguyên nhịp hiện tại, tuần tới bạn dự kiến học khoảng{' '}
                  <b className="mono">{formatMinutes(Math.round(projectedDaily * 7))}</b>.
                </p>
              </div>
            </div>
          </>
        )}

        <p className="method-note">
          <Info size={14} aria-hidden="true" />
          <span>
            Hồi quy tuyến tính giả định xu hướng là đường thẳng và các ngày độc lập nhau — điều
            này không đúng với lịch thi hay kỳ nghỉ. Dự báo chỉ có ý nghĩa khi thói quen sắp tới
            giống {TREND_DAYS} ngày vừa qua, và khoảng tin cậy 95% cho thấy độ bất định còn lại.
            Hệ số biến thiên <MathInline id="cv" /> đo độ đều của lịch học: càng thấp thì số
            phút mỗi ngày càng ít dao động quanh mức trung bình.
          </span>
        </p>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Summary tiles                                                     */}
      {/* ---------------------------------------------------------------- */}
      <div className="grid grid-4 stagger">
        <StatCard
          icon={<Activity size={20} />}
          label="Phiên đưa vào mô hình"
          value={timerSessions.length}
          unit="phiên"
          note={`Cần ≥ ${MIN_SESSIONS_FOR_FIT} phiên để khớp nhịp`}
          color="var(--d-1)"
        />
        <StatCard
          icon={<Clock size={20} />}
          label="Giờ đỉnh tập trung"
          value={fit.valid ? formatHour(fit.acrophase) : '—'}
          note={fit.valid ? `Acrophase của nhịp 24 giờ` : 'Chưa khớp được nhịp'}
          color="var(--d-3)"
        />
        <StatCard
          icon={<TrendingUp size={20} />}
          label="Xu hướng 21 ngày"
          value={
            model.valid ? `${model.slope >= 0 ? '+' : ''}${formatNumber(model.slope, 1)}` : '—'
          }
          unit={model.valid ? 'phút/ngày' : ''}
          note={model.valid ? formatP(model.p) : 'Chưa đủ dữ liệu'}
          color="var(--d-2)"
        />
        {/* Không có phiên nào thì hệ số biến thiên bằng 0 về mặt số học, và
            hiển thị nó cạnh chú thích "càng thấp càng đều" sẽ đọc thành "lịch
            học của bạn hoàn hảo" — một kết luận rút ra từ chỗ không có dữ
            liệu. Trường hợp đó phải hiện gạch ngang. */}
        <StatCard
          icon={<Sigma size={20} />}
          label="Hệ số biến thiên"
          value={timerSessions.length === 0 ? '—' : formatNumber(cv, 2)}
          note={
            timerSessions.length === 0
              ? 'Chưa có phiên học nào để đo'
              : 'Càng thấp, lịch học càng đều'
          }
          color="var(--d-5)"
        />
      </div>
    </div>
  );
};
