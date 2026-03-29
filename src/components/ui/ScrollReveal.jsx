// src/components/ui/ScrollReveal.jsx
import { useRef, useEffect, useState } from 'react';
import clsx from 'clsx';

/**
 * Fades and rises content into view when it enters the viewport (scroll-driven, one shot).
 * Respects prefers-reduced-motion via CSS.
 *
 * @param {Object} props
 * @param {import('react').ReactNode} props.children
 * @param {string} [props.className]
 * @param {number} [props.delayMs] — extra delay after intersect (stagger grids)
 * @param {number} [props.threshold] — IntersectionObserver threshold(s)
 * @param {string} [props.rootMargin]
 * @param {boolean} [props.disabled] — show immediately (no observer)
 */
export default function ScrollReveal({
  children,
  className,
  delayMs = 0,
  threshold = 0.08,
  rootMargin = '0px 0px -6% 0px',
  disabled = false,
}) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (disabled) {
      setVisible(true);
      return;
    }

    const element = ref.current;
    if (!element) return;

    let timeoutId;
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (!entry?.isIntersecting) return;
        observer.unobserve(element);
        if (delayMs > 0) {
          timeoutId = window.setTimeout(() => setVisible(true), delayMs);
        } else {
          setVisible(true);
        }
      },
      { threshold, rootMargin },
    );

    observer.observe(element);
    return () => {
      observer.disconnect();
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [disabled, delayMs, threshold, rootMargin]);

  return (
    <div
      ref={ref}
      className={clsx(
        'scroll-reveal',
        visible && 'scroll-reveal-is-visible',
        className,
      )}
    >
      {children}
    </div>
  );
}
