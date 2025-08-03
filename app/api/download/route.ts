import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { readFile, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

const execAsync = promisify(exec);

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
        const timestamp = Date.now();

        let filename: string;
        let ytdlpCommand: string;
        let tempFilePath: string;

        if (format === 'Audio Only') {
            filename = `${safeTitle}.mp3`;
            tempFilePath = join(tmpdir(), `${timestamp}_${safeTitle}.%(ext)s`);
            ytdlpCommand = `yt-dlp -f "bestaudio" --extract-audio --audio-format mp3 -o "${tempFilePath}" "${url}"`;
        } else {
            filename = `${safeTitle}.${format}`;
            tempFilePath = join(tmpdir(), `${timestamp}_${safeTitle}.%(ext)s`);
            ytdlpCommand = `yt-dlp -f "${itag}" -o "${tempFilePath}" "${url}"`;
        }

        console.log('Executing command:', ytdlpCommand);

        try {
            const { stdout, stderr } = await execAsync(ytdlpCommand);
            console.log('yt-dlp stdout:', stdout);
            if (stderr) console.log('yt-dlp stderr:', stderr);

            let actualFilePath: string;
            if (format === 'Audio Only') {
                actualFilePath = tempFilePath.replace('.%(ext)s', '.mp3');
            } else {
                actualFilePath = tempFilePath.replace('.%(ext)s', `.${format}`);
            }

            console.log('Looking for file at:', actualFilePath);

            const fileBuffer = await readFile(actualFilePath);

            await unlink(actualFilePath).catch(err => console.log('Error deleting temp file:', err));

            const headers = new Headers();
            headers.set('Content-Type', format === 'Audio Only' ? 'audio/mpeg' : 'video/mp4');
            headers.set('Content-Disposition', `attachment; filename="${filename}"`);
            headers.set('Content-Length', fileBuffer.length.toString());

            return new Response(fileBuffer, { headers });

        } catch (execError) {
            console.error('yt-dlp execution error:', execError);
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

    const timestamp = Date.now();
    const tempFilePath = join(tmpdir(), `${timestamp}_video.%(ext)s`);

    try {
        const command = `yt-dlp -f "bv*+ba/best" -o "${tempFilePath}" "${url}"`;
        console.log('Executing GET command:', command);

        const { stdout, stderr } = await execAsync(command);
        console.log('yt-dlp stdout:', stdout);
        if (stderr) console.log('yt-dlp stderr:', stderr);

        const actualFilePath = tempFilePath.replace('.%(ext)s', '.mp4');
        const fileBuffer = await readFile(actualFilePath);

        await unlink(actualFilePath).catch(err => console.log('Error deleting temp file:', err));

        return new Response(fileBuffer, {
            headers: {
                'Content-Type': 'video/mp4',
                'Content-Disposition': 'attachment; filename="video.mp4"',
                'Content-Length': fileBuffer.length.toString(),
            },
        });
    } catch (error) {
        console.error('Error in GET download:', error);
        return new Response('Download failed: ' + (error instanceof Error ? error.message : String(error)), { status: 500 });
    }
}
