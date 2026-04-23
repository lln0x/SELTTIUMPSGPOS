import React, { useState, useEffect } from 'react';
import { apiFetch } from '../lib/api';
import { 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Plus, 
  Edit, 
  Trash2, 
  X,
  Search,
  History,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Customer } from '../types';
import { cn } from '../lib/utils';
import { useDataSync } from '../hooks/useDataSync';
import { useConfirm } from '../hooks/useConfirm';

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const { confirm, ConfirmDialog } = useConfirm();
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    dni: '',
    phone: '',
    email: '',
    address: ''
  });

  const fetchCustomers = () => {
    apiFetch('/api/customers')
      .then(res => res.json())
      .then(data => setCustomers(Array.isArray(data) ? data : []));
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  useDataSync(fetchCustomers);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const filteredCustomers = customers.filter(c => 
    `${c.first_name} ${c.last_name}`.toLowerCase().includes(search.toLowerCase()) || 
    c.phone?.includes(search)
  );

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredCustomers.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredCustomers.map(c => c.id));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    
    confirm(
      '¿Eliminar múltiples clientes?',
      `¿Estás seguro de que deseas eliminar ${selectedIds.length} clientes seleccionados? Esta acción no se puede deshacer.`,
      async () => {
        try {
          let successCount = 0;
          let errors: string[] = [];

          for (const id of selectedIds) {
            const res = await apiFetch(`/api/customers/${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (res.ok && data.success) {
              successCount++;
            } else {
              const customerName = customers.find(c => c.id === id)?.first_name || id;
              errors.push(`${customerName}: ${data.error || 'Error desconocido'}`);
            }
          }

          if (errors.length > 0) {
            alert(`Se eliminaron ${successCount} clientes, pero hubo errores con otros:\n\n${errors.join('\n')}`);
          }
          
          setSelectedIds([]);
          fetchCustomers();
        } catch (error) {
          console.error('Error deleting customers:', error);
          alert('Error al conectar con el servidor');
        }
      }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingCustomer ? `/api/customers/${editingCustomer.id}` : '/api/customers';
    const method = editingCustomer ? 'PUT' : 'POST';

    const res = await apiFetch(url, {
      method,
      body: JSON.stringify(formData)
    });

    if (res.ok) {
      setIsModalOpen(false);
      setEditingCustomer(null);
      setFormData({ first_name: '', last_name: '', dni: '', phone: '', email: '', address: '' });
      fetchCustomers();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Clientes</h2>
          <p className="text-sm text-gray-500">Gestiona tu base de clientes frecuentes.</p>
        </div>
        <div className="flex items-center gap-3">
          <AnimatePresence>
            {selectedIds.length > 0 && (
              <motion.button
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                onClick={handleBulkDelete}
                className="flex items-center gap-2 px-4 py-2.5 bg-red-50 text-red-600 border border-red-100 rounded-xl font-bold hover:bg-red-100 transition-colors shadow-sm"
              >
                <Trash2 size={20} />
                Borrar ({selectedIds.length})
              </motion.button>
            )}
          </AnimatePresence>
          <button 
            onClick={() => {
              setEditingCustomer(null);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-green-500 text-white rounded-xl font-bold hover:bg-green-600 transition-colors shadow-lg shadow-green-500/20"
          >
            <Plus size={20} />
            Nuevo Cliente
          </button>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input 
          type="text"
          placeholder="Buscar por nombre o teléfono..."
          className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 transition-all shadow-sm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                <th className="px-6 py-4 w-10">
                  <input 
                    type="checkbox" 
                    className="rounded border-gray-300 text-green-500 focus:ring-green-500"
                    checked={filteredCustomers.length > 0 && selectedIds.length === filteredCustomers.length}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th className="px-6 py-4 font-bold">Cliente</th>
                <th className="px-6 py-4 font-bold">Contacto</th>
                <th className="px-6 py-4 font-bold">Dirección</th>
                <th className="px-6 py-4 font-bold">Fecha Registro</th>
                <th className="px-6 py-4 font-bold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredCustomers.map((customer) => (
                <tr key={customer.id} className={cn(
                  "hover:bg-gray-50 transition-colors group",
                  selectedIds.includes(customer.id) && "bg-green-50/30"
                )}>
                  <td className="px-6 py-4">
                    <input 
                      type="checkbox" 
                      className="rounded border-gray-300 text-green-500 focus:ring-green-500"
                      checked={selectedIds.includes(customer.id)}
                      onChange={() => toggleSelect(customer.id)}
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-50 rounded-full flex items-center justify-center text-green-600">
                        <User size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">{customer.first_name} {customer.last_name}</p>
                        <p className="text-xs text-gray-500">DNI: {customer.dni || 'N/A'}</p>
                        <p className="text-xs text-gray-500">ID: #C{String(customer.id).padStart(4, '0')}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <Phone size={12} className="text-gray-400" />
                        <span>{customer.phone || 'N/A'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <Mail size={12} className="text-gray-400" />
                        <span>{customer.email || 'N/A'}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <MapPin size={12} className="text-gray-400" />
                      <span className="truncate max-w-[200px]">{customer.address || 'N/A'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-500">
                    {new Date(customer.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-2 text-green-500 hover:bg-green-50 rounded-lg transition-colors">
                        <History size={18} />
                      </button>
                      <button 
                        onClick={() => {
                          setEditingCustomer(customer);
                          setFormData({
                            first_name: customer.first_name,
                            last_name: customer.last_name || '',
                            dni: customer.dni || '',
                            phone: customer.phone || '',
                            email: customer.email || '',
                            address: customer.address || ''
                          });
                          setIsModalOpen(true);
                        }}
                        className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Edit size={18} />
                      </button>
                      <button 
                        onClick={() => {
                          confirm(
                            '¿Eliminar cliente?',
                            '¿Estás seguro de que deseas eliminar este cliente? Esta acción no se puede deshacer.',
                            async () => {
                              try {
                                const res = await apiFetch(`/api/customers/${customer.id}`, { method: 'DELETE' });
                                const data = await res.json();
                                if (res.ok && data.success) {
                                  fetchCustomers();
                                } else {
                                  alert(data.error || 'No se pudo eliminar el cliente.');
                                }
                              } catch (error) {
                                console.error('Error deleting customer:', error);
                                alert('Error al conectar con el servidor');
                              }
                            }
                          );
                        }}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredCustomers.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                    No se encontraron clientes.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">{editingCustomer ? 'Editar Cliente' : 'Nuevo Cliente'}</h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X size={20} /></button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-gray-700">Nombre</label>
                    <input 
                      required 
                      type="text" 
                      className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-green-500"
                      value={formData.first_name || ''} 
                      onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-gray-700">Apellido</label>
                    <input 
                      type="text" 
                      className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-green-500"
                      value={formData.last_name || ''} 
                      onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-gray-700">DNI / RUC</label>
                  <input 
                    required 
                    type="text" 
                    className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-green-500" 
                    value={formData.dni || ''} 
                    onChange={(e) => setFormData({...formData, dni: e.target.value})} 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-gray-700">Teléfono</label>
                  <input type="text" className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-green-500" value={formData.phone || ''} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-gray-700">Correo Electrónico</label>
                  <input type="email" className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-green-500" value={formData.email || ''} onChange={(e) => setFormData({...formData, email: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-gray-700">Dirección</label>
                  <input type="text" className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-green-500" value={formData.address || ''} onChange={(e) => setFormData({...formData, address: e.target.value})} />
                </div>
                <div className="mt-8 flex gap-3">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-6 py-3 bg-gray-100 text-gray-600 font-bold rounded-2xl hover:bg-gray-200 transition-colors">Cancelar</button>
                  <button type="submit" className="flex-1 px-6 py-3 bg-green-500 text-white font-bold rounded-2xl shadow-lg shadow-green-500/20 hover:bg-green-600 transition-colors">{editingCustomer ? 'Guardar Cambios' : 'Crear Cliente'}</button>
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
