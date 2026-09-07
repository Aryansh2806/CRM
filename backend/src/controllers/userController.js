const bcrypt = require('bcryptjs');
const { query } = require('../config/database');
const { getDomainUserIds, getTeamMemberIds } = require('../middleware/rbac');

const BASE_SELECT = `
  SELECT u.id, u.name, u.email, u.role, u.domain_id, u.manager_id, u.is_active,
         u.created_at, u.updated_at,
         d.name AS domain_name,
         m.name AS manager_name
  FROM users u
  LEFT JOIN domains d ON u.domain_id = d.id
  LEFT JOIN users m ON u.manager_id = m.id
`;

const getUsers = async (req, res, next) => {
  try {
    const { role } = req.user;
    let rows;

    if (role === 'super_admin' || role === 'hr_finance') {
      const result = await query(`${BASE_SELECT} WHERE u.is_active = true ORDER BY u.created_at DESC`);
      rows = result.rows;
    } else if (role === 'director') {
      const result = await query(`${BASE_SELECT} WHERE u.domain_id = $1 AND u.is_active = true ORDER BY u.created_at DESC`, [req.user.domain_id]);
      rows = result.rows;
    } else if (role === 'manager') {
      const teamIds = await getTeamMemberIds(req.user.id);
      teamIds.push(req.user.id);
      const result = await query(`${BASE_SELECT} WHERE u.id = ANY($1) AND u.is_active = true ORDER BY u.created_at DESC`, [teamIds]);
      rows = result.rows;
    } else {
      const result = await query(`${BASE_SELECT} WHERE u.id = $1`, [req.user.id]);
      rows = result.rows;
    }

    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
};

const getUserById = async (req, res, next) => {
  try {
    const result = await query(`${BASE_SELECT} WHERE u.id = $1`, [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

const getUsersByDomain = async (req, res, next) => {
  try {
    const result = await query(
      `${BASE_SELECT} WHERE u.domain_id = $1 AND u.is_active = true ORDER BY u.name`,
      [req.params.id]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
};

const createUser = async (req, res, next) => {
  try {
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({ success: false, message: 'Only super_admin can create users' });
    }

    const { name, email, password, role, domain_id, manager_id } = req.body;
    if (!name || !email || !password || !role) {
      return res.status(400).json({ success: false, message: 'name, email, password, and role are required' });
    }

    const existing = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase().trim()]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'Email already in use' });
    }

    const hash = await bcrypt.hash(password, 10);
    const result = await query(
      `INSERT INTO users (name, email, password_hash, role, domain_id, manager_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, email, role, domain_id, manager_id, is_active, created_at`,
      [name, email.toLowerCase().trim(), hash, role, domain_id || null, manager_id || null]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role } = req.user;

    if (role !== 'super_admin' && req.user.id !== id) {
      return res.status(403).json({ success: false, message: 'You can only update your own profile' });
    }

    const { name, email, domain_id, manager_id, is_active } = req.body;
    const allowedForSelf = { name, email };

    let fields = [];
    let values = [];
    let idx = 1;

    const updates = role === 'super_admin' ? { name, email, domain_id, manager_id, is_active } : allowedForSelf;

    for (const [key, val] of Object.entries(updates)) {
      if (val !== undefined) {
        fields.push(`${key} = $${idx++}`);
        values.push(val);
      }
    }

    if (fields.length === 0) {
      return res.status(400).json({ success: false, message: 'No fields to update' });
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const result = await query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${idx} RETURNING id, name, email, role, domain_id, manager_id, is_active, updated_at`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

const deleteUser = async (req, res, next) => {
  try {
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({ success: false, message: 'Only super_admin can delete users' });
    }

    const result = await query(
      'UPDATE users SET is_active = false, updated_at = NOW() WHERE id = $1 RETURNING id',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, message: 'User deactivated successfully' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getUsers, getUserById, getUsersByDomain, createUser, updateUser, deleteUser };
