import type { FamilyStore } from './use-family-store';
import { awardId, finishRecovery, recoveryFor, WIND_DOWN_TASKS } from '@/lib/family-points';
import { dayKey } from '@/lib/family-data';

export function useRecoveryStore(store: FamilyStore) {
  const memberId = store.current.id;
  const today = dayKey();
  const record = recoveryFor(store.data, memberId, today);
  const saveSleep = (hours: number) => store.updateRecovery(memberId, { sleepHours: hours });
  const toggleTask = (id: string) => {
    const windDown = record.windDown.includes(id) ? record.windDown.filter((task) => task !== id) : [...record.windDown, id];
    store.updateRecovery(memberId, { windDown });
  };
  const finishRoutine = () => {
    finishRecovery(store.data, memberId, today);
    store.finishRecovery(memberId);
  };
  const completed = store.data.activityLog.some((entry) => entry.id === awardId('recover', memberId, today));
  return { record, tasks: WIND_DOWN_TASKS, saveSleep, toggleTask, finishRoutine, completed };
}
