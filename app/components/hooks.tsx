'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export function useScrollY() {
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

export function useReveal(ref: React.RefObject<Element | null>, opts: { threshold?: number; rootMargin?: string } = {}) {
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) { setSeen(true); io.disconnect(); }
        });
      },
      { threshold: opts.threshold ?? 0.15, rootMargin: opts.rootMargin ?? '0px 0px -80px 0px' }
    );
    io.observe(ref.current);
    return () => io.disconnect();
  }, []);
  return seen;
}

export function useCustomCursor() {
  useEffect(() => {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    document.body.classList.add('has-cursor');
    const cursor = document.getElementById('cursor');
    if (!cursor) return;
    let mx = window.innerWidth / 2, my = window.innerHeight / 2;
    let cx = mx, cy = my;
    const onMove = (e: MouseEvent) => { mx = e.clientX; my = e.clientY; };
    document.addEventListener('mousemove', onMove);
    let raf: number;
    const tick = () => {
      cx += (mx - cx) * 0.22;
      cy += (my - cy) * 0.22;
      cursor.style.transform = `translate(${cx}px, ${cy}px) translate(-50%, -50%)`;
      raf = requestAnimationFrame(tick);
    };
    tick();
    const hoverables = 'a, button, .tag, .service-card, .team-card, .mosaic-item, .article-card, .faq-item, .testimonial-card';
    const onOver = (e: MouseEvent) => { if ((e.target as Element).closest(hoverables)) cursor.classList.add('large'); };
    const onOut = (e: MouseEvent) => { if ((e.target as Element).closest(hoverables)) cursor.classList.remove('large'); };
    document.addEventListener('mouseover', onOver);
    document.addEventListener('mouseout', onOut);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseover', onOver as EventListener);
      document.removeEventListener('mouseout', onOut as EventListener);
      cancelAnimationFrame(raf);
      document.body.classList.remove('has-cursor');
    };
  }, []);
}

export function scrollToId(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const y = el.getBoundingClientRect().top + window.scrollY - 70;
  window.scrollTo({ top: y, behavior: 'smooth' });
}

export function formatXAF(n: number) {
  return Math.round(n).toLocaleString('fr-FR').replace(/ /g, ' ') + ' FCFA';
}
