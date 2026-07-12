"use client";

import { useEffect, useState, useCallback } from "react";

type Colors = Record<string, string>;

const VAR_MAP: Record<string, string> = {
  skyTop:"--crayon-sky-top",skyBottom:"--crayon-sky-bottom",sun:"--crayon-sun",
  sunGlow:"--crayon-sun-glow",cloud:"--crayon-cloud",hillFar:"--crayon-hill-far",
  hillMid:"--crayon-hill-mid",hillNear:"--crayon-hill-near",grass:"--crayon-grass",
  ground:"--crayon-ground",grassStroke:"--crayon-grass-stroke",trunk:"--crayon-trunk",
  treeDark:"--crayon-tree-dark",treeLight:"--crayon-tree-light",bush:"--crayon-bush",
  river:"--crayon-river",riverLight:"--crayon-river-light",riverEdge:"--crayon-river-edge",
  riverSparkle:"--crayon-river-sparkle",houseWall:"--crayon-house-wall",
  houseRoof:"--crayon-house-roof",houseChimney:"--crayon-house-chimney",
  houseDoor:"--crayon-house-door",houseDoorknob:"--crayon-house-doorknob",
  houseWindow:"--crayon-house-window",houseOutline:"--crayon-house-outline",
  windowGlow:"--crayon-window-glow",smoke:"--crayon-smoke",libWall:"--crayon-library-wall",
  libRoof:"--crayon-library-roof",libColumn:"--crayon-library-column",
  libDoor:"--crayon-library-door",libWindow:"--crayon-library-window",
  libOutline:"--crayon-library-outline",libSign:"--crayon-library-sign",
  libSignText:"--crayon-library-sign-text",book1:"--crayon-book-1",book2:"--crayon-book-2",
  book3:"--crayon-book-3",path:"--crayon-path",fence:"--crayon-fence",
  flower1:"--crayon-flower-1",flower2:"--crayon-flower-2",flower3:"--crayon-flower-3",
  bird:"--crayon-bird",
};

const FALLBACK: Colors = {
  skyTop:"#87ceeb",skyBottom:"#b8e4f0",sun:"#f5c542",sunGlow:"#f5a623",cloud:"#ffffff",
  hillFar:"#7db87d",hillMid:"#5ea55e",hillNear:"#4d9a4d",grass:"#3d8b3d",ground:"#5a9e3a",
  grassStroke:"#2d6b2d",trunk:"#8b6914",treeDark:"#2e7d32",treeLight:"#66bb6a",bush:"#43a047",
  river:"#4a90d9",riverLight:"#7ab8f5",riverEdge:"#3a7bc8",riverSparkle:"#ffffff",
  houseWall:"#e8c49a",houseRoof:"#c0392b",houseChimney:"#a0522d",houseDoor:"#8b4513",
  houseDoorknob:"#daa520",houseWindow:"#87ceeb",houseOutline:"#5d4037",windowGlow:"#ffd54f",
  smoke:"#9e9e9e",libWall:"#d4b896",libRoof:"#8d6e63",libColumn:"#c4a882",libDoor:"#6d4c41",
  libWindow:"#87ceeb",libOutline:"#4e342e",libSign:"#5d4037",libSignText:"#fff8e1",
  book1:"#e53935",book2:"#1e88e5",book3:"#fdd835",path:"#a1887f",fence:"#8d6e63",
  flower1:"#e91e63",flower2:"#ff9800",flower3:"#9c27b0",bird:"#455a64",
};

function readColors(): Colors {
  if (typeof window === "undefined") return FALLBACK;
  const s = getComputedStyle(document.documentElement);
  const out: Colors = {};
  for (const [key, varName] of Object.entries(VAR_MAP)) {
    out[key] = s.getPropertyValue(varName).trim() || FALLBACK[key];
  }
  return out;
}

