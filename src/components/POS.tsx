import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  CreditCard, 
  Banknote, 
  ArrowRightLeft,
  User,
  Ticket,
  X,
  ShoppingCart,
  Store,
  UserPlus,
  ChevronDown,
  Check,
  Download,
  ShieldCheck,
  FileText,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Product, Category, AppSettings, Customer } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { useDataSync } from '../hooks/useDataSync';
import { useConfirm } from '../hooks/useConfirm';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode';

export default function POS() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    business_name: 'Cargando...',
    address: '',
    phone: '',
    email: '',
    currency: 'S/',
    ticket_message: '',
    theme_mode: 'light',
    primary_color: '#22c55e',
    ticket_size: '80mm',
    ticket_font_family: 'monospace',
    ticket_font_bold: false,
    ticket_font_italic: false
  });
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | 'all'>('all');
  const [cart, setCart] = useState<any[]>([]);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'transfer'>('cash');
  const [receivedAmount, setReceivedAmount] = useState('');
  const [showTicket, setShowTicket] = useState(false);
  const [lastSaleId, setLastSaleId] = useState<number | null>(null);
  const [isQuotation, setIsQuotation] = useState(false);
  const [lastQuotationId, setLastQuotationId] = useState<number | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  
  // Custom product modal states
  const [isCustomProductModalOpen, setIsCustomProductModalOpen] = useState(false);
  const { confirm, ConfirmDialog } = useConfirm();
  const [customProductData, setCustomProductData] = useState({ name: '', price: '' });

  // Serial selection states
  const [isSerialModalOpen, setIsSerialModalOpen] = useState(false);
  const [selectedProductForSerial, setSelectedProductForSerial] = useState<Product | null>(null);
  const [availableSerials, setAvailableSerials] = useState<any[]>([]);
  const [selectedSerials, setSelectedSerials] = useState<string[]>([]);
  const [serialSearchQuery, setSerialSearchQuery] = useState('');

  // Customer states
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isAddingCustomer, setIsAddingCustomer] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerList, setShowCustomerList] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ first_name: '', last_name: '', dni: '', phone: '' });
  const [warranty, setWarranty] = useState('');

  // Multiple payment methods state
  const [payments, setPayments] = useState<{ method: string; amount: number }[]>([]);

  const ticketRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showTicket && (lastSaleId || lastQuotationId)) {
      const saleIdStr = isQuotation 
        ? `#C${String(lastQuotationId).padStart(6, '0')}` 
        : `#V${String(lastSaleId).padStart(6, '0')}`;
      
      QRCode.toDataURL(saleIdStr, { margin: 1, width: 256 })
        .then(setQrDataUrl)
        .catch(err => console.error('Error generating QR code:', err));
    } else {
      setQrDataUrl('');
    }
  }, [showTicket, lastSaleId, lastQuotationId, isQuotation]);

  const fetchData = () => {
    Promise.all([
      fetch('/api/products').then(res => res.json()),
      fetch('/api/categories').then(res => res.json()),
      fetch('/api/settings').then(res => res.json()),
      fetch('/api/customers').then(res => res.json())
    ]).then(([productsData, categoriesData, settingsData, customersData]) => {
      setProducts(productsData);
      setCategories(categoriesData);
      setSettings(settingsData);
      setCustomers(customersData);
    });
  };

  useEffect(() => {
    fetchData();
  }, []);

  useDataSync(fetchData);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsCheckoutOpen(false);
        setShowTicket(false);
        setIsAddingCustomer(false);
        setShowCustomerList(false);
      }
      if (e.key === 'Delete') {
        const activeElement = document.activeElement;
        const isInput = activeElement?.tagName === 'INPUT' || activeElement?.tagName === 'TEXTAREA';
        if (!isInput) {
          if (cart.length > 0) {
            confirm(
              '¿Limpiar carrito?',
              '¿Estás seguro de que deseas vaciar todo el carrito?',
              () => setCart([]),
              'warning'
            );
          }
        }
      }
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'p') {
        const activeElement = document.activeElement;
        const isInput = activeElement?.tagName === 'INPUT' || activeElement?.tagName === 'TEXTAREA';
        if (!isInput) {
          e.preventDefault();
          setIsCustomProductModalOpen(true);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart.length]);

  useEffect(() => {
    const handleBarcodeScan = async (code: string) => {
      if (code.length < 3) return;

      try {
        const trimmedCode = code.trim();
        // First check if it's an exact product code and NOT a serial product
        const productByCode = products.find(p => p.code.toLowerCase() === trimmedCode.toLowerCase());
        
        if (productByCode && !productByCode.has_serials) {
          setSearch(''); 
          addToCart(productByCode);
          return true;
        }

        // Try serial or serialized product
        const res = await fetch(`/api/products/by-serial/${trimmedCode}`);
        if (res.ok) {
          const product = await res.json();
          setSearch(''); 
          if (product.has_serials) {
            addSerializedProductToCart(product, [trimmedCode]);
          } else {
            addToCart(product);
          }
          return true;
        }

        // Final fallback: if it's a serialized product found by code
        if (productByCode && productByCode.has_serials) {
          setSearch('');
          addToCart(productByCode);
          return true;
        }
      } catch (e) {
        console.error('Error scanning barcode:', e);
      }
      return false;
    };

    // We still keep the auto-search for exact matches but with a shorter debounce
    const timeoutId = setTimeout(() => {
      if (search.length >= 4) {
        handleBarcodeScan(search);
      }
    }, 150); // Shorter debounce for faster scanning

    return () => clearTimeout(timeoutId);
  }, [search, products]);

  useEffect(() => {
    // Keep search input focused for barcode scanning - REMOVED per user request
    /*
    const interval = setInterval(() => {
      const activeElement = document.activeElement;
      const isInput = activeElement?.tagName === 'INPUT' || activeElement?.tagName === 'TEXTAREA';
      if (!isInput && searchInputRef.current && !isCheckoutOpen && !isCustomProductModalOpen && !isSerialModalOpen && !isAddingCustomer && !showTicket) {
        searchInputRef.current.focus();
      }
    }, 1000);
    return () => clearInterval(interval);
    */
  }, [isCheckoutOpen, isCustomProductModalOpen, isSerialModalOpen, isAddingCustomer, showTicket]);

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.code.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || p.category_id === selectedCategory;
    return matchesSearch && matchesCategory && p.status === 'active';
  });

  const addToCart = async (product: Product) => {
    // Correctly determine stock for comparison
    const currentStock = Number(product.stock);
    if (currentStock <= 0) {
      alert('Producto sin stock disponible');
      return;
    }

    if (product.has_serials) {
      // Fetch available serials
      try {
        const res = await fetch(`/api/products/${product.id}/items`);
        const items = await res.json();
        const available = items.filter((i: any) => i.status === 'available');
        
        if (available.length === 0) {
          alert('No hay números de serie disponibles para este producto');
          return;
        }

        setSelectedProductForSerial(product);
        setAvailableSerials(available);
        setSelectedSerials([]);
        setSerialSearchQuery('');
        setIsSerialModalOpen(true);
      } catch (error) {
        console.error('Error fetching serials:', error);
      }
      return;
    }
    
    setCart(prev => {
      const existing = prev.find(item => Number(item.id) === Number(product.id));
      if (existing) {
        if (existing.quantity >= currentStock) {
          alert('No hay más stock disponible');
          return prev;
        }
        return prev.map(item => Number(item.id) === Number(product.id) ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const addSerializedProductToCart = (product: Product, serials: string[]) => {
    setCart(prev => {
      const existing = prev.find(item => Number(item.id) === Number(product.id));
      const productStock = Number(product.stock);

      if (existing) {
        // Merge serials, avoiding duplicates
        const currentSerials = existing.selectedSerials || [];
        const newSerials = Array.from(new Set([...currentSerials, ...serials]));
        
        // Check stock (available serials)
        if (newSerials.length > productStock) {
          alert(`No hay suficiente stock disponible. Stock máximo: ${productStock}`);
          return prev;
        }

        return prev.map(item => Number(item.id) === Number(product.id) ? { 
          ...item, 
          quantity: newSerials.length,
          selectedSerials: newSerials
        } : item);
      }

      if (serials.length > productStock) {
        alert(`No hay suficiente stock disponible. Stock máximo: ${productStock}`);
        return prev;
      }

      return [...prev, { ...product, quantity: serials.length, selectedSerials: serials }];
    });
  };

  const updateQuantity = (id: number, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(0, item.quantity + delta);
        const product = products.find(p => p.id === id);
        if (product && newQty > product.stock) return item;
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const removeFromCart = (id: number) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const updatePrice = (id: number, newPrice: number) => {
    setCart(prev => prev.map(item => 
      item.id === id ? { ...item, sale_price: newPrice } : item
    ));
  };

  const updateName = (id: number, newName: string) => {
    setCart(prev => prev.map(item => 
      item.id === id ? { ...item, name: newName } : item
    ));
  };

  const setQuantity = (id: number, quantity: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const product = products.find(p => p.id === id);
        if (product && quantity > product.stock) return item;
        return { ...item, quantity: Math.max(1, quantity) };
      }
      return item;
    }));
  };

  const addUncommonProduct = () => {
    const id = Date.now();
    const uncommonProduct = {
      id,
      name: 'Producto Poco Común',
      sale_price: 0,
      quantity: 1,
      image: 'https://picsum.photos/seed/uncommon/100/100',
      category_id: 'uncommon',
      stock: 999999,
      status: 'active',
      code: 'UNCOMMON',
      is_uncommon: true
    };
    setCart(prev => [...prev, uncommonProduct]);
  };

  const addCustomProductToCart = () => {
    const id = Date.now();
    const uncommonProduct = {
      id,
      name: customProductData.name || 'Producto Especial',
      sale_price: Number(customProductData.price) || 0,
      quantity: 1,
      image: 'https://picsum.photos/seed/uncommon/100/100',
      category_id: 'uncommon',
      stock: 999999,
      status: 'active',
      code: 'UNCOMMON',
      is_uncommon: true
    };
    setCart(prev => [...prev, uncommonProduct]);
    setCustomProductData({ name: '', price: '' });
  };

  const subtotal = Number(cart.reduce((acc, item) => acc + (item.sale_price * item.quantity), 0).toFixed(2));
  const cardSurcharge = Number(payments
    .filter(p => p.method === 'card')
    .reduce((acc, p) => acc + (p.amount - (p.amount / 1.05)), 0).toFixed(2));
  const taxRate = 0;
  const tax = 0;
  const total = Number((subtotal + cardSurcharge).toFixed(2));

  const totalPaid = payments.reduce((acc, p) => acc + p.amount, 0);
  const pendingAmount = Math.max(0, total - totalPaid);
  const change = totalPaid > total ? totalPaid - total : 0;

  const handleCheckout = async () => {
    try {
      const saleData = {
        items: cart.map(item => ({ 
          id: item.is_uncommon ? 0 : item.id, 
          name: item.name,
          quantity: item.quantity, 
          price: item.sale_price,
          serial_numbers: item.selectedSerials || []
        })),
        total,
        subtotal,
        tax,
        payment_method: JSON.stringify(payments),
        customer_id: selectedCustomer?.id || null,
        warranty: warranty
      };

      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(saleData)
      });

      const data = await res.json();

      if (res.ok) {
        setLastSaleId(data.id);
        setIsQuotation(false);
        setIsCheckoutOpen(false);
        setShowTicket(true);
        // Refresh products to update stock
        fetch('/api/products').then(res => res.json()).then(setProducts);
      } else {
        alert(data.error || 'Error al procesar la venta');
      }
    } catch (error) {
      console.error('Error during checkout:', error);
      alert('Error de conexión al procesar la venta');
    }
  };

  const handleQuotation = async () => {
    const quotationData = {
      items: cart.map(item => ({ id: item.id, quantity: item.quantity, price: item.sale_price })),
      total,
      subtotal,
      tax,
      customer_id: selectedCustomer?.id || null
    };

    const res = await fetch('/api/quotations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(quotationData)
    });

    if (res.ok) {
      const data = await res.json();
      setLastQuotationId(data.id);
      setIsQuotation(true);
      setIsCheckoutOpen(false);
      setShowTicket(true);
    }
  };

  const handleCreateCustomer = async () => {
    if (!newCustomer.first_name || !newCustomer.dni) {
      alert('Por favor, ingrese al menos el Nombre y el DNI');
      return;
    }
    
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCustomer)
      });

      const data = await res.json();

      if (res.ok) {
        const created = { ...newCustomer, id: data.id } as Customer;
        setCustomers(prev => [...prev, created]);
        setSelectedCustomer(created);
        setIsAddingCustomer(false);
        setNewCustomer({ first_name: '', last_name: '', dni: '', phone: '' });
        setCustomerSearch(created.dni);
      } else {
        alert(data.error || 'Error al crear cliente');
      }
    } catch (error) {
      console.error('Error creating customer:', error);
      alert('Error de conexión al crear cliente');
    }
  };

  const handlePrint = async () => {
    const saleIdStr = isQuotation 
      ? `#C${String(lastQuotationId).padStart(6, '0')}` 
      : `#V${String(lastSaleId).padStart(6, '0')}`;
    
    const windowPrint = window.open('', '', 'left=0,top=0,width=900,height=1000,toolbar=0,scrollbars=0,status=0');
    if (!windowPrint) return;

    const isA4 = settings?.ticket_size === 'A4';
    const ticketSize = settings?.ticket_size || '80mm';
    // Conservative widths to avoid overflow on different printer margins
    const bodyWidth = isA4 ? '210mm' : (ticketSize === '80mm' ? '65mm' : '42mm');
    const docTitle = settings?.default_document_type === 'nota' ? 'Nota de Venta' : 'Boleta Electrónica';
    const title = isQuotation ? 'Cotización' : docTitle;
    const primaryColor = settings?.primary_color || '#22c55e';
    const ticketFontFamily = settings?.ticket_font_family === 'courier' ? "'Courier New', Courier, monospace" : (settings?.ticket_font_family || "sans-serif");

    const customerName = selectedCustomer ? `${selectedCustomer.first_name} ${selectedCustomer.last_name}` : 'Público General';
    const dateStr = new Date().toLocaleString();

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
            .no-print { display: none; }
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
                ${selectedCustomer?.dni ? `
                  <div class="details-row">
                    <span class="details-label">DNI/RUC:</span>
                    <span>${selectedCustomer.dni}</span>
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
                ${cart.map(item => `
                  <tr>
                    <td>${item.quantity}</td>
                    <td>
                      <div style="font-weight: bold;">${item.name}</div>
                      ${item.selectedSerials && item.selectedSerials.length > 0 ? `
                        <div style="font-size: 7px; color: #666;">
                          S/N: ${item.selectedSerials.join(', ')}
                        </div>
                      ` : ''}
                    </td>
                    <td style="text-align: right">${formatCurrency(item.quantity * item.sale_price)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            ${warranty ? `
              <div style="margin-top: 10px; padding: 8px; border: 1px solid #eee; font-size: 8px; border-radius: 5px;">
                <strong style="text-transform: uppercase;">Garantía:</strong> ${warranty}
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
                  <span>${formatCurrency(subtotal)}</span>
                </div>
                ${cardSurcharge > 0 ? `
                  <div class="total-row">
                    <span>RECARGO TARJETA (5%):</span>
                    <span>${formatCurrency(cardSurcharge)}</span>
                  </div>
                ` : ''}
                <div class="total-row">
                  <span>IGV (0%):</span>
                  <span>${formatCurrency(0)}</span>
                </div>
                <div class="total-row grand-total">
                  <span>TOTAL:</span>
                  <span>${formatCurrency(total)}</span>
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

  const handleDownloadSalePDF = () => {
    const isA4 = settings?.ticket_size === 'A4';
    const ticketSize = settings?.ticket_size || '80mm';
    
    // For downloads, we'll use A4 if A4 is selected, otherwise we'll use a standard A4 
    // but styled like the ticket if the user prefers, but usually A4 is better for files.
    // However, the user asked for "same design and format".
    // Let's stick to A4 for now but match the A4 print design perfectly.
    
    const doc = new jsPDF();
    const primaryColor = settings?.primary_color || '#22c55e';
    const currency = settings?.currency || 'S/';
    const saleIdStr = `#V${String(lastSaleId).padStart(6, '0')}`;
    const docTitle = settings?.default_document_type === 'nota' ? 'Nota de Venta' : 'Boleta Electrónica';
    const title = isQuotation ? 'Cotización' : docTitle;

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
    doc.text(`Cliente: ${selectedCustomer ? `${selectedCustomer.first_name} ${selectedCustomer.last_name}` : 'Público General'}`, 15, 60);
    if (selectedCustomer?.dni) doc.text(`DNI/RUC: ${selectedCustomer.dni}`, 15, 65);
    if (selectedCustomer?.phone) doc.text(`Teléfono: ${selectedCustomer.phone}`, 15, 70);
    if (selectedCustomer?.address) doc.text(`Dirección: ${selectedCustomer.address}`, 15, 75);

    // Sale Details Section
    doc.setFont('helvetica', 'bold');
    doc.text('DETALLES DE VENTA', 120, 50);
    doc.line(120, 52, 195, 52);
    
    doc.setFont('helvetica', 'normal');
    doc.text(`Fecha: ${new Date().toLocaleString()}`, 120, 60);
    doc.text(`Estado: Pagado`, 120, 65);
    doc.text(`Moneda: ${currency === 'S/' ? 'Soles (PEN)' : currency}`, 120, 70);
    doc.text(`Vendedor: ${settings?.user_name || 'Admin'}`, 120, 75);
    if (warranty) doc.text(`Garantía: ${warranty}`, 120, 80);

    // Table
    const tableData = cart.map((item, index) => [
      index + 1,
      item.name,
      item.quantity,
      formatCurrency(item.sale_price),
      formatCurrency(item.quantity * item.sale_price)
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
    doc.text(formatCurrency(subtotal), 195, currentY, { align: 'right' });
    
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
    doc.text(formatCurrency(total), 195, currentY, { align: 'right' });

    // Payments
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('MÉTODOS DE PAGO', 60, finalY + 5);
    doc.setFont('helvetica', 'normal');
    let payY = finalY + 12;
    payments.forEach(p => {
      doc.text(`${p.method.replace('_', '/').toUpperCase()}: ${formatCurrency(p.amount)}`, 60, payY);
      payY += 5;
    });

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(settings?.ticket_message || 'Gracias por su preferencia.', 105, 285, { align: 'center' });

    doc.save(`Venta_${String(lastSaleId).padStart(6, '0')}.pdf`);
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    const primaryColor = settings?.primary_color || '#22c55e';
    const currency = settings?.currency || 'S/';
    const quotationIdStr = `#C${String(lastQuotationId).padStart(6, '0')}`;

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
    doc.text('COTIZACIÓN', 162.5, 24, { align: 'center' });
    doc.setFontSize(12);
    doc.text(quotationIdStr, 162.5, 31, { align: 'center' });

    // Client Info Section
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('INFORMACIÓN DEL CLIENTE', 15, 50);
    doc.line(15, 52, 100, 52);
    
    doc.setFont('helvetica', 'normal');
    doc.text(`Cliente: ${selectedCustomer ? `${selectedCustomer.first_name} ${selectedCustomer.last_name}` : 'Público General'}`, 15, 60);
    if (selectedCustomer?.dni) doc.text(`DNI/RUC: ${selectedCustomer.dni}`, 15, 65);
    if (selectedCustomer?.phone) doc.text(`Teléfono: ${selectedCustomer.phone}`, 15, 70);
    if (selectedCustomer?.address) doc.text(`Dirección: ${selectedCustomer.address}`, 15, 75);

    // Conditions Section
    doc.setFont('helvetica', 'bold');
    doc.text('CONDICIONES COMERCIALES', 120, 50);
    doc.line(120, 52, 195, 52);
    
    doc.setFont('helvetica', 'normal');
    doc.text(`Validez: 7 Días Calendario`, 120, 60);
    doc.text(`Vencimiento: ${new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()}`, 120, 65);
    doc.text(`Moneda: ${currency === 'S/' ? 'Soles (PEN)' : currency}`, 120, 70);
    doc.text(`Vendedor: ${settings?.user_name || 'Admin'}`, 120, 75);

    // Table
    const tableData = cart.map((item, index) => [
      index + 1,
      item.name,
      item.quantity,
      formatCurrency(item.sale_price),
      formatCurrency(item.quantity * item.sale_price)
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

    // Bank Details
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('CUENTAS BANCARIAS', 15, finalY + 5);
    doc.setFont('helvetica', 'normal');
    let bankY = finalY + 12;
    if (settings?.bank_bcp) { doc.text(`BCP: ${settings.bank_bcp}`, 15, bankY); bankY += 5; }
    if (settings?.bank_cci) { doc.text(`CCI: ${settings.bank_cci}`, 15, bankY); bankY += 5; }
    if (settings?.bank_yape_plin) { doc.text(`Yape/Plin: ${settings.bank_yape_plin}`, 15, bankY); bankY += 5; }

    // Totals
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    
    let currentY = finalY + 5;
    doc.text('Subtotal:', 140, currentY);
    doc.text(formatCurrency(subtotal), 195, currentY, { align: 'right' });
    
    currentY += 7;
    doc.text('IGV (0%):', 140, currentY);
    doc.text(formatCurrency(0), 195, currentY, { align: 'right' });

    currentY += 10;
    doc.setFillColor(0, 0, 0);
    doc.rect(135, currentY - 6, 65, 10, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.text('TOTAL NETO:', 140, currentY);
    doc.text(formatCurrency(total), 195, currentY, { align: 'right' });

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('Esta es una cotización informativa generada por Selltium PSG.', 105, 285, { align: 'center' });

    doc.save(`Cotizacion_${String(lastQuotationId).padStart(6, '0')}.pdf`);
  };

  const resetSale = () => {
    if (!isQuotation) {
      setCart([]);
      setPayments([]);
      setSelectedCustomer(null);
      setCustomerSearch('');
      setWarranty('');
    }
    setShowTicket(false);
    setReceivedAmount('');
    setLastSaleId(null);
    setLastQuotationId(null);
    setIsQuotation(false);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-160px)]">
      {/* Products Section */}
      <div className={cn(
        "flex-1 flex flex-col min-w-0 rounded-2xl border shadow-sm overflow-hidden",
        settings?.theme_mode === 'dark' ? "bg-gray-900 border-gray-800" : "bg-white border-gray-100"
      )}>
        <div className={cn(
          "p-4 border-b space-y-4",
          settings?.theme_mode === 'dark' ? "border-gray-800" : "border-gray-100"
        )}>
          <div className="flex items-center justify-between">
            <h2 className={cn(
              "text-lg font-bold",
              settings?.theme_mode === 'dark' ? "text-white" : "text-gray-900"
            )}>
              Venta de Productos
            </h2>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input 
              ref={searchInputRef}
              type="text"
              placeholder="Buscar por nombre o código..."
              className={cn(
                "w-full pl-10 pr-4 py-2.5 border-none rounded-xl focus:ring-2 focus:ring-primary transition-all",
                settings?.theme_mode === 'dark' ? "bg-gray-800 text-white" : "bg-gray-50 text-gray-900"
              )}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && search) {
                  e.preventDefault();
                  const code = search.trim();
                  setSearch(''); 
                  
                  // Check if it's an exact product code first (higher priority for normal products)
                  const productByCode = products.find(p => p.code.toLowerCase() === code.toLowerCase());
                  if (productByCode && !productByCode.has_serials) {
                    addToCart(productByCode);
                  } else {
                    // Try to fetch as serial or find product with serials
                    fetch(`/api/products/by-serial/${code}`).then(res => {
                      if (res.ok) return res.json();
                      
                      // If not found by serial, try by code again but for serial components
                      if (productByCode && productByCode.has_serials) {
                        return productByCode;
                      }
                      return null;
                    }).then(product => {
                      if (product) {
                        if (product.has_serials) {
                          // If it's a serial scan, add specifically
                          // Check if 'code' was actually a serial or the product code
                          // We'll call by-serial API again just to be sure if needed, 
                          // but since we just did, we can check if it's a serial
                          addSerializedProductToCart(product, [code]);
                        } else {
                          addToCart(product);
                        }
                      } else {
                        // Maybe it's just a normal product code that we haven't handled yet
                        if (productByCode) {
                          addToCart(productByCode);
                        }
                      }
                    });
                  }
                }
              }}
            />
          </div>
          <div 
            className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide"
            onWheel={(e) => {
              if (e.deltaY !== 0) {
                e.currentTarget.scrollLeft += e.deltaY;
              }
            }}
          >
            <button 
              onClick={() => setSelectedCategory('all')}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-all",
                selectedCategory === 'all' 
                  ? "bg-primary text-white" 
                  : settings?.theme_mode === 'dark'
                    ? "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              )}
            >
              Todos
            </button>
            {categories.map(cat => (
              <button 
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-all",
                  selectedCategory === cat.id 
                    ? "bg-primary text-white" 
                    : settings?.theme_mode === 'dark'
                      ? "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                )}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map(product => (
              <button
                key={product.id}
                onClick={() => addToCart(product)}
                disabled={product.stock <= 0}
                className={cn(
                  "flex flex-col text-left border rounded-2xl overflow-hidden hover:shadow-xl transition-all group relative",
                  settings?.theme_mode === 'dark' 
                    ? "bg-gray-900 border-gray-800 hover:border-primary" 
                    : "bg-white border-gray-200 hover:border-primary",
                  product.stock <= 0 && "opacity-60 cursor-not-allowed grayscale"
                )}
              >
                <div className={cn(
                  "aspect-[4/3] relative overflow-hidden border-b",
                  settings?.theme_mode === 'dark' ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-100"
                )}>
                  <img 
                    src={product.image || `https://picsum.photos/seed/${product.id}/400/300`} 
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-2 left-2">
                    <span className="bg-white/90 backdrop-blur-sm text-[10px] font-black text-gray-900 px-2 py-1 rounded-lg shadow-sm border border-gray-100">
                      {product.code}
                    </span>
                  </div>
                  {product.stock <= 5 && product.stock > 0 && (
                    <div className="absolute top-2 right-2 bg-orange-500 text-white text-[10px] font-black px-2 py-1 rounded-lg shadow-lg">
                      ¡ÚLTIMOS!
                    </div>
                  )}
                  {product.stock <= 0 && (
                    <div className="absolute inset-0 bg-gray-900/60 flex items-center justify-center backdrop-blur-[2px]">
                      <span className="text-white font-black text-xs uppercase tracking-widest border-2 border-white px-3 py-1 rounded-lg">
                        Agotado
                      </span>
                    </div>
                  )}
                </div>
                <div className="p-4 flex flex-col flex-1 justify-between gap-2">
                  <div>
                    <h4 className={cn(
                      "text-sm font-black leading-tight line-clamp-2 group-hover:text-primary transition-colors",
                      settings?.theme_mode === 'dark' ? "text-white" : "text-gray-900"
                    )}>
                      {product.name}
                    </h4>
                    <p className="text-[10px] text-gray-400 font-bold mt-1 uppercase tracking-wider">{product.brand}</p>
                  </div>
                  <div className="flex items-end justify-between pt-2">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-gray-400 font-black uppercase">Precio</span>
                      <span className="text-lg font-black text-primary leading-none">
                        {formatCurrency(product.sale_price)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="block text-[10px] text-gray-400 font-black uppercase">Stock</span>
                      <span className={cn(
                        "text-xs font-black",
                        product.stock <= 5 ? "text-orange-500" : settings?.theme_mode === 'dark' ? "text-gray-300" : "text-gray-900"
                      )}>
                        {product.stock}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Hover Action Indicator */}
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Cart Section */}
      <div className={cn(
        "w-full lg:w-96 flex flex-col rounded-2xl border shadow-sm overflow-hidden",
        settings?.theme_mode === 'dark' ? "bg-gray-900 border-gray-800" : "bg-white border-gray-100"
      )}>
        <div className={cn(
          "p-4 border-b flex items-center justify-between",
          settings?.theme_mode === 'dark' ? "border-gray-800" : "border-gray-100"
        )}>
          <h3 className={cn(
            "font-bold flex items-center gap-2",
            settings?.theme_mode === 'dark' ? "text-white" : "text-gray-900"
          )}>
            <ShoppingCart size={20} className="text-primary" />
            Carrito
          </h3>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => {
                if (cart.length > 0) {
                  confirm(
                    '¿Vaciar carrito?',
                    '¿Estás seguro de que deseas eliminar todos los productos del carrito?',
                    () => setCart([]),
                    'warning'
                  );
                }
              }}
              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-all"
              title="Vaciar Carrito"
            >
              <Trash2 size={16} />
            </button>
            <span className="bg-primary/10 text-primary text-xs font-bold px-2 py-1 rounded-full">
              {cart.reduce((acc, item) => acc + item.quantity, 0)} items
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-2">
              <ShoppingCart size={48} strokeWidth={1} />
              <p className="text-sm font-medium">El carrito está vacío</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.id} className="flex gap-3">
                <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden shrink-0">
                  <img src={item.image || `https://picsum.photos/seed/${item.id}/100/100`} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
                <div className="flex-1 min-w-0">
                  {item.is_uncommon ? (
                    <input 
                      type="text" 
                      value={item.name} 
                      onChange={(e) => updateName(item.id, e.target.value)}
                      className={cn(
                        "text-sm font-bold w-full bg-transparent border-b border-transparent hover:border-primary focus:border-primary focus:outline-none",
                        settings?.theme_mode === 'dark' ? "text-white" : "text-gray-900"
                      )}
                    />
                  ) : (
                    <h4 className={cn(
                      "text-sm font-bold truncate",
                      settings?.theme_mode === 'dark' ? "text-white" : "text-gray-900"
                    )}>{item.name}</h4>
                  )}
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-primary font-bold">{settings.currency}</span>
                    <input 
                      type="number" 
                      value={item.sale_price} 
                      onChange={(e) => updatePrice(item.id, Number(e.target.value))}
                      className={cn(
                        "text-xs font-bold w-20 bg-transparent border-b border-transparent hover:border-primary focus:border-primary focus:outline-none",
                        settings?.theme_mode === 'dark' ? "text-primary" : "text-primary"
                      )}
                    />
                  </div>
                  
                  {item.selectedSerials && item.selectedSerials.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {item.selectedSerials.map((sn: string) => (
                        <span key={sn} className="text-[8px] bg-gray-100 dark:bg-gray-800 px-1 rounded font-mono dark:text-gray-400">{sn}</span>
                      ))}
                    </div>
                  )}

                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                      {!item.has_serials ? (
                        <>
                          <button onClick={() => updateQuantity(item.id, -1)} className="p-1 hover:bg-white dark:hover:bg-gray-700 rounded-md transition-colors dark:text-gray-300"><Minus size={12} /></button>
                          <input 
                            type="number" 
                            value={item.quantity} 
                            onChange={(e) => setQuantity(item.id, Number(e.target.value))}
                            className="text-xs font-bold w-8 text-center bg-transparent focus:outline-none dark:text-white"
                          />
                          <button onClick={() => updateQuantity(item.id, 1)} className="p-1 hover:bg-white dark:hover:bg-gray-700 rounded-md transition-colors dark:text-gray-300"><Plus size={12} /></button>
                        </>
                      ) : (
                        <div className="flex items-center gap-2 px-2">
                          <ShieldCheck size={12} className="text-primary" />
                          <span className="text-xs font-bold dark:text-white">{item.quantity}</span>
                        </div>
                      )}
                    </div>
                    <button onClick={() => removeFromCart(item.id)} className="text-red-400 hover:text-red-600 transition-colors"><Trash2 size={16} /></button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className={cn(
          "p-4 border-t space-y-3",
          settings?.theme_mode === 'dark' ? "bg-gray-800/50 border-gray-800" : "bg-gray-50 border-gray-100"
        )}>
          <div className={cn(
            "flex justify-between text-lg pt-2 border-t",
            settings?.theme_mode === 'dark' ? "border-gray-700" : "border-gray-200"
          )}>
            <span className={cn(
              "font-bold",
              settings?.theme_mode === 'dark' ? "text-white" : "text-gray-900"
            )}>Total</span>
            <span className="font-black text-primary">{formatCurrency(total)}</span>
          </div>
          <button 
            disabled={cart.length === 0}
            onClick={() => setIsCheckoutOpen(true)}
            className="w-full bg-primary text-white font-bold py-3 rounded-xl shadow-lg shadow-primary/20 hover:opacity-90 disabled:opacity-50 disabled:shadow-none transition-all flex items-center justify-center gap-2"
          >
            Pagar Ahora
            <ArrowRightLeft size={20} />
          </button>
        </div>
      </div>

      {/* Checkout Modal */}
      <AnimatePresence>
        {isCheckoutOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCheckoutOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className={cn(
                "relative w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden",
                settings?.theme_mode === 'dark' ? "bg-gray-900" : "bg-white"
              )}
            >
              <div className={cn(
                "p-6 border-b flex items-center justify-between",
                settings?.theme_mode === 'dark' ? "border-gray-800" : "border-gray-100"
              )}>
                <h3 className={cn(
                  "text-xl font-bold",
                  settings?.theme_mode === 'dark' ? "text-white" : "text-gray-900"
                )}>Finalizar Venta</h3>
                <button onClick={() => setIsCheckoutOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors dark:text-gray-400"><X size={20} /></button>
              </div>
              
              <div className="p-6 overflow-y-auto max-h-[85vh]">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Left Column: Summary & Customer */}
                  <div className="space-y-6">
                    <div className={cn(
                      "text-center p-4 rounded-2xl border shadow-sm",
                      settings?.theme_mode === 'dark' ? "bg-primary/10 border-primary/20" : "bg-green-50 border-green-100"
                    )}>
                      <p className={cn(
                        "text-xs font-bold uppercase tracking-wider",
                        settings?.theme_mode === 'dark' ? "text-primary" : "text-green-600"
                      )}>Total a Pagar</p>
                      <h2 className={cn(
                        "text-3xl font-black mt-1",
                        settings?.theme_mode === 'dark' ? "text-white" : "text-green-700"
                      )}>{formatCurrency(total)}</h2>
                    </div>

                    <div className={cn(
                      "p-4 rounded-2xl border space-y-3",
                      settings?.theme_mode === 'dark' ? "bg-gray-800/50 border-gray-700" : "bg-gray-50/50 border-gray-100"
                    )}>
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Seleccionar Cliente por DNI</label>
                        <button 
                          onClick={() => {
                            const nextState = !isAddingCustomer;
                            setIsAddingCustomer(nextState);
                            if (nextState) {
                              setNewCustomer({ first_name: '', last_name: '', dni: customerSearch, phone: '' });
                            }
                          }}
                          className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                        >
                          {isAddingCustomer ? 'Cancelar' : (
                            <>
                              <UserPlus size={14} />
                              Nuevo Cliente
                            </>
                          )}
                        </button>
                      </div>

                      {isAddingCustomer ? (
                        <motion.div 
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={cn(
                            "p-4 rounded-xl border space-y-3",
                            settings?.theme_mode === 'dark' ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
                          )}
                        >
                          <div className="grid grid-cols-2 gap-3">
                            <input 
                              type="text" 
                              placeholder="DNI" 
                              className={cn(
                                "w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-primary",
                                settings?.theme_mode === 'dark' ? "bg-gray-900 border-gray-700 text-white" : "bg-white border-gray-200 text-gray-900"
                              )}
                              value={newCustomer.dni}
                              onChange={(e) => setNewCustomer({...newCustomer, dni: e.target.value})}
                            />
                            <input 
                              type="text" 
                              placeholder="Teléfono" 
                              className={cn(
                                "w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-primary",
                                settings?.theme_mode === 'dark' ? "bg-gray-900 border-gray-700 text-white" : "bg-white border-gray-200 text-gray-900"
                              )}
                              value={newCustomer.phone}
                              onChange={(e) => setNewCustomer({...newCustomer, phone: e.target.value})}
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <input 
                              type="text" 
                              placeholder="Nombre" 
                              className={cn(
                                "w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-primary",
                                settings?.theme_mode === 'dark' ? "bg-gray-900 border-gray-700 text-white" : "bg-white border-gray-200 text-gray-900"
                              )}
                              value={newCustomer.first_name}
                              onChange={(e) => setNewCustomer({...newCustomer, first_name: e.target.value})}
                            />
                            <input 
                              type="text" 
                              placeholder="Apellido" 
                              className={cn(
                                "w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-primary",
                                settings?.theme_mode === 'dark' ? "bg-gray-900 border-gray-700 text-white" : "bg-white border-gray-200 text-gray-900"
                              )}
                              value={newCustomer.last_name}
                              onChange={(e) => setNewCustomer({...newCustomer, last_name: e.target.value})}
                            />
                          </div>
                          <button 
                            onClick={handleCreateCustomer}
                            className="w-full py-2 bg-primary text-white rounded-lg font-bold text-sm hover:opacity-90 transition-colors"
                          >
                            Guardar Cliente
                          </button>
                        </motion.div>
                      ) : (
                        <div className="space-y-3">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <input 
                              type="text"
                              placeholder="Ingrese DNI para buscar..."
                              className={cn(
                                "w-full pl-9 pr-4 py-3 rounded-xl border transition-all text-sm font-bold",
                                settings?.theme_mode === 'dark' ? "bg-gray-900 border-transparent focus:border-primary text-white" : "bg-white border-gray-200 focus:border-primary text-gray-900"
                              )}
                              value={customerSearch}
                              onChange={(e) => {
                                setCustomerSearch(e.target.value);
                                setShowCustomerList(true);
                                const match = customers.find(c => c.dni === e.target.value);
                                if (match) {
                                  setSelectedCustomer(match);
                                  setShowCustomerList(false);
                                }
                              }}
                              onFocus={() => setShowCustomerList(true)}
                            />

                            <AnimatePresence>
                              {showCustomerList && customerSearch && (
                                <motion.div 
                                  initial={{ opacity: 0, y: -10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -10 }}
                                  className={cn(
                                    "absolute z-50 w-full mt-1 border rounded-xl shadow-xl max-h-48 overflow-y-auto",
                                    settings?.theme_mode === 'dark' ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100"
                                  )}
                                >
                                  {customers
                                    .filter(c => 
                                      (c.dni && c.dni.includes(customerSearch)) ||
                                      `${c.first_name} ${c.last_name}`.toLowerCase().includes(customerSearch.toLowerCase())
                                    )
                                    .map(c => (
                                      <div 
                                        key={c.id}
                                        className={cn(
                                          "px-4 py-3 cursor-pointer text-sm font-medium transition-colors flex items-center justify-between border-b last:border-0",
                                          settings?.theme_mode === 'dark' ? "hover:bg-gray-700 text-gray-300 border-gray-700" : "hover:bg-green-50 text-gray-700 border-gray-50"
                                        )}
                                        onClick={() => {
                                          setSelectedCustomer(c);
                                          setShowCustomerList(false);
                                          setCustomerSearch(c.dni || '');
                                        }}
                                      >
                                        <div className="flex flex-col">
                                          <span className="font-bold">{c.dni || 'S/DNI'}</span>
                                          <span className="text-xs text-gray-500">{c.first_name} {c.last_name}</span>
                                        </div>
                                        {selectedCustomer?.id === c.id && <Check size={14} className="text-primary" />}
                                      </div>
                                    ))}
                                  
                                  {customers.filter(c => (c.dni && c.dni.includes(customerSearch)) || `${c.first_name} ${c.last_name}`.toLowerCase().includes(customerSearch.toLowerCase())).length === 0 && (
                                    <div className="p-4 text-center">
                                      <p className="text-xs text-gray-500 mb-2">No se encontró el cliente</p>
                                      <button 
                                        onClick={() => {
                                          setIsAddingCustomer(true);
                                          setNewCustomer({ ...newCustomer, dni: customerSearch });
                                        }}
                                        className="text-xs font-bold text-primary hover:underline"
                                      >
                                        + Crear nuevo cliente con DNI: {customerSearch}
                                      </button>
                                    </div>
                                  )}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>

                          {selectedCustomer && (
                            <div className={cn(
                              "flex items-center justify-between p-4 rounded-2xl border animate-in fade-in slide-in-from-top-1",
                              settings?.theme_mode === 'dark' ? "bg-primary/10 border-primary/20" : "bg-green-50 border-green-100"
                            )}>
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/20">
                                  <User size={20} />
                                </div>
                                <div>
                                  <p className="text-sm font-bold text-gray-900 dark:text-white">{selectedCustomer.first_name} {selectedCustomer.last_name}</p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">DNI: {selectedCustomer.dni}</p>
                                </div>
                              </div>
                              <button 
                                onClick={() => {
                                  setSelectedCustomer(null);
                                  setCustomerSearch('');
                                }}
                                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-full transition-all"
                              >
                                <X size={18} />
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Payments */}
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Garantía del Producto (Opcional)</label>
                      <input 
                        type="text"
                        className={cn(
                          "w-full px-4 py-2.5 rounded-xl border-2 transition-all outline-none font-bold",
                          settings?.theme_mode === 'dark' 
                            ? "bg-gray-800 border-gray-700 text-white focus:border-primary" 
                            : "bg-gray-50 border-gray-100 focus:border-primary focus:bg-white"
                        )}
                        placeholder="Ej. 12 meses de garantía"
                        value={warranty}
                        onChange={(e) => setWarranty(e.target.value)}
                      />
                    </div>

                    <div className="space-y-3">
                      <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Métodos de Pago</label>
                      <div className="grid grid-cols-4 gap-2">
                        {[
                          { id: 'cash', label: 'Efectivo', icon: Banknote, color: 'text-green-500' },
                          { id: 'card', label: 'Tarjeta (+5%)', icon: CreditCard, color: 'text-blue-500' },
                          { id: 'transfer', label: 'Transf.', icon: ArrowRightLeft, color: 'text-purple-500' },
                          { id: 'yape_plin', label: 'Yape/Plin', icon: Ticket, color: 'text-pink-500' },
                        ].map(method => (
                          <button
                            key={method.id}
                            onClick={() => {
                              let amount = pendingAmount;
                              if (method.id === 'card') {
                                // To get exactly 5% surcharge on the base amount:
                                // base + (base * 0.05) = total  => base * 1.05 = total
                                amount = Number((pendingAmount * 1.05).toFixed(2));
                              }
                              if (amount <= 0) return;
                              setPayments([...payments, { method: method.id, amount }]);
                            }}
                            className={cn(
                              "flex flex-col items-center justify-center gap-1 p-2 rounded-xl border transition-all hover:scale-[1.02] active:scale-[0.98]",
                              settings?.theme_mode === 'dark'
                                ? "border-gray-800 hover:border-primary/50 text-gray-300 bg-gray-800/50"
                                : "border-gray-100 hover:border-primary/30 text-gray-700 bg-gray-50"
                            )}
                          >
                            <method.icon size={18} className={method.color} />
                            <span className="text-[10px] font-bold">{method.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {payments.length > 0 && (
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Desglose de Pago</label>
                        <div className="space-y-1 max-h-32 overflow-y-auto pr-1 scrollbar-hide">
                          {payments.map((p, idx) => (
                            <div key={idx} className={cn(
                              "flex items-center justify-between p-2 rounded-xl border shadow-sm",
                              settings?.theme_mode === 'dark' ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100"
                            )}>
                              <div className="flex items-center gap-3">
                                <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                                  {p.method === 'cash' ? <Banknote size={12} /> : p.method === 'card' ? <CreditCard size={12} /> : p.method === 'transfer' ? <ArrowRightLeft size={12} /> : <Ticket size={12} />}
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-[8px] font-black text-gray-400 uppercase leading-none mb-0.5">{p.method.replace('_', '/')}</span>
                                  <input 
                                    type="number"
                                    className={cn(
                                      "w-24 px-0 py-0 text-sm font-black bg-transparent border-none focus:ring-0",
                                      settings?.theme_mode === 'dark' ? "text-white" : "text-gray-900"
                                    )}
                                    value={p.amount}
                                    onChange={(e) => {
                                      const val = parseFloat(e.target.value) || 0;
                                      const newPayments = [...payments];
                                      newPayments[idx].amount = val;
                                      setPayments(newPayments);
                                    }}
                                  />
                                </div>
                              </div>
                              <button 
                                onClick={() => setPayments(payments.filter((_, i) => i !== idx))}
                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-all"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      <div className={cn(
                        "p-3 rounded-2xl border shadow-sm",
                        settings?.theme_mode === 'dark' ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100"
                      )}>
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-wider">Subtotal</p>
                        <p className={cn(
                          "text-lg font-black mt-0.5",
                          settings?.theme_mode === 'dark' ? "text-white" : "text-gray-900"
                        )}>{formatCurrency(subtotal)}</p>
                      </div>
                      <div className={cn(
                        "p-3 rounded-2xl border shadow-sm",
                        settings?.theme_mode === 'dark' ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100"
                      )}>
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-wider">Recargo Tarjeta (5%)</p>
                        <p className={cn(
                          "text-lg font-black mt-0.5",
                          cardSurcharge > 0 ? "text-orange-500" : "text-gray-400"
                        )}>{formatCurrency(cardSurcharge)}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className={cn(
                        "p-3 rounded-2xl border shadow-sm",
                        settings?.theme_mode === 'dark' ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100"
                      )}>
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-wider">Pendiente</p>
                        <p className={cn(
                          "text-lg font-black mt-0.5",
                          pendingAmount > 0 ? "text-red-500" : "text-green-500"
                        )}>{formatCurrency(pendingAmount)}</p>
                      </div>
                      <div className={cn(
                        "p-3 rounded-2xl border shadow-sm",
                        settings?.theme_mode === 'dark' ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100"
                      )}>
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-wider">Vuelto</p>
                        <p className="text-lg font-black text-blue-500 mt-0.5">{formatCurrency(change)}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={handleQuotation}
                        disabled={cart.length === 0}
                        className="w-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-black py-3 rounded-2xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-all text-sm mt-2"
                      >
                        Crear Cotización
                      </button>
                      <button
                        onClick={handleCheckout}
                        disabled={pendingAmount > 0 || cart.length === 0}
                        className="w-full bg-primary text-white font-black py-3 rounded-2xl shadow-lg shadow-primary/20 hover:opacity-90 disabled:opacity-50 disabled:shadow-none transition-all text-sm mt-2"
                      >
                        Confirmar Venta
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Ticket Modal */}
      <AnimatePresence>
        {showTicket && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className={cn(
                "relative bg-white rounded-3xl shadow-2xl overflow-hidden transition-all duration-300",
                settings?.ticket_size === 'A4' ? "w-full max-w-2xl" : 
                settings?.ticket_size === '58mm' ? "w-full max-w-[280px]" : "w-full max-w-sm"
              )}
            >
              <div className={cn(
                "p-8 flex flex-col items-center justify-center space-y-6 min-h-[400px]"
              )} ref={ticketRef}>
                <div className="text-center space-y-2">
                  <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest">Comprobante Electrónico</h3>
                  <p className="text-lg font-black text-gray-900">
                    {isQuotation ? 'COTIZACIÓN' : 'VENTA'}: #{isQuotation ? 'C' : 'V'}{String(isQuotation ? lastQuotationId : lastSaleId).padStart(6, '0')}
                  </p>
                </div>

                <div className="relative group">
                  <div className="absolute -inset-4 bg-primary/10 rounded-3xl blur-xl group-hover:bg-primary/20 transition-all duration-500" />
                  <div className="relative bg-white p-6 rounded-2xl border-2 border-primary/20 shadow-xl">
                    {qrDataUrl ? (
                      <img 
                        src={qrDataUrl} 
                        alt="QR Code" 
                        className="w-48 h-48 object-contain" 
                      />
                    ) : (
                      <div className="w-48 h-48 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400">
                        Generando QR...
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-center space-y-1">
                  <p className="text-xs font-black text-primary uppercase tracking-widest">Escanear para Validar</p>
                  <p className="text-[10px] text-gray-400 font-bold uppercase">Total: {formatCurrency(total)}</p>
                </div>

                <div className="w-full pt-6 space-y-3 no-print">
                  <div className="flex flex-col gap-2">
                    {isQuotation ? (
                      <button 
                        onClick={handleDownloadPDF}
                        className="w-full bg-blue-600 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 active:scale-[0.98]"
                      >
                        <Download size={20} />
                        Descargar PDF
                      </button>
                    ) : (
                      <button 
                        onClick={handlePrint}
                        className="w-full bg-gray-900 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-gray-800 transition-all shadow-lg shadow-gray-900/20 active:scale-[0.98]"
                      >
                        <Ticket size={20} />
                        Imprimir Ticket
                      </button>
                    )}
                    <button 
                      onClick={resetSale}
                      className="w-full bg-primary text-white font-bold py-4 rounded-2xl hover:opacity-90 transition-all shadow-lg shadow-primary/20 active:scale-[0.98]"
                    >
                      {isQuotation ? 'Continuar Venta' : 'Nueva Venta'}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Serial Selection Modal */}
      <AnimatePresence>
        {isSerialModalOpen && selectedProductForSerial && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSerialModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className={cn(
                "relative w-full max-w-md rounded-3xl shadow-2xl overflow-hidden",
                settings?.theme_mode === 'dark' ? "bg-gray-900" : "bg-white"
              )}
            >
              <div className="p-6 border-b flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                    <ShieldCheck size={24} />
                  </div>
                  <div>
                    <h3 className="font-black text-gray-900 dark:text-white">Seleccionar Series</h3>
                    <p className="text-xs text-gray-500 font-bold uppercase">{selectedProductForSerial.name}</p>
                  </div>
                </div>
                <button onClick={() => setIsSerialModalOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    placeholder="Buscar número de serie..."
                    className={cn(
                      "w-full pl-11 pr-4 py-3 rounded-2xl border-2 transition-all outline-none font-bold",
                      settings?.theme_mode === 'dark' 
                        ? "bg-gray-800 border-gray-700 text-white focus:border-primary" 
                        : "bg-gray-50 border-gray-100 focus:border-primary focus:bg-white"
                    )}
                    value={serialSearchQuery}
                    onChange={(e) => setSerialSearchQuery(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto pr-2 scrollbar-thin">
                  {availableSerials
                    .filter(item => item.serial_number.toLowerCase().includes(serialSearchQuery.toLowerCase()))
                    .length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-gray-500 font-bold">No se encontraron series</p>
                      </div>
                    ) : (
                      availableSerials
                        .filter(item => item.serial_number.toLowerCase().includes(serialSearchQuery.toLowerCase()))
                        .map(item => {
                          const isSelected = selectedSerials.includes(item.serial_number);
                          return (
                            <button
                              key={item.id}
                              onClick={() => {
                                if (isSelected) {
                                  setSelectedSerials(prev => prev.filter(s => s !== item.serial_number));
                                } else {
                                  setSelectedSerials(prev => [...prev, item.serial_number]);
                                }
                              }}
                              className={cn(
                                "flex items-center justify-between p-3 rounded-xl border-2 transition-all text-left",
                                isSelected 
                                  ? "border-primary bg-primary/5 text-primary" 
                                  : "border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700 text-gray-600 dark:text-gray-400"
                              )}
                            >
                              <span className="font-mono font-bold">{item.serial_number}</span>
                              {isSelected && <Check size={18} />}
                            </button>
                          );
                        })
                    )}
                </div>

                <div className="flex items-center justify-between pt-4 border-t dark:border-gray-800">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-gray-400 uppercase">Seleccionados</span>
                    <span className="text-lg font-black text-primary">{selectedSerials.length}</span>
                  </div>
                  <button
                    disabled={selectedSerials.length === 0}
                    onClick={() => {
                      addSerializedProductToCart(selectedProductForSerial, selectedSerials);
                      setIsSerialModalOpen(false);
                    }}
                    className="bg-primary text-white font-black px-8 py-3 rounded-2xl shadow-lg shadow-primary/20 hover:opacity-90 disabled:opacity-50 transition-all"
                  >
                    AGREGAR AL CARRITO
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Custom Product Modal */}
      <AnimatePresence>
        {isCustomProductModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCustomProductModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className={cn(
                "relative w-full max-w-md rounded-3xl shadow-2xl overflow-hidden",
                settings?.theme_mode === 'dark' ? "bg-gray-900" : "bg-white"
              )}
            >
              <div className="p-6 border-b dark:border-gray-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                    <Plus className="text-primary" size={24} />
                  </div>
                  <div>
                    <h3 className="font-black text-gray-900 dark:text-white">Producto Especial</h3>
                    <p className="text-[10px] text-gray-400 font-bold uppercase">Ingresar datos manualmente</p>
                  </div>
                </div>
                <button onClick={() => setIsCustomProductModalOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Nombre del Producto</label>
                  <input
                    autoFocus
                    type="text"
                    placeholder="Ej: Servicio Técnico, Producto Especial..."
                    className={cn(
                      "w-full px-4 py-3 rounded-2xl border-2 transition-all outline-none font-bold",
                      settings?.theme_mode === 'dark' 
                        ? "bg-gray-800 border-gray-700 text-white focus:border-primary" 
                        : "bg-gray-50 border-gray-100 focus:border-primary focus:bg-white"
                    )}
                    value={customProductData.name}
                    onChange={(e) => setCustomProductData(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Precio de Venta ({settings.currency})</label>
                  <input
                    type="number"
                    placeholder="0.00"
                    className={cn(
                      "w-full px-4 py-3 rounded-2xl border-2 transition-all outline-none font-bold",
                      settings?.theme_mode === 'dark' 
                        ? "bg-gray-800 border-gray-700 text-white focus:border-primary" 
                        : "bg-gray-50 border-gray-100 focus:border-primary focus:bg-white"
                    )}
                    value={customProductData.price}
                    onChange={(e) => setCustomProductData(prev => ({ ...prev, price: e.target.value }))}
                  />
                </div>

                <button
                  disabled={!customProductData.name || !customProductData.price}
                  onClick={() => {
                    addCustomProductToCart();
                    setIsCustomProductModalOpen(false);
                  }}
                  className="w-full bg-primary text-white font-black py-4 rounded-2xl shadow-lg shadow-primary/20 hover:opacity-90 disabled:opacity-50 transition-all mt-2"
                >
                  AGREGAR AL CARRITO
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <ConfirmDialog />
    </div>
  );
}
