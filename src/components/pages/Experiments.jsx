import { useMemo, useState } from 'react';
import { Check, Dices, FlaskConical, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useToast } from '../../context/ToastContext';
import {
  METRICS,
  RECOMMENDED_TRIALS_PER_ARM,
  TEMPLATES,
  analyseExperiment,
  conclusionOf
} from '../../services/experiments';
import { Bar, Empty, PageHead } from '../ui/bits';
import { Dialog } from '../ui/Dialog';
import { ConfirmDialog } from '../ui/ConfirmDialog';

const BLANK = {
  title: '',
  hypothesis: '',
  conditionA: '',
  conditionB: '',
  metric: METRICS[0].id,
  targetPerArm: RECOMMENDED_TRIALS_PER_ARM
};

const average = (values) =>
  values.length === 0 ? null : values.reduce((sum, value) => sum + value, 0) / values.length;

const oneDecimal = (value) => (Math.round(value * 10) / 10).toString().replace('.', ',');

/* ==========================================================================
   CREATE — what to compare, and the one number to write down each time.
   ========================================================================== */
const CreateForm = ({ initial, onClose }) => {
  const { addExperiment } = useApp();
  const [design, setDesign] = useState(initial);
  const [busy, setBusy] = useState(false);

  const set = (field) => (event) =>
    setDesign((prev) => ({ ...prev, [field]: event.target.value }));

  const ready = design.title.trim() && design.conditionA.trim() && design.conditionB.trim();

  const submit = async (event) => {
    event.preventDefault();
    if (!ready || busy) return;
    setBusy(true);
    const created = await addExperiment({
      ...design,
      targetPerArm: Number(design.targetPerArm)
    });
    setBusy(false);
    if (created) onClose();
  };

  return (
    <form className="dialog-form" onSubmit={submit}>
      <div className="dialog-body">
        <div className="field">
          <label htmlFor="expTitle">Bạn muốn biết điều gì?</label>
          <input
            id="expTitle"
            className="input"
            type="text"
            maxLength={200}
            placeholder="Ví dụ: Nghe nhạc hay im lặng?"
            value={design.title}
            onChange={set('title')}
            data-autofocus
          />
        </div>
        <div className="field-row">
          <div className="field">
            <label htmlFor="expA">Cách A</label>
            <input
              id="expA"
              className="input"
              type="text"
              placeholder="Mở nhạc không lời"
              value={design.conditionA}
              onChange={set('conditionA')}
            />
          </div>
          <div className="field">
            <label htmlFor="expB">Cách B</label>
            <input
              id="expB"
              className="input"
              type="text"
              placeholder="Hoàn toàn im lặng"
              value={design.conditionB}
              onChange={set('conditionB')}
            />
          </div>
        </div>
        <div className="field-row">
          <div className="field">
            <label htmlFor="expMetric">Mỗi buổi bạn ghi lại</label>
            <select
              id="expMetric"
              className="select"
              value={design.metric}
              onChange={set('metric')}
            >
              {METRICS.map((metric) => (
                <option key={metric.id} value={metric.id}>
                  {metric.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="expTarget">Số buổi cho mỗi cách</label>
            <select
              id="expTarget"
              className="select"
              value={design.targetPerArm}
              onChange={set('targetPerArm')}
            >
              {[4, 6, 8, 10, 12].map((count) => (
                <option key={count} value={count}>
                  {count} buổi{count === RECOMMENDED_TRIALS_PER_ARM ? ' (nên chọn)' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="field">
          <label htmlFor="expGuess">Bạn đoán cách nào tốt hơn? (không bắt buộc)</label>
          <input
            id="expGuess"
            className="input"
            type="text"
            placeholder="Mình đoán im lặng sẽ ít xao nhãng hơn"
            value={design.hypothesis}
            onChange={set('hypothesis')}
          />
        </div>
      </div>
      <div className="dialog-foot">
        <button type="button" className="btn btn-ghost" onClick={onClose}>
          Hủy
        </button>
        <button type="submit" className="btn btn-primary" disabled={!ready || busy}>
          {busy ? 'Đang tạo…' : 'Bắt đầu thử nghiệm'}
        </button>
      </div>
    </form>
  );
};

/* ==========================================================================
   ONE EXPERIMENT
   ========================================================================== */
const ExperimentCard = ({ experiment, onDelete }) => {
  const { recordTrial, toggleExperimentDone } = useApp();
  const showToast = useToast();

  const [value, setValue] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const analysis = useMemo(() => analyseExperiment(experiment), [experiment]);
  const verdict = conclusionOf(experiment, analysis);
  const { metric, armA, armB, progress } = analysis;

  const running = experiment.status === 'running';
  const nextIsA = experiment.pendingCondition === 'A';

  const meanA = average(armA);
  const meanB = average(armB);
  const scale = Math.max(meanA || 0, meanB || 0, 1);

  const submit = async (event) => {
    event.preventDefault();
    const number = Number(value);

    if (value === '' || Number.isNaN(number)) {
      showToast('Nhập một con số cho buổi vừa học nhé.', 'error');
      return;
    }
    if (number < metric.min || number > metric.max) {
      showToast(`Con số cần nằm trong khoảng ${metric.min}–${metric.max}.`, 'error');
      return;
    }

    setBusy(true);
    const saved = await recordTrial(experiment, { value: number, note });
    setBusy(false);
    if (saved) {
      setValue('');
      setNote('');
    }
  };

  const arms = [
    { key: 'A', label: experiment.conditionA, mean: meanA, count: armA.length },
    { key: 'B', label: experiment.conditionB, mean: meanB, count: armB.length }
  ];

  return (
    <li className={`card exp ${running ? '' : 'is-closed'}`}>
      <div className="row-between exp-head">
        <div className="grow">
          <div className="row wrap" style={{ gap: 8 }}>
            <h3>{experiment.title}</h3>
            <span className={`tag ${running ? 'tag-violet' : ''}`}>
              {running ? 'Đang chạy' : 'Đã kết thúc'}
            </span>
          </div>
          {experiment.hypothesis && <p className="small muted">{experiment.hypothesis}</p>}
        </div>
        <div className="row" style={{ gap: 2 }}>
          <button
            type="button"
            className="icon-btn"
            onClick={() => toggleExperimentDone(experiment)}
            aria-label={running ? 'Kết thúc thử nghiệm' : 'Mở lại thử nghiệm'}
            title={running ? 'Kết thúc' : 'Mở lại'}
          >
            {running ? <Check size={19} /> : <RotateCcw size={19} />}
          </button>
          <button
            type="button"
            className="icon-btn is-danger"
            onClick={onDelete}
            aria-label={`Xóa thử nghiệm ${experiment.title}`}
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      <div className="exp-body">
        <div className="stack">
          <div className="arms">
            {arms.map((arm) => (
              <div key={arm.key} className={`arm arm-${arm.key.toLowerCase()}`}>
                <div className="row-between">
                  <span className="row" style={{ gap: 8, minWidth: 0 }}>
                    <span className="arm-key">{arm.key}</span>
                    <span className="truncate">{arm.label}</span>
                  </span>
                  <span className="num arm-mean">
                    {arm.mean === null ? '—' : `${oneDecimal(arm.mean)} ${metric.unit}`}
                  </span>
                </div>
                <Bar
                  value={arm.mean === null ? 0 : arm.mean / scale}
                  color={arm.key === 'A' ? 'var(--orange)' : 'var(--violet)'}
                  label={`Trung bình cách ${arm.key}`}
                />
                <span className="tiny faint">{arm.count} buổi</span>
              </div>
            ))}
          </div>

          <div className={`verdict verdict-${verdict.tone}`}>
            <strong>{verdict.headline}</strong>
            <p>{verdict.body}</p>
          </div>

          <div className="exp-progress">
            <Bar value={progress.percent / 100} label="Số buổi đã ghi" />
            <span className="tiny faint">
              {progress.completed}/{progress.target} buổi
            </span>
          </div>
        </div>

        {running && (
          <form className="exp-next" onSubmit={submit}>
            <div className="exp-assign">
              <Dices size={20} aria-hidden="true" />
              <div>
                <span className="tiny">Buổi tới, bạn hãy học theo</span>
                <strong>
                  Cách {experiment.pendingCondition}:{' '}
                  {nextIsA ? experiment.conditionA : experiment.conditionB}
                </strong>
              </div>
            </div>

            <div className="field">
              <label htmlFor={`value-${experiment.id}`}>{metric.label}</label>
              <input
                id={`value-${experiment.id}`}
                className="input"
                type="number"
                inputMode="numeric"
                min={metric.min}
                max={metric.max}
                step={metric.step}
                placeholder="0"
                value={value}
                onChange={(event) => setValue(event.target.value)}
              />
              <span className="field-hint">{metric.hint}</span>
            </div>

            <div className="field">
              <label htmlFor={`note-${experiment.id}`}>Ghi chú (không bắt buộc)</label>
              <input
                id={`note-${experiment.id}`}
                className="input"
                type="text"
                placeholder="Hôm nay hơi mệt, học ở thư viện…"
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
            </div>

            <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
              {busy ? 'Đang ghi…' : `Ghi kết quả buổi ${experiment.trials.length + 1}`}
            </button>
          </form>
        )}
      </div>

      {experiment.trials.length > 0 && (
        <details className="exp-log">
          <summary>Xem {experiment.trials.length} buổi đã ghi</summary>
          <ul className="rows">
            {[...experiment.trials].reverse().map((trial, index) => (
              <li key={trial.id} className="row-item">
                <span className={`arm-key arm-key-${trial.condition.toLowerCase()}`}>
                  {trial.condition}
                </span>
                <span className="small faint">Buổi {experiment.trials.length - index}</span>
                <span className="grow small muted truncate">{trial.note}</span>
                <strong className="num">
                  {trial.value} {metric.unit}
                </strong>
              </li>
            ))}
          </ul>
        </details>
      )}
    </li>
  );
};

/* ==========================================================================
   EXPERIMENTS — try two ways of studying and see which one suits you.
   ========================================================================== */
export const Experiments = () => {
  const { experiments, deleteExperiment } = useApp();

  const [draft, setDraft] = useState(null);
  const [doomed, setDoomed] = useState(null);

  const ordered = useMemo(
    () =>
      [...experiments].sort((a, b) =>
        a.status === b.status ? 0 : a.status === 'running' ? -1 : 1
      ),
    [experiments]
  );

  return (
    <div className="stack-lg">
      <PageHead
        title="Thử nghiệm"
        description="So sánh hai cách học để biết cách nào hợp với bạn."
        action={
          <button type="button" className="btn btn-primary" onClick={() => setDraft(BLANK)}>
            <Plus size={18} aria-hidden="true" /> Tạo thử nghiệm
          </button>
        }
      />

      {experiments.length === 0 && (
        <ol className="how">
          <li>
            <span className="num">1</span>
            <p>
              <strong>Chọn hai cách học</strong> bạn đang phân vân.
            </p>
          </li>
          <li>
            <span className="num">2</span>
            <p>
              Mỗi buổi, <strong>Blooom chọn ngẫu nhiên</strong> một cách cho bạn — để so sánh
              công bằng.
            </p>
          </li>
          <li>
            <span className="num">3</span>
            <p>
              Học xong, <strong>ghi một con số</strong>. Blooom lo phần so sánh.
            </p>
          </li>
        </ol>
      )}

      <section className="stack" aria-labelledby="templates">
        <h2 className="section-title" id="templates">
          {experiments.length === 0 ? 'Chọn một câu hỏi để bắt đầu' : 'Thử câu hỏi khác'}
        </h2>
        <ul className="templates">
          {TEMPLATES.map((template) => (
            <li key={template.id}>
              <button
                type="button"
                className="card template"
                onClick={() => setDraft({ ...BLANK, ...template })}
              >
                <strong>{template.title}</strong>
                <span className="small muted">
                  <span className="arm-key arm-key-a">A</span> {template.conditionA}
                </span>
                <span className="small muted">
                  <span className="arm-key arm-key-b">B</span> {template.conditionB}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      {experiments.length === 0 ? (
        <div className="card">
          <Empty icon={<FlaskConical size={32} />} title="Chưa có thử nghiệm nào">
            Chọn một câu hỏi ở trên, hoặc tự đặt câu hỏi của riêng bạn.
          </Empty>
        </div>
      ) : (
        <section className="stack" aria-labelledby="myExperiments">
          <h2 className="section-title" id="myExperiments">
            Thử nghiệm của bạn
          </h2>
          <ul className="stack">
            {ordered.map((experiment) => (
              <ExperimentCard
                key={experiment.id}
                experiment={experiment}
                onDelete={() => setDoomed(experiment)}
              />
            ))}
          </ul>
        </section>
      )}

      <Dialog
        open={Boolean(draft)}
        onClose={() => setDraft(null)}
        title="Tạo thử nghiệm"
        description="Hai cách học, một con số để so sánh."
      >
        {draft && <CreateForm initial={draft} onClose={() => setDraft(null)} />}
      </Dialog>

      <ConfirmDialog
        open={Boolean(doomed)}
        onClose={() => setDoomed(null)}
        onConfirm={() => deleteExperiment(doomed.id)}
        title="Xóa thử nghiệm này?"
        description={doomed ? `“${doomed.title}” và mọi buổi đã ghi sẽ bị xóa.` : ''}
      />
    </div>
  );
};
