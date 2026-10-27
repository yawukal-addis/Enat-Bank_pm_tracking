const db = require('../config/db');

exports.getAllAtms = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT a.*, b.branch_name, b.branch_code, b.region
      FROM atms a 
      JOIN branches b ON a.branch_id = b.id
      WHERE ($1::varchar[] IS NULL OR a.terminal_id = ANY($1::varchar[]))
      ORDER BY a.terminal_id ASC
    `, [req.user.role === 'BRANCH' ? req.user.terminal_ids : null]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch ATMs' });
  }
};

exports.getAllBranches = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT DISTINCT b.*
       FROM branches b
       WHERE (
         ($1::varchar[] IS NULL AND EXISTS (
           SELECT 1 FROM atms a
           WHERE a.branch_id = b.id AND a.is_active = TRUE
         ))
         OR EXISTS (
           SELECT 1 FROM user_atms ua
           JOIN atms a ON a.terminal_id = ua.terminal_id
           WHERE ua.user_id = $2 AND a.branch_id = b.id
         )
       )
       ORDER BY b.branch_name ASC`,
      [req.user.role === 'BRANCH' ? req.user.terminal_ids : null, req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch branches' });
  }
};