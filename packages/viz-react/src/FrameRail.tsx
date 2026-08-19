export function FrameRail({
  index, count, onSeek,
}: { index: number; count: number; onSeek: (i: number) => void }) {
  return (
    <input
      className="frame-rail"
      type="range"
      min={0}
      max={Math.max(0, count - 1)}
      step={1}
      value={index}
      aria-label="Step"
      aria-valuetext={`Step ${index + 1} of ${count}`}
      onChange={(e) => onSeek(Number(e.target.value))}
    />
  );
}
