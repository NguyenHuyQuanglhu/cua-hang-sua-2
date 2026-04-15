const staleChunkRecoveryScript = `
(function () {
  var KEY = 'asset-reload-attempted';

  function shouldHandleUrl(url) {
    if (!url || typeof url !== 'string') {
      return false;
    }

    return (
      url.indexOf('/_next/static/chunks/') !== -1 ||
      url.indexOf('/_next/static/css/') !== -1
    );
  }

  function shouldHandleMessage(message) {
    var text = String(message || '');
    return (
      text.indexOf('ChunkLoadError') !== -1 ||
      text.indexOf('Loading chunk') !== -1 ||
      text.indexOf('Failed to fetch dynamically imported module') !== -1
    );
  }

  function reloadOnce() {
    try {
      var attempted = sessionStorage.getItem(KEY);
      if (attempted) {
        sessionStorage.removeItem(KEY);
        return;
      }
      sessionStorage.setItem(KEY, '1');
    } catch (_) {}

    window.location.reload();
  }

  window.addEventListener(
    'error',
    function (event) {
      var target = event && event.target;

      if (target && target.tagName === 'LINK' && shouldHandleUrl(target.href)) {
        reloadOnce();
        return;
      }

      if (target && target.tagName === 'SCRIPT' && shouldHandleUrl(target.src)) {
        reloadOnce();
        return;
      }

      if (shouldHandleMessage(event && event.message)) {
        reloadOnce();
      }
    },
    true
  );

  window.addEventListener('unhandledrejection', function (event) {
    var reason = event && event.reason;
    var message =
      typeof reason === 'string'
        ? reason
        : String((reason && (reason.message || (reason.toString && reason.toString()))) || '');

    if (shouldHandleMessage(message)) {
      reloadOnce();
    }
  });
})();
`;

export default function Head() {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: staleChunkRecoveryScript }} />
    </>
  );
}
