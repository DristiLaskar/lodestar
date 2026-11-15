export default function Logo({ size = 28 }) {
  return (
    <svg className="logo-mark" width={size} height={size} viewBox="-16 -16 32 32" aria-hidden="true">
      <circle r="13" fill="none" stroke="currentColor" strokeOpacity=".35" strokeDasharray="1.2 3.1" />
      <path className="logo-star" d="M0-12Q0 0 12 0Q0 0 0 12Q0 0-12 0Q0 0 0-12Z" fill="var(--star)" />
    </svg>
  );
}
