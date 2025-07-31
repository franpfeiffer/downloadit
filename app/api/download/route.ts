import { NextRequest, NextResponse } from 'next/server';
import { YouTubeService } from '../../../lib/youtube';

export async function POST(request: NextRequest) {
    console.log('=== DOWNLOAD API ===');

    try {
        const body = await request.json();
        console.log('Datos recibidos:', body);

        const { videoId, itag, title, format } = body;

        if (!videoId || !itag) {
            return NextResponse.json(
                { success: false, error: 'videoId e itag requeridos' },
                { status: 400 }
            );
        }

        console.log('Obteniendo URL directa de descarga...');
        const directUrl = await YouTubeService.getDirectDownloadUrl(videoId, itag);

        console.log('URL directa obtenida exitosamente');

        return NextResponse.json({
            success: true,
            data: {
                downloadUrl: directUrl,
                filename: `${title || 'video'}_${itag}.${format || 'mp4'}`,
                directDownload: true
            }
        });

    } catch (error) {
        console.error('Error en download API:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Error: ' + error.message
            },
            { status: 500 }
        );
    }
}
