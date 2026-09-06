/*
 * Home — the Harmony Hollow town map. Purely a motivational shell: areas
 * unlock as stages complete. Town Square is open (it holds Key Detective);
 * the other areas unlock in later phases.
 */
import { TIER_INFO, type Profile } from '../types';
import { TopBar } from '../components/TopBar';
import { Tempo } from '../components/Tempo';

export function Home({
  profile,
  onOpenTown,
  onOpenShop,
  onOpenPark,
  onOpenHall,
  onSwitchProfile,
  onSettings,
}: {
  profile: Profile;
  onOpenTown: () => void;
  onOpenShop: () => void;
  onOpenPark: () => void;
  onOpenHall: () => void;
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
          <button className="map-spot map-spot--open" onClick={onOpenShop}>
            <span className="map-spot__emoji">🎵</span>
            Music Shop
            <span className="map-spot__hint">Staff Reader!</span>
          </button>
          <button className="map-spot map-spot--open" onClick={onOpenPark}>
            <span className="map-spot__emoji">🌳</span>
            The Park
            <span className="map-spot__hint">Echo Keys! 🎤</span>
          </button>
          <button className="map-spot map-spot--open" onClick={onOpenHall}>
            <span className="map-spot__emoji">🎭</span>
            Concert Hall
            <span className="map-spot__hint">Sound Detective!</span>
          </button>
        </div>
      </main>
    </>
  );
}
