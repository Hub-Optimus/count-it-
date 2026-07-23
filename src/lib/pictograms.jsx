// Pose pictograms for the ~25 movement patterns covering most gym exercises.
// Simple chalk-line silhouettes, sized to read clearly at small icon size —
// verified by rendering and visually checking each one before shipping.
// Equipment/name text is always shown alongside; the icon is a category cue,
// not the sole identifier (same principle real pictogram-style apps use).

function PCalf(props) {
  return <svg viewBox="0 0 40 40" {...props}><g fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="20" cy="11" r="2.6" fill="currentColor"/><line x1="20" y1="13.5" x2="20" y2="27"/><line x1="18" y1="18" x2="14" y2="23"/><line x1="22" y1="18" x2="26" y2="23"/><line x1="20" y1="27" x2="19" y2="33"/><path d="M19 33 L 23 33 L 21 36 Z" fill="currentColor" stroke="none"/></g></svg>
}

function PCardio(props) {
  return <svg viewBox="0 0 40 40" {...props}><g fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="13" cy="9" r="2.6" fill="currentColor"/><line x1="13" y1="11.5" x2="20" y2="23"/><line x1="16" y1="15" x2="9" y2="12"/><line x1="16" y1="15" x2="22" y2="19"/><line x1="20" y1="23" x2="27" y2="20"/><line x1="20" y1="23" x2="16" y2="33"/><line x1="16" y1="33" x2="22" y2="36"/></g></svg>
}

function PCrunch(props) {
  return <svg viewBox="0 0 40 40" {...props}><line x1="4" y1="31" x2="34" y2="31" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.25"/><g fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="13" cy="22" r="2.6" fill="currentColor"/><path d="M13 24.5 Q 20 26 24 29"/><line x1="24" y1="29" x2="24" y2="21"/><line x1="24" y1="21" x2="31" y2="21"/><line x1="13" y1="23" x2="9" y2="19"/></g></svg>
}

function PCurl(props) {
  return <svg viewBox="0 0 40 40" {...props}><g fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="20" cy="11" r="2.6" fill="currentColor"/><line x1="20" y1="13.5" x2="20" y2="27"/><line x1="20" y1="17" x2="24" y2="22"/><line x1="24" y1="22" x2="21" y2="14"/><line x1="20" y1="27" x2="16" y2="36"/><line x1="20" y1="27" x2="24" y2="36"/></g></svg>
}

function PFly(props) {
  return <svg viewBox="0 0 40 40" {...props}><rect x="6" y="28.5" width="22" height="2.5" rx="1" fill="currentColor" opacity="0.35"/><g fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="10" cy="24" r="2.6" fill="currentColor"/><line x1="10" y1="26.5" x2="24" y2="26.5"/><path d="M16 26 C 12 20, 8 18, 6 15"/><path d="M16 26 C 20 20, 24 18, 26 15"/><line x1="9" y1="26" x2="12" y2="30"/><line x1="12" y1="30" x2="16" y2="30"/></g></svg>
}

function PFrontRaise(props) {
  return <svg viewBox="0 0 40 40" {...props}><g fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="13" cy="11" r="2.6" fill="currentColor"/><line x1="13" y1="13.5" x2="13" y2="27"/><line x1="13" y1="16" x2="27" y2="13"/><line x1="13" y1="27" x2="9" y2="36"/><line x1="13" y1="27" x2="17" y2="36"/></g></svg>
}

function PHinge(props) {
  return <svg viewBox="0 0 40 40" {...props}><line x1="8" y1="30" x2="16" y2="30" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"/><g fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="13" r="2.6" fill="currentColor"/><line x1="11" y1="15.5" x2="23" y2="29"/><line x1="16" y1="20" x2="12" y2="30"/><line x1="23" y1="29" x2="21" y2="37"/><line x1="23" y1="29" x2="27" y2="37"/></g></svg>
}

function PLateralRaise(props) {
  return <svg viewBox="0 0 40 40" {...props}><g fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="20" cy="11" r="2.6" fill="currentColor"/><line x1="20" y1="13.5" x2="20" y2="27"/><line x1="20" y1="16" x2="8" y2="15"/><line x1="20" y1="16" x2="32" y2="15"/><line x1="20" y1="27" x2="16" y2="36"/><line x1="20" y1="27" x2="24" y2="36"/></g></svg>
}

function PLegCurl(props) {
  return <svg viewBox="0 0 40 40" {...props}><rect x="4" y="28.5" width="20" height="2.5" rx="1" fill="currentColor" opacity="0.35"/><g fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="24" r="2.6" fill="currentColor"/><line x1="9" y1="26.5" x2="22" y2="26.5"/><line x1="22" y1="26.5" x2="22" y2="18"/><path d="M22 18 Q 18 14 14 17"/><line x1="9" y1="26" x2="12" y2="30"/></g></svg>
}

