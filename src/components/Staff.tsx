/*
 * Staff — hand-rolled SVG music notation. Deliberately NOT a notation
 * library: our needs are single notes on five lines with at most one ledger
 * line, and VexFlow would add ~300KB to the offline bundle for that.
 *
 * Geometry primer (worth reading once):
 *  - Vertical position is DIATONIC: each letter name (C, D, E …) moves one
 *    half-gap (6px) up. That's how real notation works — an octave is 7
 *    steps, not 12, because the staff only shows letter names; accidentals
 *    are symbols, not positions.
 *  - Each staff has a reference: the bottom line is E4 on treble, G2 on bass.
 *    A note's y = bottomLineY − (diatonicIndex − refIndex) × 6.
 *  - Middle C sits one ledger line BELOW the treble staff and one ABOVE the
 *    bass staff — the same note, approached from both sides, which is exactly
 *    the landmark story Stages 6–9 teach.
 *
 * The G line (treble) and F line (bass) get a soft accent tint — those are
 * the landmark lines the clefs point at and the hints talk about.
 */

export type Duration = 'quarter' | 'half' | 'dottedHalf' | 'whole';
export type Clef = 'treble' | 'bass';

const GAP = 12; // px between staff lines
const LINE_X0 = 46;
const LINE_X1 = 330;

/** Diatonic index: C0=0, D0=1 … one step per letter name. Black keys snap down. */
function diatonic(midi: number): number {
  const LETTER_OF_PC = [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6]; // C C# D D# E F F# G G# A A# B
  const octave = Math.floor(midi / 12) - 1;
  return octave * 7 + LETTER_OF_PC[midi % 12];
}

const REF: Record<Clef, number> = {
  treble: diatonic(64), // E4 on the bottom line
  bass: diatonic(43),   // G2 on the bottom line
};

/** One note head (+stem/dot per duration) at the given x, on one staff. */
function Note({
  midi,
  x,
  clef,
  bottomY,
  duration = 'quarter',
}: {
  midi: number;
  x: number;
  clef: Clef;
  bottomY: number;
  duration?: Duration;
}) {
  const offset = diatonic(midi) - REF[clef]; // half-gaps above the bottom line
  const y = bottomY - offset * (GAP / 2);
  const hollow = duration !== 'quarter';
  const stem = duration !== 'whole';
  const stemUp = offset <= 4; // below the middle line → stem points up

  // Ledger lines for notes off the staff (we only ever need one each way).
  const ledgers: number[] = [];
  for (let o = -2; o >= offset; o -= 2) ledgers.push(bottomY - o * (GAP / 2));
  for (let o = 10; o <= offset; o += 2) ledgers.push(bottomY - o * (GAP / 2));

  return (
    <g>
      {ledgers.map((ly) => (
        <line key={ly} x1={x - 14} x2={x + 14} y1={ly} y2={ly} stroke="var(--ink)" strokeWidth="1.6" />
      ))}
      <ellipse
        cx={x}
        cy={y}
        rx={7.4}
        ry={5.6}
        transform={`rotate(-18 ${x} ${y})`}
        fill={hollow ? 'none' : 'var(--ink)'}
        stroke="var(--ink)"
        strokeWidth="2"
      />
      {stem &&
        (stemUp ? (
          <line x1={x + 6.6} x2={x + 6.6} y1={y - 2} y2={y - 40} stroke="var(--ink)" strokeWidth="2" />
        ) : (
          <line x1={x - 6.6} x2={x - 6.6} y1={y + 2} y2={y + 40} stroke="var(--ink)" strokeWidth="2" />
        ))}
      {duration === 'dottedHalf' && <circle cx={x + 14} cy={y} r={2.6} fill="var(--ink)" />}
    </g>
  );
}

