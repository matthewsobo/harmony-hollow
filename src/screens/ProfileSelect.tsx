/*
 * ProfileSelect — the first screen: pick who's playing, or create a profile.
 * Creation is parent-assisted (typing a name), so a text input is OK here;
 * gameplay screens never require typing.
 */
import { useState } from 'react';
import { TIER_INFO, newProfile, type Profile, type Tier } from '../types';
import { TopBar } from '../components/TopBar';
import { Tempo } from '../components/Tempo';

export function ProfileSelect({
  profiles,
  onPick,
  onCreate,
  onDelete,
}: {
  profiles: Profile[];
  onPick: (p: Profile) => void;
  onCreate: (p: Profile) => void;
  onDelete: (p: Profile) => void;
}) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [tier, setTier] = useState<Tier>('explorer');

  if (creating) {
    return (
      <>
        <TopBar title="New Player" onBack={() => setCreating(false)} />
        <main className="screen">
          <input
            className="name-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name"
            maxLength={20}
            aria-label="Player name"
          />
          <div className="tier-row" role="radiogroup" aria-label="Difficulty tier">
            {(Object.keys(TIER_INFO) as Tier[]).map((t) => (
              <button
                key={t}
                role="radio"
                aria-checked={tier === t}
                className={'tier-btn' + (tier === t ? ' tier-btn--selected' : '')}
                onClick={() => setTier(t)}
              >
                <span className="tier-btn__emoji">{TIER_INFO[t].emoji}</span>
                <span className="tier-btn__label">{TIER_INFO[t].label}</span>
                <span className="muted">{TIER_INFO[t].blurb}</span>
              </button>
            ))}
          </div>
          <button
            className="big-btn"
            disabled={!name.trim()}
            style={name.trim() ? undefined : { opacity: 0.5 }}
            onClick={() => {
              const p = newProfile(name.trim(), tier);
              setName('');
              setCreating(false);
              onCreate(p);
            }}
          >
            Let's go!
          </button>
        </main>
      </>
    );
  }

  return (
    <>
      <TopBar title="Harmony Hollow" />
      <main className="screen">
        <Tempo />
        <p className="muted">Who's playing today?</p>
        {profiles.map((p) => (
          <div key={p.id} style={{ display: 'flex', gap: 8, width: '100%' }}>
            <button className="profile-card" onClick={() => onPick(p)}>
              <span className="profile-card__emoji">{TIER_INFO[p.tier].emoji}</span>
              <span>
                <span className="profile-card__name">{p.name}</span>
                <br />
                <span className="profile-card__meta">
                  {TIER_INFO[p.tier].label}
                  {p.streak.days > 1 ? ` · ${p.streak.days}-day streak` : ''}
                </span>
              </span>
              <span className="profile-card__stars">⭐ {p.starsTotal}</span>
            </button>
            <button
              className="topbar__btn"
              aria-label={`Delete ${p.name}'s profile`}
              onClick={() => {
                // Parent-facing action; a native confirm is fine here and
                // avoids building a modal for Phase 1.
                if (window.confirm(`Delete ${p.name}'s profile and all progress?`)) {
                  onDelete(p);
                }
              }}
            >
              ✕
            </button>
          </div>
        ))}
        <button className="big-btn big-btn--quiet" onClick={() => setCreating(true)}>
          ＋ New player
        </button>
      </main>
    </>
  );
}
