// Shared hooks and utilities
const { useState, useEffect, useRef, useMemo, useCallback, createContext, useContext } = React;

function useScrollY() {
  const [y, setY] = useState(0);
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setY(window.scrollY));
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return y;
}

function useReveal(ref, opts = {}) {
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setSeen(true);
            io.disconnect();
          }
        });
      },
      { threshold: opts.threshold ?? 0.15, rootMargin: opts.rootMargin ?? '0px 0px -80px 0px' }
    );
    io.observe(ref.current);
    return () => io.disconnect();
  }, []);
  return seen;
}

function Reveal({ children, delay = 0, as: As = 'div', className = '', ...rest }) {
  const ref = useRef(null);
  const seen = useReveal(ref);
  return (
    <As
      ref={ref}
      className={`reveal ${seen ? 'in' : ''} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
      {...rest}
    >
      {children}
    </As>
  );
}

function WordsReveal({ text, className = '', as: As = 'span' }) {
  const ref = useRef(null);
  const seen = useReveal(ref);
  const words = text.split(' ');
  return (
    <As ref={ref} className={`words ${seen ? 'in' : ''} ${className}`}>
      {words.map((w, i) => (
        <span
          key={i}
          className="word"
          style={{ transitionDelay: `${i * 50}ms`, marginRight: '0.25em' }}
        >
          {w}
        </span>
      ))}
    </As>
  );
}

// Smooth scroll to id
function scrollToId(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const y = el.getBoundingClientRect().top + window.scrollY - 70;
  window.scrollTo({ top: y, behavior: 'smooth' });
}

// Custom cursor
function useCustomCursor() {
  useEffect(() => {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    document.body.classList.add('has-cursor');
    const cursor = document.getElementById('cursor');
    if (!cursor) return;
    let mx = window.innerWidth / 2, my = window.innerHeight / 2;
    let cx = mx, cy = my;
    const onMove = (e) => { mx = e.clientX; my = e.clientY; };
    document.addEventListener('mousemove', onMove);
    let raf;
    const tick = () => {
      cx += (mx - cx) * 0.22;
      cy += (my - cy) * 0.22;
      cursor.style.transform = `translate(${cx}px, ${cy}px) translate(-50%, -50%)`;
      raf = requestAnimationFrame(tick);
    };
    tick();
    const hoverables = 'a, button, .tag, .service-card, .team-card, .mosaic-item, .article-card, .faq-item, .testimonial-card';
    const onOver = (e) => {
      if (e.target.closest(hoverables)) cursor.classList.add('large');
    };
    const onOut = (e) => {
      if (e.target.closest(hoverables)) cursor.classList.remove('large');
    };
    document.addEventListener('mouseover', onOver);
    document.addEventListener('mouseout', onOut);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseover', onOver);
      document.removeEventListener('mouseout', onOut);
      cancelAnimationFrame(raf);
      document.body.classList.remove('has-cursor');
    };
  }, []);
}

// XAF / FCFA formatter
function formatXAF(n) {
  return Math.round(n).toLocaleString('fr-FR').replace(/\u202f/g, ' ') + ' FCFA';
}

Object.assign(window, { useScrollY, useReveal, Reveal, WordsReveal, scrollToId, useCustomCursor, formatXAF });
