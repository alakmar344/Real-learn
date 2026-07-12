"use client";

export default function CrayonBackground() {
  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        inset: 0,
        zIndex: -1,
        overflow: "hidden",
        pointerEvents: "none",
        opacity: 0.6,
      }}
    >
      <svg
        viewBox="0 0 1200 800"
        preserveAspectRatio="xMidYMid slice"
        style={{ width: "100%", height: "100%" }}
      >
        <defs>
          <filter id="crayon" x="-5%" y="-5%" width="110%" height="110%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.04"
              numOctaves="4"
              seed="2"
              result="noise"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale="3"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
          <filter id="crayon-rough" x="-5%" y="-5%" width="110%" height="110%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.06"
              numOctaves="5"
              seed="7"
              result="noise"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale="4"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
          <filter id="paper-grain">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.7"
              numOctaves="3"
              seed="1"
            />
            <feColorMatrix type="saturate" values="0" />
            <feBlend in="SourceGraphic" mode="multiply" />
          </filter>
          <linearGradient id="sky-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--crayon-sky-top)" />
            <stop offset="100%" stopColor="var(--crayon-sky-bottom)" />
          </linearGradient>
          <linearGradient id="river-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--crayon-river-light)" />
            <stop offset="50%" stopColor="var(--crayon-river)" />
            <stop offset="100%" stopColor="var(--crayon-river-light)" />
          </linearGradient>
        </defs>

        {/* Sky */}
        <rect
          width="1200"
          height="800"
          fill="url(#sky-grad)"
          filter="url(#paper-grain)"
        />

        {/* Sun */}
        <g filter="url(#crayon)">
          <circle
            cx="950"
            cy="120"
            r="55"
            fill="var(--crayon-sun)"
            opacity="0.85"
          />
          <circle
            cx="950"
            cy="120"
            r="65"
            fill="none"
            stroke="var(--crayon-sun-glow)"
            strokeWidth="8"
            opacity="0.3"
          />
          {[
            [950, 40, 950, 20],
            [1010, 60, 1025, 48],
            [1030, 120, 1050, 120],
            [1010, 180, 1025, 192],
            [890, 60, 875, 48],
            [870, 120, 850, 120],
            [890, 180, 875, 192],
            [950, 200, 950, 215],
          ].map(([x1, y1, x2, y2], i) => (
            <line
              key={`ray-${i}`}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="var(--crayon-sun)"
              strokeWidth="4"
              strokeLinecap="round"
              opacity="0.5"
            />
          ))}
        </g>

        {/* Clouds */}
        <g filter="url(#crayon)" opacity="0.5">
          <ellipse cx="200" cy="100" rx="70" ry="30" fill="var(--crayon-cloud)" />
          <ellipse cx="240" cy="90" rx="50" ry="25" fill="var(--crayon-cloud)" />
          <ellipse cx="170" cy="95" rx="40" ry="20" fill="var(--crayon-cloud)" />
          <ellipse cx="600" cy="70" rx="60" ry="25" fill="var(--crayon-cloud)" />
          <ellipse cx="640" cy="60" rx="45" ry="22" fill="var(--crayon-cloud)" />
          <ellipse cx="570" cy="65" rx="35" ry="18" fill="var(--crayon-cloud)" />
          <ellipse cx="1050" cy="180" rx="50" ry="22" fill="var(--crayon-cloud)" />
          <ellipse cx="1080" cy="170" rx="40" ry="18" fill="var(--crayon-cloud)" />
        </g>

        {/* Distant hills */}
        <g filter="url(#crayon-rough)">
          <path
            d="M0 420 Q150 340 300 380 Q450 320 600 370 Q750 310 900 360 Q1050 300 1200 350 L1200 500 L0 500Z"
            fill="var(--crayon-hill-far)"
            opacity="0.5"
          />
          <path
            d="M0 460 Q200 390 400 420 Q550 370 700 410 Q850 360 1000 400 Q1100 380 1200 410 L1200 550 L0 550Z"
            fill="var(--crayon-hill-mid)"
            opacity="0.6"
          />
        </g>

        {/* Background trees */}
        <g filter="url(#crayon)">
          {[
            { x: 152, y: 345, trunk: 148, trunkY: 360 },
            { x: 453, y: 320, trunk: 448, trunkY: 340 },
            { x: 852, y: 335, trunk: 848, trunkY: 350 },
            { x: 1102, y: 328, trunk: 1098, trunkY: 345 },
          ].map((t, i) => (
            <g key={`tree-${i}`}>
              <rect
                x={t.trunk}
                y={t.trunkY}
                width={8}
                height={40}
                fill="var(--crayon-trunk)"
                rx="2"
              />
              <ellipse
                cx={t.x}
                cy={t.y}
                rx={22}
                ry={28}
                fill="var(--crayon-tree-dark)"
              />
              <ellipse
                cx={t.x - 4}
                cy={t.y - 5}
                rx={18}
                ry={22}
                fill="var(--crayon-tree-light)"
                opacity="0.7"
              />
            </g>
          ))}
        </g>

        {/* Green hills foreground */}
        <g filter="url(#crayon-rough)">
          <path
            d="M0 500 Q100 450 250 480 Q400 440 550 470 Q700 430 850 460 Q1000 440 1200 470 L1200 600 L0 600Z"
            fill="var(--crayon-hill-near)"
            opacity="0.7"
          />
          <path
            d="M0 540 Q150 500 300 520 Q450 490 600 510 Q750 480 900 505 Q1050 490 1200 510 L1200 650 L0 650Z"
            fill="var(--crayon-grass)"
          />
        </g>

        {/* River */}
        <g filter="url(#crayon-rough)">
          <path
            d="M-20 530 Q100 510 200 525 Q350 540 500 520 Q650 500 800 530 Q950 550 1100 525 Q1180 515 1220 520 L1220 570 Q1100 585 950 565 Q800 545 650 560 Q500 575 350 555 Q200 540 100 555 Q0 565 -20 550Z"
            fill="url(#river-grad)"
            opacity="0.7"
          />
          {/* Sparkles */}
          {[150, 400, 650, 900, 1050].map((cx, i) => (
            <circle
              key={`sparkle-${i}`}
              cx={cx}
              cy={530 + (i % 2 === 0 ? 5 : -2)}
              r={i % 2 === 0 ? 3 : 2.5}
              fill="var(--crayon-river-sparkle)"
              opacity={0.5 + (i % 3) * 0.1}
            />
          ))}
          {/* Edge strokes */}
          <path
            d="M-20 528 Q100 508 200 523 Q350 538 500 518 Q650 498 800 528 Q950 548 1100 523 Q1180 513 1220 518"
            fill="none"
            stroke="var(--crayon-river-edge)"
            strokeWidth="2.5"
            strokeLinecap="round"
            opacity="0.4"
          />
          <path
            d="M-20 552 Q100 567 200 547 Q350 537 500 557 Q650 572 800 552 Q950 537 1100 547 Q1180 557 1220 550"
            fill="none"
            stroke="var(--crayon-river-edge)"
            strokeWidth="2.5"
            strokeLinecap="round"
            opacity="0.4"
          />
        </g>

        {/* Ground */}
        <g filter="url(#crayon-rough)">
          <path
            d="M0 570 Q200 555 400 565 Q600 550 800 560 Q1000 548 1200 555 L1200 800 L0 800Z"
            fill="var(--crayon-ground)"
          />
        </g>

        {/* Grass strokes */}
        <g filter="url(#crayon)" opacity="0.6">
          {[
            [50, 575, 45, 558],
            [55, 575, 58, 560],
            [180, 568, 175, 550],
            [185, 568, 190, 552],
            [320, 570, 315, 553],
            [520, 565, 515, 548],
            [525, 565, 530, 550],
            [700, 568, 695, 550],
            [870, 562, 865, 545],
            [875, 562, 880, 547],
            [1020, 558, 1015, 540],
            [1150, 560, 1145, 543],
            [1155, 560, 1160, 545],
          ].map(([x1, y1, x2, y2], i) => (
            <line
              key={`grass-${i}`}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="var(--crayon-grass-stroke)"
              strokeWidth={i % 2 === 0 ? 3 : 2.5}
              strokeLinecap="round"
            />
          ))}
        </g>

        {/* Flowers */}
        <g filter="url(#crayon)" opacity="0.7">
          {[
            { cx: 90, cy: 572, r: 4, fill: "var(--crayon-flower-1)" },
            { cx: 88, cy: 570, r: 3, fill: "var(--crayon-flower-2)" },
            { cx: 250, cy: 565, r: 3.5, fill: "var(--crayon-flower-2)" },
            { cx: 248, cy: 563, r: 2.5, fill: "var(--crayon-flower-1)" },
            { cx: 580, cy: 560, r: 4, fill: "var(--crayon-flower-1)" },
            { cx: 578, cy: 558, r: 3, fill: "var(--crayon-flower-3)" },
            { cx: 760, cy: 558, r: 3.5, fill: "var(--crayon-flower-3)" },
            { cx: 758, cy: 556, r: 2.5, fill: "var(--crayon-flower-1)" },
            { cx: 980, cy: 555, r: 4, fill: "var(--crayon-flower-2)" },
            { cx: 978, cy: 553, r: 3, fill: "var(--crayon-flower-1)" },
            { cx: 1130, cy: 557, r: 3.5, fill: "var(--crayon-flower-3)" },
          ].map((f, i) => (
            <circle
              key={`flower-${i}`}
              cx={f.cx}
              cy={f.cy}
              r={f.r}
              fill={f.fill}
            />
          ))}
        </g>

        {/* === HOUSE === */}
        <g filter="url(#crayon)">
          <rect
            x="80"
            y="480"
            width="120"
            height="90"
            fill="var(--crayon-house-wall)"
            rx="3"
          />
          <rect
            x="80"
            y="480"
            width="120"
            height="90"
            fill="none"
            stroke="var(--crayon-house-outline)"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            rx="3"
          />
          {/* Roof */}
          <path
            d="M65 485 L140 430 L215 485Z"
            fill="var(--crayon-house-roof)"
          />
          <path
            d="M65 485 L140 430 L215 485Z"
            fill="none"
            stroke="var(--crayon-house-outline)"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Chimney */}
          <rect
            x="170"
            y="440"
            width="20"
            height="45"
            fill="var(--crayon-house-chimney)"
            rx="2"
          />
          <rect
            x="170"
            y="440"
            width="20"
            height="45"
            fill="none"
            stroke="var(--crayon-house-outline)"
            strokeWidth="3"
            strokeLinecap="round"
            rx="2"
          />
          {/* Smoke */}
          <path
            d="M180 438 Q185 425 178 412 Q183 398 176 385"
            fill="none"
            stroke="var(--crayon-smoke)"
            strokeWidth="3"
            strokeLinecap="round"
            opacity="0.4"
          />
          {/* Door */}
          <rect
            x="120"
            y="520"
            width="30"
            height="50"
            fill="var(--crayon-house-door)"
            rx="3"
          />
          <rect
            x="120"
            y="520"
            width="30"
            height="50"
            fill="none"
            stroke="var(--crayon-house-outline)"
            strokeWidth="2.5"
            strokeLinecap="round"
            rx="3"
          />
          <circle cx="143" cy="548" r="3" fill="var(--crayon-house-doorknob)" />
          {/* Windows */}
          {[
            { x: 92, y: 500 },
            { x: 155, y: 500 },
          ].map((w, i) => (
            <g key={`house-win-${i}`}>
              <rect
                x={w.x}
                y={w.y}
                width="22"
                height="22"
                fill="var(--crayon-house-window)"
                rx="2"
              />
              <rect
                x={w.x}
                y={w.y}
                width="22"
                height="22"
                fill="none"
                stroke="var(--crayon-house-outline)"
                strokeWidth="2.5"
                rx="2"
              />
              <line
                x1={w.x + 11}
                y1={w.y}
                x2={w.x + 11}
                y2={w.y + 22}
                stroke="var(--crayon-house-outline)"
                strokeWidth="2"
              />
              <line
                x1={w.x}
                y1={w.y + 11}
                x2={w.x + 22}
                y2={w.y + 11}
                stroke="var(--crayon-house-outline)"
                strokeWidth="2"
              />
              <rect
                x={w.x + 1}
                y={w.y + 1}
                width="20"
                height="20"
                fill="var(--crayon-window-glow)"
                opacity="0.3"
                rx="1"
              />
            </g>
          ))}
          {/* Path */}
          <path
            d="M135 570 Q130 590 140 610 Q135 630 140 650"
            fill="none"
            stroke="var(--crayon-path)"
            strokeWidth="8"
            strokeLinecap="round"
            opacity="0.4"
          />
        </g>

        {/* === LIBRARY === */}
        <g filter="url(#crayon)">
          <rect
            x="880"
            y="460"
            width="180"
            height="110"
            fill="var(--crayon-library-wall)"
            rx="3"
          />
          <rect
            x="880"
            y="460"
            width="180"
            height="110"
            fill="none"
            stroke="var(--crayon-library-outline)"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            rx="3"
          />
          {/* Pediment */}
          <path
            d="M870 465 L970 410 L1070 465Z"
            fill="var(--crayon-library-roof)"
          />
          <path
            d="M870 465 L970 410 L1070 465Z"
            fill="none"
            stroke="var(--crayon-library-outline)"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Columns */}
          {[895, 935, 1015, 1055].map((cx, i) => (
            <g key={`col-${i}`}>
              <rect
                x={cx}
                y="465"
                width="12"
                height="100"
                fill="var(--crayon-library-column)"
                rx="2"
              />
              <rect
                x={cx}
                y="465"
                width="12"
                height="100"
                fill="none"
                stroke="var(--crayon-library-outline)"
                strokeWidth="2.5"
                rx="2"
              />
            </g>
          ))}
          {/* Door */}
          <path
            d="M960 570 L960 520 Q960 505 975 505 Q990 505 990 520 L990 570Z"
            fill="var(--crayon-library-door)"
          />
          <path
            d="M960 570 L960 520 Q960 505 975 505 Q990 505 990 520 L990 570Z"
            fill="none"
            stroke="var(--crayon-library-outline)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          {/* Windows */}
          {[
            { x: 905, y: 490 },
            { x: 1030, y: 490 },
          ].map((w, i) => (
            <g key={`lib-win-${i}`}>
              <rect
                x={w.x}
                y={w.y}
                width="25"
                height="25"
                fill="var(--crayon-library-window)"
                rx="2"
              />
              <rect
                x={w.x}
                y={w.y}
                width="25"
                height="25"
                fill="none"
                stroke="var(--crayon-library-outline)"
                strokeWidth="2.5"
                rx="2"
              />
              <line
                x1={w.x + 12}
                y1={w.y}
                x2={w.x + 12}
                y2={w.y + 25}
                stroke="var(--crayon-library-outline)"
                strokeWidth="2"
              />
              <line
                x1={w.x}
                y1={w.y + 12}
                x2={w.x + 25}
                y2={w.y + 12}
                stroke="var(--crayon-library-outline)"
                strokeWidth="2"
              />
              <rect
                x={w.x + 1}
                y={w.y + 1}
                width="23"
                height="23"
                fill="var(--crayon-window-glow)"
                opacity="0.3"
                rx="1"
              />
            </g>
          ))}
          {/* Books on pediment */}
          {[
            { x: 950, rot: -5, w: 8, h: 15, fill: "var(--crayon-book-1)" },
            { x: 960, rot: 3, w: 7, h: 16, fill: "var(--crayon-book-2)" },
            { x: 970, rot: -2, w: 8, h: 15, fill: "var(--crayon-book-3)" },
            { x: 980, rot: 4, w: 7, h: 16, fill: "var(--crayon-book-1)" },
            { x: 990, rot: -3, w: 8, h: 14, fill: "var(--crayon-book-2)" },
          ].map((b, i) => (
            <rect
              key={`book-${i}`}
              x={b.x}
              y="445"
              width={b.w}
              height={b.h}
              fill={b.fill}
              rx="1"
              transform={`rotate(${b.rot} ${b.x + b.w / 2} ${445 + b.h / 2})`}
            />
          ))}
          {/* Sign */}
          <rect x="945" y="418" width="50" height="18" fill="var(--crayon-library-sign)" rx="3" />
          <text
            x="970"
            y="432"
            fontFamily="var(--font-playfair), Georgia, serif"
            fontSize="11"
            fontWeight="700"
            fill="var(--crayon-library-sign-text)"
            textAnchor="middle"
          >
            LIBRARY
          </text>
          {/* Path */}
          <path
            d="M975 570 Q972 590 978 610 Q974 630 978 650"
            fill="none"
            stroke="var(--crayon-path)"
            strokeWidth="8"
            strokeLinecap="round"
            opacity="0.4"
          />
        </g>

        {/* Fence near house */}
        <g filter="url(#crayon)" opacity="0.5">
          <line x1="30" y1="565" x2="30" y2="540" stroke="var(--crayon-fence)" strokeWidth="3" strokeLinecap="round" />
          <line x1="50" y1="563" x2="50" y2="538" stroke="var(--crayon-fence)" strokeWidth="3" strokeLinecap="round" />
          <line x1="28" y1="548" x2="52" y2="545" stroke="var(--crayon-fence)" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="28" y1="558" x2="52" y2="555" stroke="var(--crayon-fence)" strokeWidth="2.5" strokeLinecap="round" />
        </g>

        {/* Bush near library */}
        <g filter="url(#crayon)">
          <ellipse cx="1110" cy="558" rx="20" ry="14" fill="var(--crayon-bush)" />
          <ellipse cx="1125" cy="555" rx="16" ry="12" fill="var(--crayon-tree-light)" opacity="0.6" />
          <ellipse cx="1100" cy="556" rx="14" ry="10" fill="var(--crayon-tree-dark)" opacity="0.5" />
        </g>

        {/* Birds */}
        <g filter="url(#crayon)" opacity="0.4">
          {[
            { x: 300, y: 200, s: 1 },
            { x: 500, y: 150, s: 0.9 },
            { x: 420, y: 180, s: 0.8 },
            { x: 750, y: 130, s: 0.8 },
          ].map((b, i) => (
            <path
              key={`bird-${i}`}
              d={`M${b.x} ${b.y} Q${b.x + 5 * b.s} ${b.y - 7 * b.s} ${b.x + 10 * b.s} ${b.y} Q${b.x + 15 * b.s} ${b.y - 7 * b.s} ${b.x + 20 * b.s} ${b.y}`}
              fill="none"
              stroke="var(--crayon-bird)"
              strokeWidth="2"
              strokeLinecap="round"
            />
          ))}
        </g>

        {/* Bridge / path connecting house and library */}
        <g filter="url(#crayon)">
          <path
            d="M200 600 Q350 585 500 590 Q650 595 800 585 Q870 580 880 570"
            fill="none"
            stroke="var(--crayon-path)"
            strokeWidth="10"
            strokeLinecap="round"
            opacity="0.3"
          />
          <path
            d="M450 585 Q500 578 550 585"
            fill="none"
            stroke="var(--crayon-fence)"
            strokeWidth="2.5"
            strokeLinecap="round"
            opacity="0.5"
          />
          <path
            d="M550 585 Q600 578 650 588"
            fill="none"
            stroke="var(--crayon-fence)"
            strokeWidth="2.5"
            strokeLinecap="round"
            opacity="0.5"
          />
        </g>
      </svg>
    </div>
  );
}
