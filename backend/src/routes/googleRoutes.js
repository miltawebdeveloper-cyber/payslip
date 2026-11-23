const express = require('express');
const router = express.Router();
const googleController = require('../controllers/googleController');

router.get('/status', googleController.getStatus);
router.get('/auth-url', googleController.getAuthUrl);
router.get('/oauth2callback', googleController.oauthCallback);

module.exports = router;
