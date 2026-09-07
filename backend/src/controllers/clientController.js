const { query } = require('../config/database');
const { getTeamMemberIds } = require('../middleware/rbac');

const logActivity = async (userId, action, entityType, entityId, details) => {
  try {
    await query(
      'INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details) VALUES ($1, $2, $3, $4, $5)',
      [userId, action, entityType, entityId, JSON.stringify(details)]
    );
  } catch (e) {
    console.error('Activity log error:', e.message);
  }
};

const BASE_SELECT = `
  SELECT c.*, d.name AS domain_name, u.name AS account_manager_name
  FROM clients c
  LEFT JOIN domains d ON c.domain_id = d.id
  LEFT JOIN users u ON c.account_manager = u.id
`;

const buildScopeWhere = async (user) => {
  const { role, id, domain_id } = user;
  if (role === 'super_admin' || role === 'hr_finance') return { where: '1=1', params: [] };
  if (role === 'director') return { where: 'c.domain_id = $1', params: [domain_id] };
  if (role === 'manager') {
    const teamIds = await getTeamMemberIds(id);
    teamIds.push(id);
    return { where: 'c.account_manager = ANY($1)', params: [teamIds] };
  }
  return { where: 'c.account_manager = $1', params: [id] };
};

const getClients = async (req, res, next) => {
  try {
    const scope = await buildScopeWhere(req.user);
    const result = await query(`${BASE_SELECT} WHERE ${scope.where} ORDER BY c.created_at DESC`, scope.params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
};

const getClientById = async (req, res, next) => {
  try {
    const scope = await buildScopeWhere(req.user);
    const result = await query(
      `${BASE_SELECT} WHERE c.id = $${scope.params.length + 1} AND (${scope.where})`,
      [...scope.params, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Client not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

const createClient = async (req, res, next) => {
  try {
    if (req.user.role === 'employee') {
      return res.status(403).json({ success: false, message: 'Employees cannot create clients' });
    }
    const { name, email, phone, company, domain_id, account_manager, status, total_value } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'name is required' });

    const result = await query(
      `INSERT INTO clients (name, email, phone, company, domain_id, account_manager, status, total_value)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [name, email, phone, company, domain_id || req.user.domain_id, account_manager, status || 'active', total_value || 0]
    );
    await logActivity(req.user.id, 'CREATE', 'client', result.rows[0].id, { name });
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

const updateClient = async (req, res, next) => {
  try {
    const { id } = req.params;
    const scope = await buildScopeWhere(req.user);
    const existing = await query(
      `SELECT id FROM clients WHERE id = $${scope.params.length + 1} AND (${scope.where})`,
      [...scope.params, id]
    );
    if (existing.rows.length === 0) return res.status(404).json({ success: false, message: 'Client not found or access denied' });

    const { name, email, phone, company, domain_id, account_manager, status, total_value } = req.body;
    const fields = [];
    const values = [];
    let idx = 1;
    const updates = { name, email, phone, company, domain_id, account_manager, status, total_value };
    for (const [key, val] of Object.entries(updates)) {
      if (val !== undefined) { fields.push(`${key} = $${idx++}`); values.push(val); }
    }
    if (fields.length === 0) return res.status(400).json({ success: false, message: 'No fields to update' });
    fields.push(`updated_at = NOW()`);
    values.push(id);
    const result = await query(`UPDATE clients SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`, values);
    await logActivity(req.user.id, 'UPDATE', 'client', id, req.body);
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

const deleteClient = async (req, res, next) => {
  try {
    if (req.user.role === 'employee') {
      return res.status(403).json({ success: false, message: 'Employees cannot delete clients' });
    }
    const scope = await buildScopeWhere(req.user);
    const existing = await query(
      `SELECT id FROM clients WHERE id = $${scope.params.length + 1} AND (${scope.where})`,
      [...scope.params, req.params.id]
    );
    if (existing.rows.length === 0) return res.status(404).json({ success: false, message: 'Client not found or access denied' });
    await query('DELETE FROM clients WHERE id = $1', [req.params.id]);
    await logActivity(req.user.id, 'DELETE', 'client', req.params.id, {});
    res.json({ success: true, message: 'Client deleted' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getClients, getClientById, createClient, updateClient, deleteClient };
