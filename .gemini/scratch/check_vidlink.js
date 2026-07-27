const url = 'https://vidlink.pro/movie/27205';

fetch(url, {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  }
}).then(r => r.text()).then(html => {
  const lo = html.toLowerCase();
  
  // Check for sandbox-related JS patterns
  const patterns = [
    'sandbox', 'top.location', 'parent.location', 'frameElement',
    'window.open', 'disable', 'blocked', 'allow-top',
    'self !== top', 'self!=top', 'top!==self', 'top!=self',
    'window.top', 'window.parent', 'navigator.permissions'
  ];
  
  patterns.forEach(p => {
    const idx = lo.indexOf(p.toLowerCase());
    if (idx > -1) {
      const start = Math.max(0, idx - 100);
      const end = Math.min(html.length, idx + 150);
      console.log(`\n=== Found "${p}" at index ${idx} ===`);
      console.log(html.substring(start, end));
    }
  });
  
  // List external JS files
  const jsFiles = html.match(/src=["'][^"']*\.js[^"']*/gi);
  if (jsFiles) {
    console.log('\n=== External JS files ===');
    jsFiles.forEach(f => console.log(f));
  }
  
  // Check meta tags
  const metas = html.match(/<meta[^>]+>/gi);
  if (metas) {
    console.log('\n=== Meta tags ===');
    metas.forEach(m => console.log(m));
  }
}).catch(e => console.error('Error:', e.message));
