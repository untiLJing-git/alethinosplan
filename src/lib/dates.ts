export function todayDate(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function isDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
    && value >= '1900-01-01' && value <= '2100-12-31';
}

export function shiftDay(value: string, amount: number): string {
  const date = new Date(`${value}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

export function shiftMonth(value: string, amount: number): string {
  const date = new Date(`${value}T12:00:00Z`);
  const first = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + amount, 1));
  const last = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  first.setUTCDate(Math.min(date.getUTCDate(), last));
  return first.toISOString().slice(0, 10);
}

export function weekDates(value: string): string[] {
  const weekday = (new Date(`${value}T12:00:00Z`).getUTCDay() + 6) % 7;
  const first = shiftDay(value, -weekday);
  return Array.from({ length: 7 }, (_, index) => shiftDay(first, index));
}

export function monthDates(value: string): string[] {
  const first = `${value.slice(0, 7)}-01`;
  const date = new Date(`${first}T12:00:00Z`);
  const offset = (date.getUTCDay() + 6) % 7;
  const days = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  const start = shiftDay(first, -offset);
  return Array.from({ length: Math.ceil((offset + days) / 7) * 7 }, (_, index) => shiftDay(start, index));
}

export function dayLabel(value: string, weekday = false): string {
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'numeric', day: 'numeric', ...(weekday ? { weekday: 'long' as const } : {}), timeZone: 'UTC',
  }).format(new Date(`${value}T12:00:00Z`));
}

export function monthLabel(value: string): string {
  return `${value.slice(0, 4)} 年 ${Number(value.slice(5, 7))} 月`;
}
