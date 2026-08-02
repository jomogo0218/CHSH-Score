# 嘉華體衛組環境評分 — 詳細部署規劃書

專為體育衛生組長打造的「全校 32 班巡察佐證／改善回報／評分輔助」系統。

考量：單人管理（組長巡檢上傳）、全校 32 班接收、極速巡檢（MQTT 選配）、零／極低營運成本。

版本紀錄見根目錄 [`CHANGELOG.md`](../CHANGELOG.md)。

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
│ 班級專屬頁面 │        │ 實時電子看板 │        │ (快速評分)   │
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
2. `POST /api/upload-r2` 上傳 Cloudflare R2（**需登入**）
3. 寫入 Firebase Firestore（日期為台灣時區；每項目可多張照片）
4. MQTT publish 至 `live_feed` 與 `class/{classId}`（需登入；未設定 MQTT 則 stub）

容量粗估：32 班 × 每日多張 × 0.3 MB；請依實際張數觀察 R2 用量（免費約 10 GB）。

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
| `inspections` | `{date}_{classId}` | 當日總分、說明、狀態（台灣日期） |
| `inspection_items` | auto-id | 區域扣分、照片 URL（同一項目多張＝多筆） |
| `comments` | auto-id | 留言／改善回覆照片 |
| `users` | Auth uid | `role`、`display_name`、選填 `class_id` |

狀態：`pass`｜`pending_fix`｜`fixed`  
（只放佐證、未標記缺失時通常為 `pass`，方便班級先改善。）

權限原則：全校可讀；組長（`users/{uid}.role == admin`）可寫巡檢。  
`users` **不可自建**；導師／衛生股長由 admin 建立並指定 `class_id`。  
留言銷案：同班 `class_health_officer`／`teacher` 或 admin；`author_role` 須與 users 文件一致。

---

## 六、功能模組

1. **校園大廳 `/`**：今日優良榜、最新巡察、年級班級名冊（正式環境不混 demo）
2. **班級主頁 `/classes/[classId]`**：Banner、相簿、說明、改善回報、QR
3. **川堂看板 `/board`**：最新分數／狀態
4. **組長工具 `/inspect`**：選班、多圖佐證、可選扣分後發布
5. **QR 推廣 `/qr`**：班級／巡察連結
6. **登入 `/login`**：組長 Email／密碼

---

## 七、四週 Roadmap

| 週次 | 內容 |
|---|---|
| **第 1 週（已完成）** | R2、Firebase、EMQX 說明；骨架；模型；Rules；路由 |
| **第 2 週（已完成）** | 評分／拍照／壓縮上傳 PWA；真實 Firestore |
| **第 3 週（軟體完成）** | MQTT 軟體即時；**ESP32 門鈕暫緩** |
| **第 4 週** | 實測、銷案演練、QR 推廣 |

> ESP32 為選配，暫緩不影響網頁評分／相簿／留言／銷案。

---

## 八、衛生組長日常 SOP（上線後）

1. 手機開啟 PWA 並登入 admin
2. 選班 → 各項目「加照片」（可多張；預設不扣分）
3. 需要扣分時再按「標記缺失」→ 發布
4. 班級看照片改善後，導師／衛生股長登入於班級頁回報銷案

---

## 九、接手檢查清單

- [ ] 複製 `.env.example` → `.env.local` 並填入金鑰（見 `cloud-setup.md`）
- [ ] Firebase Console **發布**最新 `firestore.rules`
- [ ] 建立組長 `users/{uid}` `role=admin`；導師帳號由 admin 代建
- [ ] Authorized domains 含 `chsh-score.vercel.app`
- [ ] `npm install` → `npm run dev`；正式站確認登入後可上傳
- [x] 壓縮上傳與 Firestore 寫入
- [x] MQTT 軟體 publish／subscribe（不含 ESP32）
- [x] 上傳 API 登入驗證、大廳去 demo、台灣時區日期
- [ ] 參考 [`CHANGELOG.md`](../CHANGELOG.md) 對照目前版本
