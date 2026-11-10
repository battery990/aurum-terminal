export default function Logo({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className="logo">
      <defs>
        <linearGradient id="aurumGold" x1="4" y1="2" x2="28" y2="30" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#F8E3A8" />
          <stop offset="0.45" stopColor="#E7B84B" />
          <stop offset="1" stopColor="#B98324" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9.5" fill="url(#aurumGold)" />
      <path d="M8.2 22.2l2.9-9.4h9.8l2.9 9.4H8.2z" fill="#0A0C0F" />
      <path d="M12.3 12.8l1.4-2.5h4.6l1.4 2.5h-7.4z" fill="#0A0C0F" opacity="0.55" />
      <path d="M10.4 19.3h11.2l-.6 1.9H11l-.6-1.9z" fill="url(#aurumGold)" opacity="0.85" />
    </svg>
  );
}