function PLegExt(props) {
  return <svg viewBox="0 0 40 40" {...props}><g fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="13" r="2.6" fill="currentColor"/><line x1="12" y1="15.5" x2="12" y2="26"/><line x1="12" y1="26" x2="18" y2="26"/><line x1="18" y1="26" x2="29" y2="21"/><line x1="10" y1="18" x2="6" y2="24"/></g></svg>
}

function PLegPress(props) {
  return <svg viewBox="0 0 40 40" {...props}><line x1="29" y1="8" x2="29" y2="22" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" opacity="0.5"/><g fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="22" r="2.6" fill="currentColor"/><line x1="9" y1="24.5" x2="20" y2="26"/><line x1="20" y1="26" x2="20" y2="19"/><line x1="20" y1="19" x2="29" y2="14"/></g></svg>
}

function PLegRaise(props) {
  return <svg viewBox="0 0 40 40" {...props}><line x1="12" y1="6" x2="28" y2="6" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" opacity="0.6"/><g fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="20" cy="8" r="2.6" fill="currentColor"/><line x1="20" y1="10.5" x2="20" y2="22"/><line x1="20" y1="12" x2="14" y2="16"/><line x1="20" y1="12" x2="26" y2="16"/><line x1="20" y1="22" x2="26" y2="10"/></g></svg>
}

function PLunge(props) {
  return <svg viewBox="0 0 40 40" {...props}><g fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="17" cy="10" r="2.6" fill="currentColor"/><line x1="17" y1="12.5" x2="18" y2="24"/><line x1="18" y1="24" x2="11" y2="27"/><line x1="11" y1="27" x2="11" y2="36"/><line x1="18" y1="24" x2="27" y2="30"/><line x1="27" y1="30" x2="30" y2="37"/></g></svg>
}

function POverheadPress(props) {
  return <svg viewBox="0 0 40 40" {...props}><g fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="20" cy="11" r="2.6" fill="currentColor"/><line x1="20" y1="13.5" x2="20" y2="27"/><line x1="20" y1="16" x2="14" y2="6"/><line x1="20" y1="16" x2="26" y2="6"/><line x1="20" y1="27" x2="16" y2="36"/><line x1="20" y1="27" x2="24" y2="36"/></g></svg>
}

function PPlank(props) {
  return <svg viewBox="0 0 40 40" {...props}><g fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="26" r="2.6" fill="currentColor"/><line x1="8" y1="28" x2="30" y2="22"/><line x1="11" y1="28.5" x2="11" y2="33"/><line x1="30" y1="22" x2="34" y2="30"/></g></svg>
}

function PPress(props) {
  return <svg viewBox="0 0 40 40" {...props}><rect x="6" y="28.5" width="22" height="2.5" rx="1" fill="currentColor" opacity="0.35"/><line x1="10" y1="16" x2="22" y2="16" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"/><g fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="10" cy="24" r="2.6" fill="currentColor"/><line x1="10" y1="26.5" x2="24" y2="26.5"/><line x1="16" y1="26" x2="16" y2="16"/><line x1="9" y1="26" x2="12" y2="30"/><line x1="12" y1="30" x2="16" y2="30"/></g></svg>
}

function PPullDown(props) {
  return <svg viewBox="0 0 40 40" {...props}><line x1="10" y1="9" x2="30" y2="9" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" opacity="0.6"/><g fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="20" cy="13" r="2.6" fill="currentColor"/><line x1="20" y1="15.5" x2="20" y2="28"/><line x1="20" y1="18" x2="13" y2="10"/><line x1="20" y1="18" x2="27" y2="10"/><line x1="20" y1="28" x2="16" y2="36"/><line x1="20" y1="28" x2="24" y2="36"/></g></svg>
}

function PPushUp(props) {
  return <svg viewBox="0 0 40 40" {...props}><g fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="27" r="2.6" fill="currentColor"/><line x1="8" y1="29" x2="30" y2="24"/><line x1="12" y1="29.5" x2="12" y2="34"/><line x1="30" y1="24" x2="34" y2="33"/></g></svg>
}

function PPushdown(props) {
  return <svg viewBox="0 0 40 40" {...props}><line x1="21" y1="19" x2="21" y2="9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" opacity="0.4"/><g fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="16" cy="11" r="2.6" fill="currentColor"/><line x1="16" y1="13.5" x2="16" y2="27"/><line x1="16" y1="16" x2="21" y2="19"/><line x1="21" y1="19" x2="20" y2="27"/><line x1="16" y1="27" x2="12" y2="36"/><line x1="16" y1="27" x2="20" y2="36"/></g></svg>
}

