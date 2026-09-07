const { query } = require('../config/database');
const { getTeamMemberIds, getDomainUserIds } = require('../middleware/rbac');

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
  SELECT l.*, d.name AS domain_name,
         u.name AS assigned_to_name,
         cb.name AS created_by_name
  FROM leads l
  LEFT JOIN domains d ON l.domain_id = d.id
  LEFT JOIN users u ON l.assigned_to = u.id
  LEFT JOIN users cb ON l.created_by = cb.id
`;

const buildScopeWhere = async (user) => {
  const { role, id, domain_id } = user;
  if (role === 'super_admin' || role === 'hr_finance') return { where: '1=1', params: [] };
  if (role === 'director') return { where: 'l.domain_id = $1', params: [domain_id] };
  if (role === 'manager') {
    const teamIds = await getTeamMemberIds(id);
    teamIds.push(id);
    return { where: 'l.assigned_to = ANY($1) OR l.created_by = ANY($1)', params: [teamIds] };
  }
  // employee
  return { where: 'l.assigned_to = $1', params: [id] };
};

const getLeads = async (req, res, next) => {
  try {
    const scope = await buildScopeWhere(req.user);
    const result = await query(`${BASE_SELECT} WHERE ${scope.where} ORDER BY l.created_at DESC`, scope.params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
};

const getLeadById = async (req, res, next) => {
  try {
    const scope = await buildScopeWhere(req.user);
    const result = await query(
      `${BASE_SELECT} WHERE l.id = $${scope.params.length + 1} AND (${scope.where})`,
      [...scope.params, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

const createLead = async (req, res, next) => {
  try {
    const { title, company_name, contact_name, contact_email, contact_phone, status, value, domain_id, assigned_to, notes } = req.body;
    if (!title) return res.status(400).json({ success: false, message: 'title is required' });

    const result = await query(
      `INSERT INTO leads (title, company_name, contact_name, contact_email, contact_phone, status, value, domain_id, assigned_to, created_by, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [title, company_name, contact_name, contact_email, contact_phone, status || 'new', value || 0,
       domain_id || req.user.domain_id, assigned_to || null, req.user.id, notes]
    );

    const lead = result.rows[0];
    await logActivity(req.user.id, 'CREATE', 'lead', lead.id, { title });

    if (assigned_to && assigned_to !== req.user.id) {
      await notifyUser(assigned_to, 'New Lead Assigned', `You have been assigned lead: ${title}`, 'info');
    }

    res.status(201).json({ success: true, data: lead });
  } catch (err) {
    next(err);
  }
};

const updateLead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const scope = await buildScopeWhere(req.user);
    const existing = await query(
      `SELECT * FROM leads WHERE id = $${scope.params.length + 1} AND (${scope.where})`,
      [...scope.params, id]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Lead not found or access denied' });
    }

    const { title, company_name, contact_name, contact_email, contact_phone, status, value, domain_id, assigned_to, notes } = req.body;
    const fields = [];
    const values = [];
    let idx = 1;

    const updates = { title, company_name, contact_name, contact_email, contact_phone, status, value, domain_id, assigned_to, notes };
    for (const [key, val] of Object.entries(updates)) {
      if (val !== undefined) {
        fields.push(`${key} = $${idx++}`);
        values.push(val);
      }
    }

    if (fields.length === 0) return res.status(400).json({ success: false, message: 'No fields to update' });

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const result = await query(
      `UPDATE leads SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );

    await logActivity(req.user.id, 'UPDATE', 'lead', id, req.body);
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

const deleteLead = async (req, res, next) => {
  try {
    const { role } = req.user;
    if (role === 'employee') {
      return res.status(403).json({ success: false, message: 'Employees cannot delete leads' });
    }

    const scope = await buildScopeWhere(req.user);
    const existing = await query(
      `SELECT id, title FROM leads WHERE id = $${scope.params.length + 1} AND (${scope.where})`,
      [...scope.params, req.params.id]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Lead not found or access denied' });
    }

    await query('DELETE FROM leads WHERE id = $1', [req.params.id]);
    await logActivity(req.user.id, 'DELETE', 'lead', req.params.id, { title: existing.rows[0].title });

    res.json({ success: true, message: 'Lead deleted' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getLeads, getLeadById, createLead, updateLead, deleteLead };
