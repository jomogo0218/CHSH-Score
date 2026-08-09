import * as poseDetection from '@tensorflow-models/pose-detection';
import '@tensorflow/tfjs-backend-webgl';
import * as tf from '@tensorflow/tfjs';

let detector: poseDetection.PoseDetector | null = null;

export async function initPoseDetector() {
  if (detector) return detector;

  try {
    await tf.ready();
    await tf.setBackend('webgl');

    const model = poseDetection.SupportedModels.MoveNet;
    detector = await poseDetection.createDetector(model, {
      modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
    });

    console.log('姿態偵測模型已載入');
    return detector;
  } catch (error) {
    console.error('載入姿態偵測模型失敗:', error);
    throw error;
  }
}

export async function detectPoses(video: HTMLVideoElement) {
  if (!detector) {
    throw new Error('姿態偵測器尚未初始化');
  }

  try {
    const poses = await detector.estimatePoses(video);
    return poses;
  } catch (error) {
    console.error('姿態偵測失敗:', error);
    return [];
  }
}

export function calculateAngle(pointA: { x: number; y: number }, pointB: { x: number; y: number }): number {
  const deltaY = pointB.y - pointA.y;
  const deltaX = pointB.x - pointA.x;
  const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);
  return Math.abs(angle);
}

export function calculateDistance(pointA: { x: number; y: number }, pointB: { x: number; y: number }): number {
  const deltaX = pointB.x - pointA.x;
  const deltaY = pointB.y - pointA.y;
  return Math.sqrt(deltaX * deltaX + deltaY * deltaY);
}

export function getKeypointByName(keypoints: any[], name: string) {
  return keypoints.find((kp) => kp.name === name);
}
