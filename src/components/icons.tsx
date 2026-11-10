import type { SVGProps } from 'react';

type P = SVGProps<SVGSVGElement> & { size?: number };

const base = (size = 20) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
});

export const IconRefresh = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M20 11a8 8 0 1 0-2.3 5.7" />
    <path d="M20 5v6h-6" />
  </svg>
);

export const IconSliders = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
    <circle cx="16" cy="7" r="2" />
    <circle cx="10" cy="17" r="2" />
  </svg>
);

export const IconInfo = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5M12 8h.01" />
  </svg>
);

export const IconX = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);

export const IconChevron = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M9 6l6 6-6 6" />
  </svg>
);

export const IconExpand = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M14 4h6v6M20 4l-7 7M10 20H4v-6M4 20l7-7" />
  </svg>
);

export const IconShield = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M12 3l7 3v6c0 4.2-2.9 7.5-7 9-4.1-1.5-7-4.8-7-9V6l7-3z" />
    <path d="M9.5 12l1.8 1.8 3.4-3.6" />
  </svg>
);

export const IconClock = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);

export const IconActivity = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M3 12h4l2.5-6 4 12L16 12h5" />
  </svg>
);

export const IconArrowUpRight = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M7 17L17 7M8 7h9v9" />
  </svg>
);

export const IconArrowDownRight = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M7 7l10 10M17 8v9H8" />
  </svg>
);

export const IconMinus = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M5 12h14" />
  </svg>
);

export const IconSpark = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M13 2L4.5 13H11l-1 9 8.5-11H12l1-9z" />
  </svg>
);

export const IconDatabase = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <ellipse cx="12" cy="6" rx="8" ry="3" />
    <path d="M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" />
  </svg>
);

export const IconCheck = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M5 12.5l4.5 4.5L19 7" />
  </svg>
);

export const IconAlert = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M12 3l9 16H3l9-16z" />
    <path d="M12 9v4M12 16h.01" />
  </svg>
);

export const IconTarget = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <circle cx="12" cy="12" r="8" />
    <circle cx="12" cy="12" r="3.5" />
    <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
  </svg>
);

export const IconLayers = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M12 3l9 5-9 5-9-5 9-5z" />
    <path d="M3 13l9 5 9-5M3 17l9 5 9-5" />
  </svg>
);

export const IconTrend = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M3 17l5-5 3 3 7-7" />
    <path d="M14 8h5v5" />
  </svg>
);
