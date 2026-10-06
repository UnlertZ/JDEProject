/**
 * functions/r2/[[path]].js — Stream images directly from Cloudflare R2 bucket
 */

export async function onRequestGet(context) {
  const { request, env, params } = context;
  if (!env.R2) {
    return new Response('Cloudflare R2 binding "R2" is not configured', { status: 500 });
  }

  const pathParts = params.path;
  const key = Array.isArray(pathParts) ? pathParts.join('/') : String(pathParts || '');
  if (!key) {
    return new Response('Image path required', { status: 400 });
  }

  try {
    const object = await env.R2.get(key);
    if (!object) {
      return new Response('Image Not Found in R2', { status: 404 });
    }

    const etag = object.httpEtag;
    if (request.headers.get('if-none-match') === etag) {
      return new Response(null, { status: 304 });
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('etag', etag);
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    headers.set('Access-Control-Allow-Origin', '*');

    return new Response(object.body, { headers });
  } catch (err) {
    return new Response('Error retrieving image from R2: ' + err.message, { status: 500 });
  }
}
