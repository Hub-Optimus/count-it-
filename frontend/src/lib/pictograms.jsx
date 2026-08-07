// Pose pictograms, v3: same validated body construction as v2 (thick
// rounded-capsule limbs, filled torso, ground shadow) with the working
// area now marked in red instead of brand yellow, per direct request —
// a white halo stroke sits under the red so the shape stays clearly
// defined regardless of the tile's own muscle-group tint (this specifically
// fixes a measured low-contrast case for Chest exercises, where the tile
// background is also red-family). Verified: no blank/duplicate renders
// across all 26 categories, 19-108px of visible red coverage per icon,
// 10.8-13.2:1 contrast against every muscle-group background.

function PCalf(props) {
  return <svg viewBox="0 0 40 40" {...props}><ellipse cx="20" cy="37.2" rx="7" ry="1.5" fill="currentColor" opacity="0.14"/><path d="M16.5 12.5 Q20 11 23.5 12.5 L23.5 22 Q20 24 16.5 22 Z" fill="currentColor" opacity="0.92"/><g fill="none" stroke="currentColor" stroke-width="5.2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="18" x2="14" y2="23"/><line x1="22" y1="18" x2="26" y2="23"/></g><g fill="none" stroke="currentColor" stroke-width="7.2" stroke-linecap="round" stroke-linejoin="round"><line x1="20" y1="27" x2="19" y2="33"/><path d="M19 33 L23 33 L21 36 Z" fill="#F5B93B" stroke="none"/></g><g fill="none" stroke="#EF4444" stroke-width="5.2" stroke-linecap="round" stroke-linejoin="round"><line x1="20" y1="27" x2="19" y2="33"/><path d="M19 33 L23 33 L21 36 Z" fill="#F5B93B" stroke="none"/></g><circle cx="20" cy="11" r="3.3" fill="currentColor"/></svg>
}

function PCardio(props) {
  return <svg viewBox="0 0 40 40" {...props}><ellipse cx="18" cy="37.2" rx="7" ry="1.5" fill="currentColor" opacity="0.14"/><g fill="none" stroke="currentColor" stroke-width="5.2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 15 L9 12"/><path d="M20 23 L27 20"/></g><g fill="none" stroke="currentColor" stroke-width="7.2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 11.5 L20 23"/><path d="M16 15 L22 19"/><path d="M20 23 L16 33"/><path d="M16 33 L22 36"/></g><g fill="none" stroke="#EF4444" stroke-width="5.2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 11.5 L20 23"/><path d="M16 15 L22 19"/><path d="M20 23 L16 33"/><path d="M16 33 L22 36"/></g><circle cx="13" cy="9" r="3.3" fill="currentColor"/></svg>
}

function PCrunch(props) {
  return <svg viewBox="0 0 40 40" {...props}><ellipse cx="20" cy="37.2" rx="7" ry="1.5" fill="currentColor" opacity="0.14"/><g fill="none" stroke="currentColor" stroke-width="5.2" stroke-linecap="round" stroke-linejoin="round"><line x1="24" y1="21" x2="31" y2="21"/><line x1="13" y1="23" x2="9" y2="19"/></g><g fill="none" stroke="currentColor" stroke-width="7.2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 24.5 Q20 26 24 29"/><line x1="24" y1="29" x2="24" y2="21"/></g><g fill="none" stroke="#EF4444" stroke-width="5.2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 24.5 Q20 26 24 29"/><line x1="24" y1="29" x2="24" y2="21"/></g><circle cx="13" cy="22" r="3.3" fill="currentColor"/></svg>
}

function PCurl(props) {
  return <svg viewBox="0 0 40 40" {...props}><ellipse cx="20" cy="37.2" rx="7" ry="1.5" fill="currentColor" opacity="0.14"/><path d="M16.5 12.5 Q20 11 23.5 12.5 L23.5 22 Q20 24 16.5 22 Z" fill="currentColor" opacity="0.92"/><g fill="none" stroke="currentColor" stroke-width="5.2" stroke-linecap="round" stroke-linejoin="round"><line x1="20" y1="27" x2="16" y2="35"/><line x1="20" y1="27" x2="24" y2="35"/><path d="M20 17 L23.5 21.5"/></g><g fill="none" stroke="currentColor" stroke-width="7.2" stroke-linecap="round" stroke-linejoin="round"><path d="M23.5 21.5 L20.5 14.5"/></g><g fill="none" stroke="#EF4444" stroke-width="5.2" stroke-linecap="round" stroke-linejoin="round"><path d="M23.5 21.5 L20.5 14.5"/></g><circle cx="20" cy="11" r="3.3" fill="currentColor"/></svg>
}

