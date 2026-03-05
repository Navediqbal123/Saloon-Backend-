// Install: npm install jose
import { createRemoteJWKSet, jwtVerify } from 'jose';

const JWKS = createRemoteJWKSet(
  new URL('https://tojsyblbhahkhmbuzmsq.supabase.co/auth/v1/.well-known/jwks.json')
);

async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing token' });
  }
  try {
    const { payload } = await jwtVerify(authHeader.split(' ')[1], JWKS, {
      issuer: 'https://tojsyblbhahkhmbuzmsq.supabase.co/auth/v1',
      audience: 'authenticated',
    });
    req.user = { id: payload.sub, email: payload.email };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}
