const { query } = require('../config/database');
const { getTeamMemberIds } = require('../middleware/rbac');

const buildDomainFilter = (alias, domainId, paramIdx) => ({
  clause: `AND ${alias}.domain_id = $${paramIdx}`,
  param: domainId
});

const getDashboardStats = async (req, res, next) => {
  try {
    const { role, id, domain_id } = req.user;
    let leadsQ, clientsQ, projectsQ, tasksQ, activityQ;
    let params = [];

    if (role === 'super_admin' || role === 'hr_finance') {
      leadsQ = 'SELECT COUNT(*) FROM leads';
      clientsQ = 'SELECT COUNT(*) FROM clients';
      projectsQ = 'SELECT COUNT(*) FROM projects';
      tasksQ = 'SELECT COUNT(*) FROM tasks';
      activityQ = 'SELECT al.*, u.name AS user_name FROM activity_logs al LEFT JOIN users u ON al.user_id = u.id ORDER BY al.created_at DESC LIMIT 10';
    } else if (role === 'director') {
      leadsQ = 'SELECT COUNT(*) FROM leads WHERE domain_id = $1';
      clientsQ = 'SELECT COUNT(*) FROM clients WHERE domain_id = $1';
      projectsQ = 'SELECT COUNT(*) FROM projects WHERE domain_id = $1';
      tasksQ = 'SELECT COUNT(*) FROM tasks WHERE domain_id = $1';
      activityQ = 'SELECT al.*, u.name AS user_name FROM activity_logs al LEFT JOIN users u ON al.user_id = u.id WHERE u.domain_id = $1 ORDER BY al.created_at DESC LIMIT 10';
      params = [domain_id];
    } else if (role === 'manager') {
      const teamIds = await getTeamMemberIds(id);
      teamIds.push(id);
      leadsQ = 'SELECT COUNT(*) FROM leads WHERE assigned_to = ANY($1) OR created_by = ANY($1)';
      clientsQ = 'SELECT COUNT(*) FROM clients WHERE account_manager = ANY($1)';
      projectsQ = 'SELECT COUNT(*) FROM projects WHERE manager_id = ANY($1)';
      tasksQ = 'SELECT COUNT(*) FROM tasks WHERE assigned_to = ANY($1) OR assigned_by = ANY($1)';
      activityQ = 'SELECT al.*, u.name AS user_name FROM activity_logs al LEFT JOIN users u ON al.user_id = u.id WHERE al.user_id = ANY($1) ORDER BY al.created_at DESC LIMIT 10';
      params = [teamIds];
    } else {
      leadsQ = 'SELECT COUNT(*) FROM leads WHERE assigned_to = $1';
      clientsQ = 'SELECT COUNT(*) FROM clients WHERE account_manager = $1';
      projectsQ = 'SELECT COUNT(*) FROM projects WHERE domain_id = $2';
      tasksQ = 'SELECT COUNT(*) FROM tasks WHERE assigned_to = $1';
      activityQ = 'SELECT al.*, u.name AS user_name FROM activity_logs al LEFT JOIN users u ON al.user_id = u.id WHERE al.user_id = $1 ORDER BY al.created_at DESC LIMIT 10';
      params = [id];
    }

    const [leadsRes, clientsRes, projectsRes, tasksRes] = await Promise.all([
      query(leadsQ, params),
      query(clientsQ, params),
      query(role === 'employee' ? 'SELECT COUNT(*) FROM projects WHERE domain_id = $1' : projectsQ,
            role === 'employee' ? [domain_id] : params),
      query(tasksQ, params),
    ]);

    const activityRes = await query(activityQ, params);

    // Leads by status
    const leadsByStatusQ = role === 'super_admin' || role === 'hr_finance'
      ? 'SELECT status, COUNT(*) FROM leads GROUP BY status'
      : role === 'director'
      ? 'SELECT status, COUNT(*) FROM leads WHERE domain_id = $1 GROUP BY status'
      : role === 'manager'
      ? 'SELECT status, COUNT(*) FROM leads WHERE assigned_to = ANY($1) OR created_by = ANY($1) GROUP BY status'
      : 'SELECT status, COUNT(*) FROM leads WHERE assigned_to = $1 GROUP BY status';

    const tasksByStatusQ = role === 'super_admin' || role === 'hr_finance'
      ? 'SELECT status, COUNT(*) FROM tasks GROUP BY status'
      : role === 'director'
      ? 'SELECT status, COUNT(*) FROM tasks WHERE domain_id = $1 GROUP BY status'
      : role === 'manager'
      ? 'SELECT status, COUNT(*) FROM tasks WHERE assigned_to = ANY($1) OR assigned_by = ANY($1) GROUP BY status'
      : 'SELECT status, COUNT(*) FROM tasks WHERE assigned_to = $1 GROUP BY status';

    const [leadsByStatus, tasksByStatus] = await Promise.all([
      query(leadsByStatusQ, params),
      query(tasksByStatusQ, params),
    ]);

    res.json({
      success: true,
      data: {
        counts: {
          leads: parseInt(leadsRes.rows[0].count),
          clients: parseInt(clientsRes.rows[0].count),
          projects: parseInt(projectsRes.rows[0].count),
          tasks: parseInt(tasksRes.rows[0].count),
        },
        leads_by_status: leadsByStatus.rows,
        tasks_by_status: tasksByStatus.rows,
        recent_activity: activityRes.rows,
      }
    });
  } catch (err) {
    next(err);
  }
};

