'use strict';

const NodeCache = require("node-cache");
const stockService = require('./stock.service');
const indicatorService = require('./indicator.service');
const sentimentService = require('./sentiment.service');
const logger = require('../utils/logger');

const terminalCache = new NodeCache({ stdTTL: 120 });

class TerminalService {

  async getTerminalData(symbol, range = '1y') {

    symbol = symbol.toUpperCase();

    const cacheKey = `${symbol}_${range}`;
    const cached = terminalCache.get(cacheKey);

    if (cached) {
      logger.debug(`Terminal cache HIT ${cacheKey}`);
      return cached;
    }

    logger.debug(`TerminalService.getTerminalData ${symbol}`);

    try {

      // history must load first because indicators depend on it
      const history = await stockService.getHistory(symbol, range);

      const [quote, fundamentals, sentiment, indicators] =
        await Promise.allSettled([
          stockService.getQuote(symbol),
          stockService.getFundamentals(symbol),
          sentimentService.getArticlesWithSentiment(symbol),
          indicatorService.calculate(history)
        ]);

      const result = {
        symbol,
        quote: quote.status === 'fulfilled' ? quote.value : null,
        fundamentals: fundamentals.status === 'fulfilled' ? fundamentals.value : null,
        sentiment: sentiment.status === 'fulfilled' ? sentiment.value : null,
        indicators: indicators.status === 'fulfilled' ? indicators.value : null,
        history
      };

      terminalCache.set(cacheKey, result);

      return result;

    } catch (err) {

      logger.error(`TerminalService error for ${symbol}`, err.message);
      throw err;

    }
  }

}

module.exports = new TerminalService();