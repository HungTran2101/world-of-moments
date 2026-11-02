import thoughtBubbleImg from "@/public/assets/thought-note.webp";
import clusterBubbleImg from "@/public/assets/cluster-notes.webp";
import { normalizeSubmissionBounds } from "@/lib/submissionBounds";
import { getSubmissions } from "@/services/submissions";
import type { SubmissionPin } from "@/services/submissions/types";
import { Marker, type ExpressionSpecification, type GeoJSONSource, type Map as MapLibreMap } from "maplibre-gl";
import { addEntryAnimations, CLUSTER_WIDTH_STOPS } from "./entryAnimations";
import { FLAT_MAP_ZOOM, GLOBE_MARKER_MIN_OPACITY, GLOBE_MARKER_SCALE, GLOBE_ZOOM, SPACE_FADE_START_ZOOM } from "./spaceStyle";

const SOURCE_ID = "submissions";
const IMAGE_ID = "submission-thought-bubble";
const CLUSTER_IMAGE_ID = "submission-cluster-bubble";

const MARKER_WIDTH = 35;
const MARKER_ICON_SIZE = MARKER_WIDTH / thoughtBubbleImg.width;
const MARKER_HOVER_SCALE = 1.1;
const MARKER_HOVER_DURATION_MS = 180;
const MARKER_OPACITY = 0.8;

export const SUBMISSION_CLUSTER_LAYER = "submission-clusters";
export const SUBMISSION_MARKER_LAYER = "submission-markers";

export const CLUSTER_MAX_ZOOM = 5;
const CLUSTER_RADIUS = 30;

function toFeatureCollection(submissions: SubmissionPin[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: submissions.map((submission) => ({
      type: "Feature",
      properties: { submissionId: submission.id },
      geometry: { type: "Point", coordinates: [submission.lng, submission.lat] },
    })),
  };
}

export function loadSubmissionAssets(map: MapLibreMap) {
  return Promise.all([
    map.loadImage(thoughtBubbleImg.src),
    map.loadImage(clusterBubbleImg.src),
  ]);
}

interface AddSubmissionLayersOptions {
  map: MapLibreMap;
  isCancelled: () => boolean;
  onSubmissionClick: (submissionId: string) => void;
  onLoadError: (hasError: boolean) => void;
  isInteractionBlocked: () => boolean;
  isEntryReady: () => boolean;
  assets?: ReturnType<typeof loadSubmissionAssets>;
}