export default function CrayonBackground() {
  const [co, setCo] = useState<Colors>(FALLBACK);

  const update = useCallback(() => setCo(readColors()), []);

  useEffect(() => {
    update();
    const obs = new MutationObserver(update);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, [update]);

  return (
    <div aria-hidden style={{ position:"fixed", inset:0, zIndex:-1, overflow:"hidden", pointerEvents:"none" }}>
      <svg viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice" style={{ width:"100%", height:"100%", opacity:0.35 }}>
        <defs>
          <filter id="cb-crayon" x="-5%" y="-5%" width="110%" height="110%">
            <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves={4} seed={2} result="noise"/>
            <feDisplacementMap in="SourceGraphic" in2="noise" scale={3} xChannelSelector="R" yChannelSelector="G"/>
          </filter>
          <filter id="cb-rough" x="-5%" y="-5%" width="110%" height="110%">
            <feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves={5} seed={7} result="noise"/>
            <feDisplacementMap in="SourceGraphic" in2="noise" scale={4} xChannelSelector="R" yChannelSelector="G"/>
          </filter>
          <linearGradient id="cb-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" style={{ stopColor: co.skyTop }}/>
            <stop offset="100%" style={{ stopColor: co.skyBottom }}/>
          </linearGradient>
          <linearGradient id="cb-river" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" style={{ stopColor: co.riverLight }}/>
            <stop offset="50%" style={{ stopColor: co.river }}/>
            <stop offset="100%" style={{ stopColor: co.riverLight }}/>
          </linearGradient>
        </defs>

        <rect width="1200" height="800" fill="url(#cb-sky)"/>

        <g filter="url(#cb-crayon)">
          <circle cx={950} cy={120} r={55} style={{fill:co.sun}} opacity={0.85}/>
          <circle cx={950} cy={120} r={65} fill="none" style={{stroke:co.sunGlow}} strokeWidth={8} opacity={0.3}/>
          {([[950,40,950,20],[1010,60,1025,48],[1030,120,1050,120],[1010,180,1025,192],[890,60,875,48],[870,120,850,120],[890,180,875,192],[950,200,950,215]] as [number,number,number,number][]).map(([x1,y1,x2,y2],i)=>(
            <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} style={{stroke:co.sun}} strokeWidth={4} strokeLinecap="round" opacity={0.5}/>
          ))}
        </g>

        <g filter="url(#cb-crayon)" opacity={0.5}>
          {[[200,100,70,30],[240,90,50,25],[170,95,40,20],[600,70,60,25],[640,60,45,22],[570,65,35,18],[1050,180,50,22],[1080,170,40,18]].map(([cx,cy,rx,ry],i)=>(
            <ellipse key={i} cx={cx} cy={cy} rx={rx} ry={ry} style={{fill:co.cloud}}/>
          ))}
        </g>

        <g filter="url(#cb-rough)">
          <path d="M0 420 Q150 340 300 380 Q450 320 600 370 Q750 310 900 360 Q1050 300 1200 350 L1200 500 L0 500Z" style={{fill:co.hillFar}} opacity={0.5}/>
          <path d="M0 460 Q200 390 400 420 Q550 370 700 410 Q850 360 1000 400 Q1100 380 1200 410 L1200 550 L0 550Z" style={{fill:co.hillMid}} opacity={0.6}/>
        </g>

        <g filter="url(#cb-crayon)">
          {[{x:152,y:345,t:148,ty:360},{x:453,y:320,t:448,ty:340},{x:852,y:335,t:848,ty:350},{x:1102,y:328,t:1098,ty:345}].map((tr,i)=>(
            <g key={i}>
              <rect x={tr.t} y={tr.ty} width={8} height={40} style={{fill:co.trunk}} rx={2}/>
              <ellipse cx={tr.x} cy={tr.y} rx={22} ry={28} style={{fill:co.treeDark}}/>
              <ellipse cx={tr.x-4} cy={tr.y-5} rx={18} ry={22} style={{fill:co.treeLight}} opacity={0.7}/>
            </g>
          ))}
        </g>

        <g filter="url(#cb-rough)">
          <path d="M0 500 Q100 450 250 480 Q400 440 550 470 Q700 430 850 460 Q1000 440 1200 470 L1200 600 L0 600Z" style={{fill:co.hillNear}} opacity={0.7}/>
          <path d="M0 540 Q150 500 300 520 Q450 490 600 510 Q750 480 900 505 Q1050 490 1200 510 L1200 650 L0 650Z" style={{fill:co.grass}}/>
        </g>

        <g filter="url(#cb-rough)">
          <path d="M-20 530 Q100 510 200 525 Q350 540 500 520 Q650 500 800 530 Q950 550 1100 525 Q1180 515 1220 520 L1220 570 Q1100 585 950 565 Q800 545 650 560 Q500 575 350 555 Q200 540 100 555 Q0 565 -20 550Z" fill="url(#cb-river)" opacity={0.7}/>
          {[150,400,650,900,1050].map((cx,i)=>(
            <circle key={i} cx={cx} cy={530+(i%2===0?5:-2)} r={i%2===0?3:2.5} style={{fill:co.riverSparkle}} opacity={0.5+(i%3)*0.1}/>
          ))}
          <path d="M-20 528 Q100 508 200 523 Q350 538 500 518 Q650 498 800 528 Q950 548 1100 523 Q1180 513 1220 518" fill="none" style={{stroke:co.riverEdge}} strokeWidth={2.5} strokeLinecap="round" opacity={0.4}/>
          <path d="M-20 552 Q100 567 200 547 Q350 537 500 557 Q650 572 800 552 Q950 537 1100 547 Q1180 557 1220 550" fill="none" style={{stroke:co.riverEdge}} strokeWidth={2.5} strokeLinecap="round" opacity={0.4}/>
        </g>

        <g filter="url(#cb-rough)">
          <path d="M0 570 Q200 555 400 565 Q600 550 800 560 Q1000 548 1200 555 L1200 800 L0 800Z" style={{fill:co.ground}}/>
        </g>

        <g filter="url(#cb-crayon)" opacity={0.6}>
          {[[50,575,45,558],[55,575,58,560],[180,568,175,550],[185,568,190,552],[320,570,315,553],[520,565,515,548],[525,565,530,550],[700,568,695,550],[870,562,865,545],[875,562,880,547],[1020,558,1015,540],[1150,560,1145,543],[1155,560,1160,545]].map(([x1,y1,x2,y2],i)=>(
            <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} style={{stroke:co.grassStroke}} strokeWidth={i%2===0?3:2.5} strokeLinecap="round"/>
          ))}
        </g>

        <g filter="url(#cb-crayon)" opacity={0.7}>
          {[
            {cx:90,cy:572,r:4,f:"flower1"},{cx:88,cy:570,r:3,f:"flower2"},
            {cx:250,cy:565,r:3.5,f:"flower2"},{cx:248,cy:563,r:2.5,f:"flower1"},
            {cx:580,cy:560,r:4,f:"flower1"},{cx:578,cy:558,r:3,f:"flower3"},
            {cx:760,cy:558,r:3.5,f:"flower3"},{cx:758,cy:556,r:2.5,f:"flower1"},
            {cx:980,cy:555,r:4,f:"flower2"},{cx:978,cy:553,r:3,f:"flower1"},
            {cx:1130,cy:557,r:3.5,f:"flower3"},
          ].map((fl,i)=>(
            <circle key={i} cx={fl.cx} cy={fl.cy} r={fl.r} style={{fill:co[fl.f]}}/>
          ))}
        </g>

        <g filter="url(#cb-crayon)">
          <rect x={80} y={480} width={120} height={90} style={{fill:co.houseWall}} rx={3}/>
          <rect x={80} y={480} width={120} height={90} fill="none" style={{stroke:co.houseOutline}} strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" rx={3}/>
          <path d="M65 485 L140 430 L215 485Z" style={{fill:co.houseRoof}}/>
          <path d="M65 485 L140 430 L215 485Z" fill="none" style={{stroke:co.houseOutline}} strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round"/>
          <rect x={170} y={440} width={20} height={45} style={{fill:co.houseChimney}} rx={2}/>
          <rect x={170} y={440} width={20} height={45} fill="none" style={{stroke:co.houseOutline}} strokeWidth={3} strokeLinecap="round" rx={2}/>
          <path d="M180 438 Q185 425 178 412 Q183 398 176 385" fill="none" style={{stroke:co.smoke}} strokeWidth={3} strokeLinecap="round" opacity={0.4}/>
          <rect x={120} y={520} width={30} height={50} style={{fill:co.houseDoor}} rx={3}/>
          <rect x={120} y={520} width={30} height={50} fill="none" style={{stroke:co.houseOutline}} strokeWidth={2.5} strokeLinecap="round" rx={3}/>
          <circle cx={143} cy={548} r={3} style={{fill:co.houseDoorknob}}/>
          {[{x:92,y:500},{x:155,y:500}].map((w,i)=>(
            <g key={i}>
              <rect x={w.x} y={w.y} width={22} height={22} style={{fill:co.houseWindow}} rx={2}/>
              <rect x={w.x} y={w.y} width={22} height={22} fill="none" style={{stroke:co.houseOutline}} strokeWidth={2.5} rx={2}/>
              <line x1={w.x+11} y1={w.y} x2={w.x+11} y2={w.y+22} style={{stroke:co.houseOutline}} strokeWidth={2}/>
              <line x1={w.x} y1={w.y+11} x2={w.x+22} y2={w.y+11} style={{stroke:co.houseOutline}} strokeWidth={2}/>
              <rect x={w.x+1} y={w.y+1} width={20} height={20} style={{fill:co.windowGlow}} opacity={0.3} rx={1}/>
            </g>
          ))}
          <path d="M135 570 Q130 590 140 610 Q135 630 140 650" fill="none" style={{stroke:co.path}} strokeWidth={8} strokeLinecap="round" opacity={0.4}/>
        </g>

        <g filter="url(#cb-crayon)">
          <rect x={880} y={460} width={180} height={110} style={{fill:co.libWall}} rx={3}/>
          <rect x={880} y={460} width={180} height={110} fill="none" style={{stroke:co.libOutline}} strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" rx={3}/>
          <path d="M870 465 L970 410 L1070 465Z" style={{fill:co.libRoof}}/>
          <path d="M870 465 L970 410 L1070 465Z" fill="none" style={{stroke:co.libOutline}} strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round"/>
          {[895,935,1015,1055].map((cx,i)=>(
            <g key={i}>
              <rect x={cx} y={465} width={12} height={100} style={{fill:co.libColumn}} rx={2}/>
              <rect x={cx} y={465} width={12} height={100} fill="none" style={{stroke:co.libOutline}} strokeWidth={2.5} rx={2}/>
            </g>
          ))}
          <path d="M960 570 L960 520 Q960 505 975 505 Q990 505 990 520 L990 570Z" style={{fill:co.libDoor}}/>
          <path d="M960 570 L960 520 Q960 505 975 505 Q990 505 990 520 L990 570Z" fill="none" style={{stroke:co.libOutline}} strokeWidth={2.5} strokeLinecap="round"/>
          {[{x:905,y:490},{x:1030,y:490}].map((w,i)=>(
            <g key={i}>
              <rect x={w.x} y={w.y} width={25} height={25} style={{fill:co.libWindow}} rx={2}/>
              <rect x={w.x} y={w.y} width={25} height={25} fill="none" style={{stroke:co.libOutline}} strokeWidth={2.5} rx={2}/>
              <line x1={w.x+12} y1={w.y} x2={w.x+12} y2={w.y+25} style={{stroke:co.libOutline}} strokeWidth={2}/>
              <line x1={w.x} y1={w.y+12} x2={w.x+25} y2={w.y+12} style={{stroke:co.libOutline}} strokeWidth={2}/>
              <rect x={w.x+1} y={w.y+1} width={23} height={23} style={{fill:co.windowGlow}} opacity={0.3} rx={1}/>
            </g>
          ))}
          {[
            {x:950,rot:-5,w:8,h:15,f:"book1"},{x:960,rot:3,w:7,h:16,f:"book2"},
            {x:970,rot:-2,w:8,h:15,f:"book3"},{x:980,rot:4,w:7,h:16,f:"book1"},
            {x:990,rot:-3,w:8,h:14,f:"book2"},
          ].map((b,i)=>(
            <rect key={i} x={b.x} y={445} width={b.w} height={b.h} style={{fill:co[b.f]}} rx={1} transform={`rotate(${b.rot} ${b.x+b.w/2} ${445+b.h/2})`}/>
          ))}
          <rect x={945} y={418} width={50} height={18} style={{fill:co.libSign}} rx={3}/>
          <text x={970} y={432} fontFamily="var(--font-playfair), Georgia, serif" fontSize={11} fontWeight={700} style={{fill:co.libSignText}} textAnchor="middle">LIBRARY</text>
          <path d="M975 570 Q972 590 978 610 Q974 630 978 650" fill="none" style={{stroke:co.path}} strokeWidth={8} strokeLinecap="round" opacity={0.4}/>
        </g>

        <g filter="url(#cb-crayon)" opacity={0.5}>
          <line x1={30} y1={565} x2={30} y2={540} style={{stroke:co.fence}} strokeWidth={3} strokeLinecap="round"/>
          <line x1={50} y1={563} x2={50} y2={538} style={{stroke:co.fence}} strokeWidth={3} strokeLinecap="round"/>
          <line x1={28} y1={548} x2={52} y2={545} style={{stroke:co.fence}} strokeWidth={2.5} strokeLinecap="round"/>
          <line x1={28} y1={558} x2={52} y2={555} style={{stroke:co.fence}} strokeWidth={2.5} strokeLinecap="round"/>
        </g>

        <g filter="url(#cb-crayon)">
          <ellipse cx={1110} cy={558} rx={20} ry={14} style={{fill:co.bush}}/>
          <ellipse cx={1125} cy={555} rx={16} ry={12} style={{fill:co.treeLight}} opacity={0.6}/>
          <ellipse cx={1100} cy={556} rx={14} ry={10} style={{fill:co.treeDark}} opacity={0.5}/>
        </g>

        <g filter="url(#cb-crayon)" opacity={0.4}>
          {[{x:300,y:200,s:1},{x:500,y:150,s:0.9},{x:420,y:180,s:0.8},{x:750,y:130,s:0.8}].map((b,i)=>(
            <path key={i} d={`M${b.x} ${b.y} Q${b.x+5*b.s} ${b.y-7*b.s} ${b.x+10*b.s} ${b.y} Q${b.x+15*b.s} ${b.y-7*b.s} ${b.x+20*b.s} ${b.y}`} fill="none" style={{stroke:co.bird}} strokeWidth={2} strokeLinecap="round"/>
          ))}
        </g>

        <g filter="url(#cb-crayon)">
          <path d="M200 600 Q350 585 500 590 Q650 595 800 585 Q870 580 880 570" fill="none" style={{stroke:co.path}} strokeWidth={10} strokeLinecap="round" opacity={0.3}/>
          <path d="M450 585 Q500 578 550 585" fill="none" style={{stroke:co.fence}} strokeWidth={2.5} strokeLinecap="round" opacity={0.5}/>
          <path d="M550 585 Q600 578 650 588" fill="none" style={{stroke:co.fence}} strokeWidth={2.5} strokeLinecap="round" opacity={0.5}/>
        </g>
      </svg>
    </div>
  );
}
