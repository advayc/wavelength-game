"use client";

import { useRef, useCallback, useEffect } from "react";

interface DialWheelProps {
  dialAngle: number; // 0-180
  targetAngle: number; // 0-180
  isScreenOpen: boolean;
  onAngleChange?: (angle: number) => void;
  disabled?: boolean;
  teamColor?: string;
}

// Converts a degree where 0 is straight UP (y=0) to SVG coordinates.
// We use this to easily draw wedges symmetric around 0, then rotate them.
function polarUp(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg - 90) * Math.PI / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

// Generates an SVG path for a circular wedge starting at cx, cy
function wedgePath(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarUp(cx, cy, r, startAngle);
  const end = polarUp(cx, cy, r, endAngle);
  // our wedges are always < 180 degrees, so largeArcFlag is 0
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 0 1 ${end.x} ${end.y} Z`;
}

export default function DialWheel({
  dialAngle,
  targetAngle,
  isScreenOpen,
  onAngleChange,
  disabled = false,
  teamColor = "#E63946",
}: DialWheelProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const isDragging = useRef(false);

  const cx = 200;
  const cy = 200;
  const targetRadius = 170; // Inner radius where target is painted
  const dialRadius = 180;   // Outer bezel radius

  // Convert client coordinates to 0-180 angle where 0 is left, 90 is top, 180 is right
  const getAngleFromEvent = useCallback(
    (clientX: number, clientY: number): number => {
      if (!svgRef.current) return dialAngle;
      const rect = svgRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height; // cy is at the bottom of the bounding box

      const dx = clientX - centerX;
      const dy = centerY - clientY; 
      let mathAngle = (Math.atan2(dy, dx) * 180) / Math.PI; 
      
      let finalAngle = 180 - mathAngle;
      return Math.max(0, Math.min(180, finalAngle));
    },
    [dialAngle]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging.current || disabled) return;
      const angle = getAngleFromEvent(e.clientX, e.clientY);
      onAngleChange?.(angle);
    },
    [disabled, getAngleFromEvent, onAngleChange]
  );

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!isDragging.current || disabled) return;
      e.preventDefault();
      const touch = e.touches[0];
      const angle = getAngleFromEvent(touch.clientX, touch.clientY);
      onAngleChange?.(angle);
    },
    [disabled, getAngleFromEvent, onAngleChange]
  );

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp, handleTouchMove]);

  const startDrag = (e: React.MouseEvent | React.TouchEvent) => {
    if (disabled) return;
    isDragging.current = true;
    if ("touches" in e) {
      const touch = e.touches[0];
      const angle = getAngleFromEvent(touch.clientX, touch.clientY);
      onAngleChange?.(angle);
    } else {
      const angle = getAngleFromEvent(e.clientX, e.clientY);
      onAngleChange?.(angle);
    }
  };

  // Convert 0-180 internal angle to SVG rotation degrees (-90 to +90)
  // so that an angle of 90 (center) maps to 0deg rotation (straight UP in SVG).
  const toRot = (gameAngle: number) => gameAngle - 90; 

  return (
    <div className="relative w-full aspect-[2/1] overflow-hidden rounded-t-full shadow-2xl bg-[#0d1117] border-[6px] border-b-0 border-[#1a2035] select-none touch-none">
      <svg
        ref={svgRef}
        viewBox={`0 0 400 200`}
        className={`w-full h-full block ${disabled ? "cursor-default" : "cursor-grab active:cursor-grabbing"}`}
        onMouseDown={startDrag}
        onTouchStart={startDrag}
      >
        <defs>
          <filter id="shadow">
            <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#000" floodOpacity="0.5" />
          </filter>
          <clipPath id="screenClip">
            <path d={`M ${cx - targetRadius} ${cy} A ${targetRadius} ${targetRadius} 0 0 1 ${cx + targetRadius} ${cy} Z`} />
          </clipPath>
        </defs>

        {/* Clipped background to strictly prevent screen bleed */}
        <g clipPath="url(#screenClip)">
          {/* Base starfield background layer for the screen area */}
          <rect x="0" y="0" width="400" height="200" fill="url(#dialBg)" opacity="0.1" />

          {/* Stars */}
          {[
            [50, 150], [120, 80], [80, 40], [170, 120], [240, 60],
            [320, 140], [360, 80], [280, 100], [200, 30], [140, 160],
            [100, 120], [300, 50], [220, 170], [260, 140]
          ].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={i % 2 === 0 ? 1.5 : 1} fill="white" opacity={0.5 + (i % 4) * 0.1} />
          ))}

          {/* Target Zones drawn as true wedges, matching board game scoring bands */}
          <g transform={`rotate(${toRot(targetAngle)}, ${cx}, ${cy})`}>
            {/* Outer Zone (2pt) - Yellow */}
            <path d={wedgePath(cx, cy, targetRadius, -26, 26)} fill="#facc15" />
            {/* Inner Zone (3pt) - Orange */}
            <path d={wedgePath(cx, cy, targetRadius, -16, 16)} fill="#f97316" />
            {/* Bullseye (4pt) - Blue */}
            <path d={wedgePath(cx, cy, targetRadius, -6, 6)} fill="#3b82f6" />

          </g>
        </g>

        {/* The Mechanical Screens that rotate to cover/uncover the target */}
        <g>
          {/* Left Screen */}
          <path
            d={`M ${cx} ${cy} L ${cx - targetRadius} ${cy} A ${targetRadius} ${targetRadius} 0 0 1 ${cx} ${cy - targetRadius} Z`}
            fill="#e8e0d5"
            stroke="#c8c0b5"
            strokeWidth="1"
            style={{
              transformOrigin: `${cx}px ${cy}px`,
              transform: isScreenOpen ? `rotate(-90deg)` : `rotate(0deg)`,
              transition: "transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)",
            }}
          />
          {/* Right Screen */}
          <path
            d={`M ${cx} ${cy} L ${cx} ${cy - targetRadius} A ${targetRadius} ${targetRadius} 0 0 1 ${cx + targetRadius} ${cy} Z`}
            fill="#e8e0d5"
            stroke="#c8c0b5"
            strokeWidth="1"
            style={{
              transformOrigin: `${cx}px ${cy}px`,
              transform: isScreenOpen ? `rotate(90deg)` : `rotate(0deg)`,
              transition: "transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)",
            }}
          />
        </g>

        {/* Base cover rectangle to hide the screens when they rotate down */}
        <rect x="0" y="200" width="400" height="200" fill="#0d1117" />

        {/* Inner rim border drawn over screens to frame the playable area neatly */}
        <path
          d={`M ${cx - targetRadius} ${cy} A ${targetRadius} ${targetRadius} 0 0 1 ${cx + targetRadius} ${cy}`}
          fill="none"
          stroke="#c8c0b5"
          strokeWidth="3"
          className="pointer-events-none"
        />

        {/* Needle */}
        <g transform={`rotate(${toRot(dialAngle)}, ${cx}, ${cy})`} filter="url(#shadow)">
          <line
            x1={cx}
            y1={cy}
            x2={cx}
            y2={cy - dialRadius + 10} // Extend needle slightly over the rim
            stroke={teamColor}
            strokeWidth="8"
            strokeLinecap="round"
          />
          <line
            x1={cx}
            y1={cy}
            x2={cx}
            y2={cy - dialRadius + 10}
            stroke="#ffffff"
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.4"
          />
          {/* Center Pivot Hub */}
          <circle cx={cx} cy={cy} r="26" fill={teamColor} />
          <circle cx={cx} cy={cy} r="14" fill="#ffffff" opacity="0.9" />
        </g>
        
        {/* Base line thick cover to ensure no bottom-edge bleeding */}
        <line x1="0" y1="200" x2="400" y2="200" stroke="#1a2035" strokeWidth="8" />
      </svg>
    </div>
  );
}
