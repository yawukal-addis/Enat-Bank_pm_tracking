const db = require('../config/db');
const { randomBytes } = require('crypto');
const bcrypt = require('bcryptjs');
const ExcelJS = require('exceljs');
const { notifySchedule } = require('../services/pmEmailNotifications');

function normalizeEmail(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function isValidEmail(email) {
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function normalizeTerminalIds(value) {
  if (!Array.isArray(value) || value.some((id) => typeof id !== 'string' || !id.trim())) return null;
  return [...new Set(value.map((id) => id.trim()))];
}

async function resolveBranchTerminals(client, terminalIds, expectedBranchId) {
  const terminals = await client.query(
    `SELECT terminal_id, branch_id
     FROM atms
     WHERE terminal_id = ANY($1::varchar[]) AND is_active = TRUE`,
    [terminalIds]
  );
  if (terminals.rowCount !== terminalIds.length) {
    const error = new Error('One or more selected terminal IDs are not registered and active');
    error.status = 400;
    throw error;
  }
  const branchIds = [...new Set(terminals.rows.map((terminal) => terminal.branch_id))];
  if (branchIds.length !== 1) {
    const error = new Error('A branch user can only be assigned terminals from one branch');
    error.status = 400;
    throw error;
  }
  if (expectedBranchId !== undefined && expectedBranchId !== null &&
      String(branchIds[0]) !== String(expectedBranchId)) {
    const error = new Error('Selected terminal IDs do not belong to the selected branch ID');
    error.status = 400;
    throw error;
  }
  return branchIds[0];
}

async function replaceUserTerminals(client, userId, terminalIds) {
  await client.query('DELETE FROM user_atms WHERE user_id = $1', [userId]);
  if (terminalIds.length) {
    await client.query(
      `INSERT INTO user_atms (user_id, terminal_id)
       SELECT $1, assigned.terminal_id FROM unnest($2::varchar[]) AS assigned(terminal_id)`,
      [userId, terminalIds]
    );
  }
}

function cellText(value) {
  if (typeof value === 'string' || typeof value === 'number') return String(value).trim();
  if (value && typeof value === 'object') {
    if (typeof value.text === 'string') return value.text.trim();
    if (typeof value.result === 'string' || typeof value.result === 'number') return String(value.result).trim();
  }
  return '';
}

function scheduleDate(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === 'number' && Number.isFinite(value) && value >= 1) {
    const date = new Date(Date.UTC(1899, 11, 30) + Math.floor(value) * 86400000);
    return date.toISOString().slice(0, 10);
  }
  const text = cellText(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  const date = new Date(`${text}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === text ? text : null;
}

exports.createBranch = async (req, res) => {
  const { branch_code, branch_name, region } = req.body;
  if (!branch_name?.trim()) return res.status(400).json({ error: 'Branch name is required' });
  try {
    const code = branch_code?.trim() || `BR-${Date.now().toString(36).toUpperCase()}`;
    const result = await db.query(
      'INSERT INTO branches (branch_code, branch_name, region) VALUES ($1, $2, $3) RETURNING *',
      [code, branch_name.trim(), region?.trim() || 'Addis Ababa']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(err.code === '23505' ? 409 : 500).json({ error: err.code === '23505' ? 'Branch code or name already exists' : 'Failed to create branch' });
  }
};

exports.createAtm = async (req, res) => {
  const { terminal_id, branch_id, model } = req.body;
  if (!terminal_id?.trim() || !branch_id) return res.status(400).json({ error: 'Terminal ID and branch are required' });
  try {
    const result = await db.query(
      'INSERT INTO atms (terminal_id, branch_id, model) VALUES ($1, $2, $3) RETURNING *',
      [terminal_id.trim(), branch_id, model?.trim() || 'NCR SelfServ 84']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(err.code === '23505' ? 409 : err.code === '23503' ? 400 : 500).json({ error: err.code === '23505' ? 'Terminal ID already exists' : 'Failed to register ATM' });
  }
};

exports.createBranchAndAtm = async (req, res) => {
  const { branch_code, branch_name, region, terminal_id, model } = req.body;
  if (!branch_name?.trim() || !terminal_id?.trim()) return res.status(400).json({ error: 'Branch name and terminal ID are required' });
  const normalizedBranchName = branch_name.trim().replace(/\s+/g, ' ');
  const normalizedTerminalId = terminal_id.trim();
  let client;
  try {
    client = await db.pool.connect();
    await client.query('BEGIN');
    const existing = await client.query('SELECT id FROM branches WHERE LOWER(branch_name) = LOWER($1) FOR UPDATE', [normalizedBranchName]);
    let branchId;
    if (existing.rowCount) {
      branchId = existing.rows[0].id;
      await client.query('UPDATE branches SET region = $1 WHERE id = $2', [region?.trim() || 'Addis Ababa', branchId]);
    } else {
      const code = branch_code?.trim() || `BR-${randomBytes(4).toString('hex').toUpperCase()}`;
      const created = await client.query(
        `INSERT INTO branches (branch_code, branch_name, region)
         VALUES ($1, $2, $3)
         RETURNING id`,
        [code, normalizedBranchName, region?.trim() || 'Addis Ababa']
      );
      branchId = created.rows[0].id;
    }
    const terminal = await client.query(
      `INSERT INTO atms (terminal_id, branch_id, model)
       VALUES ($1, $2, $3)
       ON CONFLICT (terminal_id) DO UPDATE SET model = EXCLUDED.model
         WHERE atms.branch_id = EXCLUDED.branch_id
       RETURNING id`,
      [normalizedTerminalId, branchId, model?.trim() || 'NCR SelfServ 84']
    );
    if (!terminal.rowCount) {
      const error = new Error('This terminal ID is already registered to another branch. Enter a unique terminal ID.');
      error.status = 409;
      throw error;
    }
    await client.query('COMMIT');
    res.status(201).json({ message: 'Branch and ATM terminal registered successfully', branch_id: branchId, terminal_id: normalizedTerminalId });
  } catch (err) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    console.error('Branch and terminal registration failed:', err);
    const status = err.status || (err.code === '23505' ? 409 : 500);
    const message = err.status ? err.message
      : err.code === '23505' ? 'That branch code or terminal ID is already in use. Check the values and try again.'
      : 'Could not save the branch and terminal. Check the server connection and try again.';
    res.status(status).json({ error: message });
  } finally {
    client?.release();
  }
};

exports.getUsers = async (_req, res) => {
  try {
    const result = await db.query(
      `SELECT u.id, u.username, u.full_name, u.email, u.role, u.branch_id, b.branch_name,
              COALESCE(
                (SELECT array_agg(ua.terminal_id ORDER BY ua.terminal_id)
                 FROM user_atms ua WHERE ua.user_id = u.id),
                ARRAY[]::varchar[]
              ) AS terminal_ids
       FROM users u
       LEFT JOIN branches b ON u.branch_id = b.id
       ORDER BY u.id`
    );
    res.json(result.rows);
  } catch (_err) { res.status(500).json({ error: 'Failed to fetch users' }); }
};

exports.createUser = async (req, res) => {
  const { username, password, full_name, role } = req.body;
  const email = normalizeEmail(req.body.email);
  const terminalIds = role === 'BRANCH' ? normalizeTerminalIds(req.body.terminal_ids) : [];
  if (typeof username !== 'string' || !username.trim() ||
      typeof password !== 'string' || password.length < 8 ||
      typeof full_name !== 'string' || !full_name.trim() ||
      !isValidEmail(email) ||
      !['ADMIN', 'VENDOR', 'BRANCH'].includes(role) ||
      (role === 'BRANCH' && (!terminalIds || !terminalIds.length))) {
    return res.status(400).json({ error: 'Enter a username, full name, valid email address, password of at least 8 characters, valid role, and at least one terminal for branch accounts' });
  }
  let client;
  try {
    client = await db.pool.connect();
    const passwordHash = await bcrypt.hash(password, 12);
    await client.query('BEGIN');
    const branchId = role === 'BRANCH'
      ? await resolveBranchTerminals(client, terminalIds, req.body.branch_id)
      : null;
    const result = await client.query(
      `INSERT INTO users (username, password, full_name, email, role, branch_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, username, full_name, email, role, branch_id`,
      [username.trim(), passwordHash, full_name.trim(), email, role, branchId]
    );
    await replaceUserTerminals(client, result.rows[0].id, terminalIds);
    await client.query('COMMIT');
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    if (err.status) return res.status(err.status).json({ error: err.message });
    if (err.code === '23505') return res.status(409).json({ error: 'Username already exists' });
    console.error('Failed to create user account:', err);
    res.status(500).json({ error: 'Failed to create user' });
  } finally {
    client?.release();
  }
};

exports.downloadScheduleTemplate = async (_req, res) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('PM Schedule');
    sheet.columns = [
      { header: 'Branch Name', key: 'branch_name', width: 32 },
      { header: 'Terminal ID', key: 'terminal_id', width: 20 },
      { header: 'Scheduled Date', key: 'scheduled_date', width: 20 },
    ];
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3730A3' } };
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
    const buffer = await workbook.xlsx.writeBuffer();
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="pm-schedule-template.xlsx"',
    });
    res.send(Buffer.from(buffer));
  } catch (err) {
    console.error('Failed to generate schedule template:', err);
    res.status(500).json({ error: 'Failed to generate schedule template' });
  }
};

exports.importScheduleWorkbook = async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Choose an Excel .xlsx schedule file to import' });
  if (!req.file.originalname.toLowerCase().endsWith('.xlsx')) {
    return res.status(400).json({ error: 'Only .xlsx Excel files are supported' });
  }

  let workbook;
  try {
    workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);
  } catch (_err) {
    return res.status(400).json({ error: 'Could not read this workbook. Upload a valid .xlsx file.' });
  }

  const sheet = workbook.worksheets[0];
  if (!sheet || sheet.rowCount < 2) {
    return res.status(400).json({ error: 'The first worksheet must contain a header row and at least one schedule row' });
  }
  if (sheet.rowCount > 501) {
    return res.status(400).json({ error: 'A workbook can contain at most 500 schedule rows per import' });
  }

  const headerIndexes = new Map();
  sheet.getRow(1).eachCell((cell, column) => {
    headerIndexes.set(cellText(cell.value).toLowerCase(), column);
  });
  const requiredHeaders = ['branch name', 'terminal id', 'scheduled date'];
  const missingHeaders = requiredHeaders.filter((header) => !headerIndexes.has(header));
  if (missingHeaders.length) {
    return res.status(400).json({ error: `Missing required column(s): ${missingHeaders.join(', ')}` });
  }

  const rows = [];
  const errors = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const branchName = cellText(row.getCell(headerIndexes.get('branch name')).value);
    const terminalId = cellText(row.getCell(headerIndexes.get('terminal id')).value);
    const scheduledDate = scheduleDate(row.getCell(headerIndexes.get('scheduled date')).value);
    if (!branchName && !terminalId && !row.getCell(headerIndexes.get('scheduled date')).value) return;
    if (!branchName || !terminalId || !scheduledDate) {
      errors.push(`Row ${rowNumber}: branch name, terminal ID, and a valid scheduled date are required`);
      return;
    }
    rows.push({ rowNumber, branchName, terminalId, scheduledDate });
  });
  if (rows.length > 500) {
    return res.status(400).json({ error: 'A workbook can contain at most 500 schedule rows per import' });
  }
  if (!rows.length && !errors.length) {
    return res.status(400).json({ error: 'The worksheet contains no schedule rows' });
  }

  const rowKeys = new Set();
  for (const row of rows) {
    const key = `${row.terminalId.toUpperCase()}|${row.scheduledDate}`;
    if (rowKeys.has(key)) errors.push(`Row ${row.rowNumber}: duplicate terminal and schedule date in this workbook`);
    rowKeys.add(key);
  }
  if (errors.length) return res.status(400).json({ error: errors.slice(0, 20).join('; ') });

  let client;
  try {
    client = await db.pool.connect();
    await client.query('BEGIN');
    const terminalKeys = [...new Set(rows.map((row) => row.terminalId.toUpperCase()))];
    const terminals = await client.query(
      `SELECT a.terminal_id, b.branch_name
       FROM atms a
       JOIN branches b ON b.id = a.branch_id
       WHERE UPPER(a.terminal_id) = ANY($1::varchar[]) AND a.is_active = TRUE
       FOR SHARE OF a`,
      [terminalKeys]
    );
    const terminalsById = new Map(terminals.rows.map((terminal) => [terminal.terminal_id.toUpperCase(), terminal]));
    const mappingErrors = [];
    for (const row of rows) {
      const terminal = terminalsById.get(row.terminalId.toUpperCase());
      if (!terminal) {
        mappingErrors.push(`Row ${row.rowNumber}: terminal ${row.terminalId} is not a registered active terminal`);
      } else if (terminal.branch_name.trim().toLowerCase() !== row.branchName.trim().toLowerCase()) {
        mappingErrors.push(`Row ${row.rowNumber}: terminal ${row.terminalId} belongs to ${terminal.branch_name}, not ${row.branchName}`);
      }
    }
    if (mappingErrors.length) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: mappingErrors.slice(0, 20).join('; ') });
    }

    let imported = 0;
    let skipped = 0;
    const importedVisitIds = [];
    for (const row of rows) {
      const terminalId = terminalsById.get(row.terminalId.toUpperCase()).terminal_id;
      await client.query(
        'SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))',
        [terminalId, row.scheduledDate]
      );
      const existing = await client.query(
        'SELECT id FROM pm_visits WHERE terminal_id = $1 AND scheduled_date = $2::date LIMIT 1',
        [terminalId, row.scheduledDate]
      );
      if (existing.rowCount) {
        skipped += 1;
        continue;
      }
      const inserted = await client.query(
        'INSERT INTO pm_visits (terminal_id, scheduled_date) VALUES ($1, $2::date) RETURNING id',
        [terminalId, row.scheduledDate]
      );
      importedVisitIds.push(inserted.rows[0].id);
      imported += 1;
    }
    await client.query('COMMIT');
    let failedNotifications = 0;
    for (const visitId of importedVisitIds) {
      try {
        await notifySchedule(visitId, 'created');
      } catch (err) {
        failedNotifications += 1;
        console.error(`Email notification failed for imported schedule ${visitId}:`, err);
      }
    }
    res.json({
      message: 'Schedule import completed',
      imported,
      skipped,
      ...(failedNotifications
        ? { email_warning: `The schedules were imported, but email notifications failed for ${failedNotifications} schedule(s). Check SMTP settings and backend logs.` }
        : {}),
    });
  } catch (err) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    console.error('Schedule workbook import failed:', err);
    res.status(500).json({ error: 'Failed to import schedule. No workbook rows were saved.' });
  } finally {
    client?.release();
  }
};

exports.updateUser = async (req, res) => {
  const userId = Number(req.params.id);
  const { username, full_name, role, password } = req.body;
  const email = normalizeEmail(req.body.email);
  const terminalIds = role === 'BRANCH' ? normalizeTerminalIds(req.body.terminal_ids) : [];
  if (!Number.isInteger(userId) || userId < 1 ||
      typeof username !== 'string' || !username.trim() ||
      typeof full_name !== 'string' || !full_name.trim() ||
      !isValidEmail(email) ||
      !['ADMIN', 'VENDOR', 'BRANCH'].includes(role) ||
      (role === 'BRANCH' && (!terminalIds || !terminalIds.length)) ||
      (password !== undefined && (typeof password !== 'string' || password.length < 8))) {
    return res.status(400).json({ error: 'Enter a username, full name, valid email address, valid role, at least one terminal for branch accounts, and a password of at least 8 characters when changing it' });
  }

  let client;
  try {
    client = await db.pool.connect();
    await client.query('BEGIN');
    const existing = await client.query('SELECT id FROM users WHERE id = $1 FOR UPDATE', [userId]);
    if (!existing.rowCount) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'User account not found' });
    }
    const branchId = role === 'BRANCH'
      ? await resolveBranchTerminals(client, terminalIds, req.body.branch_id)
      : null;
    const params = [username.trim(), full_name.trim(), email, role, branchId, userId];
    let passwordClause = '';
    if (password) {
      params.push(await bcrypt.hash(password, 12));
      passwordClause = `, password = $${params.length}`;
    }
    const result = await client.query(
      `UPDATE users
       SET username = $1, full_name = $2, email = $3, role = $4, branch_id = $5${passwordClause}
       WHERE id = $6
       RETURNING id, username, full_name, email, role, branch_id`,
      params
    );
    await replaceUserTerminals(client, userId, terminalIds);
    const missingEmails = await client.query(
      "SELECT COUNT(*)::int AS count FROM users WHERE email IS NULL OR BTRIM(email) = ''"
    );
    if (missingEmails.rows[0].count === 0) {
      await client.query('ALTER TABLE users ALTER COLUMN email SET NOT NULL');
    }
    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    if (err.status) return res.status(err.status).json({ error: err.message });
    if (err.code === '23505') return res.status(409).json({ error: 'Username already exists' });
    if (err.code === '23503') return res.status(400).json({ error: 'Selected branch does not exist' });
    console.error('Failed to update user account:', err);
    res.status(500).json({ error: 'Failed to update user account' });
  } finally {
    client.release();
  }
};

exports.deleteUser = async (req, res) => {
  const userId = Number(req.params.id);
  if (!Number.isInteger(userId) || userId < 1) {
    return res.status(400).json({ error: 'Invalid user ID' });
  }
  if (userId === req.user.id) {
    return res.status(400).json({ error: 'You cannot delete your own account' });
  }

  try {
    const target = await db.query('SELECT role FROM users WHERE id = $1', [userId]);
    if (!target.rowCount) return res.status(404).json({ error: 'User account not found' });
    if (target.rows[0].role === 'ADMIN') {
      const admins = await db.query("SELECT COUNT(*)::int AS count FROM users WHERE role = 'ADMIN'");
      if (admins.rows[0].count <= 1) {
        return res.status(409).json({ error: 'The last administrator account cannot be deleted' });
      }
    }

    await db.query('DELETE FROM users WHERE id = $1', [userId]);
    res.json({ message: 'User account deleted successfully' });
  } catch (err) {
    console.error('Failed to delete user account:', err);
    res.status(500).json({ error: 'Failed to delete user account' });
  }
};

exports.deleteAtm = async (req, res) => {
  try {
    const result = await db.query('DELETE FROM atms WHERE id = $1 RETURNING id', [req.params.id]);
    if (!result.rowCount) return res.status(404).json({ error: 'ATM terminal not found' });
    res.json({ message: 'Terminal deleted successfully' });
  } catch (_err) { res.status(500).json({ error: 'Failed to delete terminal' }); }
};
