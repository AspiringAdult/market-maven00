import { Newspaper, ExternalLink, Clock, TrendingUp, TrendingDown, Minus } from 'lucide-react';

function timeAgo(isoString) {
  if (!isoString) return '';
  const diff  = Date.now() - new Date(isoString).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins < 60)   return `${mins}m ago`;
  if (hours < 24)  return `${hours}h ago`;
  return `${days}d ago`;
}

function SentimentDot({ sentiment }) {
  const map = {
    positive: { color: '#10b981', Icon: TrendingUp  },
    negative: { color: '#f43f5e', Icon: TrendingDown },
    neutral:  { color: '#f59e0b', Icon: Minus        },
  };
  const { color, Icon } = map[sentiment] || map.neutral;
  return <Icon size={11} style={{ color }} />;
}

function ArticleCard({ article, index }) {
  const delay = `fade-in-d${Math.min(index + 1, 6)}`;

  const badgeCls =
    article.sentiment === 'positive' ? 'badge-up' :
    article.sentiment === 'negative' ? 'badge-down' :
    'badge-neutral';

  return (
    <div className={`group bg-ink border border-border hover:border-borderHi rounded-lg p-4
                     transition-all hover:bg-cardHi cursor-default ${delay}`}>
      <div className="flex items-start gap-3">
        {/* Sentiment indicator */}
        <div className="mt-0.5 flex-shrink-0">
          <SentimentDot sentiment={article.sentiment} />
        </div>

        <div className="flex-1 min-w-0">
          {/* Title */}
          <p className="text-text text-sm leading-snug mb-2 group-hover:text-bright transition-colors">
            {article.title}
          </p>

          {/* Description */}
          {article.description && (
            <p className="text-dim text-xs leading-snug line-clamp-2 mb-2">
              {article.description}
            </p>
          )}

          {/* Meta row */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className={badgeCls}>{article.sentiment}</span>

            {article.source && (
              <span className="font-mono text-[10px] text-muted">{article.source}</span>
            )}

            {article.publishedAt && (
              <div className="flex items-center gap-1 text-muted">
                <Clock size={9} />
                <span className="font-mono text-[10px]">{timeAgo(article.publishedAt)}</span>
              </div>
            )}

            {/* Polarity score */}
            {article.polarity != null && (
              <span className="font-mono text-[10px] text-muted ml-auto">
                {article.polarity > 0 ? '+' : ''}{Number(article.polarity).toFixed(2)}
              </span>
            )}
          </div>
        </div>

        {/* External link */}
        {article.url && article.url !== '#' && (
          <a
            href={article.url}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex-shrink-0 text-muted hover:text-up transition-colors mt-0.5"
            title="Open article"
          >
            <ExternalLink size={13} />
          </a>
        )}
      </div>
    </div>
  );
}

export default function NewsPanel({ sentiment }) {
  const articles = sentiment?.articles ?? [];

  return (
    <div className="panel flex flex-col">
      <div className="panel-header">
        <div className="flex items-center gap-2">
          <span className="panel-label">News & Sentiment Feed</span>
          {articles.length > 0 && (
            <span className="font-mono text-[10px] bg-border/50 text-muted px-1.5 py-0.5 rounded">
              {articles.length}
            </span>
          )}
        </div>
        <Newspaper size={13} className="text-muted" />
      </div>

      {articles.length === 0 ? (
        <div className="flex-1 flex items-center justify-center p-10">
          <div className="text-center text-muted">
            <Newspaper size={28} className="mx-auto mb-3 opacity-30" />
            <p className="font-mono text-xs">No news articles available</p>
            <p className="font-mono text-[10px] text-muted/60 mt-1">
              Add NEWS_API_KEY to .env to enable live news
            </p>
          </div>
        </div>
      ) : (
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 overflow-y-auto">
          {articles.map((article, i) => (
            <ArticleCard key={i} article={article} index={i} />
          ))}
        </div>
      )}

      {/* Aggregate footer */}
      {sentiment?.aggregate && articles.length > 0 && (
        <div className="panel-header border-t border-border border-b-0 mt-auto">
          <div className="flex items-center gap-4">
            <span className="panel-label">
              Avg Polarity: <span className={
                sentiment.aggregate.avgPolarity > 0.1 ? 'text-up' :
                sentiment.aggregate.avgPolarity < -0.1 ? 'text-down' : 'text-gold'
              }>{sentiment.aggregate.avgPolarity > 0 ? '+' : ''}
              {Number(sentiment.aggregate.avgPolarity).toFixed(4)}</span>
            </span>
          </div>
          <span className={`font-mono text-xs font-bold capitalize ${
            sentiment.aggregate.overallSentiment === 'positive' ? 'text-up' :
            sentiment.aggregate.overallSentiment === 'negative' ? 'text-down' : 'text-gold'
          }`}>
            {sentiment.aggregate.overallSentiment}
          </span>
        </div>
      )}
    </div>
  );
}