import { exec, spawn } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

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
    const { exec } = await import('child_process');
    return new Promise((resolve, reject) => {
        exec(`yt-dlp -F "${url}"`, (error, stdout, stderr) => {
            if (error) {
                reject(stderr || error);
            } else {
                resolve(stdout);
            }
        });
    });
}

function spawnDownloadProcess(url: string) {
    const args = getDownloadCommand(url);
    return spawn('yt-dlp', args);
}

async function getVideoInfo(videoId: string): Promise<VideoInfo> {
    const url = `https://www.youtube.com/watch?v=${videoId}`;

    try {
        // Get video info in JSON format
        const { stdout } = await execAsync(`yt-dlp -j "${url}"`);
        const videoData = JSON.parse(stdout);

        // Get available formats
        const { stdout: formatsOutput } = await execAsync(`yt-dlp -F "${url}"`);

        // Parse formats from the output
        const formats = parseFormats(formatsOutput);

        return {
            videoId,
            title: videoData.title || 'Unknown Title',
            thumbnail: videoData.thumbnail || '',
            duration: videoData.duration || 0,
            author: videoData.uploader || videoData.channel || 'Unknown',
            viewCount: videoData.view_count || 0,
            formats
        };
    } catch (error) {
        console.error('Error getting video info:', error);
        throw new Error(`Failed to get video info: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

function parseFormats(formatsOutput: string): VideoFormat[] {
    const lines = formatsOutput.split('\n');
    const allFormats: VideoFormat[] = [];

    let startIndex = -1;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('ID') && lines[i].includes('EXT') && lines[i].includes('RESOLUTION')) {
            startIndex = i + 1;
            break;
        }
    }

    if (startIndex === -1) {
        return [];
    }

    for (let i = startIndex; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line || line.startsWith('----')) continue;

        const parts = line.split(/\s+/);
        if (parts.length < 3) continue;

        const itag = parts[0];
        const ext = parts[1];
        const resolution = parts[2];

        if (isNaN(parseInt(itag))) continue;

        const isAudioOnly = line.toLowerCase().includes('audio only') || resolution === 'audio';
        const isVideoOnly = line.toLowerCase().includes('video only');

        const hasVideo = !isAudioOnly;
        const hasAudio = !isVideoOnly;

        let quality = resolution;
        if (isAudioOnly || resolution === 'audio') {
            quality = 'Audio Only';
        } else if (resolution.includes('x')) {
            const height = resolution.split('x')[1];
            quality = `${height}p`;
        }

        allFormats.push({
            quality,
            format: ext,
            hasVideo,
            hasAudio,
            itag: parseInt(itag)
        });
    }

    const selectedFormats: VideoFormat[] = [];
    const resolutionsAdded = new Set<string>();
    const videoOnlyQualities = ['1080p', '720p'];
    const videoAudioQuality = '360p';
    let audioOnlyAdded = false;

    allFormats.sort((a, b) => {
        const aHeight = parseInt(a.quality.replace('p', '')) || 0;
        const bHeight = parseInt(b.quality.replace('p', '')) || 0;
        return bHeight - aHeight;
    });

    for (const format of allFormats) {
        if (format.quality === 'Audio Only' && !audioOnlyAdded) {
            selectedFormats.push(format);
            audioOnlyAdded = true;
            continue;
        }

        if (videoOnlyQualities.includes(format.quality) && format.hasVideo && !format.hasAudio) {
            if (!resolutionsAdded.has(format.quality)) {
                selectedFormats.push(format);
                resolutionsAdded.add(format.quality);
            }
        }

        if (format.quality === videoAudioQuality && format.hasVideo && format.hasAudio) {
            if (!resolutionsAdded.has(format.quality)) {
                selectedFormats.push(format);
                resolutionsAdded.add(format.quality);
            }
        }
    }

    if (!audioOnlyAdded) {
        for (const format of allFormats) {
            if (!format.hasVideo && format.hasAudio) {
                selectedFormats.push({
                    quality: 'Audio Only',
                    format: format.format,
                    hasVideo: false,
                    hasAudio: true,
                    itag: format.itag
                });
                break;
            }
        }
    }

    return selectedFormats.sort((a, b) => {
        if (a.hasVideo && !b.hasVideo) return -1;
        if (!a.hasVideo && b.hasVideo) return 1;

        const aHeight = parseInt(a.quality.replace('p', '')) || 0;
        const bHeight = parseInt(b.quality.replace('p', '')) || 0;
        return bHeight - aHeight;
    });
}

export const YouTubeService = {
    getDownloadCommand,
    getAvailableFormats,
    spawnDownloadProcess,
    getVideoInfo
};
