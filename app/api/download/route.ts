import { NextRequest, NextResponse } from 'next/server';
import { YouTubeService } from '../../../lib/youtube';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { videoId, itag, title, format } = body;

        console.log('Download request:', { videoId, itag, title, format });

        if (!videoId || !itag) {
            return NextResponse.json(
                { success: false, error: 'videoId and itag are required' },
                { status: 400 }
            );
        }

        const safeTitle = title?.replace(/[^\w\s-]/g, '').replace(/\s+/g, '_') || `video_${videoId}`;

        try {
            const downloadUrl = await YouTubeService.getVideoDownloadUrl(videoId, parseInt(itag));

            if (!downloadUrl) {
                return NextResponse.json(
                    { success: false, error: 'Could not get download URL. Video may be restricted or unavailable.' },
                    { status: 404 }
                );
            }

            const response = await fetch(downloadUrl);

            if (!response.ok) {
                throw new Error(`Failed to fetch video: ${response.status}`);
            }

            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            let filename: string;
            let contentType: string;

            if (format === 'Audio Only') {
                filename = `${safeTitle}.mp3`;
                contentType = 'audio/mpeg';
            } else {
                filename = `${safeTitle}.mp4`;
                contentType = 'video/mp4';
            }

            const headers = new Headers();
            headers.set('Content-Type', contentType);
            headers.set('Content-Disposition', `attachment; filename="${filename}"`);
            headers.set('Content-Length', buffer.length.toString());

            return new Response(buffer, { headers });

        } catch (execError) {
            console.error('Download execution error:', execError);
            return NextResponse.json(
                { success: false, error: 'Download failed: ' + (execError instanceof Error ? execError.message : String(execError)) },
                { status: 500 }
            );
        }

    } catch (error) {
        console.error('Error in download API:', error);
        return NextResponse.json(
            { success: false, error: 'Request processing failed: ' + (error instanceof Error ? error.message : String(error)) },
            { status: 500 }
        );
    }
}

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const url = searchParams.get('url');

    if (!url) {
        return new Response('Missing URL', { status: 400 });
    }

    try {
        const videoIdMatch = url.match(/(?:v=|\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
        if (!videoIdMatch) {
            return new Response('Invalid YouTube URL', { status: 400 });
        }

        const videoId = videoIdMatch[1];
        const downloadUrl = await YouTubeService.getVideoDownloadUrl(videoId, 18);

        if (!downloadUrl) {
            return new Response('Could not get download URL', { status: 404 });
        }

        const response = await fetch(downloadUrl);
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        return new Response(buffer, {
            headers: {
                'Content-Type': 'video/mp4',
                'Content-Disposition': 'attachment; filename="video.mp4"',
                'Content-Length': buffer.length.toString(),
            },
        });

    } catch (error) {
        console.error('Error in GET download:', error);
        return new Response('Download failed: ' + (error instanceof Error ? error.message : String(error)), { status: 500 });
    }
}
