import { cookies } from "next/headers";
import { jwtVerify, SignJWT } from "jose";

const COOKIE_NAME = "votachain_session";
function secret() {
  const value = process.env.JWT_SECRET;
  if (!value || value.length < 32) throw new Error("JWT_SECRET must be at least 32 characters.");
  return new TextEncoder().encode(value);
}
export type Session = { userId: string; email: string };
export async function createSession(session: Session) {
  const token = await new SignJWT({ email: session.email })
    .setProtectedHeader({ alg: "HS256" }).setSubject(session.userId)
    .setIssuedAt().setExpirationTime("7d").sign(secret());
  const jar = await cookies();
  jar.set(COOKIE_NAME, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 7 });
}
export async function getSession(): Promise<Session | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (!payload.sub || typeof payload.email !== "string") return null;
    return { userId: payload.sub, email: payload.email };
  } catch { return null; }
}
export async function destroySession() {
  (await cookies()).delete(COOKIE_NAME);
}
export async function requireSession() {
  const session = await getSession();
  if (!session) throw new Error("UNAUTHENTICATED");
  return session;
}
export async function requireOrganizationRole(organizationId: string, allowedRoles: string[]) {
  const session = await requireSession();
  const { prisma } = await import("@/lib/prisma");
  const membership = await prisma.membership.findUnique({ where: { organizationId_userId: { organizationId, userId: session.userId } } });
  if (!membership || !allowedRoles.includes(membership.role)) throw new Error("FORBIDDEN");
  return { session, membership };
}
