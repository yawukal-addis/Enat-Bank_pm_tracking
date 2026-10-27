const db = require('../config/db');

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

    if (branch_id) {
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
  try {
    const result = await db.query(
      `INSERT INTO pm_visits (terminal_id, scheduled_date, vendor_name)
       VALUES ($1, $2, $3) RETURNING *`,
      [terminal_id, scheduled_date, vendor_name || 'Moti Engineering']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create PM schedule' });
  }
};

// Vendor marks visit as completed
exports.vendorComplete = async (req, res) => {
  const { id } = req.params;
  const { vendor_technician, vendor_notes } = req.body;
  try {
    const result = await db.query(
      `UPDATE pm_visits
       SET status = 'VENDOR_COMPLETED',
           vendor_technician = $1,
           vendor_notes = $2,
           vendor_completed_at = CURRENT_TIMESTAMP
       WHERE id = $3 RETURNING *`,
      [vendor_technician, vendor_notes, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Visit record not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update vendor completion' });
  }
};

// Branch confirms or disputes visit
exports.branchConfirm = async (req, res) => {
  const { id } = req.params;
  const { status, cleanliness_rating, branch_remarks, branch_confirmed_by } = req.body;

  if (!['BRANCH_CONFIRMED', 'BRANCH_DISPUTED'].includes(status)) {
    return res.status(400).json({ error: 'Invalid confirmation status' });
  }

  try {
    const result = await db.query(
      `UPDATE pm_visits
       SET status = $1,
           cleanliness_rating = $2,
           branch_remarks = $3,
           branch_confirmed_by = $4,
           branch_confirmed_at = CURRENT_TIMESTAMP
       WHERE id = $5 RETURNING *`,
      [status, cleanliness_rating, branch_remarks, branch_confirmed_by, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Visit record not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to record branch response' });
  }
};

// Dashboard analytics endpoint
exports.getAnalytics = async (req, res) => {
  try {
    const stats = await db.query(`
      SELECT 
        COUNT(*) as total_visits,
        COUNT(CASE WHEN status = 'BRANCH_CONFIRMED' THEN 1 END) as confirmed,
        COUNT(CASE WHEN status = 'VENDOR_COMPLETED' THEN 1 END) as pending_branch,
        COUNT(CASE WHEN status = 'BRANCH_DISPUTED' THEN 1 END) as disputed,
        COUNT(CASE WHEN status = 'SCHEDULED' THEN 1 END) as pending_vendor,
        ROUND(AVG(cleanliness_rating), 2) as avg_rating
      FROM pm_visits
    `);
    res.json(stats.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
};