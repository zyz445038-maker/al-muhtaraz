const RESOURCE_TIMEOUT_MS = 5000;
const FRAME_CLEANUP_DELAY_MS = 60_000;

function waitForImage(image: HTMLImageElement): Promise<void> {
  if (image.complete) return Promise.resolve();

  return new Promise((resolve) => {
    const timeout = window.setTimeout(finish, RESOURCE_TIMEOUT_MS);
    function finish() {
      window.clearTimeout(timeout);
      image.removeEventListener('load', finish);
      image.removeEventListener('error', finish);
      resolve();
    }

    image.addEventListener('load', finish, { once: true });
    image.addEventListener('error', finish, { once: true });
  });
}

export function printHtmlDocument(html: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const frame = document.createElement('iframe');
    frame.setAttribute('title', 'معاينة الطباعة');
    frame.setAttribute('aria-hidden', 'true');
    frame.style.position = 'fixed';
    frame.style.left = '-10000px';
    frame.style.top = '0';
    frame.style.width = '210mm';
    frame.style.height = '297mm';
    frame.style.border = '0';
    document.body.appendChild(frame);

    let cleanupTimeout = 0;
    const cleanup = () => {
      window.clearTimeout(cleanupTimeout);
      frame.remove();
    };

    frame.onerror = () => {
      cleanup();
      reject(new Error('تعذر تجهيز صفحة الطباعة.'));
    };

    frame.onload = () => {
      void (async () => {
        try {
          const printDocument = frame.contentDocument;
          const printWindow = frame.contentWindow;
          if (!printDocument || !printWindow) {
            throw new Error('تعذر الوصول إلى صفحة الطباعة.');
          }

          let resourceTimeout = 0;
          await Promise.race([
            Promise.all([
              printDocument.fonts?.ready.catch(() => undefined) ?? Promise.resolve(),
              ...Array.from(printDocument.images, waitForImage)
            ]),
            new Promise<void>((resolveResources) => {
              resourceTimeout = window.setTimeout(resolveResources, RESOURCE_TIMEOUT_MS);
            })
          ]);
          window.clearTimeout(resourceTimeout);

          cleanupTimeout = window.setTimeout(cleanup, FRAME_CLEANUP_DELAY_MS);
          printWindow.addEventListener('afterprint', cleanup, { once: true });
          printWindow.focus();
          printWindow.print();
          resolve();
        } catch (error) {
          cleanup();
          reject(error);
        }
      })();
    };

    frame.srcdoc = html;
  });
}
