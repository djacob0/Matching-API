const express = require('express');
const router = express.Router();
const { matchByRSBSA } = require('../controllers/matchingController');
const { dataCleaning } = require('../controllers/dataCleaning');

router.get('/match/rsbsa', matchByRSBSA);
router.post('/clean', dataCleaning);

module.exports = router;