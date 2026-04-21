import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Eye, 
  Calendar, 
  User, 
  CreditCard, 
  X,
  Printer,
  FileText,
  Ticket
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Sale, AppSettings } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { useDataSync } from '../hooks/useDataSync';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode';

export default function SalesRecords() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [search, setSearch] = useState('');
  const [selectedSale, setSelectedSale] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  const fetchSales = () => {
    fetch('/api/sales')
      .then(res => res.json())
      .then(setSales);
  };

  const fetchSettings = () => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(setSettings);
  };

  useEffect(() => {
    fetchSales();
    fetchSettings();
  }, []);

  useEffect(() => {
    if (isModalOpen && selectedSale) {
      const saleIdStr = `#V${String(selectedSale.id).padStart(6, '0')}`;
      QRCode.toDataURL(saleIdStr, { margin: 1, width: 256 })
        .then(setQrDataUrl)
        .catch(err => console.error('Error generating QR code:', err));
    } else {
      setQrDataUrl('');
    }
  }, [isModalOpen, selectedSale]);

  useDataSync(fetchSales);

  const viewSaleDetails = async (id: number) => {
    try {
      const res = await fetch(`/api/sales/${id}`);
      const data = await res.json();
      setSelectedSale(data);
      setIsModalOpen(true);
    } catch (error) {
      console.error('Error fetching sale details:', error);
    }
  };

  const handlePrint = async () => {
    if (!selectedSale) return;
    
    const saleIdStr = `#V${String(selectedSale.id).padStart(6, '0')}`;
    const windowPrint = window.open('', '', 'left=0,top=0,width=900,height=1000,toolbar=0,scrollbars=0,status=0');
    if (!windowPrint) return;

    const isA4 = settings?.ticket_size === 'A4';
    const ticketSize = settings?.ticket_size || '80mm';
    // Conservative widths to avoid overflow on different printer margins
    const bodyWidth = isA4 ? '210mm' : (ticketSize === '80mm' ? '65mm' : '42mm');
    const docTitle = settings?.default_document_type === 'nota' ? 'Nota de Venta' : 'Boleta Electrónica';
    const title = docTitle;
    const ticketFontFamily = settings?.ticket_font_family === 'courier' ? "'Courier New', Courier, monospace" : (settings?.ticket_font_family || "sans-serif");
    const primaryColor = settings?.primary_color || '#22c55e';

    const customerName = selectedSale.customer_id ? `${selectedSale.first_name} ${selectedSale.last_name}` : 'Público General';
    const dateStr = new Date(selectedSale.created_at).toLocaleString();
    const payments = JSON.parse(selectedSale.payment_method || '[]');

    windowPrint.document.write(`
      <html>
        <head>
          <title>${title}</title>
          <style>
            @page { 
              size: ${isA4 ? 'A4' : `${ticketSize} auto`}; 
              margin: 0; 
            }
            * { 
              box-sizing: border-box; 
              -webkit-print-color-adjust: exact; 
            }
            body { 
              margin: 0; 
              padding: ${isA4 ? '10mm' : '1mm'};
              font-family: ${ticketFontFamily};
              font-size: ${isA4 ? '11px' : '9px'};
              line-height: 1.2;
              color: #000;
              background: #fff;
              width: ${isA4 ? 'auto' : ticketSize};
              overflow-x: hidden;
            }
            .container {
              width: ${isA4 ? '100%' : bodyWidth};
              max-width: ${bodyWidth};
              margin: 0 auto;
              overflow-x: hidden;
              ${isA4 ? 'min-height: 277mm; display: flex; flex-direction: column;' : ''}
            }
            .header {
              text-align: center;
              margin-bottom: 10px;
              border-bottom: 1px dashed #ccc;
              padding-bottom: 5px;
              ${isA4 ? 'display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px;' : ''}
            }
            .business-info {
              ${isA4 ? 'flex: 1;' : ''}
            }
            .document-info {
              ${isA4 ? 'text-align: center; border: 2px solid #000; padding: 10px; border-radius: 8px; min-width: 180px;' : 'display: none;'}
            }
            .business-name {
              font-size: ${isA4 ? '22px' : '14px'};
              font-weight: 900;
              margin: 0;
              text-transform: uppercase;
              color: ${isA4 ? primaryColor : '#000'};
            }
            .info {
              font-size: ${isA4 ? '10px' : '8px'};
              margin: 1px 0;
            }
            .title {
              font-weight: 900;
              margin: 5px 0;
              text-align: center;
              border-top: 1px solid #000;
              border-bottom: 1px solid #000;
              padding: 3px 0;
              text-transform: uppercase;
              ${isA4 ? 'display: none;' : ''}
            }
            .details {
              margin-bottom: 10px;
              ${isA4 ? 'display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;' : ''}
            }
            .details-section {
              ${isA4 ? 'border: 1px solid #eee; padding: 10px; border-radius: 8px;' : ''}
            }
            .details-row {
              display: flex;
              justify-content: space-between;
              font-size: ${isA4 ? '9px' : '8px'};
              margin-bottom: 1px;
            }
            .details-label {
              font-weight: bold;
              text-transform: uppercase;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 10px;
              ${isA4 ? 'margin-bottom: 20px;' : ''}
            }
            th {
              text-align: left;
              border-bottom: 1px solid #000;
              padding: 3px 0;
              font-size: ${isA4 ? '10px' : '8px'};
              text-transform: uppercase;
              ${isA4 ? 'background-color: #f9f9f9; padding: 8px 5px;' : ''}
            }
            td {
              padding: 3px 0;
              vertical-align: top;
              font-size: ${isA4 ? '9px' : '8px'};
              border-bottom: 1px solid #eee;
              ${isA4 ? 'padding: 6px 5px;' : ''}
            }
            .totals {
              border-top: 1px dashed #ccc;
              padding-top: 5px;
              margin-bottom: 10px;
              ${isA4 ? 'width: 250px; border-top: none; margin-left: 0;' : ''}
            }
            .total-row {
              display: flex;
              justify-content: space-between;
              font-weight: bold;
              margin-bottom: 2px;
            }
            .grand-total {
              font-size: ${isA4 ? '16px' : '12px'};
              border-top: 1px solid #000;
              margin-top: 3px;
              padding-top: 3px;
              ${isA4 ? 'background-color: #000; color: #fff; padding: 8px; border-radius: 5px;' : ''}
            }
            .footer {
              text-align: center;
              font-size: 7px;
              margin-top: 15px;
              ${isA4 ? 'margin-top: 30px; border-top: 1px solid #eee; padding-top: 15px;' : ''}
            }
            .qr-section {
              text-align: center;
              margin-top: 10px;
              ${isA4 ? 'text-align: left; display: flex; align-items: center; gap: 15px; margin-top: 0; padding-bottom: 0;' : ''}
            }
            .summary-container {
              ${isA4 ? 'display: flex; justify-content: space-between; align-items: flex-start; margin-top: 20px; border-top: 2px solid #000; padding-top: 10px;' : ''}
            }
            .qr-image {
              width: ${isA4 ? '60px' : '80px'};
              height: ${isA4 ? '60px' : '80px'};
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="business-info">
                <h1 class="business-name">${settings?.business_name || 'MI NEGOCIO'}</h1>
                <p class="info">${settings?.address || ''}</p>
                <p class="info">Telf: ${settings?.phone || ''}</p>
                <p class="info">${settings?.email || ''}</p>
              </div>
              <div class="document-info">
                <div style="font-size: 12px; font-weight: bold;">R.U.C. ${settings?.ruc || '20601234567'}</div>
                <div style="font-size: 16px; font-weight: 900; margin: 5px 0;">${title.toUpperCase()}</div>
                <div style="font-size: 14px; font-weight: bold;">${saleIdStr}</div>
              </div>
            </div>

            <div class="title">
              ${title} ${saleIdStr}
            </div>

            <div class="details">
              <div class="details-section">
                <div class="details-row">
                  <span class="details-label">FECHA:</span>
                  <span>${dateStr}</span>
                </div>
                <div class="details-row">
                  <span class="details-label">CLIENTE:</span>
                  <span>${customerName}</span>
                </div>
                ${selectedSale.dni ? `
                  <div class="details-row">
                    <span class="details-label">DNI/RUC:</span>
                    <span>${selectedSale.dni}</span>
                  </div>
                ` : ''}
              </div>
              ${isA4 ? `
                <div class="details-section">
                  <div class="details-row">
                    <span class="details-label">MONEDA:</span>
                    <span>${settings?.currency === 'S/' ? 'SOLES (PEN)' : settings?.currency}</span>
                  </div>
                  <div class="details-row">
                    <span class="details-label">VENDEDOR:</span>
                    <span>${settings?.user_name || 'ADMIN'}</span>
                  </div>
                </div>
              ` : ''}
            </div>

            <table>
              <thead>
                <tr>
                  <th style="width: 10%">CANT</th>
                  <th>DESCRIPCIÓN</th>
                  <th style="text-align: right; width: 25%">TOTAL</th>
                </tr>
              </thead>
              <tbody>
                ${selectedSale.items?.map((item: any) => `
                  <tr>
                    <td>${item.quantity}</td>
                    <td>
                      <div style="font-weight: bold;">${item.product_name}</div>
                      ${item.serial_numbers ? `
                        <div style="font-size: 7px; color: #666;">
                          S/N: ${(() => {
                            try {
                              const serials = typeof item.serial_numbers === 'string' ? JSON.parse(item.serial_numbers) : item.serial_numbers;
                              return Array.isArray(serials) ? serials.join(', ') : '';
                            } catch (e) { return ''; }
                          })()}
                        </div>
                      ` : ''}
                    </td>
                    <td style="text-align: right">${formatCurrency(item.subtotal)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            ${selectedSale.warranty ? `
              <div style="margin-top: 10px; padding: 8px; border: 1px solid #eee; font-size: 8px; border-radius: 5px;">
                <strong style="text-transform: uppercase;">Garantía:</strong> ${selectedSale.warranty}
              </div>
            ` : ''}

            <div class="summary-container">
              <div class="qr-section">
                ${qrDataUrl ? `<img class="qr-image" src="${qrDataUrl}" />` : ''}
                ${isA4 ? `
                  <div style="font-size: 8px; color: #666;">
                    Representación impresa de la ${title}<br>
                    Consulte su documento en: ${settings?.email || 'nuestro portal'}
                  </div>
                ` : ''}
              </div>

              <div class="totals">
                <div class="total-row">
                  <span>SUBTOTAL:</span>
                  <span>${formatCurrency(selectedSale.subtotal)}</span>
                </div>
                ${selectedSale.total > selectedSale.subtotal ? `
                  <div class="total-row">
                    <span>RECARGO TARJETA (5%):</span>
                    <span>${formatCurrency(Number((selectedSale.total - selectedSale.subtotal).toFixed(2)))}</span>
                  </div>
                ` : ''}
                <div class="total-row">
                  <span>IGV (0%):</span>
                  <span>${formatCurrency(0)}</span>
                </div>
                <div class="total-row grand-total">
                  <span>TOTAL:</span>
                  <span>${formatCurrency(selectedSale.total)}</span>
                </div>
              </div>
            </div>
          </div>
          <script>
            window.onload = () => {
              window.print();
              window.close();
            };
          </script>
        </body>
      </html>
    `);
    windowPrint.document.close();
  };

  const handleDownloadPDF = async () => {
    if (!selectedSale) return;
    
    const doc = new jsPDF();
    const primaryColor = settings?.primary_color || '#22c55e';
    const currency = settings?.currency || 'S/';
    const saleIdStr = `#V${String(selectedSale.id).padStart(6, '0')}`;
    const docTitle = settings?.default_document_type === 'nota' ? 'Nota de Venta' : 'Boleta Electrónica';
    const title = docTitle;
    const cardSurcharge = Number((selectedSale.total - selectedSale.subtotal).toFixed(2));

    // QR Code generation
    let qrDataUrl = '';
    try {
      qrDataUrl = await QRCode.toDataURL(saleIdStr, { margin: 1, width: 256 });
    } catch (err) {
      console.error('Error generating QR code:', err);
    }

    // Header (Matching A4 Print Design)
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(settings?.business_name || 'MI NEGOCIO', 15, 20);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(settings?.address || '', 15, 27);
    doc.text(`Telf: ${settings?.phone || ''} | Email: ${settings?.email || ''}`, 15, 32);

    // Document Info Box (Top Right)
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.5);
    doc.rect(130, 10, 65, 25);
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`R.U.C. ${settings?.ruc || '20601234567'}`, 162.5, 17, { align: 'center' });
    doc.setFontSize(14);
    doc.text(title.toUpperCase(), 162.5, 24, { align: 'center' });
    doc.setFontSize(12);
    doc.text(saleIdStr, 162.5, 31, { align: 'center' });

    // Client Info Section
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('INFORMACIÓN DEL CLIENTE', 15, 50);
    doc.line(15, 52, 100, 52);
    
    doc.setFont('helvetica', 'normal');
    doc.text(`Cliente: ${selectedSale.customer_id ? `${selectedSale.first_name} ${selectedSale.last_name}` : 'Público General'}`, 15, 60);
    if (selectedSale.dni) doc.text(`DNI/RUC: ${selectedSale.dni}`, 15, 65);
    if (selectedSale.phone) doc.text(`Teléfono: ${selectedSale.phone}`, 15, 70);
    if (selectedSale.address) doc.text(`Dirección: ${selectedSale.address}`, 15, 75);

    // Sale Details Section
    doc.setFont('helvetica', 'bold');
    doc.text('DETALLES DE VENTA', 120, 50);
    doc.line(120, 52, 195, 52);
    
    doc.setFont('helvetica', 'normal');
    doc.text(`Fecha: ${new Date(selectedSale.created_at).toLocaleString()}`, 120, 60);
    doc.text(`Estado: Pagado`, 120, 65);
    doc.text(`Moneda: ${currency === 'S/' ? 'Soles (PEN)' : currency}`, 120, 70);
    doc.text(`Vendedor: ${settings?.user_name || 'Admin'}`, 120, 75);
    if (selectedSale.warranty) doc.text(`Garantía: ${selectedSale.warranty}`, 120, 80);

    // Table
    const tableData = selectedSale.items?.map((item: any, index: number) => [
      index + 1,
      item.product_name,
      item.quantity,
      formatCurrency(item.price),
      formatCurrency(item.subtotal)
    ]);

    autoTable(doc, {
      startY: 85,
      head: [['N°', 'Descripción del Producto', 'Cant.', 'P. Unit', 'Total']],
      body: tableData,
      headStyles: { fillColor: primaryColor as any, textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 3 },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      columnStyles: {
        0: { halign: 'center', cellWidth: 10 },
        2: { halign: 'center', cellWidth: 15 },
        3: { halign: 'right', cellWidth: 30 },
        4: { halign: 'right', cellWidth: 30 }
      }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 10;

    // Summary Container (QR + Totals)
    // QR Code on the left
    if (qrDataUrl) {
      doc.addImage(qrDataUrl, 'PNG', 15, finalY, 35, 35);
      doc.setFontSize(7);
      doc.setTextColor(100, 100, 100);
      doc.text(`Representación impresa de la ${title}`, 15, finalY + 40);
      doc.text(`Consulte su documento en: ${settings?.email || 'nuestro portal'}`, 15, finalY + 43);
    }

    // Totals on the right
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    
    let currentY = finalY + 5;
    doc.text('Subtotal:', 140, currentY);
    doc.text(formatCurrency(selectedSale.subtotal), 195, currentY, { align: 'right' });
    
    if (cardSurcharge > 0) {
      currentY += 7;
      doc.text('Recargo Tarjeta (5%):', 140, currentY);
      doc.text(formatCurrency(cardSurcharge), 195, currentY, { align: 'right' });
    }

    currentY += 7;
    doc.text('IGV (0%):', 140, currentY);
    doc.text(formatCurrency(0), 195, currentY, { align: 'right' });

    currentY += 10;
    doc.setFillColor(0, 0, 0);
    doc.rect(135, currentY - 6, 65, 10, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.text('TOTAL:', 140, currentY);
    doc.text(formatCurrency(selectedSale.total), 195, currentY, { align: 'right' });

    // Payments
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('MÉTODOS DE PAGO', 60, finalY + 5);
    doc.setFont('helvetica', 'normal');
    let payY = finalY + 12;
    try {
      const payments = JSON.parse(selectedSale.payment_method || '[]');
      payments.forEach((p: any) => {
        doc.text(`${p.method.replace('_', '/').toUpperCase()}: ${formatCurrency(p.amount)}`, 60, payY);
        payY += 5;
      });
    } catch (e) {}

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(settings?.ticket_message || 'Gracias por su preferencia.', 105, 285, { align: 'center' });

    doc.save(`Venta_${String(selectedSale.id).padStart(6, '0')}.pdf`);
  };

  const filteredSales = sales.filter(s => {
    const saleId = `#V${String(s.id).padStart(6, '0')}`;
    const customerName = `${s.customer_id ? `${(s as any).first_name} ${(s as any).last_name}` : 'Público General'}`.toLowerCase();
    return saleId.includes(search) || customerName.includes(search.toLowerCase());
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Registro de Ventas</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Consulta el historial detallado de todas tus ventas.</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input 
            type="text"
            placeholder="Buscar por ID de venta o nombre del cliente..."
            className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl focus:ring-2 focus:ring-primary outline-none transition-all dark:text-white"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">ID Venta</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Fecha y Hora</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Cliente</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Total</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {filteredSales.map((sale) => (
                <tr key={sale.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors group">
                  <td className="px-6 py-4">
                    <span className="font-mono font-bold text-primary">#V{String(sale.id).padStart(6, '0')}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-gray-900 dark:text-white">{new Date(sale.created_at).toLocaleDateString()}</span>
                      <span className="text-[10px] text-gray-500 font-medium">{new Date(sale.created_at).toLocaleTimeString()}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500">
                        <User size={14} />
                      </div>
                      <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
                        {sale.customer_id ? `${(sale as any).first_name} ${(sale as any).last_name}` : 'Público General'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-black text-gray-900 dark:text-white">{formatCurrency(sale.total)}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => viewSaleDetails(sale.id)}
                      className="p-2 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-xl transition-all"
                      title="Ver Detalles"
                    >
                      <Eye size={20} />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredSales.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center text-gray-400">
                        <Search size={24} />
                      </div>
                      <p className="text-gray-500 font-bold">No se encontraron ventas</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sale Details Modal */}
      <AnimatePresence>
        {isModalOpen && selectedSale && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/50">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center text-white shadow-lg shadow-primary/20">
                    <FileText size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-gray-900 dark:text-white">Detalle de Venta</h3>
                    <p className="text-xs font-bold text-primary tracking-widest uppercase">#V{String(selectedSale.id).padStart(6, '0')}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-400"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar-thin">
                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Fecha y Hora</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">
                      {new Date(selectedSale.created_at).toLocaleDateString()} - {new Date(selectedSale.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Cliente</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">
                      {selectedSale.customer_id ? `${selectedSale.first_name} ${selectedSale.last_name}` : 'Público General'}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Productos</p>
                  <div className="border dark:border-gray-800 rounded-2xl overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-50 dark:bg-gray-800/50 border-b dark:border-gray-800">
                          <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase">Cant.</th>
                          <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase">Descripción</th>
                          <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase text-right">P. Unit</th>
                          <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase text-right">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y dark:divide-gray-800">
                        {selectedSale.items?.map((item: any, idx: number) => (
                          <tr key={idx}>
                            <td className="px-4 py-3 text-sm font-bold text-gray-900 dark:text-white">{item.quantity}</td>
                            <td className="px-4 py-3">
                              <div className="flex flex-col">
                                <span className="text-sm font-bold text-gray-900 dark:text-white">{item.product_name}</span>
                                <span className="text-[10px] text-gray-500 font-medium">SKU: {item.product_code}</span>
                                {item.serial_numbers && (
                                  <div className="mt-1 flex flex-wrap gap-1">
                                    {(() => {
                                      try {
                                        const serials = typeof item.serial_numbers === 'string' ? JSON.parse(item.serial_numbers) : item.serial_numbers;
                                        return Array.isArray(serials) && serials.map((sn: string, i: number) => (
                                          <span key={i} className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 text-[9px] font-bold text-gray-600 dark:text-gray-400 rounded border dark:border-gray-700">
                                            {sn}
                                          </span>
                                        ));
                                      } catch (e) {
                                        return null;
                                      }
                                    })()}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm font-bold text-gray-900 dark:text-white text-right">{formatCurrency(item.price)}</td>
                            <td className="px-4 py-3 text-sm font-black text-gray-900 dark:text-white text-right">{formatCurrency(item.subtotal)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Métodos de Pago</p>
                      <div className="space-y-1">
                        {(() => {
                          try {
                            const payments = JSON.parse(selectedSale.payment_method);
                            return Array.isArray(payments) ? payments.map((p: any, i: number) => (
                              <div key={i} className="flex justify-between text-sm font-bold text-gray-700 dark:text-gray-300">
                                <span className="uppercase">{p.method.replace('_', '/')}</span>
                                <span>{formatCurrency(p.amount)}</span>
                              </div>
                            )) : <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{selectedSale.payment_method}</span>;
                          } catch (e) {
                            return <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{selectedSale.payment_method}</span>;
                          }
                        })()}
                      </div>
                    </div>
                    {selectedSale.warranty && (
                      <div className="space-y-1 p-3 bg-blue-50 dark:bg-blue-500/10 rounded-xl border border-blue-100 dark:border-blue-900/30">
                        <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Garantía</p>
                        <p className="text-sm font-bold text-gray-900 dark:text-white">{selectedSale.warranty}</p>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm font-bold text-gray-500">
                      <span>Subtotal</span>
                      <span>{formatCurrency(selectedSale.subtotal)}</span>
                    </div>
                    {selectedSale.total > selectedSale.subtotal && (
                      <div className="flex justify-between text-sm font-bold text-orange-500">
                        <span>Recargo Tarjeta (5%)</span>
                        <span>{formatCurrency(selectedSale.total - selectedSale.subtotal)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm font-bold text-gray-500">
                      <span>IGV (0%)</span>
                      <span>{formatCurrency(0)}</span>
                    </div>
                    <div className="flex justify-between text-xl font-black text-gray-900 dark:text-white pt-2 border-t dark:border-gray-800">
                      <span>TOTAL</span>
                      <span>{formatCurrency(selectedSale.total)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-gray-50 dark:bg-gray-800/50 border-t dark:border-gray-800 flex justify-end gap-3">
                <button 
                  onClick={handlePrint}
                  className="px-6 py-3 bg-gray-900 text-white font-bold rounded-2xl flex items-center gap-2 hover:bg-gray-800 transition-all"
                >
                  <Ticket size={18} />
                  Imprimir Ticket
                </button>
                <button 
                  onClick={handleDownloadPDF}
                  className="px-6 py-3 bg-blue-600 text-white font-bold rounded-2xl flex items-center gap-2 hover:bg-blue-700 transition-all"
                >
                  <FileText size={18} />
                  Exportar PDF (A4)
                </button>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
                >
                  Cerrar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
