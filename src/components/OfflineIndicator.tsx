import { useState, useEffect, useRef } from 'react';
import { WifiOff, Clock, CheckCircle, Upload } from 'lucide-react';
import { isOnline } from '../services/connectivity';
import { getOutboxCount } from '../services/outbox';
import { OutboxPanel } from './OutboxPanel';

const NO_DRAG = { WebkitAppRegion: 'no-drag' } as React.CSSProperties;

export function OfflineIndicator() {
  const [online, setOnline]             = useState(isOnline());
  const [outboxCount, setOutboxCount]   = useState(0);
  const [showFlushed, setShowFlushed]   = useState(false);
  const [flushedCount, setFlushedCount] = useState(0);
  const [panelOpen, setPanelOpen]       = useState(false);
  const [anchor, setAnchor]             = useState({ top: 0, right: 16 });
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const refresh = async () => {
      setOnline(isOnline());
      setOutboxCount(await getOutboxCount());
    };
    refresh();
    const t = setInterval(refresh, 2000);

    const onOnline  = () => { setOnline(true);  getOutboxCount().then(setOutboxCount); };
    const onOffline = () => { setOnline(false); getOutboxCount().then(setOutboxCount); };
    const onOutbox  = () => getOutboxCount().then(setOutboxCount);
    const onFlushed = (e: Event) => {
      const { sent } = (e as CustomEvent).detail || {};
      if (sent > 0) {
        setFlushedCount(sent);
        setShowFlushed(true);
        getOutboxCount().then(setOutboxCount);
        setTimeout(() => setShowFlushed(false), 4000);
      }
    };

    window.addEventListener('snl:online',         onOnline);
    window.addEventListener('snl:offline',        onOffline);
    window.addEventListener('snl:outbox-changed', onOutbox);
    window.addEventListener('snl:outbox-flushed', onFlushed);
    return () => {
      clearInterval(t);
      window.removeEventListener('snl:online',         onOnline);
      window.removeEventListener('snl:offline',        onOffline);
      window.removeEventListener('snl:outbox-changed', onOutbox);
      window.removeEventListener('snl:outbox-flushed', onFlushed);
    };
  }, []);

  const openPanel = () => {
    const rect = btnRef.current?.getBoundingClientRect();
    setAnchor({
      top:   rect ? rect.bottom : 40,
      right: rect ? window.innerWidth - rect.right : 16,
    });
    setPanelOpen(true);
  };

  if (showFlushed) {
    return (
      <div style={NO_DRAG} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/20 border border-green-400/40 text-green-200 text-[11px] font-semibold">
        <CheckCircle className="w-3 h-3" />
        {flushedCount} envoyé{flushedCount > 1 ? 's' : ''}
      </div>
    );
  }

  if (!online) {
    return (
      <>
        <button
          ref={btnRef}
          style={NO_DRAG}
          onClick={openPanel}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-500/20 border border-orange-400/40 text-orange-200 text-[11px] font-semibold hover:bg-orange-500/30 transition-colors"
        >
          <WifiOff className="w-3 h-3" />
          <span>Hors ligne</span>
          {outboxCount > 0 && (
            <span className="flex items-center gap-0.5 bg-orange-500/30 px-1.5 py-0.5 rounded-full">
              <Clock className="w-2.5 h-2.5" />
              {outboxCount}
            </span>
          )}
        </button>
        {panelOpen && (
          <OutboxPanel anchorTop={anchor.top} anchorRight={anchor.right} onClose={() => setPanelOpen(false)} />
        )}
      </>
    );
  }

  if (outboxCount > 0) {
    return (
      <>
        <button
          ref={btnRef}
          style={NO_DRAG}
          onClick={openPanel}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/20 border border-blue-400/40 text-blue-200 text-[11px] font-semibold hover:bg-blue-500/30 transition-colors"
        >
          <Upload className="w-3 h-3 animate-bounce" />
          <span>Envoi…</span>
          <span className="bg-blue-500/30 px-1.5 py-0.5 rounded-full">{outboxCount}</span>
        </button>
        {panelOpen && (
          <OutboxPanel anchorTop={anchor.top} anchorRight={anchor.right} onClose={() => setPanelOpen(false)} />
        )}
      </>
    );
  }

  return null;
}
