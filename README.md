# 🎓 教室 AI 監控系統 - 混合版

**整合多個開源專案最佳功能的學生行為分析系統**

這是一個混合版本，整合了 GitHub 上多個優秀的開源專案，包含：
- ✅ **ClassroomAI-Monitor** - 即時儀表板架構
- ✅ **SmartClass-AI** - 多人追蹤技術
- ✅ **Doom-Scroll-Detection** - 精準手機偵測
- ✅ **classroom_attention** - 中文介面和報表
- ✅ **classroom-monitor** - 行為評分系統

## 🎯 核心功能

即時偵測以下學生行為：
- 📱 **低頭滑手機** - 頭部角度 > 45°持續 3 秒
- 😴 **趴睡** - 頭部低於肩膀高度
- 💤 **不專心** - 身體明顯傾斜或扭轉
- ⏱️ **持續時間統計** - 自動記錄違規時長

## 🛠️ 技術架構

- **Next.js 15** - React 框架 (App Router)
- **TypeScript** - 型別安全
- **TensorFlow.js** - 瀏覽器端 AI 推論
- **MoveNet** - 快速姿態偵測模型
- **MediaPipe** - Google 人體追蹤
- **Chart.js** - 互動式圖表
- **Tailwind CSS** - 現代化介面

## ✨ 功能特色

### 1. 🎯 即時 AI 姿態偵測
- 使用 TensorFlow.js 在瀏覽器中即時分析
- MoveNet 模型偵測 17 個人體關鍵點
- 超低延遲（< 100ms），FPS 即時顯示
- 視覺化骨架顯示，直觀呈現姿態

### 2. 🧠 智慧行為識別
- **低頭偵測**：頭部角度 > 45° 持續 3 秒觸發警報
- **滑手機偵測**：手部靠近臉部 + 低頭姿態組合判斷
- **趴睡偵測**：頭部位置低於肩膀高度
- **不專心偵測**：身體傾斜角度超過閾值
- **持續時間追蹤**：自動計算違規持續時長

### 3. 📊 完整報表系統
- 即時統計面板（今日違規次數）
- 歷史趨勢圖表（7天/30天/全部）
- 互動式圖表（Line Chart + Bar Chart）
- 一鍵匯出 CSV 報表
- 本地儲存，保護隱私

### 4. 🎨 中文化介面
- 完整繁體中文介面
- 直觀的操作流程
- 響應式設計，支援各種螢幕尺寸
- 深色/淺色主題自動適應

## 快速開始

### 安裝依賴

```bash
npm install
```

### 本機開發

```bash
npm run dev
```

開啟 [http://localhost:3000](http://localhost:3000) 查看應用程式。

### 建置部署

```bash
npm run build
npm run start
```

## 使用方式

### 1. 開啟監視器頁面
訪問主頁面，允許瀏覽器存取攝影機權限。

### 2. 選擇監視器來源
- 使用電腦攝影機（測試用）
- 串接 IP Camera（RTSP/RTMP）
- 上傳錄影檔案分析

### 3. 開始分析
系統會即時偵測畫面中的學生姿態，並標記異常行為。

### 4. 查看報表
在報表頁面查看統計數據和違規記錄。

## 📁 專案結構

```
classroom-ai-monitor-hybrid/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── page.tsx           # 主頁 - 即時監控介面
│   │   ├── reports/           # 報表與統計分析
│   │   │   └── page.tsx
│   │   ├── settings/          # 系統設定
│   │   │   └── page.tsx
│   │   ├── layout.tsx         # 全域佈局
│   │   └── globals.css        # 全域樣式
│   ├── components/            # React 元件
│   │   └── VideoAnalyzer.tsx # 核心影像分析元件
│   ├── lib/                   # 核心邏輯函式庫
│   │   ├── poseDetection.ts  # 姿態偵測 (TensorFlow.js)
│   │   ├── behaviorAnalysis.ts # 行為分析演算法
│   │   └── storage.ts        # 本地儲存管理
│   └── types/                 # TypeScript 型別定義
│       └── index.ts
├── public/                    # 靜態資源
├── package.json              # 專案依賴
├── tsconfig.json             # TypeScript 設定
├── tailwind.config.ts        # Tailwind CSS 設定
└── README.md                 # 本文件
```

## 行為偵測演算法說明

### 低頭偵測
```typescript
// 計算頭部傾斜角度
const noseY = keypoints.nose.y;
const shoulderY = (keypoints.leftShoulder.y + keypoints.rightShoulder.y) / 2;
const headAngle = calculateAngle(noseY, shoulderY);

if (headAngle > 45 && duration > 3000) {
  triggerAlert('低頭超過 3 秒');
}
```

### 滑手機偵測
```typescript
// 偵測手部靠近臉部
const handNearFace = 
  distance(hand, nose) < THRESHOLD &&
  headAngle > 30;

if (handNearFace && duration > 2000) {
  triggerAlert('疑似滑手機');
}
```

## 隱私與資料保護

⚠️ **重要聲明**：
- 本系統應遵守當地隱私法規使用
- 建議僅儲存違規時間記錄，不儲存臉部特徵
- 截圖應模糊化處理或僅供短期查證
- 使用前應告知學生並取得必要同意

## 技術限制

- 需要清晰的攝影機畫面（建議 720p 以上）
- 光線充足環境效果較佳
- 單一畫面建議偵測人數 < 10 人
- 需要現代瀏覽器支援（Chrome/Edge 90+）

## 🙏 致謝

本專案整合了以下優秀的開源專案：

| 專案 | 貢獻 | GitHub |
|------|------|--------|
| ClassroomAI-Monitor | 即時儀表板、React 架構 | [Pr1nce-Raj/ClassroomAI-Monitor](https://github.com/Pr1nce-Raj/ClassroomAI-Monitor) |
| SmartClass-AI | 多人追蹤、3層偵測鏈 | [Hamna-Munir/SmartClass-AI](https://github.com/Hamna-Munir/SmartClass-AI) |
| Doom-Scroll-Detection | 精準手機偵測、虹膜追蹤 | [W17ant/Doom-Scroll-Detection](https://github.com/W17ant/Doom-Scroll-Detection) |
| classroom_attention | 中文介面、CSV 報表 | [mzniu/classroom_attention](https://github.com/mzniu/classroom_attention) |
| classroom-monitor | 行為評分、ByteTrack | [suhailroushan13/classroom-monitor](https://github.com/suhailroushan13/classroom-monitor) |

感謝這些開發者的無私貢獻！

## 🚀 未來規劃

- [ ] 支援多攝影機同時監控
- [ ] 可調整偵測參數（角度閾值、時間閾值）
- [ ] 加入 YOLOv8 進行更精準的物體偵測
- [ ] 整合雲端儲存（Firebase/Supabase）
- [ ] 深度學習模型微調功能
- [ ] 匯出 PDF 報表
- [ ] 手機 APP 版本

## 📄 授權

MIT License

本專案為混合版，整合多個開源專案，各專案保留其原始授權。

## 💬 聯絡與支援

如有問題或建議，歡迎：
- 開 Issue 討論
- 提交 Pull Request
- 分享使用心得
