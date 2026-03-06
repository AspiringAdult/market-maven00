import { Radio } from 'lucide-react';

export default function LiveToggle({ enabled, onToggle, countdown }) {
  return (
    <button
      onClick={onToggle}
      className={`flex items-center gap-2 font-mono text-xs px-3 py-1.5 rounded-lg
                  border transition-all
                  ${enabled
                    ? 'bg-up/10 text-up border-up/30 hover:bg-up/20'
                    : 'bg-card text-muted border-border hover:border-borderHi hover:text-dim'
                  }`}
      title={enabled ? 'Disable auto-refresh' : 'Enable auto-refresh (30s)'}
    >
      <Radio size={12} className={enabled ? 'animate-pulse' : ''} />
      <span>{enabled ? 'LIVE' : 'LIVE OFF'}</span>
      {enabled && countdown != null && (
        <span className="font-mono text-[10px] opacity-70">
          {countdown}s
        </span>
      )}
    </button>
  );
}