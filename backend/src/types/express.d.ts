export interface AuthUserPayload {
  userId: string;
  email: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUserPayload | null;
    }
  }
}
