import { useCallback, useEffect, useState } from 'preact/hooks';
import { prepare, type Prepared } from '../../lib/screener/query.ts';
import type { ScreenerData } from '../../lib/screener/types.ts';

/** Loading state of the one data file the screener needs. */
export type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; prepared: Prepared };

/**
 * Fetch and prepare `/data/screener.json` (the only network request the screener makes).
 *
 * @param url - Data file URL.
 * @returns The load state and a `retry` function for the error screen.
 */
export function useScreenerData(url = '/data/screener.json'): { state: LoadState; retry: () => void } {
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`The data file could not be loaded (HTTP ${res.status}).`);
        return res.json() as Promise<ScreenerData>;
      })
      .then((data) => { if (!cancelled) setState({ status: 'ready', prepared: prepare(data) }); })
      .catch((e: unknown) => { if (!cancelled) setState({ status: 'error', message: e instanceof Error ? e.message : String(e) }); });
    return () => { cancelled = true; };
  }, [url, attempt]);

  const retry = useCallback(() => setAttempt((a) => a + 1), []);
  return { state, retry };
}
