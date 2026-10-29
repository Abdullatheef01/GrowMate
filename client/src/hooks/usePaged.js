import { useEffect, useRef, useState } from 'react';
import api, { errMsg } from '../api';

// Loads one page from the server. Search is debounced, and page goes back to 1 when search/filters change.
export default function usePaged(url, { search = '', limit = 20, extra = {} } = {}) {
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [tick, setTick] = useState(0);
  const sig = JSON.stringify({ url, search, limit, extra });
  const lastSig = useRef(sig);

  useEffect(() => {
    let off = false;
    let p = page;
    if (lastSig.current !== sig) {
      lastSig.current = sig;
      if (page !== 1) { setPage(1); return; }
      p = 1;
    }
    const t = setTimeout(() => {
      setErr('');
      api.get(url, { params: { ...extra, search: search || undefined, page: p, limit } })
        .then((r) => { if (!off) setData(r.data); })
        .catch((e) => { if (!off) setErr(errMsg(e)); });
    }, search ? 300 : 0);
    return () => { off = true; clearTimeout(t); };
  }, [sig, page, tick]); // eslint-disable-line

  return { data, page, setPage, err, reload: () => setTick((n) => n + 1) };
}