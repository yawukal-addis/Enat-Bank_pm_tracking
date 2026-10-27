const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { getTokenSecret } = require('../controllers/authController');

exports.authenticate = async (req, res, next) => {
  const authorization = req.headers.authorization || '';
  const [scheme, token] = authorization.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Please sign in to continue' });
  }

  let claims;
  try {
    claims = jwt.verify(token, getTokenSecret());
  } catch (_err) {
    return res.status(401).json({ error: 'Your session has expired. Please sign in again.' });
  }

  try {
    const result = await db.query(
      `SELECT u.id, u.username, u.full_name, u.email, u.role, u.branch_id, b.branch_name,
              COALESCE(
                (SELECT array_agg(ua.terminal_id ORDER BY ua.terminal_id)
                 FROM user_atms ua WHERE ua.user_id = u.id),
                ARRAY[]::varchar[]
              ) AS terminal_ids
       FROM users u
       LEFT JOIN branches b ON b.id = u.branch_id
       WHERE u.id = $1`,
      [claims.sub]
    );
    if (!result.rowCount) return res.status(401).json({ error: 'User account no longer exists' });
    req.user = result.rows[0];
    next();
  } catch (err) {
    next(err);
  }
};

exports.requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ error: 'You do not have permission to perform this action' });
  }
  next();
};
