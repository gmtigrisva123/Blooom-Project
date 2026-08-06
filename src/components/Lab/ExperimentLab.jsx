import { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Modal } from '../common/Modal';
import { Hero, EmptyState, ProgressBar } from '../common/ui';
import {
  METRICS,
  TEMPLATES,
  MIN_TRIALS_PER_ARM,
  RECOMMENDED_TRIALS_PER_ARM,
  analyseExperiment,
  conclusionOf,
  metricById
} from '../../services/experiments';
import { effectSizeLabel, formatNumber, formatP } from '../../services/statistics';
import {
  FlaskConical,
  Plus,
  Dices,
  Trash2,
  Lock,
  RotateCcw,
  TriangleAlert,
  Info,
  Sigma
} from 'lucide-react';

/* ==========================================================================
   ARM SUMMARY — the two conditions side by side, with a dot plot of every
   observation so an outlier is visible rather than hidden inside a mean.
   ========================================================================== */
const ArmPlot = ({ armA, armB, labelA, labelB, unit }) => {
  const all = [...armA, ...armB];
  if (all.length === 0) return null;

  const min = Math.min(...all);
  const max = Math.max(...all);
  const span = max - min || 1;
  const pos = (v) => ((v - min) / span) * 100;

  const rows = [
    { key: 'A', label: labelA, values: armA, className: 'arm-a' },
    { key: 'B', label: labelB, values: armB, className: 'arm-b' }
  ];

  return (
    <div className="arm-plot">
      {rows.map((row) => {
        const m = row.values.length
          ? row.values.reduce((s, v) => s + v, 0) / row.values.length
          : null;

        return (
          <div className={`arm-row ${row.className}`} key={row.key}>
            <div className="arm-head">
              <span className="arm-tag mono">{row.key}</span>
              <span className="arm-label truncate">{row.label}</span>
              <span className="arm-mean mono">
                {m === null ? '—' : `${formatNumber(m, 1)} ${unit}`}
              </span>
            </div>
            <div className="arm-track">
              {row.values.map((v, i) => (
                <span
                  className="arm-dot"
                  key={`${row.key}-${i}`}
                  style={{ left: `${pos(v)}%` }}
                  title={`${v} ${unit}`}
                />
              ))}
              {m !== null && <span className="arm-mean-tick" style={{ left: `${pos(m)}%` }} />}
            </div>
          </div>
        );
      })}
      <div className="arm-scale mono">
        <span>{formatNumber(min, 0)}</span>
        <span>{formatNumber(max, 0)}</span>
      </div>
    </div>
  );
};

/* ==========================================================================
   RESULTS TABLE
   ========================================================================== */
const ResultTable = ({ test, metric }) => {
  if (!test.valid) {
    return (
      <p className="t-sm t-dim" style={{ margin: 0 }}>
        {test.reason}
      </p>
    );
  }

  const rows = [
    ['n (A / B)', `${test.nA} / ${test.nB}`],
    [
      'Trung bình (A / B)',
      `${formatNumber(test.meanA, 2)} / ${formatNumber(test.meanB, 2)} ${metric.unit}`
    ],
    ['Độ lệch chuẩn (A / B)', `${formatNumber(test.sdA, 2)} / ${formatNumber(test.sdB, 2)}`],
    ['Chênh lệch A − B', `${formatNumber(test.difference, 2)} ${metric.unit}`],
    [
      'KTC 95% của chênh lệch',
      `[${formatNumber(test.ciLow, 2)} ; ${formatNumber(test.ciHigh, 2)}]`
    ],
    ['Thống kê t (Welch)', formatNumber(test.t, 3)],
    ['Bậc tự do', formatNumber(test.df, 1)],
    ['Giá trị p (hai phía)', formatP(test.p)],
    ["Hedges' g", `${formatNumber(test.hedgesG, 2)} (${effectSizeLabel(test.hedgesG)})`]
  ];

  return (
    <dl className="stat-table">
      {rows.map(([label, value]) => (
        <div className="stat-table-row" key={label}>
          <dt>{label}</dt>
          <dd className="mono">{value}</dd>
        </div>
      ))}
    </dl>
  );
};

/* ==========================================================================
   ONE EXPERIMENT
   ========================================================================== */
