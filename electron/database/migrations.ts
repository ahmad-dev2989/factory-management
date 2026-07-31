import sqlite3 from 'sqlite3';
import { SCHEMA_V1, SCHEMA_V2 } from './schema.js';

function migrateToV1(db: sqlite3.Database): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log('[Database] Migrating database to version 1...');
    db.serialize(() => {
      db.run('BEGIN TRANSACTION');

      // 1. Create tables
      db.exec(SCHEMA_V1, (execErr) => {
        if (execErr) {
          console.error('[Database] Schema execution failed, rolling back...', execErr);
          db.run('ROLLBACK', () => reject(execErr));
          return;
        }

        console.log('[Database] Tables created successfully. Seeding initial data...');

        // 2. Seed Users
        db.run(`
          INSERT OR IGNORE INTO users (id, full_name, username, role, status, password)
          VALUES (1, 'Administrator', 'admin', 'Administrator', 'Active', 'admin')
        `);

        // 3. Seed Bank Accounts
        db.run(`
          INSERT OR IGNORE INTO bank_accounts (id, name, type, currency, bank_name, account_number, branch_name, iban, opening_balance, current_balance, status, notes, is_default) VALUES
          (1, 'Cash in Hand', 'Cash', 'PKR', '', '', '', '', 0, 0, 'Active', 'Main cash register', 1),
          (2, 'Meezan Bank', 'Bank Account', 'PKR', 'Meezan Bank', '0234-010293847', 'Main Branch', 'PK45MEZN0000023401029384', 500000, 500000, 'Active', 'Primary business account', 0),
          (3, 'HBL', 'Bank Account', 'PKR', 'Habib Bank Limited', '1020-394857683', 'Industrial Area Branch', 'PK12HABB0000102039485768', 1250000, 1250000, 'Active', 'Payroll and utilities', 0),
          (4, 'UBL', 'Bank Account', 'PKR', 'United Bank Limited', '0987-654321098', 'Commercial Area', '', 0, 0, 'Active', 'Tax reserves', 0),
          (5, 'EasyPaisa', 'Mobile Wallet', 'PKR', 'Telenor Microfinance Bank', '0313-0685030', 'Mobile Account', '', 25000, 25000, 'Active', 'Minor expense payouts', 0),
          (6, 'JazzCash', 'Mobile Wallet', 'PKR', 'Mobilink Microfinance Bank', '0300-1234567', 'Mobile Account', '', 0, 0, 'Inactive', 'Backup wallet', 0)
        `);

        // 4. Seed Chart of Accounts
        db.run(`
          INSERT OR IGNORE INTO chart_of_accounts (id, code, name, parent_id, type, description, status, is_root, is_default) VALUES
          (1, 'ACC-0001', 'Assets', NULL, 'Asset', 'All company assets', 'Active', 1, 1),
          (2, 'ACC-0002', 'Liabilities', NULL, 'Liability', 'All company liabilities', 'Active', 1, 1),
          (3, 'ACC-0003', 'Equity', NULL, 'Equity', 'Owner equity and shares', 'Active', 1, 1),
          (4, 'ACC-0004', 'Income', NULL, 'Income', 'All revenue streams', 'Active', 1, 1),
          (5, 'ACC-0005', 'Cost of Goods Sold', NULL, 'Cost of Goods Sold', 'Direct costs of production', 'Active', 1, 1),
          (6, 'ACC-0006', 'Expenses', NULL, 'Expense', 'Indirect operating expenses', 'Active', 1, 1),
          (7, 'ACC-0007', 'Current Assets', 1, 'Asset', '', 'Active', 0, 1),
          (8, 'ACC-0008', 'Fixed Assets', 1, 'Asset', '', 'Active', 0, 1),
          (9, 'ACC-0009', 'Cash in Hand', 7, 'Asset', '', 'Active', 0, 1),
          (10, 'ACC-0010', 'Meezan Bank', 7, 'Asset', '', 'Active', 0, 1),
          (11, 'ACC-0011', 'EasyPaisa', 7, 'Asset', '', 'Active', 0, 1),
          (12, 'ACC-0012', 'Accounts Payable', 2, 'Liability', '', 'Active', 0, 1),
          (13, 'ACC-0013', 'Owner Capital', 3, 'Equity', '', 'Active', 0, 1),
          (14, 'ACC-0014', 'Sales Income', 4, 'Income', '', 'Active', 0, 1),
          (15, 'ACC-0015', 'Purchase Cost', 5, 'Cost of Goods Sold', '', 'Active', 0, 1),
          (16, 'ACC-0016', 'Retained Earnings', 3, 'Equity', '', 'Active', 0, 1)
        `);

        // 5. Seed Customers
        db.run(`
          INSERT OR IGNORE INTO customers (id, company_name, contact_person, phone, whatsapp, email, address1, address2, city, province, country, postal_code, ntn, business_type, credit_limit, opening_balance, current_balance, status, notes) VALUES
          (1, 'TechCorp Solutions', 'Ali Raza', '0300-1234567', '0300-1234567', 'ali.raza@techcorp.com', 'Plot 45, Industrial Area', 'Sector G', 'Lahore', 'Punjab', 'Pakistan', '54000', '1234567-8', 'Corporate', 500000, 125000, 125000, 'Active', 'Key corporate client for bulk orders.'),
          (2, 'Apex Enterprises', 'Sarah Khan', '0321-7654321', '0321-7654321', 'sales@apex.pk', 'Office 12, 3rd Floor', 'Eden Heights, Jail Road', 'Lahore', 'Punjab', 'Pakistan', '54000', '7654321-0', 'Wholesale', 1000000, 450000, 450000, 'Active', 'Requires credit terms of Net 30.'),
          (3, 'Zainab Fabrics', 'M. Irfan', '0333-9876543', '', 'zainabfabrics@gmail.com', 'Shop 104, Cloth Market', 'Faisalabad', 'Faisalabad', 'Punjab', 'Pakistan', '38000', '', 'Retail', 150000, -25000, -25000, 'Active', 'Advance payment account.'),
          (4, 'InterGlobal Trading', 'John Doe', '+1-555-0199', '', 'info@interglobal.com', '100 Pine Street', 'Suite 2400', 'San Francisco', 'California', 'USA', '94111', '', 'Inactive', 0, 0, 0, 'Inactive', 'Currently suspended due to inactive trade.')
        `);

        // 6. Seed Employees
        db.run(`
          INSERT OR IGNORE INTO employees (id, emp_code, full_name, father_name, cnic, phone, alt_phone, email, address, city, designation, department, joining_date, salary, emergency_contact_name, emergency_contact_number, status, notes) VALUES
          (1, 'EMP-0001', 'Ahmad Farooq', 'Farooq', '33100-1234567-1', '0313-0685030', '', 'ahmadfarooq.dev2989@gmail.com', 'Faisalabad, Pakistan', 'Faisalabad', 'Software Developer', 'Management', '2025-01-01', 150000, '', '', 'Active', 'Lead software developer.'),
          (2, 'EMP-0002', 'Zahid Mahmood', 'Mahmood Ahmad', '33100-7654321-3', '0300-7654321', '', 'zahid@factory.com', 'Main Canal Road', 'Faisalabad', 'Production Manager', 'Production', '2025-02-15', 85000, 'Kashif Mahmood', '0321-9876543', 'Active', 'Manages shift operations.'),
          (3, 'EMP-0003', 'Sajid Ali', 'Liaqat Ali', '33102-1928374-5', '0345-1234567', '0300-1122334', 'sajid.ali@factory.com', 'Samanabad, Street 2', 'Faisalabad', 'Quality Inspector', 'Quality Control', '2025-03-01', 45000, 'Liaqat Ali (Father)', '0345-0000000', 'Active', 'Inspects raw materials.'),
          (4, 'EMP-0004', 'Maria Khan', 'M. Khan', '33100-4837261-2', '0312-3456789', '', '', 'People''s Colony No. 1', 'Faisalabad', 'Accountant', 'Accounts', '2025-04-01', 60000, '', '', 'Inactive', 'Resigned on personal grounds.')
        `);

        // 7. Seed Expense Accounts
        db.run(`
          INSERT OR IGNORE INTO expense_accounts (id, code, name, linked_account, description, status, is_default) VALUES
          (1, 'EXP-0001', 'Electricity', 'Electricity', 'Monthly electricity bills', 'Active', 1),
          (2, 'EXP-0002', 'Internet', 'Internet', 'ISP and connectivity', 'Active', 1),
          (3, 'EXP-0003', 'Fuel', 'Fuel', 'Vehicle and generator fuel', 'Active', 1),
          (4, 'EXP-0004', 'Office Rent', 'Office Rent', 'Monthly premises rent', 'Active', 1),
          (5, 'EXP-0005', 'Salary', 'Salary', 'Staff salaries and wages', 'Active', 1),
          (6, 'EXP-0006', 'Marketing', 'Marketing', 'Ads and promotions', 'Active', 1),
          (7, 'EXP-0007', 'Office Supplies', 'Office Supplies', 'Stationery and daily supplies', 'Active', 1),
          (8, 'EXP-0008', 'Repair & Maintenance', 'Repair & Maintenance', 'Equipment and facility repair', 'Active', 1),
          (9, 'EXP-0009', 'Transport', 'Transport', 'Logistics and commute', 'Active', 1),
          (10, 'EXP-0010', 'Miscellaneous', 'Miscellaneous', 'Uncategorized expenses', 'Active', 1)
        `);

        // 8. Seed Default Settings
        db.run(`
          INSERT OR IGNORE INTO app_settings (key, value) VALUES
          ('linked_accounts_config', '{"cashSales":"1","creditSales":"2","salesReturn":"3","customerReceivable":"4","salesDiscount":"5","cashPurchase":"9","creditPurchase":"2","purchaseReturn":"6","supplierPayable":"7","purchaseDiscount":"8","cashIn":"9","cashOut":"9","pettyCash":"10","defaultBank":"11","defaultExpense":"12","inventoryAsset":"13","cogs":"14","ownerCapital":"15","retainedEarnings":"16"}'),
          ('system_preferences_config', '{"businessCurrency":"PKR","currencySymbol":"Rs.","dateFormat":"DD/MM/YYYY","timeFormat":"12 Hour","language":"English","invoicePrefix":"INV-","startingInvoiceNumber":"1001","autoIncrementInvoice":true,"invoiceFooterNotes":"Thank you for your business.","lowStockWarning":true,"defaultLowStockQty":"10","allowNegativeStock":false,"theme":"Light","enableNotifications":true,"enableConfirmations":true}')
        `);

        // 9. Seed Default Company Info
        db.run(`
          INSERT OR IGNORE INTO company (id, company_name, business_name, owner_name, phone, email, address1, currency, decimal_places)
          VALUES (1, 'Faisalabad Textile Industry', 'Textile Factory', 'Ahmad Farooq', '0313-0685030', 'ahmadfarooq.dev2989@gmail.com', 'Faisalabad, Pakistan', 'PKR', '2')
        `);

        // Set user_version to 1
        db.run('PRAGMA user_version = 1', (versionErr) => {
          if (versionErr) {
            console.error('[Database] Failed to update user_version to 1, rolling back...', versionErr);
            db.run('ROLLBACK', () => reject(versionErr));
            return;
          }

          db.run('COMMIT', (commitErr) => {
            if (commitErr) {
              console.error('[Database] Failed to commit migration transaction to version 1:', commitErr);
              reject(commitErr);
            } else {
              console.log('[Database] Database migrated and seeded successfully to version 1.');
              resolve();
            }
          });
        });
      });
    });
  });
}

