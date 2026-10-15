import { useEffect, useState } from 'react';
import { todayDate } from '../lib/dates';

export function useToday() {
  const [today, setToday] = useState(todayDate);
  useEffect(() => {
    const refresh = () => setToday(todayDate());
    const timer = setInterval(refresh, 60_000);
    document.addEventListener('visibilitychange', refresh);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', refresh); };
  }, []);
  return today;
}
