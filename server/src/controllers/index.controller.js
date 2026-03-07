'use strict';

const indexService = require('../services/index.service');
const { asyncHandler } = require('../middleware/errorHandler');


const getIndices = asyncHandler(async (req, res) => {

  const names = ['NIFTY50', 'FINNIFTY', 'NIFTYBANK', 'NASDAQ'];

  const data = names.map(name => {
    const idx = indexService.get(name);

    return {
      symbol: name,
      name: name,
      currency: name === 'NASDAQ' ? 'USD' : 'INR',
      price: idx.latestClose,
      change: idx.priceDiff,
      changePct: idx.pctDiff
    };
  });

  res.json(data);
});


const getIndex = asyncHandler(async (req, res) => {

  const { name } = req.params;
  const data = indexService.get(name.toUpperCase());

  res.sendCached(data);

});

module.exports = {
  getIndex,
  getIndices
};