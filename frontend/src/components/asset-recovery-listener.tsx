'use client';

import { useEffect } from 'react';

const RELOAD_KEY = 'asset-reload-attempted';

function tryReloadOnce() {
  try {
    const attempted = sessionStorage.getItem(RELOAD_KEY);
    if (attempted) {
      sessionStorage.removeItem(RELOAD_KEY);
      return;
    }
    sessionStorage.setItem(RELOAD_KEY, '1');
    window.location.reload();
  } catch {
    window.location.reload();
  }
}

function isChunkOrAssetErrorMessage(message: string): boolean {
  const text = String(message || '');
  return (
    text.includes('ChunkLoadError') ||
    text.includes('Loading chunk') ||
    text.includes('Failed to fetch dynamically imported module')
  );
}

export function AssetRecoveryListener() {
  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      const target = event.target as EventTarget | null;

      if (target instanceof HTMLLinkElement) {
        const href = target.href || '';
        if (href.includes('/_next/static/css/')) {
          tryReloadOnce();
          return;
        }
      }

      if (target instanceof HTMLScriptElement) {
        const src = target.src || '';
        if (src.includes('/_next/static/chunks/')) {
          tryReloadOnce();
          return;
        }
      }

      if (isChunkOrAssetErrorMessage(event.message)) {
        tryReloadOnce();
      }
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const message =
        typeof reason === 'string'
          ? reason
          : String((reason && (reason.message || reason.toString?.())) || '');

      if (isChunkOrAssetErrorMessage(message)) {
        tryReloadOnce();
      }
    };

    window.addEventListener('error', onError, true);
    window.addEventListener('unhandledrejection', onUnhandledRejection);

    return () => {
      window.removeEventListener('error', onError, true);
      window.removeEventListener('unhandledrejection', onUnhandledRejection);
    };
  }, []);

  return null;
}
