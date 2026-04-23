import React, { useState, useEffect } from 'react';
import { apiFetch } from '../lib/api';
import { 
  ShieldCheck, 
  Clock, 
  Key,
  AlertCircle,
  CheckCircle2,
  Users,
  ShieldAlert
} from 'lucide-react';
import { motion } from 'motion/react';
import { AppSettings } from '../types';
import { cn } from '../lib/utils';
import { useDataSync } from '../hooks/useDataSync';
import { ConfirmModal } from './ConfirmModal';

export default function DeveloperMode({ user }: { user: any }) {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [isActivating, setIsActivating] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState('');
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  const fetchSettings = async () => {
    try {
      const res = await apiFetch('/api/settings');
      const data = await res.json();
      setSettings(data);
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  useDataSync(() => {
    fetchSettings();
  });

  const handleActivateLicense = async (type: string, durationMonths: number) => {
    setIsActivating(true);
    setError('');
    try {
      const res = await apiFetch('/api/license/activate', {
        method: 'POST',
        body: JSON.stringify({ type, durationMonths })
      });
      const data = await res.json();
      if (data.success) {
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 2000);
        fetchSettings();
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Error al conectar con el servidor');
    } finally {
      setIsActivating(false);
    }
  };

  const handleToggleUnlimitedUsers = async () => {
    if (!settings) return;
    const newValue = settings.unlimited_users === '1' ? '0' : '1';
    try {
      const res = await apiFetch('/api/settings', {
        method: 'POST',
        body: JSON.stringify({ ...settings, unlimited_users: newValue })
      });
      if (res.ok) {
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 2000);
        fetchSettings();
      }
    } catch (error) {
      console.error('Error toggling unlimited users:', error);
    }
  };

  const handleResetLicense = async () => {
    setIsActivating(true);
    setError('');
    try {
      const res = await apiFetch('/api/license/reset', { 
        method: 'POST'
      });
      const data = await res.json();
      if (data.success) {
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 2000);
        fetchSettings();
      } else {
        setError(data.message || 'Error al resetear la licencia');
      }
    } catch (err) {
      setError('Error al conectar con el servidor');
    } finally {
      setIsActivating(false);
    }
  };

  const handleResetDemo = async () => {
    setIsActivating(true);
    setError('');
    try {
      const res = await apiFetch('/api/demo/reset', { 
        method: 'POST'
      });
      const data = await res.json();
      if (data.success) {
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 2000);
        fetchSettings();
      } else {
        setError(data.message || 'Error al resetear el demo');
      }
    } catch (err) {
      setError('Error al conectar con el servidor');
    } finally {
      setIsActivating(false);
    }
  };

  if (!settings) return null;
  const isInfinite = settings.license_type === 'infinite';

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Modo Desarrollador</h2>
          <p className="text-gray-500 dark:text-gray-400 font-medium">Gestión avanzada y activación de licencias</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleResetDemo}
            disabled={isActivating}
            className="px-6 py-3 bg-amber-600 text-white font-black rounded-2xl shadow-xl shadow-amber-200/50 hover:bg-amber-700 transition-all flex items-center gap-2 uppercase text-xs tracking-widest"
          >
            <Clock size={18} />
            Reiniciar Demo
          </button>
          <button
            onClick={() => setIsResetModalOpen(true)}
            disabled={isActivating}
            className="px-6 py-3 bg-red-600 text-white font-black rounded-2xl shadow-xl shadow-red-200/50 hover:bg-red-700 transition-all flex items-center gap-2 uppercase text-xs tracking-widest"
          >
            <AlertCircle size={18} />
            Resetear Licencia
          </button>
        </div>
      </div>

      <ConfirmModal
        isOpen={isResetModalOpen}
        title="Resetear Licencia"
        message="¿Estás seguro de que deseas resetear el estado de la licencia? El sistema volverá a modo demo y se borrarán las fechas de activación."
        onConfirm={handleResetLicense}
        onCancel={() => setIsResetModalOpen(false)}
        confirmText="SÍ, RESETEAR"
        cancelText="CANCELAR"
        type="danger"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* License Status */}
        <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-3xl p-8 shadow-sm space-y-6">
          <div className="flex items-center gap-4">
            <div className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg",
              settings.activation_status === 'activated' ? "bg-green-500 shadow-green-200/50" : "bg-amber-500 shadow-amber-200/50"
            )}>
              <ShieldCheck size={24} />
            </div>
            <div>
              <h3 className="font-black text-gray-900 dark:text-white uppercase tracking-wider">Estado del Sistema</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-bold">
                {settings.activation_status === 'activated' ? 'ACTIVADO' : 'MODO DEMO'}
              </p>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-gray-50 dark:border-gray-700">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                <Clock size={16} />
                <span className="text-xs font-bold uppercase">Vencimiento</span>
              </div>
              <span className="text-sm font-black text-gray-900 dark:text-white">
                {settings.license_expiry ? new Date(settings.license_expiry).toLocaleDateString() : 'N/A'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                <Key size={16} />
                <span className="text-xs font-bold uppercase">Tipo</span>
              </div>
              <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400 text-[10px] font-black uppercase rounded-md border border-blue-200 dark:border-blue-800">
                {isInfinite ? 'Infinita' : settings.license_type?.replace('_', ' ') || 'Demo'}
              </span>
            </div>
          </div>
        </div>

        {/* Advanced Settings */}
        <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-3xl p-8 shadow-sm space-y-6">
          <h3 className="font-black text-gray-900 dark:text-white uppercase tracking-wider">Ajustes Avanzados</h3>
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-2xl border border-gray-100 dark:border-gray-600">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center text-white",
                settings.unlimited_users === '1' ? "bg-purple-500" : "bg-gray-400"
              )}>
                <Users size={20} />
              </div>
              <div>
                <p className="text-sm font-black text-gray-900 dark:text-white uppercase">Usuarios Ilimitados</p>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold">
                  {settings.unlimited_users === '1' ? 'ACTIVADO' : 'LÍMITE DE 5'}
                </p>
              </div>
            </div>
            <button 
              onClick={handleToggleUnlimitedUsers}
              disabled={isInfinite}
              className={cn(
                "w-12 h-6 rounded-full transition-all relative",
                settings.unlimited_users === '1' ? "bg-purple-500" : "bg-gray-300",
                isInfinite ? "opacity-50 cursor-not-allowed grayscale" : "hover:scale-110"
              )}
            >
              <div className={cn(
                "absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm",
                settings.unlimited_users === '1' ? "right-1" : "left-1"
              )} />
            </button>
          </div>
          {isInfinite && (
            <p className="text-[10px] text-purple-600 font-black uppercase text-center">Bloqueado por Licencia Vitalicia</p>
          )}
        </div>
      </div>

      {/* Full Activation Options */}
      <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-3xl p-8 shadow-sm space-y-8">
        <div className="text-center">
          <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-wider">Panel de Licenciamiento</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Selecciona el tipo de licencia para este cliente</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {[
            { label: 'Demo 7 Días', type: 'demo_7', duration: -1, color: 'amber' },
            { label: '3 Meses', type: 'months', duration: 3, color: 'blue' },
            { label: '6 Meses', type: 'months', duration: 6, color: 'blue' },
            { label: '12 Meses', type: 'months', duration: 12, color: 'blue' },
            { label: 'Infinita', type: 'infinite', duration: 0, color: 'purple' },
          ].map((opt) => (
            <button
              key={opt.label}
              onClick={() => handleActivateLicense(opt.type, opt.duration)}
              disabled={isActivating || isInfinite}
              className={cn(
                "p-6 rounded-2xl border-2 border-transparent transition-all text-center space-y-2",
                opt.color === 'amber' ? "bg-amber-50 dark:bg-amber-900/10 hover:border-amber-500" : 
                opt.color === 'purple' ? "bg-purple-50 dark:bg-purple-900/10 hover:border-purple-500" :
                "bg-blue-50 dark:bg-blue-900/10 hover:border-blue-500",
                isInfinite && "opacity-50 cursor-not-allowed grayscale"
              )}
            >
              <p className={cn("text-[10px] font-black uppercase tracking-widest", 
                opt.color === 'amber' ? "text-amber-600" : 
                opt.color === 'purple' ? "text-purple-600" :
                "text-blue-600"
              )}>
                {opt.color === 'amber' ? 'Prueba' : opt.color === 'purple' ? 'Vitalicia' : 'Suscripción'}
              </p>
              <p className="text-lg font-black text-gray-900 dark:text-white">{opt.label}</p>
            </button>
          ))}
        </div>
        {isInfinite && (
          <div className="flex items-center justify-center gap-2 p-4 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-2xl border border-purple-100 dark:border-purple-800">
            <ShieldCheck size={20} />
            <p className="text-sm font-black uppercase">Sistema con Licencia Vitalicia - Panel Bloqueado</p>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-2xl border border-red-100 dark:border-red-800">
            <AlertCircle size={20} />
            <p className="text-sm font-bold">{error}</p>
          </div>
        )}

        {showSuccess && (
          <div className="flex items-center gap-2 p-4 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-2xl border border-green-100 dark:border-green-800">
            <CheckCircle2 size={20} />
            <p className="text-sm font-bold">Licencia actualizada correctamente</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ChevronRight({ size, className }: { size: number, className?: string }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="m9 18 6-6-6-6"/>
    </svg>
  );
}
