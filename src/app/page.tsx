'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import VideoAnalyzer from '@/components/VideoAnalyzer';
import { BehaviorDetection } from '@/types';
import { getSessions, StoredSession } from '@/lib/storage';

export default function HomePage() {
  const [recentDetections, setRecentDetections] = useState<BehaviorDetection[]>([]);
  const [todayStats, setTodayStats] = useState({
    total: 0,
    headDown: 0,
    phoneUse: 0,
    sleeping: 0,
    inattentive: 0,
  });

  useEffect(() => {
    updateStats();
  }, [recentDetections]);

  const updateStats = () => {
    const sessions = getSessions();
    const today = new Date().toISOString().split('T')[0];
    const todaySession = sessions.find(s => s.date === today);

    if (todaySession) {
      setTodayStats({
        total: todaySession.summary.totalDetections,
        headDown: todaySession.summary.headDownCount,
        phoneUse: todaySession.summary.phoneUseCount,
        sleeping: todaySession.summary.sleepingCount,
        inattentive: todaySession.summary.inattentiveCount,
      });
    }
  };

  const handleDetection = (detections: BehaviorDetection[]) => {
    setRecentDetections(detections);
    updateStats();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <nav className="bg-white shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-blue-600">
              🎓 教室 AI 監控系統
            </h1>
            <div className="flex gap-4">
              <Link href="/reports" className="btn btn-primary">
                📊 查看報表
              </Link>
              <Link href="/settings" className="btn bg-gray-600 text-white hover:bg-gray-700">
                ⚙️ 設定
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">即時監控</h2>
          <p className="text-gray-600">
            使用 AI 姿態偵測技術，即時分析學生行為並產生報表
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-8">
          <div className="stat-card from-blue-500 to-blue-600">
            <div className="text-sm opacity-90">總違規次數</div>
            <div className="text-4xl font-bold mt-2">{todayStats.total}</div>
          </div>

          <div className="stat-card from-orange-500 to-orange-600">
            <div className="text-sm opacity-90">低頭</div>
            <div className="text-4xl font-bold mt-2">{todayStats.headDown}</div>
          </div>

          <div className="stat-card from-red-500 to-red-600">
            <div className="text-sm opacity-90">使用手機</div>
            <div className="text-4xl font-bold mt-2">{todayStats.phoneUse}</div>
          </div>

          <div className="stat-card from-purple-500 to-purple-600">
            <div className="text-sm opacity-90">趴睡 / 不專心</div>
            <div className="text-4xl font-bold mt-2">
              {todayStats.sleeping + todayStats.inattentive}
            </div>
          </div>
        </div>

        <div className="card">
          <VideoAnalyzer onDetection={handleDetection} />
        </div>

        <div className="mt-8 card">
          <h3 className="text-2xl font-bold text-gray-800 mb-4">功能說明</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border-l-4 border-blue-500 pl-4">
              <h4 className="font-bold text-lg mb-2">🎯 精準偵測</h4>
              <p className="text-gray-600">
                使用 TensorFlow.js 和 MediaPipe 進行即時姿態偵測，準確識別學生行為
              </p>
            </div>

            <div className="border-l-4 border-green-500 pl-4">
              <h4 className="font-bold text-lg mb-2">📊 自動報表</h4>
              <p className="text-gray-600">
                自動記錄所有偵測結果，產生詳細的 CSV 報表供匯出分析
              </p>
            </div>

            <div className="border-l-4 border-purple-500 pl-4">
              <h4 className="font-bold text-lg mb-2">⚡ 即時警報</h4>
              <p className="text-gray-600">
                偵測到異常行為時立即顯示警報，包含持續時間統計
              </p>
            </div>

            <div className="border-l-4 border-orange-500 pl-4">
              <h4 className="font-bold text-lg mb-2">🔒 隱私保護</h4>
              <p className="text-gray-600">
                所有資料儲存在本機，不上傳雲端，保護學生隱私
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 bg-yellow-50 border-2 border-yellow-300 rounded-lg p-6">
          <h3 className="text-xl font-bold text-yellow-800 mb-2">⚠️ 使用須知</h3>
          <ul className="list-disc list-inside space-y-2 text-yellow-700">
            <li>使用前請確保已告知學生並取得必要同意</li>
            <li>建議僅在教學用途下使用，避免侵犯隱私</li>
            <li>偵測結果僅供參考，不應作為唯一評判標準</li>
            <li>確保攝影機畫面清晰且光線充足以提高準確度</li>
          </ul>
        </div>
      </main>

      <footer className="bg-gray-800 text-white py-8 mt-16">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p>教室 AI 監控系統 v1.0 - 混合版</p>
          <p className="text-sm text-gray-400 mt-2">
            整合 ClassroomAI、SmartClass-AI、Doom-Scroll Detection 等開源專案
          </p>
        </div>
      </footer>
    </div>
  );
}
