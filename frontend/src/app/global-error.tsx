'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    const message = String(error?.message || '');
    const isChunkError = message.includes('ChunkLoadError') || message.includes('Loading chunk');

    if (!isChunkError) return;

    const reloadKey = 'chunk-reload-attempted';
    const attempted = sessionStorage.getItem(reloadKey);

    if (!attempted) {
      sessionStorage.setItem(reloadKey, '1');
      window.location.reload();
      return;
    }

    // Do not loop endlessly if the reload could not fix the issue.
    sessionStorage.removeItem(reloadKey);
  }, [error]);

  return (
    <html>
      <body>
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <h2>Đã xảy ra lỗi!</h2>
          <p style={{ color: '#666', marginBottom: '16px' }}>
            {error?.message || 'Có lỗi không xác định xảy ra'}
          </p>
          <button
            onClick={() => {
              if (typeof reset === 'function') {
                reset();
              } else {
                window.location.reload();
              }
            }}
            style={{
              padding: '10px 20px',
              backgroundColor: '#0070f3',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
            }}
          >
            Thử lại
          </button>
        </div>
      </body>
    </html>
  );
}
