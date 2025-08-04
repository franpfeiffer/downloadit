'use client';

import React, { useState } from 'react';
import { Video, Download, Loader2, AlertCircle, CheckCircle, Copy, Check } from 'lucide-react';

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
    const [showDonations, setShowDonations] = useState(false);
    const [copiedAddress, setCopiedAddress] = useState('');

    const copyToClipboard = async (text: string, type: string) => {
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
            } else {
                const textArea = document.createElement('textarea');
                textArea.value = text;
                textArea.style.position = 'fixed';
                textArea.style.left = '-999999px';
                textArea.style.top = '-999999px';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                document.execCommand('copy');
                textArea.remove();
            }
            setCopiedAddress(type);
            setTimeout(() => setCopiedAddress(''), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            textArea.style.top = '-999999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            document.execCommand('copy');
            textArea.remove();
            setCopiedAddress(type);
            setTimeout(() => setCopiedAddress(''), 2000);
        }
    };

    const getFormatDisplay = (format: VideoFormat) => {
        if (format.quality === 'Audio Only') {
            return 'mp3';
        }
        return format.format;
    };

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
            const response = await fetch(`/api/video-info?videoId=${validation.videoId}`);
            const data = await response.json();

            if (data.success) {
                setVideoInfo(data.data);
            } else {
                setError(data.error || 'Error al obtener información del video');
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
            const response = await fetch('/api/download', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    videoId: videoInfo.videoId,
                    itag: formatId,
                    title: videoInfo.title,
                    format: format.quality === 'Audio Only' ? 'Audio Only' : format.format
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            const blob = await response.blob();

            if (blob.size === 0) {
                throw new Error('El archivo descargado está vacío');
            }

            let filename: string;
            if (format.quality === 'Audio Only') {
                filename = `${videoInfo.title.replace(/[^\w\s-]/g, '').replace(/\s+/g, '_')}.mp3`;
            } else {
                filename = `${videoInfo.title.replace(/[^\w\s-]/g, '').replace(/\s+/g, '_')}.${format.format}`;
            }

            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            window.URL.revokeObjectURL(url);

            setSuccess(`Descarga completada: ${format.quality}`);
            setTimeout(() => setSuccess(''), 5000);

        } catch (err: any) {
            setError('Error al descargar: ' + err.message);
        } finally {
            setDownloading(null);
        }
    };

    return (
        <div className="min-h-screen bg-black relative">
            <div className="hidden sm:block absolute top-4 right-4 z-10">
                <div className="relative">
                    <button
                        onClick={() => setShowDonations(!showDonations)}
                        className="bg-[#111] border border-[#222] rounded-lg px-4 py-2 text-white text-sm hover:bg-[#222] transition-colors flex items-center gap-2"
                    >
                        Donations
                        <span className={`transform transition-transform ${showDonations ? 'rotate-180' : ''}`}>
                            ▼
                        </span>
                    </button>

                    {showDonations && (
                        <div className="absolute top-full right-0 mt-2 bg-[#111] border border-[#222] rounded-lg p-4 min-w-[320px] shadow-xl">
                            <h3 className="text-sm font-semibold text-white mb-3">Binance ID</h3>
                            <div className="space-y-3 text-xs">
                                <div>
                                    <span className="text-gray-400 block mb-1">if you want it to go faster:</span>
                                    <span className="text-gray-400 block mb-1">si queres que ande mas rapido:</span>
                                    <div className="flex items-center gap-2">
                                        <div className="text-yellow-400 font-mono text-xs break-all bg-[#222] p-2 rounded flex-1">
                                            840670888
                                        </div>
                                        <button
                                            onClick={() => copyToClipboard('tu-binance-pay-id-aqui', 'binance')}
                                            className="bg-[#333] hover:bg-[#444] p-2 rounded transition-colors"
                                        >
                                            {copiedAddress === 'binance' ?
                                                <Check className="w-3 h-3 text-green-400" /> :
                                                <Copy className="w-3 h-3 text-gray-400" />
                                            }
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="sm:hidden fixed bottom-4 left-4 z-10">
                <div className="relative">
                    <button
                        onClick={() => setShowDonations(!showDonations)}
                        className="bg-[#111] border border-[#222] rounded-lg px-4 py-2 text-white text-sm hover:bg-[#222] transition-colors flex items-center gap-2"
                    >
                        Donations
                        <span className={`transform transition-transform ${showDonations ? 'rotate-180' : ''}`}>
                            ▲
                        </span>
                    </button>

                    {showDonations && (
                        <div className="absolute bottom-full left-0 mb-2 bg-[#111] border border-[#222] rounded-lg p-4 w-[280px] shadow-xl">
                            <h3 className="text-sm font-semibold text-white mb-3">Binance ID</h3>
                            <div className="space-y-3 text-xs">
                                <div>
                                    <span className="text-gray-400 block mb-1">if you want it to go faster:</span>
                                    <span className="text-gray-400 block mb-1">si queres que ande mas rapido:</span>
                                    <div className="flex items-center gap-2">
                                        <div className="text-yellow-400 font-mono text-xs break-all bg-[#222] p-2 rounded flex-1">
                                            840670888
                                        </div>
                                        <button
                                            onClick={() => copyToClipboard('tu-binance-pay-id-aqui', 'binance')}
                                            className="bg-[#333] hover:bg-[#444] p-2 rounded transition-colors"
                                        >
                                            {copiedAddress === 'binance' ?
                                                <Check className="w-3 h-3 text-green-400" /> :
                                                <Copy className="w-3 h-3 text-gray-400" />
                                            }
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="container mx-auto px-4 py-8 max-w-4xl">
                <div className="text-center mb-8">
                    <div className="flex items-center justify-center gap-3 mb-4">
                        <Video className="w-10 h-10 text-red-500" />
                        <h1 className="text-3xl font-bold text-white">YouTube Downloader</h1>
                    </div>
                    <p className="text-gray-400">Descarga videos de YouTube fácilmente</p>
                </div>

                <div className="bg-[#111] p-6 rounded-lg shadow mb-6 border border-[#222]">
                    <div className="flex flex-col sm:flex-row gap-4">
                        <input
                            type="text"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder="https://www.youtube.com/watch?v=..."
                            className="flex-1 px-4 py-2 bg-[#111] border border-[#222] rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-white placeholder-gray-500"
                            onKeyPress={(e) => e.key === 'Enter' && handleGetInfo()}
                        />
                        <button
                            onClick={handleGetInfo}
                            disabled={loading || !url.trim()}
                            className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors w-full sm:w-auto"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Video className="w-4 h-4" />}
                            Fetch
                        </button>
                    </div>

                    {error && (
                        <div className="mt-4 p-3 bg-red-900 border border-red-800 rounded flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-red-400" />
                            <span className="text-red-300">{error}</span>
                        </div>
                    )}

                    {success && (
                        <div className="mt-4 p-3 bg-green-900 border border-green-800 rounded flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-400" />
                            <span className="text-green-300">{success}</span>
                        </div>
                    )}
                </div>

                {videoInfo && (
                    <div className="bg-[#111] rounded-lg shadow overflow-hidden border border-[#222]">
                        <div className="p-6">
                            <div className="flex gap-6">
                                <img
                                    src={videoInfo.thumbnail}
                                    alt={videoInfo.title}
                                    className="w-48 h-36 object-cover rounded border border-[#222]"
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

                        <div className="border-t border-[#222] p-6">
                            <div className="space-y-3">
                                {videoInfo.formats.map((format, index) => (
                                    <div key={index} className="flex items-center justify-between p-3 border border-[#222] rounded bg-[#111]">
                                        <div>
                                            <span className="font-medium text-white">{format.quality}</span>
                                            <span className="text-gray-400 ml-2">({getFormatDisplay(format)})</span>
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
                                            {downloading === format.itag.toString() ? '' : ''}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                <div className="mt-8 p-4 bg-yellow-900 border border-yellow-800 rounded">
                    <p className="text-xs text-yellow-300">
                        <strong>Disclaimer:</strong> This tool is for educational purposes only.
                        Please, respect copyright laws and YouTube's Terms of Service.
                    </p>
                    <p className="text-xs text-yellow-300 mt-2">
                        <strong>Aviso:</strong> Esta herramienta es solo para fines educativos.
                        Por favor, respetar las leyes de derechos de autor y los Términos de Servicio de YouTube.
                    </p>
                </div>
            </div>
        </div>
    );
}
