import ytdl from '@distube/ytdl-core';

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
    const url = `https://www.youtube.com/watch?v=${videoId}`;

    try {
        const info = await ytdl.getInfo(url);

        const allFormats = info.formats.map(format => ({
            quality: format.qualityLabel || 'Unknown',
            format: format.container || 'mp4',
            hasVideo: !!format.hasVideo,
            hasAudio: !!format.hasAudio,
            itag: format.itag,
            audioBitrate: format.audioBitrate,
            height: format.height
        }));

        const selectedFormats: VideoFormat[] = [];
        const resolutionsAdded = new Set<string>();
        let audioOnlyAdded = false;

        const videoOnlyQualities = ['1080p', '720p'];
        const videoAudioQuality = '360p';

        allFormats.sort((a, b) => {
            const aHeight = a.height || 0;
            const bHeight = b.height || 0;
            return bHeight - aHeight;
        });

        for (const format of allFormats) {
            if (!format.hasVideo && format.hasAudio && !audioOnlyAdded) {
                selectedFormats.push({
                    quality: 'Audio Only',
                    format: 'mp3',
                    hasVideo: false,
                    hasAudio: true,
                    itag: format.itag
                });
                audioOnlyAdded = true;
                continue;
            }

            if (videoOnlyQualities.includes(format.quality) && format.hasVideo && !format.hasAudio) {
                if (!resolutionsAdded.has(format.quality)) {
                    selectedFormats.push({
                        quality: format.quality,
                        format: format.format,
                        hasVideo: true,
                        hasAudio: false,
                        itag: format.itag
                    });
                    resolutionsAdded.add(format.quality);
                }
            }

            if (format.quality === videoAudioQuality && format.hasVideo && format.hasAudio) {
                if (!resolutionsAdded.has(format.quality)) {
                    selectedFormats.push({
                        quality: format.quality,
                        format: format.format,
                        hasVideo: true,
                        hasAudio: true,
                        itag: format.itag
                    });
                    resolutionsAdded.add(format.quality);
                }
            }
        }

        if (!audioOnlyAdded) {
            const audioFormat = allFormats.find(f => f.hasAudio && !f.hasVideo);
            if (audioFormat) {
                selectedFormats.push({
                    quality: 'Audio Only',
                    format: 'mp3',
                    hasVideo: false,
                    hasAudio: true,
                    itag: audioFormat.itag
                });
            }
        }

        return {
            videoId,
            title: info.videoDetails.title || 'Unknown Title',
            thumbnail: info.videoDetails.thumbnails?.[0]?.url || '',
            duration: parseInt(info.videoDetails.lengthSeconds) || 0,
            author: info.videoDetails.author?.name || 'Unknown',
            viewCount: parseInt(info.videoDetails.viewCount) || 0,
            formats: selectedFormats.sort((a, b) => {
                if (a.hasVideo && !b.hasVideo) return -1;
                if (!a.hasVideo && b.hasVideo) return 1;

                const aHeight = parseInt(a.quality.replace('p', '')) || 0;
                const bHeight = parseInt(b.quality.replace('p', '')) || 0;
                return bHeight - aHeight;
            })
        };
    } catch (error) {
        console.error('Error getting video info:', error);
        throw new Error(`Failed to get video info: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

export const YouTubeService = {
    getDownloadCommand,
    getAvailableFormats,
    spawnDownloadProcess,
    getVideoInfo
};
