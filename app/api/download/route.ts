import { NextRequest, NextResponse } from 'next/server';
import ytdl from '@distube/ytdl-core';

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

        const url = `https://www.youtube.com/watch?v=${videoId}`;
        const safeTitle = title?.replace(/[^\w\s-]/g, '').replace(/\s+/g, '_') || `video_${videoId}`;

        try {
            const info = await ytdl.getInfo(url);
            const selectedFormat = info.formats.find(f => f.itag === parseInt(itag));

            if (!selectedFormat) {
                return NextResponse.json(
                    { success: false, error: 'Format not found' },
                    { status: 404 }
                );
            }

            let filename: string;
            let contentType: string;

            if (format === 'Audio Only') {
                filename = `${safeTitle}.mp3`;
                contentType = 'audio/mpeg';
            } else {
                filename = `${safeTitle}.mp4`;
                contentType = 'video/mp4';
            }

            const videoStream = ytdl(url, { format: selectedFormat });

            const chunks: Buffer[] = [];

            return new Promise<Response>((resolve, reject) => {
                videoStream.on('data', (chunk: Buffer) => {
                    chunks.push(chunk);
                });

                videoStream.on('end', () => {
                    const buffer = Buffer.concat(chunks);

                    const headers = new Headers();
                    headers.set('Content-Type', contentType);
                    headers.set('Content-Disposition', `attachment; filename="${filename}"`);
                    headers.set('Content-Length', buffer.length.toString());

                    resolve(new Response(buffer, { headers }));
                });

                videoStream.on('error', (error) => {
                    console.error('Stream error:', error);
                    reject(new Response(
                        JSON.stringify({ success: false, error: 'Stream error: ' + error.message }),
                        { status: 500, headers: { 'Content-Type': 'application/json' } }
                    ));
                });
            });

        } catch (execError) {
            console.error('ytdl execution error:', execError);
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
        const videoStream = ytdl(url, { quality: 'highest' });

        const chunks: Buffer[] = [];

        return new Promise<Response>((resolve, reject) => {
            videoStream.on('data', (chunk: Buffer) => {
                chunks.push(chunk);
            });

            videoStream.on('end', () => {
                const buffer = Buffer.concat(chunks);

                resolve(new Response(buffer, {
                    headers: {
                        'Content-Type': 'video/mp4',
                        'Content-Disposition': 'attachment; filename="video.mp4"',
                        'Content-Length': buffer.length.toString(),
                    },
                }));
            });

            videoStream.on('error', (error) => {
                console.error('Stream error:', error);
                reject(new Response('Download failed: ' + error.message, { status: 500 }));
            });
        });

    } catch (error) {
        console.error('Error in GET download:', error);
        return new Response('Download failed: ' + (error instanceof Error ? error.message : String(error)), { status: 500 });
    }
}
