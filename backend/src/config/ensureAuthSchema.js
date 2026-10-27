const db = require('./db');

module.exports = async function ensureAuthSchema() {
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
