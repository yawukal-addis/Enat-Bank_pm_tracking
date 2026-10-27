CREATE TABLE IF NOT EXISTS branches (
  id SERIAL PRIMARY KEY,
  branch_code VARCHAR(50) UNIQUE NOT NULL,
  branch_name VARCHAR(150) UNIQUE NOT NULL,
  region VARCHAR(100) NOT NULL DEFAULT 'Addis Ababa',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(254),
  role VARCHAR(50) NOT NULL CHECK (role IN ('ADMIN', 'VENDOR', 'BRANCH')),
  branch_id INT REFERENCES branches(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS atms (
  id SERIAL PRIMARY KEY,
  terminal_id VARCHAR(50) UNIQUE NOT NULL,
  branch_id INT NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  model VARCHAR(100) NOT NULL DEFAULT 'NCR SelfServ 84',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_atms (
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  terminal_id VARCHAR(50) NOT NULL REFERENCES atms(terminal_id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, terminal_id)
);

DO $$ BEGIN
  CREATE TYPE pm_status AS ENUM ('SCHEDULED', 'VENDOR_COMPLETED', 'BRANCH_CONFIRMED', 'BRANCH_DISPUTED', 'OVERDUE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS pm_visits (
  id SERIAL PRIMARY KEY,
  terminal_id VARCHAR(50) NOT NULL REFERENCES atms(terminal_id) ON DELETE CASCADE,
  vendor_name VARCHAR(100) NOT NULL DEFAULT 'Moti Engineering',
  scheduled_date DATE NOT NULL,
  status pm_status NOT NULL DEFAULT 'SCHEDULED',
  vendor_technician VARCHAR(150),
  vendor_notes TEXT,
  vendor_completed_at TIMESTAMP,
  branch_confirmed_by VARCHAR(150),
  branch_confirmed_at TIMESTAMP,
  cleanliness_rating INT CHECK (cleanliness_rating BETWEEN 1 AND 5),
  branch_remarks TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO users (username, password, full_name, role, branch_id) VALUES
  ('admin', '$2b$12$a/c3bTaDYA8cYT3lDtOApOcHr/BFWdaFQOUovTjMgufsHSdENaH0O', 'Central IT Admin', 'ADMIN', NULL),
  ('moti_tech', '$2b$12$wu/DRXwjuWgn4oFwaIHTB.ofnsDi8kW5yX.xmbEVfcLY9pm8I4LOW', 'Abebe Kebede (Moti)', 'VENDOR', NULL),
  ('branch_main', '$2b$12$BHlqacpSyXa/oxqUlvU4tuLn5pp7ZVrH/8u7D/QpVMUIsTdL5h9D6', 'Main Branch Officer', 'BRANCH', NULL)
ON CONFLICT (username) DO NOTHING;

INSERT INTO user_atms (user_id, terminal_id)
SELECT u.id, a.terminal_id
FROM users u
JOIN atms a ON a.branch_id = u.branch_id
WHERE u.role = 'BRANCH'
ON CONFLICT DO NOTHING;
