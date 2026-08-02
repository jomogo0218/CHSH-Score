# 校園智慧環境評分與相簿系統 — 詳細部署規劃書

專為體育衛生組長量身打造的「全校 32 班智慧校園環境評分與照片紀錄系統（無名小站風）」。

考量：單人管理（組長一人巡檢上傳）、全校 32 班接收、極速巡檢（MQTT 按鈕）、零／極低營運成本。

---

## 一、專案架構與營運成本概觀

```
                     【體育衛生組長】
                     (手機 Safari / Chrome PWA)
                                │
        ┌───────────────────────┴───────────────────────┐
        │ [照片] 前端 JavaScript 壓縮 (至 300KB)          │ [數據] 分數/評語/公告
        ▼                                               ▼
┌─────────────────────────┐                   ┌────────────────────┐
│ Cloudflare R2           │                   │ EMQX Cloud         │
│ (雲端照片儲存)          │                   │ (MQTT Broker)      │
│ 10 GB 免費空間 / 0流量費│                   │ 免費 Serverless    │
└────────────┬────────────┘                   └─────────┬──────────┘
             │ (取得 Photo URL)                         │ (即時廣播推播)
             └──────────────────┬───────────────────────┘
                                ▼
                   ┌─────────────────────────┐
                   │ Vercel / Firebase       │
                   │ (Next.js 網頁託管與後端) │
                   └────────────┬────────────┘
                                │ (WebSocket 即時渲染)
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
┌──────────────┐        ┌──────────────┐        ┌──────────────┐
│ 全校 32 班   │        │ 川堂/大廳     │        │ 組長 App 介面 │
│ 班級無名小站 │        │ 實時電子看板 │        │ (快速評分)   │
└──────────────┘        └──────────────┘        └──────────────┘
```

### 營運成本預算

| 服務項目 | 選用方案 | 預估費用 | 說明 |
|---|---|---|---|
| 網頁託管 | Vercel Hobby Free | $0 / 月 | Next.js |
| 照片儲存 | Cloudflare R2 | $0 / 月 | 10 GB 免流量費 |
| 即時 MQTT | EMQX Cloud Serverless | $0 / 月 | 全校廣播足夠 |
| 文字資料庫 | Firebase Firestore | $0 / 月 | 免費讀寫額度 |
| 巡檢按鈕（選配） | ESP32 × 32 | 約 NT$ 4,800（一次性） | 每組約 NT$ 150 |
| **總營運成本** | — | **NT$ 0 / 年** | 零固定月費 |

---

## 二、雲端與後端服務部署步驟

詳細逐步操作見同目錄 [`cloud-setup.md`](./cloud-setup.md)。

1. **Cloudflare R2**：Bucket `school-clean-photos`、Public Access、API Token
2. **Firebase**：專案 `school-clean-system`、Firestore、Auth、貼上根目錄 `firestore.rules`、建立組長 admin 帳號
3. **EMQX Cloud**：Serverless 叢集；帳號 `admin_inspector`（發布＋訂閱）、`school_client`（僅訂閱）

### MQTT Topic 約定

| Topic | 方向 | 用途 |
|---|---|---|
| `school/clean/live_feed` | 組長 → 全校 | 動態牆／看板 |
| `school/clean/class/{classId}` | 組長 → 該班 | 班級小站更新 |
| `school/button/{classId}` | ESP32 → 組長 App | 門口按鈕自動切班 |

---

## 三、前端 App 與網頁（Next.js + PWA）

### 環境變數

見專案根目錄 [`.env.example`](../.env.example)。

### 組長端上傳流程（第 2 週實作）

1. 前端 `browser-image-compression` 壓至 ≤ 300KB（最高 1920×1080 JPEG）
2. `POST /api/upload-r2` 上傳 Cloudflare R2
3. 寫入 Firebase Firestore
4. MQTT publish 至 `live_feed` 與 `class/{classId}`

容量粗估：32 班 × 4 張/天 × 0.3 MB ≈ 38.4 MB/天；每月約 0.77 GB；R2 免費 10 GB 可撐近一學年。

---

## 四、走廊 MQTT 巡檢實體按鈕（選配，**暫緩**）

```
[各班門口 ESP32] --按壓--> school/button/101 --> [組長手機自動跳轉 /inspect/101]
```

目前以 App 內選班巡檢為主。硬體恢復時：每班材料約 ESP32（NT$ 120）＋微動按鈕（NT$ 20）＋外殼；韌體連校園 Wi-Fi → EMQX → GPIO publish `TRIGGER`（debounce 2 秒）。

---

## 五、Firestore 資料模型

| Collection | Doc ID | 說明 |
|---|---|---|
| `classes` | `class_id` | 年級、班名、導師、大頭貼、橫幅 |
| `inspections` | `{date}_{classId}` | 當日總分、網誌、狀態 |
| `inspection_items` | auto-id | 區域扣分、照片 URL |
| `comments` | auto-id | 留言／改善回覆照片 |
| `users` | Auth uid | `role: admin` 等 |

狀態：`pass`｜`pending_fix`｜`fixed`

權限原則：全校可讀；組長（`users/{uid}.role == admin`）可寫巡檢。留言銷案：同班 `class_health_officer`／`teacher` 或 admin 可建立 comments，並可將巡檢 `status` 更新為 `fixed`。

---

## 六、功能模組（無名小站風）

1. **校園大廳 `/`**：今日優良榜、最新巡檢動態牆、年級班級名冊
2. **班級主頁 `/classes/[classId]`**：Banner、相簿、網誌、留言板
3. **川堂看板 `/board`**：大字分數／最新照片（之後接 MQTT）
4. **組長工具 `/inspect`**：快速選班評分（之後接壓縮上傳）
5. **登入 `/login`**：組長 Email／密碼

---

## 七、四週 Roadmap

| 週次 | 內容 |
|---|---|
| **第 1 週（已完成）** | 申請／接線說明 R2、Firebase、EMQX；Next.js 骨架；資料模型；Rules；路由殼層；R2／MQTT stub |
| **第 2 週（已完成）** | 組長評分／拍照／壓縮上傳 PWA；大廳／班級綁 Firestore＋本機 fallback |
| **第 3 週** | MQTT WebSocket **軟體**即時廣播（大廳／看板訂閱）；**ESP32 門鈕暫緩** |
| **第 4 週** | 3 班實測、銷案演練、QR Code 推廣上線 |

> ESP32 走廊按鈕為選配，硬體採購與校園 Wi-Fi 測試延後；不影響網頁評分／相簿／留言／銷案。

---

## 八、衛生組長日常 SOP（上線後）

1. 手機開啟 PWA（加入主畫面）並登入 admin
2. App 內選班（ESP32 門鈕暫緩；恢復後可按門口按鈕自動切班）
3. 發現缺失 → 拍照 → 自動壓縮上傳 → 發布
4. 約 0.5 秒內：大廳與該班主頁更新；衛生股長可留言上傳改善照片銷案

---

## 九、接手檢查清單

- [ ] 複製 `.env.example` → `.env.local` 並填入三雲金鑰（見 `cloud-setup.md`）
- [ ] Firebase Console 貼上 `firestore.rules`，建立組長帳號與 `users/{uid}` role=admin
- [ ] `npm install` → `npm run dev`
- [ ] 確認大廳／班級／看板／巡檢／登入可開
- [x] 第 2 週：實作壓縮上傳與真實 Firestore 寫入
- [x] 第 3 週：接 EMQX 真實 publish／subscribe（不含 ESP32）
- [x] Firestore 讀取防護：`limit`＋前端 TTL 快取
