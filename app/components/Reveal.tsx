'use client';

import { useRef } from 'react';
import { useReveal } from './hooks';

interface RevealProps {
  children: React.ReactNode;
  delay?: number;
  as?: React.ElementType;
  className?: string;
  style?: React.CSSProperties;
}

export function Reveal({ children, delay = 0, as: As = 'div', className = '', style }: RevealProps) {
  const ref = useRef<HTMLElement>(null);
  const seen = useReveal(ref as React.RefObject<Element>);
  const Tag = As as any;
  return (
    <Tag
      ref={ref}
      className={`reveal ${seen ? 'in' : ''} ${className}`}
      style={{ transitionDelay: `${delay}ms`, ...style }}
    >
      {children}
    </Tag>
  );
}

export function WordsReveal({ text, className = '', as: As = 'span' }: { text: string; className?: string; as?: React.ElementType }) {
  const ref = useRef<HTMLElement>(null);
  const seen = useReveal(ref as React.RefObject<Element>);
  const words = text.split(' ');
  const Tag = As as any;
  return (
    <Tag ref={ref} className={`words ${seen ? 'in' : ''} ${className}`}>
      {words.map((w, i) => (
        <span key={i} className="word" style={{ transitionDelay: `${i * 50}ms`, marginRight: '0.25em' }}>
          {w}
        </span>
      ))}
    </Tag>
  );
}

export function Arrow() {
  return (
    <svg width="14" height="10" viewBox="0 0 14 10" fill="none">
      <path d="M1 5H13M9 1L13 5L9 9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
