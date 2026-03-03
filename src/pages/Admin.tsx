import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { Loader2, UserPlus, Trash2, Users, Shield, ShieldOff, Edit2, X, Check } from 'lucide-react';
import { motion } from 'motion/react';

export default function Admin() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [togglingAdmin, setTogglingAdmin] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    role: '',
    location: '',
    pin: '',
  });

  const [newUser, setNewUser] = useState({
    name: '',
    role: '',
    location: '',
    pin: '',
    is_admin: false,
  });

  const fetchUsers = () => {
    fetch('/api/admin/users')
      .then((res) => res.json())
      .then((data) => {
        setUsers(data);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      });
      if (res.ok) {
        setNewUser({ name: '', role: '', location: '', pin: '', is_admin: false });
        fetchUsers();
      }
    } catch (error) {
      console.error('Failed to add user', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async (id: number) => {
    if (!window.confirm('Are you sure you want to remove this team member? This will also delete all their feedback.')) {
      return;
    }
    
    setDeleting(id);
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchUsers();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete user');
      }
    } catch (error) {
      console.error('Failed to delete user', error);
    } finally {
      setDeleting(null);
    }
  };

  const handleToggleAdmin = async (id: number, currentStatus: number) => {
    setTogglingAdmin(id);
    try {
      const res = await fetch(`/api/users/${id}/admin`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_admin: currentStatus === 1 ? 0 : 1 }),
      });
      if (res.ok) {
        fetchUsers();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update admin status');
      }
    } catch (error) {
      console.error('Failed to update admin status', error);
    } finally {
      setTogglingAdmin(null);
    }
  };

  const startEditing = (user: User) => {
    setEditingId(user.id);
    setEditForm({
      name: user.name,
      role: user.role,
      location: user.location,
      pin: user.pin || '',
    });
  };

  const cancelEditing = () => {
    setEditingId(null);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    
    setSubmitting(true);
    try {
      const res = await fetch(`/api/users/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      if (res.ok) {
        setEditingId(null);
        fetchUsers();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update user');
      }
    } catch (error) {
      console.error('Failed to update user', error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-stone-400" />
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="max-w-4xl mx-auto space-y-8"
    >
      <div className="mb-8 border-b border-stone-200 pb-8">
        <h1 className="text-3xl font-bold text-stone-900 mb-2">Staff Administration</h1>
        <p className="text-stone-600">Manage team members available for 360° feedback.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Add User Form */}
        <div className="md:col-span-1">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-stone-200">
            <div className="flex items-center mb-4">
              <div className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center mr-3">
                <UserPlus className="w-4 h-4" />
              </div>
              <h2 className="text-lg font-bold text-stone-900">Add Team Member</h2>
            </div>
            
            <form onSubmit={handleAddUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Name</label>
                <input
                  type="text"
                  required
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  className="block w-full rounded-md border-stone-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm p-2 border"
                  placeholder="e.g. Jane Doe"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Role / Position</label>
                <input
                  type="text"
                  required
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  className="block w-full rounded-md border-stone-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm p-2 border"
                  placeholder="e.g. Head Baker"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Bakery Location</label>
                <input
                  type="text"
                  required
                  value={newUser.location}
                  onChange={(e) => setNewUser({ ...newUser, location: e.target.value })}
                  className="block w-full rounded-md border-stone-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm p-2 border"
                  placeholder="e.g. London - Soho"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">4-Digit PIN</label>
                <input
                  type="text"
                  required
                  pattern="[0-9]{4}"
                  maxLength={4}
                  value={newUser.pin}
                  onChange={(e) => setNewUser({ ...newUser, pin: e.target.value })}
                  className="block w-full rounded-md border-stone-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm p-2 border"
                  placeholder="e.g. 1234"
                />
              </div>
              <div className="flex items-center">
                <input
                  id="is_admin"
                  type="checkbox"
                  checked={newUser.is_admin}
                  onChange={(e) => setNewUser({ ...newUser, is_admin: e.target.checked })}
                  className="h-4 w-4 text-red-600 focus:ring-red-500 border-stone-300 rounded"
                />
                <label htmlFor="is_admin" className="ml-2 block text-sm text-stone-900">
                  Admin Access
                </label>
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full inline-flex justify-center items-center rounded-lg border border-transparent bg-stone-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-stone-800 focus:outline-none focus:ring-2 focus:ring-stone-500 focus:ring-offset-2 disabled:opacity-50 transition-colors mt-4"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <UserPlus className="w-4 h-4 mr-2" />
                )}
                Add Member
              </button>
            </form>
          </div>
        </div>

        {/* User List */}
        <div className="md:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-stone-200 bg-stone-50 flex items-center justify-between">
              <div className="flex items-center">
                <Users className="w-5 h-5 text-stone-500 mr-2" />
                <h2 className="text-lg font-bold text-stone-900">Current Staff ({users.length})</h2>
              </div>
            </div>
            
            {users.length === 0 ? (
              <div className="p-8 text-center text-stone-500">
                No staff members added yet.
              </div>
            ) : (
              <ul className="divide-y divide-stone-200">
                {users.map((user) => (
                  <li key={user.id} className="p-4 hover:bg-stone-50 transition-colors">
                    {editingId === user.id ? (
                      <form onSubmit={handleUpdateUser} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-medium text-stone-500 uppercase">Name</label>
                            <input
                              type="text"
                              required
                              value={editForm.name}
                              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                              className="mt-1 block w-full rounded-md border-stone-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm p-2 border"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-stone-500 uppercase">Role</label>
                            <input
                              type="text"
                              required
                              value={editForm.role}
                              onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                              className="mt-1 block w-full rounded-md border-stone-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm p-2 border"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-stone-500 uppercase">Location</label>
                            <input
                              type="text"
                              required
                              value={editForm.location}
                              onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                              className="mt-1 block w-full rounded-md border-stone-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm p-2 border"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-stone-500 uppercase">PIN</label>
                            <input
                              type="text"
                              required
                              pattern="[0-9]{4}"
                              maxLength={4}
                              value={editForm.pin}
                              onChange={(e) => setEditForm({ ...editForm, pin: e.target.value })}
                              className="mt-1 block w-full rounded-md border-stone-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm p-2 border"
                            />
                          </div>
                        </div>
                        <div className="flex justify-end space-x-2">
                          <button
                            type="button"
                            onClick={cancelEditing}
                            className="inline-flex items-center px-3 py-1.5 border border-stone-300 rounded-md text-sm font-medium text-stone-700 bg-white hover:bg-stone-50"
                          >
                            <X className="w-4 h-4 mr-1" /> Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={submitting}
                            className="inline-flex items-center px-3 py-1.5 border border-transparent rounded-md text-sm font-medium text-white bg-stone-900 hover:bg-stone-800 disabled:opacity-50"
                          >
                            {submitting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Check className="w-4 h-4 mr-1" />} Save
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center">
                            <p className="text-sm font-medium text-stone-900 truncate">
                              {user.name}
                              {user.is_admin === 1 && <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">Admin</span>}
                            </p>
                            <span className="ml-3 text-xs font-mono text-stone-400 bg-stone-100 px-1.5 py-0.5 rounded">PIN: {user.pin}</span>
                          </div>
                          <p className="text-sm text-stone-500 truncate">{user.role} • {user.location}</p>
                        </div>
                        <div className="ml-4 flex-shrink-0 flex items-center space-x-2">
                          <button
                            onClick={() => startEditing(user)}
                            className="inline-flex items-center p-2 border border-transparent rounded-full shadow-sm text-stone-400 hover:text-stone-600 hover:bg-stone-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-stone-500 transition-colors"
                            title="Edit staff member"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleToggleAdmin(user.id, user.is_admin)}
                            disabled={togglingAdmin === user.id || user.name === 'Tristen Bayley'}
                            className={`inline-flex items-center p-2 border border-transparent rounded-full shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 transition-colors ${
                              user.is_admin === 1 
                                ? 'text-stone-600 hover:bg-stone-100 focus:ring-stone-500' 
                                : 'text-emerald-600 hover:bg-emerald-50 focus:ring-emerald-500'
                            }`}
                            title={user.is_admin === 1 ? "Remove admin access" : "Grant admin access"}
                          >
                            {togglingAdmin === user.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : user.is_admin === 1 ? (
                              <ShieldOff className="w-4 h-4" />
                            ) : (
                              <Shield className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            disabled={deleting === user.id || user.name === 'Tristen Bayley'}
                            className="inline-flex items-center p-2 border border-transparent rounded-full shadow-sm text-red-600 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 transition-colors"
                            title="Remove staff member"
                          >
                            {deleting === user.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
