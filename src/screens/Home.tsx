/*
 * Home — the Harmony Hollow town map. Purely a motivational shell: areas
 * unlock as stages complete. In Phase 1 the games don't exist yet, so Town
 * Square is "open" but explains that games arrive with the next update.
 */
import { TIER_INFO, type Profile } from '../types';
import { TopBar } from '../components/TopBar';
import { Tempo } from '../components/Tempo';

const SPOTS = [
  { emoji: '⛲', name: 'Town Square', locked: false, hint: 'Games coming soon!' },
  { emoji: '🎵', name: 'Music Shop', locked: true, hint: 'Locked' },
  { emoji: '🌳', name: 'The Park', locked: true, hint: 'Locked' },
  { emoji: '🎭', name: 'Concert Hall', locked: true, hint: 'Locked' },
];

export function Home({
  profile,
  onSwitchProfile,
  onSettings,
}: {
  profile: Profile;
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
          {SPOTS.map((s) => (
            <div key={s.name} className={'map-spot' + (s.locked ? ' map-spot--locked' : '')}>
              <span className="map-spot__emoji">{s.locked ? '🔒' : s.emoji}</span>
              {s.name}
              <span className="map-spot__hint">{s.hint}</span>
            </div>
          ))}
        </div>
        <p className="muted">
          Tempo is still building the games — Key Detective opens in Town Square soon!
        </p>
      </main>
    </>
  );
}
