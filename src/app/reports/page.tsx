'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getSessions, downloadCSV, clearSessions, StoredSession } from '@/lib/storage';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export default function ReportsPage() {
  const [sessions, setSessions] = useState<StoredSession[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'all'>('week');

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = () => {
    const allSessions = getSessions();
    setSessions(allSessions);
  };

  const getFilteredSessions = () => {
    const now = new Date();
    const filtered = sessions.filter(session => {
      const sessionDate = new Date(session.date);
      const diffDays = Math.floor((now.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24));

      switch (selectedPeriod) {
        case 'week':
          return diffDays <= 7;
        case 'month':
          return diffDays <= 30;
        default:
          return true;
      }
    });

    return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const filteredSessions = getFilteredSessions();

  const chartData = {
    labels: filteredSessions.map(s => s.date).reverse(),
    datasets: [
      {
        label: '低頭',
        data: filteredSessions.map(s => s.summary.headDownCount).reverse(),
        borderColor: 'rgb(251, 146, 60)',
        backgroundColor: 'rgba(251, 146, 60, 0.5)',
      },
      {
        label: '使用手機',
        data: filteredSessions.map(s => s.summary.phoneUseCount).reverse(),
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'rgba(239, 68, 68, 0.5)',
      },
      {
        label: '趴睡',
        data: filteredSessions.map(s => s.summary.sleepingCount).reverse(),
        borderColor: 'rgb(139, 92, 246)',
        backgroundColor: 'rgba(139, 92, 246, 0.5)',
      },
      {
        label: '不專心',
        data: filteredSessions.map(s => s.summary.inattentiveCount).reverse(),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
      },
    ],
  };

  const barData = {
    labels: ['低頭', '使用手機', '趴睡', '不專心'],
    datasets: [
      {
        label: '總次數',
        data: [
          filteredSessions.reduce((sum, s) => sum + s.summary.headDownCount, 0),
          filteredSessions.reduce((sum, s) => sum + s.summary.phoneUseCount, 0),
          filteredSessions.reduce((sum, s) => sum + s.summary.sleepingCount, 0),
          filteredSessions.reduce((sum, s) => sum + s.summary.inattentiveCount, 0),
        ],
        backgroundColor: [
          'rgba(251, 146, 60, 0.8)',
          'rgba(239, 68, 68, 0.8)',
          'rgba(139, 92, 246, 0.8)',
          'rgba(59, 130, 246, 0.8)',
        ],
      },
    ],
  };

  const handleExport = () => {
    if (filteredSessions.length === 0) {
      alert('沒有資料可匯出');
      return;
    }
    downloadCSV(filteredSessions);
  };

  const handleClearData = () => {
    if (confirm('確定要清除所有資料嗎？此操作無法復原！')) {
      clearSessions();
      loadSessions();
      alert('資料已清除');
    }
  };

  const totalStats = {
    total: filteredSessions.reduce((sum, s) => sum + s.summary.totalDetections, 0),
    headDown: filteredSessions.reduce((sum, s) => sum + s.summary.headDownCount, 0),
    phoneUse: filteredSessions.reduce((sum, s) => sum + s.summary.phoneUseCount, 0),
    sleeping: filteredSessions.reduce((sum, s) => sum + s.summary.sleepingCount, 0),
    inattentive: filteredSessions.reduce((sum, s) => sum + s.summary.inattentiveCount, 0),
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <nav className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-blue-600">📊 監控報表</h1>
            <Link href="/" className="btn btn-primary">
              ← 返回監控
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedPeriod('week')}
              className={`px-4 py-2 rounded-lg ${
                selectedPeriod === 'week'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              最近 7 天
            </button>
            <button
              onClick={() => setSelectedPeriod('month')}
              className={`px-4 py-2 rounded-lg ${
                selectedPeriod === 'month'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              最近 30 天
            </button>
            <button
              onClick={() => setSelectedPeriod('all')}
              className={`px-4 py-2 rounded-lg ${
                selectedPeriod === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              全部
            </button>
          </div>

          <div className="flex gap-2">
            <button onClick={handleExport} className="btn btn-success">
              📥 匯出 CSV
            </button>
            <button onClick={handleClearData} className="btn btn-danger">
              🗑️ 清除資料
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <div className="stat-card from-gray-700 to-gray-800">
            <div className="text-sm opacity-90">總違規</div>
            <div className="text-3xl font-bold mt-2">{totalStats.total}</div>
          </div>

          <div className="stat-card from-orange-500 to-orange-600">
            <div className="text-sm opacity-90">低頭</div>
            <div className="text-3xl font-bold mt-2">{totalStats.headDown}</div>
          </div>

          <div className="stat-card from-red-500 to-red-600">
            <div className="text-sm opacity-90">使用手機</div>
            <div className="text-3xl font-bold mt-2">{totalStats.phoneUse}</div>
          </div>

          <div className="stat-card from-purple-500 to-purple-600">
            <div className="text-sm opacity-90">趴睡</div>
            <div className="text-3xl font-bold mt-2">{totalStats.sleeping}</div>
          </div>

          <div className="stat-card from-blue-500 to-blue-600">
            <div className="text-sm opacity-90">不專心</div>
            <div className="text-3xl font-bold mt-2">{totalStats.inattentive}</div>
          </div>
        </div>

        {filteredSessions.length > 0 ? (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <div className="card">
                <h3 className="text-xl font-bold mb-4">趨勢圖</h3>
                <Line
                  data={chartData}
                  options={{
                    responsive: true,
                    plugins: {
                      legend: {
                        position: 'top' as const,
                      },
                      title: {
                        display: true,
                        text: '每日違規次數趨勢',
                      },
                    },
                  }}
                />
              </div>

              <div className="card">
                <h3 className="text-xl font-bold mb-4">統計圖</h3>
                <Bar
                  data={barData}
                  options={{
                    responsive: true,
                    plugins: {
                      legend: {
                        display: false,
                      },
                      title: {
                        display: true,
                        text: '各類型違規總計',
                      },
                    },
                  }}
                />
              </div>
            </div>

            <div className="card">
              <h3 className="text-xl font-bold mb-4">詳細記錄</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-3 text-left">日期</th>
                      <th className="px-4 py-3 text-center">總計</th>
                      <th className="px-4 py-3 text-center">低頭</th>
                      <th className="px-4 py-3 text-center">使用手機</th>
                      <th className="px-4 py-3 text-center">趴睡</th>
                      <th className="px-4 py-3 text-center">不專心</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSessions.map((session, index) => (
                      <tr key={session.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-4 py-3 font-medium">{session.date}</td>
                        <td className="px-4 py-3 text-center font-bold">
                          {session.summary.totalDetections}
                        </td>
                        <td className="px-4 py-3 text-center text-orange-600">
                          {session.summary.headDownCount}
                        </td>
                        <td className="px-4 py-3 text-center text-red-600">
                          {session.summary.phoneUseCount}
                        </td>
                        <td className="px-4 py-3 text-center text-purple-600">
                          {session.summary.sleepingCount}
                        </td>
                        <td className="px-4 py-3 text-center text-blue-600">
                          {session.summary.inattentiveCount}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <div className="card text-center py-16">
            <div className="text-6xl mb-4">📊</div>
            <h3 className="text-2xl font-bold text-gray-700 mb-2">沒有資料</h3>
            <p className="text-gray-500">開始使用監控功能後，報表會自動產生</p>
            <Link href="/" className="btn btn-primary mt-6 inline-block">
              前往監控
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
