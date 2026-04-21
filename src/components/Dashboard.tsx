import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Package, 
  AlertTriangle, 
  ShoppingCart,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Wallet
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { formatCurrency, cn } from '../lib/utils';
import { useDataSync } from '../hooks/useDataSync';

const data = [
  { name: 'Lun', sales: 4000 },
  { name: 'Mar', sales: 3000 },
  { name: 'Mie', sales: 2000 },
  { name: 'Jue', sales: 2780 },
  { name: 'Vie', sales: 1890 },
  { name: 'Sab', sales: 2390 },
  { name: 'Dom', sales: 3490 },
];

const categoryData = [
  { name: 'Lácteos', value: 400 },
  { name: 'Bebidas', value: 300 },
  { name: 'Snacks', value: 300 },
  { name: 'Limpieza', value: 200 },
];

const COLORS = [
  '#22c55e', '#16a34a', '#4ade80', '#86efac', '#bbf7d0',
  '#3b82f6', '#2563eb', '#60a5fa', '#93c5fd', '#bfdbfe'
];

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null);

  const fetchData = () => {
    fetch('/api/dashboard/stats')
      .then(res => res.json())
      .then(data => setStats(data));
  };

  useEffect(() => {
    fetchData();
  }, []);

  useDataSync(fetchData);

  const cards = [
    { 
      label: 'Ventas del Día', 
      value: formatCurrency(stats?.dailySales?.total || 0), 
      icon: DollarSign, 
      color: 'bg-green-500',
      trend: '+12.5%',
      isUp: true
    },
    { 
      label: 'Ventas del Mes', 
      value: formatCurrency(stats?.monthlySales?.total || 0), 
      icon: TrendingUp, 
      color: 'bg-blue-500',
      trend: '+8.2%',
      isUp: true
    },
    { 
      label: 'Stock Bajo', 
      value: stats?.lowStock?.count || 0, 
      icon: AlertTriangle, 
      color: 'bg-orange-500',
      trend: '-2',
      isUp: false
    },
    { 
      label: 'Total Productos', 
      value: stats?.totalProducts?.count || 0, 
      icon: Package, 
      color: 'bg-purple-500',
      trend: '+5',
      isUp: true
    },
    { 
      label: 'Caja (Efectivo)', 
      value: formatCurrency(stats?.cashBalance || 0), 
      icon: Wallet, 
      color: 'bg-emerald-500',
      trend: 'Total',
      isUp: true
    },
  ];

  const salesTrendData = stats?.salesTrend || [];
  const salesByCategoryData = stats?.salesByCategory || [];
  const recentSalesData = stats?.recentSales || [];
  const lowStockProductsData = stats?.lowStockProducts || [];

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card, i) => (
          <div key={i} className={cn(
            "p-6 rounded-2xl border shadow-sm hover:shadow-md transition-all",
            "bg-white border-gray-100 dark:bg-gray-900 dark:border-gray-800"
          )}>
            <div className="flex items-start justify-between">
              <div className={cn("p-3 rounded-xl text-white", card.color)}>
                <card.icon size={24} />
              </div>
              <div className={cn(
                "flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full",
                card.isUp 
                  ? "bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-400" 
                  : "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400"
              )}>
                {card.isUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                {card.trend}
              </div>
            </div>
            <div className="mt-4">
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{card.label}</p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{card.value}</h3>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={cn(
          "lg:col-span-2 p-6 rounded-2xl border shadow-sm",
          "bg-white border-gray-100 dark:bg-gray-900 dark:border-gray-800"
        )}>
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-gray-900 dark:text-white">Tendencia de Ventas</h3>
            <select className="text-sm border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 rounded-lg focus:ring-primary focus:border-primary">
              <option>Últimos 7 días</option>
              <option>Último mes</option>
            </select>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesTrendData}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary-color, #22c55e)" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="var(--primary-color, #22c55e)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" className="dark:opacity-10" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '12px', 
                    border: 'none', 
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                    backgroundColor: 'var(--tooltip-bg, #fff)',
                    color: 'var(--tooltip-text, #000)'
                  }}
                />
                <Area type="monotone" dataKey="sales" stroke="var(--primary-color, #22c55e)" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={cn(
          "p-6 rounded-2xl border shadow-sm",
          "bg-white border-gray-100 dark:bg-gray-900 dark:border-gray-800"
        )}>
          <h3 className="font-bold text-gray-900 dark:text-white mb-6">Ventas por Categoría</h3>
          <div className="h-[300px] flex flex-col items-center justify-center">
            {salesByCategoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={salesByCategoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    nameKey="name"
                  >
                    {salesByCategoryData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ 
                      borderRadius: '12px', 
                      border: 'none', 
                      boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                      backgroundColor: 'var(--tooltip-bg, #fff)',
                      color: 'var(--tooltip-text, #000)'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto">
                  <PieChart className="text-gray-400" size={24} />
                </div>
                <p className="text-sm text-gray-500">No hay ventas registradas</p>
              </div>
            )}
          </div>
          <div className="space-y-3 mt-4 max-h-[200px] overflow-y-auto pr-2 scrollbar-hide">
            {salesByCategoryData.length > 0 ? salesByCategoryData.map((cat: any, i: number) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="text-gray-600 dark:text-gray-400 truncate max-w-[150px]">{cat.name}</span>
                </div>
                <span className="font-bold text-gray-900 dark:text-white">{formatCurrency(cat.value)}</span>
              </div>
            )) : (
              <p className="text-xs text-center text-gray-400 italic">Registra ventas para ver estadísticas</p>
            )}
          </div>
        </div>
      </div>

      {/* Recent Sales & Low Stock */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={cn(
          "rounded-2xl border shadow-sm overflow-hidden",
          "bg-white border-gray-100 dark:bg-gray-900 dark:border-gray-800"
        )}>
          <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <h3 className="font-bold text-gray-900 dark:text-white">Últimas Ventas</h3>
            <button className="text-sm text-primary font-bold hover:underline">Ver todas</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                  <th className="px-6 py-3 font-medium">ID</th>
                  <th className="px-6 py-3 font-medium">Cliente</th>
                  <th className="px-6 py-3 font-medium">Total</th>
                  <th className="px-6 py-3 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {recentSalesData.map((item: any) => (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">#V{String(item.id).padStart(6, '0')}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {item.first_name ? `${item.first_name} ${item.last_name || ''}` : 'Público General'}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-gray-900 dark:text-white">{formatCurrency(item.total)}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 text-[10px] font-bold uppercase rounded-full bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400">Completado</span>
                    </td>
                  </tr>
                ))}
                {recentSalesData.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">No hay ventas recientes</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className={cn(
          "rounded-2xl border shadow-sm overflow-hidden",
          "bg-white border-gray-100 dark:bg-gray-900 dark:border-gray-800"
        )}>
          <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <h3 className="font-bold text-gray-900 dark:text-white">Stock Crítico</h3>
          </div>
          <div className="p-6 space-y-4">
            {lowStockProductsData.map((item: any) => (
              <div key={item.id} className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-500/10 rounded-xl border border-red-100 dark:border-red-900/30">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white dark:bg-gray-800 rounded-lg flex items-center justify-center text-red-500 shadow-sm">
                    <Package size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{item.name}</p>
                    <p className="text-xs text-red-600 dark:text-red-400">Quedan solo {item.stock} unidades</p>
                  </div>
                </div>
              </div>
            ))}
            {lowStockProductsData.length === 0 && (
              <div className="text-center text-sm text-gray-500 py-4">No hay productos con stock crítico</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


