import React, { useState, useEffect, useRef } from 'react';
import { apiFetch } from '../lib/api';
import { 
  Store, 
  Ticket, 
  Palette, 
  Database, 
  Save, 
  Upload, 
  Download,
  CheckCircle2,
  AlertCircle,
  UserCircle
} from 'lucide-react';
import { motion } from 'motion/react';
import { AppSettings } from '../types';
import { cn } from '../lib/utils';
import * as XLSX from 'xlsx';
import { useDataSync } from '../hooks/useDataSync';

const CURRENCIES = [
  { code: 'S/', name: 'Sol Peruano (PEN)' },
  { code: '$', name: 'Dólar Estadounidense (USD)' },
  { code: '€', name: 'Euro (EUR)' },
  { code: '£', name: 'Libra Esterlina (GBP)' },
  { code: '¥', name: 'Yen Japonés (JPY)' },
  { code: 'R$', name: 'Real Brasileño (BRL)' },
  { code: 'Mex$', name: 'Peso Mexicano (MXN)' },
  { code: 'CLP', name: 'Peso Chileno (CLP)' },
  { code: 'COP', name: 'Peso Colombiano (COP)' },
  { code: 'ARS', name: 'Peso Argentino (ARS)' },
  { code: 'Bs.', name: 'Boliviano (BOB)' },
  { code: '₲', name: 'Guaraní Paraguayo (PYG)' },
  { code: 'U$', name: 'Peso Uruguayo (UYU)' },
];

