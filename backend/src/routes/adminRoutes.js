const express = require('express');
const multer = require('multer');
const router = express.Router();
const adminController = require('../controllers/adminController');
const atmIssueController = require('../controllers/atmIssueController');
const { requireRole } = require('../middleware/authMiddleware');

const uploadSchedule = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
}).single('file');

router.use(requireRole('ADMIN'));

router.post('/branch', adminController.createBranch);
router.post('/atm', adminController.createAtm);
router.get('/users', adminController.getUsers);
router.get('/atm-issues', atmIssueController.getWorkspace);
router.post('/atm-issues/types', atmIssueController.createIssueType);
router.put('/atm-issues/types/:id', atmIssueController.updateIssueType);
router.put('/atm-issues/sla-settings', atmIssueController.saveSlaSettings);
router.put('/atm-issues/policy', atmIssueController.savePolicy);
router.put('/atm-issues/terminals/:terminalId/zone', atmIssueController.updateTerminalZone);
router.post('/atm-issues', atmIssueController.createIssue);
router.patch('/atm-issues/:id', atmIssueController.updateIssue);
router.delete('/atm-issues/:id', atmIssueController.deleteIssue);
router.put('/atm-issues/terminal-fee', atmIssueController.saveMonthlyFee);
router.post('/user', adminController.createUser);
router.put('/user/:id', adminController.updateUser);
router.delete('/user/:id', adminController.deleteUser);
router.get('/schedules/template', adminController.downloadScheduleTemplate);
router.get('/reports/pm/:id', adminController.downloadPmReport);
router.post('/schedules/import', (req, res, next) => {
  uploadSchedule(req, res, (err) => {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Excel files must be 2 MB or smaller' });
    }
    return res.status(400).json({ error: 'Could not upload the Excel file' });
  });
}, adminController.importScheduleWorkbook);
router.post('/branch-atm', adminController.createBranchAndAtm);
router.put('/atm/:id', adminController.updateAtm);
router.delete('/atm/:id', adminController.deleteAtm);

module.exports = router;