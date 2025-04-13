const express = require('express');
const router = express.Router();
const { matchByRSBSA } = require('../controllers/matchingController');

router.get('/match/rsbsa', matchByRSBSA);

module.exports = router;