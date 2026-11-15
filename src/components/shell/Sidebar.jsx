import { Flame } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { NAV_GROUPS, PAGES } from '../../lib/nav';
import { hrefFor, onLinkClick } from '../../lib/router';
import { useNow } from '../../lib/time';
import { dueQueue } from '../../services/srs';
import { addDays, dayKey, startOfDay } from '../../services/gamification';
import { Bar, Logo } from '../ui/bits';

const DOW = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

/* The last seven days as dots: filled when the student studied that day. */
export const WeekDots = ({ days, now }) => {
  const today = startOfDay(now);

  return (
    <div className="week-dots" aria-hidden="true">
      {Array.from({ length: 7 }, (_, i) => {
        const date = addDays(today, i - 6);
        const done = days.has(dayKey(date));
        return (
          <span
            key={i}
            className={`week-dot ${done ? 'is-done' : ''} ${i === 6 ? 'is-today' : ''}`}
          >
            <i />
            {DOW[date.getDay()]}
          </span>
        );
      })}
    </div>
  );
};

export const Sidebar = ({ activeId }) => {
  const { cards, game, loading } = useApp();
  const now = useNow();

  const dueCount = loading ? 0 : dueQueue(cards, now).length;
  const { streak, level } = game;

  return (
    <aside className="side">
      <a className="side-logo" href={hrefFor('hom-nay')} onClick={onLinkClick('hom-nay')}>
        <Logo height={38} />
      </a>

      <nav className="side-nav" aria-label="Các trang">
        {NAV_GROUPS.map((group) => (
          <div key={group.id} className="side-group">
            <span className="side-group-label">{group.label}</span>
            {PAGES.filter((page) => page.group === group.id).map((page) => {
              const Icon = page.icon;
              const active = page.id === activeId;
              return (
                <a
                  key={page.id}
                  className={`side-link ${active ? 'is-active' : ''}`}
                  href={hrefFor(page.route)}
                  onClick={onLinkClick(page.route)}
                  aria-current={active ? 'page' : undefined}
                >
                  <Icon size={20} aria-hidden="true" />
                  <span className="grow">{page.label}</span>
                  {page.id === 'cards' && dueCount > 0 && (
                    <span className="side-badge" aria-label={`${dueCount} thẻ cần ôn`}>
                      {dueCount > 99 ? '99+' : dueCount}
                    </span>
                  )}
                </a>
              );
            })}
          </div>
        ))}
      </nav>

      <a
        className="side-streak"
        href={hrefFor('tien-do')}
        onClick={onLinkClick('tien-do')}
        aria-label={`Chuỗi ${streak.current} ngày học liên tiếp, cấp ${level.level}. Xem tiến độ.`}
      >
        <div className="row">
          <span className={`streak-flame ${streak.current > 0 ? 'is-lit' : ''}`}>
            <Flame size={20} aria-hidden="true" />
          </span>
          <div>
            <strong className="num">{streak.current} ngày</strong>
            <span className="tiny faint">liên tiếp</span>
          </div>
        </div>
        <WeekDots days={streak.days} now={now} />
        <div className="side-level">
          <span className="tiny">
            Cấp {level.level} · {level.title}
          </span>
          <Bar value={level.percent / 100} color="var(--pink)" label="Tiến độ lên cấp" />
        </div>
      </a>
    </aside>
  );
};
