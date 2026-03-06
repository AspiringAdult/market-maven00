'use strict';

const terminalService = require('../services/terminal.service');

exports.getTerminal = async (req, res, next) => {

  try {

    const { symbol } = req.params;
    const { range = '1y' } = req.query;

    const data = await terminalService.getTerminalData(symbol, range);

    res.json({
      success: true,
      data
    });

  } catch (err) {
    next(err);
  }

};