function migrateToV2(db: sqlite3.Database): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log('[Database] Migrating database to version 2 (Products & Categories)...');
    db.serialize(() => {
      db.run('BEGIN TRANSACTION');

      db.exec(SCHEMA_V2, (execErr) => {
        if (execErr) {
          console.error('[Database] Schema execution for v2 failed, rolling back...', execErr);
          db.run('ROLLBACK', () => reject(execErr));
          return;
        }

        console.log('[Database] Products & Categories tables created. Seeding initial categories...');

        // Seed initial categories
        db.run(`
          INSERT OR IGNORE INTO product_categories (id, name) VALUES
          (1, 'General'),
          (2, 'Raw Materials'),
          (3, 'Finished Goods')
        `);

        db.run('PRAGMA user_version = 2', (versionErr) => {
          if (versionErr) {
            console.error('[Database] Failed to update user_version to 2, rolling back...', versionErr);
            db.run('ROLLBACK', () => reject(versionErr));
            return;
          }

          db.run('COMMIT', (commitErr) => {
            if (commitErr) {
              console.error('[Database] Failed to commit migration transaction to version 2:', commitErr);
              reject(commitErr);
            } else {
              console.log('[Database] Database migrated and seeded successfully to version 2.');
              resolve();
            }
          });
        });
      });
    });
  });
}

export function runMigrations(db: sqlite3.Database): Promise<void> {
  return new Promise((resolve, reject) => {
    // Query current user_version
    db.get('PRAGMA user_version', async (err, row: any) => {
      if (err) {
        console.error('[Database] Failed to read user_version:', err);
        reject(err);
        return;
      }

      let currentVersion = row ? row.user_version : 0;
      console.log(`[Database] Current database schema version: ${currentVersion}`);

      try {
        if (currentVersion < 1) {
          await migrateToV1(db);
          currentVersion = 1;
        }
        if (currentVersion < 2) {
          await migrateToV2(db);
          currentVersion = 2;
        }
        console.log(`[Database] Database schema version is now: ${currentVersion}`);
        resolve();
      } catch (migrationErr) {
        console.error('[Database] Migration failed:', migrationErr);
        reject(migrationErr);
      }
    });
  });
}
