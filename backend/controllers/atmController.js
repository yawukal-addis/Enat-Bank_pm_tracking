const db = require('../config/db');

exports.getAllAtms = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT a.*, b.branch_name, b.branch_code 
      FROM atms a 
      JOIN branches b ON a.branch_id = b.id
      ORDER BY a.terminal_id ASC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch ATMs' });
  }
};

exports.getAllBranches = async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM branches ORDER BY branch_name ASC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch branches' });
  }
};