import {usePageScrollLock} from './page-scroll-lock';
import {tr, localeCode, categoryLabel} from '@/lib/i18n';
'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
let activeScreen = '';

export function useScreenHistory(initial: string, onClose: () => void) {
  const [page, setPage] = useState(initial),
    id = useRef('screen-' + crypto.randomUUID()),
    close = useRef(onClose);
  const maxDepth = useRef(1);
  close.current = onClose;
  useEffect(() => {
    const name = id.current;
    activeScreen = name;
    history.pushState({ dengiScreen: name, page: initial, depth: 1 }, '');
    const pop = () => {
      if (history.state?.dengiScreen === name) setPage(history.state.page);
      else setPage('');
    };
    window.addEventListener('popstate', pop);
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && history.state?.dengiScreen === name)
        history.back();
    };
    window.addEventListener('keydown', key);
    return () => {
      window.removeEventListener('popstate', pop);
      window.removeEventListener('keydown', key);
      if (activeScreen === name) activeScreen = '';
      if (history.state?.dengiScreen === name) history.go(-history.state.depth);
    };
  }, []);
  function go(next: string) {
    if (next === page) return;
    const depth =
      history.state?.dengiScreen === id.current ? history.state.depth + 1 : 1;
    history.pushState({ dengiScreen: id.current, page: next, depth }, '');
    maxDepth.current = depth;
    activeScreen = id.current;
    setPage(next);
  }
  function back() {
    if (history.state?.dengiScreen === id.current) history.back();
    else close.current();
  }
  function forward() {
    if (
      activeScreen === id.current &&
      (!page || history.state?.depth < maxDepth.current)
    )
      history.forward();
  }
  useEffect(() => {
    if (page) return;
    let start: { x: number; y: number } | null = null;
    const down = (e: TouchEvent) => {
      const p = e.touches[0];
      start = p.clientX < 36 ? { x: p.clientX, y: p.clientY } : null;
    };
    const up = (e: TouchEvent) => {
      const p = e.changedTouches[0];
      if (
        start &&
        activeScreen === id.current &&
        !document.querySelector('.page-screen') &&
        p.clientX - start.x > 75 &&
        Math.abs(p.clientY - start.y) < 65
      )
        forward();
      start = null;
    };
    document.addEventListener('touchstart', down, { passive: true });
    document.addEventListener('touchend', up, { passive: true });
    return () => {
      document.removeEventListener('touchstart', down);
      document.removeEventListener('touchend', up);
    };
  }, [page]);
  return { page, go, back, forward };
}

export function Screen({
  title,
  back,
  action,
  children,
  busy = false,
  forward,
  heading,
  hideBack = false,
}: {
  title: string;
  back: () => void;
  action?: ReactNode;
  children: ReactNode;
  busy?: boolean;
  forward?: () => void;
  heading?: ReactNode;
  hideBack?: boolean;
}) {
  const touch = useRef<{ x: number; y: number; edge: 'left' | 'right' } | null>(
    null,
  );
  usePageScrollLock(true);
  return (
    <section
      className="page-screen"
      aria-label={title}
      role="dialog" aria-modal="true"
      onClick={e=>{if(e.target===e.currentTarget&&!busy)back()}}
      onTouchStart={(e) => {
        const p = e.touches[0],
          w = window.innerWidth;
        if (p.clientX < 36 || p.clientX > w - 36)
          touch.current = {
            x: p.clientX,
            y: p.clientY,
            edge: p.clientX < 36 ? 'left' : 'right',
          };
        else touch.current = null;
      }}
      onTouchEnd={(e) => {
        const a = touch.current;
        touch.current = null;
        if (!a || busy) return;
        const b = e.changedTouches[0],
          dx = b.clientX - a.x,
          dy = b.clientY - a.y;
        if (Math.abs(dy) < 65 && a.edge === 'right' && dx < -75) back();
        else if (Math.abs(dy) < 65 && a.edge === 'left' && dx > 75)
          (forward || (() => history.forward()))();
      }}
    >
      <div className="screen-window"><header className={'screen-bar' + (hideBack ? ' no-back' : '')}>
        {(
          <button
            className="back-button" data-direct-action="true"
            disabled={busy}
            onClick={back}
            aria-label={tr("Назад")}
          >
            <ArrowLeft size={28} />
          </button>
        )}
        <div className="screen-heading">{heading || <h1>{title}</h1>}</div>
        <div className="screen-action">{action}</div>
      </header>
      <div className="screen-body">{children}</div></div>
    </section>
  );
}
