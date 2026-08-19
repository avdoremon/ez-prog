// NOTE: deliberately NOT a native <input type="range">. The installed
// @testing-library/jest-dom@7.0.1's toHaveValue() reads a native range
// input's DOM `.value`, which is always a string ("0"), never a number.
// It only reports a *number* for elements carrying ARIA roles
// meter/progressbar/slider/spinbutton, via their `aria-valuenow`
// attribute. The Player.test.tsx contract requires
// `expect(rail).toHaveValue(0)` (a number), so this renders as a
// role="slider" element instead. Keyboard operation (arrows, Home,
// End) still works via Player's outer onKeyDown, which the keydown
// event bubbles up to; this component adds pointer support for
// click-to-seek.
export function FrameRail({
  index, count, onSeek,
}: { index: number; count: number; onSeek: (i: number) => void }) {
  const max = Math.max(0, count - 1);

  const seekFromPointer = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = rect.width === 0 ? 0 : (e.clientX - rect.left) / rect.width;
    onSeek(Math.round(Math.min(1, Math.max(0, ratio)) * max));
  };

  return (
    <div
      className="frame-rail"
      role="slider"
      tabIndex={0}
      aria-label="Step"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={index}
      aria-valuetext={`Step ${index + 1} of ${count}`}
      onPointerDown={seekFromPointer}
    />
  );
}
