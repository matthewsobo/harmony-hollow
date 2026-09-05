/*
 * MusicShop — the second map area: home of Staff Reader. Lists the reading
 * stages appropriate to the profile's tier (Junior stops at Stage 5, per the
 * curriculum) with per-stage star counts.
 */
import { TopBar } from '../components/TopBar';
import { STAFF_READER_STAGES } from '../content/staffReader';
import { stageName } from '../content/stages';
import { STAGES } from '../content/stages';
import type { Profile } from '../types';

const STAGE_EMOJI: Record<number, string> = {
  2: '↕️', 4: '🎯', 5: '🐰', 6: '𝄢', 7: '𝄞', 8: '🎼', 9: '🌟', 10: '📏',
};

export function MusicShop({
  profile,
  onPlay,
  onBack,
}: {
  profile: Profile;
  onPlay: (stageId: number) => void;
  onBack: () => void;
}) {
  const stages = STAFF_READER_STAGES.filter((id) =>
    STAGES.find((s) => s.id === id)?.tiers.includes(profile.tier)
  );
  return (
    <>
      <TopBar title="🎵 Music Shop" onBack={onBack} />
      <main className="screen">
        <p className="muted">Staff Reader — pick an adventure!</p>
        {stages.map((id) => {
          const prog = profile.stageProgress[id];
          return (
            <button key={id} className="profile-card" onClick={() => onPlay(id)}>
              <span className="profile-card__emoji">{STAGE_EMOJI[id]}</span>
              <span>
                <span className="profile-card__name" style={{ fontSize: 20 }}>
                  {stageName(id)}
                </span>
              </span>
              <span className="profile-card__stars">⭐ {prog?.stars ?? 0}</span>
            </button>
          );
        })}
      </main>
    </>
  );
}
