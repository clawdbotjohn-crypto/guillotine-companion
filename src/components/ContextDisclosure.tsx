import { useId, useState, type ReactNode } from 'react';

/** Compact disclosure: hover and focus reveal it without a click; click/tap pins it open. */
export function ContextDisclosure({
  trigger,
  children,
  label,
  className = '',
}: {
  trigger: ReactNode;
  children: ReactNode;
  label: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <span className={`group relative inline-flex ${className}`}>
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
      <span
        id={id}
        role="tooltip"
        className={`${open ? 'flex' : 'hidden'} absolute bottom-full left-0 z-20 mb-1 w-max max-w-[min(18rem,80vw)] rounded-md border border-[#2a2e55] bg-[#0e1025] px-2.5 py-2 text-left text-[10px] font-normal normal-case leading-4 tracking-normal text-[#c7c9e8] shadow-xl group-hover:flex group-focus-within:flex`}
      >
        {children}
      </span>
    </span>
  );
}
