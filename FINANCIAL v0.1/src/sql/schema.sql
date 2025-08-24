-- Make sure the database exists in phpMyAdmin:
--   CREATE DATABASE atiera CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- Then set DB_NAME=atiera in your .env.

-- USERS & ROLES
CREATE TABLE IF NOT EXISTS roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role_id INT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles(id)
) ENGINE=InnoDB;

-- ACTIVITY LOG
CREATE TABLE IF NOT EXISTS activity_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  actor_id INT NULL,
  module VARCHAR(50) NOT NULL,
  action VARCHAR(50) NOT NULL,
  ref_table VARCHAR(50) NULL,
  ref_id INT NULL,
  details TEXT NULL,
  ip VARCHAR(64) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_activity_module (module),
  CONSTRAINT fk_activity_user FOREIGN KEY (actor_id) REFERENCES users(id)
) ENGINE=InnoDB;

-- GL ACCOUNTS
CREATE TABLE IF NOT EXISTS accounts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL,
  type ENUM('ASSET','LIABILITY','EQUITY','REVENUE','EXPENSE') NOT NULL,
  parent_id INT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  INDEX idx_accounts_type (type),
  CONSTRAINT fk_accounts_parent FOREIGN KEY (parent_id) REFERENCES accounts(id)
) ENGINE=InnoDB;

-- JOURNAL
CREATE TABLE IF NOT EXISTS journal_entries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  je_no VARCHAR(50) NULL UNIQUE,
  date DATE NOT NULL,
  memo VARCHAR(255) NULL,
  posted_by INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_je_user FOREIGN KEY (posted_by) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS journal_lines (
  id INT AUTO_INCREMENT PRIMARY KEY,
  journal_entry_id INT NOT NULL,
  account_id INT NOT NULL,
  description VARCHAR(255) NULL,
  debit DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  credit DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  customer_id INT NULL,
  vendor_id INT NULL,
  INDEX idx_lines_account (account_id),
  INDEX idx_lines_je (journal_entry_id),
  CONSTRAINT fk_lines_je FOREIGN KEY (journal_entry_id) REFERENCES journal_entries(id) ON DELETE CASCADE,
  CONSTRAINT fk_lines_acct FOREIGN KEY (account_id) REFERENCES accounts(id)
) ENGINE=InnoDB;

