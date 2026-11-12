const express = require('express');
const upload = require('../middleware/upload');
const controller = require('../controllers/salaryDataController');

const router = express.Router();

router.get('/template', controller.downloadTemplate);
router.post('/import', upload.single('file'), controller.importExcel);
router.get('/employee/:employeeId', controller.lookupEmployee);
router.post('/selection-summary', controller.selectionSummary);
router.post('/bulk-delete', controller.bulkRemove);

router.get('/', controller.list);
router.post('/', controller.create);
router.put('/:id', controller.update);
router.delete('/:id', controller.remove);

module.exports = router;