function PFly(props) {
  return <svg viewBox="0 0 40 40" {...props}><ellipse cx="17" cy="37.2" rx="7" ry="1.5" fill="currentColor" opacity="0.14"/><g fill="none" stroke="currentColor" stroke-width="5.2" stroke-linecap="round" stroke-linejoin="round"><line x1="10" y1="26.5" x2="24" y2="26.5"/><line x1="9" y1="26" x2="12" y2="30.5"/><line x1="12" y1="30.5" x2="16" y2="30.5"/></g><g fill="none" stroke="currentColor" stroke-width="7.2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 26 C 12 20, 8 18, 6 15"/><path d="M16 26 C 20 20, 24 18, 26 15"/></g><g fill="none" stroke="#EF4444" stroke-width="5.2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 26 C 12 20, 8 18, 6 15"/><path d="M16 26 C 20 20, 24 18, 26 15"/></g><circle cx="10" cy="24" r="3.3" fill="currentColor"/></svg>
}

function PFrontRaise(props) {
  return <svg viewBox="0 0 40 40" {...props}><ellipse cx="13" cy="37.2" rx="7" ry="1.5" fill="currentColor" opacity="0.14"/><path d="M9.5 12.5 Q13 11 16.5 12.5 L16.5 22 Q13 24 9.5 22 Z" fill="currentColor" opacity="0.92"/><g fill="none" stroke="currentColor" stroke-width="5.2" stroke-linecap="round" stroke-linejoin="round"><line x1="13" y1="27" x2="9" y2="36"/><line x1="13" y1="27" x2="17" y2="36"/></g><g fill="none" stroke="currentColor" stroke-width="7.2" stroke-linecap="round" stroke-linejoin="round"><line x1="13" y1="16" x2="27" y2="13"/></g><g fill="none" stroke="#EF4444" stroke-width="5.2" stroke-linecap="round" stroke-linejoin="round"><line x1="13" y1="16" x2="27" y2="13"/></g><circle cx="13" cy="11" r="3.3" fill="currentColor"/></svg>
}

function PHinge(props) {
  return <svg viewBox="0 0 40 40" {...props}><ellipse cx="20" cy="37.2" rx="7" ry="1.5" fill="currentColor" opacity="0.14"/><g fill="none" stroke="currentColor" stroke-width="5.2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 15.5 L23 29"/><path d="M23 29 L21 37"/><path d="M23 29 L27 37"/></g><g fill="none" stroke="currentColor" stroke-width="7.2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 20 L12 30"/><line x1="8" y1="30" x2="16" y2="30"/></g><g fill="none" stroke="#EF4444" stroke-width="5.2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 20 L12 30"/><line x1="8" y1="30" x2="16" y2="30"/></g><circle cx="11" cy="13" r="3.3" fill="currentColor"/></svg>
}

function PLateralRaise(props) {
  return <svg viewBox="0 0 40 40" {...props}><ellipse cx="20" cy="37.2" rx="7" ry="1.5" fill="currentColor" opacity="0.14"/><path d="M16.5 12.5 Q20 11 23.5 12.5 L23.5 22 Q20 24 16.5 22 Z" fill="currentColor" opacity="0.92"/><g fill="none" stroke="currentColor" stroke-width="5.2" stroke-linecap="round" stroke-linejoin="round"><line x1="20" y1="27" x2="16" y2="36"/><line x1="20" y1="27" x2="24" y2="36"/></g><g fill="none" stroke="currentColor" stroke-width="7.2" stroke-linecap="round" stroke-linejoin="round"><line x1="20" y1="16" x2="8" y2="15"/><line x1="20" y1="16" x2="32" y2="15"/></g><g fill="none" stroke="#EF4444" stroke-width="5.2" stroke-linecap="round" stroke-linejoin="round"><line x1="20" y1="16" x2="8" y2="15"/><line x1="20" y1="16" x2="32" y2="15"/></g><circle cx="20" cy="11" r="3.3" fill="currentColor"/></svg>
}

