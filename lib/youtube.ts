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

const YTDL_OPTIONS = {
    requestOptions: {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
            'Cache-Control': 'max-age=0'
        }
    }
};

const DESIRED_FORMATS = [
    {
        quality: 'Audio Only',
        format: 'mp3',
        hasVideo: false,
        hasAudio: true,
        itag: 140,
        description: 'Solo audio (MP3)',
        fallbacks: [251, 250, 249]
    },
    {
        quality: '360p',
        format: 'mp4',
        hasVideo: true,
        hasAudio: true,
        itag: 18,
        description: 'Video 360p + Audio',
        fallbacks: [134]
    },
    {
        quality: '480p',
        format: 'mp4',
        hasVideo: true,
        hasAudio: false,
        itag: 135,
        description: 'Video 480p (sin audio)',
        fallbacks: [244]
    },
    {
        quality: '720p',
        format: 'mp4',
        hasVideo: true,
        hasAudio: false,
        itag: 136,
        description: 'Video 720p (sin audio)',
        fallbacks: [247, 298]
    },
    {
        quality: '1080p',
        format: 'mp4',
        hasVideo: true,
        hasAudio: false,
        itag: 137,
        description: 'Video 1080p (sin audio)',
        fallbacks: [248, 299]
    }
];

function extractMessage(e: unknown): string {
    if (e instanceof Error) return e.message;
    try {
        return JSON.stringify(e);
    } catch {
        return String(e);
    }
}

async function getVideoInfo(videoId: string): Promise<VideoInfo> {
    const apiKey = process.env.YOUTUBE_API_KEY;

    if (!apiKey) {
        throw new Error('YouTube API key not configured. Please set YOUTUBE_API_KEY environment variable.');
    }

    try {
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

        const url = `https://www.youtube.com/watch?v=${videoId}`;
        let availableFormats: VideoFormat[] = [];

        try {
            console.log('Verificando formatos disponibles con configuración anti-bot...');

            let info;
            try {
                info = await ytdl.getInfo(url, YTDL_OPTIONS);
            } catch (firstError) {
                console.log('Primer intento falló, probando sin opciones personalizadas...', extractMessage(firstError));
                info = await ytdl.getInfo(url);
            }

            console.log(`Total de formatos encontrados: ${info.formats.length}`);

            for (const desiredFormat of DESIRED_FORMATS) {
                let foundFormat = info.formats.find((f: any) => f.itag === desiredFormat.itag);

                if (!foundFormat && desiredFormat.fallbacks) {
                    for (const fallbackItag of desiredFormat.fallbacks) {
                        foundFormat = info.formats.find((f: any) => f.itag === fallbackItag);
                        if (foundFormat) {
                            console.log(`Usando formato fallback ${fallbackItag} para ${desiredFormat.quality}`);
                            break;
                        }
                    }
                }

                if (foundFormat && foundFormat.url) {
                    availableFormats.push({
                        quality: desiredFormat.quality,
                        format: desiredFormat.format,
                        hasVideo: desiredFormat.hasVideo,
                        hasAudio: desiredFormat.hasAudio,
                        itag: foundFormat.itag,
                        description: desiredFormat.description
                    });
                    console.log(`✓ Formato disponible: ${desiredFormat.quality} (itag: ${foundFormat.itag})`);
                } else {
                    console.log(`✗ Formato no disponible: ${desiredFormat.quality} (itag: ${desiredFormat.itag})`);
                }
            }

            if (availableFormats.length === 0) {
                console.log('No se encontraron formatos específicos, buscando cualquier formato disponible...');

                const videoWithAudio = info.formats.filter((f: any) =>
                    f.hasVideo && f.hasAudio && f.url && f.container === 'mp4'
                );

                const audioOnly = info.formats.filter((f: any) =>
                    !f.hasVideo && f.hasAudio && f.url
                );

                if (videoWithAudio.length > 0) {
                    const bestVideo = videoWithAudio[0];
                    availableFormats.push({
                        quality: `${bestVideo.height || 'Unknown'}p`,
                        format: 'mp4',
                        hasVideo: true,
                        hasAudio: true,
                        itag: bestVideo.itag,
                        description: `Video ${bestVideo.height || 'Unknown'}p + Audio`
                    });
                }

                if (audioOnly.length > 0) {
                    const bestAudio = audioOnly[0];
                    availableFormats.push({
                        quality: 'Audio Only',
                        format: 'mp3',
                        hasVideo: false,
                        hasAudio: true,
                        itag: bestAudio.itag,
                        description: 'Solo audio'
                    });
                }
            }

        } catch (ytdlError) {
            console.error('Error verificando formatos:', extractMessage(ytdlError));

            availableFormats = [
                {
                    quality: '360p',
                    format: 'mp4',
                    hasVideo: true,
                    hasAudio: true,
                    itag: 18,
                    description: 'Video 360p + Audio (formato básico)'
                },
                {
                    quality: 'Audio Only',
                    format: 'mp3',
                    hasVideo: false,
                    hasAudio: true,
                    itag: 140,
                    description: 'Solo audio (formato básico)'
                }
            ];
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
        console.error('Error getting video info:', extractMessage(error));
        throw new Error(`Failed to get video info: ${error instanceof Error ? error.message : String(error)}`);
    }
}

function parseDuration(duration: string): number {
    const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
    if (!match) return 0;

    const hours = (match[1] ? parseInt(match[1].replace('H', '')) : 0);
    const minutes = (match[2] ? parseInt(match[2].replace('M', '')) : 0);
    const seconds = (match[3] ? parseInt(match[3].replace('S', '')) : 0);

    return hours * 3600 + minutes * 60 + seconds;
}

async function getVideoDownloadUrl(videoId: string, itag: number): Promise<string | null> {
    try {
        console.log(`Obteniendo URL para videoId: ${videoId}, itag: ${itag}`);

        const url = `https://www.youtube.com/watch?v=${videoId}`;

        let info;

        try {
            console.log('Intento 1: Con opciones anti-bot...');
            info = await ytdl.getInfo(url, YTDL_OPTIONS);
        } catch (error1) {
            console.log('Intento 1 falló:', extractMessage(error1));

            try {
                console.log('Intento 2: Sin opciones especiales...');
                info = await ytdl.getInfo(url);
            } catch (error2) {
                console.log('Intento 2 falló:', extractMessage(error2));

                try {
                    console.log('Intento 3: Con headers alternativos...');
                    const altOptions = {
                        requestOptions: {
                            headers: {
                                'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                            }
                        }
                    };
                    info = await ytdl.getInfo(url, altOptions);
                } catch (error3) {
                    console.log('Todos los intentos fallaron:', extractMessage(error3));
                    throw error3;
                }
            }
        }

        const format = info.formats.find((f: any) => f.itag === itag);

        if (!format) {
            console.error(`Formato itag ${itag} no encontrado`);
            console.log('Formatos disponibles:', info.formats.map((f: any) => ({
                itag: f.itag,
                quality: f.quality,
                hasVideo: f.hasVideo,
                hasAudio: f.hasAudio,
                container: f.container
            })));
            return null;
        }

        if (!format.url) {
            console.error(`Formato encontrado pero sin URL`);
            return null;
        }

        console.log(`✓ URL obtenida para itag ${itag}`);
        return format.url;

    } catch (error) {
        console.error('Error obteniendo URL:', extractMessage(error));
        return null;
    }
}

export const YouTubeService = {
    getVideoInfo,
    getVideoDownloadUrl
};

