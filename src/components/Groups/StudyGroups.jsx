import { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { CreateGroupModal } from './CreateGroupModal';
import { SUBJECT_VALUES, subjectColor } from '../../constants/subjects';
import {
  Hero,
  EmptyState,
  SearchInput,
  ChipRow,
  SubjectBadge,
  SkeletonCards
} from '../common/ui';
import { Plus, Users, Lock, Globe, Check, UserPlus, Compass, SearchX } from 'lucide-react';

const ALL = 'All';
const MINE = 'Mine';

export const StudyGroups = () => {
  const { groups, user, handleToggleJoinGroup, isBooting } = useApp();
  const [filter, setFilter] = useState(ALL);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const joinedCount = useMemo(
    () => groups.filter((g) => g.members.includes(user.id)).length,
    [groups, user.id]
  );

  const filterOptions = useMemo(
    () => [
      { value: ALL, label: 'Tất Cả Môn', count: groups.length },
      { value: MINE, label: 'Nhóm Của Tôi', count: joinedCount },
      ...SUBJECT_VALUES.filter((s) => s !== 'Khác').map((subject) => ({
        value: subject,
        label: subject,
        count: groups.filter((g) => g.subject === subject).length
      }))
    ],
    [groups, joinedCount]
  );

  const filteredGroups = useMemo(() => {
    const query = search.trim().toLowerCase();
    return groups.filter((group) => {
      const matchFilter =
        filter === ALL ||
        (filter === MINE ? group.members.includes(user.id) : group.subject === filter);

      const matchSearch =
        !query ||
        group.name.toLowerCase().includes(query) ||
        (group.description || '').toLowerCase().includes(query);

      return matchFilter && matchSearch;
    });
  }, [groups, filter, search, user.id]);

  return (
    <div className="stack-5">
      <Hero
        eyebrow="Tìm nhóm học thông minh"
        icon={<Compass size={12} />}
        title="Học Cùng Nhóm — Tiến Bộ Mỗi Ngày"
        description="Kết nối với bạn bè cùng môn học, trao đổi bài tập và cùng nhau xây dựng thói quen học tập kỷ luật."
        action={
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
            <Plus size={16} /> Tạo Nhóm Mới
          </button>
        }
      />

      <div className="toolbar">
        <ChipRow options={filterOptions} value={filter} onChange={setFilter} />
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Tìm theo tên nhóm hoặc từ khóa..."
          label="Tìm kiếm nhóm học"
        />
      </div>

      {isBooting ? (
        <SkeletonCards count={6} media={false} />
      ) : filteredGroups.length === 0 ? (
        <EmptyState
          icon={search ? <SearchX size={30} /> : <Users size={30} />}
          title={search ? 'Không tìm thấy nhóm nào' : 'Chưa có nhóm học ở mục này'}
          description={
            search
              ? `Không có nhóm nào khớp với “${search}”. Thử từ khóa khác hoặc tạo nhóm mới nhé!`
              : 'Hãy là người đầu tiên tạo nhóm học cho môn này và mời bạn bè cùng tham gia.'
          }
          action={
            <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
              <Plus size={16} /> Tạo Nhóm Mới
            </button>
          }
        />
      ) : (
        <div className="grid grid-3 stagger">
          {filteredGroups.map((group) => {
            const isMember = group.members.includes(user.id);
            const color = subjectColor(group.subject);
            /* Show up to three member initials, then a "+N" pip. */
            const pips = group.members.slice(0, 2);
            const rest = group.memberCount - pips.length;

            return (
              <article
                key={group.id}
                className={`group-card ${isMember ? 'is-member' : ''}`}
                style={{ '--subject-color': color }}
              >
                <div className="row-between mb-3">
                  <SubjectBadge subject={group.subject} />
                  <span className="group-privacy">
                    {group.isPrivate ? (
                      <>
                        <Lock size={12} color="var(--c-amber-2)" /> Riêng tư
                      </>
                    ) : (
                      <>
                        <Globe size={12} color="var(--c-emerald-2)" /> Công khai
                      </>
                    )}
                  </span>
                </div>

                <h3>{group.name}</h3>
                <p className="group-desc clamp-3">{group.description}</p>

                <div className="group-foot">
                  <div className="row" style={{ gap: '0.5rem' }}>
                    <div className="avatar-stack" aria-hidden="true">
                      {pips.map((memberId) => (
                        <span className="avatar-pip" key={memberId}>
                          {memberId.slice(-1).toUpperCase()}
                        </span>
                      ))}
                      {rest > 0 && <span className="avatar-pip is-rest">+{rest}</span>}
                    </div>
                    <span
                      className="t-xs t-dim row"
                      style={{ gap: '0.25rem' }}
                      title={`${group.memberCount} thành viên`}
                    >
                      <Users size={13} />
                      {group.memberCount}
                    </span>
                  </div>

                  <button
                    onClick={() => handleToggleJoinGroup(group.id)}
                    className={`btn btn-sm ${isMember ? 'btn-secondary' : 'btn-primary'}`}
                    title={isMember ? 'Nhấn để rời nhóm' : 'Tham gia nhóm này'}
                  >
                    {isMember ? (
                      <>
                        <Check size={13} /> Đã Tham Gia
                      </>
                    ) : (
                      <>
                        <UserPlus size={13} /> {group.isPrivate ? 'Gửi Yêu Cầu' : 'Tham Gia'}
                      </>
                    )}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <CreateGroupModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
};
