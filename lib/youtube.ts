import ytdl from '@distube/ytdl-core';

interface VideoFormat {
    quality: string;
    format: string;
    hasVideo: boolean;
    hasAudio: boolean;
    itag: string | number;
    description: string;
}

interface VideoInfo {
    videoId: string;
    title: string;
    thumbnail: string;
    duration: number;
    author: string;
    viewCount: number;
    formats: VideoFormat[];
}

// Formatos específicos que queremos mostrar
const DESIRED_FORMATS = [
    {
        quality: 'Audio Only',
        format: 'mp3',
        hasVideo: false,
        hasAudio: true,
        itag: 140, // m4a audio
        description: 'Solo audio (MP3)'
    },
    {
        quality: '360p',
        format: 'mp4',
        hasVideo: true,
        hasAudio: true,
        itag: 18, // 360p mp4 con audio
        description: 'Video 360p + Audio'
    },
    {
        quality: '480p',
        format: 'mp4',
        hasVideo: true,
        hasAudio: false,
        itag: 135, // 480p solo video
        description: 'Video 480p (sin audio)'
    },
    {
        quality: '720p',
        format: 'mp4',
        hasVideo: true,
        hasAudio: false,
        itag: 136, // 720p solo video
        description: 'Video 720p (sin audio)'
    },
    {
        quality: '1080p',
        format: 'mp4',
        hasVideo: true,
        hasAudio: false,
        itag: 137, // 1080p solo video
        description: 'Video 1080p (sin audio)'
    }
];

async function getVideoInfo(videoId: string): Promise<VideoInfo> {
    const apiKey = process.env.YOUTUBE_API_KEY;

    if (!apiKey) {
        throw new Error('YouTube API key not configured. Please set YOUTUBE_API_KEY environment variable.');
    }

    try {
        // Obtenemos info básica de YouTube API
        const response = await fetch(
            `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${videoId}&key=${apiKey}`
        );

        if (!response.ok) {
            throw new Error(`YouTube API error: ${response.status}`);
        }

        const data = await response.json();

        if (!data.items || data.items.length === 0) {
            throw new Error('Video not found');
        }

        const video = data.items[0];
        const duration = parseDuration(video.contentDetails.duration);

        // Verificamos qué formatos están disponibles usando ytdl
        const url = `https://www.youtube.com/watch?v=${videoId}`;
        let availableFormats: VideoFormat[] = [];

        try {
            console.log('Verificando formatos disponibles...');
            const info = await ytdl.getInfo(url);

            // Mapeamos nuestros formatos deseados con los disponibles
            for (const desiredFormat of DESIRED_FORMATS) {
                const foundFormat = info.formats.find((f: any) => f.itag === desiredFormat.itag);

                if (foundFormat && foundFormat.url) {
                    availableFormats.push({
                        quality: desiredFormat.quality,
                        format: desiredFormat.format,
                        hasVideo: desiredFormat.hasVideo,
                        hasAudio: desiredFormat.hasAudio,
                        itag: desiredFormat.itag,
                        description: desiredFormat.description
                    });
                    console.log(`✓ Formato disponible: ${desiredFormat.quality} (itag: ${desiredFormat.itag})`);
                } else {
                    console.log(`✗ Formato no disponible: ${desiredFormat.quality} (itag: ${desiredFormat.itag})`);
                }
            }

            // Si no encontramos ningún formato, agregamos al menos el básico
            if (availableFormats.length === 0) {
                console.log('No se encontraron formatos específicos, buscando alternativas...');

                // Buscar formato básico con audio
                const basicFormat = info.formats.find((f: any) =>
                    f.hasVideo && f.hasAudio && f.url
                );

                if (basicFormat) {
                    availableFormats.push({
                        quality: 'Basic',
                        format: 'mp4',
                        hasVideo: true,
                        hasAudio: true,
                        itag: basicFormat.itag,
                        description: `Video básico (${basicFormat.quality || 'calidad automática'})`
                    });
                }
            }

        } catch (ytdlError) {
            console.error('Error verificando formatos:', ytdlError);

            // Fallback: mostramos los formatos pero sin verificar disponibilidad
            availableFormats = DESIRED_FORMATS.map(format => ({
                quality: format.quality,
                format: format.format,
                hasVideo: format.hasVideo,
                hasAudio: format.hasAudio,
                itag: format.itag,
                description: format.description + ' (sin verificar)'
            }));
        }

        return {
            videoId,
            title: video.snippet.title || 'Unknown Title',
            thumbnail: video.snippet.thumbnails?.high?.url || video.snippet.thumbnails?.default?.url || '',
            duration,
            author: video.snippet.channelTitle || 'Unknown',
            viewCount: parseInt(video.statistics.viewCount) || 0,
            formats: availableFormats
        };

    } catch (error) {
        console.error('Error getting video info:', error);
        throw new Error(`Failed to get video info: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

function parseDuration(duration: string): number {
    const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
    if (!match) return 0;

    const hours = (match[1] ? parseInt(match[1]) : 0);
    const minutes = (match[2] ? parseInt(match[2]) : 0);
    const seconds = (match[3] ? parseInt(match[3]) : 0);

    return hours * 3600 + minutes * 60 + seconds;
}

async function getVideoDownloadUrl(videoId: string, itag: number): Promise<string | null> {
    try {
        console.log(`Obteniendo URL para videoId: ${videoId}, itag: ${itag}`);

        const url = `https://www.youtube.com/watch?v=${videoId}`;
        const info = await ytdl.getInfo(url);

        const format = info.formats.find(f => f.itag === itag);

        if (!format) {
            console.error(`Formato itag ${itag} no encontrado`);
            return null;
        }

        if (!format.url) {
            console.error(`Formato encontrado pero sin URL`);
            return null;
        }

        console.log(`✓ URL obtenida para itag ${itag}`);
        return format.url;

    } catch (error) {
        console.error('Error obteniendo URL:', error);
        return null;
    }
}

export const YouTubeService = {
    getVideoInfo,
    getVideoDownloadUrl
};
