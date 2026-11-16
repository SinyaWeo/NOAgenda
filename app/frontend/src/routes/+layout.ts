// Sign-in state lives in the browser (access token in localStorage, refresh cookie), so the
// server cannot render any page that needs a session: it would only ship a "Loading…" shell
// and then render everything again after hydration. Render in the browser instead.
// The public legal pages opt back in to server rendering (see terms/ and privacy/).
export const ssr = false;
