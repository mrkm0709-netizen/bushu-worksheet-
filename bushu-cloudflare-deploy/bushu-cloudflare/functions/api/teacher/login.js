import { createSession, sessionCookie } from "../../../lib/teacher-auth.js";
const json = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), {
  status,
  headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...headers }
});

export async function onRequestPost({ request, env }) {
  const origin = request.headers.get("Origin");
  if (origin && origin !== new URL(request.url).origin) return json({ error: "許可されていないアクセスです。" }, 403);
  if (!env.TEACHER_PASSWORD || !env.SESSION_SECRET || env.SESSION_SECRET.length < 32) return json({ error: "教員認証の設定が完了していません。" }, 503);
  let body;
  try { body = await request.json(); } catch { return json({ error: "入力内容を確認してください。" }, 400); }
  if (typeof body.password !== "string" || body.password !== env.TEACHER_PASSWORD) return json({ error: "パスワードが違います。" }, 401);
  const token = await createSession(env.SESSION_SECRET);
  return json({ ok: true }, 200, { "Set-Cookie": sessionCookie(token) });
}
