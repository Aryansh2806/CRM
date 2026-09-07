const { query } = require('../config/database');

const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions' });
    }
    next();
  };
};

const getTeamMemberIds = async (managerId) => {
  const result = await query(
    'SELECT id FROM users WHERE manager_id = $1 AND is_active = true',
    [managerId]
  );
  return result.rows.map(r => r.id);
};

const getDomainUserIds = async (domainId) => {
  const result = await query(
    'SELECT id FROM users WHERE domain_id = $1 AND is_active = true',
    [domainId]
  );
  return result.rows.map(r => r.id);
};

module.exports = { requireRole, getTeamMemberIds, getDomainUserIds };