/** Five lines + clef, at a vertical offset inside the parent SVG. */
function StaffLines({ clef, topY }: { clef: Clef; topY: number }) {
  const bottomY = topY + 4 * GAP;
  // The landmark line each clef "points at": G line (treble), F line (bass).
  const landmarkOffset = clef === 'treble' ? 2 : 6;
  const landmarkY = bottomY - landmarkOffset * (GAP / 2);
  return (
    <g>
      {[0, 1, 2, 3, 4].map((i) => {
        const y = topY + i * GAP;
        const isLandmark = y === landmarkY;
        return (
          <line
            key={i}
            x1={LINE_X0}
            x2={LINE_X1}
            y1={y}
            y2={y}
            stroke={isLandmark ? 'var(--accent)' : 'var(--ink)'}
            strokeWidth={isLandmark ? 2.4 : 1.6}
            opacity={isLandmark ? 0.75 : 1}
          />
        );
      })}
      <text
        x={8}
        y={clef === 'treble' ? bottomY + 14 : bottomY - 6}
        fontSize={clef === 'treble' ? 64 : 46}
        fill="var(--ink)"
      >
        {clef === 'treble' ? '\u{1D11E}' : '\u{1D122}'}
      </text>
    </g>
  );
}

/** A single-clef staff with 1–2 notes on it. */
export function SingleStaff({
  clef,
  midis,
  duration,
}: {
  clef: Clef;
  midis: number[];
  duration?: Duration;
}) {
  const topY = 42;
  const bottomY = topY + 4 * GAP;
  const xs = midis.length === 1 ? [190] : [150, 250];
  return (
    <svg viewBox="0 0 340 150" className="staff-svg" role="img" aria-label={`${clef} staff`}>
      <StaffLines clef={clef} topY={topY} />
      {midis.map((m, i) => (
        <Note key={i} midi={m} x={xs[i]} clef={clef} bottomY={bottomY} duration={duration} />
      ))}
    </svg>
  );
}

/** Both staves braced together; each note lands on its natural staff. */
export function GrandStaff({ midis }: { midis: number[] }) {
  const trebleTop = 34;
  const bassTop = 118;
  const xs = midis.length === 1 ? [190] : [150, 250];
  return (
    <svg viewBox="0 0 340 216" className="staff-svg" role="img" aria-label="grand staff">
      <StaffLines clef="treble" topY={trebleTop} />
      <StaffLines clef="bass" topY={bassTop} />
      {/* Brace + connecting barline on the left edge. */}
      <line x1={LINE_X0} x2={LINE_X0} y1={trebleTop} y2={bassTop + 4 * GAP} stroke="var(--ink)" strokeWidth="2" />
      {midis.map((m, i) => {
        const clef: Clef = m >= 60 ? 'treble' : 'bass';
        const bottomY = (clef === 'treble' ? trebleTop : bassTop) + 4 * GAP;
        return <Note key={i} midi={m} x={xs[i]} clef={clef} bottomY={bottomY} />;
      })}
    </svg>
  );
}

/**
 * Pre-staff: floating note heads whose HEIGHT is the whole message (up, down,
 * same; step vs skip) — how beginner methods present reading before lines.
 * `steps` are diatonic offsets from an invisible middle reference.
 */
export function PreStaff({ steps, guideLabel }: { steps: number[]; guideLabel?: string }) {
  const midY = 70;
  const xs = steps.length === 2 ? [130, 220] : steps.map((_, i) => 90 + i * 80);
  return (
    <svg viewBox="0 0 340 140" className="staff-svg" role="img" aria-label="notes">
      {guideLabel !== undefined && (
        <g>
          <line x1={40} x2={310} y1={midY} y2={midY} stroke="var(--accent)" strokeWidth="2.4" opacity="0.75" />
          <text x={40} y={midY - 8} fontSize="14" fill="var(--ink-soft)">
            {guideLabel}
          </text>
        </g>
      )}
      {steps.map((s, i) => (
        <ellipse
          key={i}
          cx={xs[i]}
          cy={midY - s * (GAP / 2)}
          rx={10}
          ry={8}
          fill="var(--ink)"
        />
      ))}
    </svg>
  );
}

/** A lone note, big, for "how many beats?" questions. */
export function LoneNote({ duration }: { duration: Duration }) {
  return (
    <svg viewBox="0 0 340 130" className="staff-svg" role="img" aria-label="a note">
      <Note midi={71} x={170} clef="treble" bottomY={110} duration={duration} />
    </svg>
  );
}
