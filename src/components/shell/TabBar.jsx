import { useState } from 'react';
import { Ellipsis } from 'lucide-react';
import { PAGES } from '../../lib/nav';
import { hrefFor, navigate, onLinkClick } from '../../lib/router';
import { Dialog } from '../ui/Dialog';

const PRIMARY = PAGES.filter((page) => page.mobile);
const REST = PAGES.filter((page) => !page.mobile);

/* ==========================================================================
   TAB BAR — the phone's navigation: four everyday places within thumb reach
   and everything else one tap away under "Thêm".
   ========================================================================== */
export const TabBar = ({ activeId }) => {
  const [moreOpen, setMoreOpen] = useState(false);
  const inMore = REST.some((page) => page.id === activeId);

  return (
    <>
      <nav className="tabs" aria-label="Các trang">
        {PRIMARY.map((page) => {
          const Icon = page.icon;
          const active = page.id === activeId;
          return (
            <a
              key={page.id}
              className={`tab ${active ? 'is-active' : ''}`}
              href={hrefFor(page.route)}
              onClick={onLinkClick(page.route)}
              aria-current={active ? 'page' : undefined}
            >
              <Icon size={22} aria-hidden="true" />
              {page.label}
            </a>
          );
        })}
        <button
          type="button"
          className={`tab ${inMore ? 'is-active' : ''}`}
          onClick={() => setMoreOpen(true)}
        >
          <Ellipsis size={22} aria-hidden="true" />
          Thêm
        </button>
      </nav>

      <Dialog open={moreOpen} onClose={() => setMoreOpen(false)} title="Thêm">
        <div className="dialog-body">
          <div className="more-list">
            {REST.map((page) => {
              const Icon = page.icon;
              return (
                <button
                  key={page.id}
                  type="button"
                  className={`more-item ${page.id === activeId ? 'is-active' : ''}`}
                  onClick={() => {
                    setMoreOpen(false);
                    navigate(page.route);
                  }}
                >
                  <span className="more-icon" aria-hidden="true">
                    <Icon size={20} />
                  </span>
                  <span>
                    <strong>{page.label}</strong>
                    <span className="small muted">{page.hint}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </Dialog>
    </>
  );
};
