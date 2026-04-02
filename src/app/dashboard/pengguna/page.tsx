'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import { useUser } from '../layout';
import { useRouter } from 'next/navigation';

interface UserItem {
  id: number;
  username: string;
  name: string;
  role: string;
  created_at: string;
}

export default function PenggunaPage() {
  const user = useUser();
  const router = useRouter();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Create modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('guru');
  const [creating, setCreating] = useState(false);

  // Edit modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editUser, setEditUser] = useState<UserItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editRole, setEditRole] = useState('guru');
  const [updating, setUpdating] = useState(false);

  // Delete modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<UserItem | null>(null);
  const [deletingUser, setDeletingUser] = useState(false);

  useEffect(() => {
    if (user && user.role !== 'admin' && user.role !== 'superadmin' && user.role !== 'kepsek') {
      router.push('/dashboard');
      return;
    }
    fetchUsers();
  }, [user, router]);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      if (data.success) {
        setUsers(data.data);
      }
    } catch {
      toast.error('Gagal memuat data pengguna');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newUsername || !newPassword) {
      toast.error('Semua field harus diisi');
      return;
    }

    setCreating(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName,
          username: newUsername,
          password: newPassword,
          userRole: newRole,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Pengguna berhasil ditambahkan');
        setShowCreateModal(false);
        setNewName('');
        setNewUsername('');
        setNewPassword('');
        setNewRole('guru');
        fetchUsers();
      } else {
        toast.error(data.error || 'Gagal membuat pengguna');
      }
    } catch {
      toast.error('Gagal membuat pengguna');
    } finally {
      setCreating(false);
    }
  };

  const openEditModal = (u: UserItem) => {
    setEditUser(u);
    setEditName(u.name);
    setEditUsername(u.username);
    setEditPassword('');
    setEditRole(u.role);
    setShowEditModal(true);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser || !editName || !editUsername) {
      toast.error('Nama dan username harus diisi');
      return;
    }

    setUpdating(true);
    try {
      const res = await fetch(`/api/users/${editUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName,
          username: editUsername,
          password: editPassword || undefined,
          userRole: editRole,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Pengguna berhasil diupdate');
        setShowEditModal(false);
        setEditUser(null);
        fetchUsers();
      } else {
        toast.error(data.error || 'Gagal mengupdate');
      }
    } catch {
      toast.error('Gagal mengupdate pengguna');
    } finally {
      setUpdating(false);
    }
  };

  const openDeleteModal = (u: UserItem) => {
    setDeleteTarget(u);
    setShowDeleteModal(true);
  };

  const handleDeleteUser = async () => {
    if (!deleteTarget) return;

    setDeletingUser(true);
    try {
      const res = await fetch(`/api/users/${deleteTarget.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        toast.success('Pengguna berhasil dihapus');
        setShowDeleteModal(false);
        setDeleteTarget(null);
        fetchUsers();
      } else {
        toast.error(data.error || 'Gagal menghapus');
      }
    } catch {
      toast.error('Gagal menghapus pengguna');
    } finally {
      setDeletingUser(false);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'superadmin':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-amber-50 text-amber-700">Super Admin</span>;
      case 'admin':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-purple-50 text-purple-700">Admin</span>;
      case 'kepsek':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700">Kepala Sekolah</span>;
      default:
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-primary-50 text-primary-700">Guru</span>;
    }
  };

  const canEditUser = (u: UserItem) => {
    // All roles are editable (superadmin included)
    return true;
  };

  const canDeleteUser = (u: UserItem) => {
    // Can't delete superadmin or yourself
    if (u.role === 'superadmin') return false;
    if (u.id === user?.userId) return false;
    return true;
  };

  if (user?.role !== 'admin' && user?.role !== 'superadmin' && user?.role !== 'kepsek') return null;

  return (
    <>
      <div className="animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-text">Manajemen Pengguna</h1>
            <p className="text-sm text-text-secondary">{users.length} pengguna terdaftar</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white text-sm font-medium rounded-xl hover:bg-primary-700 transition-colors shadow-md shadow-primary-500/20"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Tambah Pengguna
          </button>
        </div>

        {/* Users list */}
        <div className="bg-white rounded-2xl border border-border overflow-hidden shadow-sm">
          {loading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="skeleton h-16 rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {users.map(u => (
                <div key={u.id} className="flex items-center gap-4 p-4 hover:bg-surface-dim transition-colors group">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 ${
                    u.role === 'superadmin'
                      ? 'bg-gradient-to-br from-amber-500 to-amber-700'
                      : u.role === 'admin'
                        ? 'bg-gradient-to-br from-purple-500 to-purple-700'
                        : u.role === 'kepsek'
                          ? 'bg-gradient-to-br from-emerald-500 to-emerald-700'
                          : 'bg-gradient-to-br from-primary-500 to-primary-700'
                  }`}>
                    {u.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-text text-sm">{u.name}</p>
                    <p className="text-xs text-text-muted">@{u.username}</p>
                  </div>
                  {getRoleBadge(u.role)}
                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {canEditUser(u) && (
                      <button
                        onClick={() => openEditModal(u)}
                        className="p-1.5 text-text-muted hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                    )}
                    {canDeleteUser(u) && (
                      <button
                        onClick={() => openDeleteModal(u)}
                        className="p-1.5 text-text-muted hover:text-danger hover:bg-red-50 rounded-lg transition-colors"
                        title="Hapus"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create modal */}
      {showCreateModal && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/50 flex items-start justify-center pt-[15vh] p-4" style={{ margin: 0 }}>
          <div className="bg-white rounded-2xl p-6 max-w-md w-full animate-scale-in shadow-2xl">
            <h3 className="text-lg font-bold text-text mb-4">Tambah Pengguna Baru</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text mb-1.5">Nama Lengkap</label>
                <input type="text" value={newName} onChange={e => setNewName(e.target.value)} placeholder="Nama lengkap"
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface-dim text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1.5">Username</label>
                <input type="text" value={newUsername} onChange={e => setNewUsername(e.target.value)} placeholder="Username untuk login"
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface-dim text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1.5">Password</label>
                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Password"
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface-dim text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1.5">Role</label>
                <select value={newRole} onChange={e => setNewRole(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface-dim text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent">
                  <option value="guru">Guru</option>
                  <option value="kepsek">Kepala Sekolah</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-text-secondary border border-border rounded-xl hover:bg-surface-dim transition-colors">
                  Batal
                </button>
                <button type="submit" disabled={creating}
                  className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-primary-600 rounded-xl hover:bg-primary-700 disabled:opacity-50 transition-colors shadow-md shadow-primary-500/20">
                  {creating ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Edit modal */}
      {showEditModal && editUser && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/50 flex items-start justify-center pt-[15vh] p-4" style={{ margin: 0 }}>
          <div className="bg-white rounded-2xl p-6 max-w-md w-full animate-scale-in shadow-2xl">
            <h3 className="text-lg font-bold text-text mb-4">Edit Pengguna</h3>
            <form onSubmit={handleEdit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text mb-1.5">Nama Lengkap</label>
                <input type="text" value={editName} onChange={e => setEditName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface-dim text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1.5">Username</label>
                <input type="text" value={editUsername} onChange={e => setEditUsername(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface-dim text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1.5">Password Baru <span className="text-text-muted font-normal">(kosongkan jika tidak ingin mengubah)</span></label>
                <input type="password" value={editPassword} onChange={e => setEditPassword(e.target.value)} placeholder="Kosongkan jika tidak diubah"
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface-dim text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1.5">Role</label>
                <select value={editRole} onChange={e => setEditRole(e.target.value)}
                  disabled={editUser.role === 'superadmin'}
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface-dim text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed">
                  {editUser.role === 'superadmin' && <option value="superadmin">Super Admin</option>}
                  <option value="guru">Guru</option>
                  <option value="kepsek">Kepala Sekolah</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowEditModal(false); setEditUser(null); }}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-text-secondary border border-border rounded-xl hover:bg-surface-dim transition-colors">
                  Batal
                </button>
                <button type="submit" disabled={updating}
                  className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-primary-600 rounded-xl hover:bg-primary-700 disabled:opacity-50 transition-colors shadow-md shadow-primary-500/20">
                  {updating ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Delete user modal */}
      {showDeleteModal && deleteTarget && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/50 flex items-start justify-center pt-[20vh] p-4" style={{ margin: 0 }}>
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full animate-scale-in shadow-2xl">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-red-50 rounded-2xl mb-4">
                <svg className="w-7 h-7 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-text mb-1">Hapus Pengguna?</h3>
              <p className="text-sm text-text-secondary mb-6">
                Anda akan menghapus <strong>{deleteTarget.name}</strong> (@{deleteTarget.username}). Tindakan ini tidak dapat dibatalkan.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => { setShowDeleteModal(false); setDeleteTarget(null); }}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-text-secondary border border-border rounded-xl hover:bg-surface-dim transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={handleDeleteUser}
                  disabled={deletingUser}
                  className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-danger rounded-xl hover:bg-danger-light disabled:opacity-50 transition-colors"
                >
                  {deletingUser ? 'Menghapus...' : 'Ya, Hapus'}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
