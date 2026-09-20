import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { today } from '@/domain/journal';
export function useToday() {
  const [day, setDay] = useState(today());
  useEffect(() => {
    const refresh = () => setDay(today());
    const interval = setInterval(refresh, 30_000);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, []);
  return day;
}
