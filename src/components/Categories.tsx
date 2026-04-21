import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, X, Tags, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Category } from '../types';
import { cn } from '../lib/utils';
import { useDataSync } from '../hooks/useDataSync';
import { useConfirm } from '../hooks/useConfirm';

interface CategoriesProps {
  onViewProducts?: (categoryId: number) => void;
}

export default function Categories({ onViewProducts }: CategoriesProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const { confirm, ConfirmDialog } = useConfirm();
  const [formData, setFormData] = useState({
    name: '',
    prefix: '',
    description: ''
  });

  const fetchCategories = () => {
    fetch('/api/categories')
      .then(res => res.json())
      .then(setCategories);
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useDataSync(fetchCategories);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    
    confirm(
      '¿Eliminar múltiples categorías?',
      `¿Estás seguro de que deseas eliminar ${selectedIds.length} categorías seleccionadas? Los productos asociados serán movidos a "Varios".`,
      async () => {
        try {
          let successCount = 0;
          let errors: string[] = [];

          for (const id of selectedIds) {
            const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (res.ok && data.success) {
              successCount++;
            } else {
              const catName = categories.find(c => c.id === id)?.name || id;
              errors.push(`${catName}: ${data.error || 'Error desconocido'}`);
            }
          }

          if (errors.length > 0) {
            alert(`Se eliminaron ${successCount} categorías, pero hubo errores con otras:\n\n${errors.join('\n')}`);
          }
          
          setSelectedIds([]);
          fetchCategories();
        } catch (error) {
          console.error('Error deleting categories:', error);
          alert('Error al conectar con el servidor');
        }
      }
    );
  };

  const toggleSelect = (id: number) => {
    if (id === 0) return; // Don't select "Varios"
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const filteredCategories = categories.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

  const toggleSelectAll = () => {
    const selectable = filteredCategories.filter(c => c.id !== 0);
    if (selectedIds.length === selectable.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(selectable.map(c => c.id));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingCategory ? `/api/categories/${editingCategory.id}` : '/api/categories';
    const method = editingCategory ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });

    if (res.ok) {
      setIsModalOpen(false);
      setEditingCategory(null);
      setFormData({ name: '', prefix: '', description: '' });
      fetchCategories();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Categorías</h2>
          <p className="text-sm text-gray-500">Organiza tus productos por categorías y prefijos.</p>
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
              setEditingCategory(null);
              setFormData({ name: '', prefix: '', description: '' });
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-green-500 text-white rounded-xl font-bold hover:bg-green-600 transition-colors shadow-lg shadow-green-500/20"
          >
            <Plus size={20} />
            Nueva Categoría
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input 
            type="text"
            placeholder="Buscar categoría..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 transition-all shadow-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        {filteredCategories.length > 0 && (
          <button 
            onClick={toggleSelectAll}
            className="text-sm font-bold text-green-600 hover:text-green-700 transition-colors"
          >
            {selectedIds.length === filteredCategories.filter(c => c.id !== 0).length ? 'Desmarcar Todos' : 'Seleccionar Todos'}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCategories.map((cat) => (
          <div 
            key={cat.id} 
            onClick={() => toggleSelect(cat.id)}
            className={cn(
              "bg-white p-6 rounded-2xl border transition-all group cursor-pointer relative",
              selectedIds.includes(cat.id) ? "border-green-500 ring-2 ring-green-100" : "border-gray-100 shadow-sm hover:shadow-md"
            )}
          >
            {cat.id !== 0 && (
              <div className="absolute top-4 left-4 z-10">
                <input 
                  type="checkbox" 
                  className="rounded border-gray-300 text-green-500 focus:ring-green-500"
                  checked={selectedIds.includes(cat.id)}
                  onChange={() => {}} // Handled by div onClick
                />
              </div>
            )}
            <div className="flex items-start justify-between">
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center transition-colors",
                selectedIds.includes(cat.id) ? "bg-green-100 text-green-600" : "bg-green-50 text-green-600"
              )}>
                <Tags size={24} />
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => {
                    setEditingCategory(cat);
                    setFormData({ name: cat.name, prefix: cat.prefix, description: cat.description || '' });
                    setIsModalOpen(true);
                  }}
                  className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <Edit size={18} />
                </button>
                <button 
                  onClick={() => {
                    confirm(
                      '¿Eliminar categoría?',
                      '¿Estás seguro de que deseas eliminar esta categoría? Esta acción no se puede deshacer.',
                      async () => {
                        try {
                          const res = await fetch(`/api/categories/${cat.id}`, { method: 'DELETE' });
                          const data = await res.json();
                          if (res.ok && data.success) {
                            fetchCategories();
                          } else {
                            alert(data.error || 'No se pudo eliminar la categoría.');
                          }
                        } catch (error) {
                          console.error('Error deleting category:', error);
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
            <div className="mt-4">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-gray-900">{cat.name}</h3>
                <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] font-bold uppercase rounded-md">
                  {cat.prefix}
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-1 line-clamp-2">{cat.description || 'Sin descripción'}</p>
            </div>
            <div className="mt-6 pt-4 border-t border-gray-50 flex items-center justify-between">
              <span className="text-xs text-gray-400">Estado: <span className="text-green-600 font-bold capitalize">{cat.status}</span></span>
              <button 
                onClick={() => onViewProducts?.(cat.id)}
                className="text-xs text-green-600 font-bold hover:underline"
              >
                Ver productos
              </button>
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
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">
                  {editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-gray-700">Nombre de la Categoría</label>
                  <input 
                    required
                    type="text"
                    placeholder="Ej. Lácteos"
                    className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-green-500"
                    value={formData.name || ''}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-gray-700">Prefijo (2-3 letras)</label>
                  <input 
                    required
                    maxLength={3}
                    type="text"
                    placeholder="Ej. LC"
                    className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-green-500 uppercase"
                    value={formData.prefix || ''}
                    onChange={(e) => setFormData({...formData, prefix: e.target.value.toUpperCase()})}
                  />
                  <p className="text-[10px] text-gray-400 font-medium">Se usará para generar códigos automáticos (Ej. LC001)</p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-gray-700">Descripción</label>
                  <textarea 
                    rows={3}
                    className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-green-500"
                    value={formData.description || ''}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                  />
                </div>

                <div className="mt-8 flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-6 py-3 bg-gray-100 text-gray-600 font-bold rounded-2xl hover:bg-gray-200 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 px-6 py-3 bg-green-500 text-white font-bold rounded-2xl shadow-lg shadow-green-500/20 hover:bg-green-600 transition-colors"
                  >
                    {editingCategory ? 'Guardar Cambios' : 'Crear Categoría'}
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
