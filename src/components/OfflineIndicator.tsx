import { useState, useEffect } from 'react';
import { WifiOff, Clock, CheckCircle, Upload } from 'lucide-react';
import { isOnline } from '../services/connectivity';
import { getOutboxCount } from '../services/outbox';

export function OfflineIndicator() {
  const [online, setOnline] = useState(isOnline());
  const [outboxCount, setOutboxCount] = useState(0);
  const [showFlushed, setShowFlushed] = useState(false);
  const [flushedCount, setFlushedCount] = useState(0);

  useEffect(() => {
    const refreshCount = () => getOutboxCount().then(setOutboxCount);
    refreshCount();

    const onOnline = () => { setOnline(true); refreshCount(); };
    const onOffline = () => { setOnline(false); refreshCount(); };
    const onOutbox = () => refreshCount();
    const onFlushed = (e: Event) => {
      const { sent } = (e as CustomEvent).detail || {};
      if (sent > 0) {
        setFlushedCount(sent);
        setShowFlushed(true);
        refreshCount();
        setTimeout(() => setShowFlushed(false), 4000);
      }
    };

    window.addEventListener('snl:online', onOnline);
    window.addEventListener('snl:offline', onOffline);
    window.addEventListener('snl:outbox-changed', onOutbox);
    window.addEventListener('snl:outbox-flushed', onFlushed);
    return () => {
      window.removeEventListener('snl:online', onOnline);
      window.removeEventListener('snl:offline', onOffline);
      window.removeEventListener('snl:outbox-changed', onOutbox);
      window.removeEventListener('snl:outbox-flushed', onFlushed);
    };
  }, []);

  if (showFlushed) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-100 border border-green-300 text-green-700 text-[11px] font-semibold animate-pulse">
        <CheckCircle className="w-3 h-3" />
        {flushedCount} envoyé{flushedCount > 1 ? 's' : ''}
      </div>
    );
  }

  if (!online) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-100 border border-orange-300 text-orange-700 text-[11px] font-semibold">
        <WifiOff className="w-3 h-3" />
        <span>Hors ligne</span>
        {outboxCount > 0 && (
          <span className="flex items-center gap-0.5 bg-orange-200 px-1.5 py-0.5 rounded-full">
            <Clock className="w-2.5 h-2.5" />
            {outboxCount}
          </span>
        )}
      </div>
    );
  }

  if (outboxCount > 0) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-100 border border-blue-300 text-blue-700 text-[11px] font-semibold">
        <Upload className="w-3 h-3 animate-bounce" />
        <span>Sync en cours…</span>
        <span className="bg-blue-200 px-1.5 py-0.5 rounded-full">{outboxCount}</span>
      </div>
    );
  }

  return null;
}
