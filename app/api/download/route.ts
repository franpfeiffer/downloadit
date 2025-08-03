import { NextRequest } from 'next/server'
import { spawn } from 'child_process'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const url = searchParams.get('url')

  if (!url) {
    return new Response('Missing URL', { status: 400 })
  }

  const ytdlp = spawn('yt-dlp', ['-f', 'bv*+ba/best', '-o', '-', url])

  return new Response(ytdlp.stdout as any, {
    headers: {
      'Content-Type': 'video/mp4',
      'Content-Disposition': 'attachment; filename="video.mp4"',
    },
  })
}

