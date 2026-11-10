/**
 * Vercel Serverless Function & Local Dev Endpoint - Loja Image Server
 * Serves compressed store images stored in Firestore (`loja_imagens/{id}`) as real binary HTTP image links.
 */

const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || 'tibimmanagerpainelvercel';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    return res.end();
  }

  const id = (req.query?.id || '').toString().replace(/[^a-zA-Z0-9_-]/g, '');
  if (!id) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ error: 'Missing image id' }));
  }

  try {
    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/loja_imagens/${id}`;
    const response = await fetch(firestoreUrl);

    if (!response.ok) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ error: 'Image not found' }));
    }

    const docData = await response.json();
    const dataUrl = docData?.fields?.dataUrl?.stringValue || '';

    if (!dataUrl || !dataUrl.startsWith('data:')) {
      res.statusCode = 404;
      return res.end('Invalid image data');
    }

    const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) {
      res.statusCode = 500;
      return res.end('Malformed data URL');
    }

    const mimeType = match[1] || 'image/webp';
    const base64Data = match[2];
    const buffer = Buffer.from(base64Data, 'base64');

    res.statusCode = 200;
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Length', String(buffer.length));
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    return res.end(buffer);
  } catch (err) {
    console.error('[loja-img] Error serving image:', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ error: 'Internal server error' }));
  }
}
