import React, { useState, useEffect } from 'react';
import { apiFetch } from '../lib/api';
import { 
  Building2, 
  Phone, 
  Mail, 
  MapPin, 
  Plus, 
  Edit, 
  Trash2, 
  X,
  Search,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Supplier } from '../types';
import { cn } from '../lib/utils';
import { useDataSync } from '../hooks/useDataSync';
import { useConfirm } from '../hooks/useConfirm';

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const { confirm, ConfirmDialog } = useConfirm();
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    tax_id: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    country: 'Perú',
    contact_person: '',
    notes: ''
  });

  const fetchSuppliers = () => {
    apiFetch('/api/suppliers')
      .then(res => res.json())
      .then(data => setSuppliers(Array.isArray(data) ? data : []));
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  useDataSync(fetchSuppliers);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const filteredSuppliers = suppliers.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) || 
    s.company.toLowerCase().includes(search.toLowerCase())
  );

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    
    confirm(
      '¿Eliminar múltiples proveedores?',
      `¿Estás seguro de que deseas eliminar ${selectedIds.length} proveedores seleccionados? Esta acción no se puede deshacer.`,
      async () => {
        try {
          let successCount = 0;
          let errors: string[] = [];

          for (const id of selectedIds) {
            const res = await apiFetch(`/api/suppliers/${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (res.ok && data.success) {
              successCount++;
            } else {
              const supName = suppliers.find(s => s.id === id)?.name || id;
              errors.push(`${supName}: ${data.error || 'Error desconocido'}`);
            }
          }

          if (errors.length > 0) {
            alert(`Se eliminaron ${successCount} proveedores, pero hubo errores con otros:\n\n${errors.join('\n')}`);
          }
          
          setSelectedIds([]);
          fetchSuppliers();
        } catch (error) {
          console.error('Error deleting suppliers:', error);
          alert('Error al conectar con el servidor');
        }
      }
    );
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredSuppliers.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredSuppliers.map(s => s.id));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingSupplier ? `/api/suppliers/${editingSupplier.id}` : '/api/suppliers';
    const method = editingSupplier ? 'PUT' : 'POST';

    const res = await apiFetch(url, {
      method,
      body: JSON.stringify(formData)
    });

    if (res.ok) {
      setIsModalOpen(false);
      setEditingSupplier(null);
      setFormData({
        name: '', company: '', tax_id: '', phone: '', email: '',
        address: '', city: '', country: 'Perú', contact_person: '', notes: ''
      });
      fetchSuppliers();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Proveedores</h2>
          <p className="text-sm text-gray-500">Gestiona tus proveedores y contactos comerciales.</p>
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
              setEditingSupplier(null);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-green-500 text-white rounded-xl font-bold hover:bg-green-600 transition-colors shadow-lg shadow-green-500/20"
          >
            <Plus size={20} />
            Nuevo Proveedor
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input 
            type="text"
            placeholder="Buscar proveedor o empresa..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 transition-all shadow-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        {filteredSuppliers.length > 0 && (
          <button 
            onClick={toggleSelectAll}
            className="text-sm font-bold text-green-600 hover:text-green-700 transition-colors"
          >
            {selectedIds.length === filteredSuppliers.length ? 'Desmarcar Todos' : 'Seleccionar Todos'}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredSuppliers.map((sup) => (
          <div 
            key={sup.id} 
            onClick={() => toggleSelect(sup.id)}
            className={cn(
              "bg-white rounded-2xl border transition-all group overflow-hidden cursor-pointer relative",
              selectedIds.includes(sup.id) ? "border-green-500 ring-2 ring-green-100" : "border-gray-100 shadow-sm hover:shadow-md"
            )}
          >
            <div className="absolute top-4 left-4 z-10">
              <input 
                type="checkbox" 
                className="rounded border-gray-300 text-green-500 focus:ring-green-500"
                checked={selectedIds.includes(sup.id)}
                onChange={() => {}} // Handled by div onClick
              />
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                  <Building2 size={24} />
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => {
                      setEditingSupplier(sup);
                      setFormData({
                        name: sup.name, company: sup.company, tax_id: sup.tax_id,
                        phone: sup.phone, email: sup.email, address: sup.address,
                        city: sup.city, country: sup.country, contact_person: sup.contact_person,
                        notes: sup.notes
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
                        '¿Eliminar proveedor?',
                        '¿Estás seguro de que deseas eliminar este proveedor? Esta acción no se puede deshacer.',
                        async () => {
                          try {
                            const res = await apiFetch(`/api/suppliers/${sup.id}`, { method: 'DELETE' });
                            const data = await res.json();
                            if (res.ok && data.success) {
                              fetchSuppliers();
                            } else {
                              alert(data.error || 'No se pudo eliminar el proveedor.');
                            }
                          } catch (error) {
                            console.error('Error deleting supplier:', error);
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
              </div>
              
              <div>
                <h3 className="font-bold text-gray-900 text-lg">{sup.name}</h3>
                <p className="text-sm text-gray-500 font-medium">{sup.company}</p>
              </div>

              <div className="space-y-2 pt-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Phone size={16} className="text-gray-400" />
                  <span>{sup.phone}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Mail size={16} className="text-gray-400" />
                  <span className="truncate">{sup.email}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin size={16} className="text-gray-400" />
                  <span className="truncate">{sup.city}, {sup.country}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">
                  {editingSupplier ? 'Editar Proveedor' : 'Nuevo Proveedor'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[70vh]">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-bold text-gray-700">Nombre del Proveedor</label>
                      <input 
                        required 
                        type="text" 
                        className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-green-500"
                        value={formData.name || ''} 
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-bold text-gray-700">Empresa</label>
                      <input 
                        type="text" 
                        className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-green-500"
                        value={formData.company || ''} 
                        onChange={(e) => setFormData({...formData, company: e.target.value})}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-bold text-gray-700">RUC / ID Fiscal</label>
                      <input 
                        type="text" 
                        className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-green-500" 
                        value={formData.tax_id || ''} 
                        onChange={(e) => setFormData({...formData, tax_id: e.target.value})} 
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-bold text-gray-700">Persona de Contacto</label>
                      <input type="text" className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-green-500" value={formData.contact_person || ''} onChange={(e) => setFormData({...formData, contact_person: e.target.value})} />
                    </div>
                  </div>

                  <div className="space-y-4">
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
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-sm font-bold text-gray-700">Ciudad</label>
                        <input type="text" className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-green-500" value={formData.city || ''} onChange={(e) => setFormData({...formData, city: e.target.value})} />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-bold text-gray-700">País</label>
                        <input type="text" className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-green-500" value={formData.country || ''} onChange={(e) => setFormData({...formData, country: e.target.value})} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 space-y-1.5">
                  <label className="text-sm font-bold text-gray-700">Notas Adicionales</label>
                  <textarea rows={3} className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-green-500" value={formData.notes || ''} onChange={(e) => setFormData({...formData, notes: e.target.value})} />
                </div>

                <div className="mt-8 flex gap-3">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-6 py-3 bg-gray-100 text-gray-600 font-bold rounded-2xl hover:bg-gray-200 transition-colors">Cancelar</button>
                  <button type="submit" className="flex-1 px-6 py-3 bg-green-500 text-white font-bold rounded-2xl shadow-lg shadow-green-500/20 hover:bg-green-600 transition-colors">{editingSupplier ? 'Guardar Cambios' : 'Crear Proveedor'}</button>
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
