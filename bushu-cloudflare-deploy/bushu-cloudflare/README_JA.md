# 部首ワークシート Cloudflare版

生徒がクラス・出席番号・名前を入力し、各ステップを提出するとCloudflare D1に保存されます。教員はサーバー側で認証した後、全生徒の提出状況・回答を確認できます。

## 構成
- `public/index.html` : 既存ワークシート画面
- `functions/api/submit.js` : 生徒の各ステップ提出API
- `functions/api/teacher/login.js` : 教員ログイン
- `functions/api/teacher/submissions.js` : 教員専用の一覧取得・削除API
- `lib/teacher-auth.js` : HttpOnlyセッションCookieの署名・検証
- `schema.sql` : D1テーブル

## デプロイ手順

1. Cloudflareにログインし、Workers & PagesからD1データベースを作成します。データベース名は `bushu-worksheet-db` にします。
2. D1のSQL画面で `schema.sql` の内容を実行します。
3. D1の設定画面でDatabase IDをコピーし、`wrangler.jsonc` の `REPLACE_WITH_YOUR_D1_DATABASE_ID` に置き換えます。
4. このフォルダをGitHubリポジトリにアップロードします。
5. Cloudflare Workers & PagesからPagesプロジェクトを作成し、そのGitHubリポジトリを接続します。ビルド出力ディレクトリは `public` にします。Functionsディレクトリはプロジェクトのルートに置いたままにします。
6. プロジェクトのSettings > BindingsでD1 databaseを追加します。Variable nameは `DB`、対象は作成した `bushu-worksheet-db` です。保存後に再デプロイします。
7. ローカルのこのプロジェクトフォルダで次のコマンドを実行して、教員用パスワードとセッション署名秘密鍵をCloudflareへ登録します。

```bash
npx wrangler pages secret put TEACHER_PASSWORD --project-name bushu-worksheet
```

入力を求められたら、教員用パスワードを設定します（従来の `mogi` を使う場合は `mogi` と入力）。

```bash
npx wrangler pages secret put SESSION_SECRET --project-name bushu-worksheet
```

32文字以上のランダムな秘密値を入力します。パスワードや秘密値をHTMLやGitHubに書かないでください。

8. 再デプロイし、発行されたPages URLを開いてテストします。

## 動作確認
- 生徒画面でクラス・出席番号・名前を入力し、各STEPを提出する。
- 別ブラウザ・別端末からも提出し、教員用ダッシュボードに両方が表示されることを確認する。
- 教員用パスワードを誤入力した場合にログインできないことを確認する。
- CSV出力・個別削除・全データ削除もテストする。

## 注意
- クラス・出席番号・名前は本人確認ではありません。同じ情報を知る人がなりすます可能性があります。学校の正式な成績管理・個人情報管理システムの代わりには使わず、授業での形成的評価などに限定してください。
- 生徒の名前と回答は個人情報です。学校の方針に従って、利用目的・保存期間・閲覧者を決め、必要な許可を得てから実運用してください。
- 生徒の提出APIは公開ですが、教員用一覧取得・削除APIはサーバー側のセッション認証が必要です。`mogi` を含むパスワードはHTMLに埋め込まれていません。
- このパッケージはデプロイ用のプロジェクト一式です。Cloudflareアカウントへのログインやデプロイ操作そのものは、利用者のCloudflareアカウント上で行う必要があります。
