/** The first wait, doubled after each failed try, never over the cap. */
const FIRST_MS = 5_000;
const CAP_MS = 60_000;

/**
 * A live socket the server dropped (an expired token): socket.io does not reconnect by itself after
 * "io server disconnect". One API call renews the token, then the socket connects again with it. A
 * failed call (no network) is tried again after a longer wait, so live updates come back once the
 * phone is online. Returns the cancel for the screen's cleanup.
 */
export function renewAndReconnect(connect: () => void, probe: () => Promise<unknown>): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let stopped = false;
  const attempt = (wait: number) => {
    timer = setTimeout(() => {
      probe()
        .then(() => {
          if (!stopped) connect();
        })
        .catch(() => {
          if (!stopped) attempt(Math.min(wait * 2, CAP_MS));
        });
    }, wait);
  };
  attempt(FIRST_MS);
  return () => {
    stopped = true;
    clearTimeout(timer);
  };
}
