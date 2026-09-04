/*
 * TopBar — the one navigation control, identical on every screen (predictable
 * navigation is an ADHD-friendly design rule: back is ALWAYS top-left,
 * settings is ALWAYS top-right, same size, same spot).
 */
export function TopBar({
  title,
  onBack,
  onSettings,
}: {
  title: string;
  onBack?: () => void;
  onSettings?: () => void;
}) {
  return (
    <header className="topbar">
      {onBack ? (
        <button className="topbar__btn" onClick={onBack} aria-label="Go back">
          ←
        </button>
      ) : (
        <span className="topbar__spacer" />
      )}
      <h1 className="topbar__title">{title}</h1>
      {onSettings ? (
        <button className="topbar__btn" onClick={onSettings} aria-label="Settings">
          ⚙️
        </button>
      ) : (
        <span className="topbar__spacer" />
      )}
    </header>
  );
}
