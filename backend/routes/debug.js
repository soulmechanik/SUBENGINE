const express = require('express');
const router = express.Router();
const { getDBStatus } = require('../controllers/debugController');

router.get('/db-info', getDBStatus);

module.exports = router;
