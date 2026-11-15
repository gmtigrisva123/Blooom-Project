import { useApp } from '../../context/AppContext';
import { NAV_GROUPS, PAGES } from '../../lib/nav';
import { hrefFor, onLinkClick } from '../../lib/router';
import { useNow } from '../../lib/time';
import { dailyTotals } from '../../lib/stats';
import { dueQueue } from '../../services/srs';
import { Logo } from '../ui/bits';
import { Garden } from '../ui/Paper';

/* The last seven days as a garden, with the words that go with it. Shared by
   the sidebar (laptop) and the home page (phone, which has no sidebar). */
export const WeekGarden = ({ height = 56 }) => {
  const { sessions, game } = useApp();
  const now = useNow();
  const days = dailyTotals(sessions, 7, now);
  const studied = days.filter((day) => day.minutes > 0).length;

  return (
    <>
      <div>
        <strong className="num">{game.streak.current} ngày liên tiếp</strong>
        <span className="tiny muted">
          Cấp {game.level.level}, {game.level.title.toLowerCase()}
        </span>
      </div>
      <Garden
        days={days}
        height={height}
        label={`Bảy ngày qua bạn học ${studied} ngày. Chuỗi hiện tại: ${game.streak.current} ngày liên tiếp.`}
      />
    </>
  );
};

export const Sidebar = ({ activeId }) => {
  const { cards, loading } = useApp();
  const now = useNow();
  const dueCount = loading ? 0 : dueQueue(cards, now).length;

  return (
    <aside className="side">
      <a className="side-logo" href={hrefFor('hom-nay')} onClick={onLinkClick('hom-nay')}>
        <Logo height={40} />
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

      <a className="side-garden" href={hrefFor('tien-do')} onClick={onLinkClick('tien-do')}>
        <WeekGarden />
      </a>
    </aside>
  );
};
