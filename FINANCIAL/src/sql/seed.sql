INSERT OR IGNORE INTO roles(id,name) VALUES (1,'ADMIN'),(2,'USER');

-- password: admin123
INSERT OR IGNORE INTO users(id, username, password_hash, role_id)
VALUES (1,'admin', '$2a$10$wI8bYH5v2HqyY7sHjmsqV.2D0x6b1qvGB6yHTj9vKV6dugspVJAX2', 1);

INSERT OR IGNORE INTO accounts (id, code, name, type) VALUES
  (1000,'1000','Cash on Hand','ASSET'),
  (1010,'1010','Bank - Main','ASSET'),
  (1100,'1100','Accounts Receivable','ASSET'),
  (2000,'2000','Accounts Payable','LIABILITY'),
  (3000,'3000','Owner Equity','EQUITY'),
  (4000,'4000','Room Revenue','REVENUE'),
  (4010,'4010','Food & Beverage Revenue','REVENUE'),
  (5000,'5000','Salaries Expense','EXPENSE'),
  (5010,'5010','Supplies Expense','EXPENSE');

INSERT OR IGNORE INTO customers (id, name, email) VALUES (1,'Walk-in Guest','guest@example.com');
INSERT OR IGNORE INTO vendors   (id, name, email) VALUES (1,'Supplier A','ap@supplier-a.test');

INSERT OR IGNORE INTO journal_entries (id, je_no, date, memo, posted_by)
VALUES (1,'JE-0001','2025-08-01','Opening balance',1);
INSERT OR IGNORE INTO journal_lines (journal_entry_id, account_id, debit, credit, description) VALUES
  (1,1000,5000,0,'Funded cash'),
  (1,3000,0,5000,'Opening equity');
