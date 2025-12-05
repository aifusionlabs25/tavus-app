'use client';

import { useEffect, useRef, useState } from 'react';

interface ChromaKeyPlayerProps {
    streamUrl: string;
    width?: number;
    height?: number;
    className?: string;
}

export default function ChromaKeyPlayer({ streamUrl, width = 1280, height = 720, className = '' }: ChromaKeyPlayerProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const requestRef = useRef<number | undefined>(undefined);
    const [isPlaying, setIsPlaying] = useState(false);

    useEffect(() => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas) return;

        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;

        const processFrame = () => {
            if (video.paused || video.ended) return;

            // Draw video frame to canvas
            ctx.drawImage(video, 0, 0, width, height);

            // Get pixel data
            const frame = ctx.getImageData(0, 0, width, height);
            const data = frame.data;
            const l = data.length / 4;

            for (let i = 0; i < l; i++) {
                const r = data[i * 4 + 0];
                const g = data[i * 4 + 1];
                const b = data[i * 4 + 2];

                // Simple Green Screen Algorithm
                // If Green is significantly dominant over Red and Blue
                if (g > 100 && g > r * 1.4 && g > b * 1.4) {
                    data[i * 4 + 3] = 0; // Set Alpha to 0 (Transparent)
                }
            }

            // Put processed frame back
            ctx.putImageData(frame, 0, 0);

            requestRef.current = requestAnimationFrame(processFrame);
        };

        const onPlay = () => {
            setIsPlaying(true);
            processFrame();
        };

        video.addEventListener('play', onPlay);

        return () => {
            video.removeEventListener('play', onPlay);
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [width, height]);

    // Auto-play when streamUrl changes
    useEffect(() => {
        if (videoRef.current && streamUrl) {
            videoRef.current.src = streamUrl;
            videoRef.current.play().catch(e => console.error("Auto-play failed:", e));
        }
    }, [streamUrl]);

    return (
        <div className={`relative ${className}`} style={{ width, height }}>
            {/* Hidden Video Source */}
            <video
                ref={videoRef}
                width={width}
                height={height}
                className="hidden"
                playsInline
                muted
                crossOrigin="anonymous"
            />

            {/* Visible Canvas Output */}
            <canvas
                ref={canvasRef}
                width={width}
                height={height}
                className="w-full h-full object-contain pointer-events-none"
            />
        </div>
    );
}