function PRearDelt(props) {
  return <svg viewBox="0 0 40 40" {...props}><g fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="13" cy="13" r="2.6" fill="currentColor"/><line x1="13" y1="15.5" x2="19" y2="27"/><line x1="15" y1="19" x2="27" y2="14"/><line x1="15" y1="19" x2="27" y2="24"/><line x1="19" y1="27" x2="15" y2="36"/><line x1="19" y1="27" x2="23" y2="36"/></g></svg>
}

function PRow(props) {
  return <svg viewBox="0 0 40 40" {...props}><line x1="8" y1="24" x2="8" y2="30" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" opacity="0.6"/><g fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="10" cy="14" r="2.6" fill="currentColor"/><line x1="10" y1="16.5" x2="24" y2="30"/><line x1="14" y1="20" x2="8" y2="24"/><line x1="24" y1="30" x2="20" y2="37"/><line x1="24" y1="30" x2="28" y2="37"/></g></svg>
}

function PShrug(props) {
  return <svg viewBox="0 0 40 40" {...props}><g fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="20" cy="12" r="2.6" fill="currentColor"/><line x1="20" y1="15" x2="20" y2="27"/><line x1="20" y1="17" x2="15" y2="26"/><line x1="20" y1="17" x2="25" y2="26"/><line x1="20" y1="27" x2="16" y2="36"/><line x1="20" y1="27" x2="24" y2="36"/><path d="M16 15.5 Q 20 12.5 24 15.5" opacity="0.5"/></g></svg>
}

function PSquat(props) {
  return <svg viewBox="0 0 40 40" {...props}><g fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="20" cy="10" r="2.6" fill="currentColor"/><line x1="20" y1="12.5" x2="20" y2="22"/><line x1="14" y1="14" x2="26" y2="14"/><line x1="20" y1="22" x2="14" y2="27"/><line x1="14" y1="27" x2="15" y2="36"/><line x1="20" y1="22" x2="26" y2="27"/><line x1="26" y1="27" x2="25" y2="36"/></g></svg>
}

function PTricepExt(props) {
  return <svg viewBox="0 0 40 40" {...props}><g fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="11" r="2.6" fill="currentColor"/><line x1="18" y1="13.5" x2="18" y2="27"/><line x1="18" y1="15" x2="26" y2="10"/><line x1="26" y1="10" x2="24" y2="18"/><line x1="18" y1="27" x2="14" y2="36"/><line x1="18" y1="27" x2="22" y2="36"/></g></svg>
}

function PTwist(props) {
  return <svg viewBox="0 0 40 40" {...props}><g fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="20" cy="11" r="2.6" fill="currentColor"/><line x1="20" y1="13.5" x2="20" y2="27"/><path d="M20 17 Q 26 19 28 24"/><line x1="20" y1="27" x2="16" y2="36"/><line x1="20" y1="27" x2="24" y2="36"/></g></svg>
}

function PUprightRow(props) {
  return <svg viewBox="0 0 40 40" {...props}><line x1="14" y1="20" x2="26" y2="20" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" opacity="0.6"/><g fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="20" cy="11" r="2.6" fill="currentColor"/><line x1="20" y1="13.5" x2="20" y2="27"/><line x1="20" y1="15" x2="15" y2="20"/><line x1="20" y1="15" x2="25" y2="20"/><line x1="20" y1="27" x2="16" y2="36"/><line x1="20" y1="27" x2="24" y2="36"/></g></svg>
}

export const PICTOGRAMS = {
  Calf: PCalf,
  Cardio: PCardio,
  Crunch: PCrunch,
  Curl: PCurl,
  Fly: PFly,
  FrontRaise: PFrontRaise,
  Hinge: PHinge,
  LateralRaise: PLateralRaise,
  LegCurl: PLegCurl,
  LegExt: PLegExt,
  LegPress: PLegPress,
  LegRaise: PLegRaise,
  Lunge: PLunge,
  OverheadPress: POverheadPress,
  Plank: PPlank,
  Press: PPress,
  PullDown: PPullDown,
  PushUp: PPushUp,
  Pushdown: PPushdown,
  RearDelt: PRearDelt,
  Row: PRow,
  Shrug: PShrug,
  Squat: PSquat,
  TricepExt: PTricepExt,
  Twist: PTwist,
  UprightRow: PUprightRow,
}

export const PICTOGRAM_CATEGORIES = Object.keys(PICTOGRAMS)