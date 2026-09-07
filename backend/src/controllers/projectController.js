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
  SELECT p.*, d.name AS domain_name, c.name AS client_name, u.name AS manager_name
  FROM projects p
  LEFT JOIN domains d ON p.domain_id = d.id
  LEFT JOIN clients c ON p.client_id = c.id
  LEFT JOIN users u ON p.manager_id = u.id
`;

const buildScopeWhere = async (user) => {
  const { role, id, domain_id } = user;
  if (role === 'super_admin' || role === 'hr_finance') return { where: '1=1', params: [] };
  if (role === 'director') return { where: 'p.domain_id = $1', params: [domain_id] };
  if (role === 'manager') return { where: 'p.manager_id = $1 OR p.domain_id = $2', params: [id, domain_id] };
  // employee: see projects in their domain
  return { where: 'p.domain_id = $1', params: [domain_id] };
};

const getProjects = async (req, res, next) => {
  try {
    const scope = await buildScopeWhere(req.user);
    const result = await query(`${BASE_SELECT} WHERE ${scope.where} ORDER BY p.created_at DESC`, scope.params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
};

const getProjectById = async (req, res, next) => {
  try {
    const scope = await buildScopeWhere(req.user);
    const result = await query(
      `${BASE_SELECT} WHERE p.id = $${scope.params.length + 1} AND (${scope.where})`,
      [...scope.params, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Project not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

const createProject = async (req, res, next) => {
  try {
    if (req.user.role === 'employee') {
      return res.status(403).json({ success: false, message: 'Employees cannot create projects' });
    }
    const { title, description, client_id, domain_id, status, priority, start_date, end_date, manager_id } = req.body;
    if (!title) return res.status(400).json({ success: false, message: 'title is required' });

    const result = await query(
      `INSERT INTO projects (title, description, client_id, domain_id, status, priority, start_date, end_date, manager_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [title, description, client_id, domain_id || req.user.domain_id, status || 'planning',
       priority || 'medium', start_date, end_date, manager_id || req.user.id]
    );
    await logActivity(req.user.id, 'CREATE', 'project', result.rows[0].id, { title });
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

const updateProject = async (req, res, next) => {
  try {
    const { id } = req.params;
    const scope = await buildScopeWhere(req.user);
    const existing = await query(
      `SELECT id FROM projects WHERE id = $${scope.params.length + 1} AND (${scope.where})`,
      [...scope.params, id]
    );
    if (existing.rows.length === 0) return res.status(404).json({ success: false, message: 'Project not found or access denied' });

    const { title, description, client_id, domain_id, status, priority, start_date, end_date, manager_id } = req.body;
    const fields = [];
    const values = [];
    let idx = 1;
    const updates = { title, description, client_id, domain_id, status, priority, start_date, end_date, manager_id };
    for (const [key, val] of Object.entries(updates)) {
      if (val !== undefined) { fields.push(`${key} = $${idx++}`); values.push(val); }
    }
    if (fields.length === 0) return res.status(400).json({ success: false, message: 'No fields to update' });
    fields.push(`updated_at = NOW()`);
    values.push(id);
    const result = await query(`UPDATE projects SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`, values);
    await logActivity(req.user.id, 'UPDATE', 'project', id, req.body);
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

const deleteProject = async (req, res, next) => {
  try {
    if (req.user.role === 'employee') {
      return res.status(403).json({ success: false, message: 'Employees cannot delete projects' });
    }
    const scope = await buildScopeWhere(req.user);
    const existing = await query(
      `SELECT id FROM projects WHERE id = $${scope.params.length + 1} AND (${scope.where})`,
      [...scope.params, req.params.id]
    );
    if (existing.rows.length === 0) return res.status(404).json({ success: false, message: 'Project not found or access denied' });
    await query('DELETE FROM projects WHERE id = $1', [req.params.id]);
    await logActivity(req.user.id, 'DELETE', 'project', req.params.id, {});
    res.json({ success: true, message: 'Project deleted' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getProjects, getProjectById, createProject, updateProject, deleteProject };
