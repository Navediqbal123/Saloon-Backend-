import { createRemoteJWKSet, jwtVerify } from 'jose';

const JWKS = createRemoteJWKSet(
  new URL('https://tojsyblbhahkhmbuzmsq.supabase.co/auth/v1/.well-known/jwks.json')
);

// Function ka naam authMiddleware hi rakha hai taaki crash na ho
export const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing token' });
  }

  try {
    const token = authHeader.split(' ')[1];
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: 'https://tojsyblbhahkhmbuzmsq.supabase.co/auth/v1',
      audience: 'authenticated',
    });

    req.user = { id: payload.sub, email: payload.email };
    next();
  } catch (err) {
    console.error('Auth Error:', err.message);
    return res.status(401).json({ error: 'Invalid token' });
  }
};
