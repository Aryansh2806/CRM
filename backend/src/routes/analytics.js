const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { getDashboardStats, getLeadsFunnel, getTeamPerformance } = require('../controllers/analyticsController');

router.use(authenticate);

router.get('/dashboard', getDashboardStats);
router.get('/leads-funnel', getLeadsFunnel);
router.get('/team-performance', getTeamPerformance);

module.exports = router;
