export interface Category {
  id: number;
  name: string;
  prefix: string;
  description: string;
  status: 'active' | 'inactive';
  created_at: string;
}

export interface ProductItem {
  id: number;
  product_id: number;
  serial_number: string;
  status: 'available' | 'sold' | 'returned' | 'defective';
  sale_id?: number;
  created_at: string;
}

export interface Product {
  id: number;
  code: string;
  name: string;
  image?: string;
  description?: string;
  category_id: number;
  category_name?: string;
  purchase_price: number;
  sale_price: number;
  stock: number;
  min_stock: number;
  unit: string;
  brand?: string;
  supplier_id?: number;
  status: 'active' | 'inactive';
  has_serials?: boolean;
  parent_id?: number;
  units_per_package?: number;
  created_at: string;
  items?: ProductItem[];
}

export interface Supplier {
  id: number;
  name: string;
  company: string;
  tax_id: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  country: string;
  contact_person: string;
  notes: string;
  created_at: string;
}

export interface Customer {
  id: number;
  first_name: string;
  last_name: string;
  dni: string;
  phone: string;
  email: string;
  address: string;
  created_at: string;
}

export interface SaleItem {
  id: number;
  name: string;
  quantity: number;
  price: number;
  subtotal: number;
}

export interface Payment {
  method: 'cash' | 'card' | 'transfer' | 'yape_plin';
  amount: number;
}

export interface Sale {
  id: number;
  customer_id?: number;
  total: number;
  subtotal: number;
  tax: number;
  payment_method: string; // Stores JSON string of Payment[]
  warranty?: string;
  created_at: string;
  items?: SaleItem[];
}

export interface User {
  id: number;
  email: string;
  name: string;
  role: 'DESARROLLADOR' | 'ADMINISTRADOR' | 'ESTANDARD';
  created_at: string;
}

export interface AppSettings {
  business_name: string;
  address: string;
  phone: string;
  email: string;
  currency: string;
  ticket_message: string;
  business_logo?: string;
  installation_date?: string;
  activation_status?: 'demo' | 'activated';
  // Appearance
  theme_mode?: 'light' | 'dark';
  primary_color?: string;
  // User Profile
  user_name?: string;
  user_role?: 'DESARROLLADOR' | 'ADMINISTRADOR' | 'ESTANDARD';
  user_avatar?: string;
  // Bank Details
  bank_bcp?: string;
  bank_cci?: string;
  bank_yape_plin?: string;
  admin_email?: string;
  admin_password?: string;
  security_question?: string;
  security_answer?: string;
  ticket_size?: '80mm' | '58mm' | 'A4';
  ticket_font_family?: 'monospace' | 'sans-serif' | 'serif' | 'courier';
  ticket_font_bold?: boolean;
  ticket_font_italic?: boolean;
  default_document_type?: 'boleta' | 'nota';
  license_expiry?: string;
  license_type?: string;
  voucher_count?: number;
  demo_voucher_limit?: number;
  unlimited_users?: string;
}
