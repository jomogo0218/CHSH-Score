import { BehaviorDetection, AnalysisReport } from '@/types';

const STORAGE_KEY = 'classroom_monitor_data';

export interface StoredSession {
  id: string;
  date: string;
  startTime: number;
  endTime: number;
  detections: BehaviorDetection[];
  summary: {
    totalDetections: number;
    headDownCount: number;
    phoneUseCount: number;
    sleepingCount: number;
    inattentiveCount: number;
  };
}

export function saveDetection(detection: BehaviorDetection) {
  const sessions = getSessions();
  const today = new Date().toISOString().split('T')[0];
  
  let currentSession = sessions.find(s => s.date === today);
  
  if (!currentSession) {
    currentSession = {
      id: `session_${Date.now()}`,
      date: today,
      startTime: Date.now(),
      endTime: Date.now(),
      detections: [],
      summary: {
        totalDetections: 0,
        headDownCount: 0,
        phoneUseCount: 0,
        sleepingCount: 0,
        inattentiveCount: 0,
      },
    };
    sessions.push(currentSession);
  }

  currentSession.detections.push(detection);
  currentSession.endTime = Date.now();
  currentSession.summary.totalDetections++;
  
  switch (detection.type) {
    case 'head_down':
      currentSession.summary.headDownCount++;
      break;
    case 'using_phone':
      currentSession.summary.phoneUseCount++;
      break;
    case 'sleeping':
      currentSession.summary.sleepingCount++;
      break;
    case 'inattentive':
      currentSession.summary.inattentiveCount++;
      break;
  }

  saveSessions(sessions);
}

export function getSessions(): StoredSession[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('讀取資料失敗:', error);
    return [];
  }
}

export function saveSessions(sessions: StoredSession[]) {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  } catch (error) {
    console.error('儲存資料失敗:', error);
  }
}

export function clearSessions() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

export function exportToCSV(sessions: StoredSession[]): string {
  const headers = ['日期', '開始時間', '結束時間', '總違規次數', '低頭次數', '使用手機次數', '趴睡次數', '不專心次數'];
  
  const rows = sessions.map(session => {
    const startTime = new Date(session.startTime).toLocaleTimeString('zh-TW');
    const endTime = new Date(session.endTime).toLocaleTimeString('zh-TW');
    
    return [
      session.date,
      startTime,
      endTime,
      session.summary.totalDetections,
      session.summary.headDownCount,
      session.summary.phoneUseCount,
      session.summary.sleepingCount,
      session.summary.inattentiveCount,
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

export function downloadCSV(sessions: StoredSession[]) {
  const csv = exportToCSV(sessions);
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `教室監控報告_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
