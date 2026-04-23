import React, { useState, useEffect, useRef, useCallback } from 'react';
import { apiFetch } from '../lib/api';
import { 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  Filter, 
  Download,
  Package,
  AlertCircle,
  CheckCircle2,
  X,
  Upload,
  Image as ImageIcon,
  ChevronDown,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Product, Category, Supplier } from '../types';
import { formatCurrency, cn, roundTo2Decimals } from '../lib/utils';
import * as XLSX from 'xlsx';
import { useDataSync } from '../hooks/useDataSync';
import { useConfirm } from '../hooks/useConfirm';

interface InventoryProps {
  initialCategoryFilter?: number | 'all';
}

export default function Inventory({ initialCategoryFilter = 'all' }: InventoryProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<number | 'all'>(initialCategoryFilter);
  const [filterStock, setFilterStock] = useState<'all' | 'low'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const { confirm, ConfirmDialog } = useConfirm();

  const [formData, setFormData] = useState({
    name: '',
    category_id: '',
    purchase_price: '',
    sale_price: '',
    stock: '',
    min_stock: '5',
    unit: 'unidad',
    brand: '',
    supplier_id: '',
    description: '',
    image: '',
    has_serials: false,
    serial_numbers: [] as string[],
    parent_id: '' as string | number,
    units_per_package: '1'
  });

  const [serialSearch, setSerialSearch] = useState('');
  const [newSerial, setNewSerial] = useState('');

  const [categorySearch, setCategorySearch] = useState('');
  const [supplierSearch, setSupplierSearch] = useState('');
  const [showCategoryList, setShowCategoryList] = useState(false);
  const [showSupplierList, setShowSupplierList] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = useCallback(() => {
    Promise.all([
      apiFetch('/api/products').then(res => res.json()),
      apiFetch('/api/categories').then(res => res.json()),
      apiFetch('/api/suppliers').then(res => res.json())
    ]).then(([p, c, s]) => {
      setProducts(Array.isArray(p) ? p : []);
      setCategories(Array.isArray(c) ? c : []);
      setSuppliers(Array.isArray(s) ? s : []);
    });
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useDataSync(fetchData);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleDelete = async (id: number) => {
    confirm(
      '¿Eliminar producto?',
      '¿Estás seguro de que deseas eliminar este producto? Esta acción no se puede deshacer.',
      async () => {
        try {
          const res = await apiFetch(`/api/products/${id}`, { method: 'DELETE' });
          const data = await res.json();
          if (res.ok && data.success) {
            setSelectedIds(prev => prev.filter(selectedId => selectedId !== id));
            fetchData();
          } else {
            alert(data.error || 'No se pudo eliminar el producto.');
          }
        } catch (error) {
          console.error('Error deleting product:', error);
          alert('Error al conectar con el servidor');
        }
      }
    );
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    
    confirm(
      '¿Eliminar múltiples productos?',
      `¿Estás seguro de que deseas eliminar ${selectedIds.length} productos seleccionados? Esta acción no se puede deshacer.`,
      async () => {
        try {
          let successCount = 0;
          let errors: string[] = [];

          for (const id of selectedIds) {
            const res = await apiFetch(`/api/products/${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (res.ok && data.success) {
              successCount++;
            } else {
              const productName = products.find(p => p.id === id)?.name || id;
              errors.push(`${productName}: ${data.error || 'Error desconocido'}`);
            }
          }

          if (errors.length > 0) {
            alert(`Se eliminaron ${successCount} productos, pero hubo errores con otros:\n\n${errors.join('\n')}`);
          }
          
          setSelectedIds([]);
          fetchData();
        } catch (error) {
          console.error('Error deleting products:', error);
          alert('Error al conectar con el servidor');
        }
      }
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredProducts.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredProducts.map(p => p.id));
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };


  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, image: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const filteredCategories = (categories || []).filter(c => 
    c.name.toLowerCase().includes(categorySearch.toLowerCase())
  );

  const filteredSuppliers = (suppliers || []).filter(s => 
    s.name.toLowerCase().includes(supplierSearch.toLowerCase())
  );

  const filteredProducts = (products || []).filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.code.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = filterCategory === 'all' || p.category_id === filterCategory;
    const matchesStock = filterStock === 'all' || p.stock <= p.min_stock;
    return matchesSearch && matchesCategory && matchesStock;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingProduct ? `/api/products/${editingProduct.id}` : '/api/products';
    const method = editingProduct ? 'PUT' : 'POST';

    const res = await apiFetch(url, {
      method,
      body: JSON.stringify({
        ...formData,
        category_id: parseInt(formData.category_id),
        supplier_id: formData.supplier_id ? parseInt(formData.supplier_id) : null,
        purchase_price: roundTo2Decimals(parseFloat(formData.purchase_price) || 0),
        sale_price: roundTo2Decimals(parseFloat(formData.sale_price) || 0),
        stock: parseInt(formData.stock),
        min_stock: parseInt(formData.min_stock),
        serial_numbers: formData.has_serials ? formData.serial_numbers : [],
        parent_id: formData.parent_id ? parseInt(formData.parent_id as string) : null,
        units_per_package: parseInt(formData.units_per_package)
      })
    });

    const data = await res.json();

    if (res.ok) {
      setIsModalOpen(false);
      setEditingProduct(null);
      setCategorySearch('');
      setSupplierSearch('');
      setFormData({
        name: '', category_id: '', purchase_price: '', sale_price: '', 
        stock: '', min_stock: '5', unit: 'unidad', brand: '', 
        supplier_id: '', description: '', image: '',
        has_serials: false, serial_numbers: [],
        parent_id: '', units_per_package: '1'
      });
      fetchData();
    } else {
      alert(data.error || 'Error al guardar el producto');
    }
  };

  const openModal = async (product: Product | null = null) => {
    if (product) {
      let serials: string[] = [];
      if (product.has_serials) {
        try {
          const res = await apiFetch(`/api/products/${product.id}/items`);
          const items = await res.json();
          const itemsArray = Array.isArray(items) ? items : [];
          serials = itemsArray.map((i: any) => i.serial_number);
        } catch (e) {
          console.error('Error fetching items:', e);
        }
      }

      setEditingProduct(product);
      setFormData({
        name: product.name,
        category_id: String(product.category_id || ''),
        purchase_price: String(product.purchase_price || '0'),
        sale_price: String(product.sale_price || '0'),
        stock: String(product.stock || '0'),
        min_stock: String(product.min_stock || '5'),
        unit: product.unit,
        brand: product.brand || '',
        supplier_id: product.supplier_id ? String(product.supplier_id) : '',
        description: product.description || '',
        image: product.image || '',
        has_serials: !!product.has_serials,
        serial_numbers: serials,
        parent_id: product.parent_id ? String(product.parent_id) : '',
        units_per_package: String(product.units_per_package || '1')
      });
      setCategorySearch(product.category_name || '');
      setSupplierSearch(suppliers.find(s => s.id === product.supplier_id)?.name || '');
    } else {
      setEditingProduct(null);
      setFormData({
        name: '', category_id: '', purchase_price: '', sale_price: '', 
        stock: '', min_stock: '5', unit: 'unidad', brand: '', 
        supplier_id: '', description: '', image: '',
        has_serials: false, serial_numbers: [],
        parent_id: '', units_per_package: '1'
      });
      setCategorySearch('');
      setSupplierSearch('');
    }
    setSerialSearch('');
    setNewSerial('');
    setIsModalOpen(true);
  };

  const exportToExcel = () => {
    const data = products.map(p => ({
      Código: p.code,
      Nombre: p.name,
      Categoría: p.category_name,
      'Precio Compra': p.purchase_price,
      'Precio Venta': p.sale_price,
      Stock: p.stock,
      'Stock Mínimo': p.min_stock,
      Estado: p.status
    }));
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Inventario");
    XLSX.writeFile(workbook, "Inventario_Abarrotes.xlsx");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gestión de Inventario</h2>
          <p className="text-sm text-gray-500">Administra tus productos, stock y precios.</p>
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
            onClick={exportToExcel}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-700 font-bold hover:bg-gray-50 transition-colors shadow-sm"
          >
            <Download size={20} />
            Exportar
          </button>
          <button 
            onClick={() => openModal()}
            className="flex items-center gap-2 px-4 py-2.5 bg-green-500 text-white rounded-xl font-bold hover:bg-green-600 transition-colors shadow-lg shadow-green-500/20"
          >
            <Plus size={20} />
            Nuevo Producto
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input 
            type="text"
            placeholder="Buscar por nombre o código..."
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-green-500 transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-4">
          <select 
            className="bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-green-500 text-sm font-medium pr-10"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
          >
            <option value="all">Todas las Categorías</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
          <select 
            className="bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-green-500 text-sm font-medium pr-10"
            value={filterStock}
            onChange={(e) => setFilterStock(e.target.value as any)}
          >
            <option value="all">Todo el Stock</option>
            <option value="low">Stock Bajo</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                <th className="px-6 py-4 w-10">
                  <input 
                    type="checkbox" 
                    className="rounded border-gray-300 text-green-500 focus:ring-green-500"
                    checked={filteredProducts.length > 0 && selectedIds.length === filteredProducts.length}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th className="px-6 py-4 font-bold">Producto</th>
                <th className="px-6 py-4 font-bold">Categoría</th>
                <th className="px-6 py-4 font-bold">Precio Compra</th>
                <th className="px-6 py-4 font-bold">Precio Venta</th>
                <th className="px-6 py-4 font-bold">Stock</th>
                <th className="px-6 py-4 font-bold">Estado</th>
                <th className="px-6 py-4 font-bold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredProducts.map((product) => (
                <tr key={product.id} className={cn(
                  "hover:bg-gray-50 transition-colors group",
                  selectedIds.includes(product.id) && "bg-green-50/30"
                )}>
                  <td className="px-6 py-4">
                    <input 
                      type="checkbox" 
                      className="rounded border-gray-300 text-green-500 focus:ring-green-500"
                      checked={selectedIds.includes(product.id)}
                      onChange={() => toggleSelect(product.id)}
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-lg overflow-hidden shrink-0">
                        <img 
                          src={product.image || `https://picsum.photos/seed/${product.id}/100/100`} 
                          alt="" 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">{product.name}</p>
                        <div className="flex items-center gap-2">
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">{product.code}</p>
                          {product.has_serials && (
                            <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 text-[8px] font-black uppercase rounded">Series</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 text-[10px] font-bold uppercase rounded-full">
                      {product.category_name}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-600">
                    {formatCurrency(product.purchase_price)}
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-green-600">
                    {formatCurrency(product.sale_price)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "text-sm font-bold",
                        product.stock <= product.min_stock ? "text-red-600" : "text-gray-900"
                      )}>
                        {product.stock}
                      </span>
                      {product.stock <= product.min_stock && (
                        <AlertCircle size={14} className="text-red-500" />
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1.5">
                        <div className={cn(
                          "w-2 h-2 rounded-full",
                          product.status === 'active' ? "bg-green-500" : "bg-gray-300"
                        )} />
                        <span className="text-xs font-medium text-gray-600 capitalize">{product.status}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => openModal(product)}
                        className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Edit size={18} />
                      </button>
                      <button 
                        onClick={() => handleDelete(product.id)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className={cn(
                "relative bg-white rounded-3xl shadow-2xl overflow-hidden transition-all duration-300",
                formData.has_serials ? "w-full max-w-5xl" : "w-full max-w-2xl"
              )}
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">
                  {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[85vh]">
                <div className={cn(
                  "grid gap-8",
                  formData.has_serials ? "grid-cols-1 lg:grid-cols-3" : "grid-cols-1"
                )}>
                  <div className={cn(
                    "grid grid-cols-1 md:grid-cols-2 gap-6",
                    formData.has_serials ? "lg:col-span-2" : ""
                  )}>
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-sm font-bold text-gray-700">Nombre del Producto</label>
                        <input 
                          required
                          type="text"
                          className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-green-500"
                          value={formData.name || ''}
                          onChange={(e) => setFormData({...formData, name: e.target.value})}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-bold text-gray-700">Categoría</label>
                        <div className="relative">
                          <div 
                            className="w-full px-4 py-2.5 bg-gray-50 rounded-xl flex items-center justify-between cursor-pointer border-none focus-within:ring-2 focus-within:ring-green-500"
                            onClick={() => setShowCategoryList(!showCategoryList)}
                          >
                            <input 
                              type="text"
                              placeholder="Buscar categoría..."
                              className="bg-transparent border-none p-0 focus:ring-0 w-full text-sm"
                              value={categorySearch || (categories.find(c => c.id === parseInt(formData.category_id))?.name || '')}
                              onChange={(e) => {
                                setCategorySearch(e.target.value);
                                setShowCategoryList(true);
                              }}
                              onFocus={() => setShowCategoryList(true)}
                            />
                            <ChevronDown size={16} className="text-gray-400" />
                          </div>
                          
                          <AnimatePresence>
                            {showCategoryList && (
                              <motion.div 
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="absolute z-50 w-full mt-2 bg-white border border-gray-100 rounded-xl shadow-xl max-h-48 overflow-y-auto"
                              >
                                {filteredCategories.length > 0 ? (
                                  filteredCategories.map(cat => (
                                    <div 
                                      key={cat.id}
                                      className="px-4 py-2 hover:bg-green-50 cursor-pointer text-sm font-medium transition-colors"
                                      onClick={() => {
                                        setFormData({...formData, category_id: cat.id.toString()});
                                        setCategorySearch(cat.name);
                                        setShowCategoryList(false);
                                      }}
                                    >
                                      {cat.name}
                                    </div>
                                  ))
                                ) : (
                                  <div className="px-4 py-2 text-xs text-gray-400 italic">No se encontraron categorías</div>
                                )}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-sm font-bold text-gray-700">Precio Compra</label>
                          <input 
                            required
                            type="number"
                            step="0.01"
                            className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-green-500"
                            value={formData.purchase_price || ''}
                            onChange={(e) => setFormData({...formData, purchase_price: e.target.value})}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-sm font-bold text-gray-700">Precio Venta</label>
                          <input 
                            required
                            type="number"
                            step="0.01"
                            className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-green-500"
                            value={formData.sale_price || ''}
                            onChange={(e) => setFormData({...formData, sale_price: e.target.value})}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-sm font-bold text-gray-700">Stock Inicial</label>
                          <input 
                            required={!formData.has_serials}
                            disabled={formData.has_serials}
                            type="number"
                            className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-green-500 disabled:opacity-50"
                            value={formData.has_serials ? (formData.serial_numbers.length || '0') : (formData.stock || '')}
                            onChange={(e) => setFormData({...formData, stock: e.target.value})}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-sm font-bold text-gray-700">Stock Mínimo</label>
                          <input 
                            required
                            type="number"
                            className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-green-500"
                            value={formData.min_stock || ''}
                            onChange={(e) => setFormData({...formData, min_stock: e.target.value})}
                          />
                        </div>
                      </div>
                      <div className="p-4 bg-green-50/50 rounded-2xl border border-green-100/50">
                        <label className="flex items-center gap-3 cursor-pointer group">
                          <div className="relative flex items-center">
                            <input 
                              type="checkbox"
                              className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border border-gray-300 checked:border-green-500 checked:bg-green-500 transition-all"
                              checked={formData.has_serials}
                              onChange={(e) => setFormData({...formData, has_serials: e.target.checked})}
                            />
                            <Check className="absolute h-3.5 w-3.5 text-white opacity-0 peer-checked:opacity-100 left-0.5 top-0.5 pointer-events-none transition-opacity" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-gray-800 group-hover:text-green-600 transition-colors">Manejar Números de Serie</span>
                            <span className="text-[10px] text-gray-500">Activa el seguimiento individual por código de serie</span>
                          </div>
                        </label>
                      </div>
                      
                      <div className="space-y-1.5">
                        <label className="text-sm font-bold text-gray-700">Proveedor</label>
                        <div className="relative">
                          <div 
                            className="w-full px-4 py-2.5 bg-gray-50 rounded-xl flex items-center justify-between cursor-pointer border-none focus-within:ring-2 focus-within:ring-green-500"
                            onClick={() => setShowSupplierList(!showSupplierList)}
                          >
                            <input 
                              type="text"
                              placeholder="Buscar proveedor..."
                              className="bg-transparent border-none p-0 focus:ring-0 w-full text-sm"
                              value={supplierSearch || (suppliers.find(s => s.id === parseInt(formData.supplier_id))?.name || '')}
                              onChange={(e) => {
                                setSupplierSearch(e.target.value);
                                setShowSupplierList(true);
                              }}
                              onFocus={() => setShowSupplierList(true)}
                            />
                            <ChevronDown size={16} className="text-gray-400" />
                          </div>
                          
                          <AnimatePresence>
                            {showSupplierList && (
                              <motion.div 
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="absolute z-50 w-full mt-2 bg-white border border-gray-100 rounded-xl shadow-xl max-h-48 overflow-y-auto"
                              >
                                <div 
                                  className="px-4 py-2 hover:bg-green-50 cursor-pointer text-sm font-medium transition-colors text-gray-400"
                                  onClick={() => {
                                    setFormData({...formData, supplier_id: ''});
                                    setSupplierSearch('');
                                    setShowSupplierList(false);
                                  }}
                                >
                                  Sin Proveedor
                                </div>
                                {filteredSuppliers.length > 0 ? (
                                  filteredSuppliers.map(sup => (
                                    <div 
                                      key={sup.id}
                                      className="px-4 py-2 hover:bg-green-50 cursor-pointer text-sm font-medium transition-colors"
                                      onClick={() => {
                                        setFormData({...formData, supplier_id: sup.id.toString()});
                                        setSupplierSearch(sup.name);
                                        setShowSupplierList(false);
                                      }}
                                    >
                                      {sup.name}
                                    </div>
                                  ))
                                ) : (
                                  <div className="px-4 py-2 text-xs text-gray-400 italic">No se encontraron proveedores</div>
                                )}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-bold text-gray-700">Imagen del Producto</label>
                        <div className="flex gap-4 items-center">
                          <div className="w-20 h-20 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden shrink-0">
                            {formData.image ? (
                              <img src={formData.image} alt="Preview" className="w-full h-full object-cover" />
                            ) : (
                              <ImageIcon className="text-gray-300" size={24} />
                            )}
                          </div>
                          <div className="flex-1">
                            <input 
                              type="file" 
                              ref={fileInputRef}
                              className="hidden" 
                              accept="image/*"
                              onChange={handleImageUpload}
                            />
                            <button 
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className="w-full px-4 py-2.5 bg-gray-100 text-gray-600 text-xs font-bold rounded-xl hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                            >
                              <Upload size={16} />
                              Subir Imagen
                            </button>
                            <p className="text-[10px] text-gray-400 mt-1">Formatos: JPG, PNG. Máx 5MB.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {formData.has_serials && (
                    <div className="lg:col-span-1 flex flex-col h-full bg-gray-50 rounded-2xl p-4 border border-gray-100">
                      <div className="flex items-center justify-between mb-4">
                        <label className="text-sm font-bold text-gray-700">Números de Serie</label>
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-black rounded-full">
                          {formData.serial_numbers.length} TOTAL
                        </span>
                      </div>
                      
                      <div className="space-y-3 flex-1 flex flex-col min-h-0">
                        <div className="relative">
                          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                          <input 
                            type="text"
                            placeholder="Buscar serie..."
                            className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-green-500"
                            value={serialSearch}
                            onChange={(e) => setSerialSearch(e.target.value)}
                          />
                        </div>

                        <div className="flex gap-2">
                          <input 
                            type="text"
                            placeholder="Nueva serie..."
                            className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-green-500"
                            value={newSerial}
                            onChange={(e) => setNewSerial(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                const trimmed = newSerial.trim();
                                if (!trimmed) return;
                                
                                if (formData.serial_numbers.includes(trimmed)) {
                                  alert('Este número de serie ya está en la lista.');
                                  return;
                                }
                                
                                setFormData({
                                  ...formData,
                                  serial_numbers: [trimmed, ...formData.serial_numbers]
                                });
                                setNewSerial('');
                              }
                            }}
                          />
                          <button 
                            type="button"
                            onClick={() => {
                              const trimmed = newSerial.trim();
                              if (!trimmed) return;
                              
                              if (formData.serial_numbers.includes(trimmed)) {
                                alert('Este número de serie ya está en la lista.');
                                return;
                              }
                              
                              setFormData({
                                ...formData,
                                serial_numbers: [trimmed, ...formData.serial_numbers]
                              });
                              setNewSerial('');
                            }}
                            className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                          >
                            <Plus size={16} />
                          </button>
                        </div>

                        <div className="flex-1 overflow-y-auto min-h-[200px] space-y-1 pr-1 custom-scrollbar">
                          {formData.serial_numbers
                            .filter(s => s.toLowerCase().includes(serialSearch.toLowerCase()))
                            .map((serial, idx) => (
                              <div key={idx} className="flex items-center justify-between p-2 bg-white rounded-lg border border-gray-100 group">
                                <span className="text-xs font-mono text-gray-600">{serial}</span>
                                <button 
                                  type="button"
                                  onClick={() => setFormData({
                                    ...formData,
                                    serial_numbers: formData.serial_numbers.filter(s => s !== serial)
                                  })}
                                  className="p-1 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            ))}
                          {formData.serial_numbers.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                              <AlertCircle size={24} className="mb-2 opacity-20" />
                              <p className="text-[10px] font-medium">No hay series registradas</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
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
                    {editingProduct ? 'Guardar Cambios' : 'Crear Producto'}
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
