/*
 * App — the navigation shell. Deliberately no router library: three screens
 * switched by plain state keeps the whole navigation story readable in one
 * file, and a home-screen PWA has no URL bar for deep links anyway.
 */
import { useEffect, useState } from 'react';
import { deleteProfile, getAllProfiles, requestPersistentStorage, saveProfile } from './db';
import type { Profile } from './types';
import { ProfileSelect } from './screens/ProfileSelect';
import { Home } from './screens/Home';
import { Settings } from './screens/Settings';
import { TownSquare } from './screens/TownSquare';
import { KeyDetective } from './screens/KeyDetective';

type Screen = 'profiles' | 'home' | 'settings' | 'town' | 'game';

/** Today as YYYY-MM-DD in local time (streaks are "days", not 24h windows). */
function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Gentle streak rule: playing on consecutive days extends it, a gap quietly
 * resets to 1 — no guilt messaging anywhere, the number just changes.
 */
function withTodayPlayed(p: Profile): Profile {
  const today = todayStr();
  if (p.streak.lastPlayedDay === today) return p;
  const yesterday = new Date(Date.now() - 86_400_000);
  const yStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
  return {
    ...p,
    streak: {
      lastPlayedDay: today,
      days: p.streak.lastPlayedDay === yStr ? p.streak.days + 1 : 1,
    },
  };
}

export function App() {
  const [screen, setScreen] = useState<Screen>('profiles');
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [current, setCurrent] = useState<Profile | null>(null);
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const [gameStage, setGameStage] = useState<number>(1);

  // First run: load profiles and ask the browser to protect our storage.
  useEffect(() => {
    void (async () => {
      setProfiles(await getAllProfiles());
      setPersisted(await requestPersistentStorage());
    })();
  }, []);

  async function refreshProfiles() {
    setProfiles(await getAllProfiles());
  }

  async function pickProfile(p: Profile) {
    const updated = withTodayPlayed(p);
    if (updated !== p) {
      await saveProfile(updated);
      await refreshProfiles();
    }
    setCurrent(updated);
    setScreen('home');
  }

  /**
   * Adds a round's stars to the current profile and persists it. A stage
   * counts as "completed" once it has collected 12+ stars across sessions —
   * a low bar on purpose; mastery pacing can tighten later.
   */
  async function awardStars(stageId: number, stars: number) {
    if (!current) return;
    const prev = current.stageProgress[stageId] ?? { stars: 0, completed: false };
    const nextStage = { stars: prev.stars + stars, completed: prev.completed || prev.stars + stars >= 12 };
    const updated: Profile = {
      ...current,
      stageProgress: { ...current.stageProgress, [stageId]: nextStage },
      starsTotal: current.starsTotal + stars,
    };
    await saveProfile(updated);
    setCurrent(updated);
    await refreshProfiles();
  }

  if (screen === 'game' && current) {
    return (
      <KeyDetective
        // key forces a fresh round when the stage changes mid-session
        key={gameStage}
        profile={current}
        stageId={gameStage}
        onFinish={(stageId, stars) => void awardStars(stageId, stars)}
        onExit={() => setScreen('town')}
      />
    );
  }

  if (screen === 'town' && current) {
    return (
      <TownSquare
        profile={current}
        onPlay={(stageId) => {
          setGameStage(stageId);
          setScreen('game');
        }}
        onBack={() => setScreen('home')}
      />
    );
  }

  if (screen === 'settings') {
    return (
      <Settings
        persisted={persisted}
        onBack={() => setScreen(current ? 'home' : 'profiles')}
        onDataImported={() => void refreshProfiles()}
      />
    );
  }

  if (screen === 'home' && current) {
    return (
      <Home
        profile={current}
        onOpenTown={() => setScreen('town')}
        onSwitchProfile={() => {
          setCurrent(null);
          setScreen('profiles');
        }}
        onSettings={() => setScreen('settings')}
      />
    );
  }

  return (
    <ProfileSelect
      profiles={profiles}
      onPick={(p) => void pickProfile(p)}
      onCreate={(p) => {
        void saveProfile(p).then(refreshProfiles).then(() => pickProfile(p));
      }}
      onDelete={(p) => {
        void deleteProfile(p.id).then(refreshProfiles);
      }}
    />
  );
}
