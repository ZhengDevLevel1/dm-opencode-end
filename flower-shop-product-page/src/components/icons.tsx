type IconProps = { className?: string; strokeWidth?: number };

const base = (className?: string) => className ?? "h-5 w-5";

export const FlowerIcon = ({ className, strokeWidth = 1.4 }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={base(className)}>
    <circle cx="12" cy="12" r="2.4" />
    <path d="M12 9.6c0-2.6 1.2-4.6 3-5.4 1.4-.6 2.6.4 2.4 1.9-.2 1.9-2.2 3.3-5.4 3.5Z" />
    <path d="M14.4 12c2.6 0 4.6 1.2 5.4 3 .6 1.4-.4 2.6-1.9 2.4-1.9-.2-3.3-2.2-3.5-5.4Z" />
    <path d="M12 14.4c0 2.6-1.2 4.6-3 5.4-1.4.6-2.6-.4-2.4-1.9.2-1.9 2.2-3.3 5.4-3.5Z" />
    <path d="M9.6 12c-2.6 0-4.6-1.2-5.4-3-.6-1.4.4-2.6 1.9-2.4 1.9.2 3.3 2.2 3.5 5.4Z" />
  </svg>
);

export const StarIcon = ({ className, strokeWidth = 1.2, filled = true }: IconProps & { filled?: boolean }) => (
  <svg viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={base(className)}>
    <path d="m12 3.6 2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8-4.2-4.1 5.8-.8L12 3.6Z" />
  </svg>
);

export const TruckIcon = ({ className, strokeWidth = 1.4 }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={base(className)}>
    <path d="M1.5 6.5h11v10h-11z" />
    <path d="M12.5 10h4l3 3v3.5h-7z" />
    <circle cx="6" cy="18" r="1.8" />
    <circle cx="16.5" cy="18" r="1.8" />
  </svg>
);

export const LeafIcon = ({ className, strokeWidth = 1.4 }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={base(className)}>
    <path d="M20 4c0 8.3-5.2 13.5-13.5 13.5H4C4 8.5 10.5 4 20 4Z" />
    <path d="M4 20c2.5-5.2 6-8.7 11-10.5" />
  </svg>
);

export const CardIcon = ({ className, strokeWidth = 1.4 }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={base(className)}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="M3 10h18M7 15h4" />
  </svg>
);

export const CameraIcon = ({ className, strokeWidth = 1.4 }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={base(className)}>
    <path d="M3 8.5h3l1.5-2.5h9L18 8.5h3v11H3z" />
    <circle cx="12" cy="14" r="3.2" />
  </svg>
);

export const HeartIcon = ({ className, strokeWidth = 1.5, filled = false }: IconProps & { filled?: boolean }) => (
  <svg viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={base(className)}>
    <path d="M12 20s-7.5-4.6-7.5-9.6A4.4 4.4 0 0 1 12 7.6a4.4 4.4 0 0 1 7.5 2.8c0 5-7.5 9.6-7.5 9.6Z" />
  </svg>
);

export const CartIcon = ({ className, strokeWidth = 1.5 }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={base(className)}>
    <path d="M4 5h2l2.2 10.4a1.6 1.6 0 0 0 1.6 1.3h7.4a1.6 1.6 0 0 0 1.6-1.2L20.5 9H7" />
    <circle cx="10" cy="20" r="1.4" />
    <circle cx="17" cy="20" r="1.4" />
  </svg>
);

export const SearchIcon = ({ className, strokeWidth = 1.5 }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={base(className)}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m16 16 4.5 4.5" />
  </svg>
);

export const ChevronDown = ({ className, strokeWidth = 1.6 }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={base(className)}>
    <path d="m6 9 6 6 6-6" />
  </svg>
);

export const ChevronLeft = ({ className, strokeWidth = 1.6 }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={base(className)}>
    <path d="m15 6-6 6 6 6" />
  </svg>
);

export const ChevronRight = ({ className, strokeWidth = 1.6 }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={base(className)}>
    <path d="m9 6 6 6-6 6" />
  </svg>
);

export const PlusIcon = ({ className, strokeWidth = 1.6 }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={base(className)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const MinusIcon = ({ className, strokeWidth = 1.6 }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={base(className)}>
    <path d="M5 12h14" />
  </svg>
);

export const CloseIcon = ({ className, strokeWidth = 1.6 }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={base(className)}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);

export const CheckIcon = ({ className, strokeWidth = 2 }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={base(className)}>
    <path d="m5 13 4.5 4.5L19 7" />
  </svg>
);

export const ShieldIcon = ({ className, strokeWidth = 1.4 }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={base(className)}>
    <path d="M12 3l7 2.5v5.8c0 4.4-3 8-7 9.7-4-1.7-7-5.3-7-9.7V5.5L12 3Z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

export const SparkIcon = ({ className, strokeWidth = 1.4 }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={base(className)}>
    <path d="M12 3.5 13.6 8l4.4 1.6-4.4 1.6L12 16l-1.6-4.8L6 9.6 10.4 8 12 3.5Z" />
    <path d="M18.5 15.5l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7.7-2Z" />
  </svg>
);

export const UserIcon = ({ className, strokeWidth = 1.5 }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={base(className)}>
    <circle cx="12" cy="8.5" r="3.6" />
    <path d="M4.5 20c1.4-3.6 4-5.4 7.5-5.4s6.1 1.8 7.5 5.4" />
  </svg>
);

export const ThumbsUpIcon = ({ className, strokeWidth = 1.4 }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={base(className)}>
    <path d="M7 10.5v9H4v-9h3Z" />
    <path d="M7 10.5 11 4.5c1.6.2 2.4 1.2 2.4 2.8L13 10.5h5.4c1.2 0 2 1 1.8 2.1l-1.1 5.2c-.2 1-1 1.7-2 1.7H7" />
  </svg>
);

export const iconMap: Record<string, (p: IconProps) => React.ReactElement> = {
  truck: TruckIcon,
  leaf: LeafIcon,
  card: CardIcon,
  camera: CameraIcon,
};
