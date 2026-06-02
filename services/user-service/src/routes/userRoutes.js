const router = require('express').Router();
const ctrl   = require('../controllers/userController');
const { authenticate } = require('../middleware/auth');
const { JWT } = require('../constants');

// Public
router.post('/register', ctrl.register);
router.post('/login',    ctrl.login);

// Gateway auth verification — called internally by NGINX auth_request
// Cache-Control max-age = exact remaining token lifetime, so NGINX never
// serves a cached 200 for a token that has already expired.
router.get('/verify', authenticate, (req, res) => {
  const remainingSecs = Math.max(0, req.user.exp - Math.floor(Date.now() / 1000) - JWT.CLOCK_SKEW_BUFFER);
  res.set('Cache-Control', `max-age=${remainingSecs}`);
  res.set('X-User-Id',    String(req.user.id));
  res.set('X-User-Email', req.user.email);
  res.set('X-User-Role',  req.user.role);
  res.sendStatus(200);
});

// Protected
router.get('/profile',       authenticate, ctrl.getProfile);
router.get('/',              authenticate, ctrl.getAllUsers);
router.put('/:id',           authenticate, ctrl.updateUser);
router.delete('/:id',        authenticate, ctrl.deleteUser);

module.exports = router;
