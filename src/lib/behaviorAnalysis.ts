import { Pose, BehaviorDetection } from '@/types';
import { calculateAngle, calculateDistance, getKeypointByName } from './poseDetection';

const BEHAVIOR_THRESHOLDS = {
  headDownAngle: 45, // 低頭角度閾值（度）
  headDownDuration: 3000, // 低頭持續時間（毫秒）
  phoneUseDistance: 100, // 手機使用距離閾值（像素）
  phoneUseDuration: 2000, // 手機使用持續時間（毫秒）
  sleepingHeadHeight: 0.8, // 趴睡頭部高度比例
  inattentiveAngle: 30, // 不專心身體傾斜角度
};

interface BehaviorState {
  type: BehaviorDetection['type'];
  startTime: number;
  lastDetected: number;
}

const behaviorStates = new Map<string, BehaviorState>();

export function analyzeBehavior(poses: Pose[]): BehaviorDetection[] {
  const detections: BehaviorDetection[] = [];
  const currentTime = Date.now();

  poses.forEach((pose, index) => {
    if (!pose.keypoints || pose.keypoints.length === 0) return;

    const keypoints = pose.keypoints;
    const studentId = `student_${index}`;

    // 檢測低頭
    const headDownDetection = detectHeadDown(keypoints, studentId, currentTime);
    if (headDownDetection) detections.push(headDownDetection);

    // 檢測滑手機
    const phoneUseDetection = detectPhoneUse(keypoints, studentId, currentTime);
    if (phoneUseDetection) detections.push(phoneUseDetection);

    // 檢測趴睡
    const sleepingDetection = detectSleeping(keypoints, studentId, currentTime);
    if (sleepingDetection) detections.push(sleepingDetection);

    // 檢測不專心
    const inattentiveDetection = detectInattentive(keypoints, studentId, currentTime);
    if (inattentiveDetection) detections.push(inattentiveDetection);
  });

  // 清理過期的狀態
  cleanupOldStates(currentTime);

  return detections;
}

function detectHeadDown(keypoints: any[], studentId: string, currentTime: number): BehaviorDetection | null {
  const nose = getKeypointByName(keypoints, 'nose');
  const leftShoulder = getKeypointByName(keypoints, 'left_shoulder');
  const rightShoulder = getKeypointByName(keypoints, 'right_shoulder');

  if (!nose || !leftShoulder || !rightShoulder) return null;
  if (nose.score < 0.3 || leftShoulder.score < 0.3 || rightShoulder.score < 0.3) return null;

  const shoulderCenter = {
    x: (leftShoulder.x + rightShoulder.x) / 2,
    y: (leftShoulder.y + rightShoulder.y) / 2,
  };

  const headAngle = calculateAngle(shoulderCenter, nose);

  if (headAngle > BEHAVIOR_THRESHOLDS.headDownAngle) {
    const stateKey = `${studentId}_head_down`;
    const state = behaviorStates.get(stateKey);

    if (!state) {
      behaviorStates.set(stateKey, {
        type: 'head_down',
        startTime: currentTime,
        lastDetected: currentTime,
      });
      return null;
    }

    state.lastDetected = currentTime;
    const duration = currentTime - state.startTime;

    if (duration >= BEHAVIOR_THRESHOLDS.headDownDuration) {
      return {
        type: 'head_down',
        confidence: Math.min(nose.score, leftShoulder.score, rightShoulder.score),
        timestamp: currentTime,
        duration,
      };
    }
  } else {
    behaviorStates.delete(`${studentId}_head_down`);
  }

  return null;
}

