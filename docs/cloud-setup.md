# 雲端服務申請與設定

對應部署規劃書：Cloudflare R2、Firebase、EMQX Cloud。  
產品名稱：**嘉華體衛組環境評分**。

## 1. Cloudflare R2（照片儲存）

1. 註冊／登入 [Cloudflare](https://dash.cloudflare.com/)，進入 **R2 Object Storage**。
2. 建立 Bucket，名稱：`school-clean-photos`。
3. **Settings → Public Access**：開啟 R2.dev Subdomain，或綁定自訂網域。
4. **Manage R2 API Tokens**：建立 Object Read & Write Token，記下：
   - Access Key ID → `R2_ACCESS_KEY_ID`
   - Secret Access Key → `R2_SECRET_ACCESS_KEY`
5. 帳號 Overview 的 Account ID → `R2_ACCOUNT_ID`。
6. 公開網址 → `NEXT_PUBLIC_CF_R2_PUBLIC_URL`。

`/api/upload-r2` 在正式環境會真實寫入 R2；前端會先壓縮至約 ≤300KB。  
**必須登入**（`Authorization: Bearer <Firebase ID Token>`）才能上傳。

## 2. Firebase（Auth + Firestore）

1. 進入 [Firebase Console](https://console.firebase.google.com/)，專案 `school-clean-system`。
2. 新增 Web App，複製設定到 `.env.local` 的 `NEXT_PUBLIC_FIREBASE_*`。
3. 開啟 **Firestore**，貼上並**發布**專案根目錄 `firestore.rules`。
4. **Authentication → Sign-in method** 啟用 Email/Password。
5. 建立組長帳號（Email + 密碼）。
6. 在 Firestore 建立 `users/{uid}`（文件 ID = Auth UID）：

```json
{
  "display_name": "體育衛生組長",
  "role": "admin"
}
```

### 權限注意（重要）

- **不可自建** `users`：一般登入者不能自己建立身分文件。
- 導師／衛生股長請由 **admin 在 Console 建立**，例如：

```json
{
  "display_name": "國一1班導師",
  "role": "teacher",
  "class_id": "j101"
}
```

`role` 可用：`admin`｜`teacher`｜`class_health_officer`｜`inspector`  
一般使用者最多只能改自己的 `display_name`，不能改 `role`／`class_id`。

Authorized domains 請加入：`chsh-score.vercel.app`（本機另有 `localhost`）。

## 3. EMQX Cloud（MQTT Broker，選配）

1. 註冊 [EMQX Cloud](https://www.emqx.com/en/cloud)，建立 **Serverless** 叢集。
2. **Authentication** 建立：
   - `admin_inspector`：Publish + Subscribe（僅 server 端 `MQTT_ADMIN_*`）
   - `school_client`：Subscribe only（前端訂閱）
3. WebSocket → `NEXT_PUBLIC_MQTT_URL`（通常 `wss://…:8084/mqtt`）。
4. 訂閱端：`NEXT_PUBLIC_MQTT_USER` / `NEXT_PUBLIC_MQTT_PASS`；發布：`MQTT_ADMIN_*`。

| Topic | 用途 |
|---|---|
| `school/clean/live_feed` | 全校動態牆／看板 |
| `school/clean/class/{classId}` | 單一班級 |
| `school/button/{classId}` | ESP32 門口按鈕（**暫緩**） |

`/api/mqtt-publish` 同樣需要登入，且僅允許學校約定 topic。

## 4. 本機啟動

```bash
cp .env.example .env.local
npm install
npm run dev
```

未填雲端金鑰時可用 demo 預覽；已接 Firebase 時大廳／看板不顯示 demo。
