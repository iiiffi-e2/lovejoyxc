/**
 * Lovejoy TFC team badge, recreated as a self-contained SVG so it scales
 * crisply at any size (nav, login, favicon) without an external asset.
 */
export function TeamLogo({
  className,
  title = "Lovejoy TFC",
}: {
  className?: string;
  title?: string;
}) {
  return (
    <svg
      viewBox="0 0 240 240"
      className={className}
      role="img"
      aria-label={title}
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>{title}</title>
      <defs>
        <path
          id="lovejoy-top-arc"
          d="M 36,92 A 90,90 0 0 1 204,92"
          fill="none"
        />
        <clipPath id="lovejoy-inner">
          <circle cx="120" cy="120" r="80" />
        </clipPath>
      </defs>

      {/* Rings */}
      <circle cx="120" cy="120" r="119" fill="#0b0b0b" />
      <circle cx="120" cy="120" r="113" fill="none" stroke="#ffffff" strokeWidth="5" />
      <circle cx="120" cy="120" r="108" fill="#0b0b0b" />
      <circle cx="120" cy="120" r="82" fill="none" stroke="#ffffff" strokeWidth="4" />
      <circle cx="120" cy="120" r="80" fill="#ffffff" />

      {/* Arched LOVEJOY wordmark */}
      <text
        fill="#C8102E"
        fontFamily="var(--font-inter), Arial, sans-serif"
        fontSize="30"
        fontWeight="800"
        letterSpacing="7"
      >
        <textPath href="#lovejoy-top-arc" startOffset="50%" textAnchor="middle">
          LOVEJOY
        </textPath>
      </text>

      {/* Swoosh */}
      <path
        d="M88 82 C 116 56 156 46 176 44 C 156 55 122 69 106 80 C 100 84 93 87 88 82 Z"
        fill="#ffffff"
        stroke="#0b0b0b"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />

      {/* Crossed rifles + lettering inside the inner disc */}
      <g clipPath="url(#lovejoy-inner)">
        <Rifle rotate={42} />
        <Rifle rotate={-42} />
      </g>

      {/* T F C lettering */}
      <g
        fill="#C8102E"
        fontFamily="var(--font-inter), Arial, sans-serif"
        fontWeight="900"
        textAnchor="middle"
      >
        <text x="74" y="138" fontSize="50">
          T
        </text>
        <text x="166" y="138" fontSize="50">
          F
        </text>
        <text x="120" y="182" fontSize="50">
          C
        </text>
      </g>
    </svg>
  );
}

/** A single stylized bayonet rifle, centered and rotated about (120,120). */
function Rifle({ rotate }: { rotate: number }) {
  return (
    <g transform={`rotate(${rotate} 120 120)`} fill="#0b0b0b">
      {/* barrel + body */}
      <rect x="116" y="44" width="8" height="150" rx="3" />
      {/* bayonet tip */}
      <path d="M120 36 L124 50 L116 50 Z" />
      {/* bayonet serrations */}
      <rect x="124" y="52" width="5" height="4" />
      <rect x="124" y="60" width="5" height="4" />
      <rect x="124" y="68" width="5" height="4" />
      {/* stock */}
      <path d="M112 176 q-8 6 -6 18 l14 0 0 -24 z" />
      {/* trigger guard */}
      <rect x="112" y="150" width="16" height="6" rx="3" />
    </g>
  );
}
