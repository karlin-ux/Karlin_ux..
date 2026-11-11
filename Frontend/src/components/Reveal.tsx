import type { CSSProperties, ReactNode } from 'react';
import { useInView } from '../hooks/useAnimationUtils';

export default function Reveal({
  children,
  className = '',
  delay = 0,
  y = 18,
  as: Tag = 'div',
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  as?: 'div' | 'section' | 'article' | 'li' | 'span';
}) {
  const { ref, inView } = useInView<HTMLElement>();
  const style: CSSProperties = {
    '--reveal-delay': `${delay}ms`,
    '--reveal-y': `${y}px`,
  } as CSSProperties;
  return (
    <Tag
      ref={ref as any}
      className={`reveal ${inView ? 'reveal-in' : ''} ${className}`}
      style={style}
    >
      {children}
    </Tag>
  );
}
