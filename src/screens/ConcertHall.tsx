/*
 * ConcertHall — the fourth map area: home of Sound Detective (ear training).
 * Lists the listening games available to the profile's tier; the mic game is
 * marked and only shown where a microphone exists at all.
 */
import { TopBar } from '../components/TopBar';
import { SD_INFO, type SDKind } from '../content/soundDetective';
import { micAvailable } from '../mic/MicPitchInputSource';
import type { Profile } from '../types';

export function ConcertHall({
  profile,
  onPlay,
  onBack,
}: {
  profile: Profile;
  onPlay: (kind: SDKind) => void;
  onBack: () => void;
}) {
  const hasMic = micAvailable();
  const kinds = (Object.keys(SD_INFO) as SDKind[]).filter((k) => {
    const info = SD_INFO[k];
    if (!info.tiers.includes(profile.tier)) return false;
    if (info.mic && !hasMic) return false;
    return true;
  });
  return (
    <>
      <TopBar title="🎭 Concert Hall" onBack={onBack} />
      <main className="screen">
        <p className="muted">Sound Detective — train those ears!</p>
        {kinds.map((k) => {
          const info = SD_INFO[k];
          const prog = profile.stageProgress[info.stageId];
          return (
            <button key={k} className="profile-card" onClick={() => onPlay(k)}>
              <span className="profile-card__emoji">{info.emoji}</span>
              <span>
                <span className="profile-card__name" style={{ fontSize: 20 }}>
                  {info.title}
                </span>
                {info.mic && (
                  <>
                    <br />
                    <span className="profile-card__meta">🎤 on the real piano</span>
                  </>
                )}
              </span>
              <span className="profile-card__stars">⭐ {prog?.stars ?? 0}</span>
            </button>
          );
        })}
      </main>
    </>
  );
}
