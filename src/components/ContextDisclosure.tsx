import { useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import {
  getConstrainedTooltipPosition,
  MOBILE_BOTTOM_NAV_SAFE_AREA_PX,
  MOBILE_TOOLTIP_BREAKPOINT_PX,
} from '../logic/tooltipPosition';

/** Compact disclosure: hover and focus reveal it without a click; click/tap pins it open. */
export function ContextDisclosure({
  trigger,
  children,
  label,
  className = '',
  constrainToViewport = false,
}: {
  trigger: ReactNode;
  children: ReactNode;
  label: string;
  className?: string;
  constrainToViewport?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLSpanElement>(null);
  const id = useId();
  const visible = open || hovered || focused;

  useLayoutEffect(() => {
    if (!visible || !constrainToViewport) return;
    const updatePosition = () => {
      const wrapper = wrapperRef.current;
      const tooltipElement = tooltipRef.current;
      if (!wrapper || !tooltipElement) return;
      const visualViewport = window.visualViewport;
      const viewport = {
        width: visualViewport?.width ?? window.innerWidth,
        height: visualViewport?.height ?? window.innerHeight,
        offsetLeft: visualViewport?.offsetLeft ?? 0,
        offsetTop: visualViewport?.offsetTop ?? 0,
      };
      const position = getConstrainedTooltipPosition({
        trigger: wrapper.getBoundingClientRect(),
        tooltip: tooltipElement.getBoundingClientRect(),
        viewport,
        reservedBottom: viewport.width < MOBILE_TOOLTIP_BREAKPOINT_PX
          ? MOBILE_BOTTOM_NAV_SAFE_AREA_PX
          : 0,
      });
      tooltipElement.style.left = `${position.left}px`;
      tooltipElement.style.top = `${position.top}px`;
      tooltipElement.style.visibility = 'visible';
    };
    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    window.visualViewport?.addEventListener('resize', updatePosition);
    window.visualViewport?.addEventListener('scroll', updatePosition);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
      window.visualViewport?.removeEventListener('resize', updatePosition);
      window.visualViewport?.removeEventListener('scroll', updatePosition);
    };
  }, [constrainToViewport, visible]);

  const tooltip = (
    <span
      ref={tooltipRef}
      id={id}
      role="tooltip"
      style={constrainToViewport ? {
        maxWidth: 'min(18rem, calc(100vw - 1rem))',
      } : undefined}
      className={`${visible ? 'flex' : 'hidden'} ${constrainToViewport
        ? 'fixed left-0 top-0 z-[60] w-max'
        : 'absolute bottom-full left-0 z-20 mb-1 w-max max-w-[min(18rem,80vw)]'} rounded-md border border-[#2a2e55] bg-[#0e1025] px-2.5 py-2 text-left text-[10px] font-normal normal-case leading-4 tracking-normal text-[#c7c9e8] shadow-xl`}
    >
      {children}
    </span>
  );

  return (
    <span
      ref={wrapperRef}
      className={`relative inline-flex ${className}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    >
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((value) => !value)}
        className="rounded text-inherit outline-none focus-visible:ring-2 focus-visible:ring-[#6366f1]"
      >
        {trigger}
      </button>
      {constrainToViewport && typeof document !== 'undefined'
        ? createPortal(tooltip, document.body)
        : tooltip}
    </span>
  );
}
