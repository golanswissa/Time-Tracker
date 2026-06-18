// Project avatar: a sun by day, a moon by night — matching the SunArc orb.
// Pure CSS: it's a sun by default and swaps to the moon under `html.dark`,
// so it follows the app theme with no extra JS.
export function ProjectMark() {
  return <div className="wk-pc-orb" aria-hidden="true" />;
}
