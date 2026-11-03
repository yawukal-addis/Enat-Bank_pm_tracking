const db = require('./db');

module.exports = async function ensureAuthSchema() {
  await db.query('ALTER TABLE atms ADD COLUMN IF NOT EXISTS serial_number VARCHAR(100)');
  await db.query("ALTER TABLE atms ADD COLUMN IF NOT EXISTS zone VARCHAR(10) CHECK (zone IN ('ZONE_1', 'ZONE_2'))");
  await db.query('ALTER TABLE pm_visits ADD COLUMN IF NOT EXISTS scheduled_end_date DATE');
  await db.query('ALTER TABLE pm_visits ADD COLUMN IF NOT EXISTS vendor_visit_date DATE');
  await db.query('ALTER TABLE pm_visits ADD COLUMN IF NOT EXISTS work_start_time TIME');
  await db.query('ALTER TABLE pm_visits ADD COLUMN IF NOT EXISTS work_finished_time TIME');
  await db.query('ALTER TABLE pm_visits ADD COLUMN IF NOT EXISTS vendor_checklist JSONB');

  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(100) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      full_name VARCHAR(150) NOT NULL,
      email VARCHAR(254),
      role VARCHAR(50) NOT NULL CHECK (role IN ('ADMIN', 'VENDOR', 'BRANCH')),
      branch_id INT REFERENCES branches(id) ON DELETE SET NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS atm_issue_types (
      id SERIAL PRIMARY KEY,
      name VARCHAR(120) NOT NULL UNIQUE,
      response_target_minutes INT NOT NULL CHECK (response_target_minutes > 0),
      resolution_target_minutes INT NOT NULL CHECK (resolution_target_minutes > 0),
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await db.query('ALTER TABLE atm_issue_types ALTER COLUMN response_target_minutes DROP NOT NULL');
  await db.query('ALTER TABLE atm_issue_types ALTER COLUMN resolution_target_minutes DROP NOT NULL');
  await db.query(`
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
      resolution_notes TEXT,
      created_by INT REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CHECK (vendor_response_at IS NULL OR vendor_response_at >= reported_at),
      CHECK (resolved_at IS NULL OR resolved_at >= reported_at),
      CHECK (resolved_at IS NULL OR vendor_response_at IS NULL OR resolved_at >= vendor_response_at)
    )
  `);
  await db.query("ALTER TABLE atm_issues ADD COLUMN IF NOT EXISTS severity VARCHAR(10) NOT NULL DEFAULT 'MAJOR' CHECK (severity IN ('CRITICAL', 'MAJOR', 'MINOR'))");
  await db.query("ALTER TABLE atm_issues ADD COLUMN IF NOT EXISTS zone VARCHAR(10) CHECK (zone IN ('ZONE_1', 'ZONE_2'))");
  await db.query('ALTER TABLE atm_issues ADD COLUMN IF NOT EXISTS response_target_hours NUMERIC(8, 4) CHECK (response_target_hours > 0 AND response_target_hours <= 8760)');
  await db.query('ALTER TABLE atm_issues ADD COLUMN IF NOT EXISTS resolution_target_hours NUMERIC(8, 4) CHECK (resolution_target_hours > 0 AND resolution_target_hours <= 8760)');
  await db.query('ALTER TABLE atm_issues ALTER COLUMN response_target_hours TYPE NUMERIC(8, 4) USING response_target_hours::numeric');
  await db.query('ALTER TABLE atm_issues ALTER COLUMN resolution_target_hours TYPE NUMERIC(8, 4) USING resolution_target_hours::numeric');
  await db.query('ALTER TABLE atm_issues DROP CONSTRAINT IF EXISTS atm_issues_response_target_hours_check');
  await db.query('ALTER TABLE atm_issues DROP CONSTRAINT IF EXISTS atm_issues_resolution_target_hours_check');
  await db.query('ALTER TABLE atm_issues ADD CONSTRAINT atm_issues_response_target_hours_check CHECK (response_target_hours > 0 AND response_target_hours <= 8760)');
  await db.query('ALTER TABLE atm_issues ADD CONSTRAINT atm_issues_resolution_target_hours_check CHECK (resolution_target_hours > 0 AND resolution_target_hours <= 8760)');
  await db.query(`
    UPDATE atm_issues i
    SET zone = a.zone
    FROM atms a
    WHERE i.terminal_id = a.terminal_id AND i.zone IS NULL AND a.zone IS NOT NULL
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS atm_issue_sla_settings (
      zone VARCHAR(10) NOT NULL CHECK (zone IN ('ZONE_1', 'ZONE_2')),
      severity VARCHAR(10) NOT NULL CHECK (severity IN ('CRITICAL', 'MAJOR', 'MINOR')),
      response_target_minutes INT CHECK (response_target_minutes BETWEEN 1 AND 525600),
      resolution_target_minutes INT CHECK (resolution_target_minutes BETWEEN 1 AND 525600),
      response_target_hours NUMERIC(8, 4) CHECK (response_target_hours > 0 AND response_target_hours <= 8760),
      resolution_target_hours NUMERIC(8, 4) CHECK (resolution_target_hours > 0 AND resolution_target_hours <= 8760),
      PRIMARY KEY (zone, severity)
    )
  `);
  await db.query('ALTER TABLE atm_issue_sla_settings ADD COLUMN IF NOT EXISTS response_target_hours NUMERIC(8, 4) CHECK (response_target_hours > 0 AND response_target_hours <= 8760)');
  await db.query('ALTER TABLE atm_issue_sla_settings ADD COLUMN IF NOT EXISTS resolution_target_hours NUMERIC(8, 4) CHECK (resolution_target_hours > 0 AND resolution_target_hours <= 8760)');
  await db.query('ALTER TABLE atm_issue_sla_settings ALTER COLUMN response_target_hours TYPE NUMERIC(8, 4) USING response_target_hours::numeric');
  await db.query('ALTER TABLE atm_issue_sla_settings ALTER COLUMN resolution_target_hours TYPE NUMERIC(8, 4) USING resolution_target_hours::numeric');
  await db.query('ALTER TABLE atm_issue_sla_settings DROP CONSTRAINT IF EXISTS atm_issue_sla_settings_response_target_hours_check');
  await db.query('ALTER TABLE atm_issue_sla_settings DROP CONSTRAINT IF EXISTS atm_issue_sla_settings_resolution_target_hours_check');
  await db.query('ALTER TABLE atm_issue_sla_settings ADD CONSTRAINT atm_issue_sla_settings_response_target_hours_check CHECK (response_target_hours > 0 AND response_target_hours <= 8760)');
  await db.query('ALTER TABLE atm_issue_sla_settings ADD CONSTRAINT atm_issue_sla_settings_resolution_target_hours_check CHECK (resolution_target_hours > 0 AND resolution_target_hours <= 8760)');
  await db.query(`
    INSERT INTO atm_issue_sla_settings (zone, severity)
    SELECT zone, severity
    FROM unnest(ARRAY['ZONE_1', 'ZONE_2']) AS zones(zone)
    CROSS JOIN unnest(ARRAY['CRITICAL', 'MAJOR', 'MINOR']) AS severities(severity)
    ON CONFLICT (zone, severity) DO NOTHING
  `);
  await db.query(`
    UPDATE atm_issue_sla_settings
    SET response_target_hours = ROUND(response_target_minutes / 60.0, 4),
        resolution_target_hours = ROUND(resolution_target_minutes / 60.0, 4)
    WHERE response_target_hours IS NULL OR resolution_target_hours IS NULL
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS atm_issue_policy (
      id BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id),
      business_days SMALLINT[] NOT NULL DEFAULT ARRAY[1, 2, 3, 4, 5]::smallint[],
      business_start TIME NOT NULL DEFAULT '08:00',
      business_end TIME NOT NULL DEFAULT '17:00',
      CHECK (business_start < business_end),
      CHECK (cardinality(business_days) > 0)
    )
  `);
  await db.query('INSERT INTO atm_issue_policy (id) VALUES (TRUE) ON CONFLICT (id) DO NOTHING');
  await db.query(`
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
    $$
  `);
  await db.query('ALTER TABLE atm_issues ADD COLUMN IF NOT EXISTS response_due_at TIMESTAMP');
  await db.query('ALTER TABLE atm_issues ADD COLUMN IF NOT EXISTS resolution_due_at TIMESTAMP');
  await db.query(`
    UPDATE atm_issues
    SET response_target_hours = COALESCE(response_target_hours, ROUND(response_target_minutes / 60.0, 4)),
        resolution_target_hours = COALESCE(resolution_target_hours, ROUND(resolution_target_minutes / 60.0, 4))
  `);
  await db.query(`
    UPDATE atm_issues
    SET response_due_at = atm_add_business_minutes(reported_at, COALESCE(ROUND(response_target_hours * 60)::int, response_target_minutes)),
        resolution_due_at = atm_add_business_minutes(reported_at, COALESCE(ROUND(resolution_target_hours * 60)::int, resolution_target_minutes))
    WHERE response_due_at IS NULL OR resolution_due_at IS NULL
  `);
  await db.query('CREATE INDEX IF NOT EXISTS idx_atm_issues_reported_at ON atm_issues(reported_at)');
  await db.query('CREATE INDEX IF NOT EXISTS idx_atm_issues_terminal_reported ON atm_issues(terminal_id, reported_at)');
  await db.query(`
    CREATE TABLE IF NOT EXISTS atm_monthly_vendor_fees (
      terminal_id VARCHAR(50) NOT NULL REFERENCES atms(terminal_id) ON DELETE CASCADE,
      fee_month DATE NOT NULL,
      monthly_fee NUMERIC(12, 2) NOT NULL CHECK (monthly_fee >= 0),
      currency VARCHAR(8) NOT NULL DEFAULT 'ETB',
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (terminal_id, fee_month),
      CHECK (EXTRACT(DAY FROM fee_month) = 1)
    )
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS atm_terminal_vendor_fees (
      terminal_id VARCHAR(50) PRIMARY KEY REFERENCES atms(terminal_id) ON DELETE CASCADE,
      monthly_fee NUMERIC(12, 2) NOT NULL CHECK (monthly_fee >= 0),
      currency VARCHAR(8) NOT NULL DEFAULT 'ETB',
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await db.query(`
    INSERT INTO atm_terminal_vendor_fees (terminal_id, monthly_fee, currency, updated_at)
    SELECT DISTINCT ON (terminal_id) terminal_id, monthly_fee, currency, updated_at
    FROM atm_monthly_vendor_fees
    ORDER BY terminal_id, fee_month DESC, updated_at DESC
    ON CONFLICT (terminal_id) DO NOTHING
  `);
  await db.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(254)');

  const emailColumn = await db.query(
    `SELECT is_nullable
     FROM information_schema.columns
     WHERE table_schema = current_schema()
       AND table_name = 'users'
       AND column_name = 'email'`
  );
  if (emailColumn.rows[0]?.is_nullable === 'YES') {
    await db.query(
      `INSERT INTO users (username, password, full_name, role, branch_id)
       VALUES
         ('admin', $1, 'Central IT Admin', 'ADMIN', NULL),
         ('moti_tech', $2, 'Abebe Kebede (Moti)', 'VENDOR', NULL),
         ('branch_main', $3, 'Main Branch Officer', 'BRANCH',
           (SELECT id FROM branches WHERE branch_code = 'BR-001'))
       ON CONFLICT (username) DO NOTHING`,
      [
        '$2b$12$a/c3bTaDYA8cYT3lDtOApOcHr/BFWdaFQOUovTjMgufsHSdENaH0O',
        '$2b$12$wu/DRXwjuWgn4oFwaIHTB.ofnsDi8kW5yX.xmbEVfcLY9pm8I4LOW',
        '$2b$12$BHlqacpSyXa/oxqUlvU4tuLn5pp7ZVrH/8u7D/QpVMUIsTdL5h9D6',
      ]
    );
  } else {
    const missingSeedUsers = await db.query(
      `SELECT seeded.username
       FROM (VALUES ('admin'), ('moti_tech'), ('branch_main')) AS seeded(username)
       WHERE NOT EXISTS (
         SELECT 1 FROM users WHERE users.username = seeded.username
       )`
    );
    if (missingSeedUsers.rowCount) {
      console.warn(
        `Skipping demo account seeding because users.email is required. Missing account(s): ${missingSeedUsers.rows.map((row) => row.username).join(', ')}`
      );
    }
  }

  await db.query(`
    CREATE TABLE IF NOT EXISTS user_atms (
      user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      terminal_id VARCHAR(50) NOT NULL REFERENCES atms(terminal_id) ON DELETE CASCADE,
      PRIMARY KEY (user_id, terminal_id)
    )
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS app_migrations (
      id VARCHAR(100) PRIMARY KEY,
      applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const missingEmails = await db.query(
    "SELECT COUNT(*)::int AS count FROM users WHERE email IS NULL OR BTRIM(email) = ''"
  );
  if (missingEmails.rows[0].count === 0) {
    await db.query('ALTER TABLE users ALTER COLUMN email SET NOT NULL');
  } else {
    console.warn(
      `${missingEmails.rows[0].count} user account(s) need email addresses. Update them in User Accounts before email notifications can be sent.`
    );
  }

  const terminalScopeMigration = await db.query(
    "SELECT id FROM app_migrations WHERE id = 'branch_user_terminal_scope'"
  );
  if (!terminalScopeMigration.rowCount) {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO user_atms (user_id, terminal_id)
         SELECT u.id, a.terminal_id
         FROM users u
         JOIN atms a ON a.branch_id = u.branch_id
         WHERE u.role = 'BRANCH'
         ON CONFLICT DO NOTHING`
      );
      await client.query("INSERT INTO app_migrations (id) VALUES ('branch_user_terminal_scope')");
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
};