-- AR
CREATE TABLE IF NOT EXISTS customers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  email VARCHAR(160) NULL,
  phone VARCHAR(60) NULL,
  address VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS invoices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT NOT NULL,
  invoice_no VARCHAR(50) NOT NULL UNIQUE,
  invoice_date DATE NOT NULL,
  due_date DATE NOT NULL,
  status ENUM('OPEN','PAID','PARTIAL','VOID') NOT NULL DEFAULT 'OPEN',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_inv_customer FOREIGN KEY (customer_id) REFERENCES customers(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS invoice_lines (
  id INT AUTO_INCREMENT PRIMARY KEY,
  invoice_id INT NOT NULL,
  item VARCHAR(160) NULL,
  qty DECIMAL(14,2) NOT NULL DEFAULT 1.00,
  unit_price DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  account_id INT NULL,
  CONSTRAINT fk_inv_line_inv FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
  CONSTRAINT fk_inv_line_acct FOREIGN KEY (account_id) REFERENCES accounts(id)
) ENGINE=InnoDB;

-- AP
CREATE TABLE IF NOT EXISTS vendors (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  email VARCHAR(160) NULL,
  phone VARCHAR(60) NULL,
  address VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS bills (
  id INT AUTO_INCREMENT PRIMARY KEY,
  vendor_id INT NOT NULL,
  bill_no VARCHAR(50) NOT NULL UNIQUE,
  bill_date DATE NOT NULL,
  due_date DATE NOT NULL,
  status ENUM('OPEN','PAID','PARTIAL','VOID') NOT NULL DEFAULT 'OPEN',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_bill_vendor FOREIGN KEY (vendor_id) REFERENCES vendors(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS bill_lines (
  id INT AUTO_INCREMENT PRIMARY KEY,
  bill_id INT NOT NULL,
  item VARCHAR(160) NULL,
  qty DECIMAL(14,2) NOT NULL DEFAULT 1.00,
  unit_price DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  account_id INT NULL,
  CONSTRAINT fk_bill_line_bill FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE CASCADE,
  CONSTRAINT fk_bill_line_acct FOREIGN KEY (account_id) REFERENCES accounts(id)
) ENGINE=InnoDB;

-- PAYMENTS + APPLICATIONS
CREATE TABLE IF NOT EXISTS payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  type ENUM('AR','AP') NOT NULL,
  customer_id INT NULL,
  vendor_id INT NULL,
  date DATE NOT NULL,
  method VARCHAR(60) NULL,
  ref_no VARCHAR(60) NULL,
  amount DECIMAL(14,2) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS payment_applications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  payment_id INT NOT NULL,
  invoice_id INT NULL,
  bill_id INT NULL,
  amount DECIMAL(14,2) NOT NULL,
  CONSTRAINT fk_pay_app_payment FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE,
  CONSTRAINT fk_pay_app_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(id),
  CONSTRAINT fk_pay_app_bill FOREIGN KEY (bill_id) REFERENCES bills(id)
) ENGINE=InnoDB;

-- BUDGETS
CREATE TABLE IF NOT EXISTS budgets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  fiscal_year INT NOT NULL,
  department VARCHAR(120) NULL,
  created_by INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_budget_user FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS budget_lines (
  id INT AUTO_INCREMENT PRIMARY KEY,
  budget_id INT NOT NULL,
  account_id INT NOT NULL,
  period TINYINT NOT NULL,
  amount DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  UNIQUE KEY idx_budget_unique (budget_id, account_id, period),
  CONSTRAINT fk_bl_budget FOREIGN KEY (budget_id) REFERENCES budgets(id) ON DELETE CASCADE,
  CONSTRAINT fk_bl_account FOREIGN KEY (account_id) REFERENCES accounts(id),
  CHECK (period BETWEEN 1 AND 12)
) ENGINE=InnoDB;

-- DISBURSEMENTS
CREATE TABLE IF NOT EXISTS disbursements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  date DATE NOT NULL,
  reference VARCHAR(60) NULL,
  payee VARCHAR(160) NULL,
  amount DECIMAL(14,2) NOT NULL,
  account_id INT NULL,
  purpose VARCHAR(255) NULL,
  CONSTRAINT fk_disb_acct FOREIGN KEY (account_id) REFERENCES accounts(id)
) ENGINE=InnoDB;

-- BANK ACCOUNTS
CREATE TABLE IF NOT EXISTS bank_accounts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  number VARCHAR(60) NULL,
  account_id INT NULL,
  CONSTRAINT fk_bank_acct FOREIGN KEY (account_id) REFERENCES accounts(id)
) ENGINE=InnoDB;

-- ======= SEED DATA =======
INSERT IGNORE INTO roles(id,name) VALUES (1,'ADMIN'),(2,'USER');

-- password: admin123 (bcrypt hash)
INSERT IGNORE INTO users(id, username, password_hash, role_id)
VALUES (1,'admin', '$2a$10$wI8bYH5v2HqyY7sHjmsqV.2D0x6b1qvGB6yHTj9vKV6dugspVJAX2', 1);

INSERT IGNORE INTO accounts (id, code, name, type) VALUES
 (1000,'1000','Cash on Hand','ASSET'),
 (1010,'1010','Bank - Main','ASSET'),
 (1100,'1100','Accounts Receivable','ASSET'),
 (2000,'2000','Accounts Payable','LIABILITY'),
 (3000,'3000','Owner Equity','EQUITY'),
 (4000,'4000','Room Revenue','REVENUE'),
 (4010,'4010','Food & Beverage Revenue','REVENUE'),
 (5000,'5000','Salaries Expense','EXPENSE'),
 (5010,'5010','Supplies Expense','EXPENSE');

INSERT IGNORE INTO customers (id,name,email) VALUES (1,'Walk-in Guest','guest@example.com');
INSERT IGNORE INTO vendors   (id,name,email) VALUES (1,'Supplier A','ap@supplier-a.test');

INSERT IGNORE INTO journal_entries (id, je_no, date, memo, posted_by)
VALUES (1,'JE-0001','2025-08-01','Opening balance',1);

INSERT IGNORE INTO journal_lines (journal_entry_id, account_id, debit, credit, description) VALUES
 (1,1000,5000,0,'Funded cash'), (1,3000,0,5000,'Opening equity');