function detectPhoneUse(keypoints: any[], studentId: string, currentTime: number): BehaviorDetection | null {
  const nose = getKeypointByName(keypoints, 'nose');
  const leftWrist = getKeypointByName(keypoints, 'left_wrist');
  const rightWrist = getKeypointByName(keypoints, 'right_wrist');
  const leftShoulder = getKeypointByName(keypoints, 'left_shoulder');
  const rightShoulder = getKeypointByName(keypoints, 'right_shoulder');

  if (!nose || !leftShoulder || !rightShoulder) return null;

  const wrist = leftWrist?.score > rightWrist?.score ? leftWrist : rightWrist;
  if (!wrist || wrist.score < 0.3) return null;

  const shoulderCenter = {
    x: (leftShoulder.x + rightShoulder.x) / 2,
    y: (leftShoulder.y + rightShoulder.y) / 2,
  };

  const headAngle = calculateAngle(shoulderCenter, nose);
  const handFaceDistance = calculateDistance(wrist, nose);

  const isPhoneUse = headAngle > 30 && handFaceDistance < BEHAVIOR_THRESHOLDS.phoneUseDistance;

  if (isPhoneUse) {
    const stateKey = `${studentId}_phone_use`;
    const state = behaviorStates.get(stateKey);

    if (!state) {
      behaviorStates.set(stateKey, {
        type: 'using_phone',
        startTime: currentTime,
        lastDetected: currentTime,
      });
      return null;
    }

    state.lastDetected = currentTime;
    const duration = currentTime - state.startTime;

    if (duration >= BEHAVIOR_THRESHOLDS.phoneUseDuration) {
      return {
        type: 'using_phone',
        confidence: Math.min(nose.score, wrist.score),
        timestamp: currentTime,
        duration,
      };
    }
  } else {
    behaviorStates.delete(`${studentId}_phone_use`);
  }

  return null;
}

function detectSleeping(keypoints: any[], studentId: string, currentTime: number): BehaviorDetection | null {
  const nose = getKeypointByName(keypoints, 'nose');
  const leftShoulder = getKeypointByName(keypoints, 'left_shoulder');
  const rightShoulder = getKeypointByName(keypoints, 'right_shoulder');

  if (!nose || !leftShoulder || !rightShoulder) return null;
  if (nose.score < 0.3 || leftShoulder.score < 0.3) return null;

  const shoulderCenter = {
    x: (leftShoulder.x + rightShoulder.x) / 2,
    y: (leftShoulder.y + rightShoulder.y) / 2,
  };

  // 頭部低於肩膀一定程度視為趴睡
  const isSleeping = nose.y > shoulderCenter.y * BEHAVIOR_THRESHOLDS.sleepingHeadHeight;

  if (isSleeping) {
    return {
      type: 'sleeping',
      confidence: Math.min(nose.score, leftShoulder.score),
      timestamp: currentTime,
      duration: 0,
    };
  }

  return null;
}

function detectInattentive(keypoints: any[], studentId: string, currentTime: number): BehaviorDetection | null {
  const leftShoulder = getKeypointByName(keypoints, 'left_shoulder');
  const rightShoulder = getKeypointByName(keypoints, 'right_shoulder');
  const leftHip = getKeypointByName(keypoints, 'left_hip');
  const rightHip = getKeypointByName(keypoints, 'right_hip');

  if (!leftShoulder || !rightShoulder || !leftHip || !rightHip) return null;
  if (leftShoulder.score < 0.3 || rightShoulder.score < 0.3) return null;

  const shoulderAngle = Math.abs(leftShoulder.y - rightShoulder.y);
  const hipAngle = Math.abs(leftHip.y - rightHip.y);

  // 身體明顯傾斜視為不專心
  const isInattentive = shoulderAngle > BEHAVIOR_THRESHOLDS.inattentiveAngle || 
                        hipAngle > BEHAVIOR_THRESHOLDS.inattentiveAngle;

  if (isInattentive) {
    return {
      type: 'inattentive',
      confidence: Math.min(leftShoulder.score, rightShoulder.score),
      timestamp: currentTime,
      duration: 0,
    };
  }

  return null;
}

function cleanupOldStates(currentTime: number) {
  const timeout = 5000; // 5 秒未偵測到則清除狀態
  
  behaviorStates.forEach((state, key) => {
    if (currentTime - state.lastDetected > timeout) {
      behaviorStates.delete(key);
    }
  });
}

export function getBehaviorLabel(type: BehaviorDetection['type']): string {
  const labels = {
    head_down: '低頭',
    using_phone: '使用手機',
    sleeping: '趴睡',
    inattentive: '不專心',
  };
  return labels[type] || type;
}

export function getBehaviorColor(type: BehaviorDetection['type']): string {
  const colors = {
    head_down: '#f59e0b',
    using_phone: '#ef4444',
    sleeping: '#8b5cf6',
    inattentive: '#3b82f6',
  };
  return colors[type] || '#6b7280';
}
