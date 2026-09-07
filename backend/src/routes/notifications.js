const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { getNotifications, getUnreadCount, markAsRead, markOneAsRead, deleteNotification } = require('../controllers/notificationController');

router.use(authenticate);

router.get('/', getNotifications);
router.get('/unread-count', getUnreadCount);
router.put('/mark-read', markAsRead);
router.put('/:id/read', markOneAsRead);
router.delete('/:id', deleteNotification);

module.exports = router;