const getLeadsFunnel = async (req, res, next) => {
  try {
    const { role, id, domain_id } = req.user;
    let whereClause = '';
    let params = [];

    if (role === 'director') {
      whereClause = 'WHERE domain_id = $1';
      params = [domain_id];
    } else if (role === 'manager') {
      const teamIds = await getTeamMemberIds(id);
      teamIds.push(id);
      whereClause = 'WHERE assigned_to = ANY($1) OR created_by = ANY($1)';
      params = [teamIds];
    } else if (role === 'employee') {
      whereClause = 'WHERE assigned_to = $1';
      params = [id];
    }

    const result = await query(
      `SELECT status, COUNT(*) AS count, COALESCE(SUM(value), 0) AS total_value
       FROM leads ${whereClause}
       GROUP BY status
       ORDER BY CASE status
         WHEN 'new' THEN 1 WHEN 'contacted' THEN 2 WHEN 'qualified' THEN 3
         WHEN 'proposal' THEN 4 WHEN 'won' THEN 5 WHEN 'lost' THEN 6
       END`,
      params
    );

    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
};

const getTeamPerformance = async (req, res, next) => {
  try {
    const { role, id, domain_id } = req.user;

    if (role === 'employee') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    let userFilter = '';
    let params = [];

    if (role === 'director') {
      userFilter = 'WHERE u.domain_id = $1 AND u.is_active = true';
      params = [domain_id];
    } else if (role === 'manager') {
      const teamIds = await getTeamMemberIds(id);
      teamIds.push(id);
      userFilter = 'WHERE u.id = ANY($1) AND u.is_active = true';
      params = [teamIds];
    } else {
      userFilter = 'WHERE u.is_active = true';
    }

    const result = await query(
      `SELECT u.id, u.name, u.role, u.email,
              COUNT(DISTINCT l.id) AS leads_assigned,
              COUNT(DISTINCT CASE WHEN l.status = 'won' THEN l.id END) AS leads_won,
              COALESCE(SUM(CASE WHEN l.status = 'won' THEN l.value ELSE 0 END), 0) AS revenue_won,
              COUNT(DISTINCT t.id) AS tasks_assigned,
              COUNT(DISTINCT CASE WHEN t.status = 'done' THEN t.id END) AS tasks_completed
       FROM users u
       LEFT JOIN leads l ON l.assigned_to = u.id
       LEFT JOIN tasks t ON t.assigned_to = u.id
       ${userFilter}
       GROUP BY u.id, u.name, u.role, u.email
       ORDER BY revenue_won DESC`,
      params
    );

    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
};

module.exports = { getDashboardStats, getLeadsFunnel, getTeamPerformance };
