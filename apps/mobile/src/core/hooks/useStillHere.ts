import { useEffect, useRef } from 'react';

/**
 * Whether the screen is still showing: a send that finishes after the person already left (back,
 * ✕) must not go back a second time from the screen under it.
 */
export function useStillHere(): () => boolean {
  const here = useRef(true);
  useEffect(() => {
    here.current = true;
    return () => {
      here.current = false;
    };
  }, []);
  return () => here.current;
}
