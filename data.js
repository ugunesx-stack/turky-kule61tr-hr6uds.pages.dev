functions/api/data.js

// functions/api/data.js
export const onRequestGet = async ({ request, env }) => {
  try {
    const cookie = env.GAME_COOKIE; // Pages > Project > Settings > Environment variables içine ekle
    const targetBase = env.TARGET_BASE || 'https://s61-tr.kingsage.gameforge.com/';
    if (!cookie) {
      return new Response(JSON.stringify({ success: false, error: 'Server not configured: GAME_COOKIE missing' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const url = new URL(request.url);
    const path = url.searchParams.get('path') || '/?village=6020&s=ally&m=attacks';
    const targetUrl = new URL(path, targetBase).toString();

    const response = await fetch(targetUrl, {
      headers: {
        'Cookie': cookie,
        'User-Agent': env.USER_AGENT || 'Mozilla/5.0 (compatible; KA-Viewer/1.0)',
        'Accept': 'text/html,application/xhtml+xml'
      },
      redirect: 'follow'
    });

    if (!response.ok) {
      const txt = await response.text().catch(()=>null);
      return new Response(JSON.stringify({ success: false, error: `Upstream fetch failed: ${response.status}`, detail: (txt || '').slice(0,200) }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const text = await response.text();

    // Safely extract relevant fragment. Öncelik: <div class="contentpane"> ... </div>
    let fragment = null;
    const contentpaneMatch = text.match(/<div[^>]*class=["'][^"']*contentpane[^"']*["'][\s\S]*?<\/div>/i);
    if (contentpaneMatch) {
      fragment = contentpaneMatch[0];
    } else {
      const bodyMatch = text.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
      fragment = bodyMatch ? bodyMatch[1] : text;
    }

    const baseHref = targetBase.endsWith('/') ? targetBase : (targetBase + '/');
    const htmlOut = `<base href="${baseHref}">${fragment}`;

    return new Response(JSON.stringify({ success: true, html: htmlOut }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store'
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: 'Internal error', detail: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
