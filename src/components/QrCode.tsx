// A QR code drawn as an SVG: round modules, soft finder squares and an optional logo in the middle
// (error correction H keeps it scannable with the centre covered).
import { useMemo } from "react";
import { encode } from "uqr";

const POSITION = 2; // uqr's QrCodeDataType.Position: the three finder squares, drawn separately

export function QrCode({ value, logo, size = 240, className = "" }: { value: string; logo?: string; size?: number; className?: string }) {
  const qr = useMemo(() => encode(value, { ecc: "H", border: 0 }), [value]);
  const n = qr.size;
  const hole = logo ? Math.ceil(n * 0.22) | 1 : 0; // odd, so it centres on a module
  const h0 = (n - hole) / 2;
  const inHole = (x: number, y: number) => hole > 0 && x >= h0 - 0.5 && x < h0 + hole + 0.5 && y >= h0 - 0.5 && y < h0 + hole + 0.5;

  const dots: React.ReactNode[] = [];
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++)
      if (qr.data[y][x] && qr.types[y][x] !== POSITION && !inHole(x, y)) dots.push(<circle key={`${x}-${y}`} cx={x + 0.5} cy={y + 0.5} r={0.42} />);

  const finder = (x: number, y: number) => (
    <g key={`f${x}-${y}`}>
      <rect x={x + 0.5} y={y + 0.5} width={6} height={6} rx={1.8} fill="none" stroke="currentColor" strokeWidth={1} />
      <rect x={x + 2} y={y + 2} width={3} height={3} rx={0.9} />
    </g>
  );

  return (
    <div className={`rounded-2xl bg-white p-3 text-[#0d0c10] ${className}`} style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${n} ${n}`} className="size-full" fill="currentColor" role="img" aria-label="QR code">
        {dots}
        {finder(0, 0)}
        {finder(n - 7, 0)}
        {finder(0, n - 7)}
        {logo && <image href={logo} x={h0 + 0.6} y={h0 + 0.6} width={hole - 1.2} height={hole - 1.2} />}
      </svg>
    </div>
  );
}
