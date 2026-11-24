const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
});

function validPayload(step, payload) {
  if (step === 1) return Array.isArray(payload) && payload.length === 1 && typeof payload[0] === "string" && payload[0].trim().length > 0 && payload[0].length <= 2000;
  if (step === 2) return payload && typeof payload === "object" && Array.isArray(payload.answers) && payload.answers.length === 10 && payload.answers.every(a => a && typeof a.selected === "string" && ["へん", "つくり", "かんむり", "あし", "たれ", "にょう", "かまえ", ""].includes(a.selected));
  if (step === 3) return payload && typeof payload === "object" && typeof payload.answer === "string" && payload.answer.trim().length > 0 && payload.answer.length <= 3000 && typeof (payload.reflection || "") === "string" && (payload.reflection || "").length <= 2000;
  return false;
}

async function readRecord(db, studentClass, studentNumber) {
  const row = await db.prepare(`SELECT * FROM submissions WHERE student_class = ? AND student_number = ?`)
    .bind(studentClass, studentNumber).first();
  if (!row) return null;
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

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ error: "データベースが接続されていません。CloudflareのD1設定を確認してください。" }, 503);
  if (!request.headers.get("content-type")?.includes("application/json")) return json({ error: "JSON形式で送信してください。" }, 415);
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 12000) return json({ error: "送信内容が大きすぎます。" }, 413);
  let body;
  try { body = await request.json(); } catch { return json({ error: "送信内容を読み取れません。" }, 400); }

  const studentClass = String(body.studentClass || "").trim();
  const studentNumber = Number(body.studentNumber);
  const studentName = String(body.studentName || "").trim();
  const step = Number(body.step);
  const payload = body.payload;
  if (!/^[1-5]組$/.test(studentClass)) return json({ error: "クラスを選択してください。" }, 400);
  if (!Number.isInteger(studentNumber) || studentNumber < 1 || studentNumber > 50) return json({ error: "出席番号は1〜50で入力してください。" }, 400);
  if (!studentName || studentName.length > 40) return json({ error: "名前を40文字以内で入力してください。" }, 400);
  if (![1, 2, 3].includes(step) || !validPayload(step, payload)) return json({ error: "回答内容を確認してください。" }, 400);

  // 正答はサーバー側で判定し、生徒側から送られた得点を信用しない
  if (step === 2) {
    const answerKey = ["へん", "つくり", "あし", "かんむり", "つくり", "あし", "たれ", "にょう", "かまえ", "にょう"];
    let score = 0;
    payload.answers = payload.answers.map((answer, index) => {
      const isCorrect = answer.selected === answerKey[index];
      if (isCorrect) score++;
      return { kanji: ["押", "酒", "慕", "箇", "刈", "烈", "疲", "違", "園", "超"][index], selected: answer.selected, correctAnswer: answerKey[index], isCorrect };
    });
    payload.score = score;
  }

  const now = new Date().toISOString();
  await env.DB.prepare(`INSERT INTO submissions (id, student_class, student_number, student_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(student_class, student_number) DO UPDATE SET updated_at = excluded.updated_at`)
    .bind(crypto.randomUUID(), studentClass, studentNumber, studentName, now, now).run();
  const existing = await env.DB.prepare(`SELECT id, student_name FROM submissions WHERE student_class = ? AND student_number = ?`)
    .bind(studentClass, studentNumber).first();
  if (existing.student_name !== studentName) return json({ error: "このクラス・出席番号は別の名前で登録済みです。先生に確認してください。" }, 409);
  const id = existing.id;

  const column = step === 1 ? "step1_json" : step === 2 ? "step2_json" : "step3_json";
  const timeColumn = step === 1 ? "step1_submitted_at" : step === 2 ? "step2_submitted_at" : "step3_submitted_at";
  await env.DB.prepare(`UPDATE submissions SET ${column} = ?, ${timeColumn} = ?, updated_at = ? WHERE id = ?`)
    .bind(JSON.stringify(payload), now, now, id).run();

  const record = await readRecord(env.DB, studentClass, studentNumber);
  // 生徒側には提出状況のみを返し、保存済みの回答全文は返さない
  return json({ ok: true, record: {
    id: record.id, studentClass: record.studentClass, studentNumber: record.studentNumber, studentName: record.studentName,
    step1SubmittedAt: record.step1SubmittedAt, step2SubmittedAt: record.step2SubmittedAt, step3SubmittedAt: record.step3SubmittedAt,
    createdAt: record.createdAt, updatedAt: record.updatedAt, submittedAt: record.submittedAt
  }});
}
