import React, { useState, useEffect } from 'react';
import { Users as UsersIcon, UserPlus, Mail, Shield, Calendar, Trash2, Edit2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useConfirm } from '../hooks/useConfirm';
import { cn } from '../lib/utils';

interface User {
  id: number;
  email: string;
  name: string;
  role: string;
  created_at: string;
}

export default function Users({ currentUser }: { currentUser: any }) {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [formData, setFormData] = useState({ email: '', password: '', name: '', role: 'ESTANDARD' });
  const [error, setError] = useState('');
  const [unlimitedUsers, setUnlimitedUsers] = useState(false);
  const { confirm, ConfirmDialog } = useConfirm();

  const isAdmin = currentUser?.role === 'ADMINISTRADOR' || currentUser?.role === 'DESARROLLADOR' || currentUser?.email === 'demo';
  const isDeveloper = currentUser?.role === 'DESARROLLADOR';
  const isDemo = currentUser?.email === 'demo';
  
  // Filter out developer account from the list for display
  const displayUsers = users.filter(u => u.email !== 'admin@psg.la');
  const userLimitReached = !unlimitedUsers && displayUsers.length >= 5;

  const fetchUsers = async () => {
    if (!isAdmin) return;
    try {
      const [usersRes, settingsRes] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/settings')
      ]);
      const usersData = await usersRes.json();
      const settingsData = await settingsRes.json();
      
      setUsers(usersData);
      setUnlimitedUsers(settingsData.unlimited_users === '1');
      setIsLoading(false);
    } catch (err) {
      console.error('Error fetching users or settings:', err);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mb-6">
          <Shield size={48} className="text-red-600" />
        </div>
        <h2 className="text-3xl font-black text-gray-900 mb-4 uppercase">Acceso Restringido</h2>
        <p className="text-gray-600 max-w-md mb-8 font-medium">
          Solo el administrador del sistema tiene permisos para gestionar los usuarios.
        </p>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingUser ? `/api/users/${editingUser.id}` : '/api/users';
      const method = editingUser ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (data.success) {
        setIsModalOpen(false);
        setEditingUser(null);
        setFormData({ email: '', password: '', name: '', role: 'ESTANDARD' });
        fetchUsers();
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError(editingUser ? 'Error al actualizar usuario' : 'Error al crear usuario');
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({ email: user.email, password: '', name: user.name, role: user.role });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    confirm(
      '¿Eliminar usuario?',
      '¿Estás seguro de que deseas eliminar este usuario? Esta acción no se puede deshacer.',
      async () => {
        try {
          const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
          const data = await res.json();
          if (data.success) {
            setSelectedIds(prev => prev.filter(selectedId => selectedId !== id));
            fetchUsers();
          } else {
            alert(data.message || 'Error al eliminar usuario');
          }
        } catch (err) {
          console.error('Error deleting user:', err);
          alert('Error al eliminar usuario');
        }
      }
    );
  };

  const toggleSelect = (id: number) => {
    // Prevent selecting current user or developer
    const user = displayUsers.find(u => u.id === id);
    if (!user || user.email === currentUser.email) return;

    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    const selectable = displayUsers.filter(u => u.email !== currentUser.email);
    if (selectedIds.length === selectable.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(selectable.map(u => u.id));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    
    confirm(
      '¿Eliminar múltiples usuarios?',
      `¿Estás seguro de que deseas eliminar ${selectedIds.length} usuarios seleccionados? Esta acción no se puede deshacer.`,
      async () => {
        try {
          let successCount = 0;
          let errors: string[] = [];

          for (const id of selectedIds) {
            const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) {
              successCount++;
            } else {
              const userName = users.find(u => u.id === id)?.name || id;
              errors.push(`${userName}: ${data.message || 'Error desconocido'}`);
            }
          }

          if (errors.length > 0) {
            alert(`Se eliminaron ${successCount} usuarios, pero hubo errores con otros:\n\n${errors.join('\n')}`);
          }
          
          setSelectedIds([]);
          fetchUsers();
        } catch (error) {
          console.error('Error deleting users:', error);
          alert('Error al conectar con el servidor');
        }
      }
    );
  };


  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-900 dark:text-white">Gestión de Usuarios</h2>
          <p className="text-gray-500 dark:text-gray-400">Administra los accesos al sistema</p>
        </div>
        <div className="flex items-center gap-3">
          <AnimatePresence>
            {selectedIds.length > 0 && !isDemo && (
              <motion.button
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                onClick={handleBulkDelete}
                className="px-6 py-3 rounded-2xl font-black bg-red-50 text-red-600 border border-red-100 shadow-lg shadow-red-500/10 hover:scale-105 transition-all flex items-center gap-2"
              >
                <Trash2 size={20} />
                BORRAR ({selectedIds.length})
              </motion.button>
            )}
          </AnimatePresence>
          <button 
            onClick={() => {
              if (isDemo) {
                alert('El usuario demo no tiene permisos para crear usuarios.');
                return;
              }
              setEditingUser(null);
              setFormData({ email: '', password: '', name: '', role: 'ESTANDARD' });
              setIsModalOpen(true);
            }}
            disabled={userLimitReached}
            className={`px-6 py-3 rounded-2xl font-black shadow-lg transition-all flex items-center gap-2 ${
              userLimitReached || isDemo
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none' 
                : 'bg-primary text-white shadow-primary/20 hover:scale-105'
            }`}
          >
            <UserPlus size={20} />
            {isDemo ? 'RESTRICTED' : (userLimitReached ? 'LÍMITE ALCANZADO (5/5)' : 'NUEVO USUARIO')}
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/50">
                <th className="px-6 py-4 w-10">
                  <input 
                    type="checkbox" 
                    className="rounded border-gray-300 text-primary focus:ring-primary disabled:opacity-30"
                    checked={displayUsers.length > 0 && selectedIds.length === displayUsers.filter(u => u.email !== currentUser.email).length}
                    onChange={isDemo ? undefined : toggleSelectAll}
                    disabled={isDemo}
                  />
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">USUARIO</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">ROL</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">FECHA REGISTRO</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">ACCIONES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {displayUsers.map((user) => (
                <tr 
                  key={user.id} 
                  onClick={() => !isDemo && toggleSelect(user.id)}
                  className={cn(
                    "hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors",
                    !isDemo && "cursor-pointer",
                    selectedIds.includes(user.id) && "bg-primary/5"
                  )}
                >
                  <td className="px-6 py-4">
                    <input 
                      type="checkbox" 
                      className="rounded border-gray-300 text-primary focus:ring-primary disabled:opacity-30"
                      checked={selectedIds.includes(user.id)}
                      disabled={user.email === currentUser.email || isDemo}
                      onChange={() => {}} // Handled by tr onClick
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center text-gray-400">
                        <UsersIcon size={20} />
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 dark:text-white">{user.name}</p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase ${
                      user.role === 'ADMINISTRADOR' 
                        ? 'bg-purple-100 text-purple-600' 
                        : 'bg-blue-100 text-blue-600'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Calendar size={14} />
                      {new Date(user.created_at).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isDemo) {
                            alert('El usuario demo no tiene permisos para editar usuarios.');
                            return;
                          }
                          handleEdit(user);
                        }}
                        disabled={isDemo}
                        className={cn(
                          "p-2 rounded-lg transition-colors",
                          isDemo ? "text-gray-300 cursor-not-allowed" : "text-blue-500 hover:bg-blue-50"
                        )}
                      >
                        <Edit2 size={18} />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isDemo) {
                            alert('El usuario demo no tiene permisos para eliminar usuarios.');
                            return;
                          }
                          handleDelete(user.id);
                        }}
                        disabled={isDemo}
                        className={cn(
                          "p-2 rounded-lg transition-colors",
                          isDemo ? "text-gray-300 cursor-not-allowed" : "text-red-500 hover:bg-red-50"
                        )}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {displayUsers.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                    No hay usuarios registrados
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-2xl max-w-md w-full p-8 space-y-6 relative"
            >
              <button 
                onClick={() => setIsModalOpen(false)}
                className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={24} />
              </button>

              <div className="text-center space-y-2">
                <h3 className="text-2xl font-black text-gray-900 dark:text-white">
                  {editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
                </h3>
                <p className="text-sm text-gray-500">
                  {editingUser ? 'Modifica los datos del usuario' : 'Completa los datos del nuevo acceso'}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">NOMBRE COMPLETO</label>
                  <input 
                    type="text"
                    required
                    className="w-full px-5 py-3 bg-gray-50 dark:bg-gray-800 border-2 border-transparent rounded-2xl focus:border-primary outline-none"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">CORREO ELECTRÓNICO</label>
                  <input 
                    type="email"
                    required
                    className="w-full px-5 py-3 bg-gray-50 dark:bg-gray-800 border-2 border-transparent rounded-2xl focus:border-primary outline-none"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                    CONTRASEÑA {editingUser && '(Dejar en blanco para no cambiar)'}
                  </label>
                  <input 
                    type="password"
                    required={!editingUser}
                    className="w-full px-5 py-3 bg-gray-50 dark:bg-gray-800 border-2 border-transparent rounded-2xl focus:border-primary outline-none"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">ROL</label>
                  <select 
                    className="w-full px-5 py-3 bg-gray-50 dark:bg-gray-800 border-2 border-transparent rounded-2xl focus:border-primary outline-none"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                  >
                    <option value="ESTANDARD">Usuario Estándar</option>
                    <option value="ADMINISTRADOR">Administrador</option>
                  </select>
                </div>

                {error && <p className="text-xs text-red-500 font-bold text-center">{error}</p>}

                <div className="flex gap-3 pt-2">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-4 rounded-2xl font-black text-gray-500 hover:bg-gray-100 transition-all"
                  >
                    CANCELAR
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 bg-primary text-white font-black py-4 rounded-2xl shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all"
                  >
                    {editingUser ? 'ACTUALIZAR' : 'CREAR'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <ConfirmDialog />
    </div>
  );
}
