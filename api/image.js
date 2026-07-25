const ALLOWED_HOSTS = new Set([
  'static.wixstatic.com',
  'media.wixstatic.com'
]);

module.exports = async function handler(req, res) {
  try {
    const value = Array.isArray(req.query.url) ? req.query.url[0] : req.query.url;
    if (!value) {
      res.status(400).json({ error: 'Missing image URL.' });
      return;
    }

    const target = new URL(value);
    if (target.protocol !== 'https:' || !ALLOWED_HOSTS.has(target.hostname)) {
      res.status(400).json({ error: 'Unsupported image host.' });
      return;
    }

    const upstream = await fetch(target.toString(), {
      headers: {
        Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'User-Agent': 'Tillman-Tough-Preview/1.0'
      }
    });

    if (!upstream.ok) {
      res.status(upstream.status).json({ error: `Image request failed with ${upstream.status}.` });
      return;
    }

    const contentType = upstream.headers.get('content-type') || 'image/jpeg';
    const body = Buffer.from(await upstream.arrayBuffer());
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.status(200).send(body);
  } catch (error) {
    res.status(500).json({ error: 'The image could not be loaded.' });
  }
};
