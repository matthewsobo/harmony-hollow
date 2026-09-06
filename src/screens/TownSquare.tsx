/*
 * TownSquare — the first unlocked map area. Lists the Key Detective
 * adventures that exist so far; later phases add more games here and unlock
 * more areas.
 */
import { TopBar } from '../components/TopBar';
import { stageName } from '../content/stages';
import { micAvailable } from '../mic/MicPitchInputSource';
import type { Profile } from '../types';

const ADVENTURES = [
  { stageId: 1, emoji: '🖤', blurb: 'Groups of 2 and 3, higher and lower' },
  { stageId: 3, emoji: '🔤', blurb: 'Find C, D, E, F, G, A and B' },
];

export function TownSquare({
  profile,
  onPlay,
  onPlayMic,
  onBack,
}: {
  profile: Profile;
  onPlay: (stageId: number) => void;
  /** "Find it for real" — the same adventure answered on the real piano. */
  onPlayMic: (stageId: number) => void;
  onBack: () => void;
}) {
  const hasMic = micAvailable();
  return (
    <>
      <TopBar title="⛲ Town Square" onBack={onBack} />
      <main className="screen">
        <p className="muted">Key Detective — pick an adventure!</p>
        {ADVENTURES.map((a) => {
          const prog = profile.stageProgress[a.stageId];
          return (
            <div key={a.stageId} style={{ display: 'flex', gap: 8, width: '100%' }}>
              <button className="profile-card" onClick={() => onPlay(a.stageId)}>
                <span className="profile-card__emoji">{a.emoji}</span>
                <span>
                  <span className="profile-card__name" style={{ fontSize: 20 }}>
                    {stageName(a.stageId)}
                  </span>
                  <br />
                  <span className="profile-card__meta">{a.blurb}</span>
                </span>
                <span className="profile-card__stars">⭐ {prog?.stars ?? 0}</span>
              </button>
              {hasMic && (
                <button
                  className="topbar__btn"
                  aria-label={`Play ${stageName(a.stageId)} on the real piano`}
                  title="Find it for real (microphone)"
                  onClick={() => onPlayMic(a.stageId)}
                >
                  🎤
                </button>
              )}
            </div>
          );
        })}
        {hasMic && <p className="muted">Tap 🎤 to find the keys on the real piano!</p>}
      </main>
    </>
  );
}
