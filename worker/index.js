import sportsHandler from '../api/sports.js';

function createVercelRequest(request) {
  const url = new URL(request.url);
  return {
    method: request.method,
    query: Object.fromEntries(url.searchParams.entries()),
  };
}

function createVercelResponse() {
  const headers = new Headers();
  let statusCode = 200;
  let body = null;

  return {
    setHeader(name, value) {
      headers.set(name, String(value));
    },
    status(status) {
      statusCode = status;
      return this;
    },
    json(payload) {
      body = JSON.stringify(payload);
      headers.set('Content-Type', 'application/json; charset=utf-8');
      return new Response(body, { status: statusCode, headers });
    },
  };
}

async function handleSportsApi(request) {
  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }

  const req = createVercelRequest(request);
  const res = createVercelResponse();
  const response = await sportsHandler(req, res);

  if (response instanceof Response) return response;

  return new Response(JSON.stringify({ error: 'Sports API did not return a response' }), {
    status: 500,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/sports') {
      try {
        return await handleSportsApi(request);
      } catch (error) {
        return new Response(JSON.stringify({
          error: error instanceof Error ? error.message : String(error ?? 'Sports API unavailable'),
        }), {
          status: 502,
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
        });
      }
    }

    return env.ASSETS.fetch(request);
  },
};
