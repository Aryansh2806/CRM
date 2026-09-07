const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { getUsers, getUserById, getUsersByDomain, createUser, updateUser, deleteUser } = require('../controllers/userController');

router.use(authenticate);

router.get('/', getUsers);
router.get('/domain/:id', getUsersByDomain);
router.get('/:id', getUserById);
router.post('/', createUser);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);

module.exports = router;
