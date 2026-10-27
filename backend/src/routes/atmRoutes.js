const express = require('express');
const router = express.Router();
const atmController = require('../controllers/tmController');

router.get('/', atmController.getAllAtms);
router.get('/branches', atmController.getAllBranches);

module.exports = router;