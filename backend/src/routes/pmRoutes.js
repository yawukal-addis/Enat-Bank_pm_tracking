const express = require('express');
const router = express.Router();
const pmController = require('../controllers/pmController');
const { requireRole } = require('../middleware/authMiddleware');

router.get('/', pmController.getAllVisits);
router.post('/schedule', requireRole('ADMIN'), pmController.createSchedule);
router.patch('/:id/schedule', requireRole('ADMIN'), pmController.updateSchedule);
router.delete('/:id/schedule', requireRole('ADMIN'), pmController.deleteSchedule);
router.patch('/:id/vendor-complete', requireRole('VENDOR'), pmController.vendorComplete);
router.patch('/:id/branch-confirm', requireRole('BRANCH'), pmController.branchConfirm);
router.get('/analytics', pmController.getAnalytics);

module.exports = router;