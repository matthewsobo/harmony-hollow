/*
 * Home — the Harmony Hollow town map. Purely a motivational shell: areas
 * unlock as stages complete. Town Square is open (it holds Key Detective);
 * the other areas unlock in later phases.
 */
import { TIER_INFO, type Profile } from '../types';
import { TopBar } from '../components/TopBar';
import { Tempo } from '../components/Tempo';

const LOCKED_SPOTS = [
  { emoji: '🎵', name: 'Music Shop' },
  { emoji: '🌳', name: 'The Park' },
  { emoji: '🎭', name: 'Concert Hall' },
];

export function Home({
  profile,
  onOpenTown,
  onSwitchProfile,
  onSettings,
}: {
  profile: Profile;
  onOpenTown: () => void;
  onSwitchProfile: () => void;
  onSettings: () => void;
}) {
  return (
    <>
      <TopBar title={`Hi, ${profile.name}!`} onBack={onSwitchProfile} onSettings={onSettings} />
      <main className="screen">
        <div className="bounce-in">
          <Tempo size={110} />
        </div>
        <p className="muted">
          {TIER_INFO[profile.tier].emoji} {TIER_INFO[profile.tier].label} · ⭐ {profile.starsTotal} stars
          {profile.streak.days > 1 ? ` · 🔥 ${profile.streak.days} days` : ''}
        </p>
        <div className="map-area">
          <button className="map-spot map-spot--open" onClick={onOpenTown}>
            <span className="map-spot__emoji">⛲</span>
            Town Square
            <span className="map-spot__hint">Key Detective!</span>
          </button>
          {LOCKED_SPOTS.map((s) => (
            <div key={s.name} className="map-spot map-spot--locked">
              <span className="map-spot__emoji">🔒</span>
              {s.name}
              <span className="map-spot__hint">Locked</span>
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
