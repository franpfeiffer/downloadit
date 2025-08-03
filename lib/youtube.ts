function getDownloadCommand(url: string): string[] {
    return ['-f', 'bv*+ba/best', '-o', '-', url]
}

async function getAvailableFormats(url: string): Promise<string> {
    const { exec } = await import('child_process')
    return new Promise((resolve, reject) => {
        exec(`yt-dlp -F "${url}"`, (error, stdout, stderr) => {
            if (error) {
                reject(stderr || error)
            } else {
                resolve(stdout)
            }
        })
    })
}

function spawnDownloadProcess(url: string) {
    const { spawn } = require('child_process')
    const args = getDownloadCommand(url)
    return spawn('yt-dlp', args)
}

export const YouTubeService = {
    getDownloadCommand,
    getAvailableFormats,
    spawnDownloadProcess,
}

