const { chromium } = require('playwright');
const fs=require('fs'); const {spawn}=require('child_process');
(async()=>{
  const data=JSON.parse(fs.readFileSync('timeline.json'));
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'}).catch(()=>chromium.launch());
  const p=await b.newPage({viewport:{width:1080,height:1920}});
  await p.goto('file://'+__dirname+'/scene.html'); await p.evaluate(d=>setup(d),data);
  await p.evaluate(()=>document.fonts.ready);
  const mode=process.argv[2];
  if(mode==='preview'){
    for(const t of process.argv.slice(3).map(Number)){await p.evaluate(t=>renderAt(t),t);await p.screenshot({path:`prev_${t}.png`});}
  } else {
    const ff=spawn(process.env.FF,['-y','-f','image2pipe','-framerate','30','-c:v','mjpeg','-i','-','-i','mix.wav','-c:v','libx264','-preset','slow','-crf','18','-pix_fmt','yuv420p','-c:a','aac','-b:a','192k','-shortest','-movflags','+faststart','out.mp4'],{stdio:['pipe','inherit','inherit']});
    const n=Math.round(data.duration*30);
    for(let f=0;f<n;f++){await p.evaluate(t=>renderAt(t),f/30);const buf=await p.screenshot({type:'jpeg',quality:95});
      if(!ff.stdin.write(buf)) await new Promise(r=>ff.stdin.once('drain',r)); if(f%100===0)console.error('frame',f,'/',n);}
    ff.stdin.end(); await new Promise(r=>ff.on('close',r));
  }
  await b.close();
})();
