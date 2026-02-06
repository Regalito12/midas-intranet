
import { useRef, useState, useEffect } from 'react';
import { showToast } from '../../utils/toast';

interface CameraModalProps {
    onCapture: (file: File) => void;
    onClose: () => void;
}

export function CameraModal({ onCapture, onClose }: CameraModalProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [isStreaming, setIsStreaming] = useState(false);

    useEffect(() => {
        startCamera();
        return () => {
            stopCamera();
        };
    }, []);

    const startCamera = async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 640 } }
            });
            setStream(mediaStream);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }
            setIsStreaming(true);
        } catch (error) {
            console.error('Error accessing camera:', error);
            showToast('No se pudo acceder a la cámara', 'error');
            onClose();
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
        setIsStreaming(false);
    };

    const handleCapture = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            const context = canvas.getContext('2d');

            if (context) {
                // Set canvas dimensions to match video
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;

                // Draw video frame to canvas
                context.drawImage(video, 0, 0, canvas.width, canvas.height);

                // Convert to file
                canvas.toBlob((blob) => {
                    if (blob) {
                        const file = new File([blob], "profile-photo.jpg", { type: "image/jpeg" });
                        onCapture(file);
                        onClose();
                    }
                }, 'image/jpeg', 0.9);
            }
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-2xl max-w-lg w-full">
                <div className="p-4 bg-gray-50 dark:bg-gray-700 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center">
                        <i className="fas fa-camera mr-2 text-primary"></i> Tomar Foto
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition"
                    >
                        <i className="fas fa-times text-xl"></i>
                    </button>
                </div>

                <div className="relative bg-black aspect-video flex items-center justify-center">
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                    />
                    <canvas ref={canvasRef} className="hidden" />

                    {!isStreaming && (
                        <div className="absolute inset-0 flex items-center justify-center text-white">
                            <i className="fas fa-spinner fa-spin text-3xl"></i>
                        </div>
                    )}
                </div>

                <div className="p-6 flex justify-center space-x-4">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 rounded-full border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleCapture}
                        className="px-6 py-2 rounded-full bg-primary text-white font-bold hover:bg-[#009640] shadow-lg transform hover:scale-105 transition flex items-center"
                    >
                        <i className="fas fa-camera mr-2"></i> Capturar
                    </button>
                </div>
            </div>
        </div>
    );
}
