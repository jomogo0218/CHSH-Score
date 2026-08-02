# 校園環境無名小站（CHSH-Score）

全校 32 班智慧校園環境評分與照片紀錄系統 — 無名小站風格（相簿／網誌／留言）。

遠端倉庫：[jomogo0218/CHSH-Score](https://github.com/jomogo0218/CHSH-Score)

## 線上網址（Vercel）

- 正式站：https://chsh-score.vercel.app
- 部署面板：https://vercel.com/terry-s-projects11/chsh-score

> 尚未串接 GitHub 自動部署。之後若要「push 即上線」，請在 Vercel 帳號加上 GitHub Login Connection，再把專案連到 `jomogo0218/CHSH-Score`。

## 規劃文件（接手必讀）

| 文件 | 說明 |
|---|---|
| [`docs/deployment-plan.md`](docs/deployment-plan.md) | 完整部署規劃書（架構、成本、MQTT、Roadmap、SOP） |
| [`docs/cloud-setup.md`](docs/cloud-setup.md) | R2／Firebase／EMQX 申請步驟 |

## 第 1～2 週交付

### 第 1 週：雲端與基礎建設
- Next.js App Router + TypeScript + Tailwind
- Firestore 型別、`firestore.rules`（公開讀／組長 `admin` 寫）
- 32 班名冊常數 + 5 班 demo seed
- 路由殼層：大廳、班級、看板、巡檢、登入
- MQTT topic／client 抽象（第 3 週才連真實 EMQX）
- 雲端申請步驟：[`docs/cloud-setup.md`](docs/cloud-setup.md)

### 第 2 週：評分／壓縮上傳／PWA
- 組長評分表單：區域扣分、相機拍照、網誌、發布
- 前端 `browser-image-compression`（≤300KB）
- `/api/upload-r2`：有 R2 憑證則真實上傳，否則 data URL 本機預覽
- 已登入 Firebase 時寫入 Firestore；否則存 localStorage 供大廳／班級預覽
- PWA：`manifest.webmanifest` + Service Worker（可加入主畫面）

## 本機啟動

```bash
cp .env.example .env.local
npm install
npm run dev
```

開啟 [http://localhost:3000](http://localhost:3000)。未填雲端金鑰時仍可用 demo 資料預覽 UI。

## 環境變數

見 [`.env.example`](.env.example)。重點：

| 變數 | 用途 |
|---|---|
| `NEXT_PUBLIC_FIREBASE_*` | Auth + Firestore |
| `R2_*` / `NEXT_PUBLIC_CF_R2_PUBLIC_URL` | Cloudflare R2 |
| `NEXT_PUBLIC_MQTT_*` / `MQTT_ADMIN_*` | EMQX Cloud |

## 權限模型

- 全校可讀班級／巡檢／留言
- 組長 `admin` 可寫入巡檢與完整管理
- 同班衛生股長／導師可留言銷案（需 `users/{uid}` 設 `role` + `class_id`，並在 Console 貼上最新 `firestore.rules`）

## Roadmap

| 週次 | 內容 |
|---|---|
| 1（已完成） | 雲端說明、骨架、模型、Rules、路由殼層、R2／MQTT stub |
| 2（已完成） | 組長評分／壓縮上傳 PWA；介面綁真實資料 |
| 3 | MQTT WebSocket 軟體即時（**ESP32 門鈕暫緩**） |
| 4 | 實測、銷案演練、QR Code 上線 |

照片儲存維持 **Cloudflare R2**。Firestore 查詢已加 `limit` 與約 45 秒前端快取，避免短時間狂重整耗盡免費讀取額度。

## 技術棧

Vercel · Firebase Auth/Firestore · Cloudflare R2 · EMQX Cloud · Next.js
