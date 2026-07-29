import React from 'react';
import { useApp } from '../../context/AppContext';
import { Modal } from '../common/Modal';
import { SHORTCUT_GROUPS } from '../../hooks/useKeyboardShortcuts';
import { Keyboard } from 'lucide-react';

export const ShortcutsModal = () => {
  const { shortcutsOpen, setShortcutsOpen } = useApp();

  return (
    <Modal
      isOpen={shortcutsOpen}
      onClose={() => setShortcutsOpen(false)}
      title="Phím tắt bàn phím"
      icon={
        <span className="section-head-icon">
          <Keyboard size={16} />
        </span>
      }
      footer={
        <button className="btn btn-primary" onClick={() => setShortcutsOpen(false)}>
          Đã hiểu
        </button>
      }
    >
      <div className="modal-body">
        {SHORTCUT_GROUPS.map((group) => (
          <div className="shortcut-group" key={group.title}>
            <div className="shortcut-group-title">{group.title}</div>
            {group.items.map((item) => (
              <div className="shortcut-row" key={item.label}>
                <span>{item.label}</span>
                <span className="shortcut-keys">
                  {item.keys.map((key, i) => (
                    <React.Fragment key={key}>
                      {i > 0 && <span className="t-dim t-xs">+</span>}
                      <span className="kbd">{key}</span>
                    </React.Fragment>
                  ))}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </Modal>
  );
};
