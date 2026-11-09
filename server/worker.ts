type Env = {
  GEMINI_API_KEY?: string;
  AI_ACCESS_TOKEN?: string;
  ASSETS?: { fetch: (r: Request) => Promise<Response> };
};
declare const bundledAssets: Record<string, string>;
const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/')) {
      const p = url.pathname === '/' ? '/index.html' : url.pathname;
      const asset =
        typeof bundledAssets !== 'undefined' ? bundledAssets[p] : null;
      if (asset) {
        const ext = p.split('.').pop() || '';
        const mime: Record<string, string> = {
          html: 'text/html; charset=utf-8',
          js: 'text/javascript',
          css: 'text/css',
          json: 'application/json',
          webmanifest: 'application/manifest+json',
          svg: 'image/svg+xml',
          png: 'image/png',
          ico: 'image/x-icon',
        };
        return new Response(
          Uint8Array.from(atob(asset), (c) => c.charCodeAt(0)),
          {
            headers: {
              'Content-Type': mime[ext] || 'application/octet-stream',
              'Cache-Control': p.startsWith('/assets/')
                ? 'public, max-age=31536000, immutable'
                : 'no-cache',
            },
          },
        );
      }
      return env.ASSETS
        ? env.ASSETS.fetch(request)
        : new Response('Not found', { status: 404 });
    }
    if (url.pathname !== '/api/analyze')
      return json({ error: 'Not found' }, 404);
    const bearer = request.headers.get('Authorization') || '';
    if (!env.AI_ACCESS_TOKEN || bearer !== 'Bearer ' + env.AI_ACCESS_TOKEN)
      return json({ error: 'Подключите личный доступ к ИИ.' }, 401);
    if (request.method === 'GET') return json({ ready: !!env.GEMINI_API_KEY });
    if (request.method !== 'POST')
      return json({ error: 'Method not allowed' }, 405);
    if (!env.GEMINI_API_KEY)
      return json({ error: 'Ключ Gemini не настроен на сервере' }, 503);
    if (Number(request.headers.get('Content-Length')) > 20 * 1024 * 1024)
      return json({ error: 'Фото слишком большие' }, 413);
    try {
      const raw = await request.text();
      if (raw.length > 20 * 1024 * 1024)
        return json({ error: 'Фото слишком большие' }, 413);
      const body = JSON.parse(raw);
      if (
        !Array.isArray(body.contents) ||
        body.contents.length !== 1 ||
        !Array.isArray(body.contents[0].parts) ||
        body.contents[0].parts.length > 7
      )
        return json({ error: 'Некорректный запрос' }, 400);
      // Fixed Google endpoint/model. Never proxy arbitrary URLs or expose credentials.
      const response = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': env.GEMINI_API_KEY,
          },
          signal: AbortSignal.timeout(90000),
          body: JSON.stringify({
            contents: body.contents,
            systemInstruction: body.systemInstruction,
            generationConfig: {
              ...body.generationConfig,
              maxOutputTokens: 16000,
              candidateCount: 1,
            },
          }),
        },
      );
      if (!response.ok)
        return json(
          {
            error:
              response.status === 429
                ? 'Лимит Gemini исчерпан. Попробуйте позже.'
                : 'Google не смог обработать запрос.',
            status: response.status,
          },
          response.status,
        );
      return new Response(await response.text(), {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
        },
      });
    } catch {
      return json(
        { error: 'Не удалось прочитать чек. Попробуйте ещё раз.' },
        502,
      );
    }
  },
};
