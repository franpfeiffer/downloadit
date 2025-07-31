export class YouTubeService {
    static async getVideoInfo(videoId: string) {
        try {
            console.log('Iniciando getVideoInfo para:', videoId);
            const ytdl = require('ytdl-core');
            const url = `https://www.youtube.com/watch?v=${videoId}`;

            console.log('Validando URL...');
            const isValid = await ytdl.validateURL(url);

            if (!isValid) {
                throw new Error('URL de YouTube inválida');
            }

            console.log('Obteniendo info básica...');
            const info = await ytdl.getBasicInfo(url);
            const details = info.videoDetails;

            console.log('Título obtenido:', details.title);

            return {
                videoId,
                title: details.title,
                thumbnail: details.thumbnails[0]?.url || '',
                duration: parseInt(details.lengthSeconds) || 0,
                author: details.author.name,
                viewCount: parseInt(details.viewCount) || 0,
                formats: [
                    {
                        quality: "720p",
                        format: "mp4",
                        fileSize: 10485760,
                        hasVideo: true,
                        hasAudio: true,
                        itag: 22
                    },
                    {
                        quality: "480p",
                        format: "mp4",
                        fileSize: 5242880,
                        hasVideo: true,
                        hasAudio: true,
                        itag: 18
                    },
                    {
                        quality: "360p",
                        format: "mp4",
                        fileSize: 3145728,
                        hasVideo: true,
                        hasAudio: true,
                        itag: 36
                    }
                ],
            };

        } catch (error) {
            console.error('Error en getVideoInfo:', error);
            throw error;
        }
    }

    static async getDirectDownloadUrl(videoId: string, itag: number): Promise<string> {
        try {
            console.log('Obteniendo URL directa para:', videoId, 'itag:', itag);
            const ytdl = require('ytdl-core');
            const url = `https://www.youtube.com/watch?v=${videoId}`;

            console.log('Obteniendo info completa...');
            const info = await ytdl.getInfo(url);

            console.log('Buscando formato con itag:', itag);
            const format = info.formats.find((f: any) => f.itag === itag);

            if (!format) {
                console.log('Formatos disponibles:', info.formats.map((f: any) => f.itag));
                throw new Error(`Formato ${itag} no encontrado`);
            }

            if (!format.url) {
                throw new Error('URL de descarga no disponible para este formato');
            }

            console.log('URL directa encontrada:', format.url.substring(0, 100) + '...');
            return format.url;

        } catch (error) {
            console.error('Error obteniendo URL directa:', error);
            throw error;
        }
    }
}
