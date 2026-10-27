const express = require('express');
const multer = require('multer');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { requireRole } = require('../middleware/authMiddleware');

const uploadSchedule = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
}).single('file');

router.use(requireRole('ADMIN'));

router.post('/branch', adminController.createBranch);
router.post('/atm', adminController.createAtm);
router.get('/users', adminController.getUsers);
router.post('/user', adminController.createUser);
router.put('/user/:id', adminController.updateUser);
router.delete('/user/:id', adminController.deleteUser);
router.get('/schedules/template', adminController.downloadScheduleTemplate);
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
router.delete('/atm/:id', adminController.deleteAtm);

module.exports = router;