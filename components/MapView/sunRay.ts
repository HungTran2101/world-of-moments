const TRAVEL_DURATION_MS = 1500;
const FADE_DURATION_MS = 500;
const NIGHT_POSITION = -100;

export function createSunRay(ray: HTMLDivElement) {
  const light = ray.querySelector<HTMLDivElement>(".mapView-sunRayLight")!;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let position = 100;
  let opacity = 0;
  let requestedPosition: number | null | undefined;
  let frame: number | undefined;
  let paused = false;

  const render = () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    // Giá trị âm đi dọc mép trái xuống dưới; giá trị dương đi dọc mép trên.
    const x = Math.max(0, position) / 100 * width;
    const y = Math.max(0, -position) / 100 * height;
    const edgeAngle = -90 * Math.min(1, Math.max(0, -position) / 12);
    const angle = Math.atan2(x - width / 2, height / 2 - y) * 180 / Math.PI;
    light.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${edgeAngle}deg)`;
    light.style.setProperty("--map-sun-angle", `${angle - edgeAngle}deg`);
    ray.style.setProperty("--map-sun-opacity", String(opacity));
    ray.dataset.visible = String(opacity > 0);
  };

  const cancelFrame = () => {
    if (frame !== undefined) window.cancelAnimationFrame(frame);
    frame = undefined;
  };

  const settle = () => {
    cancelFrame();
    if (requestedPosition === undefined) return;
    position = requestedPosition ?? NIGHT_POSITION;
    opacity = requestedPosition === null ? 0 : 1;
    paused = false;
    render();
  };

  const setPosition = (nextPosition: number | null, animate = true) => {
    const initialized = requestedPosition !== undefined;
    const unchanged = nextPosition === requestedPosition;
    requestedPosition = nextPosition;
    if (!initialized || !animate || reducedMotion.matches
      || document.visibilityState !== "visible" || document.documentElement.hasAttribute("data-map-space")) {
      settle();
      return;
    }
    if (unchanged && !paused) return;
    cancelFrame();
    paused = false;

    const startPosition = position;
    const startOpacity = opacity;
    const endPosition = nextPosition ?? NIGHT_POSITION;
    if (nextPosition === null && startOpacity === 0) {
      settle();
      return;
    }
    const startedAt = performance.now();
    const duration = TRAVEL_DURATION_MS + (nextPosition === null ? FADE_DURATION_MS : 0);
    const tick = (now: number) => {
      const elapsed = Math.max(0, now - startedAt);
      const progress = Math.min(1, elapsed / TRAVEL_DURATION_MS);
      const eased = progress * progress * (3 - 2 * progress);
      position = startPosition + (endPosition - startPosition) * eased;
      // Ban đêm chỉ mờ đi sau khi đã tới góc dưới trái; đổi ý thì tiếp tục từ khung hình hiện tại.
      opacity = nextPosition === null
        ? startOpacity * (1 - Math.min(1, Math.max(0, elapsed - TRAVEL_DURATION_MS) / FADE_DURATION_MS))
        : startOpacity + (1 - startOpacity) * Math.min(1, elapsed / FADE_DURATION_MS);
      render();
      if (elapsed < duration) frame = window.requestAnimationFrame(tick);
      else frame = undefined;
    };
    frame = window.requestAnimationFrame(tick);
  };

  const onMotionChange = () => {
    if (reducedMotion.matches) settle();
  };
  const onVisibilityChange = () => {
    if (document.visibilityState !== "visible") settle();
  };
  window.addEventListener("resize", render);
  reducedMotion.addEventListener("change", onMotionChange);
  document.addEventListener("visibilitychange", onVisibilityChange);

  return {
    setPosition,
    pause() {
      // Chỉ đánh dấu tạm dừng khi đang chạy, để focus lại không khởi động animation đã kết thúc.
      if (frame === undefined) return;
      cancelFrame();
      paused = true;
    },
    destroy() {
      cancelFrame();
      window.removeEventListener("resize", render);
      reducedMotion.removeEventListener("change", onMotionChange);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    },
  };
}
