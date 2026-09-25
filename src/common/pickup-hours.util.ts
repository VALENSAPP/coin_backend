/**
 * Formats raw pickup available hours into a user-friendly multi-line string.
 * Supports:
 * 1. JSON object with day-by-day mapping (e.g., { days: { Mon: ['09:00 - 17:00'], ... } })
 * 2. JSON object with weekday/weekend range (e.g., { weekdayStart, weekdayEnd, weekendStart, weekendEnd })
 * 3. Pre-parsed objects
 * 4. Fallback legacy plain text strings
 */
export const formatPickupAvailableHours = (value: any): string => {
  if (!value) return '';

  let hours = value;
  if (typeof value === 'string') {
    try {
      hours = JSON.parse(value);
    } catch {
      // Keep supporting pickup-hour values returned by older API responses.
      return value.trim();
    }
  }

  if (!hours || typeof hours !== 'object') return '';

  if (hours.days && typeof hours.days === 'object') {
    return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
      .filter((day) => Array.isArray(hours.days[day]) && hours.days[day].length)
      .map((day) => `${day}: ${hours.days[day].join(', ')}`)
      .join('\n');
  }

  const weekday = [hours.weekdayStart, hours.weekdayEnd].filter(Boolean).join(' – ');
  const weekend = [hours.weekendStart, hours.weekendEnd].filter(Boolean).join(' – ');

  return [
    weekday && `Mon–Fri: ${weekday}`,
    weekend && `Sat–Sun: ${weekend}`,
  ].filter(Boolean).join('\n');
};
