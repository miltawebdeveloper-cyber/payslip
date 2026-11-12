const express = require('express');
const controller = require('../controllers/payslipController');

const router = express.Router();

router.get('/months', controller.listMonths);
router.get('/employees', controller.listEmployeesForMonth);
router.get('/preview', controller.preview);
router.post('/generate', controller.generate);
router.post('/generate-all', controller.generateAll);

module.exports = router;
