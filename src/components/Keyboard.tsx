/*
 * Keyboard — the on-screen piano, plain divs (no SVG needed).
 *
 * Layout: white keys are a flex row; black keys are absolutely positioned at
 * the boundaries between the right white keys. One octave (7 white keys)
 * keeps every key ≥ ~53px wide even on an iPhone in portrait — close to the
 * 60px target rule, and huge on the iPad where the kids actually play.
 */
import { NOTE_INFO } from './keyboardLayout';

export interface KeyFlash {
  midi: number;
  kind: 'good' | 'bad';
}

export function Keyboard({
  lowMidi,
  highMidi,
  markedMidi,
  glowMidi,
  flash,
  labels,
  onKey,
}: {
  lowMidi: number;
  highMidi: number;
  /** Key decorated with a ⭐ (used by higher/lower questions). */
  markedMidi?: number;
  /** Key gently glowing to reveal the answer after repeated misses. */
  glowMidi?: number;
  flash: KeyFlash | null;
  /** Optional text labels on white keys (hint mode). */
  labels?: Record<number, string>;
  onKey: (midi: number) => void;
}) {
  const whites: number[] = [];
  // Black keys, each remembered with how many white keys sit to its left —
  // that's all we need to position it at the boundary.
  const blacks: { midi: number; whitesBefore: number }[] = [];
  for (let midi = lowMidi; midi <= highMidi; midi++) {
    if (NOTE_INFO[midi % 12].black) blacks.push({ midi, whitesBefore: whites.length });
    else whites.push(midi);
  }
  const whiteW = 100 / whites.length;

  function cls(midi: number, base: string): string {
    let c = base;
    if (flash?.midi === midi) c += ` kb__key--${flash.kind}`;
    if (glowMidi === midi) c += ' kb__key--glow';
    return c;
  }

  return (
    <div className="kb">
      {whites.map((midi) => (
        <button
          key={midi}
          className={cls(midi, 'kb__white')}
          aria-label={`${NOTE_INFO[midi % 12].name} key`}
          onPointerDown={() => onKey(midi)}
        >
          {markedMidi === midi && <span className="kb__star">⭐</span>}
          {labels?.[midi] && <span className="kb__label">{labels[midi]}</span>}
        </button>
      ))}
      {blacks.map(({ midi, whitesBefore }) => (
        <button
          key={midi}
          className={cls(midi, 'kb__black')}
          aria-label={`${NOTE_INFO[midi % 12].name} key (black)`}
          style={{ left: `calc(${whitesBefore * whiteW}% - ${whiteW * 0.31}%)` }}
          onPointerDown={() => onKey(midi)}
        >
          {markedMidi === midi && <span className="kb__star">⭐</span>}
        </button>
      ))}
    </div>
  );
}
