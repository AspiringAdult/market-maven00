'use strict';

const router = require('express').Router();

const TICKERS = [
  "RELIANCE.NSE",
  "TCS.NSE",
  "INFY.NSE",
  "HDFCBANK.NSE",
  "ICICIBANK.NSE",
  "SBIN.NSE",
  "ITC.NSE",
  "LT.NSE",

  "AAPL",
  "TSLA",
  "NVDA",
  "MSFT",
  "AMZN",
  "META",
  "GOOGL"
];

router.get('/', (req, res) => {
  const query = (req.query.q || '').toUpperCase();

  if (!query) return res.json([]);

  const results = TICKERS
    .filter(t => t.includes(query))
    .slice(0, 8);

  res.json(results);
});

module.exports = router;