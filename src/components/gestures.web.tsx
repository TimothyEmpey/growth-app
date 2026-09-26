import { useColors } from '@/providers/appearance';
import { router, usePathname } from 'expo-router';
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type TouchEvent,
} from 'react';
import { reducedMotion, TOUCH_CONTROLS } from './touch.web';

const MAIN_ROUTES = ['/', '/running', '/diet', '/account'] as const;
const PAGE_SWIPE_DISTANCE = 70;
const DELETE_SWIPE_DISTANCE = 96;
const AXIS_LOCK_DISTANCE = 10;

type Touch = {
  x: number;
  y: number;
  time: number;
  axis?: 'horizontal' | 'vertical';
};

function direction(start: Touch, event: TouchEvent<HTMLElement>) {
  const touch = event.touches[0];
  if (!touch) return;
  const x = touch.clientX - start.x;
  const y = touch.clientY - start.y;
  if (!start.axis && Math.max(Math.abs(x), Math.abs(y)) >= AXIS_LOCK_DISTANCE)
    start.axis = Math.abs(x) > Math.abs(y) * 1.25 ? 'horizontal' : 'vertical';
  return { x, axis: start.axis };
}

// Web gestures lock to an axis before moving UI. Vertical touches remain native browser scrolls.
export function MainPageSwipe({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const routeIndex = MAIN_ROUTES.indexOf(pathname as (typeof MAIN_ROUTES)[number]);
  const touch = useRef<Touch | null>(null);
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  useLayoutEffect(() => {
    setOffset(0);
    setDragging(false);
    touch.current = null;
  }, [pathname]);

  const finish = (event: TouchEvent<HTMLDivElement>) => {
    const start = touch.current;
    touch.current = null;
    setDragging(false);
    if (!start || start.axis !== 'horizontal') {
      setOffset(0);
      return;
    }
    const end = event.changedTouches[0];
    const distance = end ? end.clientX - start.x : offset;
    const velocity = distance / Math.max(1, performance.now() - start.time);
    const nextIndex = routeIndex + (distance < 0 ? 1 : -1);
    if (
      nextIndex < 0 ||
      nextIndex >= MAIN_ROUTES.length ||
      (Math.abs(distance) < PAGE_SWIPE_DISTANCE && Math.abs(velocity) < 0.65)
    ) {
      setOffset(0);
      return;
    }
    // Browser snapshots bridge the route change without an empty frame between pages.
    setOffset(0);
    const navigate = async () => {
      router.replace(MAIN_ROUTES[nextIndex]);
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );
    };
    if (document.startViewTransition && !reducedMotion()) {
      document.documentElement.style.setProperty(
        '--growth-swipe-direction',
        distance < 0 ? '1' : '-1',
      );
      document.startViewTransition(navigate);
    } else void navigate();
  };

  return (
    <div
      className="growth-swipe-page"
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0,
        overflow: 'hidden',
        touchAction: 'pan-y',
        transform: `translateX(${offset}px)`,
        transition:
          dragging || (typeof window !== 'undefined' && reducedMotion())
            ? 'none'
            : 'transform 180ms ease-out',
      }}
      onTouchStart={(event) => {
        const point = event.touches[0];
        if (
          !point ||
          routeIndex < 0 ||
          event.touches.length !== 1 ||
          document.querySelector('[role="dialog"]') ||
          (event.target as Element).closest(`${TOUCH_CONTROLS},[data-swipe-item]`)
        )
          return;
        touch.current = { x: point.clientX, y: point.clientY, time: performance.now() };
      }}
      onTouchMove={(event) => {
        if (!touch.current) return;
        const movement = direction(touch.current, event);
        if (movement?.axis !== 'horizontal') return;
        setDragging(true);
        const atEdge =
          (routeIndex === 0 && movement.x > 0) ||
          (routeIndex === MAIN_ROUTES.length - 1 && movement.x < 0);
        setOffset(movement.x * (atEdge ? 0.12 : 0.35));
      }}
      onTouchEnd={finish}
      onTouchCancel={() => {
        touch.current = null;
        setDragging(false);
        setOffset(0);
      }}
    >
      {children}
    </div>
  );
}

export function SwipeToDelete({
  children,
  onDelete,
  accessibilityLabel,
}: {
  children: ReactNode;
  onDelete: () => void;
  accessibilityLabel: string;
}) {
  const C = useColors();
  const touch = useRef<Touch | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const finish = (event: TouchEvent<HTMLDivElement>) => {
    const start = touch.current;
    touch.current = null;
    setDragging(false);
    if (!start || start.axis !== 'horizontal') {
      setOffset(0);
      return;
    }
    const end = event.changedTouches[0];
    const distance = end ? end.clientX - start.x : offset;
    const velocity = distance / Math.max(1, performance.now() - start.time);
    if (distance <= -DELETE_SWIPE_DISTANCE || velocity <= -0.85) {
      setOffset(-140);
      timer.current = setTimeout(onDelete, 140);
    } else setOffset(0);
  };

  return (
    <div
      data-swipe-item="true"
      aria-label={accessibilityLabel}
      style={{ overflow: 'hidden', position: 'relative', touchAction: 'pan-y' }}
      onTouchStart={(event) => {
        const point = event.touches[0];
        if (!point) return;
        touch.current = { x: point.clientX, y: point.clientY, time: performance.now() };
      }}
      onTouchMove={(event) => {
        if (!touch.current) return;
        const movement = direction(touch.current, event);
        if (movement?.axis !== 'horizontal') return;
        setDragging(true);
        setOffset(Math.max(-120, Math.min(0, movement.x)));
      }}
      onTouchEnd={finish}
      onTouchCancel={() => {
        touch.current = null;
        setDragging(false);
        setOffset(0);
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          padding: '0 22px',
          color: '#fff',
          background: C.red,
          fontSize: 14,
          fontWeight: 600,
        }}
      >
        Delete
      </div>
      <div
        style={{
          position: 'relative',
          background: C.surface,
          transform: `translateX(${offset}px)`,
          transition: dragging ? 'none' : 'transform 140ms ease-out',
        }}
      >
        {children}
      </div>
    </div>
  );
}
