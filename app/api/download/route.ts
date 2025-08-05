import { NextRequest, NextResponse } from 'next/server';
import { YouTubeService } from '../../../lib/youtube';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { videoId, itag, title, format } = body;

        console.log('=== INICIO DESCARGA ===');
        console.log('Parámetros recibidos:', { videoId, itag, title, format });

        if (!videoId || !itag) {
            return NextResponse.json(
                { success: false, error: 'videoId and itag are required' },
                { status: 400 }
            );
        }

        const safeTitle = title?.replace(/[^\w\s-]/g, '').replace(/\s+/g, '_') || `video_${videoId}`;
        console.log('Título sanitizado:', safeTitle);

        try {
            console.log('Obteniendo URL de descarga...');
            const downloadUrl = await YouTubeService.getVideoDownloadUrl(videoId, parseInt(itag));

            if (!downloadUrl) {
                console.error('No se pudo obtener URL de descarga');
                return NextResponse.json(
                    { success: false, error: 'Could not get download URL. Video may be restricted, unavailable, or the format may not exist.' },
                    { status: 404 }
                );
            }

            console.log('URL obtenida, iniciando descarga...');
            console.log('URL length:', downloadUrl.length);

            // Configuramos headers para la petición
            const headers: HeadersInit = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            };

            const response = await fetch(downloadUrl, { headers });

            if (!response.ok) {
                console.error(`Error en respuesta: ${response.status} - ${response.statusText}`);
                throw new Error(`Failed to fetch video: ${response.status} ${response.statusText}`);
            }

            console.log('Respuesta obtenida, procesando contenido...');
            console.log('Content-Type:', response.headers.get('content-type'));
            console.log('Content-Length:', response.headers.get('content-length'));

            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            console.log('Buffer creado, tamaño:', buffer.length, 'bytes');

            if (buffer.length === 0) {
                throw new Error('El archivo descargado está vacío');
            }

            // Determinamos el nombre del archivo y tipo de contenido
            let filename: string;
            let contentType: string;

            if (format === 'Audio Only' || format === 'mp3') {
                filename = `${safeTitle}.mp3`;
                contentType = 'audio/mpeg';
            } else if (format === 'webm') {
                filename = `${safeTitle}.webm`;
                contentType = 'video/webm';
            } else {
                filename = `${safeTitle}.mp4`;
                contentType = 'video/mp4';
            }

            console.log('Archivo preparado:', filename, 'Tipo:', contentType);

            const responseHeaders = new Headers();
            responseHeaders.set('Content-Type', contentType);
            responseHeaders.set('Content-Disposition', `attachment; filename="${filename}"`);
            responseHeaders.set('Content-Length', buffer.length.toString());
            responseHeaders.set('Cache-Control', 'no-cache');

            console.log('=== DESCARGA EXITOSA ===');
            return new Response(buffer, { headers: responseHeaders });

        } catch (execError) {
            console.error('=== ERROR EN EJECUCIÓN ===');
            console.error('Tipo de error:', execError?.constructor?.name);
            console.error('Mensaje:', execError instanceof Error ? execError.message : String(execError));
            console.error('Stack:', execError instanceof Error ? execError.stack : 'No stack available');

            return NextResponse.json(
                {
                    success: false,
                    error: 'Download failed: ' + (execError instanceof Error ? execError.message : String(execError)),
                    details: 'Check server logs for more information'
                },
                { status: 500 }
            );
        }

    } catch (error) {
        console.error('=== ERROR GENERAL ===');
        console.error('Error en download API:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Request processing failed: ' + (error instanceof Error ? error.message : String(error))
            },
            { status: 500 }
        );
    }
}

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const url = searchParams.get('url');

    console.log('=== GET REQUEST ===');
    console.log('URL recibida:', url);

    if (!url) {
        return new Response('Missing URL', { status: 400 });
    }

    try {
        const videoIdMatch = url.match(/(?:v=|\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
        if (!videoIdMatch) {
            return new Response('Invalid YouTube URL', { status: 400 });
        }

        const videoId = videoIdMatch[1];
        console.log('Video ID extraído:', videoId);

        // Usamos itag 18 como formato básico (360p mp4 con audio)
        const downloadUrl = await YouTubeService.getVideoDownloadUrl(videoId, 18);

        if (!downloadUrl) {
            return new Response('Could not get download URL', { status: 404 });
        }

        const response = await fetch(downloadUrl);

        if (!response.ok) {
            throw new Error(`Fetch failed: ${response.status}`);
        }

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
        console.error('Error en GET download:', error);
        return new Response('Download failed: ' + (error instanceof Error ? error.message : String(error)), { status: 500 });
    }
}
