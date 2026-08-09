'use client';

import Link from 'next/link';

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <nav className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-blue-600">⚙️ 系統設定</h1>
            <Link href="/" className="btn btn-primary">
              ← 返回監控
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="card mb-6">
          <h2 className="text-2xl font-bold mb-4">偵測參數</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                低頭角度閾值（度）
              </label>
              <input
                type="range"
                min="30"
                max="60"
                defaultValue="45"
                className="w-full"
                disabled
              />
              <p className="text-sm text-gray-500 mt-1">目前值：45° (功能開發中)</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                低頭持續時間閾值（秒）
              </label>
              <input
                type="range"
                min="1"
                max="10"
                defaultValue="3"
                className="w-full"
                disabled
              />
              <p className="text-sm text-gray-500 mt-1">目前值：3 秒 (功能開發中)</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                手機偵測距離閾值（像素）
              </label>
              <input
                type="range"
                min="50"
                max="200"
                defaultValue="100"
                className="w-full"
                disabled
              />
              <p className="text-sm text-gray-500 mt-1">目前值：100 像素 (功能開發中)</p>
            </div>
          </div>
        </div>

        <div className="card mb-6">
          <h2 className="text-2xl font-bold mb-4">關於系統</h2>
          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b">
              <span className="font-medium">系統版本</span>
              <span className="text-gray-600">v1.0.0 混合版</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="font-medium">技術架構</span>
              <span className="text-gray-600">Next.js + TensorFlow.js + MediaPipe</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="font-medium">AI 模型</span>
              <span className="text-gray-600">MoveNet (Single Pose Lightning)</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="font-medium">開源專案</span>
              <span className="text-gray-600">整合多個 GitHub 專案</span>
            </div>
          </div>
        </div>

        <div className="card">
          <h2 className="text-2xl font-bold mb-4">整合的開源專案</h2>
          <div className="space-y-3">
            <div className="border-l-4 border-blue-500 pl-4">
              <h3 className="font-bold">ClassroomAI-Monitor</h3>
              <p className="text-sm text-gray-600">
                提供即時儀表板和 React 前端架構
              </p>
              <a
                href="https://github.com/Pr1nce-Raj/ClassroomAI-Monitor"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 text-sm hover:underline"
              >
                查看原始碼 →
              </a>
            </div>

            <div className="border-l-4 border-green-500 pl-4">
              <h3 className="font-bold">SmartClass-AI</h3>
              <p className="text-sm text-gray-600">
                多人追蹤和情緒分析功能
              </p>
              <a
                href="https://github.com/Hamna-Munir/SmartClass-AI"
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-600 text-sm hover:underline"
              >
                查看原始碼 →
              </a>
            </div>

            <div className="border-l-4 border-red-500 pl-4">
              <h3 className="font-bold">Doom-Scroll-Detection</h3>
              <p className="text-sm text-gray-600">
                精準的手機使用偵測和虹膜追蹤
              </p>
              <a
                href="https://github.com/W17ant/Doom-Scroll-Detection"
                target="_blank"
                rel="noopener noreferrer"
                className="text-red-600 text-sm hover:underline"
              >
                查看原始碼 →
              </a>
            </div>

            <div className="border-l-4 border-purple-500 pl-4">
              <h3 className="font-bold">classroom_attention</h3>
              <p className="text-sm text-gray-600">
                中文介面和 CSV 報表產生功能
              </p>
              <a
                href="https://github.com/mzniu/classroom_attention"
                target="_blank"
                rel="noopener noreferrer"
                className="text-purple-600 text-sm hover:underline"
              >
                查看原始碼 →
              </a>
            </div>

            <div className="border-l-4 border-orange-500 pl-4">
              <h3 className="font-bold">classroom-monitor</h3>
              <p className="text-sm text-gray-600">
                行為評分系統和 ByteTrack 追蹤
              </p>
              <a
                href="https://github.com/suhailroushan13/classroom-monitor"
                target="_blank"
                rel="noopener noreferrer"
                className="text-orange-600 text-sm hover:underline"
              >
                查看原始碼 →
              </a>
            </div>
          </div>
        </div>

        <div className="mt-8 bg-blue-50 border-2 border-blue-300 rounded-lg p-6">
          <h3 className="text-xl font-bold text-blue-800 mb-2">💡 使用提示</h3>
          <ul className="list-disc list-inside space-y-2 text-blue-700">
            <li>確保攝影機權限已開啟</li>
            <li>使用 Chrome 或 Edge 瀏覽器以獲得最佳效能</li>
            <li>光線充足的環境可提高偵測準確度</li>
            <li>定期匯出 CSV 報表以備份資料</li>
            <li>偵測參數調整功能將在後續版本推出</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
