import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { getAbsoluteApiUrl } from './googleSheets';
import { trackEvent } from './analytics';

const DEVICE_ID_KEY = 'cl_device_id';
const LAST_PING_KEY = 'cl_last_telemetry_ping';
const RESUME_DEBOUNCE_MS = 30000; // 30 seconds

export function getDeviceId(): string {
  try {
    let id = localStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
      id = typeof crypto !== 'undefined' && crypto.randomUUID 
        ? crypto.randomUUID() 
        : 'cl_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now().toString(36);
      localStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
  } catch {
    return 'anon_device';
  }
}

export function getClientPlatform(): string {
  if (Capacitor.isNativePlatform()) {
    return Capacitor.getPlatform(); // 'android' or 'ios'
  }
  const isPwa = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;
  if (isPwa) return 'pwa';
  
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  return isMobile ? 'web_mobile' : 'web_desktop';
}

export async function pingTelemetry(event: 'app_launch' | 'app_resume', options?: { tableId?: string; theme?: string }) {
  try {
    const now = Date.now();
    const lastPingStr = sessionStorage.getItem(LAST_PING_KEY);
    const lastPing = lastPingStr ? parseInt(lastPingStr, 10) : 0;

    // Debounce resumes within 30 seconds
    if (event === 'app_resume' && now - lastPing < RESUME_DEBOUNCE_MS) {
      return;
    }
    sessionStorage.setItem(LAST_PING_KEY, String(now));

    const platform = getClientPlatform();
    const deviceId = getDeviceId();

    // 1. Send to our first-party backend
    const url = getAbsoluteApiUrl('/api/telemetry/ping');
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event,
        platform,
        deviceId,
        tableId: options?.tableId,
        theme: options?.theme,
        version: '1.0.0'
      }),
      keepalive: true
    }).catch(() => {
      // Non-blocking failover / silent ignore
    });

    // 2. Also log in Google Analytics (GA4)
    trackEvent(event, { platform, device: deviceId.slice(0, 8) });
  } catch (err) {
    console.debug('Telemetry ping failed silently:', err);
  }
}

/**
 * Initializes automatic lifecycle tracking (launch and resume)
 */
export function initTelemetry(options?: { getTableId?: () => string; getTheme?: () => string }) {
  // 1. Immediate cold start ping
  pingTelemetry('app_launch', {
    tableId: options?.getTableId?.(),
    theme: options?.getTheme?.()
  });

  // 2. Native Capacitor App State changes (Android / iOS)
  if (Capacitor.isNativePlatform()) {
    try {
      CapacitorApp.addListener('appStateChange', (state) => {
        if (state.isActive) {
          pingTelemetry('app_resume', {
            tableId: options?.getTableId?.(),
            theme: options?.getTheme?.()
          });
        }
      });
    } catch (e) {
      console.debug('Capacitor App listener error:', e);
    }
  }

  // 3. Web / PWA Visibility changes
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        pingTelemetry('app_resume', {
          tableId: options?.getTableId?.(),
          theme: options?.getTheme?.()
        });
      }
    });
  }
}
