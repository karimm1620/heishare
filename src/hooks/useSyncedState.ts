import { useState } from 'react';

/**
 * "Adjust state when a prop changes" without a useEffect — see
 * https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes.
 * Calling setState directly in the render body (guarded by a value
 * comparison) lets React bail out and re-render synchronously instead of
 * committing once, then cascading into a second render via an effect.
 *
 * Used for editable form fields (e.g. Settings' alias/port inputs) whose
 * initial/reset value comes from a slower-loading external source
 * (AsyncStorage-backed settings) but which the user should be able to type
 * into locally before it's committed back.
 */
export function useSyncedState<T>(value: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [state, setState] = useState(value);
  const [prevValue, setPrevValue] = useState(value);

  if (value !== prevValue) {
    setPrevValue(value);
    setState(value);
  }

  return [state, setState];
}
