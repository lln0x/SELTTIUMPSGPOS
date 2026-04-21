import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  Tags, 
  Truck, 
  Users, 
  BarChart3, 
  Settings, 
  LogOut,
  ChevronRight,
  Menu,
  X,
  Store,
  ShieldCheck,
  ShieldAlert,
  Key,
  Clock,
  AlertCircle,
  Play,
  Check,
  Info,
  Facebook,
  Instagram,
  MessageCircle,
  Smartphone,
  FileText,
  Wallet,
  Code
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { AppSettings } from './types';
import Dashboard from './components/Dashboard';
import POS from './components/POS';
import Inventory from './components/Inventory';
import Categories from './components/Categories';
import Suppliers from './components/Suppliers';
import Customers from './components/Customers';
import Reports from './components/Reports';
import Configuration from './components/Configuration';
import SalesRecords from './components/SalesRecords';
import UsersTab from './components/Users';
import CashFlow from './components/CashFlow';
import DeveloperMode from './components/DeveloperMode';
import { useDataSync } from './hooks/useDataSync';

type Section = 'dashboard' | 'pos' | 'inventory' | 'categories' | 'suppliers' | 'customers' | 'reports' | 'settings' | 'sales_records' | 'users' | 'dev_mode' | 'cash_flow';

function ContactModal({ isOpen, onClose, settings }: { isOpen: boolean, onClose: () => void, settings: AppSettings | null }) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20, rotateX: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0, rotateX: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20, rotateX: 10 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="bg-white dark:bg-gray-900 rounded-[3rem] shadow-2xl max-w-lg w-full overflow-hidden relative border border-white/20 dark:border-gray-800"
        >
          {/* Decorative Background Elements */}
          <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-br from-blue-600/10 to-purple-600/10 -z-10" />
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-500/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-purple-500/5 rounded-full blur-3xl" />

          <button 
            onClick={onClose}
            className="absolute top-6 right-6 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-all text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 z-10"
          >
            <X size={24} />
          </button>

          <div className="p-8 md:p-10 space-y-10">
            <div className="text-center space-y-4">
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring" }}
                className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-3xl flex items-center justify-center text-white mx-auto shadow-xl shadow-blue-500/20"
              >
                <ShieldCheck size={40} />
              </motion.div>
              <div className="space-y-1">
                <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Selltium PSG</h2>
                <p className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-[0.2em]">Todos los derechos reservados</p>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-[2rem] p-6 border border-gray-100 dark:border-gray-800 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">PROPIETARIO</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">POSSOLUTIONGROUP</p>
                </div>
                <div className="space-y-1 text-right">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">AÑO</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">2026</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">VERSIÓN</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">v2.5.0 Stable</p>
                </div>
                <div className="space-y-1 text-right">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">LICENCIA</p>
                  <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400 text-[10px] font-black uppercase rounded-md border border-blue-200 dark:border-blue-800">
                    {settings?.license_type === 'infinite' ? 'Vitalicia' : settings?.license_type?.replace('_', ' ') || 'Demo'}
                  </span>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200 dark:border-gray-700 grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-gray-400" />
                  <div className="space-y-0.5">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">INSTALACIÓN</p>
                    <p className="text-[11px] font-bold text-gray-700 dark:text-gray-300">
                      {settings?.installation_date ? new Date(settings.installation_date).toLocaleDateString() : 'Pendiente'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 justify-end">
                  <div className="space-y-0.5 text-right">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">ESTADO</p>
                    <p className={cn(
                      "text-[11px] font-bold uppercase",
                      settings?.activation_status === 'activated' ? "text-green-500" : "text-amber-500"
                    )}>
                      {settings?.activation_status === 'activated' ? 'Activado' : 'Modo Demo'}
                    </p>
                  </div>
                  <div className={cn(
                    "w-2 h-2 rounded-full animate-pulse",
                    settings?.activation_status === 'activated' ? "bg-green-500" : "bg-amber-500"
                  )} />
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="h-px flex-1 bg-gray-100 dark:bg-gray-800" />
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Canales Oficiales</p>
                <div className="h-px flex-1 bg-gray-100 dark:bg-gray-800" />
              </div>

              <div className="flex justify-center gap-4">
                {[
                  { 
                    href: "https://www.facebook.com/profile.php?id=61584020012816", 
                    icon: Facebook, 
                    color: "bg-[#1877F2]", 
                    shadow: "shadow-blue-200/50",
                    isFill: true
                  },
                  { 
                    href: "https://www.instagram.com/possolutiongroup", 
                    icon: Instagram, 
                    color: "bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF]", 
                    shadow: "shadow-pink-200/50"
                  },
                  { 
                    href: "https://www.tiktok.com/@possolutiongroup", 
                    icon: null, 
                    color: "bg-black", 
                    shadow: "shadow-gray-400/50",
                    customIcon: (
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.04-.1z"/>
                      </svg>
                    )
                  },
                  { 
                    href: "https://wa.me/51921122456", 
                    icon: null, 
                    color: "bg-[#25D366]", 
                    shadow: "shadow-green-200/50",
                    customIcon: (
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                      </svg>
                    )
                  }
                ].map((social, idx) => (
                  <motion.a
                    key={idx}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 + (idx * 0.1) }}
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    whileTap={{ scale: 0.9 }}
                    className={cn(
                      "w-12 h-12 text-white rounded-2xl flex items-center justify-center shadow-lg transition-all",
                      social.color,
                      social.shadow
                    )}
                  >
                    {social.icon ? (
                      <social.icon size={24} fill={social.isFill ? "currentColor" : "none"} />
                    ) : social.customIcon}
                  </motion.a>
                ))}
              </div>
            </div>

            <div className="text-center">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Desarrollado por</p>
              <p className="text-xs font-bold text-gray-600 dark:text-gray-400 mt-1">LUIGUI CARLO ARATA V. & ANGELO RODRIGUEZ ALTEZ</p>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}


