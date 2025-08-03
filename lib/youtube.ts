interface VideoFormat {
    quality: string;
    format: string;
    hasVideo: boolean;
    hasAudio: boolean;
    itag: string | number;
    originalQuality?: string;
    needsAudioMerge?: boolean;
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

function getDownloadCommand(url: string): string[] {
    return ['-f', 'bv*+ba/best', '-o', '-', url];
}

async function getAvailableFormats(url: string): Promise<string> {
    throw new Error('This function requires yt-dlp binary which is not available in production');
}

function spawnDownloadProcess(url: string) {
    throw new Error('This function requires yt-dlp binary which is not available in production');
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

        const formats: VideoFormat[] = [
            {
                quality: '1080p',
                format: 'mp4',
                hasVideo: true,
                hasAudio: false,
                itag: 137
            },
            {
                quality: '720p',
                format: 'mp4',
                hasVideo: true,
                hasAudio: false,
                itag: 136
            },
            {
                quality: '360p',
                format: 'mp4',
                hasVideo: true,
                hasAudio: true,
                itag: 18
            },
            {
                quality: 'Audio Only',
                format: 'mp3',
                hasVideo: false,
                hasAudio: true,
                itag: 140
            }
        ];

        return {
            videoId,
            title: video.snippet.title || 'Unknown Title',
            thumbnail: video.snippet.thumbnails?.high?.url || video.snippet.thumbnails?.default?.url || '',
            duration,
            author: video.snippet.channelTitle || 'Unknown',
            viewCount: parseInt(video.statistics.viewCount) || 0,
            formats
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
        const ytdl = await import('@distube/ytdl-core');
        const url = `https://www.youtube.com/watch?v=${videoId}`;

        const info = await ytdl.default.getInfo(url);
        const format = info.formats.find(f => f.itag === itag);

        return format?.url || null;
    } catch (error) {
        console.error('Error getting download URL:', error);
        return null;
    }
}

export const YouTubeService = {
    getDownloadCommand,
    getAvailableFormats,
    spawnDownloadProcess,
    getVideoInfo,
    getVideoDownloadUrl
};
