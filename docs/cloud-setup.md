# 雲端服務申請與設定（第 1 週）

對應部署規劃書第二章：Cloudflare R2、Firebase、EMQX Cloud。

## 1. Cloudflare R2（照片儲存）

1. 註冊／登入 [Cloudflare](https://dash.cloudflare.com/)，進入 **R2 Object Storage**。
2. 建立 Bucket，名稱：`school-clean-photos`。
3. **Settings → Public Access**：開啟 R2.dev Subdomain，或綁定自訂網域（例如 `photos.clean.school.edu.tw`）。
4. **Manage R2 API Tokens**：建立擁有 Object Read & Write 的 Token，記下：
   - Access Key ID → `R2_ACCESS_KEY_ID`
   - Secret Access Key → `R2_SECRET_ACCESS_KEY`
5. 在帳號 Overview 取得 Account ID → `R2_ACCOUNT_ID`。
6. 將公開網址填入 `NEXT_PUBLIC_CF_R2_PUBLIC_URL`。

本週 `/api/upload-r2` 為 stub；第 2 週才接真實上傳與前端壓縮。

## 2. Firebase（Auth + Firestore）

1. 進入 [Firebase Console](https://console.firebase.google.com/)，建立專案 `school-clean-system`。
2. 新增 Web App，複製設定到 `.env.local` 的 `NEXT_PUBLIC_FIREBASE_*`。
3. 開啟 **Firestore Database**（Production mode），貼上專案根目錄的 `firestore.rules`。
4. 開啟 **Authentication → Sign-in method**，啟用 Email/Password。
5. 建立組長帳號（Email + 密碼）。
6. 在 Firestore 建立 `users/{uid}` 文件：

```json
{
  "display_name": "體育衛生組長",
  "role": "admin"
}
```

權限規則以 `users/{uid}.role == 'admin'` 判斷寫入（本週採此方式，方便本機測試，無需 Custom Claims）。

## 3. EMQX Cloud（MQTT Broker）

1. 註冊 [EMQX Cloud](https://www.emqx.com/en/cloud)，建立 **Serverless** 免費叢集。
2. **Authentication** 建立兩組用戶：
   - `admin_inspector`：Publish + Subscribe（組長 App）
   - `school_client`：Subscribe only（全校螢幕／學生）
3. 選配第 3 週硬體時，可再加 `button_user`：Publish only（ESP32）。
4. 記下 WebSocket 位址（通常 `wss://<cluster>.emqx.cloud:8084/mqtt`）→ `NEXT_PUBLIC_MQTT_URL`。
5. 將訂閱端帳密填入 `NEXT_PUBLIC_MQTT_USER` / `NEXT_PUBLIC_MQTT_PASS`；組長發布帳密填入 `MQTT_ADMIN_*`（僅 server 端使用）。

### Topic 約定

| Topic | 用途 |
|---|---|
| `school/clean/live_feed` | 全校動態牆／看板 |
| `school/clean/class/{classId}` | 單一班級小站 |
| `school/button/{classId}` | 門口按鈕觸發組長切班 |

本週僅完成 `lib/mqtt` 抽象；真實 WebSocket 推播於第 3 週串接。
ESP32 `button_user` 暫緩。軟體端：瀏覽器以 `school_client` 訂閱；發布走 `/api/mqtt-publish`（`MQTT_ADMIN_*`）。

## 4. 本機啟動

```bash
cp .env.example .env.local
# 填入上述金鑰後
npm install
npm run dev
```

未填雲端金鑰時，頁面仍可用 demo seed 預覽 UI。
