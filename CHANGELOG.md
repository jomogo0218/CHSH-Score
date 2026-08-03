# 版本紀錄

專案：**嘉華體衛組環境評分**（CHSH-Score）  
正式站：https://chsh-score.vercel.app

格式大致依 [Keep a Changelog](https://keepachangelog.com/zh-TW/1.1.0/)，版本號採語意化（SemVer）。

---

## [Unreleased]

### 變更
- 評分項目改為三項：**教室**、**外掃**、**廁所**

---

## [1.1.0] — 2026-08-03

### 新增
- 每個巡察項目可上傳多張照片（最多 15 張），可單張刪除
- 上傳 API／MQTT 發布 API 需 Firebase 登入（`Authorization: Bearer`）
- 台灣時區日期（`Asia/Taipei`），避免清晨寫成「昨天」
- Firebase 規則：禁止自建 `users`、禁止自行改 `role`／`class_id`
- 留言身分必須與 `users/{uid}` 一致

### 變更
- 網站名稱改為「嘉華體衛組環境評分」
- 介面改為手機優先、緊湊簡潔
- 加照片**不再自動標記缺失／扣分**；需手動「標記缺失」才扣分（狀態可先維持合格，給班級改善時間）
- 正式環境大廳／看板**不再混入 demo** 假資料
- 同日重發巡察會清掉舊的 `inspection_items` 再寫入

### 修復
- 巡察權限診斷（inspect 頁顯示是否為 admin）
- 相簿／快取導致剛發布看不到的問題（班級頁不走 TTL）

---

## [1.0.0] — 2026-08-02

### 新增
- 巡察拍照、壓縮（≤300KB）、Cloudflare R2 上傳
- Firestore 巡察／細項／留言銷案
- 班級 QR、全校 QR 推廣頁（`/qr`）
- MQTT 軟體即時訂閱／發布（ESP32 門鈕暫緩）
- PWA（可加入主畫面）
- 設定狀態提示（`/api/setup-status`）
- 登入狀態與錯誤說明強化

### 變更
- 產品主軸對齊：巡察佐證 → 改善回報 → 評分輔助
- Firestore 讀取加 `limit` 與約 45 秒前端快取

---

## [0.1.0] — 2026-08（第 1 週）

### 新增
- Next.js App Router 骨架與 32 班名冊
- Firestore 型別與初始 `firestore.rules`
- 大廳／班級／看板／巡檢／登入路由殼層
- R2／MQTT stub 與 `docs/cloud-setup.md`、`docs/deployment-plan.md`

---

## 尚未排入版本（已知後續）

- PWA Service Worker 改 network-first，減少「更新後仍看舊版」
- 同日重發加上確認提示
- 僅佐證／待改善語意（例如「觀察中」狀態）
- ESP32 走廊按鈕（刻意暫緩）
