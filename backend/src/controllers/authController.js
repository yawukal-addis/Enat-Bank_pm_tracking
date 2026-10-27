const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  console.warn('JWT_SECRET is not set. Login sessions will expire when the backend restarts.');
}

const tokenSecret = jwtSecret || require('crypto').randomBytes(32).toString('hex');

const publicUser = (user) => ({
  id: user.id,
  username: user.username,
  full_name: user.full_name,
  email: user.email,
  role: user.role,
  branch_id: user.branch_id,
  branch_name: user.branch_name,
  terminal_ids: user.terminal_ids || [],
});

exports.login = async (req, res) => {
  const username = typeof req.body.username === 'string' ? req.body.username.trim() : '';
  const password = typeof req.body.password === 'string' ? req.body.password : '';
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    const result = await db.query(
      `SELECT u.id, u.username, u.password, u.full_name, u.email, u.role, u.branch_id, b.branch_name,
              COALESCE(
                (SELECT array_agg(ua.terminal_id ORDER BY ua.terminal_id)
                 FROM user_atms ua WHERE ua.user_id = u.id),
                ARRAY[]::varchar[]
              ) AS terminal_ids
       FROM users u
       LEFT JOIN branches b ON b.id = u.branch_id
       WHERE LOWER(u.username) = LOWER($1)`,
      [username]
    );
    const user = result.rows[0];
    if (!user) return res.status(401).json({ error: 'Invalid username or password' });

    const isHashedPassword = /^\$2[aby]\$/.test(user.password);
    const passwordMatches = isHashedPassword
      ? await bcrypt.compare(password, user.password)
      : password === user.password;
    if (!passwordMatches) return res.status(401).json({ error: 'Invalid username or password' });
    if (user.role === 'BRANCH' && !user.branch_id) {
      return res.status(403).json({ error: 'This branch account is not assigned to a branch. Contact an administrator.' });
    }

    if (!isHashedPassword) {
      const passwordHash = await bcrypt.hash(password, 12);
      await db.query('UPDATE users SET password = $1 WHERE id = $2', [passwordHash, user.id]);
    }

    const token = jwt.sign({ sub: String(user.id) }, tokenSecret, { expiresIn: '8h' });
    res.json({ token, user: publicUser(user) });
  } catch (err) {
    console.error('Login failed:', err);
    res.status(500).json({ error: 'Unable to sign in right now' });
  }
};

exports.getCurrentUser = (req, res) => res.json({ user: publicUser(req.user) });

exports.getTokenSecret = () => tokenSecret;
