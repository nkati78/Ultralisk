import { useState } from 'react';

interface Props {
  text: string;
}

export function InfoTip({ text }: Props) {
  const [show, setShow] = useState(false);

  return (
    <span className="relative inline-flex items-center ml-1">
      <span
        className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-[hsl(var(--accent)/0.15)] text-[9px] font-bold text-[hsl(var(--accent))] cursor-help select-none hover:bg-[hsl(var(--accent)/0.25)] transition-colors"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
      >
        i
      </span>
      {show && (
        <span className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-56 px-3 py-2 rounded-lg bg-gray-900 border border-white/10 text-xs text-gray-300 leading-relaxed shadow-xl pointer-events-none normal-case tracking-normal font-normal">
          {text}
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
        </span>
      )}
    </span>
  );
}
