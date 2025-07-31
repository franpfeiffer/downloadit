import { NextRequest, NextResponse } from 'next/server';
import { YouTubeService } from '../../../lib/youtube';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const videoId = searchParams.get('videoId');

        if (!videoId) {
            return NextResponse.json(
                { success: false, error: 'ID de video requerido' },
                { status: 400 }
            );
        }

        const videoInfo = await YouTubeService.getVideoInfo(videoId);

        return NextResponse.json({
            success: true,
            data: videoInfo
        });

    } catch (error) {
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Error al obtener info del video'
            },
            { status: 500 }
        );
    }
}