export default function Configuration({ user }: { user: any }) {
  const [settings, setSettings] = useState<AppSettings>({
    business_name: '',
    address: '',
    phone: '',
    email: '',
    currency: 'S/',
    ticket_message: '',
    theme_mode: 'light',
    primary_color: '#22c55e',
    user_name: '',
    user_role: '',
    user_avatar: '',
    license_expiry: '',
    license_type: 'demo'
  });
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  
  const logoInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const [successMessage, setSuccessMessage] = useState('');

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        
        const data: any = {};
        const sheetMap: any = {
          "Productos": "products",
          "Categorías": "categories",
          "Proveedores": "suppliers",
          "Clientes": "customers",
          "Ventas": "sales",
          "Detalle_Ventas": "sale_items",
          "Series_Productos": "product_items"
        };

        wb.SheetNames.forEach(name => {
          const key = sheetMap[name];
          if (key) {
            data[key] = XLSX.utils.sheet_to_json(wb.Sheets[name]);
          }
        });

        if (Object.keys(data).length === 0) {
          alert('El archivo no parece ser un respaldo válido.');
          return;
        }

        setIsSaving(true);
        const res = await apiFetch('/api/import', {
          method: 'POST',
          body: JSON.stringify(data)
        });

        if (res.ok) {
          setSuccessMessage('Datos importados correctamente. El sistema se actualizará.');
          setTimeout(() => setSuccessMessage(''), 3000);
        } else {
          const err = await res.json();
          alert('Error al importar: ' + err.error);
        }
      } catch (error) {
        console.error('Error reading excel:', error);
        alert('Error al procesar el archivo Excel.');
      } finally {
        setIsSaving(false);
        if (importInputRef.current) importInputRef.current.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  const saveSettings = async (currentSettings: AppSettings) => {
    setIsSaving(true);
    try {
      const res = await apiFetch('/api/settings', {
        method: 'POST',
        body: JSON.stringify(currentSettings)
      });
      if (res.ok) {
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 2000);
      }
    } catch (error) {
      console.error('Error saving settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Manual save handler
  const handleManualSave = () => {
    saveSettings(settings);
    setHasChanges(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'business_logo' | 'user_avatar') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const newSettings = { ...settings, [field]: reader.result as string };
        setSettings(newSettings);
        setHasChanges(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const fetchSettings = () => {
    apiFetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        setSettings(data);
        setHasChanges(false);
      });
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  useDataSync(fetchSettings);

  const handleColorChange = async (color: string) => {
    const newSettings = { ...settings, primary_color: color, theme_mode: 'light' };
    setSettings(newSettings);
    setHasChanges(true);
    document.documentElement.style.setProperty('--primary-color', color);
  };

  const exportBackup = async () => {
    try {
      const res = await apiFetch('/api/backup/all');
      const data = await res.json();

      const workbook = XLSX.utils.book_new();
      
      // Clean data for backup (exclude images to keep file size reasonable)
      const cleanProducts = data.products.map(({ image, ...rest }: any) => rest);

      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(cleanProducts), "Productos");
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(data.categories), "Categorías");
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(data.suppliers), "Proveedores");
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(data.customers), "Clientes");
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(data.sales), "Ventas");
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(data.sale_items), "Detalle_Ventas");
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(data.product_items), "Series_Productos");

      XLSX.writeFile(workbook, `Respaldo_POS_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
      console.error('Error exporting backup:', error);
      alert('Error al exportar el respaldo.');
    }
  };



  const tabs = [
    { id: 'business', label: 'Datos del Negocio', icon: Store },
    { id: 'ticket', label: 'Configuración de Ticket', icon: Ticket },
    { id: 'appearance', label: 'Apariencia', icon: Palette },
    { id: 'profile', label: 'Mi Perfil', icon: UserCircle },
    { id: 'backup', label: 'Respaldo de Datos', icon: Database },
  ];

  const [activeTab, setActiveTab] = useState('business');

  return (
    <div className="space-y-6">
      {successMessage && (
        <div className="fixed top-6 right-6 z-[100] bg-blue-600 text-white px-6 py-3 rounded-2xl shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 size={20} />
          <span className="font-bold">{successMessage}</span>
        </div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Configuración del Sistema</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Personaliza tu POS y gestiona tus datos.</p>
        </div>
        {showSuccess && (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2 px-4 py-2 bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 rounded-xl border border-green-100 dark:border-green-900/30 font-bold text-sm"
          >
            <CheckCircle2 size={18} />
            Cambios guardados con éxito
          </motion.div>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar Tabs */}
        <div className="w-full lg:w-64 shrink-0 space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-sm",
                activeTab === tab.id 
                  ? "bg-primary text-white shadow-lg shadow-primary/20" 
                  : "text-gray-500 hover:bg-white hover:text-gray-900"
              )}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className={cn(
          "flex-1 rounded-3xl border shadow-sm overflow-hidden",
          "bg-white border-gray-100"
        )}>
          <div className="p-8">
            {activeTab === 'business' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2 flex flex-col items-center gap-4 mb-4">
                    <div className="relative group">
                      <div className="w-32 h-32 bg-gray-100 dark:bg-gray-800 rounded-2xl border-4 border-white dark:border-gray-700 shadow-xl overflow-hidden flex items-center justify-center">
                        {settings.business_logo ? (
                          <img 
                            src={settings.business_logo} 
                            alt="Logo del Negocio" 
                            className="w-full h-full object-contain"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <Store size={40} className="text-gray-400" />
                        )}
                      </div>
                      <input 
                        type="file" 
                        ref={logoInputRef} 
                        className="hidden" 
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, 'business_logo')}
                      />
                      <button 
                        type="button"
                        onClick={() => logoInputRef.current?.click()}
                        className="absolute bottom-0 right-0 w-10 h-10 bg-gray-900 dark:bg-primary text-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
                      >
                        <Upload size={18} />
                      </button>
                    </div>
                    <div className="text-center">
                      <h4 className="font-bold text-gray-900 dark:text-white">Logo del Negocio</h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Sube el logo que aparecerá en los tickets.</p>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Nombre Comercial</label>
                    <input 
                      type="text"
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border-none rounded-xl focus:ring-2 focus:ring-primary dark:text-white"
                      value={settings.business_name || ''}
                      onChange={(e) => {
                        setSettings({...settings, business_name: e.target.value});
                        setHasChanges(true);
                      }}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Dirección</label>
                    <input 
                      type="text"
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border-none rounded-xl focus:ring-2 focus:ring-primary dark:text-white"
                      value={settings.address || ''}
                      onChange={(e) => {
                        setSettings({...settings, address: e.target.value});
                        setHasChanges(true);
                      }}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Teléfono</label>
                    <input 
                      type="text"
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border-none rounded-xl focus:ring-2 focus:ring-primary dark:text-white"
                      value={settings.phone || ''}
                      onChange={(e) => {
                        setSettings({...settings, phone: e.target.value});
                        setHasChanges(true);
                      }}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Correo Electrónico</label>
                    <input 
                      type="email"
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border-none rounded-xl focus:ring-2 focus:ring-primary dark:text-white"
                      value={settings.email || ''}
                      onChange={(e) => {
                        setSettings({...settings, email: e.target.value});
                        setHasChanges(true);
                      }}
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Moneda</label>
                      <select 
                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border-none rounded-xl focus:ring-2 focus:ring-primary dark:text-white font-bold"
                        value={settings.currency || 'S/'}
                        onChange={(e) => {
                          setSettings({...settings, currency: e.target.value});
                          setHasChanges(true);
                        }}
                      >
                        {CURRENCIES.map(c => (
                          <option key={c.code} value={c.code}>{c.name} - {c.code}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="md:col-span-2 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <h4 className="font-bold text-gray-900 dark:text-white mb-4">Cuentas Bancarias (Para Cotizaciones A4)</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-1.5">
                        <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Cuenta BCP</label>
                        <input 
                          type="text"
                          className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border-none rounded-xl focus:ring-2 focus:ring-primary dark:text-white"
                          value={settings.bank_bcp || ''}
                          onChange={(e) => {
                            setSettings({...settings, bank_bcp: e.target.value});
                            setHasChanges(true);
                          }}
                          placeholder="Ej. 193-XXXXXXXX-X-XX"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Cuenta CCI</label>
                        <input 
                          type="text"
                          className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border-none rounded-xl focus:ring-2 focus:ring-primary dark:text-white"
                          value={settings.bank_cci || ''}
                          onChange={(e) => {
                            setSettings({...settings, bank_cci: e.target.value});
                            setHasChanges(true);
                          }}
                          placeholder="Ej. 002-193XXXXXXXXXXXXXXX"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Yape / Plin</label>
                        <input 
                          type="text"
                          className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border-none rounded-xl focus:ring-2 focus:ring-primary dark:text-white"
                          value={settings.bank_yape_plin || ''}
                          onChange={(e) => {
                            setSettings({...settings, bank_yape_plin: e.target.value});
                            setHasChanges(true);
                          }}
                          placeholder="Ej. 987654321"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="md:col-span-2 pt-6 flex justify-end">
                    <button
                      onClick={handleManualSave}
                      disabled={isSaving || !hasChanges}
                      className={cn(
                        "flex items-center gap-2 px-8 py-3 rounded-2xl font-black text-sm transition-all shadow-xl",
                        hasChanges 
                          ? "bg-primary text-white shadow-primary/20 hover:scale-105 active:scale-95" 
                          : "bg-gray-100 text-gray-400 cursor-not-allowed"
                      )}
                    >
                      {isSaving ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Save size={18} />
                      )}
                      GUARDAR DATOS DEL NEGOCIO
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'ticket' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Mensaje al pie del ticket</label>
                    <textarea 
                      rows={4}
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border-none rounded-xl focus:ring-2 focus:ring-primary dark:text-white"
                      value={settings.ticket_message || ''}
                      onChange={(e) => {
                        setSettings({...settings, ticket_message: e.target.value});
                        setHasChanges(true);
                      }}
                      placeholder="Ej. ¡Gracias por su preferencia! Vuelva pronto."
                    />
                  </div>
                  <div className="p-6 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white dark:bg-gray-700 rounded-lg flex items-center justify-center text-primary shadow-sm">
                        <Ticket size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900 dark:text-white">Formato de Impresión</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Selecciona el tamaño predeterminado.</p>
                      </div>
                    </div>
                    <select 
                      className="bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 rounded-lg text-sm font-bold dark:text-white"
                      value={settings.ticket_size || '80mm'}
                      onChange={(e) => {
                        setSettings({...settings, ticket_size: e.target.value as '80mm' | '58mm' | 'A4'});
                        setHasChanges(true);
                      }}
                    >
                      <option value="80mm">Ticket 80mm</option>
                      <option value="58mm">Ticket 58mm</option>
                      <option value="A4">Formato A4</option>
                    </select>
                  </div>

                  <div className="p-6 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white dark:bg-gray-700 rounded-lg flex items-center justify-center text-primary shadow-sm">
                        <Ticket size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900 dark:text-white">Tipo de Comprobante</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Título predeterminado del documento.</p>
                      </div>
                    </div>
                    <select 
                      className="bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 rounded-lg text-sm font-bold dark:text-white"
                      value={settings.default_document_type || 'boleta'}
                      onChange={(e) => {
                        setSettings({...settings, default_document_type: e.target.value as 'boleta' | 'nota'});
                        setHasChanges(true);
                      }}
                    >
                      <option value="boleta">Boleta Electrónica</option>
                      <option value="nota">Nota de Venta</option>
                    </select>
                  </div>

                  <div className="p-6 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white dark:bg-gray-700 rounded-lg flex items-center justify-center text-primary shadow-sm">
                        <Palette size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900 dark:text-white">Estilo de Fuente</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Personaliza la tipografía del ticket.</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-500 uppercase">Tipo de Letra</label>
                        <select 
                          className="w-full bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 rounded-lg text-sm font-bold dark:text-white"
                          value={settings.ticket_font_family || 'monospace'}
                          onChange={(e) => {
                            setSettings({...settings, ticket_font_family: e.target.value as any});
                            setHasChanges(true);
                          }}
                        >
                          <option value="monospace">Monospace (Predeterminado)</option>
                          <option value="sans-serif">Sans Serif (Inter/Arial)</option>
                          <option value="serif">Serif (Times New Roman)</option>
                          <option value="courier">Courier New</option>
                        </select>
                      </div>
                      
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer group">
                          <input 
                            type="checkbox"
                            className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                            checked={settings.ticket_font_bold === true || settings.ticket_font_bold === 'true'}
                            onChange={(e) => {
                              setSettings({...settings, ticket_font_bold: e.target.checked});
                              setHasChanges(true);
                            }}
                          />
                          <span className="text-sm font-bold text-gray-700 dark:text-gray-300 group-hover:text-primary transition-colors">Negrita</span>
                        </label>
                        
                        <label className="flex items-center gap-2 cursor-pointer group">
                          <input 
                            type="checkbox"
                            className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                            checked={settings.ticket_font_italic === true || settings.ticket_font_italic === 'true'}
                            onChange={(e) => {
                              setSettings({...settings, ticket_font_italic: e.target.checked});
                              setHasChanges(true);
                            }}
                          />
                          <span className="text-sm font-bold text-gray-700 dark:text-gray-300 group-hover:text-primary transition-colors">Cursiva</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Ticket Preview */}
                <div className="flex flex-col items-center justify-start bg-gray-100 dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700">
                  <h4 className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-4 uppercase tracking-wider">Vista Previa del Ticket</h4>
                  <div 
                    className={cn(
                      "bg-white text-black p-6 shadow-lg text-xs transition-all duration-300",
                      settings.ticket_size === 'A4' ? "w-full aspect-[1/1.414] max-w-[400px]" : 
                      settings.ticket_size === '58mm' ? "w-full max-w-[220px]" : "w-full max-w-[300px]"
                    )}
                    style={{ 
                      fontFamily: settings.ticket_font_family === 'courier' ? "'Courier New', Courier, monospace" : settings.ticket_font_family || 'monospace',
                      fontWeight: (settings.ticket_font_bold === true || settings.ticket_font_bold === 'true') ? 'bold' : 'normal',
                      fontStyle: (settings.ticket_font_italic === true || settings.ticket_font_italic === 'true') ? 'italic' : 'normal'
                    }}
                  >
                    <div className="text-center mb-4">
                      {settings.business_logo ? (
                        <img 
                          src={settings.business_logo} 
                          alt="Logo" 
                          className="w-16 h-16 object-contain mx-auto mb-2" 
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-green-500 rounded-2xl mx-auto flex items-center justify-center text-white shadow-lg shadow-green-500/20 mb-2">
                          <Store size={32} />
                        </div>
                      )}
                      <h3 className="font-bold text-lg mb-1">{settings.business_name || 'MI NEGOCIO'}</h3>
                      <p>{settings.address || 'Dirección de ejemplo 123'}</p>
                      <p>Tel: {settings.phone || '000-000-000'}</p>
                      <p className="mt-2 uppercase font-bold">
                        {settings.default_document_type === 'nota' ? 'Nota de Venta' : 'Boleta Electrónica'}
                      </p>
                      <p>N° 001-000001</p>
                      <p>{new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</p>
                    </div>
                    
                    <div className="border-t border-b border-dashed border-gray-400 py-2 mb-2">
                      <div className="flex justify-between font-bold mb-1">
                        <span>CANT DESCRIPCIÓN</span>
                        <span>IMPORTE</span>
                      </div>
                      <div className="flex justify-between">
                        <span>1x Producto de Ejemplo</span>
                        <span>{settings.currency} 25.00</span>
                      </div>
                      <div className="flex justify-between">
                        <span>2x Otro Producto</span>
                        <span>{settings.currency} 50.00</span>
                      </div>
                    </div>
                    
                    <div className="space-y-1 mb-4">
                      <div className="flex justify-between">
                        <span>SUBTOTAL:</span>
                        <span>{settings.currency} 75.00</span>
                      </div>
                      <div className="flex justify-between font-bold text-sm">
                        <span>TOTAL:</span>
                        <span>{settings.currency} 75.00</span>
                      </div>
                    </div>
                    
                    <div className="text-center border-t border-dashed border-gray-400 pt-4">
                      <p className="whitespace-pre-wrap">{settings.ticket_message || '¡Gracias por su compra!'}</p>
                    </div>
                  </div>
                  
                  <div className="mt-8 w-full">
                    <button 
                      onClick={handleManualSave}
                      disabled={!hasChanges}
                      className="w-full bg-primary text-white font-bold py-3 rounded-xl shadow-lg shadow-primary/20 hover:opacity-90 disabled:opacity-50 disabled:shadow-none transition-all flex items-center justify-center gap-2"
                    >
                      <Save size={20} />
                      GUARDAR CONFIGURACIÓN DE TICKET
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'appearance' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-6 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 space-y-4">
                    <h4 className="font-bold text-gray-900 dark:text-white">Color Principal</h4>
                    <div className="flex items-center gap-4">
                      <input 
                        type="color" 
                        value={settings.primary_color || '#22c55e'}
                        onChange={(e) => handleColorChange(e.target.value)}
                        className="w-14 h-14 rounded-xl cursor-pointer border-0 p-0 bg-transparent"
                      />
                      <div className="flex-1">
                        <p className="text-sm text-gray-500 dark:text-gray-400">Selecciona un color para personalizar el sistema. Los cambios se aplican y guardan en tiempo real.</p>
                      </div>
                    </div>
                    <div className="flex gap-3 mt-4">
                      {['#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#f97316', '#ef4444'].map(color => (
                        <button 
                          key={color}
                          type="button"
                          onClick={() => handleColorChange(color)}
                          className={cn(
                            "w-8 h-8 rounded-full border-2 transition-all",
                            settings.primary_color === color ? "border-gray-900 dark:border-white scale-110" : "border-transparent shadow-sm hover:scale-110"
                          )}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'profile' && (
              <div className="space-y-6">
                <div className="flex flex-col items-center gap-6 mb-8">
                  <div className="relative group">
                    <div className="w-32 h-32 bg-gray-100 dark:bg-gray-800 rounded-full border-4 border-white dark:border-gray-700 shadow-xl overflow-hidden">
                      <img 
                        src={settings.user_avatar || 'https://picsum.photos/seed/admin/100/100'} 
                        alt="Avatar" 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <input 
                      type="file" 
                      ref={avatarInputRef} 
                      className="hidden" 
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, 'user_avatar')}
                    />
                    <button 
                      type="button"
                      onClick={() => avatarInputRef.current?.click()}
                      className="absolute bottom-0 right-0 w-10 h-10 bg-gray-900 dark:bg-primary text-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
                    >
                      <Upload size={18} />
                    </button>
                  </div>
                  <div className="text-center">
                    <h4 className="font-bold text-gray-900 dark:text-white">Foto de Perfil</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Sube una foto para personalizar tu cuenta.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Nombre Completo</label>
                    <input 
                      type="text"
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border-none rounded-xl focus:ring-2 focus:ring-primary dark:text-white"
                      value={settings.user_name || ''}
                      onChange={(e) => {
                        setSettings({...settings, user_name: e.target.value});
                        setHasChanges(true);
                      }}
                      placeholder="Ej. Juan Pérez"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Cargo / Rol</label>
                    <input 
                      type="text"
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border-none rounded-xl focus:ring-2 focus:ring-primary dark:text-white"
                      value={settings.user_role || ''}
                      onChange={(e) => {
                        setSettings({...settings, user_role: e.target.value});
                        setHasChanges(true);
                      }}
                      placeholder="Ej. Administrador"
                    />
                  </div>

                  <div className="md:col-span-2 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <h4 className="font-bold text-gray-900 dark:text-white mb-4">Credenciales de Administrador</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-1.5">
                        <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Correo de Acceso</label>
                        <input 
                          type="email"
                          readOnly
                          className="w-full px-4 py-2.5 bg-gray-100 dark:bg-gray-800 border-none rounded-xl dark:text-gray-400 cursor-not-allowed"
                          value={settings.admin_email || ''}
                        />
                        <p className="text-[10px] text-gray-500">El correo de administrador no se puede cambiar por seguridad.</p>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Pregunta de Seguridad</label>
                        <input 
                          type="text"
                          readOnly
                          className="w-full px-4 py-2.5 bg-gray-100 dark:bg-gray-800 border-none rounded-xl dark:text-gray-400 cursor-not-allowed"
                          value={settings.security_question || ''}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="md:col-span-2 pt-6 flex justify-end">
                    <button
                      onClick={handleManualSave}
                      disabled={isSaving || !hasChanges}
                      className={cn(
                        "flex items-center gap-2 px-8 py-3 rounded-2xl font-black text-sm transition-all shadow-xl",
                        hasChanges 
                          ? "bg-primary text-white shadow-primary/20 hover:scale-105 active:scale-95" 
                          : "bg-gray-100 text-gray-400 cursor-not-allowed"
                      )}
                    >
                      {isSaving ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Save size={18} />
                      )}
                      GUARDAR MI PERFIL
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'backup' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-8 bg-green-50 dark:bg-green-500/10 rounded-3xl border border-green-100 dark:border-green-900/30 text-center space-y-4">
                    <div className="w-16 h-16 bg-white dark:bg-gray-800 rounded-2xl mx-auto flex items-center justify-center text-green-500 shadow-sm">
                      <Download size={32} />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 dark:text-white">Exportar Datos</h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Descarga toda tu información en formato Excel.</p>
                    </div>
                    <button 
                      type="button" 
                      onClick={exportBackup}
                      className="w-full py-3 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/20 hover:opacity-90 transition-all"
                    >
                      Descargar Respaldo
                    </button>
                  </div>
                  <div className="p-8 bg-blue-50 dark:bg-blue-500/10 rounded-3xl border border-blue-100 dark:border-blue-900/30 text-center space-y-4">
                    <div className="w-16 h-16 bg-white dark:bg-gray-800 rounded-2xl mx-auto flex items-center justify-center text-blue-500 shadow-sm">
                      <Upload size={32} />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 dark:text-white">Importar Datos</h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Restaura tu información desde un archivo Excel.</p>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => importInputRef.current?.click()}
                      disabled={isSaving}
                      className="w-full py-3 bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 hover:bg-blue-600 transition-colors disabled:opacity-50"
                    >
                      {isSaving ? 'Importando...' : 'Subir Archivo'}
                    </button>
                    <input 
                      type="file" 
                      ref={importInputRef} 
                      className="hidden" 
                      accept=".xlsx, .xls"
                      onChange={handleImport}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-orange-50 dark:bg-orange-500/10 rounded-2xl border border-orange-100 dark:border-orange-900/30 text-orange-700 dark:text-orange-400">
                  <AlertCircle size={20} className="shrink-0" />
                  <p className="text-xs font-medium">Atención: La importación de datos reemplazará la información actual. Asegúrate de tener un respaldo previo.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
