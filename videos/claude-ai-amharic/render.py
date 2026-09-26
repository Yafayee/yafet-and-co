import asyncio, subprocess, imageio_ffmpeg
from playwright.async_api import async_playwright
FPS=30; N=20*FPS; FF=imageio_ffmpeg.get_ffmpeg_exe()
async def main():
    ff=subprocess.Popen([FF,'-y','-loglevel','error','-f','image2pipe','-framerate',str(FPS),'-c:v','mjpeg','-i','-',
        '-i','music.wav','-c:v','libx264','-preset','slow','-crf','18','-pix_fmt','yuv420p','-c:a','aac','-b:a','192k',
        '-shortest','-movflags','+faststart','claude_ai_amharic.mp4'],stdin=subprocess.PIPE)
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome')
        pg=await b.new_page(viewport={'width':1080,'height':1920})
        import os; await pg.goto('file://'+os.path.abspath('video.html')); await pg.evaluate('document.fonts.ready')
        for i in range(N):
            await pg.evaluate(f'render({i/FPS})')
            ff.stdin.write(await pg.screenshot(type='jpeg',quality=95))
            if i%100==0: print(i,flush=True)
        await b.close()
    ff.stdin.close(); ff.wait(); print('done',ff.returncode)
asyncio.run(main())
