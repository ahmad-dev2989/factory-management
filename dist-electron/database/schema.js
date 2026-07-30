// Database schema definitions for version 1
export const SCHEMA_V1 = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name TEXT NOT NULL,
  username TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL,
  status TEXT NOT NULL,
  last_login TEXT DEFAULT 'Never',
  password TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS company (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_name TEXT NOT NULL,
  business_name TEXT,
  owner_name TEXT,
  phone TEXT,
  alt_phone TEXT,
  email TEXT,
  website TEXT,
  address1 TEXT,
  address2 TEXT,
  city TEXT,
  province TEXT,
  country TEXT,
  postal_code TEXT,
  ntn TEXT,
  strn TEXT,
  reg_number TEXT,
  business_type TEXT,
  invoice_prefix TEXT,
  quotation_prefix TEXT,
  currency TEXT,
  decimal_places TEXT,
  invoice_footer TEXT,
  logo_path TEXT
);

CREATE TABLE IF NOT EXISTS app_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT UNIQUE NOT NULL,
  value TEXT
);

CREATE TABLE IF NOT EXISTS bank_accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  currency TEXT NOT NULL,
  bank_name TEXT,
  account_number TEXT,
  branch_name TEXT,
  iban TEXT,
  opening_balance REAL DEFAULT 0,
  current_balance REAL DEFAULT 0,
  status TEXT NOT NULL,
  notes TEXT,
  is_default INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS chart_of_accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  parent_id INTEGER,
  type TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL,
  is_root INTEGER DEFAULT 0,
  is_default INTEGER DEFAULT 0,
  FOREIGN KEY(parent_id) REFERENCES chart_of_accounts(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  whatsapp TEXT,
  email TEXT,
  address1 TEXT,
  address2 TEXT,
  city TEXT,
  province TEXT,
  country TEXT,
  postal_code TEXT,
  ntn TEXT,
  business_type TEXT,
  credit_limit REAL DEFAULT 0,
  opening_balance REAL DEFAULT 0,
  current_balance REAL DEFAULT 0,
  status TEXT NOT NULL,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS employees (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  emp_code TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  father_name TEXT,
  cnic TEXT,
  phone TEXT,
  alt_phone TEXT,
  email TEXT,
  address TEXT,
  city TEXT,
  designation TEXT,
  department TEXT,
  joining_date TEXT,
  salary REAL DEFAULT 0,
  emergency_contact_name TEXT,
  emergency_contact_number TEXT,
  status TEXT NOT NULL,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS expense_accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  linked_account TEXT,
  description TEXT,
  status TEXT NOT NULL,
  is_default INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS attachments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  relative_path TEXT NOT NULL UNIQUE,
  original_name TEXT NOT NULL,
  mime_type TEXT,
  file_size INTEGER,
  upload_date TEXT DEFAULT CURRENT_TIMESTAMP,
  entity_type TEXT,
  entity_id INTEGER
);
`;
