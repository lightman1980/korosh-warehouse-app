import { useEffect, useCallback, useRef } from 'react';

interface UseSessionTimeoutProps {
  timeoutMinutes: number;
  onTimeout: () => void;
  enabled?: boolean;
}

export const useSessionTimeout = ({
  timeoutMinutes,
  onTimeout,
  enabled = true
}: UseSessionTimeoutProps) => {
  const timeoutIdRef = useRef<number | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  const resetTimeout = useCallback(() => {
    if (!enabled) return;
    
    lastActivityRef.current = Date.now();
    
    if (timeoutIdRef.current) {
      window.clearTimeout(timeoutIdRef.current);
    }

    timeoutIdRef.current = window.setTimeout(() => {
      onTimeout();
    }, timeoutMinutes * 60 * 1000);
  }, [timeoutMinutes, onTimeout, enabled]);

  useEffect(() => {
    if (!enabled) {
      if (timeoutIdRef.current) {
        window.clearTimeout(timeoutIdRef.current);
      }
      return;
    }

    const events = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click'
    ];

    const handleActivity = () => {
      resetTimeout();
    };

    // Initialize timeout
    resetTimeout();

    // Add event listeners
    events.forEach(event => {
      window.addEventListener(event, handleActivity);
    });

    // Clean up
    return () => {
      if (timeoutIdRef.current) {
        window.clearTimeout(timeoutIdRef.current);
      }
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [enabled, resetTimeout]);

  return {
    resetTimeout,
    lastActivity: lastActivityRef.current
  };
};
