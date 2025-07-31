import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const videoId = searchParams.get('videoId');
        const itag = searchParams.get('itag');

        console.log('Stream request para:', videoId, 'itag:', itag);

        if (!videoId || !itag) {
            return NextResponse.json(
                { success: false, error: 'Parámetros requeridos' },
                { status: 400 }
            );
        }

        const ytdl = require('ytdl-core');
        const url = `https://www.youtube.com/watch?v=${videoId}`;

        console.log('Obteniendo info para stream...');
        const info = await ytdl.getInfo(url);
        const format = info.formats.find((f: any) => f.itag === parseInt(itag));

        if (!format) {
            return NextResponse.json(
                { success: false, error: 'Formato no encontrado' },
                { status: 404 }
            );
        }

        console.log('Redirigiendo a URL de descarga directa');
        return NextResponse.redirect(format.url);

    } catch (error) {
        console.error('Error en stream API:', error);
        return NextResponse.json(
            { success: false, error: 'Error en streaming: ' + error.message },
            { status: 500 }
        );
    }
}
