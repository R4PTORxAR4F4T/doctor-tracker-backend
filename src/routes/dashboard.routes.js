const router = require('express').Router();
const { getStats } = require('../controllers/dashboardController');
const { validate } = require('../middleware/validate');
const { dashboardQuery } = require('../validators');

router.get('/', validate(dashboardQuery, 'query'), getStats);

module.exports = router;
