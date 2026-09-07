-- Enable UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE domains (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TYPE user_role AS ENUM ('super_admin','director','manager','employee','hr_finance');

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(200) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'employee',
  domain_id UUID REFERENCES domains(id) ON DELETE SET NULL,
  manager_id UUID REFERENCES users(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TYPE lead_status AS ENUM ('new','contacted','qualified','proposal','won','lost');

CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(300) NOT NULL,
  company_name VARCHAR(200),
  contact_name VARCHAR(200),
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  status lead_status DEFAULT 'new',
  value DECIMAL(12,2) DEFAULT 0,
  domain_id UUID REFERENCES domains(id),
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TYPE client_status AS ENUM ('active','inactive','churned');

CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(200) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  company VARCHAR(200),
  domain_id UUID REFERENCES domains(id),
  account_manager UUID REFERENCES users(id) ON DELETE SET NULL,
  status client_status DEFAULT 'active',
  total_value DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TYPE project_status AS ENUM ('planning','active','on_hold','completed','cancelled');
CREATE TYPE project_priority AS ENUM ('low','medium','high','critical');

CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(300) NOT NULL,
  description TEXT,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  domain_id UUID REFERENCES domains(id),
  status project_status DEFAULT 'planning',
  priority project_priority DEFAULT 'medium',
  start_date DATE,
  end_date DATE,
  manager_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TYPE task_status AS ENUM ('todo','in_progress','review','done');
CREATE TYPE task_priority AS ENUM ('low','medium','high');

CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(300) NOT NULL,
  description TEXT,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  domain_id UUID REFERENCES domains(id),
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
  status task_status DEFAULT 'todo',
  priority task_priority DEFAULT 'medium',
  due_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TYPE notif_type AS ENUM ('info','warning','success','error');

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  type notif_type DEFAULT 'info',
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50),
  entity_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed domains
INSERT INTO domains (id, name, description) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Sales', 'Sales and business development'),
  ('22222222-2222-2222-2222-222222222222', 'HR', 'Human resources and talent'),
  ('33333333-3333-3333-3333-333333333333', 'Finance', 'Finance and accounting'),
  ('44444444-4444-4444-4444-444444444444', 'Operations', 'Operations and technology delivery');

-- Seed super admin (password: Admin@123)
INSERT INTO users (id, name, email, password_hash, role) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Super Admin', 'admin@nexacrm.com',
   '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.', 'super_admin');

-- Directors (password: Director@123)
INSERT INTO users (id, name, email, password_hash, role, domain_id) VALUES
  ('b1000000-0000-0000-0000-000000000001', 'Sarah Mitchell', 'director.sales@nexacrm.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.', 'director', '11111111-1111-1111-1111-111111111111'),
  ('b2000000-0000-0000-0000-000000000002', 'James Okonkwo', 'director.hr@nexacrm.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.', 'director', '22222222-2222-2222-2222-222222222222'),
  ('b3000000-0000-0000-0000-000000000003', 'Priya Sharma', 'director.finance@nexacrm.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.', 'director', '33333333-3333-3333-3333-333333333333'),
  ('b4000000-0000-0000-0000-000000000004', 'David Chen', 'director.ops@nexacrm.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.', 'director', '44444444-4444-4444-4444-444444444444');

-- Managers for Sales (password: Manager@123)
INSERT INTO users (id, name, email, password_hash, role, domain_id, manager_id) VALUES
  ('c1000000-0000-0000-0000-000000000001', 'Tom Blake', 'manager1.sales@nexacrm.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.', 'manager', '11111111-1111-1111-1111-111111111111', 'b1000000-0000-0000-0000-000000000001'),
  ('c2000000-0000-0000-0000-000000000002', 'Lisa Park', 'manager2.sales@nexacrm.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.', 'manager', '11111111-1111-1111-1111-111111111111', 'b1000000-0000-0000-0000-000000000001'),
  ('c3000000-0000-0000-0000-000000000003', 'Mark Rivera', 'manager1.ops@nexacrm.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.', 'manager', '44444444-4444-4444-4444-444444444444', 'b4000000-0000-0000-0000-000000000004'),
  ('c4000000-0000-0000-0000-000000000004', 'Anna Kim', 'manager2.ops@nexacrm.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.', 'manager', '44444444-4444-4444-4444-444444444444', 'b4000000-0000-0000-0000-000000000004');

