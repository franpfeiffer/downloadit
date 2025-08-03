'use client';

import React, { useState } from 'react';
import { Video, Download, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import axios from 'axios';

interface VideoInfo {
    videoId: string;
    title: string;
    thumbnail: string;
    duration: number;
    author: string;
    viewCount: number;
    formats: VideoFormat[];
}

interface VideoFormat {
    quality: string;
    format: string;
    hasVideo: boolean;
    hasAudio: boolean;
    itag: string | number;
    originalQuality?: string;
    needsAudioMerge?: boolean;
}

const validateYouTubeUrl = (url: string) => {
    const patterns = [
        /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
        /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([a-zA-Z0-9_-]{11})/,
    ];

    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) {
            return { isValid: true, videoId: match[1] };
        }
    }

    return { isValid: false, videoId: null };
};

const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
};

const formatFileSize = (bytes: number): string => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
};

const formatViews = (views: number): string => {
    if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
    if (views >= 1000) return `${(views / 1000).toFixed(1)}K`;
    return views.toString();
};

export default function Home() {
    const [url, setUrl] = useState('');
    const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
    const [loading, setLoading] = useState(false);
    const [downloading, setDownloading] = useState<string | null>(null);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleGetInfo = async () => {
        setError('');
        setSuccess('');

        const validation = validateYouTubeUrl(url);
        if (!validation.isValid) {
            setError('Por favor ingresa una URL válida de YouTube');
            return;
        }

        setLoading(true);
        try {
            const response = await axios.get(`/api/video-info?videoId=${validation.videoId}`);

            if (response.data.success) {
                setVideoInfo(response.data.data);
            } else {
                setError(response.data.error || 'Error al obtener información del video');
            }
        } catch (err) {
            setError('Error al conectar con el servidor');
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async (format: VideoFormat) => {
        if (!videoInfo) return;

        const formatId = format.itag.toString();
        setDownloading(formatId);
        setError('');
        setSuccess('');

        try {
            console.log('Iniciando descarga para:', format);

            const response = await axios.post('/api/download', {
                videoId: videoInfo.videoId,
                itag: formatId,
                title: videoInfo.title,
                format: format.format
            });

            console.log('Respuesta del servidor:', response.data);

            if (response.data.success && response.data.data.downloadUrl) {
                const link = document.createElement('a');
                link.href = response.data.data.downloadUrl;
                link.download = response.data.data.filename;
                link.target = '_blank';

                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

                setSuccess(`Descarga iniciada: ${format.quality}`);
            } else {
                setError('No se pudo obtener la URL de descarga');
            }

            setTimeout(() => setSuccess(''), 5000);

        } catch (err: any) {
            console.error('Error en descarga:', err);
            setError('Error al iniciar la descarga: ' + (err.response?.data?.error || err.message));
        } finally {
            setDownloading(null);
        }
    };

    return (
        <div className="min-h-screen bg-gray-900">
            <div className="container mx-auto px-4 py-8 max-w-4xl">
                <div className="text-center mb-8">
                    <div className="flex items-center justify-center gap-3 mb-4">
                        <Video className="w-10 h-10 text-red-500" />
                        <h1 className="text-3xl font-bold text-white">YouTube Downloader</h1>
                    </div>
                    <p className="text-gray-400">Descarga videos de YouTube fácilmente</p>
                </div>

                <div className="bg-gray-800 p-6 rounded-lg shadow mb-6 border border-gray-700">
                    <div className="flex gap-4">
                        <input
                            type="text"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder="https://www.youtube.com/watch?v=..."
                            className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-white placeholder-gray-400"
                            onKeyPress={(e) => e.key === 'Enter' && handleGetInfo()}
                        />
                        <button
                            onClick={handleGetInfo}
                            disabled={loading || !url.trim()}
                            className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2 transition-colors"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Video className="w-4 h-4" />}
                            Obtener Info
                        </button>
                    </div>

                    {error && (
                        <div className="mt-4 p-3 bg-red-900 border border-red-700 rounded flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-red-400" />
                            <span className="text-red-300">{error}</span>
                        </div>
                    )}

                    {success && (
                        <div className="mt-4 p-3 bg-green-900 border border-green-700 rounded flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-400" />
                            <span className="text-green-300">{success}</span>
                        </div>
                    )}
                </div>

                {videoInfo && (
                    <div className="bg-gray-800 rounded-lg shadow overflow-hidden border border-gray-700">
                        <div className="p-6">
                            <div className="flex gap-6">
                                <img
                                    src={videoInfo.thumbnail}
                                    alt={videoInfo.title}
                                    className="w-48 h-36 object-cover rounded border border-gray-600"
                                />
                                <div className="flex-1">
                                    <h2 className="text-xl font-bold mb-2 text-white">{videoInfo.title}</h2>
                                    <p className="text-gray-400 mb-2">Por {videoInfo.author}</p>
                                    <div className="text-sm text-gray-500">
                                        <span>{formatViews(videoInfo.viewCount)} visualizaciones</span>
                                        <span className="mx-2">•</span>
                                        <span>{formatDuration(videoInfo.duration)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="border-t border-gray-700 p-6">
                            <h3 className="text-lg font-semibold mb-4 text-white">Opciones de Descarga</h3>
                            <div className="space-y-3">
                                {videoInfo.formats.map((format, index) => (
                                    <div key={index} className="flex items-center justify-between p-3 border border-gray-600 rounded bg-gray-700">
                                        <div>
                                            <span className="font-medium text-white">{format.quality}</span>
                                            <span className="text-gray-400 ml-2">({format.format})</span>
                                            <span className="text-sm text-gray-500 ml-2">
                                            </span>
                                            <div className="text-xs text-gray-600 mt-1">
                                                {format.hasVideo && format.hasAudio && 'Video + Audio'}
                                                {format.hasVideo && !format.hasAudio && 'Solo Video'}
                                                {!format.hasVideo && format.hasAudio && 'Solo Audio'}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleDownload(format)}
                                            disabled={downloading === format.itag.toString()}
                                            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:opacity-50 flex items-center gap-2 transition-colors min-w-[100px] justify-center"
                                        >
                                            {downloading === format.itag.toString() ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <Download className="w-4 h-4" />
                                            )}
                                            {downloading === format.itag.toString() ? 'Descargando...' : 'Descargar'}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                <div className="mt-8 p-4 bg-yellow-900 border border-yellow-700 rounded">
                    <p className="text-sm text-yellow-300">
                        <strong>Aviso:</strong> Esta herramienta es solo para fines educativos.
                        Por favor respeta las leyes de derechos de autor y los Términos de Servicio de YouTube.
                    </p>
                </div>
            </div>
        </div>
    );
}