export async function addSubmissionLayers({
  map,
  isCancelled,
  onSubmissionClick,
  onLoadError,
  isInteractionBlocked,
  isEntryReady,
  assets = loadSubmissionAssets(map),
}: AddSubmissionLayersOptions) {
  const [image, clusterImage] = await assets;

  // Không cập nhật bản đồ nếu component đã unmount trong lúc tải dữ liệu hoặc ảnh.
  if (isCancelled()) return;

  const subscriptions: { unsubscribe: () => void }[] = [];
  const getMarkerOpacity = (): ExpressionSpecification => {
    const opacity: ExpressionSpecification = ["case",
      ["boolean", ["feature-state", "hover"], false], 0,
      ["boolean", ["feature-state", "entered"], false], MARKER_OPACITY,
      0,
    ];
    return ["interpolate", ["linear"], ["zoom"],
      map.getMinZoom(), ["*", GLOBE_MARKER_MIN_OPACITY, opacity],
      SPACE_FADE_START_ZOOM, opacity,
    ];
  };
  const removeLayers = () => {
    if (!map.getStyle()) return;
    // Xóa layer trước nguồn và ảnh để MapLibre không giữ tham chiếu tới tài nguyên đã mất.
    for (const layer of [SUBMISSION_MARKER_LAYER, SUBMISSION_CLUSTER_LAYER]) {
      if (map.getLayer(layer)) map.removeLayer(layer);
    }
    if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
    if (map.hasImage(IMAGE_ID)) map.removeImage(IMAGE_ID);
    if (map.hasImage(CLUSTER_IMAGE_ID)) map.removeImage(CLUSTER_IMAGE_ID);
  };

  try {
    const clusterIconSize: ExpressionSpecification = ["/", ["interpolate", ["linear"], ["get", "point_count"],
      ...CLUSTER_WIDTH_STOPS,
    ], clusterBubbleImg.width];
    map.addImage(IMAGE_ID, image.data);
    map.addImage(CLUSTER_IMAGE_ID, clusterImage.data);
    map.addSource(SOURCE_ID, {
      type: "geojson",
      // Giữ nguyên ID dạng chuỗi khi MapLibre chuyển dữ liệu sang vector tile.
      promoteId: "submissionId",
      // Chỉ gom các điểm gần nhau khi mức zoom không vượt quá CLUSTER_MAX_ZOOM.
      cluster: true,
      clusterMaxZoom: CLUSTER_MAX_ZOOM,
      clusterRadius: CLUSTER_RADIUS,
      data: toFeatureCollection([]),
    });

    map.addLayer({
      id: SUBMISSION_CLUSTER_LAYER,
      type: "symbol",
      source: SOURCE_ID,
      filter: ["has", "point_count"],
      layout: {
        "icon-image": CLUSTER_IMAGE_ID,
        // Cụm càng nhiều suy nghĩ càng lớn, tối đa 80 px và giữ nguyên tỉ lệ ảnh gốc.
        // Vùng hit-test WebGL thu nhỏ cùng ảnh DOM khi camera còn ở chế độ globe.
        "icon-size": ["interpolate", ["linear"], ["zoom"],
          GLOBE_ZOOM, ["*", GLOBE_MARKER_SCALE, clusterIconSize], FLAT_MAP_ZOOM, clusterIconSize,
        ],
        "icon-anchor": "bottom",
        "icon-allow-overlap": true,
        "icon-ignore-placement": true,
      },
      paint: {
        // Layer giữ vùng hit-test; bubble cụm luôn ở DOM để không nháy khi ID WebGL đổi.
        "icon-opacity": 0,
        "icon-opacity-transition": { duration: 0 },
      },
    });
    map.addLayer({
      id: SUBMISSION_MARKER_LAYER,
      type: "symbol",
      source: SOURCE_ID,
      filter: ["!", ["has", "point_count"]],
      layout: {
        "icon-image": IMAGE_ID,
        // Thu phóng đồng đều để ảnh rộng 35 px, chiều cao tự thay đổi theo tỉ lệ gốc.
        "icon-size": ["interpolate", ["linear"], ["zoom"],
          GLOBE_ZOOM, MARKER_ICON_SIZE * GLOBE_MARKER_SCALE, FLAT_MAP_ZOOM, MARKER_ICON_SIZE,
        ],
        "icon-anchor": "bottom",
        "icon-allow-overlap": true,
        "icon-ignore-placement": true,
      },
      paint: {
        // Tạm ẩn ảnh WebGL khi ảnh DOM ở cùng vị trí đang chạy hiệu ứng hover.
        "icon-opacity": getMarkerOpacity(),
        "icon-opacity-transition": { duration: 0 },
      },
    });
  } catch (error) {
    // Một bước khởi tạo thất bại vẫn phải dọn phần đã thêm để lần thử lại bắt đầu sạch.
    removeLayers();
    throw error;
  }

  // Min zoom thay đổi theo viewport; cập nhật cùng đường cong với bubble DOM khi resize.
  subscriptions.push(map.on("resize", () => {
    map.setPaintProperty(SUBMISSION_MARKER_LAYER, "icon-opacity", getMarkerOpacity());
  }));

  const entryAnimations = addEntryAnimations({
    map,
    sourceId: SOURCE_ID,
    markerLayer: SUBMISSION_MARKER_LAYER,
    clusterLayer: SUBMISSION_CLUSTER_LAYER,
    markerImage: thoughtBubbleImg,
    clusterImage: clusterBubbleImg,
    markerWidth: MARKER_WIDTH,
    opacity: MARKER_OPACITY,
    isReady: isEntryReady,
  });

  let hoveredId: string | null = null;
  const overlays = new Map<string, { marker: Marker; animation: Animation }>();
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let viewportController: AbortController | null = null;
  let pendingBoundsKey: string | null = null;
  let loadedBoundsKey: string | null = null;

  const getViewportBounds = () => {
    const bounds = map.getBounds();
    return normalizeSubmissionBounds({
      west: bounds.getWest(), south: bounds.getSouth(),
      east: bounds.getEast(), north: bounds.getNorth(),
    });
  };

  const cancelViewportRequest = () => {
    viewportController?.abort();
    viewportController = null;
    pendingBoundsKey = null;
  };

  const applySubmissions = async (submissions: SubmissionPin[], signal: AbortSignal) => {
    signal.throwIfAborted();
    if (isCancelled()) throw new Error("Map is no longer available");
    clearOverlays(true);
    loadedBoundsKey = null;
    const source = map.getSource(SOURCE_ID) as GeoJSONSource;
    await source.setData(toFeatureCollection(submissions), true);
    signal.throwIfAborted();
    if (isCancelled()) throw new Error("Map is no longer available");
    await new Promise<void>((resolve, reject) => {
      const cleanup = () => {
        map.off("render", onRender);
        map.off("remove", onRemove);
        signal.removeEventListener("abort", onAbort);
      };
      const onRender = () => {
        if (!map.isSourceLoaded(SOURCE_ID)) return;
        cleanup();
        resolve();
      };
      const onRemove = () => { cleanup(); reject(new Error("Map was removed")); };
      const onAbort = () => { cleanup(); reject(signal.reason); };
      map.on("render", onRender);
      map.once("remove", onRemove);
      signal.addEventListener("abort", onAbort, { once: true });
      map.triggerRepaint();
    });
  };

  const loadViewport = async () => {
    if (isCancelled() || isInteractionBlocked() || map.isMoving()) return;
    const bounds = getViewportBounds();
    const boundsKey = JSON.stringify(bounds);
    if (boundsKey === loadedBoundsKey || boundsKey === pendingBoundsKey) return;
    cancelViewportRequest();
    const controller = new AbortController();
    viewportController = controller;
    pendingBoundsKey = boundsKey;
    onLoadError(false);
    try {
      const submissions = await getSubmissions(bounds, { signal: controller.signal });
      await applySubmissions(submissions, controller.signal);
      loadedBoundsKey = boundsKey;
    } catch (error) {
      if (controller.signal.aborted || isCancelled()) return;
      console.error("Failed to load viewport submissions", error);
      onLoadError(true);
    } finally {
      if (viewportController === controller) {
        viewportController = null;
        pendingBoundsKey = null;
      }
    }
  };

  const removeOverlay = (id: string, restoreIcon = true) => {
    const overlay = overlays.get(id);
    if (!overlay) return;
    overlay.animation.onfinish = null;
    overlay.animation.cancel();
    overlay.marker.remove();
    overlays.delete(id);
    if (restoreIcon) map.setFeatureState({ source: SOURCE_ID, id }, { hover: false });
  };
  const clearHover = () => {
    const previousId = hoveredId;
    hoveredId = null;
    map.getCanvas().style.cursor = "";
    if (previousId === null) return;

    const overlay = overlays.get(previousId);
    if (!overlay) return;
    // Đảo chiều từ tiến độ hiện tại để rê chuột nhanh vẫn chuyển động liên tục.
    if (reducedMotion.matches || overlay.animation.currentTime === 0) {
      removeOverlay(previousId);
    } else {
      overlay.animation.reverse();
    }
  };

  subscriptions.push(map.on("mousemove", (event) => {
    if (isInteractionBlocked()) { clearHover(); return; }
    // Một lần hit-test chung cho điểm lẻ và cụm, tránh bốn truy vấn cho mỗi lần rê chuột.
    const features = map.queryRenderedFeatures(event.point, {
      layers: [SUBMISSION_MARKER_LAYER, SUBMISSION_CLUSTER_LAYER],
    });
    const feature = features.find((feature) => feature.layer.id === SUBMISSION_MARKER_LAYER);
    const id = feature?.properties.submissionId;
    if (typeof id !== "string" || feature?.geometry.type !== "Point") {
      clearHover();
      if (features.some((feature) => feature.layer.id === SUBMISSION_CLUSTER_LAYER)) {
        map.getCanvas().style.cursor = "pointer";
      }
      return;
    }
    if (id === hoveredId) return;
    clearHover();
    // Để hiệu ứng xuất hiện kết thúc trước khi chuyển sang phóng to khi hover.
    if (!map.getFeatureState({ source: SOURCE_ID, id }).entered) return;
    hoveredId = id;
    map.getCanvas().style.cursor = "pointer";

    const existing = overlays.get(id);
    if (existing) {
      existing.animation.reverse();
      return;
    }

    // Chỉ tạo DOM cho điểm đang hover; các điểm còn lại vẫn được vẽ và gom cụm bằng WebGL.
    const element = document.createElement("div");
    element.dataset.submissionHover = id;
    element.setAttribute("aria-hidden", "true");
    element.style.pointerEvents = "none";
    const bubble = document.createElement("img");
    bubble.src = thoughtBubbleImg.src;
    bubble.alt = "";
    bubble.draggable = false;
    // Giữ sẵn tỉ lệ ảnh để marker không lệch vị trí trong lúc trình duyệt giải mã ảnh.
    bubble.style.cssText = `display:block;width:calc(${MARKER_WIDTH}px * var(--map-marker-scale, 1));height:auto;aspect-ratio:${thoughtBubbleImg.width}/${thoughtBubbleImg.height};opacity:calc(${MARKER_OPACITY} * var(--map-detail-opacity, 1));transform-origin:bottom center`;
    element.append(bubble);

    const [lng, lat] = feature.geometry.coordinates;
    const wrappedLng = lng + 360 * Math.round((event.lngLat.lng - lng) / 360);
    const marker = new Marker({ element, anchor: "bottom", subpixelPositioning: true, opacityWhenCovered: "0" })
      .setLngLat([wrappedLng, lat]).addTo(map);
    // Animate transform trên ảnh con để không ghi đè transform định vị của MapLibre.
    const animation = bubble.animate(
      [{ transform: "scale(1)" }, { transform: `scale(${MARKER_HOVER_SCALE})` }],
      { duration: reducedMotion.matches ? 0 : MARKER_HOVER_DURATION_MS, easing: "ease-out", fill: "both" },
    );
    overlays.set(id, { marker, animation });
    map.setFeatureState({ source: SOURCE_ID, id }, { hover: true });
    animation.onfinish = () => {
      if (hoveredId !== id) removeOverlay(id);
    };
  }));
  subscriptions.push(map.on("mouseout", clearHover));
  subscriptions.push(map.on("click", SUBMISSION_MARKER_LAYER, (event) => {
    if (isInteractionBlocked()) return;
    const id = event.features?.[0]?.properties.submissionId;
    if (typeof id !== "string" || isCancelled()) return;
    clearOverlays(true);
    onSubmissionClick(id);
  }));

  const clearOverlays = (restoreIcons: boolean) => {
    hoveredId = null;
    map.getCanvas().style.cursor = "";
    for (const id of overlays.keys()) removeOverlay(id, restoreIcons);
  };
  // Dọn ảnh và animation khi đổi vùng nhìn hoặc tháo bản đồ, tránh giữ DOM không còn dùng.
  subscriptions.push(map.on("movestart", () => {
    clearOverlays(true);
    // Hủy ngay khi người xem di chuyển tiếp để phản hồi cũ không ghi đè vùng nhìn mới.
    cancelViewportRequest();
  }));
  subscriptions.push(map.on("moveend", () => { void loadViewport(); }));
  subscriptions.push(map.on("remove", () => {
    clearOverlays(false);
    cancelViewportRequest();
    entryAnimations.destroy();
  }));

  subscriptions.push(map.on("click", SUBMISSION_CLUSTER_LAYER, async (event) => {
    if (isInteractionBlocked()) return;
    // Khi ảnh chồng nhau, ưu tiên suy nghĩ lẻ đang được vẽ trên cụm thay vì vừa mở modal vừa zoom.
    if (map.queryRenderedFeatures(event.point, { layers: [SUBMISSION_MARKER_LAYER] }).length) return;
    const feature = event.features?.[0];
    if (!feature || feature.geometry.type !== "Point") return;

    try {
      const source = map.getSource(SOURCE_ID) as GeoJSONSource;
      const zoom = await source.getClusterExpansionZoom(feature.properties.cluster_id);
      if (isCancelled() || isInteractionBlocked()) return;

      const [lng, lat] = feature.geometry.coordinates;
      // Chọn đúng bản sao của cụm khi bản đồ lặp lại qua kinh tuyến 180 độ.
      const wrappedLng = lng + 360 * Math.round((event.lngLat.lng - lng) / 360);
      map.easeTo({ center: [wrappedLng, lat], zoom, duration: 500 });
    } catch (error) {
      if (!isCancelled()) console.error("Failed to expand submission cluster", error);
    }
  }));

  // Chờ camera mở đầu dừng rồi mới tải vị trí, tránh tải cả thế giới ở mức zoom ban đầu.
  void loadViewport();

  return {
    waitForEntryAnimations: entryAnimations.waitForIdle,
    async prepareRefresh(signal: AbortSignal) {
      cancelViewportRequest();
      const bounds = getViewportBounds();
      const submissions = await getSubmissions(bounds, { signal });
      signal.throwIfAborted();
      if (isCancelled()) throw new Error("Map is no longer available");

      // Giữ dữ liệu đã tải ngoài source để marker mới hoặc cụm chưa xuất hiện trước bubble đang bay.
      return async () => {
        // Chờ worker cập nhật vùng nhìn trước khi bỏ bubble đang bay; không dựng lại layer.
        await applySubmissions(submissions, signal);
        loadedBoundsKey = JSON.stringify(bounds);
        onLoadError(false);
      };
    },
    destroy() {
      for (const subscription of subscriptions) subscription.unsubscribe();
      cancelViewportRequest();
      entryAnimations.destroy();
      clearOverlays(false);
      removeLayers();
    },
  };
}
