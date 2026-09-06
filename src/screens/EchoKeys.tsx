/*
 * EchoKeys — the first mic game: Tempo plays a short pattern (shown and
 * sounded on the on-screen keys), the child plays it back on the REAL piano,
 * and the microphone confirms each note.
 *
 * The screen starts with an explicit "turn on the mic" tap — that single
 * gesture satisfies both iOS rules at once (mic permission + audio unlock).
 * If the mic fails, the child is never stranded: a friendly screen offers the
 * tap games instead.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { ensureAudio, playNote } from '../audio';
import { narrate, stopNarration } from '../speech';
import { Keyboard } from '../components/Keyboard';
import { TopBar } from '../components/TopBar';
import { Tempo } from '../components/Tempo';
import { makeEchoRound } from '../content/echoKeys';
import { getMicSettings } from '../db';
import type { InputSource, NoteEvent } from '../input/InputSource';
import { createMicSource } from '../mic/MicPitchInputSource';
import { useRound } from '../game/useRound';
import type { Profile } from '../types';

type MicState = 'off' | 'starting' | 'on' | 'failed';

export function EchoKeys({
  profile,
  onFinish,
  onExit,
  onCalibrate,
}: {
  profile: Profile;
  /** Echo Keys stars bank into Stage 4 (its patterns ARE Middle C position). */
  onFinish: (stageId: number, stars: number) => void;
  onExit: () => void;
  onCalibrate: () => void;
}) {
  const count = profile.tier === 'junior' ? 4 : 6;
  const round = useMemo(() => makeEchoRound(profile.tier, count), [profile.tier, count]);
  const r = useRound(round.length, (stars) => onFinish(4, stars));

  const [mic, setMic] = useState<MicState>('off');
  const [calibrated, setCalibrated] = useState(true);
  const [hint, setHint] = useState<string | null>(null);
  // Which notes of the current pattern have been matched so far.
  const [matched, setMatched] = useState(0);
  const [flashMidi, setFlashMidi] = useState<{ midi: number; kind: 'good' | 'bad' } | null>(null);
  const sourceRef = useRef<InputSource | null>(null);
  // Refs mirror state the mic callback needs synchronously.
  const matchedRef = useRef(0);
  const qIndexRef = useRef(0);
  const listeningRef = useRef(false);

  const challenge = round[r.qIndex];
  qIndexRef.current = r.qIndex;

  useEffect(() => () => sourceRef.current?.stop(), []);
  useEffect(() => stopNarration, []);

  async function startMic() {
    setMic('starting');
    try {
      const settings = await getMicSettings();
      setCalibrated(settings.calibrated);
      const source = createMicSource({
        gateThreshold: settings.gateThreshold,
        tuningOffsetCents: settings.tuningOffsetCents,
      });
      sourceRef.current = source;
      await source.start(handleNote);
      ensureAudio(); // same gesture unlocks playback for the pattern demo
      setMic('on');
      playPattern(round[qIndexRef.current].midis);
    } catch {
      setMic('failed');
    }
  }

  /** Tempo demonstrates the pattern: scheduled tones + key flashes. */
  function playPattern(midis: number[]) {
    listeningRef.current = false;
    matchedRef.current = 0;
    setMatched(0);
    setHint(null);
    midis.forEach((m, i) => {
      playNote(m, { when: 0.45 * i, dur: 0.42 });
      setTimeout(() => setFlashMidi({ midi: m, kind: 'good' }), 450 * i);
      setTimeout(() => setFlashMidi(null), 450 * i + 380);
    });
    // Only start accepting piano notes after the demo finishes — otherwise
    // the device's own speaker can answer the question!
    setTimeout(() => {
      listeningRef.current = true;
      if (profile.tier === 'junior') narrate('Your turn! Play it on the piano.');
    }, 450 * midis.length + 250);
  }

  function handleNote(event: NoteEvent) {
    if (!listeningRef.current) return;
    const pattern = round[qIndexRef.current].midis;
    const expected = pattern[matchedRef.current];
    if (event.midi % 12 === expected % 12) {
      setFlashMidi({ midi: expected, kind: 'good' });
      setTimeout(() => setFlashMidi(null), 350);
      matchedRef.current++;
      setMatched(matchedRef.current);
      if (matchedRef.current >= pattern.length) {
        listeningRef.current = false;
        r.answer(true, r.qIndex);
        // The next pattern demos itself after the celebration window.
        setTimeout(() => {
          if (qIndexRef.current + 1 < round.length) playPattern(round[qIndexRef.current].midis);
        }, 1100);
      }
    } else {
      // Wrong note: no punishment — replay the pattern and start over.
      listeningRef.current = false;
      r.answer(false, r.qIndex);
      setHint('Almost! Listen once more…');
      setTimeout(() => playPattern(round[qIndexRef.current].midis), 900);
    }
  }

  if (r.done) {
    return (
      <>
        <TopBar title="🌳 Echo Keys" />
        <main className="screen">
          <div className="bounce-in" style={{ textAlign: 'center' }}>
            <Tempo size={130} />
            <p className="praise">Round complete!</p>
            <p className="star-count">⭐ ×{r.stars}</p>
          </div>
          <button className="big-btn" onClick={onExit}>
            Back to the map
          </button>
        </main>
      </>
    );
  }

  if (mic !== 'on') {
    return (
      <>
        <TopBar title="🌳 Echo Keys" onBack={onExit} />
        <main className="screen">
          <Tempo size={110} />
          {mic === 'failed' ? (
            <>
              <p className="prompt-text">The microphone didn't start 😕</p>
              <p className="muted">
                No microphone? No problem — the tap games in Town Square and
                the Music Shop work great without one.
              </p>
              <button className="big-btn" onClick={() => void startMic()}>
                Try the mic again
              </button>
              <button className="big-btn big-btn--quiet" onClick={onExit}>
                Back to the map
              </button>
            </>
          ) : (
            <>
              <p className="muted">
                Tempo plays a little tune — you play it back on the REAL piano!
              </p>
              <button className="big-btn" disabled={mic === 'starting'} onClick={() => void startMic()}>
                {mic === 'starting' ? 'Turning on the mic…' : '🎤 Turn on the mic'}
              </button>
            </>
          )}
        </main>
      </>
    );
  }

  return (
    <>
      <TopBar title="🌳 Echo Keys" onBack={onExit} />
      <main className="screen">
        <div className="dots" aria-label={`Pattern ${r.qIndex + 1} of ${round.length}`}>
          {round.map((_, i) => (
            <span key={i} className={'dot' + (i < r.qIndex ? ' dot--done' : i === r.qIndex ? ' dot--now' : '')} />
          ))}
        </div>

        {!calibrated && (
          <button className="big-btn big-btn--quiet" onClick={onCalibrate}>
            🎹 Tune up first (recommended)
          </button>
        )}

        <div className="prompt-card card">
          <span className="prompt-text">
            {listeningRef.current ? 'Your turn — play it!' : '👂 Listen…'}
          </span>
          <button
            className="topbar__btn"
            aria-label="Play the pattern again"
            onClick={() => playPattern(challenge.midis)}
          >
            🔁
          </button>
        </div>

        {/* One pip per note in the pattern — fills in as the child matches. */}
        <div className="dots" aria-label={`${matched} of ${challenge.midis.length} notes played`}>
          {challenge.midis.map((_, i) => (
            <span key={i} className={'dot' + (i < matched ? ' dot--done' : ' dot--now')} style={{ width: 22, height: 22, borderRadius: 11 }} />
          ))}
        </div>

        <p className={'feedback' + (r.praise ? ' feedback--praise' : '')} aria-live="polite">
          {r.praise ?? hint ?? ' '}
        </p>

        {/* Read-only keyboard: shows the pattern, doesn't take taps. */}
        <div style={{ pointerEvents: 'none', width: '100%' }}>
          <Keyboard lowMidi={60} highMidi={67} labels={{ 60: 'C' }} flash={flashMidi} onKey={() => {}} />
        </div>
        <p className="muted">⭐ {r.stars} this round · 🎤 listening for the real piano</p>
      </main>
    </>
  );
}
