const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { getLeads, getLeadById, createLead, updateLead, deleteLead } = require('../controllers/leadController');

router.use(authenticate);

router.get('/', getLeads);
router.get('/:id', getLeadById);
router.post('/', createLead);
router.put('/:id', updateLead);
router.delete('/:id', deleteLead);

module.exports = router;
