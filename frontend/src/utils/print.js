let activeFrame = null;

/**
 * Opens the browser's print dialog for a standalone HTML document without
 * leaving the page. The document goes into a hidden same-origin iframe, so
 * only it is printed, not the app around it.
 */
export function printHtmlDocument(html) {
  return new Promise((resolve, reject) => {
    activeFrame?.remove();

    const frame = document.createElement('iframe');
    frame.setAttribute('aria-hidden', 'true');
    frame.setAttribute('tabindex', '-1');
    frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;';
    activeFrame = frame;

    frame.onload = () => {
      const win = frame.contentWindow;
      if (!win) {
        reject(new Error('Print frame did not load'));
        return;
      }
      const cleanup = () => {
        if (activeFrame === frame) activeFrame = null;
        frame.remove();
      };
      // Removing the frame while its own print call is unwinding can cancel
      // the job in some browsers, so wait a moment after the dialog closes.
      win.addEventListener('afterprint', () => setTimeout(cleanup, 1000), { once: true });
      try {
        win.focus();
        win.print();
        resolve();
      } catch (err) {
        cleanup();
        reject(err);
      }
    };

    frame.srcdoc = html;
    document.body.appendChild(frame);
  });
}
