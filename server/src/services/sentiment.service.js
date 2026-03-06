'use strict';

const axios  = require('axios');
const config = require('../config');
const logger = require('../utils/logger');

/**
 * Finance-domain AFINN-style lexicon.
 * Scores range from -3 (very negative) to +3 (very positive).
 */
const LEXICON = {
  // Positive
  bullish: 3, surge: 2, rally: 2, soar: 3, jump: 2, gain: 2, profit: 2,
  beat: 2, exceed: 2, strong: 2, growth: 2, record: 1, upgrade: 2,
  outperform: 2, buy: 1, positive: 2, rise: 1, increase: 1, recovery: 2,
  boom: 2, breakout: 2, momentum: 1, robust: 2, earnings: 1, dividend: 1,
  innovation: 1, partnership: 1, approval: 2, launch: 1, expansion: 1,
  // Negative
  bearish: -3, crash: -3, plunge: -3, tumble: -2, fall: -2, drop: -2,
  decline: -2, loss: -2, miss: -2, weak: -2, downgrade: -2, sell: -1,
  negative: -2, risk: -1, volatile: -1, uncertainty: -1, recession: -3,
  lawsuit: -2, fraud: -3, bankrupt: -3, debt: -1, warning: -2, layoff: -2,
  investigation: -2, fine: -2, penalty: -2, recall: -2, shortage: -1,
};

class SentimentService {
  /**
   * Fetch latest news articles and attach NLP sentiment scores.
   */
  async getArticlesWithSentiment(symbol, pageSize = 10) {
    logger.debug(`SentimentService.getArticlesWithSentiment: ${symbol}`);

    if (!config.newsApiKey) {
      logger.warn('NEWS_API_KEY not configured – returning mock data');
      return this._mockData(symbol);
    }

    let articles = [];
    try {
      const response = await axios.get('https://newsapi.org/v2/everything', {
        params: {
          q:        `${symbol} stock`,
          sortBy:   'relevancy',
          pageSize: Math.min(pageSize, 20),
          language: 'en',
        },
        headers: { 'X-Api-Key': config.newsApiKey },
        timeout: 10_000,
      });
      articles = response.data.articles || [];
    } catch (err) {
      logger.error(`NewsAPI error: ${err.message}`);
      return this._mockData(symbol);
    }

    const analysed = articles.map((article) => {
      const text  = `${article.title || ''} ${article.description || ''}`;
      const score = this._polarity(text);
      return {
        title:       article.title        || '',
        description: article.description  || '',
        url:         article.url          || '#',
        source:      article.source?.name || 'Unknown',
        publishedAt: article.publishedAt  || new Date().toISOString(),
        polarity:    score,
        sentiment:   score > 0.1 ? 'positive' : score < -0.1 ? 'negative' : 'neutral',
        subjectivity:this._subjectivity(text),
      };
    });

    const scores = analysed.map((a) => a.polarity);
    const avg    = scores.length
      ? scores.reduce((a, b) => a + b, 0) / scores.length
      : 0;

    return {
      symbol,
      articles: analysed,
      aggregate: {
        avgPolarity:      parseFloat(avg.toFixed(4)),
        overallSentiment: avg > 0.1 ? 'positive' : avg < -0.1 ? 'negative' : 'neutral',
        positive: analysed.filter((a) => a.sentiment === 'positive').length,
        negative: analysed.filter((a) => a.sentiment === 'negative').length,
        neutral:  analysed.filter((a) => a.sentiment === 'neutral').length,
        total:    analysed.length,
      },
    };
  }

  // ─── Private ────────────────────────────────────────────────────────────────

  _polarity(text) {
    const words = text.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/);
    let score = 0, hits = 0;
    for (const w of words) {
      if (LEXICON[w] !== undefined) { score += LEXICON[w]; hits++; }
    }
    return parseFloat((hits > 0 ? score / hits : 0).toFixed(4));
  }

  _subjectivity(text) {
    const words    = text.toLowerCase().split(/\s+/);
    const opinionW = words.filter((w) => LEXICON[w] !== undefined).length;
    return words.length > 0
      ? parseFloat((opinionW / words.length).toFixed(4))
      : 0;
  }

  _mockData(symbol) {
    const articles = [
      {
        title: `${symbol} shows strong market performance amid sector growth`,
        description: 'Analysts project continued bullish momentum and earnings beat.',
        url: '#', source: 'Market Watch', publishedAt: new Date().toISOString(),
        polarity: 0.6, sentiment: 'positive', subjectivity: 0.35,
      },
      {
        title: `${symbol} faces uncertainty as macro headwinds persist`,
        description: 'Bearish sentiment growing as recession risk and debt concerns mount.',
        url: '#', source: 'Reuters', publishedAt: new Date().toISOString(),
        polarity: -0.4, sentiment: 'negative', subjectivity: 0.4,
      },
      {
        title: `${symbol} earnings report due next quarter`,
        description: 'Investors await quarterly results; analysts remain neutral.',
        url: '#', source: 'Bloomberg', publishedAt: new Date().toISOString(),
        polarity: 0.0, sentiment: 'neutral', subjectivity: 0.1,
      },
      {
        title: `Institutional holders increase ${symbol} position`,
        description: 'Major funds boost holdings, signalling confidence in recovery.',
        url: '#', source: 'CNBC', publishedAt: new Date().toISOString(),
        polarity: 0.5, sentiment: 'positive', subjectivity: 0.3,
      },
      {
        title: `${symbol} announces expansion into new markets`,
        description: 'Growth strategy includes international launch and new partnerships.',
        url: '#', source: 'Financial Times', publishedAt: new Date().toISOString(),
        polarity: 0.7, sentiment: 'positive', subjectivity: 0.25,
      },
    ];

    const avg = articles.reduce((s, a) => s + a.polarity, 0) / articles.length;
    return {
      symbol,
      articles,
      aggregate: {
        avgPolarity:      parseFloat(avg.toFixed(4)),
        overallSentiment: avg > 0.1 ? 'positive' : avg < -0.1 ? 'negative' : 'neutral',
        positive: articles.filter((a) => a.sentiment === 'positive').length,
        negative: articles.filter((a) => a.sentiment === 'negative').length,
        neutral:  articles.filter((a) => a.sentiment === 'neutral').length,
        total:    articles.length,
      },
    };
  }
}

module.exports = new SentimentService();