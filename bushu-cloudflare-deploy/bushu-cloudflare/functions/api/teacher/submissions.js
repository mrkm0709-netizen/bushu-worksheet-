import { requireTeacher } from "../../../lib/teacher-auth.js";
const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
});

function mapRow(row) {
  const step1 = row.step1_json ? JSON.parse(row.step1_json) : null;
  const step2 = row.step2_json ? JSON.parse(row.step2_json) : null;
  const step3 = row.step3_json ? JSON.parse(row.step3_json) : null;
  return {
    id: row.id,
    studentClass: row.student_class,
    studentNumber: row.student_number,
    studentName: row.student_name,
    step1: step1 || [],
    score: step2?.score,
    answers: step2?.answers || [],
    learned: step3?.answer || "",
    difficult: step3?.reflection || "",
    step1SubmittedAt: row.step1_submitted_at,
    step2SubmittedAt: row.step2_submitted_at,
    step3SubmittedAt: row.step3_submitted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    submittedAt: row.updated_at
  };
}

export async function onRequestGet({ request, env }) {
  if (!(await requireTeacher(request, env))) return json({ error: "教員認証が必要です。" }, 401);
  if (!env.DB) return json({ error: "D1データベースが接続されていません。" }, 503);
  const result = await env.DB.prepare(`SELECT * FROM submissions ORDER BY student_class, student_number`).all();
  return json({ submissions: (result.results || []).map(mapRow) });
}

export async function onRequestDelete({ request, env }) {
  if (!(await requireTeacher(request, env))) return json({ error: "教員認証が必要です。" }, 401);
  if (!env.DB) return json({ error: "D1データベースが接続されていません。" }, 503);
  const id = new URL(request.url).searchParams.get("id");
  if (id) await env.DB.prepare(`DELETE FROM submissions WHERE id = ?`).bind(id).run();
  else await env.DB.prepare(`DELETE FROM submissions`).run();
  return json({ ok: true });
}
