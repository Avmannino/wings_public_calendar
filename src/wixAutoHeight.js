const MESSAGE_TYPE = "VITE_AUTO_HEIGHT";

function getContentHeight() {
  const root = document.getElementById("root");

  if (root) {
    return Math.ceil(
      Math.max(
        root.scrollHeight,
        root.offsetHeight,
        root.getBoundingClientRect().height
      )
    );
  }

  return Math.ceil(
    Math.max(
      document.body.scrollHeight,
      document.body.offsetHeight,
      document.documentElement.scrollHeight,
      document.documentElement.offsetHeight
    )
  );
}

export function initWixAutoHeight() {
  if (window.parent === window) {
    return;
  }

  let lastHeight = 0;
  let animationFrame = null;

  const sendHeight = () => {
    if (animationFrame) {
      cancelAnimationFrame(animationFrame);
    }

    animationFrame = requestAnimationFrame(() => {
      const height = getContentHeight();

      if (!height) {
        return;
      }

      if (height === lastHeight) {
        return;
      }

      lastHeight = height;

      window.parent.postMessage(
        {
          type: MESSAGE_TYPE,
          height,
          pathname: window.location.pathname,
        },
        "*"
      );
    });
  };

  sendHeight();

  requestAnimationFrame(sendHeight);

  setTimeout(sendHeight, 50);
  setTimeout(sendHeight, 100);
  setTimeout(sendHeight, 250);
  setTimeout(sendHeight, 500);
  setTimeout(sendHeight, 1000);
  setTimeout(sendHeight, 1500);
  setTimeout(sendHeight, 2500);

  const root = document.getElementById("root");

  const resizeObserver = new ResizeObserver(() => {
    sendHeight();
  });

  if (root) {
    resizeObserver.observe(root);
  } else {
    resizeObserver.observe(document.body);
  }

  window.addEventListener(
    "resize",
    sendHeight
  );

  window.addEventListener(
    "load",
    sendHeight
  );

  document
    .querySelectorAll("img")
    .forEach((image) => {
      if (!image.complete) {
        image.addEventListener(
          "load",
          sendHeight
        );

        image.addEventListener(
          "error",
          sendHeight
        );
      }
    });

  if (document.fonts?.ready) {
    document.fonts.ready
      .then(sendHeight)
      .catch(() => {});
  }

  return () => {
    resizeObserver.disconnect();

    window.removeEventListener(
      "resize",
      sendHeight
    );

    window.removeEventListener(
      "load",
      sendHeight
    );

    if (animationFrame) {
      cancelAnimationFrame(
        animationFrame
      );
    }
  };
}