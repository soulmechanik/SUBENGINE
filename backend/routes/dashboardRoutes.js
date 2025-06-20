const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardControllers');

router.get('/revenue/weekly', dashboardController.getWeeklyRevenuePerGroupOwner);
router.get('/stats', dashboardController.getPlatformStats);
router.get('/transactions', dashboardController.getAllTransactions);
router.get('/groups', dashboardController.getAllGroupsWithInsights);


module.exports = router;
