# 嘉華體衛組環境評分（CHSH-Score）

全校 32 班巡察佐證、改善回報與評分輔助系統。

遠端倉庫：[jomogo0218/CHSH-Score](https://github.com/jomogo0218/CHSH-Score)  
版本紀錄：[`CHANGELOG.md`](CHANGELOG.md)

## 線上網址（Vercel）

- 正式站：https://chsh-score.vercel.app
- 部署面板：https://vercel.com/terry-s-projects11/chsh-score

> 尚未串接 GitHub 自動部署。之後若要「push 即上線」，請在 Vercel 加上 GitHub 連線並連結本倉庫。

## 規劃文件（接手必讀）

| 文件 | 說明 |
|---|---|
| [`CHANGELOG.md`](CHANGELOG.md) | **版本紀錄**（功能增減與修復） |
| [`docs/deployment-plan.md`](docs/deployment-plan.md) | 部署規劃書（架構、成本、MQTT、Roadmap、SOP） |
| [`docs/cloud-setup.md`](docs/cloud-setup.md) | R2／Firebase／EMQX 申請與權限注意事項 |

## 目前能力（v1.1）

- 組長登入後巡察：各項目可加多張照片（最多 15）、可先只放佐證不扣分
- 發布到雲端後全校可看；需扣分時再「標記缺失」
- 班級頁：相簿、說明、改善回報／銷案、QR
- 大廳／看板：真實 Firestore 資料（正式環境不混 demo）
- 上傳需登入；`users` 身分僅 admin／Console 建立

## 本機啟動

```bash
cp .env.example .env.local
npm install
npm run dev
```

開啟 [http://localhost:3000](http://localhost:3000)。未填雲端金鑰時可用 demo 預覽 UI；已接 Firebase 時大廳不顯示 demo。

## 環境變數

見 [`.env.example`](.env.example)。

| 變數 | 用途 |
|---|---|
| `NEXT_PUBLIC_FIREBASE_*` | Auth + Firestore |
| `R2_*` / `NEXT_PUBLIC_CF_R2_PUBLIC_URL` | Cloudflare R2 |
| `NEXT_PUBLIC_MQTT_*` / `MQTT_ADMIN_*` | EMQX Cloud（選配） |

## 權限模型

- 全校可讀班級／巡檢／留言
- 組長 `admin` 可寫巡檢；**`users` 文件不可自建**，請由 admin 在 Console 建立
- 同班衛生股長／導師可留言銷案（`role` + `class_id` 必須正確，且與留言身分一致）
- `/api/upload-r2`、`/api/mqtt-publish` 需帶 Firebase ID Token

請確保 Firebase Console 已發布專案根目錄最新的 `firestore.rules`。

## Roadmap

| 週次 | 內容 |
|---|---|
| 1（完成） | 骨架、模型、Rules、路由、R2／MQTT stub |
| 2（完成） | 評分／壓縮上傳／PWA／真實資料 |
| 3（軟體完成） | MQTT 軟體即時（**ESP32 門鈕暫緩**） |
| 4 | 實測、銷案演練、QR 推廣 |

照片儲存：**Cloudflare R2**。Firestore 查詢有 `limit` 與約 45 秒大廳／看板快取；班級相簿不走 TTL。

## 技術棧

Vercel · Firebase Auth/Firestore · Cloudflare R2 · EMQX Cloud · Next.js