function LoginScreen({ onLogin, onStartDemo, isDemoExpired }: { onLogin: (user: any) => void, onStartDemo: () => void, isDemoExpired: boolean }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (data.success) {
        onLogin(data.user);
      } else {
        setError(data.message || 'Credenciales incorrectas');
      }
    } catch (err) {
      setError('Error al conectar con el servidor');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl overflow-hidden p-8 space-y-8"
      >
        <div className="text-center space-y-4">
          <div className="w-20 h-20 bg-blue-600 rounded-3xl mx-auto flex items-center justify-center text-white shadow-xl shadow-blue-200/50">
            <Users size={40} />
          </div>
          <h2 className="text-3xl font-black text-[#1F2937]">Iniciar Sesión</h2>
          <p className="text-gray-500 font-medium">Ingresa tus credenciales de acceso</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">USUARIO O CORREO</label>
              <input 
                type="text"
                required
                className="w-full px-5 py-4 bg-[#F9FAFB] border-2 border-transparent rounded-2xl focus:border-blue-600 focus:bg-white transition-all outline-none"
                placeholder="Ej. demo o usuario@psg.la"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">CONTRASEÑA</label>
              <input 
                type="password"
                required
                className="w-full px-5 py-4 bg-[#F9FAFB] border-2 border-transparent rounded-2xl focus:border-blue-600 focus:bg-white transition-all outline-none"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>
          {error && <p className="text-xs font-bold text-center text-red-500">{error}</p>}
          <button 
            type="submit"
            className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-blue-200/50 hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
          >
            <Check size={20} />
            INGRESAR AL SISTEMA
          </button>
        </form>
      </motion.div>
    </div>
  );
}

