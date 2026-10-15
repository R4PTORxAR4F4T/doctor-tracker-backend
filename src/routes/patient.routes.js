const router = require('express').Router();
const ctrl = require('../controllers/patientController');
const { validate, objectIdParam } = require('../middleware/validate');
const v = require('../validators');

router.param('id', objectIdParam);

router.get('/meta', ctrl.meta);

router.route('/').get(validate(v.patientListQuery, 'query'), ctrl.list).post(validate(v.patientBody), ctrl.create);

router
  .route('/:id')
  .get(ctrl.getOne)
  .put(validate(v.patientUpdateBody), ctrl.update)
  .delete(ctrl.remove);

module.exports = router;
