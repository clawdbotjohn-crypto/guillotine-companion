export const MOBILE_TOOLTIP_BREAKPOINT_PX = 640;
export const MOBILE_BOTTOM_NAV_SAFE_AREA_PX = 64;

export interface DisclosureRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

/** Clamp a fixed tooltip to the browser's usable visual viewport, preferring above the trigger. */
export function getConstrainedTooltipPosition({
  trigger,
  tooltip,
  viewport,
  margin = 8,
  gap = 4,
  reservedBottom = 0,
}: {
  trigger: DisclosureRect;
  tooltip: Pick<DisclosureRect, 'width' | 'height'>;
  viewport: { width: number; height: number; offsetLeft: number; offsetTop: number };
  margin?: number;
  gap?: number;
  reservedBottom?: number;
}) {
  const minLeft = viewport.offsetLeft + margin;
  const maxLeft = Math.max(minLeft, viewport.offsetLeft + viewport.width - tooltip.width - margin);
  const left = Math.min(Math.max(trigger.left, minLeft), maxLeft);
  const minTop = viewport.offsetTop + margin;
  const usableBottom = viewport.offsetTop + viewport.height - Math.max(0, reservedBottom);
  const maxTop = Math.max(minTop, usableBottom - tooltip.height - margin);
  const above = trigger.top - tooltip.height - gap;
  const below = trigger.bottom + gap;
  const preferredTop = above >= minTop ? above : below;
  const top = Math.min(Math.max(preferredTop, minTop), maxTop);
  return { left, top };
}