-- Employees (password: Emp@123456)
INSERT INTO users (id, name, email, password_hash, role, domain_id, manager_id) VALUES
  ('d1000000-0000-0000-0000-000000000001', 'Alex Turner', 'emp1.sales@nexacrm.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.', 'employee', '11111111-1111-1111-1111-111111111111', 'c1000000-0000-0000-0000-000000000001'),
  ('d2000000-0000-0000-0000-000000000002', 'Emma Wilson', 'emp2.sales@nexacrm.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.', 'employee', '11111111-1111-1111-1111-111111111111', 'c1000000-0000-0000-0000-000000000001'),
  ('d3000000-0000-0000-0000-000000000003', 'Ryan Foster', 'emp3.sales@nexacrm.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.', 'employee', '11111111-1111-1111-1111-111111111111', 'c2000000-0000-0000-0000-000000000002'),
  ('d4000000-0000-0000-0000-000000000004', 'Zara Ahmed', 'emp1.ops@nexacrm.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.', 'employee', '44444444-4444-4444-4444-444444444444', 'c3000000-0000-0000-0000-000000000003'),
  ('d5000000-0000-0000-0000-000000000005', 'Jake Morrison', 'emp2.ops@nexacrm.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.', 'employee', '44444444-4444-4444-4444-444444444444', 'c3000000-0000-0000-0000-000000000003');

-- HR Finance user
INSERT INTO users (id, name, email, password_hash, role) VALUES
  ('e1000000-0000-0000-0000-000000000001', 'HR Finance User', 'hrfinance@nexacrm.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.', 'hr_finance');

-- Sample leads
INSERT INTO leads (title, company_name, contact_name, contact_email, status, value, domain_id, assigned_to, created_by) VALUES
  ('Enterprise ERP Implementation', 'Acme Corp', 'John Doe', 'john@acme.com', 'qualified', 45000, '11111111-1111-1111-1111-111111111111', 'd1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001'),
  ('Cloud Migration Project', 'TechVision Ltd', 'Jane Smith', 'jane@techvision.com', 'proposal', 28000, '44444444-4444-4444-4444-444444444444', 'd4000000-0000-0000-0000-000000000004', 'c3000000-0000-0000-0000-000000000003'),
  ('CRM Customization', 'GlobalRetail', 'Mike Johnson', 'mike@globalretail.com', 'new', 15000, '11111111-1111-1111-1111-111111111111', 'd2000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000001'),
  ('DevOps Setup', 'StartupHub', 'Sarah Lee', 'sarah@startuphub.io', 'won', 22000, '44444444-4444-4444-4444-444444444444', 'd5000000-0000-0000-0000-000000000005', 'c4000000-0000-0000-0000-000000000004');

-- Sample clients
INSERT INTO clients (name, email, company, domain_id, account_manager, status, total_value) VALUES
  ('Acme Corp', 'accounts@acme.com', 'Acme Corporation', '11111111-1111-1111-1111-111111111111', 'd1000000-0000-0000-0000-000000000001', 'active', 120000),
  ('TechVision Ltd', 'hello@techvision.com', 'TechVision Limited', '44444444-4444-4444-4444-444444444444', 'd4000000-0000-0000-0000-000000000004', 'active', 85000);

-- Sample projects
INSERT INTO projects (title, description, domain_id, status, priority, manager_id, start_date, end_date) VALUES
  ('CloudMigrate v2', 'Full cloud migration for TechVision', '44444444-4444-4444-4444-444444444444', 'active', 'high', 'c3000000-0000-0000-0000-000000000003', '2026-08-01', '2026-12-31'),
  ('CRM Phase 1', 'Initial CRM rollout for Acme', '11111111-1111-1111-1111-111111111111', 'planning', 'medium', 'c1000000-0000-0000-0000-000000000001', '2026-09-01', '2027-03-31');

-- Sample tasks
INSERT INTO tasks (title, description, domain_id, assigned_to, assigned_by, status, priority, due_date) VALUES
  ('Setup Kubernetes cluster', 'Configure K8s on AWS EKS', '44444444-4444-4444-4444-444444444444', 'd4000000-0000-0000-0000-000000000004', 'c3000000-0000-0000-0000-000000000003', 'in_progress', 'high', '2026-09-30'),
  ('Client requirements call', 'Discovery call with Acme stakeholders', '11111111-1111-1111-1111-111111111111', 'd1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', 'todo', 'medium', '2026-09-15'),
  ('Prepare proposal doc', 'Sales proposal for GlobalRetail', '11111111-1111-1111-1111-111111111111', 'd2000000-0000-0000-0000-000000000002', 'c2000000-0000-0000-0000-000000000002', 'todo', 'high', '2026-09-12');
