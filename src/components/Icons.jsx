/** Minimal inline icon set (stroke icons, inherit currentColor). */
const base = { fill: 'none', stroke: 'currentColor', strokeWidth: 2.2, strokeLinecap: 'round', strokeLinejoin: 'round' }
const I = ({ children, size = 22, className = '', ...rest }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className={className} {...base} {...rest}>{children}</svg>
)
export const SearchIcon = (p) => <I {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></I>
export const ArrowUp = (p) => <I {...p}><path d="M12 19V5" /><path d="m5 12 7-7 7 7" /></I>
export const ArrowDown = (p) => <I {...p}><path d="M12 5v14" /><path d="m19 12-7 7-7-7" /></I>
export const ArrowRight = (p) => <I {...p}><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></I>
export const ChevronDown = (p) => <I {...p}><path d="m6 9 6 6 6-6" /></I>
export const ChevronLeft = (p) => <I {...p}><path d="m15 18-6-6 6-6" /></I>
export const ChevronRight = (p) => <I {...p}><path d="m9 18 6-6-6-6" /></I>
export const Close = (p) => <I {...p}><path d="M18 6 6 18" /><path d="m6 6 12 12" /></I>
export const Star = ({ filled, ...p }) => <I {...p} fill={filled ? 'currentColor' : 'none'}><path d="m12 2.5 2.9 6.1 6.6.9-4.8 4.6 1.2 6.6L12 17.6l-5.9 3.1 1.2-6.6L2.5 9.5l6.6-.9z" /></I>
export const Sun = (p) => <I {...p}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></I>
export const Moon = (p) => <I {...p}><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></I>
export const TextSize = (p) => <I {...p}><path d="M4 7V4h16v3" /><path d="M9 20h6" /><path d="M12 4v16" /></I>
export const Copy = (p) => <I {...p}><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></I>
export const Check = (p) => <I {...p}><path d="m20 6-11 11-5-5" /></I>
export const Download = (p) => <I {...p}><path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M5 21h14" /></I>
export const Share = (p) => <I {...p}><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" /></I>
export const Bell = (p) => <I {...p}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0" /></I>
export const Trash = (p) => <I {...p}><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6l-1 14H6L5 6" /></I>
export const Plus = (p) => <I {...p}><path d="M12 5v14" /><path d="M5 12h14" /></I>
export const Menu = (p) => <I {...p}><path d="M4 7h16M4 12h16M4 17h16" /></I>
export const Clock = (p) => <I {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></I>
export const Trend = (p) => <I {...p}><path d="M3 17l6-6 4 4 8-8" /><path d="M14 7h7v7" /></I>
export const Info = (p) => <I {...p}><circle cx="12" cy="12" r="9" /><path d="M12 16v-4" /><path d="M12 8h.01" /></I>
export const Alert = (p) => <I {...p}><path d="M12 9v4" /><path d="M12 17h.01" /><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /></I>
export const Sliders = (p) => <I {...p}><path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3" /><path d="M1 14h6M9 8h6M17 16h6" /></I>
export const Grid = (p) => <I {...p}><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></I>
export const Columns = (p) => <I {...p}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M12 4v16" /></I>
export const Calendar = (p) => <I {...p}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 11h18" /></I>
export const Briefcase = (p) => <I {...p}><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M3 13h18" /></I>
export const Home = (p) => <I {...p}><path d="m3 11 9-8 9 8" /><path d="M5 10v10h14V10" /></I>
export const Sparkles = (p) => <I {...p}><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" /><path d="M19 17l.8 2.2L22 20l-2.2.8L19 23l-.8-2.2L16 20l2.2-.8z" /></I>
export const Keyboard = (p) => <I {...p}><rect x="2" y="6" width="20" height="12" rx="2" /><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M8 14h8" /></I>
