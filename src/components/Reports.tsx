import React, { useState, useEffect } from 'react';
import { apiFetch } from '../lib/api';
import { 
  FileText, 
  Download, 
  Calendar, 
  TrendingUp, 
  Package, 
  DollarSign,
  X 
} from 'lucide-react';
import { formatCurrency, cn } from '../lib/utils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export default function Reports() {
  const [dateRange, setEarningsDateRange] = useState('today');
  const [earnings, setEarnings] = useState({ income: 0, cost: 0, profit: 0 });
  const [isDateModalOpen, setIsDateModalOpen] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState('');
  const [exportFormat, setExportFormat] = useState<'pdf' | 'excel'>('pdf');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  const fetchEarnings = () => {
    apiFetch(`/api/reports/earnings?range=${dateRange}`)
      .then(res => res.json())
      .then(setEarnings);
  };

  useEffect(() => {
    fetchEarnings();
  }, [dateRange]);

  const reports = [
    { id: 'sales', title: 'Reporte de Ventas', description: 'Resumen detallado de todas las transacciones realizadas.', icon: DollarSign, color: 'bg-green-500' },
    { id: 'inventory', title: 'Inventario Actual', description: 'Estado actual de todos los productos y niveles de stock.', icon: Package, color: 'bg-blue-500' },
    { id: 'low-stock', title: 'Productos por Agotarse', description: 'Lista de productos que requieren reabastecimiento urgente.', icon: TrendingUp, color: 'bg-orange-500' },
  ];

  const generateExcel = async (id: string, start?: string, end?: string) => {
    try {
      let data: any[] = [];
      let fileName = `Reporte_${id}_${new Date().toISOString().split('T')[0]}`;

      if (id === 'inventory') {
        const res = await apiFetch('/api/products');
        let products = await res.json();
        if (!Array.isArray(products)) products = [];
        data = products.map((p: any) => ({
          Código: p.code,
          Producto: p.name,
          Categoría: p.category_name,
          'P. Compra': p.purchase_price,
          'P. Venta': p.sale_price,
          Stock: p.stock,
          Estado: p.status
        }));
      } else if (id === 'low-stock') {
        const res = await apiFetch('/api/products');
        let products = await res.json();
        if (!Array.isArray(products)) products = [];
        data = products
          .filter((p: any) => p.stock <= p.min_stock)
          .map((p: any) => ({
            Código: p.code,
            Producto: p.name,
            Stock: p.stock,
            'Stock Mín.': p.min_stock,
            Categoría: p.category_name
          }));
      } else if (id === 'sales') {
        const url = start && end ? `/api/sales?start=${start}&end=${end}` : '/api/sales';
        if (start && end) fileName += `_desde_${start}_hasta_${end}`;
        const res = await apiFetch(url);
        let sales = await res.json();
        if (!Array.isArray(sales)) sales = [];
        
        let totalSum = 0;
        data = sales.map((s: any) => {
          totalSum += parseFloat(s.total || 0);
          return {
            ID: `#V${String(s.id).padStart(6, '0')}`,
            Fecha: new Date(s.created_at).toLocaleString(),
            Cliente: s.first_name ? `${s.first_name} ${s.last_name || ''}` : 'Público General',
            Total: s.total
          };
        });

        // Add total row at the end
        if (data.length > 0) {
          data.push({
            ID: '',
            Fecha: '',
            Cliente: 'SUMA TOTAL',
            Total: totalSum
          });
        }
      }

      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Reporte");
      XLSX.writeFile(workbook, `${fileName}.xlsx`);
    } catch (error) {
      console.error('Error generating Excel:', error);
      alert('Error al generar el archivo Excel.');
    }
  };

  const generatePDF = async (id: string, start?: string, end?: string) => {
    try {
      const doc = new jsPDF() as any;
      const today = new Date().toLocaleDateString();
      const dateText = start && end ? `Desde: ${start} Hasta: ${end}` : `Fecha: ${today}`;
      
      const safeText = (text: any) => {
        const str = String(text || '');
        return str.length > 10000 ? str.substring(0, 10000) + '...' : str;
      };

      if (id === 'inventory') {
        const res = await apiFetch('/api/products');
        let products = await res.json();
        if (!Array.isArray(products)) products = [];
        
        doc.text('Reporte de Inventario Actual', 14, 20);
        doc.setFontSize(10);
        doc.text(`Fecha: ${today}`, 14, 28);

        const tableData = products.map((p: any) => [
          safeText(p.code),
          safeText(p.name),
          safeText(p.category_name),
          formatCurrency(p.purchase_price),
          formatCurrency(p.sale_price),
          p.stock,
          safeText(p.status)
        ]);

        autoTable(doc, {
          startY: 35,
          head: [['Código', 'Producto', 'Categoría', 'P. Compra', 'P. Venta', 'Stock', 'Estado']],
          body: tableData,
          headStyles: { fillColor: [34, 197, 94] }, // Green-500
        });
      } else if (id === 'low-stock') {
        const res = await apiFetch('/api/products');
        let products = await res.json();
        if (!Array.isArray(products)) products = [];
        const lowStock = products.filter((p: any) => p.stock <= p.min_stock);
        
        doc.text('Reporte de Productos con Stock Bajo', 14, 20);
        doc.setFontSize(10);
        doc.text(`Fecha: ${today}`, 14, 28);

        const tableData = lowStock.map((p: any) => [
          safeText(p.code),
          safeText(p.name),
          p.stock,
          p.min_stock,
          safeText(p.category_name)
        ]);

        autoTable(doc, {
          startY: 35,
          head: [['Código', 'Producto', 'Stock Actual', 'Stock Mín.', 'Categoría']],
          body: tableData,
          headStyles: { fillColor: [249, 115, 22] }, // Orange-500
        });
      } else if (id === 'sales') {
        const url = start && end ? `/api/sales?start=${start}&end=${end}` : '/api/sales';
        const res = await apiFetch(url);
        let sales = await res.json();
        if (!Array.isArray(sales)) sales = [];
        
        doc.text('Reporte de Ventas', 14, 20);
        doc.setFontSize(10);
        doc.text(dateText, 14, 28);

        let totalSum = 0;
        const tableData = sales.map((s: any) => {
          totalSum += parseFloat(s.total || 0);
          return [
            safeText(`#V${String(s.id).padStart(6, '0')}`),
            safeText(new Date(s.created_at).toLocaleString()),
            safeText(s.first_name ? `${s.first_name} ${s.last_name || ''}` : 'Público General'),
            safeText((() => {
              try {
                const payments = JSON.parse(s.payment_method);
                if (Array.isArray(payments)) {
                  return payments.map((p: any) => `${p.method.replace('_', '/')}: ${formatCurrency(p.amount)}`).join(', ');
                }
                return s.payment_method;
              } catch (e) {
                return s.payment_method;
              }
            })()),
            formatCurrency(s.total)
          ];
        });

        autoTable(doc, {
          startY: 35,
          head: [['ID', 'Fecha', 'Cliente', 'Método', 'Total']],
          body: tableData,
          headStyles: { fillColor: [34, 197, 94] },
        });

        let finalY = (doc as any).lastAutoTable.finalY + 15;
        if (finalY > doc.internal.pageSize.height - 20) {
          doc.addPage();
          finalY = 20;
        }
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text(`SUMA TOTAL: ${formatCurrency(totalSum)}`, doc.internal.pageSize.width - 14, finalY, { align: 'right' });
      }

      doc.save(`Reporte_${id}_${today.replace(/\//g, '-')}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error al generar el PDF. Por favor, intente de nuevo.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Reportes y Análisis</h2>
          <p className="text-sm text-gray-500">Genera informes detallados del rendimiento de tu negocio.</p>
        </div>
        <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-gray-200 shadow-sm">
          {['today', 'week', 'month'].map((range) => (
            <button
              key={range}
              onClick={() => setEarningsDateRange(range)}
              className={cn(
                "px-4 py-2 rounded-lg text-xs font-bold capitalize transition-all",
                dateRange === range ? "bg-gray-900 text-white shadow-md" : "text-gray-500 hover:bg-gray-50"
              )}
            >
              {range === 'today' ? 'Hoy' : range === 'week' ? 'Semana' : 'Mes'}
            </button>
          ))}
        </div>
      </div>

      {isDateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Seleccionar Rango de Fechas</h3>
              <button onClick={() => setIsDateModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Desde</label>
                <input 
                  type="date" 
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition-all font-medium"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Hasta</label>
                <input 
                  type="date" 
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition-all font-medium"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  onClick={() => setIsDateModalOpen(false)}
                  className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-all text-sm"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => {
                    if (exportFormat === 'pdf') {
                      generatePDF(selectedReportId, startDate, endDate);
                    } else {
                      generateExcel(selectedReportId, startDate, endDate);
                    }
                    setIsDateModalOpen(false);
                  }}
                  className="flex-1 px-4 py-3 bg-gray-900 text-white font-bold rounded-xl hover:bg-gray-800 transition-all text-sm"
                >
                  Generar {exportFormat === 'pdf' ? 'PDF' : 'Excel'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reports.map((report) => (
          <div key={report.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group">
            <div className="flex items-start gap-4">
              <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-lg", report.color)}>
                <report.icon size={28} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-gray-900 text-lg">{report.title}</h3>
                <p className="text-sm text-gray-500 mt-1">{report.description}</p>
                <div className="mt-6 flex items-center gap-3">
                  <button 
                    onClick={() => {
                      if (report.id === 'sales') {
                        setSelectedReportId(report.id);
                        setExportFormat('pdf');
                        setIsDateModalOpen(true);
                      } else {
                        generatePDF(report.id);
                      }
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-xs font-bold rounded-lg hover:bg-gray-800 transition-colors"
                  >
                    <FileText size={16} />
                    Exportar PDF
                  </button>
                    <button 
                      onClick={() => {
                        if (report.id === 'sales') {
                          setSelectedReportId(report.id);
                          setExportFormat('excel');
                          setIsDateModalOpen(true);
                        } else {
                          generateExcel(report.id);
                        }
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 text-xs font-bold rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <Download size={16} />
                      Excel
                    </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-bold text-gray-900">Resumen de Ganancias</h3>
          <Calendar size={20} className="text-gray-400" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="p-4 bg-green-50 rounded-xl border border-green-100">
            <p className="text-xs text-green-600 font-bold uppercase">Ingresos Totales</p>
            <h4 className="text-2xl font-black text-green-700 mt-1">{formatCurrency(earnings.income)}</h4>
          </div>
          <div className="p-4 bg-red-50 rounded-xl border border-red-100">
            <p className="text-xs text-red-600 font-bold uppercase">Costos Totales</p>
            <h4 className="text-2xl font-black text-red-700 mt-1">{formatCurrency(earnings.cost)}</h4>
          </div>
          <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
            <p className="text-xs text-blue-600 font-bold uppercase">Utilidad Neta</p>
            <h4 className="text-2xl font-black text-blue-700 mt-1">{formatCurrency(earnings.profit)}</h4>
          </div>
        </div>
      </div>
    </div>
  );
}


