/** Upload progress. Shown because a song over mobile data takes long enough
    that a button with no feedback reads as a broken one. */
export function Bar({ percent }: { percent: number }) {
  return (
    <span
      className="bar"
      role="progressbar"
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <span className="bar__fill" style={{ width: `${percent}%` }} />
    </span>
  );
}