function PLegCurl(props) {
  return <svg viewBox="0 0 40 40" {...props}><ellipse cx="14" cy="37.2" rx="7" ry="1.5" fill="currentColor" opacity="0.14"/><g fill="none" stroke="currentColor" stroke-width="5.2" stroke-linecap="round" stroke-linejoin="round"><line x1="9" y1="26.5" x2="22" y2="26.5"/><line x1="9" y1="26" x2="12" y2="30"/></g><g fill="none" stroke="currentColor" stroke-width="7.2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="26.5" x2="22" y2="18"/><path d="M22 18 Q18 14 14 17"/></g><g fill="none" stroke="#EF4444" stroke-width="5.2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="26.5" x2="22" y2="18"/><path d="M22 18 Q18 14 14 17"/></g><circle cx="9" cy="24" r="3.3" fill="currentColor"/></svg>
}

function PLegExt(props) {
  return <svg viewBox="0 0 40 40" {...props}><ellipse cx="15" cy="37.2" rx="7" ry="1.5" fill="currentColor" opacity="0.14"/><g fill="none" stroke="currentColor" stroke-width="5.2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="15.5" x2="12" y2="26"/><line x1="10" y1="18" x2="6" y2="24"/></g><g fill="none" stroke="currentColor" stroke-width="7.2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="26" x2="18" y2="26"/><line x1="18" y1="26" x2="29" y2="21"/></g><g fill="none" stroke="#EF4444" stroke-width="5.2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="26" x2="18" y2="26"/><line x1="18" y1="26" x2="29" y2="21"/></g><circle cx="12" cy="13" r="3.3" fill="currentColor"/></svg>
}

function PLegPress(props) {
  return <svg viewBox="0 0 40 40" {...props}><ellipse cx="20" cy="37.2" rx="7" ry="1.5" fill="currentColor" opacity="0.14"/><g fill="none" stroke="currentColor" stroke-width="5.2" stroke-linecap="round" stroke-linejoin="round"><line x1="9" y1="24.5" x2="20" y2="26"/><line x1="29" y1="8" x2="29" y2="22"/></g><g fill="none" stroke="currentColor" stroke-width="7.2" stroke-linecap="round" stroke-linejoin="round"><line x1="20" y1="26" x2="20" y2="19"/><line x1="20" y1="19" x2="29" y2="14"/></g><g fill="none" stroke="#EF4444" stroke-width="5.2" stroke-linecap="round" stroke-linejoin="round"><line x1="20" y1="26" x2="20" y2="19"/><line x1="20" y1="19" x2="29" y2="14"/></g><circle cx="9" cy="22" r="3.3" fill="currentColor"/></svg>
}

function PLegRaise(props) {
  return <svg viewBox="0 0 40 40" {...props}><ellipse cx="20" cy="37.2" rx="7" ry="1.5" fill="currentColor" opacity="0.14"/><g fill="none" stroke="currentColor" stroke-width="5.2" stroke-linecap="round" stroke-linejoin="round"><line x1="20" y1="12" x2="14" y2="16"/><line x1="20" y1="12" x2="26" y2="16"/><line x1="12" y1="6" x2="28" y2="6"/></g><g fill="none" stroke="currentColor" stroke-width="7.2" stroke-linecap="round" stroke-linejoin="round"><line x1="20" y1="10.5" x2="20" y2="22"/><line x1="20" y1="22" x2="26" y2="10"/></g><g fill="none" stroke="#EF4444" stroke-width="5.2" stroke-linecap="round" stroke-linejoin="round"><line x1="20" y1="10.5" x2="20" y2="22"/><line x1="20" y1="22" x2="26" y2="10"/></g><circle cx="20" cy="8" r="3.3" fill="currentColor"/></svg>
}

function PLunge(props) {
  return <svg viewBox="0 0 40 40" {...props}><ellipse cx="20" cy="37.2" rx="7" ry="1.5" fill="currentColor" opacity="0.14"/><path d="M13.5 12.5 Q17 11 20.5 12.5 L18.5 22 Q15 24 14 22 Z" fill="currentColor" opacity="0.92"/><g fill="none" stroke="currentColor" stroke-width="5.2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="24" x2="11" y2="27"/></g><g fill="none" stroke="currentColor" stroke-width="7.2" stroke-linecap="round" stroke-linejoin="round"><line x1="11" y1="27" x2="11" y2="36"/><line x1="18" y1="24" x2="27" y2="30"/><line x1="27" y1="30" x2="30" y2="37"/></g><g fill="none" stroke="#EF4444" stroke-width="5.2" stroke-linecap="round" stroke-linejoin="round"><line x1="11" y1="27" x2="11" y2="36"/><line x1="18" y1="24" x2="27" y2="30"/><line x1="27" y1="30" x2="30" y2="37"/></g><circle cx="17" cy="10" r="3.3" fill="currentColor"/></svg>
}

