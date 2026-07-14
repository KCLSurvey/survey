'use strict';
const fs=require('fs');
const path=require('path');
const zlib=require('zlib');
function extract(version,count){
  const dir=path.join('margin-calculators',version);
  let joined='';
  for(let i=0;i<count;i++){
    const name=`part-${String(i).padStart(2,'0')}.b64`;
    joined+=fs.readFileSync(path.join(dir,name),'utf8').replace(/\s/g,'');
  }
  const html=zlib.gunzipSync(Buffer.from(joined,'base64')).toString('utf8');
  const outDir=path.join('margin-calculators','_debug');
  fs.mkdirSync(outDir,{recursive:true});
  fs.writeFileSync(path.join(outDir,`${version}-source.html`),html);
  console.log(version,html.length);
}
extract('v9',5);
extract('v10',6);
