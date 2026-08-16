import { useCallback, useEffect, useState } from 'react';

import { clearHistory, loadHistory } from '@/lib/storage/historyStore';
import type { Transfer } from '@/types/transfer';

export function useHistory() {
  const [history, setHistory] = useState<Transfer[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setHistory(await loadHistory());
    setIsLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  const clear = useCallback(async () => {
    await clearHistory();
    setHistory([]);
  }, []);

  return { history, isLoading, refresh, clear };
}
