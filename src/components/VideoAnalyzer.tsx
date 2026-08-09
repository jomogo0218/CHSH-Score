'use client';

import { useRef, useEffect, useState } from 'react';
import Webcam from 'react-webcam';
import { initPoseDetector, detectPoses } from '@/lib/poseDetection';
import { analyzeBehavior, getBehaviorLabel, getBehaviorColor } from '@/lib/behaviorAnalysis';
import { BehaviorDetection } from '@/types';
import { saveDetection } from '@/lib/storage';

interface VideoAnalyzerProps {
  onDetection?: (detections: BehaviorDetection[]) => void;
}

export default function VideoAnalyzer({ onDetection }: VideoAnalyzerProps) {
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [currentDetections, setCurrentDetections] = useState<BehaviorDetection[]>([]);
  const [fps, setFps] = useState(0);
  const animationFrameRef = useRef<number>();
  const lastTimeRef = useRef<number>(Date.now());
  const frameCountRef = useRef<number>(0);

  useEffect(() => {
    const loadModel = async () => {
      try {
        await initPoseDetector();
        setIsModelLoaded(true);
      } catch (error) {
        console.error('模型載入失敗:', error);
        alert('AI 模型載入失敗，請重新整理頁面');
      }
    };

    loadModel();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  const analyze = async () => {
    if (
      !webcamRef.current ||
      !canvasRef.current ||
      !webcamRef.current.video ||
      !isModelLoaded
    ) {
      return;
    }

    const video = webcamRef.current.video;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx || video.readyState !== 4) {
      animationFrameRef.current = requestAnimationFrame(analyze);
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    try {
      const poses = await detectPoses(video);
      const detections = analyzeBehavior(poses);

      setCurrentDetections(detections);

      if (detections.length > 0 && onDetection) {
        onDetection(detections);
        detections.forEach(detection => saveDetection(detection));
      }

      drawPoses(ctx, poses);
      drawDetections(ctx, detections);

      frameCountRef.current++;
      const now = Date.now();
      if (now - lastTimeRef.current >= 1000) {
        setFps(frameCountRef.current);
        frameCountRef.current = 0;
        lastTimeRef.current = now;
      }
    } catch (error) {
      console.error('分析失敗:', error);
    }

    if (isAnalyzing) {
      animationFrameRef.current = requestAnimationFrame(analyze);
    }
  };

  const drawPoses = (ctx: CanvasRenderingContext2D, poses: any[]) => {
    poses.forEach(pose => {
      if (!pose.keypoints) return;

      pose.keypoints.forEach((keypoint: any) => {
        if (keypoint.score > 0.3) {
          ctx.beginPath();
          ctx.arc(keypoint.x, keypoint.y, 5, 0, 2 * Math.PI);
          ctx.fillStyle = '#00ff00';
          ctx.fill();
        }
      });

      const connections = [
        ['nose', 'left_eye'],
        ['nose', 'right_eye'],
        ['left_eye', 'left_ear'],
        ['right_eye', 'right_ear'],
        ['left_shoulder', 'right_shoulder'],
        ['left_shoulder', 'left_elbow'],
        ['right_shoulder', 'right_elbow'],
        ['left_elbow', 'left_wrist'],
        ['right_elbow', 'right_wrist'],
        ['left_shoulder', 'left_hip'],
        ['right_shoulder', 'right_hip'],
        ['left_hip', 'right_hip'],
      ];

      connections.forEach(([start, end]) => {
        const startPoint = pose.keypoints.find((kp: any) => kp.name === start);
        const endPoint = pose.keypoints.find((kp: any) => kp.name === end);

        if (startPoint?.score > 0.3 && endPoint?.score > 0.3) {
          ctx.beginPath();
          ctx.moveTo(startPoint.x, startPoint.y);
          ctx.lineTo(endPoint.x, endPoint.y);
          ctx.strokeStyle = '#00ff00';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      });
    });
  };

  const drawDetections = (ctx: CanvasRenderingContext2D, detections: BehaviorDetection[]) => {
    detections.forEach((detection, index) => {
      const y = 50 + index * 40;
      const label = getBehaviorLabel(detection.type);
      const color = getBehaviorColor(detection.type);

      ctx.fillStyle = color;
      ctx.fillRect(10, y - 25, 200, 35);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px Arial';
      ctx.fillText(`⚠️ ${label}`, 20, y);

      if (detection.duration > 0) {
        const seconds = (detection.duration / 1000).toFixed(1);
        ctx.font = '12px Arial';
        ctx.fillText(`持續 ${seconds} 秒`, 20, y + 15);
      }
    });
  };

  const startAnalysis = () => {
    if (!isModelLoaded) {
      alert('AI 模型尚未載入完成，請稍候');
      return;
    }
    setIsAnalyzing(true);
    analyze();
  };

  const stopAnalysis = () => {
    setIsAnalyzing(false);
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <Webcam
          ref={webcamRef}
          className="hidden"
          screenshotFormat="image/jpeg"
          videoConstraints={{
            width: 1280,
            height: 720,
            facingMode: 'user',
          }}
        />
        <canvas
          ref={canvasRef}
          className="rounded-lg shadow-2xl max-w-full h-auto border-4 border-blue-500"
        />
        
        <div className="absolute top-4 right-4 bg-black/70 text-white px-3 py-1 rounded-lg text-sm">
          FPS: {fps}
        </div>

        {!isModelLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
            <div className="text-white text-xl font-bold animate-pulse">
              正在載入 AI 模型...
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-4">
        {!isAnalyzing ? (
          <button
            onClick={startAnalysis}
            disabled={!isModelLoaded}
            className="btn btn-primary text-lg px-8 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            🎥 開始監控
          </button>
        ) : (
          <button
            onClick={stopAnalysis}
            className="btn btn-danger text-lg px-8 py-3"
          >
            ⏹️ 停止監控
          </button>
        )}
      </div>

      {currentDetections.length > 0 && (
        <div className="w-full max-w-2xl bg-red-50 border-2 border-red-300 rounded-lg p-4">
          <h3 className="text-lg font-bold text-red-700 mb-2">⚠️ 即時警報</h3>
          <div className="space-y-2">
            {currentDetections.map((detection, index) => (
              <div
                key={index}
                className="flex items-center justify-between bg-white rounded p-3 shadow"
              >
                <span className="font-medium" style={{ color: getBehaviorColor(detection.type) }}>
                  {getBehaviorLabel(detection.type)}
                </span>
                {detection.duration > 0 && (
                  <span className="text-sm text-gray-600">
                    持續 {(detection.duration / 1000).toFixed(1)} 秒
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
