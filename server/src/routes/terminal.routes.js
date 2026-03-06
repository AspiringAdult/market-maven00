'use strict';

const express = require('express');
const router = express.Router();

const terminalController = require('../controllers/terminal.controller');

router.get('/:symbol', terminalController.getTerminal);

module.exports = router;