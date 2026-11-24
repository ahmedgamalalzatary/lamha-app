/**
 * The browser's cookie jar, for Node's fetch (which keeps no cookies). The dashboard's refresh token
 * lives in an HttpOnly cookie (review F11); a browser keeps it and sends it back on `credentials:
 * 'include'` to the paths it names, and so does this. The API is still the real one.
 */
const jar = new Map<string, { value: string; path: string }>();

export const cookieJar = {
  get: (name: string) => jar.get(name)?.value,
  clear: () => jar.clear(),
};

/** What the browser sends back, and keeps from each answer. */
export function withCookieJar(realFetch: typeof fetch): typeof fetch {
  return async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    const include = init?.credentials === 'include';
    const headers = new Headers(init?.headers);
    if (include) {
      const sent = [...jar].filter(([, c]) => url.pathname.startsWith(c.path)).map(([name, c]) => `${name}=${c.value}`);
      if (sent.length) headers.set('cookie', sent.join('; '));
    }
    const res = await realFetch(input, { ...init, headers });
    if (include) {
      for (const line of res.headers.getSetCookie()) {
        const [pair = '', ...attrs] = line.split(';').map((s) => s.trim());
        const [name = '', ...value] = pair.split('=');
        const path = attrs.find((a) => /^path=/i.test(a))?.slice(5) ?? '/';
        const expires = attrs.find((a) => /^expires=/i.test(a))?.slice(8);
        const gone = value.join('') === '' || (expires !== undefined && new Date(expires).getTime() <= Date.now()) || attrs.some((a) => /^max-age=0$/i.test(a));
        if (gone) jar.delete(name);
        else jar.set(name, { value: value.join('='), path });
      }
    }
    return res;
  };
}
