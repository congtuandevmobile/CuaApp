/** Display formatting only. The numbers themselves come from the native core. */
export const formatDistance = (meters: number): string => {
  const km = meters / 1000;
  return km < 10 ? km.toFixed(2) : km.toFixed(1);
};

export const formatDuration = (ms: number): string => {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
};

export const formatPace = (secondsPerKm: number | undefined): string => {
  if (secondsPerKm === undefined) return '--:--';
  const s = Math.round(secondsPerKm);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};
