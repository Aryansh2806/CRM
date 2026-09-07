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

const notifyUser = async (userId, title, message, type = 'info') => {
  try {
    await query(
      'INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, $4)',
      [userId, title, message, type]
    );
  } catch (e) {
    console.error('Notification error:', e.message);
  }
};

const BASE_SELECT = `
  SELECT t.*, d.name AS domain_name,
         u.name AS assigned_to_name,
         ab.name AS assigned_by_name,
         p.title AS project_title
  FROM tasks t
  LEFT JOIN domains d ON t.domain_id = d.id
  LEFT JOIN users u ON t.assigned_to = u.id
  LEFT JOIN users ab ON t.assigned_by = ab.id
  LEFT JOIN projects p ON t.project_id = p.id
`;

const buildScopeWhere = async (user) => {
  const { role, id, domain_id } = user;
  if (role === 'super_admin' || role === 'hr_finance') return { where: '1=1', params: [] };
  if (role === 'director') return { where: 't.domain_id = $1', params: [domain_id] };
  if (role === 'manager') {
    const teamIds = await getTeamMemberIds(id);
    teamIds.push(id);
    return { where: 't.assigned_to = ANY($1) OR t.assigned_by = ANY($1)', params: [teamIds] };
  }
  return { where: 't.assigned_to = $1', params: [id] };
};

const getTasks = async (req, res, next) => {
  try {
    const scope = await buildScopeWhere(req.user);
    const result = await query(`${BASE_SELECT} WHERE ${scope.where} ORDER BY t.created_at DESC`, scope.params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
};

const getTaskById = async (req, res, next) => {
  try {
    const scope = await buildScopeWhere(req.user);
    const result = await query(
      `${BASE_SELECT} WHERE t.id = $${scope.params.length + 1} AND (${scope.where})`,
      [...scope.params, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Task not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

const createTask = async (req, res, next) => {
  try {
    if (req.user.role === 'employee') {
      return res.status(403).json({ success: false, message: 'Employees cannot create tasks' });
    }
    const { title, description, project_id, domain_id, assigned_to, status, priority, due_date } = req.body;
    if (!title) return res.status(400).json({ success: false, message: 'title is required' });

    const result = await query(
      `INSERT INTO tasks (title, description, project_id, domain_id, assigned_to, assigned_by, status, priority, due_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [title, description, project_id, domain_id || req.user.domain_id, assigned_to,
       req.user.id, status || 'todo', priority || 'medium', due_date]
    );

    const task = result.rows[0];
    await logActivity(req.user.id, 'CREATE', 'task', task.id, { title });

    if (assigned_to && assigned_to !== req.user.id) {
      await notifyUser(assigned_to, 'New Task Assigned', `You have been assigned task: ${title}`, 'info');
    }

    res.status(201).json({ success: true, data: task });
  } catch (err) {
    next(err);
  }
};

const updateTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role, id: userId } = req.user;

    const scope = await buildScopeWhere(req.user);
    const existing = await query(
      `SELECT * FROM tasks WHERE id = $${scope.params.length + 1} AND (${scope.where})`,
      [...scope.params, id]
    );
    if (existing.rows.length === 0) return res.status(404).json({ success: false, message: 'Task not found or access denied' });

    const task = existing.rows[0];

    // Employees can only update status of their own tasks
    if (role === 'employee') {
      if (task.assigned_to !== userId) {
        return res.status(403).json({ success: false, message: 'You can only update your own tasks' });
      }
      const { status } = req.body;
      if (!status) return res.status(400).json({ success: false, message: 'Employees can only update task status' });
      const result = await query(
        'UPDATE tasks SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
        [status, id]
      );
      await logActivity(userId, 'UPDATE', 'task', id, { status });
      return res.json({ success: true, data: result.rows[0] });
    }

    const { title, description, project_id, domain_id, assigned_to, status, priority, due_date } = req.body;
    const fields = [];
    const values = [];
    let idx = 1;
    const updates = { title, description, project_id, domain_id, assigned_to, status, priority, due_date };
    for (const [key, val] of Object.entries(updates)) {
      if (val !== undefined) { fields.push(`${key} = $${idx++}`); values.push(val); }
    }
    if (fields.length === 0) return res.status(400).json({ success: false, message: 'No fields to update' });
    fields.push(`updated_at = NOW()`);
    values.push(id);
    const result = await query(`UPDATE tasks SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`, values);
    await logActivity(userId, 'UPDATE', 'task', id, req.body);
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

const deleteTask = async (req, res, next) => {
  try {
    if (req.user.role === 'employee') {
      return res.status(403).json({ success: false, message: 'Employees cannot delete tasks' });
    }
    const scope = await buildScopeWhere(req.user);
    const existing = await query(
      `SELECT id FROM tasks WHERE id = $${scope.params.length + 1} AND (${scope.where})`,
      [...scope.params, req.params.id]
    );
    if (existing.rows.length === 0) return res.status(404).json({ success: false, message: 'Task not found or access denied' });
    await query('DELETE FROM tasks WHERE id = $1', [req.params.id]);
    await logActivity(req.user.id, 'DELETE', 'task', req.params.id, {});
    res.json({ success: true, message: 'Task deleted' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getTasks, getTaskById, createTask, updateTask, deleteTask };
