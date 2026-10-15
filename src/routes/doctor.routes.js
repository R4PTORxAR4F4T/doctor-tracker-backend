const router = require('express').Router();
const ctrl = require('../controllers/doctorController');
const { validate, objectIdParam } = require('../middleware/validate');
const v = require('../validators');

router.param('id', objectIdParam);
router.param('patientId', objectIdParam);

// Static routes must be declared before '/:id'.
router.get('/meta', ctrl.meta);
router.get('/options', ctrl.options);

router.route('/').get(validate(v.doctorListQuery, 'query'), ctrl.list).post(validate(v.doctorBody), ctrl.create);

router
  .route('/:id')
  .get(ctrl.getOne)
  .put(validate(v.doctorUpdateBody), ctrl.update)
  .delete(ctrl.remove);

router
  .route('/:id/patients')
  .get(validate(v.doctorPatientsQuery, 'query'), ctrl.listPatients)
  .post(validate(v.doctorScopedPatientBody), ctrl.addPatient);

router.delete('/:id/patients/:patientId', ctrl.removePatient);

module.exports = router;
