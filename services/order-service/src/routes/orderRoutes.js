const router = require('express').Router();
const ctrl   = require('../controllers/orderController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.post('/',           ctrl.createOrder);
router.get('/my',          ctrl.getMyOrders);
router.get('/',            ctrl.getAllOrders);
router.get('/:id',         ctrl.getOrderById);
router.patch('/:id/status',ctrl.updateStatus);
router.delete('/:id',      ctrl.deleteOrder);

module.exports = router;