const ExperimentCard = ({ experiment }) => {
  const { handleRecordTrial, handleFinishExperiment, handleDeleteExperiment, showToast } =
    useApp();

  const [value, setValue] = useState('');
  const [note, setNote] = useState('');

  const analysis = useMemo(() => analyseExperiment(experiment), [experiment]);
  const conclusion = conclusionOf(experiment, analysis);
  const { metric, test, armA, armB, progress } = analysis;

  const isRunning = experiment.status === 'running';
  const pendingLabel =
    experiment.pendingCondition === 'A' ? experiment.conditionA : experiment.conditionB;

  const submitTrial = (event) => {
    event.preventDefault();
    const numeric = Number(value);

    if (value === '' || Number.isNaN(numeric)) {
      showToast('Nhập một số cho kết quả đo của phiên này.', 'error');
      return;
    }
    if (numeric < metric.min || numeric > metric.max) {
      showToast(
        `Giá trị cần nằm trong khoảng ${metric.min}–${metric.max} ${metric.unit}.`,
        'error'
      );
      return;
    }

    handleRecordTrial(experiment, { value: numeric, note });
    setValue('');
    setNote('');
  };

  return (
    <section className={`panel exp ${isRunning ? '' : 'is-locked'}`}>
      <div className="exp-head">
        <div className="grow">
          <div className="exp-title-row">
            <h3>{experiment.title}</h3>
            <span className={`badge ${isRunning ? 'badge-accent' : 'badge-muted'}`}>
              {isRunning ? 'Đang chạy' : 'Đã chốt'}
            </span>
          </div>
          <p className="exp-hypothesis">
            <span className="mono">H₁</span> {experiment.hypothesis}
          </p>
        </div>

        <div className="row" style={{ gap: '0.35rem' }}>
          <button
            className="icon-btn"
            onClick={() => handleFinishExperiment(experiment)}
            title={isRunning ? 'Chốt thí nghiệm' : 'Mở lại để thu thêm dữ liệu'}
            aria-label={isRunning ? 'Chốt thí nghiệm' : 'Mở lại thí nghiệm'}
          >
            {isRunning ? <Lock size={16} /> : <RotateCcw size={16} />}
          </button>
          <button
            className="icon-btn icon-btn-danger"
            onClick={() => handleDeleteExperiment(experiment.id)}
            aria-label={`Xóa thí nghiệm ${experiment.title}`}
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div className="exp-meta mono">
        <span>Biến đo: {metric.label}</span>
        <span>·</span>
        <span>
          {progress.completed}/{progress.target} phiên
        </span>
        <span>·</span>
        <span>Ngẫu nhiên hóa theo khối 2</span>
      </div>

      <ProgressBar percent={progress.percent} size="sm" />

      <div className="exp-body">
        <div className="exp-col">
          <ArmPlot
            armA={armA}
            armB={armB}
            labelA={experiment.conditionA}
            labelB={experiment.conditionB}
            unit={metric.unit}
          />

          {isRunning && (
            <form className="trial-form" onSubmit={submitTrial}>
              <div className="trial-assignment">
                <Dices size={16} aria-hidden="true" />
                <div>
                  <span className="trial-assignment-label mono">
                    Phiên tiếp theo — điều kiện
                  </span>
                  <strong>
                    {experiment.pendingCondition}. {pendingLabel}
                  </strong>
                </div>
              </div>

              <div className="field">
                <label htmlFor={`val-${experiment.id}`}>
                  {metric.label} <span className="t-dim">({metric.unit})</span>
                </label>
                <input
                  id={`val-${experiment.id}`}
                  type="number"
                  inputMode="numeric"
                  min={metric.min}
                  max={metric.max}
                  step={metric.step}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="0"
                />
                <span className="field-hint">{metric.hint}</span>
              </div>

              <div className="field">
                <label htmlFor={`note-${experiment.id}`}>Ghi chú (không bắt buộc)</label>
                <input
                  id={`note-${experiment.id}`}
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Ngủ ít, học ở thư viện…"
                />
              </div>

              <button type="submit" className="btn btn-primary btn-block">
                Ghi kết quả phiên {experiment.trials.length + 1}
              </button>
            </form>
          )}
        </div>

        <div className="exp-col">
          <div className={`conclusion conclusion-${conclusion.tone}`}>
            <strong>{conclusion.headline}</strong>
            <p>{conclusion.body}</p>
          </div>

          <ResultTable test={test} metric={metric} />

          {test.valid && analysis.underpowered && (
            <p className="method-note method-note-warn">
              <TriangleAlert size={14} aria-hidden="true" />
              <span>
                Mỗi nhóm nên đạt {RECOMMENDED_TRIALS_PER_ARM} phiên (hiện {armA.length}/
                {armB.length}). Dưới mức đó, khả năng phát hiện khác biệt thật còn thấp và kết
                quả dễ dao động mạnh khi thêm dữ liệu.
              </span>
            </p>
          )}
        </div>
      </div>

      {experiment.trials.length > 0 && (
        <details className="exp-log">
          <summary>Nhật ký {experiment.trials.length} phiên</summary>
          <div className="exp-log-list">
            {[...experiment.trials].reverse().map((trial, index) => (
              <div className="exp-log-row" key={trial.id}>
                <span className={`arm-tag mono arm-tag-${trial.condition.toLowerCase()}`}>
                  {trial.condition}
                </span>
                <span className="mono">#{experiment.trials.length - index}</span>
                <span className="mono exp-log-value">
                  {trial.value} {metric.unit}
                </span>
                <span className="t-xs t-dim truncate grow">{trial.note || '—'}</span>
                <span className="t-xs t-dim mono">
                  {new Date(trial.at).toLocaleDateString('vi-VN', {
                    day: '2-digit',
                    month: '2-digit'
                  })}
                </span>
              </div>
            ))}
          </div>
        </details>
      )}
    </section>
  );
};