export default function App() {
  const [activeSection, setActiveSection] = useState<Section>('dashboard');
  const [inventoryCategoryFilter, setInventoryCategoryFilter] = useState<number | 'all'>('all');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [isDemoStarted, setIsDemoStarted] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);

  const isDemoUser = user?.email === 'demo';

  useEffect(() => {
    if (user) {
      if (user.role === 'DESARROLLADOR' && !['users', 'dev_mode'].includes(activeSection)) {
        setActiveSection('users');
      } else if (user.role === 'ESTANDARD' && !isDemoUser && !['dashboard', 'pos', 'reports', 'customers'].includes(activeSection)) {
        setActiveSection('dashboard');
      }
    }
  }, [user, activeSection, isDemoUser]);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      setSettings(data);
      setIsLoading(false);
    } catch (err) {
      console.error('Error fetching settings:', err);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useDataSync(fetchSettings);

  useEffect(() => {
    if (settings) {
      document.documentElement.classList.remove('dark');
      if (settings.primary_color) {
        document.documentElement.style.setProperty('--primary-color', settings.primary_color);
      }
    }
  }, [settings]);

  const getDemoSecondsLeft = () => {
    if (settings?.activation_status !== 'demo' && !isDemoUser) return 0;
    const DEMO_DURATION_SECONDS = 10 * 24 * 60 * 60; // 10 days
    
    // Prioritize demo_start_date for the demo user, fallback to installation_date
    const referenceDateStr = settings?.demo_start_date || settings?.installation_date;
    if (!referenceDateStr) return DEMO_DURATION_SECONDS;
    
    const startDate = new Date(referenceDateStr);
    const diffTime = currentTime.getTime() - startDate.getTime();
    const diffSeconds = Math.floor(diffTime / 1000);
    return Math.max(0, DEMO_DURATION_SECONDS - diffSeconds);
  };

  const getLicenseSecondsLeft = () => {
    if (!settings?.license_expiry || settings?.license_type === 'infinite') return 0;
    const expiryDate = new Date(settings.license_expiry);
    const diffTime = expiryDate.getTime() - currentTime.getTime();
    return Math.max(0, Math.floor(diffTime / 1000));
  };

  const formatTimeLeft = (seconds: number) => {
    const days = Math.floor(seconds / (24 * 60 * 60));
    const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
    const mins = Math.floor((seconds % (60 * 60)) / 60);
    const secs = seconds % 60;
    
    if (days > 0) return `${days}d ${hours}h ${mins}m`;
    if (hours > 0) return `${hours}h ${mins}m ${secs}s`;
    return `${mins}m ${secs}s`;
  };

  const isDemoVoucherLimitReached = settings?.activation_status === 'demo' && (settings?.voucher_count || 0) >= (parseInt(settings?.demo_voucher_limit || '10'));
  const isLicenseExpired = settings?.activation_status === 'activated' && settings?.license_expiry && new Date(settings.license_expiry) < new Date();
  const isDemoExpired = (settings?.activation_status === 'demo' || isDemoUser) && getDemoSecondsLeft() <= 0;
  const isActivated = settings?.activation_status === 'activated';
  const showLogin = !isLoggedIn;

  const isSystemBlocked = (isDemoExpired || isDemoVoucherLimitReached || isLicenseExpired) && user?.role !== 'DESARROLLADOR';

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, hidden: user?.role === 'DESARROLLADOR', disabled: isSystemBlocked },
    { id: 'pos', label: 'Punto de Venta', icon: ShoppingCart, hidden: user?.role === 'DESARROLLADOR', disabled: isSystemBlocked },
    { id: 'inventory', label: 'Inventario', icon: Package, hidden: (user?.role === 'ESTANDARD' && !isDemoUser) || user?.role === 'DESARROLLADOR', onClick: () => setInventoryCategoryFilter('all'), disabled: isSystemBlocked },
    { id: 'categories', label: 'Categorías', icon: Tags, hidden: (user?.role === 'ESTANDARD' && !isDemoUser) || user?.role === 'DESARROLLADOR', disabled: isSystemBlocked },
    { id: 'suppliers', label: 'Proveedores', icon: Truck, hidden: (user?.role === 'ESTANDARD' && !isDemoUser) || user?.role === 'DESARROLLADOR', disabled: isSystemBlocked },
    { id: 'customers', label: 'Clientes', icon: Users, hidden: user?.role === 'DESARROLLADOR', disabled: isSystemBlocked },
    { id: 'cash_flow', label: 'Flujo de Caja', icon: Wallet, hidden: (user?.role === 'ESTANDARD' && !isDemoUser) || user?.role === 'DESARROLLADOR', disabled: isSystemBlocked },
    { id: 'sales_records', label: 'Ventas', icon: FileText, hidden: (user?.role === 'ESTANDARD' && !isDemoUser) || user?.role === 'DESARROLLADOR', disabled: isSystemBlocked },
    { id: 'reports', label: 'Reportes', icon: BarChart3, hidden: user?.role === 'DESARROLLADOR', disabled: isSystemBlocked },
    { id: 'settings', label: 'Configuración', icon: Settings, hidden: user?.role === 'DESARROLLADOR' || (user?.role === 'ESTANDARD' && !isDemoUser), disabled: isSystemBlocked },
    { id: 'users', label: 'Usuarios', icon: Users, hidden: user?.role === 'ESTANDARD' && !isDemoUser, disabled: isSystemBlocked },
    { id: 'dev_mode', label: 'Modo desarrollador', icon: Code, hidden: user?.role !== 'DESARROLLADOR' },
  ].filter(item => !item.hidden);

  const renderSection = () => {
    switch (activeSection) {
      case 'dashboard': return <Dashboard />;
      case 'pos': return <POS />;
      case 'inventory': return <Inventory initialCategoryFilter={inventoryCategoryFilter} />;
      case 'categories': return (
        <Categories 
          onViewProducts={(categoryId) => {
            setInventoryCategoryFilter(categoryId);
            setActiveSection('inventory');
          }} 
        />
      );
      case 'suppliers': return <Suppliers />;
      case 'customers': return <Customers />;
      case 'cash_flow': return <CashFlow />;
      case 'sales_records': return <SalesRecords />;
      case 'reports': return <Reports />;
      case 'settings': return <Configuration user={user} />;
      case 'users': return <UsersTab currentUser={user} />;
      case 'dev_mode': return <DeveloperMode user={user} />;
      default: return <Dashboard />;
    }
  };


  const handleStartDemo = async () => {
    try {
      const res = await fetch('/api/activate-demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (res.ok) {
        await fetchSettings();
        setIsDemoStarted(true);
        setIsLoggedIn(true); // Auto login for demo
        setUser({ email: 'demo@psg.la', name: 'Usuario Demo', role: 'ESTANDARD' });
      } else {
        alert(data.message || 'Error al activar modo demo');
      }
    } catch (err) {
      console.error('Error starting demo:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (showLogin) {
    return <LoginScreen 
      onLogin={(userData) => {
        setUser(userData);
        setIsLoggedIn(true);
      }} 
      onStartDemo={handleStartDemo}
      isDemoExpired={isDemoExpired}
    />;
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 font-sans overflow-hidden">
      {/* Sidebar Overlay for Mobile */}
      <AnimatePresence>
        {isMobile && isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/50 z-40"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ 
          width: isSidebarOpen ? (isMobile ? '280px' : '260px') : (isMobile ? '0px' : '80px'),
          x: isMobile && !isSidebarOpen ? -280 : 0
        }}
        className={cn(
          "bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col z-50 transition-all duration-300 ease-in-out overflow-hidden",
          isMobile ? "fixed inset-y-0 left-0" : "relative"
        )}
      >
        <div className={cn(
          "p-6 flex items-center gap-3 border-b border-gray-100 dark:border-gray-800",
          !isSidebarOpen && !isMobile && "justify-center px-0"
        )}>
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary/20 overflow-hidden shrink-0">
            {settings?.business_logo ? (
              <img src={settings.business_logo} alt="Logo" className="w-full h-full object-cover bg-white" referrerPolicy="no-referrer" />
            ) : (
              <Store size={24} />
            )}
          </div>
          {isSidebarOpen && (
            <motion.span 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="font-bold text-xl tracking-tight text-gray-900 dark:text-white truncate"
            >
              {settings?.business_name || 'Selltium PSG'}
            </motion.span>
          )}
        </div>

        <nav className="flex-1 py-6 px-3 overflow-y-auto space-y-1">
          {((settings?.activation_status === 'demo' || isDemoUser) || (isActivated && settings?.license_expiry && settings?.license_type !== 'infinite')) && isSidebarOpen && (
            <div className="mx-2 mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-900/30">
              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-1">
                <Clock size={16} />
                <span className="text-[10px] font-black uppercase tracking-widest">
                  {(settings?.activation_status === 'demo' || isDemoUser) ? 'Tiempo Demo' : 'Licencia'}
                </span>
              </div>
              <div className={cn(
                "text-xl font-black",
                (isDemoExpired || isLicenseExpired) ? "text-red-600" : "text-gray-900 dark:text-white"
              )}>
                {formatTimeLeft((settings?.activation_status === 'demo' || isDemoUser) ? getDemoSecondsLeft() : getLicenseSecondsLeft())}
              </div>
              <p className="text-[10px] text-gray-500 mt-1 font-medium">
                {(isDemoExpired || isLicenseExpired) ? 'Expirado' : 'Tiempo restante'}
              </p>
            </div>
          )}
          {menuItems.map((item) => (
            <button
              key={item.id}
              disabled={(item as any).disabled}
              onClick={() => {
                setActiveSection(item.id as Section);
                if ((item as any).onClick) (item as any).onClick();
                if (isMobile) setIsSidebarOpen(false);
              }}
              title={!isSidebarOpen ? item.label : undefined}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                !isSidebarOpen && !isMobile && "justify-center px-0",
                activeSection === item.id 
                  ? "bg-primary text-white shadow-md shadow-primary/20" 
                  : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white",
                (item as any).disabled && "opacity-50 cursor-not-allowed grayscale"
              )}
            >
              <item.icon size={20} className={cn(
                "transition-colors shrink-0",
                activeSection === item.id ? "text-white" : "text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white"
              )} />
              {isSidebarOpen && (
                <motion.span 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="font-medium truncate"
                >
                  {item.label}
                </motion.span>
              )}
              {isSidebarOpen && activeSection === item.id && (
                <ChevronRight size={16} className="ml-auto opacity-70 shrink-0" />
              )}
            </button>
          ))}
        </nav>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-500 dark:text-gray-400 transition-colors"
            >
              <Menu size={20} />
            </button>
            <h1 className="text-lg font-semibold text-gray-800 dark:text-white capitalize">
              {menuItems.find(m => m.id === activeSection)?.label}
            </h1>
          </div>

          <div className="flex items-center gap-4">
            {((settings?.activation_status === 'demo' || isDemoUser) || (isActivated && settings?.license_expiry && settings?.license_type !== 'infinite')) && (
              <div className={cn(
                "hidden md:flex items-center gap-2 px-4 py-1.5 rounded-full border font-bold text-xs",
                (isDemoExpired || isLicenseExpired) ? "bg-red-50 text-red-600 border-red-100" : "bg-green-50 text-green-600 border-green-100"
              )}>
                <Clock size={14} />
                <span>
                  {(settings?.activation_status === 'demo' || isDemoUser) ? 'Demo: ' : 'Licencia: '}
                  {formatTimeLeft((settings?.activation_status === 'demo' || isDemoUser) ? getDemoSecondsLeft() : getLicenseSecondsLeft())}
                </span>
              </div>
            )}
            <div className="hidden sm:flex items-center gap-3">
              <button 
                onClick={() => setIsContactModalOpen(true)}
                className="p-2.5 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors border border-blue-100"
                title="Información de Contacto"
              >
                <Info size={20} />
              </button>
              <div className="flex flex-col items-end">
                <span className="text-sm font-semibold text-gray-900 dark:text-white">{user?.name || settings?.user_name || 'Admin Usuario'}</span>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-500 dark:text-gray-400">{user?.role || settings?.user_role || 'Administrador'}</span>
                </div>
              </div>
              <button 
                onClick={() => {
                  setIsDemoStarted(false);
                  setIsLoggedIn(false);
                  setUser(null);
                }}
                className="p-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors border border-red-100"
                title="Cerrar Sesión"
              >
                <LogOut size={20} />
              </button>
            </div>
            <div className="w-10 h-10 bg-gray-200 rounded-full border-2 border-white shadow-sm overflow-hidden">
              <img 
                src={settings?.user_avatar || "https://picsum.photos/seed/admin/100/100"} 
                alt="Avatar" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 relative">
          {isSystemBlocked && (
            <div className="absolute inset-0 z-40 bg-white/80 dark:bg-gray-950/80 backdrop-blur-md flex items-center justify-center p-6">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-md w-full bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-2xl p-8 text-center space-y-6 border border-red-100 dark:border-red-900/30"
              >
                <div className="w-20 h-20 bg-red-500 rounded-3xl mx-auto flex items-center justify-center text-white shadow-xl shadow-red-200/50">
                  <ShieldAlert size={40} />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-black text-gray-900 dark:text-white">Sistema Bloqueado</h2>
                  <p className="text-gray-500 dark:text-gray-400 font-medium">
                    {isDemoExpired ? 'El periodo de prueba de 7 días hábiles ha expirado.' : 
                     isDemoVoucherLimitReached ? 'Has alcanzado el límite de comprobantes en modo demo.' :
                     settings?.license_type === 'demo_7' ? 'Tu periodo de prueba de 7 días ha expirado.' :
                     'Tu suscripción ha expirado.'}
                  </p>
                </div>
              </motion.div>
            </div>
          )}
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="max-w-7xl mx-auto"
          >
            {renderSection()}
          </motion.div>
        </div>

        <ContactModal isOpen={isContactModalOpen} onClose={() => setIsContactModalOpen(false)} settings={settings} />
      </main>
    </div>
  );
}
