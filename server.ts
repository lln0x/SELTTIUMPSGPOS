import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { createServer } from "http";
import { Server } from "socket.io";

const db = new Database("pos.db");
db.pragma('foreign_keys = ON');

// Initialize Database Schema
db.exec(`
  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    prefix TEXT NOT NULL UNIQUE,
    description TEXT,
    status TEXT DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS suppliers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    company TEXT,
    tax_id TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    city TEXT,
    country TEXT,
    contact_person TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name TEXT NOT NULL,
    last_name TEXT,
    dni TEXT UNIQUE,
    phone TEXT,
    email TEXT,
    address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    image TEXT,
    description TEXT,
    category_id INTEGER,
    purchase_price REAL,
    sale_price REAL,
    stock INTEGER DEFAULT 0,
    min_stock INTEGER DEFAULT 5,
    unit TEXT DEFAULT 'unidad',
    brand TEXT,
    supplier_id INTEGER,
    status TEXT DEFAULT 'active',
    has_serials INTEGER DEFAULT 0,
    parent_id INTEGER,
    units_per_package INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id),
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
    FOREIGN KEY (parent_id) REFERENCES products(id)
  );

  CREATE TABLE IF NOT EXISTS product_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    serial_number TEXT NOT NULL UNIQUE,
    status TEXT DEFAULT 'available', -- available, sold, returned, defective
    sale_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (sale_id) REFERENCES sales(id)
  );

  CREATE TABLE IF NOT EXISTS sales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER,
    total REAL NOT NULL,
    subtotal REAL,
    tax REAL,
    payment_method TEXT,
    warranty TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id)
  );

  CREATE TABLE IF NOT EXISTS sale_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sale_id INTEGER,
    product_id INTEGER,
    quantity INTEGER,
    price REAL,
    subtotal REAL,
    serial_numbers TEXT,
    FOREIGN KEY (sale_id) REFERENCES sales(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT,
    role TEXT DEFAULT 'user', -- admin, user
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS quotations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER,
    total REAL NOT NULL,
    subtotal REAL,
    tax REAL,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id)
  );

  CREATE TABLE IF NOT EXISTS quotation_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    quotation_id INTEGER,
    product_id INTEGER,
    quantity INTEGER,
    price REAL,
    subtotal REAL,
    FOREIGN KEY (quotation_id) REFERENCES quotations(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
  );

  CREATE TABLE IF NOT EXISTS cash_flow (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL, -- 'income' or 'expense'
    amount REAL NOT NULL,
    description TEXT,
    source_type TEXT, -- 'sale', 'manual'
    source_id INTEGER, -- sale_id if applicable
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Migration: Add serial_numbers to sale_items if it doesn't exist
try {
  db.exec("ALTER TABLE sale_items ADD COLUMN serial_numbers TEXT;");
} catch (e) {
  // Column already exists or other error
}

// Migration: Add warranty to sales if it doesn't exist
try {
  db.exec("ALTER TABLE sales ADD COLUMN warranty TEXT;");
} catch (e) {
  // Column already exists or other error
}

// Migration: Add subtotal to sales if it doesn't exist
try {
  db.exec("ALTER TABLE sales ADD COLUMN subtotal REAL;");
} catch (e) {
  // Column already exists or other error
}

// Migration: Add tax to sales if it doesn't exist
try {
  db.exec("ALTER TABLE sales ADD COLUMN tax REAL;");
} catch (e) {
  // Column already exists or other error
}

// Seed Initial Data
try {
  // Ensure 'demo' user exists
  const demoExists = db.prepare("SELECT COUNT(*) as count FROM users WHERE email = 'demo'").get() as { count: number };
  if (demoExists.count === 0) {
    db.prepare("INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)").run('demo', 'demo', 'Usuario Demo', 'ESTANDARD');
  }
} catch (e) {
  console.error("Error seeding initial data:", e);
}

// Migration: Add payment_method to sales if it doesn't exist
try {
  db.exec("ALTER TABLE sales ADD COLUMN payment_method TEXT;");
} catch (e) {
  // Column already exists or other error
}

// Migration: Add custom_name to sale_items if it doesn't exist
try {
  db.exec("ALTER TABLE sale_items ADD COLUMN custom_name TEXT;");
} catch (e) {
  // Column already exists or other error
}

// Migration: Add subtotal to quotations if it doesn't exist
try {
  db.exec("ALTER TABLE quotations ADD COLUMN subtotal REAL;");
} catch (e) {
  // Column already exists or other error
}

// Migration: Add tax to quotations if it doesn't exist
try {
  db.exec("ALTER TABLE quotations ADD COLUMN tax REAL;");
} catch (e) {
  // Column already exists or other error
}

// Seed generic category and product
db.prepare("INSERT OR IGNORE INTO categories (id, name, prefix, description) VALUES (0, 'Varios', 'VR', 'Productos no categorizados')").run();
db.prepare("INSERT OR IGNORE INTO products (id, code, name, category_id, sale_price, stock, min_stock, status) VALUES (0, 'GENERIC', 'Producto Varios', 0, 0, 999999, 0, 'active')").run();

// Seed default settings if empty
const settingsCount = db.prepare("SELECT COUNT(*) as count FROM settings").get() as { count: number };
if (settingsCount.count === 0) {
  const insertSetting = db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)");
  insertSetting.run("business_name", "Mi Tienda de Abarrotes");
  insertSetting.run("address", "Calle Principal 123");
  insertSetting.run("phone", "987654321");
  insertSetting.run("email", "contacto@mitienda.com");
  insertSetting.run("currency", "S/");
  insertSetting.run("ticket_message", "¡Gracias por su compra!");
  insertSetting.run("installation_date", "");
  insertSetting.run("activation_status", "activated"); // demo, activated
  insertSetting.run("theme_mode", "light");
  insertSetting.run("primary_color", "#22c55e");
  insertSetting.run("user_name", "Admin Usuario");
  insertSetting.run("user_role", "Administrador");
  insertSetting.run("user_avatar", "https://picsum.photos/seed/admin/100/100");
  insertSetting.run("ticket_size", "80mm");
  insertSetting.run("ticket_font_family", "monospace");
  insertSetting.run("ticket_font_bold", "0");
  insertSetting.run("ticket_font_italic", "0");
  insertSetting.run("demo_voucher_limit", "10");
  insertSetting.run("demo_duration_hours", "0.016666666666666666");
} else {
  // Ensure new settings exist for existing installations
  const checkSetting = db.prepare("SELECT COUNT(*) as count FROM settings WHERE key = ?");
  const insertSetting = db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)");
  
  if ((checkSetting.get("installation_date") as any).count === 0) {
    insertSetting.run("installation_date", "");
  }
  if ((checkSetting.get("activation_status") as any).count === 0) {
    insertSetting.run("activation_status", "activated");
  }
  if ((checkSetting.get("theme_mode") as any).count === 0) {
    insertSetting.run("theme_mode", "light");
  }
  if ((checkSetting.get("primary_color") as any).count === 0) {
    insertSetting.run("primary_color", "#22c55e");
  }
  if ((checkSetting.get("ticket_size") as any).count === 0) {
    insertSetting.run("ticket_size", "80mm");
  }
  if ((checkSetting.get("user_name") as any).count === 0) {
    insertSetting.run("user_name", "Admin Usuario");
  }
  if ((checkSetting.get("user_role") as any).count === 0) {
    insertSetting.run("user_role", "Administrador");
  }
  if ((checkSetting.get("user_avatar") as any).count === 0) {
    insertSetting.run("user_avatar", "https://picsum.photos/seed/admin/100/100");
  }
  if ((checkSetting.get("business_logo") as any).count === 0) {
    insertSetting.run("business_logo", "");
  }
  if ((checkSetting.get("ticket_font_family") as any).count === 0) {
    insertSetting.run("ticket_font_family", "monospace");
  }
  if ((checkSetting.get("ticket_font_bold") as any).count === 0) {
    insertSetting.run("ticket_font_bold", "0");
  }
  if ((checkSetting.get("ticket_font_italic") as any).count === 0) {
    insertSetting.run("ticket_font_italic", "0");
  }
  if ((checkSetting.get("demo_voucher_limit") as any).count === 0) {
    insertSetting.run("demo_voucher_limit", "10");
  }
  if ((checkSetting.get("demo_duration_hours") as any).count === 0) {
    insertSetting.run("demo_duration_hours", "0.016666666666666666");
  }
  if ((checkSetting.get("license_expiry") as any).count === 0) {
    insertSetting.run("license_expiry", "");
  }
  if ((checkSetting.get("license_type") as any).count === 0) {
    insertSetting.run("license_type", "infinite");
  }
  if ((checkSetting.get("unlimited_users") as any).count === 0) {
    insertSetting.run("unlimited_users", "0");
  }

  // Add DNI column if it doesn't exist
  try {
    db.prepare("ALTER TABLE customers ADD COLUMN dni TEXT UNIQUE").run();
  } catch (e) {
    // Column already exists
  }

  // Add parent_id column to products if it doesn't exist
  try {
    db.prepare("ALTER TABLE products ADD COLUMN parent_id INTEGER").run();
  } catch (e) {
    // Column already exists
  }

  // Add units_per_package column to products if it doesn't exist
  try {
    db.prepare("ALTER TABLE products ADD COLUMN units_per_package INTEGER DEFAULT 1").run();
  } catch (e) {
    // Column already exists
  }

  // Add has_serials column to products if it doesn't exist
  try {
    db.prepare("ALTER TABLE products ADD COLUMN has_serials INTEGER DEFAULT 0").run();
  } catch (e) {
    // Column already exists
  }

  // Force theme_mode to light
  db.prepare("UPDATE settings SET value = 'light' WHERE key = 'theme_mode'").run();
  // Seed users
  const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number };
  if (userCount.count === 0) {
    db.prepare("INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)").run('admin@psg.la', '1475369', 'PSG Admin', 'DESARROLLADOR');
  }
}

// Seed categories
const insertCategory = db.prepare("INSERT OR IGNORE INTO categories (name, prefix, description) VALUES (?, ?, ?)");
insertCategory.run("Bebidas", "BD", "Aguas, gaseosas, jugos, energizantes y bebidas refrescantes.");
insertCategory.run("Lácteos", "LC", "Leches, yogures, quesos, mantequillas y derivados refrigerados.");
insertCategory.run("Snacks", "SN", "Galletas, papas fritas, chocolates, caramelos y piqueos.");
insertCategory.run("Abarrotes", "AB", "Productos básicos: arroz, azúcar, aceites, fideos y menestras.");
insertCategory.run("Limpieza", "LM", "Detergentes, jabones, desinfectantes y útiles de aseo hogar.");
insertCategory.run("Panadería", "PN", "Panes frescos, pasteles, queques y productos de panificación.");
insertCategory.run("Embutidos", "EM", "Jamones, salchichas, chorizos y carnes procesadas.");
insertCategory.run("Frutas y Verduras", "FV", "Frutas frescas de estación y verduras seleccionadas.");
insertCategory.run("Cuidado Personal", "CP", "Shampoo, desodorantes, cremas y artículos de aseo personal.");
insertCategory.run("Mascotas", "MS", "Alimentos para perros, gatos y accesorios para mascotas.");
insertCategory.run("Licores", "LI", "Vinos, piscos, cervezas y licores variados.");
insertCategory.run("Congelados", "CG", "Helados, nuggets, hamburguesas y productos congelados.");
insertCategory.run("Desayunos y Cereales", "DC", "Avenas, cereales, mermeladas y complementos para el desayuno.");
insertCategory.run("Bebés", "BB", "Pañales, fórmulas, toallitas y cuidado para el bebé.");
insertCategory.run("Ferretería y Hogar", "FH", "Pilas, focos, herramientas básicas y artículos para el hogar.");

// Seed suppliers
const insertSupplier = db.prepare("INSERT OR IGNORE INTO suppliers (name, company, phone, email, address) VALUES (?, ?, ?, ?, ?)");
insertSupplier.run("Arca Continental", "Arca Continental Lindley S.A.", "01 311 3000", "ventas@arcacontal.com", "Av. Javier Prado Este 796");
insertSupplier.run("Backus", "Backus y Johnston S.A.A.", "01 311 3000", "contacto@backus.com", "Av. Nicolás de Piérola 400");
insertSupplier.run("Gloria S.A.", "Leche Gloria S.A.", "01 470 7170", "atencion@gloria.com.pe", "Av. República de Panamá 2461");
insertSupplier.run("Laive S.A.", "Laive S.A.", "01 614 2000", "contacto@laive.com.pe", "Av. Nicolás de Piérola 601");
insertSupplier.run("Nestlé Perú", "Nestlé Perú S.A.", "01 800 10210", "servicio@nestle.com.pe", "Calle Luis Galvani 492");
insertSupplier.run("PepsiCo", "PepsiCo Alimentos Perú S.R.L.", "01 614 2000", "ventas@pepsico.com", "Av. El Derby 250");
insertSupplier.run("Alicorp", "Alicorp S.A.A.", "01 315 0800", "atencion@alicorp.com.pe", "Av. Argentina 4793");
insertSupplier.run("Costeño Alimentos", "Costeño Alimentos S.A.C.", "01 617 3700", "ventas@costeno.com.pe", "Av. Industrial 123");
insertSupplier.run("P&G", "Procter & Gamble Perú S.R.L.", "01 614 2000", "contacto@pg.com", "Av. El Derby 250");
insertSupplier.run("Clorox", "Clorox Perú S.A.", "01 614 2000", "ventas@clorox.com", "Av. El Derby 250");
insertSupplier.run("San Fernando", "San Fernando S.A.", "01 213 5300", "ventas@san-fernando.com.pe", "Av. República de Panamá 4295");
insertSupplier.run("Kimberly-Clark", "Kimberly-Clark Perú S.R.L.", "01 211 4000", "contacto@kcc.com", "Av. Canaval y Moreyra 480");
insertSupplier.run("Molitalia", "Molitalia S.A.", "01 513 9000", "ventas@molitalia.com.pe", "Av. Venezuela 2850");
insertSupplier.run("Mars", "Mars Perú S.A.", "01 614 2000", "contacto@mars.com", "Av. El Derby 250");
insertSupplier.run("Bimbo", "Bimbo del Perú S.A.", "01 415 1200", "ventas@bimbo.com.pe", "Av. Venezuela 4560");
insertSupplier.run("Pernod Ricard", "Pernod Ricard Perú S.A.", "01 614 2000", "contacto@pernod-ricard.com", "Av. El Derby 250");
insertSupplier.run("Frialsa", "Frialsa Logística Perú S.A.C.", "01 617 3700", "ventas@frialsa.com.pe", "Av. Industrial 123");
insertSupplier.run("Kellogg's", "Kellogg de Perú S.R.L.", "01 614 2000", "contacto@kelloggs.com", "Av. El Derby 250");
insertSupplier.run("Johnson & Johnson", "Johnson & Johnson del Perú S.A.", "01 211 4000", "atencion@jnj.com", "Av. Canaval y Moreyra 480");
insertSupplier.run("Sodimac", "Sodimac Perú S.A.", "01 615 6000", "ventas@sodimac.com.pe", "Av. Javier Prado Este 796");

// Seed products
const insertProduct = db.prepare(`
  INSERT OR IGNORE INTO products (code, name, category_id, purchase_price, sale_price, stock, min_stock, unit, brand, supplier_id, description, image, status)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
`);

const cats = db.prepare("SELECT id, prefix FROM categories").all() as any[];
const sups = db.prepare("SELECT id, name FROM suppliers").all() as any[];

const getCatId = (prefix: string) => cats.find(c => c.prefix === prefix)?.id;
const getSupId = (name: string) => sups.find(s => s.name === name)?.id;

  // Bebidas (BD)
  insertProduct.run("BD001", "Coca Cola Original 1.5L", getCatId("BD"), 3.50, 5.00, 24, 6, "Botella", "Coca Cola", getSupId("Arca Continental"), "Gaseosa refrescante", "https://picsum.photos/seed/BD001/400/400");
  insertProduct.run("BD002", "Agua San Mateo Sin Gas 600ml", getCatId("BD"), 1.00, 2.00, 48, 12, "Botella", "San Mateo", getSupId("Backus"), "Agua mineral de manantial", "https://picsum.photos/seed/BD002/400/400");
  insertProduct.run("BD003", "Frugos del Valle Naranja 1L", getCatId("BD"), 2.80, 4.50, 15, 5, "Caja", "Del Valle", getSupId("Arca Continental"), "Jugo de naranja", "https://picsum.photos/seed/BD003/400/400");
  insertProduct.run("BD004", "Inka Cola Personal 500ml", getCatId("BD"), 1.80, 2.50, 30, 10, "Botella", "Inka Cola", getSupId("Arca Continental"), "Gaseosa peruana", "https://picsum.photos/seed/BD004/400/400");
  insertProduct.run("BD005", "Bebida Energizante Red Bull 250ml", getCatId("BD"), 4.50, 6.50, 12, 4, "Lata", "Red Bull", getSupId("Nestlé Perú"), "Bebida energizante", "https://picsum.photos/seed/BD005/400/400");

  // Lácteos (LC)
  insertProduct.run("LC001", "Leche Gloria Etiqueta Azul 400g", getCatId("LC"), 3.20, 4.20, 48, 12, "Lata", "Gloria", getSupId("Gloria S.A."), "Leche evaporada", "https://picsum.photos/seed/LC001/400/400");
  insertProduct.run("LC002", "Yogurt Gloria Fresa 1kg", getCatId("LC"), 5.50, 7.50, 10, 3, "Botella", "Gloria", getSupId("Gloria S.A."), "Yogurt bebible", "https://picsum.photos/seed/LC002/400/400");
  insertProduct.run("LC003", "Queso Edam en Tajadas 250g", getCatId("LC"), 8.50, 11.50, 8, 2, "Paquete", "Laive", getSupId("Laive S.A."), "Queso edam tajado", "https://picsum.photos/seed/LC003/400/400");
  insertProduct.run("LC004", "Mantequilla con Sal 200g", getCatId("LC"), 4.20, 6.00, 15, 5, "Pote", "Laive", getSupId("Laive S.A."), "Mantequilla cremosa", "https://picsum.photos/seed/LC004/400/400");
  insertProduct.run("LC005", "Leche Ideal Amanecer 400g", getCatId("LC"), 3.00, 3.80, 24, 6, "Lata", "Nestlé", getSupId("Nestlé Perú"), "Leche evaporada económica", "https://picsum.photos/seed/LC005/400/400");

  // Snacks (SN)
  insertProduct.run("SN001", "Papas Lay's Clásicas 160g", getCatId("SN"), 4.50, 6.50, 20, 5, "Paquete", "Lay's", getSupId("PepsiCo"), "Papas fritas clásicas", "https://picsum.photos/seed/SN001/400/400");
  insertProduct.run("SN002", "Galletas Oreo Original (Paquete)", getCatId("SN"), 0.80, 1.50, 50, 10, "Paquete", "Oreo", getSupId("PepsiCo"), "Galletas de chocolate", "https://picsum.photos/seed/SN002/400/400");
  insertProduct.run("SN003", "Doritos Mega Crunch 150g", getCatId("SN"), 4.20, 6.00, 15, 5, "Paquete", "Doritos", getSupId("PepsiCo"), "Tortillas de maíz", "https://picsum.photos/seed/SN003/400/400");
  insertProduct.run("SN004", "Galletas Casino Menta 4 unidades", getCatId("SN"), 0.60, 1.00, 60, 15, "Paquete", "Casino", getSupId("Alicorp"), "Galletas rellenas", "https://picsum.photos/seed/SN004/400/400");
  insertProduct.run("SN005", "Chocolate Sublime Clásico 30g", getCatId("SN"), 1.20, 2.00, 40, 10, "Unidad", "Sublime", getSupId("Nestlé Perú"), "Chocolate con maní", "https://picsum.photos/seed/SN005/400/400");

  // Abarrotes (AB)
  insertProduct.run("AB001", "Arroz Costeño Extra 1kg", getCatId("AB"), 3.80, 4.80, 100, 20, "Kilo", "Costeño", getSupId("Costeño Alimentos"), "Arroz de grano largo", "https://picsum.photos/seed/AB001/400/400");
  insertProduct.run("AB002", "Azúcar Rubia Paramonga 1kg", getCatId("AB"), 3.20, 4.00, 80, 15, "Kilo", "Paramonga", getSupId("Alicorp"), "Azúcar rubia natural", "https://picsum.photos/seed/AB002/400/400");
  insertProduct.run("AB003", "Aceite Primor Premium 1L", getCatId("AB"), 7.50, 9.50, 30, 8, "Botella", "Primor", getSupId("Alicorp"), "Aceite vegetal", "https://picsum.photos/seed/AB003/400/400");
  insertProduct.run("AB004", "Fideos Don Vittorio Spaghetti 450g", getCatId("AB"), 2.20, 3.20, 40, 10, "Paquete", "Don Vittorio", getSupId("Alicorp"), "Fideos de sémola", "https://picsum.photos/seed/AB004/400/400");
  insertProduct.run("AB005", "Lentejas Costeño 500g", getCatId("AB"), 4.50, 6.00, 25, 5, "Paquete", "Costeño", getSupId("Costeño Alimentos"), "Menestra seleccionada", "https://picsum.photos/seed/AB005/400/400");

  // Limpieza (LM)
  insertProduct.run("LM001", "Detergente Ace Flores de Campo 1kg", getCatId("LM"), 8.50, 11.00, 20, 5, "Paquete", "Ace", getSupId("P&G"), "Detergente en polvo", "https://picsum.photos/seed/LM001/400/400");
  insertProduct.run("LM002", "Jabón Bolívar Glicerina 180g", getCatId("LM"), 2.20, 3.50, 30, 10, "Unidad", "Bolívar", getSupId("Alicorp"), "Jabón de lavar", "https://picsum.photos/seed/LM002/400/400");
  insertProduct.run("LM003", "Lavavajillas Ayudín Limón 400g", getCatId("LM"), 3.80, 5.50, 15, 5, "Pote", "Ayudín", getSupId("P&G"), "Lavavajillas en pasta", "https://picsum.photos/seed/LM003/400/400");
  insertProduct.run("LM004", "Papel Higiénico Elite 4 rollos", getCatId("LM"), 4.50, 6.50, 24, 6, "Paquete", "Elite", getSupId("Clorox"), "Papel higiénico suave", "https://picsum.photos/seed/LM004/400/400");
  insertProduct.run("LM005", "Limpiatodo Poett Bebé 900ml", getCatId("LM"), 4.20, 6.50, 12, 4, "Botella", "Poett", getSupId("Clorox"), "Limpiador multiusos", "https://picsum.photos/seed/LM005/400/400");

  // Panadería (PN)
  insertProduct.run("PN001", "Pan de Molde Blanco Grande", getCatId("PN"), 5.50, 7.80, 15, 3, "Paquete", "Bimbo", getSupId("Bimbo"), "Pan de molde blanco", "https://picsum.photos/seed/PN001/400/400");
  insertProduct.run("PN002", "Queque de Vainilla", getCatId("PN"), 3.50, 5.50, 10, 2, "Unidad", "Bimbo", getSupId("Bimbo"), "Queque esponjoso", "https://picsum.photos/seed/PN002/400/400");

  // Embutidos (EM)
  insertProduct.run("EM001", "Hot Dog de Pollo x 12", getCatId("EM"), 6.50, 9.50, 20, 5, "Paquete", "San Fernando", getSupId("San Fernando"), "Hot dog de pollo", "https://picsum.photos/seed/EM001/400/400");
  insertProduct.run("EM002", "Jamón del País 250g", getCatId("EM"), 8.50, 12.00, 10, 2, "Paquete", "San Fernando", getSupId("San Fernando"), "Jamón artesanal", "https://picsum.photos/seed/EM002/400/400");

  // Frutas y Verduras (FV)
  insertProduct.run("FV001", "Manzana Israel x 1kg", getCatId("FV"), 2.50, 4.50, 30, 5, "Kilo", "Genérica", getSupId("Costeño Alimentos"), "Manzana fresca", "https://picsum.photos/seed/FV001/400/400");
  insertProduct.run("FV002", "Plátano de Seda x 1kg", getCatId("FV"), 1.80, 3.50, 40, 10, "Kilo", "Genérica", getSupId("Costeño Alimentos"), "Plátano maduro", "https://picsum.photos/seed/FV002/400/400");

  // Cuidado Personal (CP)
  insertProduct.run("CP001", "Shampoo Head & Shoulders 375ml", getCatId("CP"), 12.50, 16.50, 15, 3, "Botella", "H&S", getSupId("P&G"), "Shampoo anticaspa", "https://picsum.photos/seed/CP001/400/400");
  insertProduct.run("CP002", "Desodorante Rexona Men 150ml", getCatId("CP"), 9.50, 13.50, 20, 5, "Unidad", "Rexona", getSupId("Kimberly-Clark"), "Desodorante aerosol", "https://picsum.photos/seed/CP002/400/400");

  // Mascotas (MS)
  insertProduct.run("MS001", "Ricocan Adulto Carne 1kg", getCatId("MS"), 8.50, 11.50, 25, 5, "Bolsa", "Ricocan", getSupId("Mars"), "Comida para perros", "https://picsum.photos/seed/MS001/400/400");
  insertProduct.run("MS002", "Ricocat Fresa 1kg", getCatId("MS"), 9.50, 12.50, 20, 5, "Bolsa", "Ricocat", getSupId("Mars"), "Comida para gatos", "https://picsum.photos/seed/MS002/400/400");

  // Licores (LI)
  insertProduct.run("LI001", "Pisco Portón Mosto Verde 750ml", getCatId("LI"), 45.00, 65.00, 10, 2, "Botella", "Portón", getSupId("Pernod Ricard"), "Pisco premium", "https://picsum.photos/seed/LI001/400/400");
  insertProduct.run("LI002", "Cerveza Pilsen Callao 630ml", getCatId("LI"), 4.50, 6.50, 60, 12, "Botella", "Pilsen", getSupId("Backus"), "Cerveza nacional", "https://picsum.photos/seed/LI002/400/400");

  // Congelados (CG)
  insertProduct.run("CG001", "Nuggets de Pollo San Fernando 500g", getCatId("CG"), 12.50, 16.50, 15, 3, "Paquete", "San Fernando", getSupId("San Fernando"), "Nuggets crocantes", "https://picsum.photos/seed/CG001/400/400");
  insertProduct.run("CG002", "Helado D'Onofrio Triángulo 1L", getCatId("CG"), 15.00, 22.00, 8, 2, "Pote", "D'Onofrio", getSupId("Nestlé Perú"), "Helado de crema", "https://picsum.photos/seed/CG002/400/400");

  // Desayunos y Cereales (DC)
  insertProduct.run("DC001", "Cereal Angel Flakes 500g", getCatId("DC"), 8.50, 12.50, 20, 5, "Caja", "Angel", getSupId("Kellogg's"), "Hojuelas de maíz", "https://picsum.photos/seed/DC001/400/400");
  insertProduct.run("DC002", "Avena 3 Ositos 400g", getCatId("DC"), 3.50, 5.50, 30, 10, "Paquete", "3 Ositos", getSupId("Alicorp"), "Avena precocida", "https://picsum.photos/seed/DC002/400/400");

  // Bebés (BB)
  insertProduct.run("BB001", "Pañales Huggies G x 30", getCatId("BB"), 25.00, 35.00, 12, 3, "Paquete", "Huggies", getSupId("Kimberly-Clark"), "Pañales desechables", "https://picsum.photos/seed/BB001/400/400");
  insertProduct.run("BB002", "Toallitas Húmedas Johnson's x 50", getCatId("BB"), 6.50, 9.50, 25, 5, "Paquete", "Johnson's", getSupId("Johnson & Johnson"), "Limpieza para bebé", "https://picsum.photos/seed/BB002/400/400");

  // Ferretería y Hogar (FH)
  insertProduct.run("FH001", "Foco LED 9W Luz Blanca", getCatId("FH"), 4.50, 7.50, 40, 10, "Unidad", "Philips", getSupId("Sodimac"), "Foco ahorrador", "https://picsum.photos/seed/FH001/400/400");
  insertProduct.run("FH002", "Pilas Duracell AA x 4", getCatId("FH"), 12.50, 18.50, 20, 5, "Paquete", "Duracell", getSupId("Sodimac"), "Pilas alcalinas", "https://picsum.photos/seed/FH002/400/400");

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, { cors: { origin: "*" } });
  
  const PORT = 3000;
  const HOST = "0.0.0.0";

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  io.on('connection', (socket) => {
    console.log('A user connected');
    socket.on('disconnect', () => {
      console.log('User disconnected');
    });
  });

  // Middleware to emit data_changed on successful mutations
  app.use((req, res, next) => {
    const originalJson = res.json;
    res.json = function (body) {
      if (['POST', 'PUT', 'DELETE'].includes(req.method) && res.statusCode >= 200 && res.statusCode < 300) {
        io.emit('data_changed');
      }
      return originalJson.call(this, body);
    };
    next();
  });

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // APIPeru Proxy Routes
  app.get("/api/backup/all", (req, res) => {
    try {
      const products = db.prepare('SELECT * FROM products').all();
      const categories = db.prepare('SELECT * FROM categories').all();
      const suppliers = db.prepare('SELECT * FROM suppliers').all();
      const customers = db.prepare('SELECT * FROM customers').all();
      const sales = db.prepare('SELECT * FROM sales').all();
      const sale_items = db.prepare('SELECT * FROM sale_items').all();
      const product_items = db.prepare('SELECT * FROM product_items').all();

      res.json({
        products,
        categories,
        suppliers,
        customers,
        sales,
        sale_items,
        product_items
      });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.post("/api/import", (req, res) => {
    const { categories, suppliers, customers, products, sales, sale_items, product_items } = req.body;
    
    try {
      const transaction = db.transaction(() => {
        // Clear existing data in correct order to respect foreign keys
        db.prepare("DELETE FROM sale_items").run();
        db.prepare("DELETE FROM sales").run();
        db.prepare("DELETE FROM product_items").run();
        db.prepare("DELETE FROM products").run();
        db.prepare("DELETE FROM customers").run();
        db.prepare("DELETE FROM suppliers").run();
        db.prepare("DELETE FROM categories").run();

        // Import Categories
        if (Array.isArray(categories)) {
          const insert = db.prepare("INSERT INTO categories (id, name, prefix) VALUES (?, ?, ?)");
          for (const item of categories) {
            insert.run(item.id, item.name, item.prefix);
          }
        }

        // Import Suppliers
        if (Array.isArray(suppliers)) {
          const insert = db.prepare(`
            INSERT INTO suppliers (id, name, company, tax_id, phone, email, address, city, country, contact_person, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);
          for (const item of suppliers) {
            insert.run(item.id, item.name, item.company, item.tax_id, item.phone, item.email, item.address, item.city, item.country, item.contact_person, item.notes);
          }
        }

        // Import Customers
        if (Array.isArray(customers)) {
          const insert = db.prepare(`
            INSERT INTO customers (id, first_name, last_name, dni, phone, email, address)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `);
          for (const item of customers) {
            insert.run(item.id, item.first_name, item.last_name, item.dni, item.phone, item.email, item.address);
          }
        }

        // Import Products
        if (Array.isArray(products)) {
          const insert = db.prepare(`
            INSERT INTO products (id, code, name, category_id, purchase_price, sale_price, stock, min_stock, unit, brand, supplier_id, description, image, has_serials, parent_id, units_per_package)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);
          for (const item of products) {
            insert.run(
              item.id, item.code, item.name, item.category_id, item.purchase_price, item.sale_price, 
              item.stock, item.min_stock, item.unit, item.brand, item.supplier_id, 
              item.description, item.image || null, item.has_serials || 0, item.parent_id || null, item.units_per_package || 1
            );
          }
        }

        // Import Sales
        if (Array.isArray(sales)) {
          const insertSale = db.prepare(`
            INSERT INTO sales (id, customer_id, total, subtotal, tax, payment_method, warranty, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `);
          for (const item of sales) {
            insertSale.run(item.id, item.customer_id, item.total, item.subtotal, item.tax, item.payment_method, item.warranty, item.created_at);
          }
        }

        // Import Sale Items
        if (Array.isArray(sale_items)) {
          const insert = db.prepare("INSERT INTO sale_items (id, sale_id, product_id, quantity, price) VALUES (?, ?, ?, ?, ?)");
          for (const item of sale_items) {
            insert.run(item.id, item.sale_id, item.product_id, item.quantity, item.price);
          }
        }

        // Import Product Items (Serials)
        if (Array.isArray(product_items)) {
          const insert = db.prepare("INSERT INTO product_items (id, product_id, serial_number, status, sale_id, created_at) VALUES (?, ?, ?, ?, ?, ?)");
          for (const item of product_items) {
            insert.run(item.id, item.product_id, item.serial_number, item.status, item.sale_id, item.created_at);
          }
        }
      });

      transaction();
      io.emit('data_changed');
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error during import:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/settings", (req, res) => {
    try {
      const settings = db.prepare("SELECT * FROM settings").all();
      const settingsObj = settings.reduce((acc: any, curr: any) => {
        acc[curr.key] = curr.value;
        return acc;
      }, {});

      // Add voucher count to settings for demo tracking
      const voucherCount = db.prepare("SELECT COUNT(*) as count FROM sales").get() as { count: number };
      settingsObj.voucher_count = voucherCount.count;

      res.json(settingsObj);
    } catch (error) {
      console.error("Error fetching settings:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.get("/api/dashboard/stats", (req, res) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Basic stats
      const dailySales = db.prepare("SELECT SUM(total) as total FROM sales WHERE date(created_at) = ?").get(today) as any;
      const weeklySales = db.prepare("SELECT SUM(total) as total FROM sales WHERE created_at >= date('now', '-7 days')").get() as any;
      const monthlySales = db.prepare("SELECT SUM(total) as total FROM sales WHERE created_at >= date('now', 'start of month')").get() as any;
      const lowStock = db.prepare(`
        SELECT COUNT(*) as count 
        FROM (
          SELECT p.id, 
          CASE WHEN p.has_serials = 1 
            THEN (SELECT COUNT(*) FROM product_items WHERE product_id = p.id AND status = 'available') 
            ELSE p.stock 
          END as current_stock, 
          p.min_stock 
          FROM products p
        ) 
        WHERE current_stock <= min_stock
      `).get() as any;
      const totalProducts = db.prepare("SELECT COUNT(*) as count FROM products").get() as any;

      // Sales Trend (Last 7 days)
      const salesTrend = db.prepare(`
        SELECT date(created_at) as date, SUM(total) as sales 
        FROM sales 
        WHERE created_at >= date('now', '-7 days') 
        GROUP BY date(created_at) 
        ORDER BY date(created_at) ASC
      `).all();

      // Sales by Category (Last 90 days)
      const salesByCategory = db.prepare(`
        SELECT 
          COALESCE(c.name, 'Sin Categoría') as name, 
          SUM(si.subtotal) as value
        FROM sale_items si
        LEFT JOIN products p ON si.product_id = p.id
        LEFT JOIN categories c ON p.category_id = c.id
        JOIN sales s ON si.sale_id = s.id
        WHERE s.created_at >= date('now', '-90 days')
        GROUP BY COALESCE(c.name, 'Sin Categoría')
        ORDER BY value DESC
        LIMIT 10
      `).all();

      // Recent Sales
      const recentSales = db.prepare(`
        SELECT s.id, s.total, s.created_at, s.payment_method, c.first_name, c.last_name
        FROM sales s
        LEFT JOIN customers c ON s.customer_id = c.id
        ORDER BY s.created_at DESC
        LIMIT 5
      `).all();

      // Low Stock Products
      const lowStockProducts = db.prepare(`
        SELECT * FROM (
          SELECT id, name, min_stock,
          CASE WHEN has_serials = 1 
            THEN (SELECT COUNT(*) FROM product_items WHERE product_id = p.id AND status = 'available') 
            ELSE stock 
          END as current_stock
          FROM products p
        )
        WHERE current_stock <= min_stock 
        ORDER BY current_stock ASC 
        LIMIT 5
      `).all().map((p: any) => ({ ...p, stock: p.current_stock }));

      const stats = {
        dailySales,
        weeklySales,
        monthlySales,
        lowStock,
        totalProducts,
        salesTrend,
        salesByCategory,
        recentSales,
        lowStockProducts,
        cashBalance: db.prepare("SELECT SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END) as balance FROM cash_flow").get() as any
      };
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Cash Flow Routes
  app.get("/api/cash-flow", (req, res) => {
    try {
      const transactions = db.prepare("SELECT * FROM cash_flow ORDER BY created_at DESC").all();
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.post("/api/cash-flow", (req, res) => {
    const { type, amount, description } = req.body;
    try {
      db.prepare(`
        INSERT INTO cash_flow (type, amount, description, source_type)
        VALUES (?, ?, ?, 'manual')
      `).run(type, amount, description);
      io.emit('data_changed');
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.delete("/api/cash-flow/:id", (req, res) => {
    try {
      db.prepare("DELETE FROM cash_flow WHERE id = ?").run(req.params.id);
      io.emit('data_changed');
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.get("/api/reports/earnings", (req, res) => {
    try {
      const { range } = req.query;
      let dateFilter = "";
      
      if (range === 'today') {
        dateFilter = "WHERE date(s.created_at) = date('now')";
      } else if (range === 'week') {
        dateFilter = "WHERE s.created_at >= date('now', '-7 days')";
      } else if (range === 'month') {
        dateFilter = "WHERE s.created_at >= date('now', 'start of month')";
      }

      const earnings = db.prepare(`
        SELECT 
          SUM(s.total) as income,
          SUM(si.quantity * p.purchase_price) as cost
        FROM sales s
        JOIN sale_items si ON s.id = si.sale_id
        JOIN products p ON si.product_id = p.id
        ${dateFilter}
      `).get() as any;

      res.json({
        income: earnings.income || 0,
        cost: earnings.cost || 0,
        profit: (earnings.income || 0) - (earnings.cost || 0)
      });
    } catch (error) {
      console.error("Error fetching earnings report:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.get("/api/categories", (req, res) => {
    const categories = db.prepare("SELECT * FROM categories").all();
    res.json(categories);
  });

  app.post("/api/categories", (req, res) => {
    const { name, prefix, description } = req.body;
    const info = db.prepare("INSERT INTO categories (name, prefix, description) VALUES (?, ?, ?)").run(name, prefix, description);
    io.emit('data_changed');
    res.json({ id: info.lastInsertRowid });
  });

  app.get("/api/products", (req, res) => {
    const products = db.prepare(`
      SELECT p.*, c.name as category_name,
      (SELECT COUNT(*) FROM product_items WHERE product_id = p.id AND status = 'available') as dynamic_stock
      FROM products p 
      LEFT JOIN categories c ON p.category_id = c.id
    `).all() as any[];
    
    // Create a map for quick parent lookup
    const productMap = new Map(products.map(p => [p.id, p]));

    // Process products to handle serials
    const processedProducts = products.map(p => {
      let stock = p.has_serials ? p.dynamic_stock : p.stock;
      let status = p.status;

      return {
        ...p,
        stock,
        status
      };
    });
    
    res.json(processedProducts);
  });

  app.get("/api/products/:id/items", (req, res) => {
    const items = db.prepare("SELECT * FROM product_items WHERE product_id = ?").all(req.params.id);
    res.json(items);
  });

  app.post("/api/products", (req, res) => {
    const { name, category_id, purchase_price, sale_price, stock, min_stock, unit, brand, supplier_id, image, has_serials, serial_numbers } = req.body;
    
    // Generate code
    const category = db.prepare("SELECT prefix FROM categories WHERE id = ?").get(category_id) as any;
    const prefix = category ? category.prefix : "PR";
    
    const lastProduct = db.prepare("SELECT code FROM products WHERE code LIKE ? ORDER BY code DESC LIMIT 1").get(`${prefix}%`) as any;
    let nextNum = 1;
    if (lastProduct && lastProduct.code) {
      const numericPart = lastProduct.code.substring(prefix.length);
      const lastNum = parseInt(numericPart);
      if (!isNaN(lastNum)) {
        nextNum = lastNum + 1;
      }
    }
    const code = `${prefix}${nextNum.toString().padStart(3, '0')}`;

    const transaction = db.transaction(() => {
      // Check for duplicate serials globally
      if (has_serials && Array.isArray(serial_numbers)) {
        const checkSerial = db.prepare("SELECT serial_number FROM product_items WHERE serial_number = ?");
        for (const sn of serial_numbers) {
          if (sn && sn.trim()) {
            const existing = checkSerial.get(sn.trim());
            if (existing) {
              throw new Error(`El número de serie '${sn.trim()}' ya está registrado en el sistema.`);
            }
          }
        }
      }

      const info = db.prepare(`
        INSERT INTO products (code, name, category_id, purchase_price, sale_price, stock, min_stock, unit, brand, supplier_id, image, has_serials)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(code, name, category_id, purchase_price, sale_price, has_serials ? 0 : stock, min_stock, unit, brand, supplier_id, image, has_serials ? 1 : 0);
      
      const productId = info.lastInsertRowid;

      if (has_serials && Array.isArray(serial_numbers)) {
        const insertItem = db.prepare("INSERT INTO product_items (product_id, serial_number) VALUES (?, ?)");
        for (const sn of serial_numbers) {
          if (sn && sn.trim()) {
            insertItem.run(productId, sn.trim());
          }
        }
      }
      
      return { id: productId, code };
    });

    try {
      const result = transaction();
      io.emit('data_changed');
      res.json(result);
    } catch (error: any) {
      console.error("Error creating product:", error);
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/products/by-serial/:serial", (req, res) => {
    const item = db.prepare(`
      SELECT p.*, c.name as category_name,
      (SELECT COUNT(*) FROM product_items WHERE product_id = p.id AND status = 'available') as dynamic_stock
      FROM product_items pi
      JOIN products p ON pi.product_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE pi.serial_number = ? AND pi.status = 'available'
    `).get(req.params.serial) as any;
    
    if (!item) return res.status(404).json({ error: "Número de serie no encontrado o ya vendido" });
    
    // Process stock same as /api/products
    const stock = item.has_serials ? item.dynamic_stock : item.stock;
    res.json({ ...item, stock });
  });

  app.get("/api/sales", (req, res) => {
    const sales = db.prepare(`
      SELECT s.*, c.first_name, c.last_name 
      FROM sales s 
      LEFT JOIN customers c ON s.customer_id = c.id
      ORDER BY s.created_at DESC
    `).all();
    res.json(sales);
  });

  app.get("/api/sales/:id", (req, res) => {
    const sale = db.prepare(`
      SELECT s.*, c.first_name, c.last_name 
      FROM sales s 
      LEFT JOIN customers c ON s.customer_id = c.id
      WHERE s.id = ?
    `).get(req.params.id);
    
    if (!sale) return res.status(404).json({ error: "Sale not found" });
    
    const items = db.prepare(`
      SELECT si.*, COALESCE(p.name, si.custom_name) as product_name, p.code as product_code
      FROM sale_items si
      LEFT JOIN products p ON si.product_id = p.id
      WHERE si.sale_id = ?
    `).all(req.params.id);
    
    res.json({ ...sale, items });
  });

  app.get("/api/quotations", (req, res) => {
    const quotations = db.prepare(`
      SELECT q.*, c.first_name, c.last_name 
      FROM quotations q 
      LEFT JOIN customers c ON q.customer_id = c.id
      ORDER BY q.created_at DESC
    `).all();
    res.json(quotations);
  });

  app.get("/api/quotations/:id", (req, res) => {
    const quotation = db.prepare(`
      SELECT q.*, c.first_name, c.last_name 
      FROM quotations q 
      LEFT JOIN customers c ON q.customer_id = c.id
      WHERE q.id = ?
    `).get(req.params.id);
    
    if (!quotation) return res.status(404).json({ error: "Quotation not found" });
    
    const items = db.prepare(`
      SELECT qi.*, p.name as product_name, p.code as product_code
      FROM quotation_items qi
      JOIN products p ON qi.product_id = p.id
      WHERE qi.quotation_id = ?
    `).all(req.params.id);
    
    res.json({ ...quotation, items });
  });

  app.post("/api/quotations", (req, res) => {
    const { customer_id, items, total, subtotal, tax } = req.body;
    
    const transaction = db.transaction(() => {
      const quotationInfo = db.prepare(`
        INSERT INTO quotations (customer_id, total, subtotal, tax)
        VALUES (?, ?, ?, ?)
      `).run(customer_id, total, subtotal, tax);
      
      const quotationId = quotationInfo.lastInsertRowid;
      
      for (const item of items) {
        db.prepare(`
          INSERT INTO quotation_items (quotation_id, product_id, quantity, price, subtotal)
          VALUES (?, ?, ?, ?, ?)
        `).run(quotationId, item.id, item.quantity, item.price, item.quantity * item.price);
      }
      
      return quotationId;
    });

    const quotationId = transaction();
    io.emit('data_changed');
    res.json({ id: quotationId });
  });

  app.post("/api/sales", (req, res) => {
    const { customer_id, items, total, subtotal, tax, payment_method, warranty } = req.body;
    
    const transaction = db.transaction(() => {
      const saleInfo = db.prepare(`
        INSERT INTO sales (customer_id, total, subtotal, tax, payment_method, warranty)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(customer_id, total, subtotal, tax, payment_method, warranty);
      
      const saleId = saleInfo.lastInsertRowid;
      
      for (const item of items) {
        db.prepare(`
          INSERT INTO sale_items (sale_id, product_id, quantity, price, subtotal, serial_numbers, custom_name)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(saleId, item.id, item.quantity, item.price, item.quantity * item.price, JSON.stringify(item.serial_numbers || []), item.name);
        
        if (item.id !== null && item.id !== undefined) {
          const product = db.prepare("SELECT has_serials FROM products WHERE id = ?").get(item.id) as any;
          
          if (product && product.has_serials) {
            // Delete specific items as they are sold and should not be kept in product_items
            if (Array.isArray(item.serial_numbers) && item.serial_numbers.length > 0) {
              const placeholders = item.serial_numbers.map(() => '?').join(',');
              db.prepare(`DELETE FROM product_items WHERE product_id = ? AND serial_number IN (${placeholders})`)
                .run(item.id, ...item.serial_numbers);
            } else {
              // Fallback: delete any available items if no specific serials provided
              const availableItems = db.prepare("SELECT id FROM product_items WHERE product_id = ? AND status = 'available' LIMIT ?")
                .all(item.id, item.quantity) as any[];
              
              if (availableItems.length < item.quantity) {
                throw new Error(`Stock insuficiente para el producto con series: ${item.id}`);
              }

              const deleteItem = db.prepare("DELETE FROM product_items WHERE id = ?");
              for (const pi of availableItems) {
                deleteItem.run(pi.id);
              }
            }
          } else {
            db.prepare("UPDATE products SET stock = stock - ? WHERE id = ?").run(item.quantity, item.id);
          }
        }
      }
      
      // Record Cash Flow if payment method includes cash
      try {
        const payments = JSON.parse(payment_method);
        if (Array.isArray(payments)) {
          const cashPayment = payments.find((p: any) => p.method === 'cash');
          if (cashPayment && cashPayment.amount > 0) {
            db.prepare(`
              INSERT INTO cash_flow (type, amount, description, source_type, source_id)
              VALUES ('income', ?, ?, 'sale', ?)
            `).run(cashPayment.amount, `Venta #${saleId}`, saleId);
          }
        }
      } catch (e) {
        // Not a JSON array, handle as legacy string
        if (payment_method === 'cash') {
          db.prepare(`
            INSERT INTO cash_flow (type, amount, description, source_type, source_id)
            VALUES ('income', ?, ?, 'sale', ?)
          `).run(total, `Venta #${saleId}`, saleId);
        }
      }
      
      return saleId;
    });

    try {
      const saleId = transaction();
      io.emit('data_changed');
      res.json({ id: saleId });
    } catch (error: any) {
      console.error("Error processing sale:", error);
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/activate-demo", (req, res) => {
    try {
      const now = new Date().toISOString();
      db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run("installation_date", now);
      db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run("activation_status", "demo");
      io.emit('data_changed');
      res.json({ success: true, installation_date: now });
    } catch (error) {
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.post("/api/auth/login", (req, res) => {
    const { email, password } = req.body;
    
    // Hardcoded admin
    if (email === 'admin@psg.la' && password === '1475369') {
      return res.json({ 
        success: true, 
        user: { email: 'admin@psg.la', name: 'PSG Admin', role: 'DESARROLLADOR' } 
      });
    }

    // Hardcoded demo account
    if (email === 'demo' && password === 'demo') {
      const settings = db.prepare("SELECT * FROM settings").all();
      const settingsObj = settings.reduce((acc: any, curr: any) => {
        acc[curr.key] = curr.value;
        return acc;
      }, {});

      let changesMade = false;

      // 1. Independent Demo Start Date
      if (!settingsObj.demo_start_date) {
        const now = new Date().toISOString();
        db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run("demo_start_date", now);
        changesMade = true;
      }

      // 2. Fallback Installation Date if missing
      if (!settingsObj.installation_date) {
        const now = new Date().toISOString();
        db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run("installation_date", now);
        changesMade = true;
      }

      // 3. Global activation status (only if not already set to something)
      if (!settingsObj.activation_status) {
        db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run("activation_status", "demo");
        changesMade = true;
      }

      if (changesMade) {
        io.emit('data_changed');
      }
      
      return res.json({
        success: true,
        user: { email: 'demo', name: 'Usuario Demo', role: 'ESTANDARD' }
      });
    }

    const user = db.prepare("SELECT * FROM users WHERE email = ? AND password = ?").get(email, password) as any;
    if (user) {
      res.json({ 
        success: true, 
        user: { email: user.email, name: user.name, role: user.role } 
      });
    } else {
      res.status(401).json({ success: false, message: "Credenciales incorrectas" });
    }
  });

  app.post("/api/auth/register", (req, res) => {
    const { email, password, name } = req.body;
    
    const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number };
    
    // Only allow 1 user to be created initially if not admin
    if (userCount.count >= 1) {
      return res.status(400).json({ success: false, message: "Ya existe un usuario registrado. Solo el administrador puede crear más." });
    }

    try {
      db.prepare("INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)").run(email, password, name, 'ESTANDARD');
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false, message: "Error al registrar usuario" });
    }
  });

  app.get("/api/users", (req, res) => {
    const users = db.prepare("SELECT id, email, name, role, created_at FROM users").all();
    res.json(users);
  });

  app.post("/api/users", (req, res) => {
    const { email, password, name, role } = req.body;
    
    const currentCount = db.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number };
    const unlimitedUsers = db.prepare("SELECT value FROM settings WHERE key = 'unlimited_users'").get() as { value: string };
    
    if (unlimitedUsers?.value !== '1' && currentCount.count >= 5) {
      return res.status(400).json({ success: false, message: "Límite de 5 usuarios alcanzado. Contacte al desarrollador para ampliar el límite." });
    }

    if (role === 'DESARROLLADOR') {
      return res.status(400).json({ success: false, message: "No se pueden crear más usuarios Desarrollador" });
    }

    try {
      db.prepare("INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)").run(email, password, name, role || 'ESTANDARD');
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false, message: "Error al crear usuario" });
    }
  });

  app.put("/api/users/:id", (req, res) => {
    const { id } = req.params;
    const { email, password, name, role } = req.body;

    const targetUser = db.prepare("SELECT email FROM users WHERE id = ?").get(id) as any;
    if (targetUser && targetUser.email === 'admin@psg.la') {
      return res.status(400).json({ success: false, message: "No se puede modificar el usuario Desarrollador principal" });
    }

    if (role === 'DESARROLLADOR') {
      return res.status(400).json({ success: false, message: "No se puede asignar el rol Desarrollador" });
    }

    try {
      if (password) {
        db.prepare("UPDATE users SET email = ?, password = ?, name = ?, role = ? WHERE id = ?").run(email, password, name, role, id);
      } else {
        db.prepare("UPDATE users SET email = ?, name = ?, role = ? WHERE id = ?").run(email, name, role, id);
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false, message: "Error al actualizar usuario" });
    }
  });

  app.delete("/api/users/:id", (req, res) => {
    const { id } = req.params;

    const targetUser = db.prepare("SELECT email FROM users WHERE id = ?").get(id) as any;
    if (targetUser && targetUser.email === 'admin@psg.la') {
      return res.status(400).json({ success: false, message: "No se puede eliminar el usuario Desarrollador principal" });
    }

    try {
      db.prepare("DELETE FROM users WHERE id = ?").run(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false, message: "Error al eliminar usuario" });
    }
  });

  app.post("/api/activate", (req, res) => {
    const { code } = req.body;
    // Hardcoded activation code for the user: NEXUS-POS-2024-PRO
    if (code === "NEXUS-POS-2024-PRO") {
      db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run("activation_status", "activated");
      res.json({ success: true, message: "Sistema activado correctamente" });
    } else {
      res.status(400).json({ success: false, message: "Código de activación inválido" });
    }
  });

  app.post("/api/license/activate", (req, res) => {
    const { type, durationMonths } = req.body;
    // durationMonths: 3, 6, 12, 0 (infinite), -1 (7 days demo)
    
    let expiryDate = "";
    let licenseType = "";

    if (type === 'infinite') {
      expiryDate = "9999-12-31";
      licenseType = "infinite";
    } else if (type === 'demo_7') {
      const date = new Date();
      date.setDate(date.getDate() + 7);
      expiryDate = date.toISOString();
      licenseType = "demo_7";
    } else {
      const date = new Date();
      date.setMonth(date.getMonth() + durationMonths);
      expiryDate = date.toISOString();
      licenseType = `${durationMonths}_months`;
    }

    const transaction = db.transaction(() => {
      db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run("activation_status", "activated");
      db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run("license_expiry", expiryDate);
      db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run("license_type", licenseType);
      
      if (type === 'infinite') {
        db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run("unlimited_users", "1");
      }
    });
    
    transaction();
    res.json({ success: true, expiryDate, licenseType });
  });

  app.post("/api/license/reset", (req, res) => {
    try {
      const transaction = db.transaction(() => {
        db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run("activation_status", "demo");
        db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run("license_type", "demo");
        db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run("license_expiry", "");
        db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run("installation_date", "");
        db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run("demo_start_date", "");
        db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run("unlimited_users", "0");
      });
      transaction();
      io.emit('data_changed');
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false, message: (error as Error).message });
    }
  });

  app.post("/api/demo/reset", (req, res) => {
    try {
      db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run("demo_start_date", "");
      io.emit('data_changed');
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false, message: (error as Error).message });
    }
  });

  app.post("/api/settings", (req, res) => {
    const updates = req.body;
    const updateStmt = db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)");
    const transaction = db.transaction(() => {
      const currentLicense = db.prepare("SELECT value FROM settings WHERE key = 'license_type'").get() as { value: string };
      const isInfinite = currentLicense?.value === 'infinite';

      for (const [key, value] of Object.entries(updates)) {
        // Protect critical settings from being modified via regular settings update
        if (key === 'installation_date' || key === 'activation_status') {
          continue;
        }
        // Protect unlimited_users if license is infinite
        if (key === 'unlimited_users' && isInfinite) {
          continue;
        }
        updateStmt.run(key, String(value));
      }
    });
    transaction();
    io.emit('data_changed');
    res.json({ success: true });
  });

  app.put("/api/products/:id", (req, res) => {
    const { id } = req.params;
    const { name, category_id, purchase_price, sale_price, stock, min_stock, unit, brand, supplier_id, image, has_serials, serial_numbers } = req.body;
    
    // Check if category changed to regenerate code
    const currentProduct = db.prepare("SELECT category_id, code FROM products WHERE id = ?").get(id) as any;
    let code = currentProduct.code;

    if (currentProduct.category_id !== category_id) {
      const category = db.prepare("SELECT prefix FROM categories WHERE id = ?").get(category_id) as any;
      const prefix = category ? category.prefix : "PR";
      const lastProduct = db.prepare("SELECT code FROM products WHERE code LIKE ? ORDER BY code DESC LIMIT 1").get(`${prefix}%`) as any;
      let nextNum = 1;
      if (lastProduct && lastProduct.code) {
        const numericPart = lastProduct.code.substring(prefix.length);
        const lastNum = parseInt(numericPart);
        if (!isNaN(lastNum)) nextNum = lastNum + 1;
      }
      code = `${prefix}${nextNum.toString().padStart(3, '0')}`;
    }

    const transaction = db.transaction(() => {
      // Check for duplicate serials globally (excluding this product's current serials)
      if (has_serials && Array.isArray(serial_numbers)) {
        const checkSerial = db.prepare("SELECT product_id FROM product_items WHERE serial_number = ?");
        for (const sn of serial_numbers) {
          if (sn && sn.trim()) {
            const existing = checkSerial.get(sn.trim()) as any;
            if (existing && existing.product_id !== parseInt(id)) {
              throw new Error(`El número de serie '${sn.trim()}' ya está registrado en otro producto.`);
            }
          }
        }
      }

      db.prepare(`
        UPDATE products 
        SET name = ?, category_id = ?, purchase_price = ?, sale_price = ?, stock = ?, min_stock = ?, unit = ?, brand = ?, supplier_id = ?, image = ?, code = ?, has_serials = ?
        WHERE id = ?
      `).run(name, category_id, purchase_price, sale_price, has_serials ? 0 : stock, min_stock, unit, brand, supplier_id, image, code, has_serials ? 1 : 0, id);

      if (has_serials && Array.isArray(serial_numbers)) {
        const currentItems = db.prepare("SELECT serial_number FROM product_items WHERE product_id = ?").all(id) as any[];
        const currentSerials = currentItems.map(i => i.serial_number);
        
        const newSerials = serial_numbers.map(s => s.trim()).filter(s => s !== "");
        
        // Serials to delete (those in DB but not in new list)
        const toDelete = currentSerials.filter(s => !newSerials.includes(s));
        if (toDelete.length > 0) {
          const placeholders = toDelete.map(() => '?').join(',');
          db.prepare(`DELETE FROM product_items WHERE product_id = ? AND serial_number IN (${placeholders})`).run(id, ...toDelete);
        }
        
        // Serials to add (those in new list but not in DB)
        const toAdd = newSerials.filter(s => !currentSerials.includes(s));
        const insertItem = db.prepare("INSERT INTO product_items (product_id, serial_number) VALUES (?, ?)");
        for (const sn of toAdd) {
          insertItem.run(id, sn);
        }
      } else if (!has_serials) {
        // If has_serials was turned off, delete all items
        db.prepare("DELETE FROM product_items WHERE product_id = ?").run(id);
      }
    });

    try {
      transaction();
      io.emit('data_changed');
      res.json({ success: true, code });
    } catch (error: any) {
      console.error("Error updating product:", error);
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/products/:id", (req, res) => {
    try {
      db.prepare("DELETE FROM products WHERE id = ?").run(req.params.id);
      io.emit('data_changed');
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting product:", error);
      if (error.code === 'SQLITE_CONSTRAINT') {
        res.status(400).json({ 
          success: false, 
          error: "No se puede eliminar el producto porque tiene registros asociados (ventas o cotizaciones)." 
        });
      } else {
        res.status(500).json({ success: false, error: "Error interno del servidor" });
      }
    }
  });

  app.get("/api/suppliers", (req, res) => {
    const suppliers = db.prepare("SELECT * FROM suppliers").all();
    res.json(suppliers);
  });

  app.post("/api/suppliers", (req, res) => {
    const { name, company, tax_id, phone, email, address, city, country, contact_person, notes } = req.body;
    const info = db.prepare(`
      INSERT INTO suppliers (name, company, tax_id, phone, email, address, city, country, contact_person, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(name, company, tax_id, phone, email, address, city, country, contact_person, notes);
    res.json({ id: info.lastInsertRowid });
  });

  app.put("/api/suppliers/:id", (req, res) => {
    const { id } = req.params;
    const { name, company, tax_id, phone, email, address, city, country, contact_person, notes } = req.body;
    db.prepare(`
      UPDATE suppliers 
      SET name = ?, company = ?, tax_id = ?, phone = ?, email = ?, address = ?, city = ?, country = ?, contact_person = ?, notes = ?
      WHERE id = ?
    `).run(name, company, tax_id, phone, email, address, city, country, contact_person, notes, id);
    res.json({ success: true });
  });

  app.get("/api/customers", (req, res) => {
    const customers = db.prepare("SELECT * FROM customers").all();
    res.json(customers);
  });

  app.post("/api/customers", (req, res) => {
    const { first_name, last_name, dni, phone, email, address } = req.body;
    try {
      const info = db.prepare(`
        INSERT INTO customers (first_name, last_name, dni, phone, email, address)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(first_name, last_name, dni, phone, email, address);
      io.emit('data_changed');
      res.json({ id: info.lastInsertRowid });
    } catch (error: any) {
      if (error.code === 'SQLITE_CONSTRAINT') {
        res.status(400).json({ error: "El DNI ya está registrado" });
      } else {
        res.status(500).json({ error: "Error al crear cliente" });
      }
    }
  });

  app.put("/api/customers/:id", (req, res) => {
    const { id } = req.params;
    const { first_name, last_name, dni, phone, email, address } = req.body;
    try {
      db.prepare(`
        UPDATE customers 
        SET first_name = ?, last_name = ?, dni = ?, phone = ?, email = ?, address = ?
        WHERE id = ?
      `).run(first_name, last_name, dni, phone, email, address, id);
      io.emit('data_changed');
      res.json({ success: true });
    } catch (error: any) {
      if (error.code === 'SQLITE_CONSTRAINT') {
        res.status(400).json({ error: "El DNI ya está registrado" });
      } else {
        res.status(500).json({ error: "Error al actualizar cliente" });
      }
    }
  });

  app.put("/api/categories/:id", (req, res) => {
    const { id } = req.params;
    const { name, prefix, description } = req.body;
    db.prepare(`
      UPDATE categories SET name = ?, prefix = ?, description = ? WHERE id = ?
    `).run(name, prefix, description, id);
    io.emit('data_changed');
    res.json({ success: true });
  });

  app.delete("/api/categories/:id", (req, res) => {
    const { id } = req.params;
    const categoryId = parseInt(id);

    if (categoryId === 0) {
      return res.status(400).json({ 
        success: false, 
        error: "No se puede eliminar la categoría 'Varios' ya que es requerida por el sistema para reasignar productos." 
      });
    }

    try {
      const transaction = db.transaction(() => {
        // Move products to 'Varios' (ID 0)
        db.prepare("UPDATE products SET category_id = 0 WHERE category_id = ?").run(categoryId);
        // Delete the category
        db.prepare("DELETE FROM categories WHERE id = ?").run(categoryId);
      });

      transaction();
      io.emit('data_changed');
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting category:", error);
      res.status(500).json({ success: false, error: "Error interno del servidor al intentar reasignar productos y eliminar la categoría." });
    }
  });

  app.delete("/api/suppliers/:id", (req, res) => {
    try {
      db.prepare("DELETE FROM suppliers WHERE id = ?").run(req.params.id);
      io.emit('data_changed');
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting supplier:", error);
      if (error.code === 'SQLITE_CONSTRAINT') {
        res.status(400).json({ 
          success: false, 
          error: "No se puede eliminar el proveedor porque tiene productos asociados." 
        });
      } else {
        res.status(500).json({ success: false, error: "Error interno del servidor" });
      }
    }
  });

  app.delete("/api/customers/:id", (req, res) => {
    try {
      db.prepare("DELETE FROM customers WHERE id = ?").run(req.params.id);
      io.emit('data_changed');
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting customer:", error);
      if (error.code === 'SQLITE_CONSTRAINT') {
        res.status(400).json({ 
          success: false, 
          error: "No se puede eliminar el cliente porque tiene ventas o cotizaciones asociadas." 
        });
      } else {
        res.status(500).json({ success: false, error: "Error interno del servidor" });
      }
    }
  });

  // Fallback for non-existent API routes to prevent HTML response
  app.all("/api/*", (req, res) => {
    res.status(404).json({ error: `API route ${req.method} ${req.path} not found` });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
    app.get("*", (req, res) => {
      res.sendFile(path.resolve("dist/index.html"));
    });
  }

  const startListening = () => {
    const server = httpServer.listen(PORT, HOST, () => {
      console.log(`Server running on:`);
      console.log(`  - Local:   http://localhost:${PORT}`);
      if (process.env.APP_URL) {
        console.log(`  - App URL: ${process.env.APP_URL}`);
      }
    });

    server.on('error', (e: any) => {
      if (e.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use. Please restart the dev server.`);
      } else {
        console.error('Server error:', e);
      }
    });
  };

  startListening();
}

startServer();
