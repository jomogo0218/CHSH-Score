export interface Keypoint {
  x: number;
  y: number;
  score: number;
  name: string;
}

export interface Pose {
  keypoints: Keypoint[];
  score: number;
}

export interface BehaviorDetection {
  type: 'head_down' | 'using_phone' | 'sleeping' | 'inattentive';
  confidence: number;
  timestamp: number;
  duration: number;
  screenshot?: string;
}

export interface StudentBehavior {
  studentId: string;
  detections: BehaviorDetection[];
  startTime: number;
  endTime: number;
}

export interface AnalysisReport {
  date: string;
  totalStudents: number;
  violations: BehaviorDetection[];
  summary: {
    headDownCount: number;
    phoneUseCount: number;
    sleepingCount: number;
    inattentiveCount: number;
  };
}