/* ==========================================================================
   EXPERIMENT LAB
   ========================================================================== */
export const ExperimentLab = () => {
  const { experiments, handleCreateExperiment } = useApp();

  const [isOpen, setIsOpen] = useState(false);
  const [design, setDesign] = useState({
    title: '',
    hypothesis: '',
    conditionA: '',
    conditionB: '',
    metric: METRICS[0].id,
    targetPerArm: RECOMMENDED_TRIALS_PER_ARM
  });

  const applyTemplate = (template) => {
    setDesign({
      title: template.title,
      hypothesis: template.hypothesis,
      conditionA: template.conditionA,
      conditionB: template.conditionB,
      metric: template.metric,
      targetPerArm: RECOMMENDED_TRIALS_PER_ARM
    });
    setIsOpen(true);
  };

  const submit = (event) => {
    event.preventDefault();
    handleCreateExperiment({
      ...design,
      targetPerArm: Math.max(MIN_TRIALS_PER_ARM, Number(design.targetPerArm))
    });
    setIsOpen(false);
    setDesign({
      title: '',
      hypothesis: '',
      conditionA: '',
      conditionB: '',
      metric: METRICS[0].id,
      targetPerArm: RECOMMENDED_TRIALS_PER_ARM
    });
  };

  const running = experiments.filter((e) => e.status === 'running').length;

  return (
    <div className="stack-5">
      <Hero
        eyebrow="Thí nghiệm N-of-1"
        icon={<FlaskConical size={12} />}
        title="Đừng Tin Mẹo Học. Hãy Kiểm Chứng Nó."
        description="Khai báo giả thuyết trước, để Blooom bốc ngẫu nhiên điều kiện cho từng phiên, rồi đọc kết quả bằng kiểm định Welch kèm cỡ tác động và khoảng tin cậy."
        action={
          <button className="btn btn-primary" onClick={() => setIsOpen(true)}>
            <Plus size={16} /> Thí Nghiệm Mới
          </button>
        }
      />

      <div className="protocol-bar">
        <span className="protocol-step">
          <span className="mono">01</span> Khai báo giả thuyết &amp; biến đo
        </span>
        <span className="protocol-step">
          <span className="mono">02</span> Bốc ngẫu nhiên theo khối 2
        </span>
        <span className="protocol-step">
          <span className="mono">03</span> Ghi kết quả từng phiên
        </span>
        <span className="protocol-step">
          <span className="mono">04</span> Kiểm định Welch &amp; cỡ tác động
        </span>
      </div>

      {experiments.length === 0 ? (
        <>
          <EmptyState
            icon={<FlaskConical size={30} />}
            title="Chưa có thí nghiệm nào"
            description="Chọn một thiết kế có sẵn bên dưới, hoặc tự viết giả thuyết của riêng bạn."
          />

          <section className="panel panel-pad">
            <div className="section-head">
              <span className="section-head-icon">
                <Sigma size={16} />
              </span>
              <div className="grow">
                <h3>Thiết Kế Có Sẵn</h3>
                <span className="t-xs t-dim">
                  Bốn câu hỏi trả lời được bằng dữ liệu Blooom đã thu
                </span>
              </div>
            </div>

            <div className="grid grid-2">
              {TEMPLATES.map((template) => (
                <button
                  className="template-card"
                  key={template.id}
                  onClick={() => applyTemplate(template)}
                >
                  <strong>{template.title}</strong>
                  <span className="template-hypothesis">{template.hypothesis}</span>
                  <span className="template-arms mono">
                    A — {template.conditionA} · B — {template.conditionB}
                  </span>
                  <span className="template-metric mono">
                    Đo: {metricById(template.metric).label}
                  </span>
                </button>
              ))}
            </div>
          </section>
        </>
      ) : (
        <>
          <p className="t-sm t-dim" style={{ margin: 0 }}>
            {experiments.length} thí nghiệm · {running} đang chạy
          </p>
          {experiments.map((experiment) => (
            <ExperimentCard key={experiment.id} experiment={experiment} />
          ))}
        </>
      )}

      <p className="method-note">
        <Info size={14} aria-hidden="true" />
        <span>
          <b>Giới hạn của thiết kế này.</b> Thí nghiệm N-of-1 trong Blooom không làm mù (bạn
          biết mình đang ở điều kiện nào) và không có giai đoạn rửa trôi giữa các phiên, nên
          không loại trừ được hiệu ứng thứ tự, hiệu ứng kỳ vọng hay ảnh hưởng của ngày hôm đó.
          Kết quả áp dụng cho riêng bạn, không suy rộng cho người khác.
        </span>
      </p>

      {/* ---------------------------------------------------------------- */}
      {/* Design form                                                       */}
      {/* ---------------------------------------------------------------- */}
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Thiết Kế Thí Nghiệm"
        icon={
          <span className="section-head-icon">
            <FlaskConical size={16} />
          </span>
        }
      >
        <form onSubmit={submit}>
          <div className="modal-body">
            <p className="t-xs t-dim" style={{ marginTop: 0 }}>
              Mọi trường dưới đây được khóa lại sau khi bạn ghi phiên đầu tiên — đó là điều
              khiến đây là một thí nghiệm chứ không phải một cuốn nhật ký.
            </p>

            <div className="field">
              <label htmlFor="expTitle">Câu hỏi nghiên cứu</label>
              <input
                id="expTitle"
                type="text"
                value={design.title}
                onChange={(e) => setDesign({ ...design, title: e.target.value })}
                placeholder="Pomodoro 25 phút hay 50 phút?"
                required
              />
            </div>

            <div className="field">
              <label htmlFor="expHypothesis">Giả thuyết H₁</label>
              <textarea
                id="expHypothesis"
                value={design.hypothesis}
                onChange={(e) => setDesign({ ...design, hypothesis: e.target.value })}
                placeholder="Phiên 50 phút cho số phút tập trung thực sự cao hơn phiên 25 phút."
                required
              />
              <span className="field-hint">
                Nêu rõ chiều của hiệu ứng bạn dự đoán, trước khi thu dữ liệu.
              </span>
            </div>

            <div className="field">
              <label htmlFor="expA">Điều kiện A</label>
              <input
                id="expA"
                type="text"
                value={design.conditionA}
                onChange={(e) => setDesign({ ...design, conditionA: e.target.value })}
                placeholder="Pomodoro 25′ / nghỉ 5′"
                required
              />
            </div>

            <div className="field">
              <label htmlFor="expB">Điều kiện B</label>
              <input
                id="expB"
                type="text"
                value={design.conditionB}
                onChange={(e) => setDesign({ ...design, conditionB: e.target.value })}
                placeholder="Pomodoro 50′ / nghỉ 10′"
                required
              />
            </div>

            <div className="field">
              <label htmlFor="expMetric">Biến đo kết quả</label>
              <select
                id="expMetric"
                value={design.metric}
                onChange={(e) => setDesign({ ...design, metric: e.target.value })}
              >
                {METRICS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
              <span className="field-hint">{metricById(design.metric).hint}</span>
            </div>

            <div className="field">
              <label htmlFor="expTarget">Số phiên mục tiêu mỗi nhóm</label>
              <input
                id="expTarget"
                type="number"
                min={MIN_TRIALS_PER_ARM}
                max="50"
                value={design.targetPerArm}
                onChange={(e) => setDesign({ ...design, targetPerArm: e.target.value })}
                required
              />
              <span className="field-hint">
                Khuyến nghị {RECOMMENDED_TRIALS_PER_ARM} phiên mỗi nhóm; tối thiểu{' '}
                {MIN_TRIALS_PER_ARM} để chạy được kiểm định.
              </span>
            </div>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsOpen(false)}
            >
              Hủy
            </button>
            <button type="submit" className="btn btn-primary">
              Bắt Đầu Thí Nghiệm
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
