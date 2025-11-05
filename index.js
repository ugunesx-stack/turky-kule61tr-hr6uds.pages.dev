// public/index.js
(async function () {
  const container = document.getElementById('ataquesXXX');
  const loading = document.getElementById('loading');

  function formatRemaining(ms) {
    if (ms <= 0) return 'Varış';
    const total = Math.floor(ms / 1000);
    const s = total % 60;
    const m = Math.floor(total / 60) % 60;
    const h = Math.floor(total / 3600) % 24;
    const d = Math.floor(total / 86400);
    if (d > 0) return `${d}g ${h}s ${m}d ${s}s`;
    if (h > 0) return `${h}s ${m}d ${s}s`;
    if (m > 0) return `${m}d ${s}s`;
    return `${s}s`;
  }
  function formatAbsolute(iso) {
    const d = new Date(iso);
    if (isNaN(d)) return iso;
    return d.toLocaleString();
  }

  let timers = [];
  function clearTimers() {
    timers.forEach(t => clearInterval(t));
    timers = [];
  }

  // Basit: metin HH:MM veya HH:MM:SS bulursa data-ga-timestamp ekle
  function annotateTimestamps(root) {
    const timeRegex = /([01]?\d|2[0-3]):[0-5]\d(:[0-5]\d)?/g;
    const candidates = root.querySelectorAll('span, td, div, time, a');
    const today = new Date();
    candidates.forEach(node => {
      if (!node || !node.textContent) return;
      const txt = node.textContent.trim();
      const m = txt.match(timeRegex);
      if (m && m.length > 0) {
        const t = m[0];
        const parts = t.split(':');
        const d = new Date(today.getFullYear(), today.getMonth(), today.getDate(),
                           parseInt(parts[0] || 0), parseInt(parts[1] || 0), parseInt(parts[2] || 0 || 0));
        if (!isNaN(d)) {
          node.setAttribute('data-ga-timestamp', d.toISOString());
        }
      }
    });
  }

  function initTimers() {
    clearTimers();
    const nodes = Array.from(container.querySelectorAll('[data-ga-timestamp]'));
    nodes.forEach(node => {
      const iso = node.getAttribute('data-ga-timestamp');
      if (!iso) return;
      const update = () => {
        const t = Date.parse(iso);
        if (isNaN(t)) return;
        const rem = t - Date.now();
        if (rem <= 0) {
          node.textContent = formatAbsolute(iso) + ' (Varış)';
        } else {
          node.textContent = formatAbsolute(iso) + ' (Kalan: ' + formatRemaining(rem) + ')';
        }
      };
      update();
      const id = setInterval(update, 1000);
      timers.push(id);
    });
  }

  async function fetchAndRender(retry = 0) {
    try {
      loading && (loading.textContent = 'Yükleniyor...');
      const resp = await fetch('/api/data?path=/?village=6020&s=ally&m=attacks', { cache: 'no-store' });
      if (!resp.ok) {
        const txt = await resp.text().catch(()=>null);
        throw new Error('HTTP ' + resp.status + ' - ' + (txt || resp.statusText));
      }
      const data = await resp.json();
      if (!data.success) throw new Error(data.error || 'Bad data');

      container.innerHTML = data.html;

      annotateTimestamps(container);
      initTimers();

      loading && (loading.textContent = '');
    } catch (err) {
      console.error('Fetch error', err);
      loading && (loading.textContent = 'Veri alınamadı: ' + err.message);
      if (retry < 4) setTimeout(() => fetchAndRender(retry + 1), Math.pow(2, retry) * 1000);
    }
  }

  await fetchAndRender();
  setInterval(fetchAndRender, 30000);

})();
