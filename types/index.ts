export interface VideoInfo {
    videoId: string;
    title: string;
    thumbnail: string;
    duration: number;
    author: string;
    viewCount: number;
    formats: VideoFormat[];
}

export interface VideoFormat {
    quality: string;
    format: string;
    fileSize: number;
    hasVideo: boolean;
    hasAudio: boolean;
}

export interface DownloadRequest {
    videoId: string;
    quality: string;
    format: string;
}

export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
}
