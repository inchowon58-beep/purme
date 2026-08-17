import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { ADMIN } from "./admin-config";

const COOKIE = "jm_admin_session";
const SECRET = new TextEncoder().encode(
  process.env.ADMIN_JWT_SECRET || "purme-admin-secret-2026"
);

export function validateCredentials(username: string, password: string): boolean {
  return username === ADMIN.username && password === ADMIN.password;
}

export async function createSession(): Promise<string> {
  return new SignJWT({ role: "admin", user: ADMIN.username })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(SECRET);
}

export async function verifySession(token: string): Promise<boolean> {
  try {
    await jwtVerify(token, SECRET);
    return true;
  } catch {
    return false;
  }
}

export async function isAuthenticated(): Promise<boolean> {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (!token) return false;
  return verifySession(token);
}

export { COOKIE as ADMIN_COOKIE };
