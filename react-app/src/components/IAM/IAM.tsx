import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import ConfirmModal from '../Shared/ConfirmModal';
import styles from './IAM.module.css';

const STORAGE_KEY_IAM_USERS = 'qualitas_iam_users';
const STORAGE_KEY_IAM_ROLES = 'qualitas_iam_roles';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
}

const defaultUsers: User[] = [
  { id: '1', name: 'Administrator', email: 'admin@example.com', role: 'admin', status: 'active', createdAt: '2024-01-01' },
  { id: '2', name: 'John Doe', email: 'john@example.com', role: 'user', status: 'active', createdAt: '2024-01-15' },
];

const defaultRoles: Role[] = [
  { id: '1', name: 'admin', description: '系統管理員，擁有所有權限', permissions: ['read', 'write', 'delete', 'manage_users', 'manage_roles'] },
  { id: '2', name: 'user', description: '一般使用者，擁有基本權限', permissions: ['read', 'write'] },
  { id: '3', name: 'viewer', description: '檢視者，僅有讀取權限', permissions: ['read'] },
  { id: '4', name: 'Quality Manager', description: '品質管理員，擁有所有權限', permissions: ['read', 'write', 'delete', 'manage_users', 'manage_roles'] },
];

function loadUsersFromStorage(): User[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_IAM_USERS);
    if (raw) {
      const parsed = JSON.parse(raw) as User[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (_) {}
  return defaultUsers;
}

function loadRolesFromStorage(): Role[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_IAM_ROLES);
    if (raw) {
      const parsed = JSON.parse(raw) as Role[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (_) {}
  return defaultRoles;
}

const IAM: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'users' | 'roles' | 'permissions'>('users');

  const [users, setUsers] = useState<User[]>(loadUsersFromStorage);
  const [roles, setRoles] = useState<Role[]>(loadRolesFromStorage);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_IAM_USERS, JSON.stringify(users));
    } catch (_) {}
  }, [users]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_IAM_ROLES, JSON.stringify(roles));
    } catch (_) {}
  }, [roles]);

  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editingRole, setEditingRole] = useState<Role | null>(null);

  const [userForm, setUserForm] = useState({
    name: '',
    email: '',
    role: 'user',
    status: 'active' as 'active' | 'inactive',
  });

  const [roleForm, setRoleForm] = useState({
    name: '',
    description: '',
    permissions: [] as string[],
  });

  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; type: 'user' | 'role' | null; id: string | null; message: string }>({
    isOpen: false,
    type: null,
    id: null,
    message: '',
  });

  const availablePermissions = [
    { id: 'read', label: '讀取' },
    { id: 'write', label: '寫入' },
    { id: 'delete', label: '刪除' },
    { id: 'manage_users', label: '管理用戶' },
    { id: 'manage_roles', label: '管理角色' },
  ];

  const handleAddUser = () => {
    setEditingUser(null);
    setUserForm({ name: '', email: '', role: 'user', status: 'active' });
    setIsUserModalOpen(true);
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setUserForm({
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
    });
    setIsUserModalOpen(true);
  };

  const handleSaveUser = () => {
    if (editingUser) {
      setUsers(users.map(u => u.id === editingUser.id ? { ...u, ...userForm } : u));
    } else {
      const newUser: User = {
        id: Date.now().toString(),
        ...userForm,
        createdAt: new Date().toISOString().split('T')[0],
      };
      setUsers([...users, newUser]);
    }
    setIsUserModalOpen(false);
    setEditingUser(null);
  };

  const handleDeleteUserClick = (id: string) => {
    setDeleteModal({ isOpen: true, type: 'user', id, message: '確定要刪除此用戶嗎？' });
  };

  const handleAddRole = () => {
    setEditingRole(null);
    setRoleForm({ name: '', description: '', permissions: [] });
    setIsRoleModalOpen(true);
  };

  const handleEditRole = (role: Role) => {
    setEditingRole(role);
    setRoleForm({
      name: role.name,
      description: role.description,
      permissions: [...role.permissions],
    });
    setIsRoleModalOpen(true);
  };

  const handleSaveRole = () => {
    if (editingRole) {
      setRoles(roles.map(r => r.id === editingRole.id ? { ...r, ...roleForm } : r));
    } else {
      const newRole: Role = {
        id: Date.now().toString(),
        ...roleForm,
      };
      setRoles([...roles, newRole]);
    }
    setIsRoleModalOpen(false);
    setEditingRole(null);
  };

  const handleDeleteRoleClick = (id: string) => {
    setDeleteModal({ isOpen: true, type: 'role', id, message: '確定要刪除此角色嗎？' });
  };

  const handleDeleteConfirm = () => {
    if (deleteModal.id && deleteModal.type === 'user') {
      setUsers(users.filter(u => u.id !== deleteModal.id));
    } else if (deleteModal.id && deleteModal.type === 'role') {
      setRoles(roles.filter(r => r.id !== deleteModal.id));
    }
    setDeleteModal({ isOpen: false, type: null, id: null, message: '' });
  };

  const togglePermission = (permissionId: string) => {
    setRoleForm(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permissionId)
        ? prev.permissions.filter(p => p !== permissionId)
        : [...prev.permissions, permissionId],
    }));
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button type="button" className={styles.backButton} onClick={() => navigate('/')}>
          ← {t('common.back') || 'Back'}
        </button>
        <h1>身份與權限管理 (IAM)</h1>
      </div>

      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'users' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('users')}
        >
          用戶管理
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'roles' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('roles')}
        >
          角色管理
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'permissions' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('permissions')}
        >
          權限預覽表
        </button>
      </div>

      {activeTab === 'users' && (
        <div className={styles.content}>
          <div className={styles.contentHeader}>
            <h2>用戶列表</h2>
            <button className={styles.addButton} onClick={handleAddUser}>
              + 新增用戶
            </button>
          </div>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>姓名</th>
                <th>電子郵件</th>
                <th>角色</th>
                <th>狀態</th>
                <th>建立日期</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>{user.name}</td>
                  <td>{user.email}</td>
                  <td>
                    <span className={styles.roleBadge}>{user.role}</span>
                  </td>
                  <td>
                    <span className={`${styles.statusBadge} ${styles[user.status]}`}>
                      {user.status === 'active' ? '啟用' : '停用'}
                    </span>
                  </td>
                  <td>{user.createdAt}</td>
                  <td>
                    <button
                      className={styles.editButton}
                      onClick={() => handleEditUser(user)}
                    >
                      編輯
                    </button>
                    <button
                      className={styles.deleteButton}
                      onClick={() => handleDeleteUserClick(user.id)}
                    >
                      刪除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'roles' && (
        <div className={styles.content}>
          <div className={styles.contentHeader}>
            <h2>角色列表</h2>
            <button className={styles.addButton} onClick={handleAddRole}>
              + 新增角色
            </button>
          </div>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>角色名稱</th>
                <th>描述</th>
                <th>權限</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {roles.map((role) => (
                <tr key={role.id}>
                  <td>
                    <span className={styles.roleBadge}>{role.name}</span>
                  </td>
                  <td>{role.description}</td>
                  <td>
                    <div className={styles.permissionsList}>
                      {role.permissions.map((perm) => (
                        <span key={perm} className={styles.permissionTag}>
                          {availablePermissions.find(p => p.id === perm)?.label || perm}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td>
                    <button
                      className={styles.editButton}
                      onClick={() => handleEditRole(role)}
                    >
                      編輯
                    </button>
                    <button
                      className={styles.deleteButton}
                      onClick={() => handleDeleteRoleClick(role.id)}
                    >
                      刪除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'permissions' && (
        <div className={styles.content}>
          <div className={styles.contentHeader}>
            <h2>權限預覽表</h2>
            <p className={styles.subtitle}>查看所有權限及其對應的角色</p>
          </div>
          <div className={styles.permissionsTableContainer}>
            <table className={styles.permissionsTable}>
              <thead>
                <tr>
                  <th>權限</th>
                  <th>描述</th>
                  {roles.map((role) => (
                    <th key={role.id} className={styles.roleColumn}>
                      {role.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {availablePermissions.map((perm) => (
                  <tr key={perm.id}>
                    <td className={styles.permissionName}>
                      <span className={styles.permissionTag}>{perm.label}</span>
                    </td>
                    <td className={styles.permissionDesc}>
                      {perm.id === 'read' && '允許讀取資料'}
                      {perm.id === 'write' && '允許建立和修改資料'}
                      {perm.id === 'delete' && '允許刪除資料'}
                      {perm.id === 'manage_users' && '允許管理用戶帳號'}
                      {perm.id === 'manage_roles' && '允許管理角色和權限'}
                    </td>
                    {roles.map((role) => (
                      <td key={role.id} className={styles.checkCell}>
                        {role.permissions.includes(perm.id) ? (
                          <span className={styles.checkMark}>✓</span>
                        ) : (
                          <span className={styles.checkEmpty}>—</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className={styles.summarySection}>
            <h3>權限統計</h3>
            <div className={styles.summaryGrid}>
              {roles.map((role) => (
                <div key={role.id} className={styles.summaryCard}>
                  <div className={styles.summaryHeader}>
                    <span className={styles.roleBadge}>{role.name}</span>
                    <span className={styles.permissionCount}>
                      {role.permissions.length} 個權限
                    </span>
                  </div>
                  <div className={styles.summaryPermissions}>
                    {role.permissions.map((perm) => (
                      <span key={perm} className={styles.permissionTag}>
                        {availablePermissions.find(p => p.id === perm)?.label || perm}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* User Modal */}
      {isUserModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2>{editingUser ? '編輯用戶' : '新增用戶'}</h2>
            <div className={styles.formGroup}>
              <label>姓名</label>
              <input
                type="text"
                value={userForm.name}
                onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                placeholder="輸入姓名"
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label>電子郵件</label>
              <input
                type="email"
                value={userForm.email}
                onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                placeholder="輸入電子郵件"
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label>角色</label>
              <select
                value={userForm.role}
                onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
              >
                {roles.map((role) => (
                  <option key={role.id} value={role.name}>
                    {role.name}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.formGroup}>
              <label>狀態</label>
              <select
                value={userForm.status}
                onChange={(e) =>
                  setUserForm({ ...userForm, status: e.target.value as 'active' | 'inactive' })
                }
              >
                <option value="active">啟用</option>
                <option value="inactive">停用</option>
              </select>
            </div>
            <div className={styles.formActions}>
              <button className={styles.saveButton} onClick={handleSaveUser}>
                {editingUser ? '更新' : '新增'}
              </button>
              <button
                className={styles.cancelButton}
                onClick={() => setIsUserModalOpen(false)}
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Role Modal */}
      {isRoleModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2>{editingRole ? '編輯角色' : '新增角色'}</h2>
            <div className={styles.formGroup}>
              <label>角色名稱</label>
              <input
                type="text"
                value={roleForm.name}
                onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
                placeholder="輸入角色名稱"
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label>描述</label>
              <textarea
                value={roleForm.description}
                onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
                placeholder="輸入角色描述"
                rows={3}
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label>權限</label>
              <div className={styles.permissionsGrid}>
                {availablePermissions.map((perm) => (
                  <label key={perm.id} className={styles.permissionCheckbox}>
                    <input
                      type="checkbox"
                      checked={roleForm.permissions.includes(perm.id)}
                      onChange={() => togglePermission(perm.id)}
                    />
                    <span>{perm.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className={styles.formActions}>
              <button className={styles.saveButton} onClick={handleSaveRole}>
                {editingRole ? '更新' : '新增'}
              </button>
              <button
                className={styles.cancelButton}
                onClick={() => setIsRoleModalOpen(false)}
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={deleteModal.isOpen}
        title="確認刪除"
        message={deleteModal.message || '確定要刪除嗎？'}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteModal({ isOpen: false, type: null, id: null, message: '' })}
        confirmText="Delete"
        cancelText="Cancel"
      />
    </div>
  );
};

export default IAM;
