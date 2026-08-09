# 📖 完整使用指南

## 🚀 安裝與啟動

### 系統需求

- **Node.js** 18.17 或更高版本
- **現代瀏覽器** Chrome 90+、Edge 90+ 或 Safari 14+
- **攝影機** 電腦內建或外接 USB 攝影機
- **網路環境** 首次載入需要網路下載 AI 模型（約 10MB）

### 步驟 1：下載專案

```bash
git clone https://github.com/jomogo0218/CHSH-Score.git
cd CHSH-Score
git checkout cursor/student-monitor-system-de48
```

### 步驟 2：安裝依賴

```bash
npm install
```

這將安裝所有必要的套件，包括：
- TensorFlow.js（AI 引擎）
- MediaPipe（姿態追蹤）
- Chart.js（圖表）
- React Webcam（攝影機控制）

### 步驟 3：啟動開發伺服器

```bash
npm run dev
```

### 步驟 4：開啟瀏覽器

訪問 [http://localhost:3000](http://localhost:3000)

首次開啟時，瀏覽器會要求攝影機權限，請點選「允許」。

---

## 🎯 功能使用說明

### 1. 主頁 - 即時監控

#### 啟動監控
1. 確保攝影機權限已開啟
2. 等待「AI 模型載入完成」（約 3-5 秒）
3. 點選「🎥 開始監控」按鈕
4. 畫面會顯示即時影像和骨架追蹤

#### 查看偵測結果
- **綠色骨架線**：正常偵測到的姿態
- **彩色警告框**：即時偵測到的違規行為
  - 🟠 橙色 = 低頭
  - 🔴 紅色 = 使用手機
  - 🟣 紫色 = 趴睡
  - 🔵 藍色 = 不專心

#### 統計面板
主頁頂部會顯示今日統計：
- 總違規次數
- 各類型違規細項

### 2. 報表頁面

點選導覽列的「📊 查看報表」進入報表頁面。

#### 時間篩選
- **最近 7 天**：查看本週趨勢
- **最近 30 天**：查看本月趨勢
- **全部**：查看所有歷史記錄

#### 圖表說明
- **趨勢圖**（折線圖）：顯示每日各類型違規次數變化
- **統計圖**（長條圖）：顯示選定期間的總計數據

#### 匯出報表
1. 點選「📥 匯出 CSV」按鈕
2. 系統會下載 CSV 檔案到您的電腦
3. 檔案名稱格式：`教室監控報告_2026-08-09.csv`
4. 可用 Excel 或 Google Sheets 開啟

#### CSV 報表內容
```
日期,開始時間,結束時間,總違規次數,低頭次數,使用手機次數,趴睡次數,不專心次數
2026-08-09,14:30:00,16:45:00,25,10,8,5,2
```

#### 清除資料
⚠️ 注意：此操作無法復原！
1. 點選「🗑️ 清除資料」按鈕
2. 確認對話框
3. 所有歷史記錄將被刪除

### 3. 設定頁面

點選「⚙️ 設定」查看系統資訊和開源專案來源。

---

## 🔧 進階設定

### 調整偵測靈敏度

偵測參數位於 `src/lib/behaviorAnalysis.ts` 檔案：

```typescript
const BEHAVIOR_THRESHOLDS = {
  headDownAngle: 45,        // 低頭角度閾值（度）
  headDownDuration: 3000,   // 低頭持續時間（毫秒）
  phoneUseDistance: 100,    // 手機偵測距離（像素）
  phoneUseDuration: 2000,   // 手機持續時間（毫秒）
  sleepingHeadHeight: 0.8,  // 趴睡頭部高度比例
  inattentiveAngle: 30,     // 不專心傾斜角度
};
```

修改後需要重新啟動開發伺服器：
```bash
npm run dev
```

### 自訂行為類型

在 `src/types/index.ts` 中定義新的行為類型：

```typescript
export interface BehaviorDetection {
  type: 'head_down' | 'using_phone' | 'sleeping' | 'inattentive' | '你的新類型';
  // ...
}
```

然後在 `src/lib/behaviorAnalysis.ts` 中實作偵測邏輯。

---

## 🎨 客製化介面

### 修改配色

編輯 `tailwind.config.ts`：

```typescript
theme: {
  extend: {
    colors: {
      primary: {
        500: '#你的顏色',
      },
    },
  },
}
```

### 修改統計卡片樣式

編輯 `src/app/globals.css` 的 `.stat-card` 類別。

---

## 📊 資料儲存說明

### 本地儲存（LocalStorage）

所有資料儲存在瀏覽器的 LocalStorage 中：
- **優點**：完全離線、保護隱私、不需伺服器
- **缺點**：清除瀏覽器資料會遺失、無法跨裝置同步

### 儲存鍵值

- 鍵名：`classroom_monitor_data`
- 格式：JSON 字串
- 位置：瀏覽器 DevTools → Application → Local Storage

### 手動備份資料

1. 開啟瀏覽器開發者工具（F12）
2. 前往 Application → Local Storage
3. 找到 `classroom_monitor_data`
4. 複製數值並儲存到文字檔

### 手動還原資料

1. 將備份的 JSON 字串複製
2. 在 Console 執行：
```javascript
localStorage.setItem('classroom_monitor_data', '你的JSON字串');
```
3. 重新整理頁面

---

## 🐛 常見問題

### Q1：攝影機無法啟動

**解決方法：**
1. 檢查瀏覽器是否有攝影機權限
2. 確認沒有其他程式佔用攝影機
3. 嘗試重新整理頁面（Ctrl + Shift + R）
4. 檢查 HTTPS 連線（localhost 可用 HTTP）

### Q2：AI 模型載入失敗

**解決方法：**
1. 檢查網路連線
2. 清除瀏覽器快取
3. 使用 Chrome 或 Edge 瀏覽器
4. 確認 TensorFlow.js 可以正常載入

### Q3：偵測不準確

**可能原因：**
- 光線不足
- 攝影機解析度太低
- 人物距離太遠或太近
- 畫面晃動

**改善方法：**
1. 增加環境光線
2. 使用高品質攝影機（720p 以上）
3. 調整攝影機位置和角度
4. 固定攝影機避免晃動

### Q4：FPS 太低

**優化方法：**
1. 關閉其他佔用 GPU 的程式
2. 使用性能較好的電腦
3. 降低瀏覽器視窗大小
4. 考慮使用更輕量的模型

### Q5：資料突然消失

**原因：**
- 清除了瀏覽器資料
- 使用無痕模式
- 瀏覽器自動清理

**預防方法：**
- 定期匯出 CSV 備份
- 不要在無痕模式使用
- 避免清除瀏覽器資料

---

## 🔒 隱私與安全

### 資料處理原則

1. **本地運算**：所有 AI 推論在瀏覽器中完成
2. **本地儲存**：資料僅存在您的電腦
3. **不上傳雲端**：沒有任何資料傳送到伺服器
4. **不儲存影像**：僅記錄違規次數和時間

### 法律遵循建議

⚠️ **重要提醒**：

1. **告知義務**：使用前應明確告知學生
2. **同意取得**：建議取得學生/家長書面同意
3. **用途限制**：僅用於教學管理，不得用於其他目的
4. **資料保護**：定期刪除不必要的歷史記錄

### GDPR / 個資法注意事項

- 不建議儲存可識別個人的資訊
- 應設定資料保存期限
- 提供資料查詢和刪除機制
- 遵守當地隱私法規

---

## 🚀 效能優化建議

### 硬體需求

- **最低配置**：
  - CPU: Intel i3 或同等級
  - RAM: 4GB
  - GPU: 整合顯卡
  - 攝影機: 480p

- **建議配置**：
  - CPU: Intel i5 或以上
  - RAM: 8GB
  - GPU: 獨立顯卡
  - 攝影機: 720p 或 1080p

### 瀏覽器建議

- ✅ **Chrome 90+** （最佳效能）
- ✅ **Edge 90+** （次佳）
- ⚠️ **Safari 14+** （功能有限）
- ❌ **Firefox** （TensorFlow.js 支援較差）

---

## 📞 技術支援

### 取得協助

如遇到問題，請：
1. 查閱本文件的常見問題
2. 在 GitHub 開 Issue
3. 附上錯誤訊息和瀏覽器 Console 截圖

### 回報 Bug

請提供：
- 作業系統版本
- 瀏覽器版本
- 錯誤訊息
- 重現步驟

### 功能建議

歡迎提交 Pull Request 或在 Issue 中討論新功能！

---

## 📚 相關資源

### 官方文件

- [TensorFlow.js](https://www.tensorflow.org/js)
- [MediaPipe](https://mediapipe.dev/)
- [Next.js](https://nextjs.org/)
- [Chart.js](https://www.chartjs.org/)

### 參考專案

- [ClassroomAI-Monitor](https://github.com/Pr1nce-Raj/ClassroomAI-Monitor)
- [SmartClass-AI](https://github.com/Hamna-Munir/SmartClass-AI)
- [Doom-Scroll-Detection](https://github.com/W17ant/Doom-Scroll-Detection)
- [classroom_attention](https://github.com/mzniu/classroom_attention)
- [classroom-monitor](https://github.com/suhailroushan13/classroom-monitor)

---

## 🎓 教學影片（未來計畫）

- [ ] 安裝教學
- [ ] 基礎使用
- [ ] 進階設定
- [ ] 報表分析
- [ ] 常見問題排除

---

**更新日期**：2026-08-09  
**版本**：v1.0.0