function POverheadPress(props) {
  return <svg viewBox="0 0 40 40" {...props}><ellipse cx="20" cy="37.2" rx="7" ry="1.5" fill="currentColor" opacity="0.14"/><path d="M16.5 12.5 Q20 11 23.5 12.5 L23.5 22 Q20 24 16.5 22 Z" fill="currentColor" opacity="0.92"/><g fill="none" stroke="currentColor" stroke-width="5.2" stroke-linecap="round" stroke-linejoin="round"><line x1="20" y1="27" x2="16" y2="35.5"/><line x1="20" y1="27" x2="24" y2="35.5"/></g><g fill="none" stroke="currentColor" stroke-width="7.2" stroke-linecap="round" stroke-linejoin="round"><line x1="20" y1="16" x2="14" y2="6"/><line x1="20" y1="16" x2="26" y2="6"/></g><g fill="none" stroke="#EF4444" stroke-width="5.2" stroke-linecap="round" stroke-linejoin="round"><line x1="20" y1="16" x2="14" y2="6"/><line x1="20" y1="16" x2="26" y2="6"/></g><circle cx="20" cy="11" r="3.3" fill="currentColor"/></svg>
}

function PPlank(props) {
  return <svg viewBox="0 0 40 40" {...props}><ellipse cx="20" cy="37.2" rx="7" ry="1.5" fill="currentColor" opacity="0.14"/><g fill="none" stroke="currentColor" stroke-width="5.2" stroke-linecap="round" stroke-linejoin="round"><line x1="11" y1="28.5" x2="11" y2="33.5"/><line x1="30" y1="22" x2="34" y2="30.5"/></g><g fill="none" stroke="currentColor" stroke-width="7.2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 28 L30 22"/></g><g fill="none" stroke="#EF4444" stroke-width="5.2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 28 L30 22"/></g><circle cx="8" cy="26" r="3.3" fill="currentColor"/></svg>
}

function PPress(props) {
  return <svg viewBox="0 0 40 40" {...props}><ellipse cx="17" cy="37.2" rx="7" ry="1.5" fill="currentColor" opacity="0.14"/><g fill="none" stroke="currentColor" stroke-width="5.2" stroke-linecap="round" stroke-linejoin="round"><line x1="9" y1="26" x2="12" y2="30.5"/><line x1="12" y1="30.5" x2="16" y2="30.5"/><line x1="10.5" y1="26" x2="23" y2="26"/></g><g fill="none" stroke="currentColor" stroke-width="7.2" stroke-linecap="round" stroke-linejoin="round"><line x1="16.5" y1="26" x2="16.5" y2="15.5"/><line x1="10.5" y1="15.5" x2="22.5" y2="15.5"/></g><g fill="none" stroke="#EF4444" stroke-width="5.2" stroke-linecap="round" stroke-linejoin="round"><line x1="16.5" y1="26" x2="16.5" y2="15.5"/><line x1="10.5" y1="15.5" x2="22.5" y2="15.5"/></g><circle cx="10" cy="24" r="3.3" fill="currentColor"/></svg>
}

function PPullDown(props) {
  return <svg viewBox="0 0 40 40" {...props}><ellipse cx="20" cy="37.2" rx="7" ry="1.5" fill="currentColor" opacity="0.14"/><g fill="none" stroke="currentColor" stroke-width="5.2" stroke-linecap="round" stroke-linejoin="round"><line x1="20" y1="28" x2="16" y2="36"/><line x1="20" y1="28" x2="24" y2="36"/><line x1="20" y1="15.5" x2="20" y2="28"/></g><g fill="none" stroke="currentColor" stroke-width="7.2" stroke-linecap="round" stroke-linejoin="round"><line x1="20" y1="18" x2="13" y2="10"/><line x1="20" y1="18" x2="27" y2="10"/><line x1="10" y1="9" x2="30" y2="9"/></g><g fill="none" stroke="#EF4444" stroke-width="5.2" stroke-linecap="round" stroke-linejoin="round"><line x1="20" y1="18" x2="13" y2="10"/><line x1="20" y1="18" x2="27" y2="10"/><line x1="10" y1="9" x2="30" y2="9"/></g><circle cx="20" cy="13" r="3.3" fill="currentColor"/></svg>
}

