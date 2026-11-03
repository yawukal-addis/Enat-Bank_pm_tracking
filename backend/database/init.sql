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
  serial_number VARCHAR(100),
  zone VARCHAR(10) CHECK (zone IN ('ZONE_1', 'ZONE_2')),
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
  scheduled_end_date DATE,
  status pm_status NOT NULL DEFAULT 'SCHEDULED',
  vendor_technician VARCHAR(150),
  vendor_notes TEXT,
  vendor_visit_date DATE,
  work_start_time TIME,
  work_finished_time TIME,
  vendor_checklist JSONB,
  vendor_completed_at TIMESTAMP,
  branch_confirmed_by VARCHAR(150),
  branch_confirmed_at TIMESTAMP,
  cleanliness_rating INT CHECK (cleanliness_rating BETWEEN 1 AND 5),
  branch_remarks TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS atm_issue_types (
  id SERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL UNIQUE,
  response_target_minutes INT CHECK (response_target_minutes > 0),
  resolution_target_minutes INT CHECK (resolution_target_minutes > 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS atm_issues (
  id SERIAL PRIMARY KEY,
  terminal_id VARCHAR(50) NOT NULL REFERENCES atms(terminal_id) ON DELETE CASCADE,
  issue_type_id INT NOT NULL REFERENCES atm_issue_types(id),
  response_target_minutes INT NOT NULL CHECK (response_target_minutes > 0),
  resolution_target_minutes INT NOT NULL CHECK (resolution_target_minutes > 0),
  reported_at TIMESTAMP NOT NULL,
  response_due_at TIMESTAMP,
  resolution_due_at TIMESTAMP,
  response_target_hours NUMERIC(8, 4) CHECK (response_target_hours > 0 AND response_target_hours <= 8760),
  resolution_target_hours NUMERIC(8, 4) CHECK (resolution_target_hours > 0 AND resolution_target_hours <= 8760),
  description TEXT NOT NULL,
  vendor_response_at TIMESTAMP,
  resolved_at TIMESTAMP,
  severity VARCHAR(10) NOT NULL DEFAULT 'MAJOR' CHECK (severity IN ('CRITICAL', 'MAJOR', 'MINOR')),
  zone VARCHAR(10) CHECK (zone IN ('ZONE_1', 'ZONE_2')),
  resolution_notes TEXT,
  created_by INT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (vendor_response_at IS NULL OR vendor_response_at >= reported_at),
  CHECK (resolved_at IS NULL OR resolved_at >= reported_at),
  CHECK (resolved_at IS NULL OR vendor_response_at IS NULL OR resolved_at >= vendor_response_at)
);

CREATE INDEX IF NOT EXISTS idx_atm_issues_reported_at ON atm_issues(reported_at);
CREATE INDEX IF NOT EXISTS idx_atm_issues_terminal_reported ON atm_issues(terminal_id, reported_at);

CREATE TABLE IF NOT EXISTS atm_monthly_vendor_fees (
  terminal_id VARCHAR(50) NOT NULL REFERENCES atms(terminal_id) ON DELETE CASCADE,
  fee_month DATE NOT NULL,
  monthly_fee NUMERIC(12, 2) NOT NULL CHECK (monthly_fee >= 0),
  currency VARCHAR(8) NOT NULL DEFAULT 'ETB',
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (terminal_id, fee_month),
  CHECK (EXTRACT(DAY FROM fee_month) = 1)
);

CREATE TABLE IF NOT EXISTS atm_terminal_vendor_fees (
  terminal_id VARCHAR(50) PRIMARY KEY REFERENCES atms(terminal_id) ON DELETE CASCADE,
  monthly_fee NUMERIC(12, 2) NOT NULL CHECK (monthly_fee >= 0),
  currency VARCHAR(8) NOT NULL DEFAULT 'ETB',
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS atm_issue_sla_settings (
  zone VARCHAR(10) NOT NULL CHECK (zone IN ('ZONE_1', 'ZONE_2')),
  severity VARCHAR(10) NOT NULL CHECK (severity IN ('CRITICAL', 'MAJOR', 'MINOR')),
  response_target_minutes INT CHECK (response_target_minutes BETWEEN 1 AND 525600),
  resolution_target_minutes INT CHECK (resolution_target_minutes BETWEEN 1 AND 525600),
  response_target_hours NUMERIC(8, 4) CHECK (response_target_hours > 0 AND response_target_hours <= 8760),
  resolution_target_hours NUMERIC(8, 4) CHECK (resolution_target_hours > 0 AND resolution_target_hours <= 8760),
  PRIMARY KEY (zone, severity)
);

INSERT INTO atm_issue_sla_settings (zone, severity)
SELECT zone, severity
FROM unnest(ARRAY['ZONE_1', 'ZONE_2']) AS zones(zone)
CROSS JOIN unnest(ARRAY['CRITICAL', 'MAJOR', 'MINOR']) AS severities(severity)
ON CONFLICT (zone, severity) DO NOTHING;

CREATE TABLE IF NOT EXISTS atm_issue_policy (
  id BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id),
  business_days SMALLINT[] NOT NULL DEFAULT ARRAY[1, 2, 3, 4, 5]::smallint[],
  business_start TIME NOT NULL DEFAULT '08:00',
  business_end TIME NOT NULL DEFAULT '17:00',
  CHECK (business_start < business_end),
  CHECK (cardinality(business_days) > 0)
);

INSERT INTO atm_issue_policy (id) VALUES (TRUE) ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION atm_add_business_minutes(start_at TIMESTAMP, target_minutes INT)
RETURNS TIMESTAMP
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  cursor_at TIMESTAMP := start_at;
  remaining INT := target_minutes;
  available INT;
  work_days SMALLINT[];
  work_start TIME;
  work_end TIME;
BEGIN
  IF start_at IS NULL OR target_minutes IS NULL THEN
    RETURN NULL;
  END IF;
  IF target_minutes < 1 THEN
    RETURN start_at;
  END IF;

  SELECT business_days, business_start, business_end
  INTO work_days, work_start, work_end
  FROM atm_issue_policy
  WHERE id = TRUE;

  WHILE remaining > 0 LOOP
    IF NOT (EXTRACT(ISODOW FROM cursor_at)::SMALLINT = ANY(work_days)) THEN
      cursor_at := cursor_at::DATE + 1 + work_start;
    ELSIF cursor_at::TIME < work_start THEN
      cursor_at := cursor_at::DATE + work_start;
    ELSIF cursor_at::TIME >= work_end THEN
      cursor_at := cursor_at::DATE + 1 + work_start;
    ELSE
      available := FLOOR(EXTRACT(EPOCH FROM ((cursor_at::DATE + work_end) - cursor_at)) / 60)::INT;
      IF remaining <= available THEN
        RETURN cursor_at + MAKE_INTERVAL(mins => remaining);
      END IF;
      remaining := remaining - available;
      cursor_at := cursor_at::DATE + 1 + work_start;
    END IF;
  END LOOP;

  RETURN cursor_at;
END;
$$;

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
