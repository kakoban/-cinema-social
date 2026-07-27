const c = new AbortController();
setTimeout(() => c.abort(), 15000);
fetch('https://vidlink.pro/movie/27205', {
  signal: c.signal,
  headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'Accept': 'text/html' }
}).then(r => r.text()).then(html => {
  const lo = html.toLowerCase();
  
  // Search for sandbox detection patterns
  const checks = [
    { p: 'sandbox', label: 'sandbox' },
    { p: 'window.top', label: 'window.top' },
    { p: 'window.parent', label: 'window.parent' },
    { p: 'self!==top', label: 'self!==top' },
    { p: 'self!=top', label: 'self!=top' },
    { p: 'top!==self', label: 'top!==self' },
    { p: 'frameelement', label: 'frameElement' },
    { p: 'disable', label: 'disable' },
    { p: 'blocked', label: 'blocked' },
    { p: 'allow-top', label: 'allow-top' },
    { p: 'top.location', label: 'top.location' },
    { p: 'parent.location', label: 'parent.location' },
    { p: 'popups', label: 'popups' },
    { p: 'window.open', label: 'window.open' },
  ];
  
  for (const { p, label } of checks) {
    let idx = 0;
    let count = 0;
    while ((idx = lo.indexOf(p, idx)) !== -1) {
      count++;
      if (count <= 3) {
        const start = Math.max(0, idx - 80);
        const end = Math.min(html.length, idx + 80);
        console.log(`\n[${label}] at ${idx}:`);
        console.log(html.substring(start, end).replace(/\n/g, ' '));
      }
      idx += p.length;
    }
    if (count > 3) console.log(`... and ${count - 3} more`);
  }
}).catch(e => console.log('Error:', e.message));
