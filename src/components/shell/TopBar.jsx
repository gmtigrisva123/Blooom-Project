import { Search } from 'lucide-react';
import { useTimer } from '../../context/TimerContext';
import { hrefFor, onLinkClick } from '../../lib/router';
import { clock } from '../../lib/time';
import { Logo, ThemeToggle } from '../ui/bits';
import { AccountMenu } from './AccountMenu';

const IS_MAC = /Mac|iPhone|iPad/.test(globalThis.navigator?.platform || '');

/* The running timer, visible from every page except the timer's own. */
const TimerPill = ({ hidden }) => {
  const timer = useTimer();
  if (hidden || timer.isIdle) return null;

  return (
    <a
      className={`timer-pill ${timer.isRunning ? 'is-running' : ''} is-${timer.mode}`}
      href={hrefFor('tap-trung')}
      onClick={onLinkClick('tap-trung')}
      aria-label={`${timer.mode === 'work' ? 'Đang tập trung' : 'Đang nghỉ'}, còn ${clock(timer.remainingSeconds)}. Mở đồng hồ.`}
    >
      <i aria-hidden="true" />
      <span className="num">{clock(timer.remainingSeconds)}</span>
      <span className="timer-pill-label">
        {timer.mode === 'work' ? (timer.isRunning ? 'Đang học' : 'Tạm dừng') : 'Nghỉ'}
      </span>
    </a>
  );
};

export const TopBar = ({ page, theme, onToggleTheme, onOpenSearch, onSaveAccount }) => (
  <header className="top">
    <a className="top-logo" href={hrefFor('hom-nay')} onClick={onLinkClick('hom-nay')}>
      <Logo height={32} />
    </a>

    <button type="button" className="search-trigger" onClick={onOpenSearch}>
      <Search size={18} aria-hidden="true" />
      <span className="grow">Tìm thẻ, nhóm, tài liệu…</span>
      <kbd>{IS_MAC ? '⌘ K' : 'Ctrl K'}</kbd>
    </button>

    <div className="top-actions">
      <TimerPill hidden={page.id === 'focus'} />
      <button
        type="button"
        className="icon-btn search-icon"
        onClick={onOpenSearch}
        aria-label="Tìm kiếm"
      >
        <Search size={20} />
      </button>
      <span className="top-theme">
        <ThemeToggle theme={theme} onToggle={onToggleTheme} />
      </span>
      <AccountMenu theme={theme} onToggleTheme={onToggleTheme} onSaveAccount={onSaveAccount} />
    </div>
  </header>
);
