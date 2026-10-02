import { useState, useEffect, useCallback, useRef } from 'react';
import { checkBackendHealth } from '../services/api';

// Exponential backoff intervals:
// Attempt 1 -> immediately (attempt 0)
// Attempt 2 -> 1 second (delay 1000ms)
// Attempt 3 -> 2 seconds (delay 2000ms)
// Attempt 4 -> 4 seconds (delay 4000ms)
// Attempt 5 -> 5 seconds (delay 5000ms)
const RETRY_DELAYS = [1000, 2000, 4000, 5000];
const RECOVERY_INTERVAL_MS = 4000; // Background polling interval when connection lost (auto-recovers when backend comes up)
const HEARTBEAT_INTERVAL_MS = 30000; // Light heartbeat interval when connected

/**
 * Hook to monitor real backend health gracefully across public / auth pages.
 * - Starts in 'connecting' state with subtle gold indicator (never flashes red on initial load).
 * - Implements 5-attempt exponential backoff before reporting 'unavailable'.
 * - Background auto-recovery polling detects backend restoration without requiring page refresh.
 * - Manual Retry button calls GET /api/health and updates state dynamically.
 */
export function useBackendHealth() {
  const [healthStatus, setHealthStatus] = useState('connecting'); // 'connecting' | 'connected' | 'unavailable'
  const [statusMessage, setStatusMessage] = useState('Connecting to ShadowTrace...');
  const [retryAttempt, setRetryAttempt] = useState(0);

  const abortControllerRef = useRef(null);
  const timerIdRef = useRef(null);
  const isMountedRef = useRef(true);
  const checkFnRef = useRef(null);
  const isCheckingRef = useRef(false);
  const lastLoggedStatusRef = useRef(null);

  const logStatus = useCallback((status) => {
    if (lastLoggedStatusRef.current !== status) {
      lastLoggedStatusRef.current = status;
      if (status === 'connected') {
        console.log('[ShadowTrace] Backend health: ONLINE');
      } else if (status === 'unavailable') {
        console.warn('[ShadowTrace] Backend health: OFFLINE');
      }
    }
  }, []);

  const executeCheck = useCallback(async (attempt = 0, isManualRetry = false) => {
    if (!isMountedRef.current) return;

    // Prevent duplicate overlapping requests unless manual retry
    if (isCheckingRef.current && !isManualRetry) return;

    if (timerIdRef.current) {
      clearTimeout(timerIdRef.current);
      timerIdRef.current = null;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;
    isCheckingRef.current = true;

    try {
      if (isManualRetry) {
        setHealthStatus('connecting');
        setStatusMessage('Connecting to ShadowTrace...');
      }
      setRetryAttempt(attempt);

      const res = await checkBackendHealth({
        signal: controller.signal,
        timeout: 3500
      });

      // Verify real health response
      const isHealthy = Boolean(
        res && (
          res.success === true ||
          res.status === 'online' ||
          res.status === 'ok' ||
          res.status === 200 ||
          (typeof res.message === 'string' && res.message.toLowerCase().includes('running'))
        )
      );

      if (abortControllerRef.current === controller && isMountedRef.current) {
        if (isHealthy) {
          setHealthStatus('connected');
          setStatusMessage('');
          setRetryAttempt(0);
          logStatus('connected');

          // Schedule regular background heartbeat
          timerIdRef.current = setTimeout(() => {
            if (checkFnRef.current && isMountedRef.current) {
              checkFnRef.current(0, false);
            }
          }, HEARTBEAT_INTERVAL_MS);
        } else {
          throw new Error('Unexpected health response payload');
        }
      }
    } catch (err) {
      // Discard clean request cancellations
      if (
        !isMountedRef.current ||
        abortControllerRef.current !== controller ||
        err?.name === 'CanceledError' ||
        err?.name === 'AbortError' ||
        err?.code === 'ERR_CANCELED' ||
        err?.message === 'canceled'
      ) {
        return;
      }

      // If backend returned any HTTP response (e.g., 503 database service down, 429),
      // the backend Express process itself IS ONLINE and reachable
      if (err.response) {
        if (abortControllerRef.current === controller && isMountedRef.current) {
          setHealthStatus('connected');
          setStatusMessage('');
          setRetryAttempt(0);
          logStatus('connected');

          timerIdRef.current = setTimeout(() => {
            if (checkFnRef.current && isMountedRef.current) {
              checkFnRef.current(0, false);
            }
          }, HEARTBEAT_INTERVAL_MS);
        }
        return;
      }

      // Transport / network failure (connection refused, timeout, backend offline)
      if (attempt < RETRY_DELAYS.length) {
        const nextDelay = RETRY_DELAYS[attempt];
        if (isMountedRef.current) {
          setHealthStatus('connecting');
          setStatusMessage('Connecting to ShadowTrace...');
        }

        timerIdRef.current = setTimeout(() => {
          if (checkFnRef.current && isMountedRef.current) {
            checkFnRef.current(attempt + 1, false);
          }
        }, nextDelay);
      } else {
        // Repeated attempts exhausted: mark offline and enable retry button
        if (isMountedRef.current) {
          setHealthStatus('unavailable');
          setStatusMessage('Backend connection lost');
          logStatus('unavailable');
        }

        // Automatic background recovery polling: recovers automatically when backend starts
        timerIdRef.current = setTimeout(() => {
          if (checkFnRef.current && isMountedRef.current) {
            checkFnRef.current(RETRY_DELAYS.length, false);
          }
        }, RECOVERY_INTERVAL_MS);
      }
    } finally {
      if (abortControllerRef.current === controller) {
        isCheckingRef.current = false;
      }
    }
  }, [logStatus]);

  useEffect(() => {
    checkFnRef.current = executeCheck;
  }, [executeCheck]);

  // Initial check on mount + window focus / online listeners
  useEffect(() => {
    isMountedRef.current = true;
    executeCheck(0, false);

    const handleRecheck = () => {
      if (isMountedRef.current && document.visibilityState !== 'hidden') {
        executeCheck(0, false);
      }
    };

    window.addEventListener('focus', handleRecheck);
    window.addEventListener('online', handleRecheck);
    document.addEventListener('visibilitychange', handleRecheck);

    return () => {
      isMountedRef.current = false;
      window.removeEventListener('focus', handleRecheck);
      window.removeEventListener('online', handleRecheck);
      document.removeEventListener('visibilitychange', handleRecheck);

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (timerIdRef.current) {
        clearTimeout(timerIdRef.current);
      }
    };
  }, [executeCheck]);

  const retryNow = useCallback(() => {
    if (timerIdRef.current) {
      clearTimeout(timerIdRef.current);
      timerIdRef.current = null;
    }
    executeCheck(0, true);
  }, [executeCheck]);

  return {
    healthStatus,
    statusMessage,
    retryAttempt,
    isOperational: healthStatus === 'connected',
    retryNow
  };
}