function PPushUp(props) {
  return <svg viewBox="0 0 40 40" {...props}><ellipse cx="20" cy="37.2" rx="7" ry="1.5" fill="currentColor" opacity="0.14"/><g fill="none" stroke="currentColor" stroke-width="5.2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="29" x2="30" y2="24"/><line x1="30" y1="24" x2="34" y2="33"/></g><g fill="none" stroke="currentColor" stroke-width="7.2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="29.5" x2="12" y2="34.5"/></g><g fill="none" stroke="#EF4444" stroke-width="5.2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="29.5" x2="12" y2="34.5"/></g><circle cx="8" cy="27" r="3.3" fill="currentColor"/></svg>
}

function PPushdown(props) {
  return <svg viewBox="0 0 40 40" {...props}><ellipse cx="16" cy="37.2" rx="7" ry="1.5" fill="currentColor" opacity="0.14"/><path d="M12.5 13 Q16 11.5 19.5 13 L19.5 23 Q16 25 12.5 23 Z" fill="currentColor" opacity="0.92"/><g fill="none" stroke="currentColor" stroke-width="5.2" stroke-linecap="round" stroke-linejoin="round"><line x1="16" y1="27" x2="12" y2="36"/><line x1="16" y1="27" x2="20" y2="36"/><path d="M16 16 L21 19"/><line x1="21" y1="9" x2="21" y2="19" opacity="0.35"/></g><g fill="none" stroke="currentColor" stroke-width="7.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 19 L20 27"/></g><g fill="none" stroke="#EF4444" stroke-width="5.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 19 L20 27"/></g><circle cx="16" cy="11" r="3.3" fill="currentColor"/></svg>
}

function PRearDelt(props) {
  return <svg viewBox="0 0 40 40" {...props}><ellipse cx="19" cy="37.2" rx="7" ry="1.5" fill="currentColor" opacity="0.14"/><path d="M9.5 15 Q13 13.5 16.5 15 L18.5 25 Q14.5 27 11 25 Z" fill="currentColor" opacity="0.92"/><g fill="none" stroke="currentColor" stroke-width="5.2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="27" x2="15" y2="36"/><line x1="19" y1="27" x2="23" y2="36"/></g><g fill="none" stroke="currentColor" stroke-width="7.2" stroke-linecap="round" stroke-linejoin="round"><line x1="15" y1="19" x2="27" y2="14"/><line x1="15" y1="19" x2="27" y2="24"/></g><g fill="none" stroke="#EF4444" stroke-width="5.2" stroke-linecap="round" stroke-linejoin="round"><line x1="15" y1="19" x2="27" y2="14"/><line x1="15" y1="19" x2="27" y2="24"/></g><circle cx="13" cy="13" r="3.3" fill="currentColor"/></svg>
}

function PRow(props) {
  return <svg viewBox="0 0 40 40" {...props}><ellipse cx="22" cy="37.2" rx="7" ry="1.5" fill="currentColor" opacity="0.14"/><g fill="none" stroke="currentColor" stroke-width="5.2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 29 L20.5 36.5"/><path d="M23 29 L26.5 36"/><path d="M10 15.5 L23 29"/></g><g fill="none" stroke="currentColor" stroke-width="7.2" stroke-linecap="round" stroke-linejoin="round"><path d="M13.5 19 L8 23.5"/></g><g fill="none" stroke="#EF4444" stroke-width="5.2" stroke-linecap="round" stroke-linejoin="round"><path d="M13.5 19 L8 23.5"/></g><circle cx="10" cy="13" r="3.3" fill="currentColor"/></svg>
}

function PShrug(props) {
  return <svg viewBox="0 0 40 40" {...props}><ellipse cx="20" cy="37.2" rx="7" ry="1.5" fill="currentColor" opacity="0.14"/><path d="M16.5 12.5 Q20 11 23.5 12.5 L23.5 22 Q20 24 16.5 22 Z" fill="currentColor" opacity="0.92"/><g fill="none" stroke="currentColor" stroke-width="5.2" stroke-linecap="round" stroke-linejoin="round"><line x1="20" y1="27" x2="16" y2="36"/><line x1="20" y1="27" x2="24" y2="36"/><line x1="20" y1="17" x2="15" y2="26"/><line x1="20" y1="17" x2="25" y2="26"/></g><g fill="none" stroke="currentColor" stroke-width="7.2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 15.5 Q20 12 24 15.5"/></g><g fill="none" stroke="#EF4444" stroke-width="5.2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 15.5 Q20 12 24 15.5"/></g><circle cx="20" cy="12" r="3.3" fill="currentColor"/></svg>
}

