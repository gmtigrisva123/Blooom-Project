import { useMemo, useState } from 'react';
import { Lock, Plus, Trash2, Users } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { subjectColor } from '../../lib/subjects';
import {
  Empty,
  PageHead,
  SearchField,
  SubjectChips,
  SubjectSelect,
  SubjectTag
} from '../ui/bits';
import { Dialog } from '../ui/Dialog';
import { ConfirmDialog } from '../ui/ConfirmDialog';

const CreateGroupForm = ({ onClose }) => {
  const { addGroup } = useApp();
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('Toán');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    if (!name.trim() || busy) return;
    setBusy(true);
    const created = await addGroup({ name, subject, description, isPrivate });
    setBusy(false);
    if (created) onClose();
  };

  return (
    <form className="dialog-form" onSubmit={submit}>
      <div className="dialog-body">
        <div className="field">
          <label htmlFor="groupName">Tên nhóm</label>
          <input
            id="groupName"
            className="input"
            type="text"
            maxLength={160}
            placeholder="Ví dụ: Ôn Toán 12 mỗi tối"
            value={name}
            onChange={(event) => setName(event.target.value)}
            data-autofocus
          />
        </div>
        <div className="field">
          <label htmlFor="groupSubject">Môn</label>
          <SubjectSelect id="groupSubject" value={subject} onChange={setSubject} />
        </div>
        <div className="field">
          <label htmlFor="groupAbout">Giới thiệu ngắn (không bắt buộc)</label>
          <textarea
            id="groupAbout"
            className="textarea"
            rows={2}
            placeholder="Nhóm học gì, lúc nào?"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </div>
        <div className="field">
          <label className="switch" htmlFor="groupPrivate">
            <input
              id="groupPrivate"
              type="checkbox"
              checked={isPrivate}
              onChange={(event) => setIsPrivate(event.target.checked)}
            />
            <span className="switch-track" aria-hidden="true" />
            <span className="field-label">Nhóm riêng tư</span>
          </label>
          <span className="field-hint">Bật lên thì người khác không tìm thấy nhóm này.</span>
        </div>
      </div>
      <div className="dialog-foot">
        <button type="button" className="btn btn-ghost" onClick={onClose}>
          Hủy
        </button>
        <button type="submit" className="btn btn-primary" disabled={!name.trim() || busy}>
          {busy ? 'Đang tạo…' : 'Tạo nhóm'}
        </button>
      </div>
    </form>
  );
};

/* ==========================================================================
   GROUPS — find people studying the same subject, or start a group.
   ========================================================================== */
export const Groups = () => {
  const { groups, user, toggleJoinGroup, deleteGroup } = useApp();

  const [scope, setScope] = useState('all');
  const [subject, setSubject] = useState(null);
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const [doomed, setDoomed] = useState(null);
  const [pendingId, setPendingId] = useState(null);

  const mine = useMemo(
    () => groups.filter((group) => group.members.includes(user.id)),
    [groups, user.id]
  );

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (scope === 'mine' ? mine : groups)
      .filter((group) => !subject || group.subject === subject)
      .filter(
        (group) =>
          !needle ||
          group.name.toLowerCase().includes(needle) ||
          group.description.toLowerCase().includes(needle)
      );
  }, [groups, mine, scope, subject, query]);

  const toggle = async (group) => {
    setPendingId(group.id);
    await toggleJoinGroup(group.id);
    setPendingId(null);
  };

  const createButton = (
    <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}>
      <Plus size={18} aria-hidden="true" /> Tạo nhóm
    </button>
  );

  return (
    <div className="stack-lg">
      <PageHead
        title="Nhóm học"
        description="Tìm nhóm theo môn, hoặc lập nhóm của riêng bạn."
        action={groups.length > 0 && createButton}
      />

      {groups.length === 0 ? (
        <div className="card">
          <Empty title="Chưa có nhóm nào" action={createButton}>
            Hãy là người mở nhóm đầu tiên và rủ bạn bè vào học cùng.
          </Empty>
        </div>
      ) : (
        <>
          <div className="toolbar">
            <div className="segmented" role="group" aria-label="Phạm vi">
              <button
                type="button"
                className={scope === 'all' ? 'is-active' : ''}
                aria-pressed={scope === 'all'}
                onClick={() => setScope('all')}
              >
                Tất cả
              </button>
              <button
                type="button"
                className={scope === 'mine' ? 'is-active' : ''}
                aria-pressed={scope === 'mine'}
                onClick={() => setScope('mine')}
              >
                Nhóm của tôi{mine.length > 0 ? ` (${mine.length})` : ''}
              </button>
            </div>
            <SearchField value={query} onChange={setQuery} placeholder="Tìm nhóm…" />
          </div>

          <SubjectChips value={subject} onChange={setSubject} allLabel="Mọi môn" />

          {visible.length === 0 ? (
            <div className="card">
              <Empty
                title={scope === 'mine' ? 'Bạn chưa vào nhóm nào' : 'Không tìm thấy nhóm nào'}
                action={
                  scope === 'mine' && (
                    <button type="button" className="btn" onClick={() => setScope('all')}>
                      Xem tất cả nhóm
                    </button>
                  )
                }
              >
                {scope === 'mine'
                  ? 'Vào một nhóm để học cùng mọi người.'
                  : 'Thử từ khóa khác, hoặc tự tạo nhóm mới.'}
              </Empty>
            </div>
          ) : (
            <ul className="groups">
              {visible.map((group) => {
                const isOwner = group.ownerId === user.id;
                const isMember = group.members.includes(user.id);
                return (
                  <li
                    key={group.id}
                    className="card group"
                    style={{ '--dot': subjectColor(group.subject) }}
                  >
                    <div className="row-between">
                      <SubjectTag subject={group.subject} />
                      {group.isPrivate && (
                        <span className="tag">
                          <Lock size={12} aria-hidden="true" /> Riêng tư
                        </span>
                      )}
                    </div>

                    <div className="grow">
                      <h3>{group.name}</h3>
                      {group.description && (
                        <p className="small muted clamp-2">{group.description}</p>
                      )}
                    </div>

                    <div className="row-between group-foot">
                      <span className="small muted row" style={{ gap: 6 }}>
                        <Users size={16} aria-hidden="true" />
                        {group.memberCount} thành viên
                      </span>

                      {isOwner ? (
                        <div className="row" style={{ gap: 4 }}>
                          <span className="tag">Nhóm của bạn</span>
                          <button
                            type="button"
                            className="icon-btn is-danger"
                            onClick={() => setDoomed(group)}
                            aria-label={`Xóa nhóm ${group.name}`}
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className={`btn btn-sm ${isMember ? '' : ''}`}
                          onClick={() => toggle(group)}
                          disabled={pendingId === group.id}
                        >
                          {isMember ? 'Rời nhóm' : 'Tham gia'}
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}

      <Dialog open={creating} onClose={() => setCreating(false)} title="Tạo nhóm học">
        <CreateGroupForm onClose={() => setCreating(false)} />
      </Dialog>

      <ConfirmDialog
        open={Boolean(doomed)}
        onClose={() => setDoomed(null)}
        onConfirm={() => deleteGroup(doomed.id)}
        title="Xóa nhóm này?"
        description={doomed ? `“${doomed.name}” sẽ biến mất với mọi thành viên.` : ''}
      />
    </div>
  );
};
