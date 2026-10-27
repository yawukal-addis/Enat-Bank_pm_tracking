const db = require('../config/db');
const {
  notifySchedule,
  notifyVendorCompleted,
  notifyBranchDecision,
} = require('../services/pmEmailNotifications');

async function getEmailWarning(event, notification) {
  try {
    await notification();
    return null;
  } catch (err) {
    console.error(`Email notification failed after ${event}:`, err);
    return 'The change was saved, but email notification could not be sent. Check SMTP settings and backend logs.';
  }
}

// Get all PM visits with filter options
exports.getAllVisits = async (req, res) => {
  try {
    const { branch_id, status } = req.query;
    let queryText = `
      SELECT p.*, a.branch_id, b.branch_name, b.branch_code
      FROM pm_visits p
      JOIN atms a ON p.terminal_id = a.terminal_id
      JOIN branches b ON a.branch_id = b.id
    `;
    const params = [];
    const conditions = [];

    if (req.user.role === 'BRANCH') {
      params.push(req.user.terminal_ids);
      conditions.push(`p.terminal_id = ANY($${params.length}::varchar[])`);
    } else if (branch_id) {
      params.push(branch_id);
      conditions.push(`a.branch_id = $${params.length}`);
    }

    if (status) {
      params.push(status);
      conditions.push(`p.status = $${params.length}`);
    }

    if (conditions.length > 0) {
      queryText += ' WHERE ' + conditions.join(' AND ');
    }

    queryText += ' ORDER BY p.scheduled_date DESC, p.id DESC';

    const result = await db.query(queryText, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database server error' });
  }
};

// Create a new PM schedule (Admin)
exports.createSchedule = async (req, res) => {
  const { terminal_id, scheduled_date, vendor_name } = req.body;
  if (typeof terminal_id !== 'string' || !terminal_id.trim() ||
      !/^\d{4}-\d{2}-\d{2}$/.test(scheduled_date || '') ||
      Number.isNaN(Date.parse(`${scheduled_date}T00:00:00Z`)) ||
      new Date(`${scheduled_date}T00:00:00Z`).toISOString().slice(0, 10) !== scheduled_date) {
    return res.status(400).json({ error: 'A terminal ID and valid scheduled date are required' });
  }
  try {
    const atm = await db.query(
      'SELECT id FROM atms WHERE terminal_id = $1 AND is_active = TRUE',
      [terminal_id.trim()]
    );
    if (!atm.rowCount) return res.status(400).json({ error: 'Selected terminal is not registered and active' });
    const duplicate = await db.query(
      'SELECT id FROM pm_visits WHERE terminal_id = $1 AND scheduled_date = $2::date',
      [terminal_id.trim(), scheduled_date]
    );
    if (duplicate.rowCount) return res.status(409).json({ error: 'A schedule already exists for this terminal and date' });
    const result = await db.query(
      `INSERT INTO pm_visits (terminal_id, scheduled_date, vendor_name)
       VALUES ($1, $2, $3) RETURNING *`,
      [terminal_id.trim(), scheduled_date, vendor_name || 'Moti Engineering']
    );
    const emailWarning = await getEmailWarning(
      'creating a PM schedule',
      () => notifySchedule(result.rows[0].id, 'created')
    );
    res.status(201).json({
      ...result.rows[0],
      ...(emailWarning ? { email_warning: emailWarning } : {}),
    });
  } catch (err) {
    console.error(err);
    res.status(err.code === '23503' ? 400 : 500).json({ error: err.code === '23503' ? 'ATM terminal not found' : 'Failed to create PM schedule' });
  }
};

exports.updateSchedule = async (req, res) => {
  const visitId = Number(req.params.id);
  const { terminal_id, scheduled_date } = req.body;
  if (!Number.isInteger(visitId) || visitId < 1 ||
      typeof terminal_id !== 'string' || !terminal_id.trim() ||
      !/^\d{4}-\d{2}-\d{2}$/.test(scheduled_date || '') ||
      Number.isNaN(Date.parse(`${scheduled_date}T00:00:00Z`)) ||
      new Date(`${scheduled_date}T00:00:00Z`).toISOString().slice(0, 10) !== scheduled_date) {
    return res.status(400).json({ error: 'A valid schedule ID, terminal ID, and scheduled date are required' });
  }

  try {
    const atm = await db.query(
      'SELECT id FROM atms WHERE terminal_id = $1 AND is_active = TRUE',
      [terminal_id.trim()]
    );
    if (!atm.rowCount) return res.status(400).json({ error: 'Selected terminal is not registered and active' });

    const duplicate = await db.query(
      `SELECT id FROM pm_visits
       WHERE terminal_id = $1 AND scheduled_date = $2::date AND id <> $3`,
      [terminal_id.trim(), scheduled_date, visitId]
    );
    if (duplicate.rowCount) return res.status(409).json({ error: 'A schedule already exists for this terminal and date' });

    const updated = await db.query(
      `UPDATE pm_visits
       SET terminal_id = $1, scheduled_date = $2::date
       WHERE id = $3 AND status = 'SCHEDULED'
       RETURNING *`,
      [terminal_id.trim(), scheduled_date, visitId]
    );
    if (!updated.rowCount) {
      const existing = await db.query('SELECT status FROM pm_visits WHERE id = $1', [visitId]);
      return res.status(existing.rowCount ? 409 : 404).json({
        error: existing.rowCount ? 'Only scheduled visits can be edited' : 'Schedule not found'
      });
    }
    const emailWarning = await getEmailWarning(
      'updating a PM schedule',
      () => notifySchedule(updated.rows[0].id, 'updated')
    );
    res.json({
      ...updated.rows[0],
      ...(emailWarning ? { email_warning: emailWarning } : {}),
    });
  } catch (err) {
    console.error('Failed to update PM schedule:', err);
    res.status(500).json({ error: 'Failed to update PM schedule' });
  }
};

exports.deleteSchedule = async (req, res) => {
  const visitId = Number(req.params.id);
  if (!Number.isInteger(visitId) || visitId < 1) {
    return res.status(400).json({ error: 'Invalid schedule ID' });
  }

  try {
    const deleted = await db.query(
      `DELETE FROM pm_visits
       WHERE id = $1 AND status = 'SCHEDULED'
       RETURNING id`,
      [visitId]
    );
    if (!deleted.rowCount) {
      const existing = await db.query('SELECT status FROM pm_visits WHERE id = $1', [visitId]);
      return res.status(existing.rowCount ? 409 : 404).json({
        error: existing.rowCount ? 'Only scheduled visits can be deleted' : 'Schedule not found'
      });
    }
    res.json({ message: 'Schedule deleted successfully' });
  } catch (err) {
    console.error('Failed to delete PM schedule:', err);
    res.status(500).json({ error: 'Failed to delete PM schedule' });
  }
};

// Vendor marks visit as completed
exports.vendorComplete = async (req, res) => {
  const { id } = req.params;
  const { vendor_technician, vendor_notes } = req.body;
  if (!vendor_technician?.trim() || !vendor_notes?.trim()) return res.status(400).json({ error: 'Technician name and maintenance notes are required' });
  try {
    const result = await db.query(
      `UPDATE pm_visits
       SET status = 'VENDOR_COMPLETED',
           vendor_technician = $1,
           vendor_notes = $2,
           vendor_completed_at = CURRENT_TIMESTAMP
       WHERE id = $3 AND status = 'SCHEDULED' RETURNING *`,
      [vendor_technician, vendor_notes, id]
    );
    if (result.rows.length === 0) {
      const exists = await db.query('SELECT id FROM pm_visits WHERE id = $1', [id]);
      return res.status(exists.rowCount ? 409 : 404).json({ error: exists.rowCount ? 'Visit is no longer scheduled' : 'Visit record not found' });
    }
    const emailWarning = await getEmailWarning(
      'marking maintenance complete',
      () => notifyVendorCompleted(result.rows[0].id)
    );
    res.json({
      ...result.rows[0],
      ...(emailWarning ? { email_warning: emailWarning } : {}),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update vendor completion' });
  }
};

// Branch confirms or disputes visit
exports.branchConfirm = async (req, res) => {
  const { id } = req.params;
  const { status, cleanliness_rating, branch_remarks } = req.body;

  if (!['BRANCH_CONFIRMED', 'BRANCH_DISPUTED'].includes(status)) {
    return res.status(400).json({ error: 'Invalid confirmation status' });
  }
  if (status === 'BRANCH_CONFIRMED' && (!Number.isInteger(Number(cleanliness_rating)) || Number(cleanliness_rating) < 1 || Number(cleanliness_rating) > 5)) {
    return res.status(400).json({ error: 'A cleanliness rating from 1 to 5 is required to confirm' });
  }

  try {
    const result = await db.query(
      `UPDATE pm_visits
       SET status = $1,
           cleanliness_rating = $2,
           branch_remarks = $3,
           branch_confirmed_by = $4,
           branch_confirmed_at = CURRENT_TIMESTAMP
       WHERE id = $5 AND status = 'VENDOR_COMPLETED'
         AND EXISTS (
           SELECT 1 FROM user_atms ua
           WHERE ua.terminal_id = pm_visits.terminal_id AND ua.user_id = $6
         )
       RETURNING *`,
      [status, cleanliness_rating, branch_remarks, req.user.full_name, id, req.user.id]
    );
    if (result.rows.length === 0) {
      const exists = await db.query(
        `SELECT p.id FROM pm_visits p
         JOIN user_atms ua ON ua.terminal_id = p.terminal_id
         WHERE p.id = $1 AND ua.user_id = $2`,
        [id, req.user.id]
      );
      return res.status(exists.rowCount ? 409 : 404).json({ error: exists.rowCount ? 'Visit is not awaiting branch confirmation' : 'Visit record not found' });
    }
    const emailWarning = await getEmailWarning(
      'recording the branch response',
      () => notifyBranchDecision(result.rows[0].id)
    );
    res.json({
      ...result.rows[0],
      ...(emailWarning ? { email_warning: emailWarning } : {}),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to record branch response' });
  }
};

// Dashboard analytics endpoint
exports.getAnalytics = async (req, res) => {
  try {
    const terminalIds = req.user.role === 'BRANCH' ? req.user.terminal_ids : null;
    const stats = await db.query(`
      SELECT 
        COUNT(*) as total_visits,
        COUNT(CASE WHEN status = 'BRANCH_CONFIRMED' THEN 1 END) as confirmed,
        COUNT(CASE WHEN status = 'VENDOR_COMPLETED' THEN 1 END) as pending_branch,
        COUNT(CASE WHEN status = 'BRANCH_DISPUTED' THEN 1 END) as disputed,
        COUNT(CASE WHEN status = 'SCHEDULED' THEN 1 END) as pending_vendor,
        ROUND(AVG(cleanliness_rating), 2) as avg_rating
      FROM pm_visits p
      JOIN atms a ON p.terminal_id = a.terminal_id
      WHERE ($1::varchar[] IS NULL OR p.terminal_id = ANY($1::varchar[]))
    `, [terminalIds]);
    res.json(stats.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
};
