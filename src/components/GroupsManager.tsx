import { useState, useEffect } from 'react';
import { useTheme } from '../ThemeContext';
import { 
  Group, 
  GroupMember,
  createGroup, 
  joinGroup, 
  getUserGroups, 
  getGroupMembers,
  leaveGroup,
  deleteGroup
} from '../services/authService';

export default function GroupsManager() {
  const { theme } = useTheme();
  const [groups, setGroups] = useState<(Group & { member_count: number })[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadGroups();
  }, []);

  useEffect(() => {
    if (selectedGroup) {
      loadMembers(selectedGroup);
    }
  }, [selectedGroup]);

  const loadGroups = async () => {
    try {
      const userGroups = await getUserGroups();
      setGroups(userGroups);
    } catch (err: any) {
      console.error('Error loading groups:', err);
    }
  };

  const loadMembers = async (groupId: string) => {
    try {
      const groupMembers = await getGroupMembers(groupId);
      setMembers(groupMembers);
    } catch (err: any) {
      console.error('Error loading members:', err);
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;
    
    setLoading(true);
    setError('');
    
    try {
      const group = await createGroup(newGroupName);
      setGroups([...groups, { ...group, member_count: 1 }]);
      setShowCreateModal(false);
      setNewGroupName('');
      setSelectedGroup(group.id);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinGroup = async () => {
    if (!inviteCode.trim()) return;
    
    setLoading(true);
    setError('');
    
    try {
      const group = await joinGroup(inviteCode);
      await loadGroups();
      setShowJoinModal(false);
      setInviteCode('');
      setSelectedGroup(group.id);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveGroup = async (groupId: string) => {
    if (!confirm('Вы уверены, что хотите покинуть группу?')) return;
    
    try {
      await leaveGroup(groupId);
      await loadGroups();
      if (selectedGroup === groupId) {
        setSelectedGroup(null);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!confirm('Вы уверены, что хотите удалить группу? Это действие нельзя отменить.')) return;
    
    try {
      await deleteGroup(groupId);
      await loadGroups();
      if (selectedGroup === groupId) {
        setSelectedGroup(null);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const copyInviteCode = (code: string) => {
    navigator.clipboard.writeText(code);
    alert('Код приглашения скопирован!');
  };

  return (
    <div style={{
      background: theme.bgCard,
      borderRadius: '12px',
      padding: '20px',
      marginBottom: '20px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ margin: 0, color: theme.textPrimary, fontSize: '18px' }}>
          Мои группы
        </h3>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setShowCreateModal(true)}
            style={{
              padding: '8px 16px',
              background: theme.accent1,
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            + Создать группу
          </button>
          <button
            onClick={() => setShowJoinModal(true)}
            style={{
              padding: '8px 16px',
              background: theme.bgSecondary,
              color: theme.textPrimary,
              border: `1px solid ${theme.borderPrimary}`,
              borderRadius: '8px',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            Присоединиться
          </button>
        </div>
      </div>

      {error && (
        <div style={{
          padding: '12px',
          background: `${theme.danger}15`,
          border: `1px solid ${theme.danger}30`,
          borderRadius: '8px',
          color: theme.danger,
          fontSize: '14px',
          marginBottom: '16px'
        }}>
          {error}
        </div>
      )}

      {groups.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '40px',
          color: theme.textSecondary
        }}>
          <p style={{ margin: '0 0 8px' }}>У вас пока нет групп</p>
          <p style={{ margin: 0, fontSize: '14px' }}>
            Создайте группу или присоединитесь по коду приглашения
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '16px' }}>
          {/* Список групп */}
          <div style={{ flex: '0 0 250px' }}>
            {groups.map((group) => (
              <div
                key={group.id}
                onClick={() => setSelectedGroup(group.id)}
                style={{
                  padding: '12px',
                  background: selectedGroup === group.id ? theme.bgSecondary : 'transparent',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  marginBottom: '8px',
                  border: selectedGroup === group.id ? `1px solid ${theme.borderPrimary}` : '1px solid transparent'
                }}
              >
                <div style={{ fontWeight: 600, color: theme.textPrimary, marginBottom: '4px' }}>
                  {group.name}
                </div>
                <div style={{ fontSize: '12px', color: theme.textSecondary }}>
                  {group.member_count} {group.member_count === 1 ? 'участник' : 'участников'}
                </div>
              </div>
            ))}
          </div>

          {/* Детали выбранной группы */}
          {selectedGroup && (
            <div style={{ flex: 1 }}>
              {(() => {
                const group = groups.find(g => g.id === selectedGroup);
                if (!group) return null;

                const isOwner = members.some(m => m.user_id === (window as any).__currentUser?.id && m.role === 'owner');

                return (
                  <>
                    <div style={{ 
                      padding: '16px', 
                      background: theme.bgSecondary, 
                      borderRadius: '8px',
                      marginBottom: '16px'
                    }}>
                      <div style={{ fontWeight: 600, color: theme.textPrimary, marginBottom: '8px' }}>
                        {group.name}
                      </div>
                      <div style={{ fontSize: '14px', color: theme.textSecondary, marginBottom: '12px' }}>
                        Код приглашения: <code style={{ 
                          background: theme.bgPrimary, 
                          padding: '4px 8px', 
                          borderRadius: '4px',
                          fontFamily: 'monospace'
                        }}>{group.invite_code}</code>
                      </div>
                      <button
                        onClick={() => copyInviteCode(group.invite_code)}
                        style={{
                          padding: '6px 12px',
                          background: theme.accent1,
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '12px',
                          cursor: 'pointer',
                          marginRight: '8px'
                        }}
                      >
                        Копировать код
                      </button>
                      <button
                        onClick={() => handleLeaveGroup(group.id)}
                        style={{
                          padding: '6px 12px',
                          background: 'transparent',
                          color: theme.danger,
                          border: `1px solid ${theme.danger}`,
                          borderRadius: '6px',
                          fontSize: '12px',
                          cursor: 'pointer',
                          marginRight: '8px'
                        }}
                      >
                        Покинуть группу
                      </button>
                      {isOwner && (
                        <button
                          onClick={() => handleDeleteGroup(group.id)}
                          style={{
                            padding: '6px 12px',
                            background: theme.danger,
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '12px',
                            cursor: 'pointer'
                          }}
                        >
                          Удалить группу
                        </button>
                      )}
                    </div>

                    <div>
                      <h4 style={{ margin: '0 0 12px', color: theme.textPrimary }}>
                        Участники
                      </h4>
                      {members.map((member) => (
                        <div
                          key={member.id}
                          style={{
                            padding: '12px',
                            background: theme.bgSecondary,
                            borderRadius: '8px',
                            marginBottom: '8px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 600, color: theme.textPrimary }}>
                              {member.profile?.display_name || member.profile?.username || 'Пользователь'}
                            </div>
                            <div style={{ fontSize: '12px', color: theme.textSecondary }}>
                              {member.profile?.email}
                            </div>
                          </div>
                          <div style={{
                            padding: '4px 8px',
                            background: member.role === 'owner' ? theme.accent1 : theme.bgPrimary,
                            color: member.role === 'owner' ? 'white' : theme.textSecondary,
                            borderRadius: '4px',
                            fontSize: '12px'
                          }}>
                            {member.role === 'owner' ? 'Владелец' : 'Участник'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* Модальное окно создания группы */}
      {showCreateModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: theme.bgCard,
            borderRadius: '12px',
            padding: '24px',
            width: '100%',
            maxWidth: '400px'
          }}>
            <h3 style={{ margin: '0 0 16px', color: theme.textPrimary }}>
              Создать группу
            </h3>
            <input
              type="text"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="Название группы"
              style={{
                width: '100%',
                padding: '12px',
                background: theme.bgSecondary,
                border: `1px solid ${theme.borderPrimary}`,
                borderRadius: '8px',
                color: theme.textPrimary,
                fontSize: '14px',
                marginBottom: '16px',
                outline: 'none'
              }}
            />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={handleCreateGroup}
                disabled={loading || !newGroupName.trim()}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: theme.accent1,
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  cursor: 'pointer',
                  opacity: loading || !newGroupName.trim() ? 0.5 : 1
                }}
              >
                {loading ? 'Создание...' : 'Создать'}
              </button>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewGroupName('');
                  setError('');
                }}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: theme.bgSecondary,
                  color: theme.textPrimary,
                  border: `1px solid ${theme.borderPrimary}`,
                  borderRadius: '8px',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно присоединения */}
      {showJoinModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: theme.bgCard,
            borderRadius: '12px',
            padding: '24px',
            width: '100%',
            maxWidth: '400px'
          }}>
            <h3 style={{ margin: '0 0 16px', color: theme.textPrimary }}>
              Присоединиться к группе
            </h3>
            <input
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              placeholder="Код приглашения"
              style={{
                width: '100%',
                padding: '12px',
                background: theme.bgSecondary,
                border: `1px solid ${theme.borderPrimary}`,
                borderRadius: '8px',
                color: theme.textPrimary,
                fontSize: '14px',
                marginBottom: '16px',
                outline: 'none',
                fontFamily: 'monospace',
                letterSpacing: '2px'
              }}
            />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={handleJoinGroup}
                disabled={loading || !inviteCode.trim()}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: theme.accent1,
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  cursor: 'pointer',
                  opacity: loading || !inviteCode.trim() ? 0.5 : 1
                }}
              >
                {loading ? 'Присоединение...' : 'Присоединиться'}
              </button>
              <button
                onClick={() => {
                  setShowJoinModal(false);
                  setInviteCode('');
                  setError('');
                }}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: theme.bgSecondary,
                  color: theme.textPrimary,
                  border: `1px solid ${theme.borderPrimary}`,
                  borderRadius: '8px',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