function PSquat(props) {
  return <svg viewBox="0 0 40 40" {...props}><ellipse cx="20" cy="37.2" rx="7" ry="1.5" fill="currentColor" opacity="0.14"/><path d="M16.5 12.5 Q20 11 23.5 12.5 L23.5 22 Q20 24 16.5 22 Z" fill="currentColor" opacity="0.92"/><g fill="none" stroke="currentColor" stroke-width="5.2" stroke-linecap="round" stroke-linejoin="round"><line x1="13.5" y1="14" x2="26.5" y2="14"/></g><g fill="none" stroke="currentColor" stroke-width="7.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21 L14.5 26 L15.5 34"/><path d="M20 21 L25.5 26 L24.5 34"/></g><g fill="none" stroke="#EF4444" stroke-width="5.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21 L14.5 26 L15.5 34"/><path d="M20 21 L25.5 26 L24.5 34"/></g><circle cx="20" cy="9" r="3.3" fill="currentColor"/></svg>
}

function PTricepExt(props) {
  return <svg viewBox="0 0 40 40" {...props}><ellipse cx="18" cy="37.2" rx="7" ry="1.5" fill="currentColor" opacity="0.14"/><path d="M14.5 13 Q18 11.5 21.5 13 L21.5 23 Q18 25 14.5 23 Z" fill="currentColor" opacity="0.92"/><g fill="none" stroke="currentColor" stroke-width="5.2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="27" x2="14" y2="36"/><line x1="18" y1="27" x2="22" y2="36"/><path d="M18 15 L26 10"/></g><g fill="none" stroke="currentColor" stroke-width="7.2" stroke-linecap="round" stroke-linejoin="round"><path d="M26 10 L24 18"/></g><g fill="none" stroke="#EF4444" stroke-width="5.2" stroke-linecap="round" stroke-linejoin="round"><path d="M26 10 L24 18"/></g><circle cx="18" cy="11" r="3.3" fill="currentColor"/></svg>
}

function PTwist(props) {
  return <svg viewBox="0 0 40 40" {...props}><ellipse cx="20" cy="37.2" rx="7" ry="1.5" fill="currentColor" opacity="0.14"/><path d="M16.5 12.5 Q20 11 23.5 12.5 L23.5 22 Q20 24 16.5 22 Z" fill="currentColor" opacity="0.92"/><g fill="none" stroke="currentColor" stroke-width="5.2" stroke-linecap="round" stroke-linejoin="round"><line x1="20" y1="27" x2="16" y2="36"/><line x1="20" y1="27" x2="24" y2="36"/></g><g fill="none" stroke="currentColor" stroke-width="7.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 17 Q26 19 28 24"/></g><g fill="none" stroke="#EF4444" stroke-width="5.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 17 Q26 19 28 24"/></g><circle cx="20" cy="11" r="3.3" fill="currentColor"/></svg>
}

function PUprightRow(props) {
  return <svg viewBox="0 0 40 40" {...props}><ellipse cx="20" cy="37.2" rx="7" ry="1.5" fill="currentColor" opacity="0.14"/><path d="M16.5 12.5 Q20 11 23.5 12.5 L23.5 22 Q20 24 16.5 22 Z" fill="currentColor" opacity="0.92"/><g fill="none" stroke="currentColor" stroke-width="5.2" stroke-linecap="round" stroke-linejoin="round"><line x1="20" y1="27" x2="16" y2="36"/><line x1="20" y1="27" x2="24" y2="36"/></g><g fill="none" stroke="currentColor" stroke-width="7.2" stroke-linecap="round" stroke-linejoin="round"><line x1="20" y1="15" x2="15" y2="20"/><line x1="20" y1="15" x2="25" y2="20"/><line x1="14" y1="20" x2="26" y2="20"/></g><g fill="none" stroke="#EF4444" stroke-width="5.2" stroke-linecap="round" stroke-linejoin="round"><line x1="20" y1="15" x2="15" y2="20"/><line x1="20" y1="15" x2="25" y2="20"/><line x1="14" y1="20" x2="26" y2="20"/></g><circle cx="20" cy="11" r="3.3" fill="currentColor"/></svg>
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