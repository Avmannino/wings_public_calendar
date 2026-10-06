const MESSAGE_TYPE =
  "VITE_AUTO_HEIGHT";

const SCROLL_HANDOFF_TYPE =
  "wings:scrollHandoff";

const MOBILE_BREAKPOINT = 750;

const EDGE_TOLERANCE = 3;

function getContentHeight() {
  const root =
    document.getElementById("root");

  if (root) {
    return Math.ceil(
      Math.max(
        root.scrollHeight,
        root.offsetHeight,
        root.getBoundingClientRect()
          .height
      )
    );
  }

  return Math.ceil(
    Math.max(
      document.body.scrollHeight,
      document.body.offsetHeight,
      document.documentElement
        .scrollHeight,
      document.documentElement
        .offsetHeight
    )
  );
}

function isMobileViewport() {
  return (
    window.innerWidth <=
    MOBILE_BREAKPOINT
  );
}

function getScrollTop() {
  return Math.max(
    0,
    window.scrollY ||
      document.documentElement
        .scrollTop ||
      document.body.scrollTop ||
      0
  );
}

function getScrollHeight() {
  return Math.max(
    document.body.scrollHeight,
    document.body.offsetHeight,
    document.documentElement
      .scrollHeight,
    document.documentElement
      .offsetHeight
  );
}

function sendScrollHandoff(
  deltaY
) {
  if (
    !Number.isFinite(deltaY) ||
    deltaY === 0
  ) {
    return;
  }

  window.parent.postMessage(
    {
      type: SCROLL_HANDOFF_TYPE,
      deltaY,
    },
    "*"
  );
}

function initScrollHandoff() {
  let lastTouchY = null;

  const handleTouchStart = (
    event
  ) => {
    if (
      !isMobileViewport() ||
      !event.touches ||
      event.touches.length === 0
    ) {
      lastTouchY = null;
      return;
    }

    lastTouchY =
      event.touches[0].clientY;
  };

  const handleTouchMove = (
    event
  ) => {
    if (
      !isMobileViewport() ||
      lastTouchY === null ||
      !event.touches ||
      event.touches.length === 0
    ) {
      return;
    }

    const currentTouchY =
      event.touches[0].clientY;

    /*
     * Positive deltaY:
     * user is scrolling DOWN.
     *
     * Negative deltaY:
     * user is scrolling UP.
     */
    const deltaY =
      lastTouchY -
      currentTouchY;

    lastTouchY =
      currentTouchY;

    if (
      Math.abs(deltaY) < 0.25
    ) {
      return;
    }

    const scrollTop =
      getScrollTop();

    const scrollHeight =
      getScrollHeight();

    const viewportHeight =
      window.innerHeight;

    const maxScrollTop =
      Math.max(
        0,
        scrollHeight -
          viewportHeight
      );

    const atTop =
      scrollTop <=
      EDGE_TOLERANCE;

    const atBottom =
      scrollTop >=
      maxScrollTop -
        EDGE_TOLERANCE;

    /*
     * Finger moving upward while
     * the schedule is already at
     * its bottom.
     *
     * Send that movement to Wix.
     */
    const pushingPastBottom =
      deltaY > 0 &&
      atBottom;

    /*
     * Finger moving downward while
     * the schedule is already at
     * its top.
     *
     * Send that movement back to
     * the Wix page.
     */
    const pushingPastTop =
      deltaY < 0 &&
      atTop;

    if (
      !pushingPastBottom &&
      !pushingPastTop
    ) {
      return;
    }

    /*
     * Stop Safari from doing the
     * iframe rubber-band bounce
     * once we have reached an edge.
     */
    if (
      event.cancelable
    ) {
      event.preventDefault();
    }

    sendScrollHandoff(deltaY);
  };

  const handleTouchEnd = () => {
    lastTouchY = null;
  };

  const handleTouchCancel = () => {
    lastTouchY = null;
  };

  window.addEventListener(
    "touchstart",
    handleTouchStart,
    {
      passive: true,
    }
  );

  window.addEventListener(
    "touchmove",
    handleTouchMove,
    {
      passive: false,
    }
  );

  window.addEventListener(
    "touchend",
    handleTouchEnd,
    {
      passive: true,
    }
  );

  window.addEventListener(
    "touchcancel",
    handleTouchCancel,
    {
      passive: true,
    }
  );

  return () => {
    window.removeEventListener(
      "touchstart",
      handleTouchStart
    );

    window.removeEventListener(
      "touchmove",
      handleTouchMove
    );

    window.removeEventListener(
      "touchend",
      handleTouchEnd
    );

    window.removeEventListener(
      "touchcancel",
      handleTouchCancel
    );
  };
}

export function initWixAutoHeight(
  options = {}
) {
  if (
    window.parent === window
  ) {
    return;
  }

  /*
   * OFF by default.
   *
   * Existing Vite projects that call:
   *
   * initWixAutoHeight();
   *
   * continue behaving exactly as
   * they do currently.
   */
  const {
    enableScrollHandoff = false,
  } = options;

  let lastHeight = 0;
  let animationFrame = null;

  const sendHeight = () => {
    if (animationFrame) {
      cancelAnimationFrame(
        animationFrame
      );
    }

    animationFrame =
      requestAnimationFrame(() => {
        const height =
          getContentHeight();

        if (!height) {
          return;
        }

        if (
          height === lastHeight
        ) {
          return;
        }

        lastHeight = height;

        window.parent.postMessage(
          {
            type:
              MESSAGE_TYPE,
            height,
            pathname:
              window.location
                .pathname,
          },
          "*"
        );
      });
  };

  sendHeight();

  requestAnimationFrame(
    sendHeight
  );

  setTimeout(
    sendHeight,
    50
  );

  setTimeout(
    sendHeight,
    100
  );

  setTimeout(
    sendHeight,
    250
  );

  setTimeout(
    sendHeight,
    500
  );

  setTimeout(
    sendHeight,
    1000
  );

  setTimeout(
    sendHeight,
    1500
  );

  setTimeout(
    sendHeight,
    2500
  );

  const root =
    document.getElementById(
      "root"
    );

  const resizeObserver =
    new ResizeObserver(() => {
      sendHeight();
    });

  if (root) {
    resizeObserver.observe(root);
  } else {
    resizeObserver.observe(
      document.body
    );
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

  /*
   * Only this specific Vite app
   * gets scroll handoff if it
   * explicitly requests it.
   */
  const cleanupScrollHandoff =
    enableScrollHandoff
      ? initScrollHandoff()
      : null;

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

    if (
      cleanupScrollHandoff
    ) {
      cleanupScrollHandoff();
    }
  };
}