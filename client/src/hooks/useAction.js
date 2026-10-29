import { useRef, useState } from 'react';

// Runs an async action once at a time. A second click while it is running is ignored.
export default function useAction(fn) {
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const run = async (...args) => {
    if (lock.current) return;
    lock.current = true; setBusy(true);
    try { return await fn(...args); }
    finally { lock.current = false; setBusy(false); }
  };
  return [run, busy];
}