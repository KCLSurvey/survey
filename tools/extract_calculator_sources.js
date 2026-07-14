'use strict';
const fs=require('fs');
const path=require('path');
const zlib=require('zlib');
const vm=require('vm');

const BUILD='20260714k';

function readPacked(version,count){
  const dir=path.join('margin-calculators',version);
  let joined='';
  for(let i=0;i<count;i++){
    const name=`part-${String(i).padStart(2,'0')}.b64`;
    joined+=fs.readFileSync(path.join(dir,name),'utf8').replace(/\s/g,'');
  }
  return zlib.gunzipSync(Buffer.from(joined,'base64')).toString('utf8');
}

function writePacked(version,count,html){
  const dir=path.join('margin-calculators',version);
  const packed=zlib.gzipSync(Buffer.from(html,'utf8'),{level:9}).toString('base64');
  const chunk=Math.ceil(packed.length/count);
  for(let i=0;i<count;i++){
    const part=packed.slice(i*chunk,(i+1)*chunk);
    fs.writeFileSync(path.join(dir,`part-${String(i).padStart(2,'0')}.b64`),part+'\n');
  }
}

function patchV10(html){
  if(html.includes('INVENTORY_BASES_V10_FIX')) return html;
  const marker='    const expenseOverrides=opts.expenseOverrides||{};';
  if(!html.includes(marker)) throw new Error('v10 patch marker not found');
  const preBases=`    /* INVENTORY_BASES_V10_FIX: sales-dependent bases must exist before inventory expenses are calculated. */\n    const approvedRrpGross=Math.max(0,Number(product.approvedRrpGross)||0);\n    const preliminaryChannels=channels.map(c=>{\n      const units=soldUnits*c.normShare;\n      const reduction=clamp(c.sellInReductionPct,0,95)/100;\n      const invoiceDisc=clamp(c.invoiceDiscountPct,0,95)/100;\n      const invoiceGross=approvedRrpGross*(1-reduction)*(1-invoiceDisc)*units;\n      const invoiceNet=invoiceGross/(1+vat);\n      const shelfNet=approvedRrpGross*units/(1+vat);\n      const baseContra=invoiceNet*(clamp(c.rebatePct,0,100)+clamp(c.returnsPct,0,100))/100;\n      return {invoiceGross,invoiceNet,shelfNet,baseContra};\n    });\n    const preliminaryInvoiceGross=sum(preliminaryChannels,c=>c.invoiceGross);\n    const preliminaryInvoiceNet=sum(preliminaryChannels,c=>c.invoiceNet);\n    const preliminaryShelfNet=sum(preliminaryChannels,c=>c.shelfNet);\n    const preliminaryContra=sum(preliminaryChannels,c=>c.baseContra);\n    const preliminaryNetRevenue=preliminaryInvoiceNet-preliminaryContra;\n    const preliminaryAccountingCogs=pCore.accounting*Math.max(0,soldUnits+writeoffUnits);\n\n${marker}`;
  html=html.replace(marker,preBases);

  const oldRaw='      const raw=expenseRaw(exp,{purchaseUnits,purchaseCostAccounting:pCore.accounting});';
  const newRaw=`      const raw=expenseRaw(exp,{\n        units:soldUnits,purchaseUnits,purchaseCostAccounting:pCore.accounting,\n        accountingCogs:preliminaryAccountingCogs,invoiceGross:preliminaryInvoiceGross,\n        invoiceNet:preliminaryInvoiceNet,shelfNet:preliminaryShelfNet,\n        netRevenueBeforeContra:preliminaryInvoiceNet,netRevenue:preliminaryNetRevenue\n      });`;
  if(!html.includes(oldRaw)) throw new Error('v10 inventory expense context marker not found');
  html=html.replace(oldRaw,newRaw);

  const approvedLine='    const approvedRrpGross=Math.max(0,Number(product.approvedRrpGross)||0);';
  const first=html.indexOf(approvedLine);
  const second=html.indexOf(approvedLine,first+approvedLine.length);
  if(first<0||second<0) throw new Error('v10 approvedRrpGross duplicate not found after patch');
  html=html.slice(0,second)+html.slice(second+approvedLine.length+1);
  return html;
}

function extractEngine(html){
  const start=html.indexOf('(function(root,factory){');
  const end=html.indexOf('</script>',start);
  if(start<0||end<0) throw new Error('v10 engine block not found');
  const code=html.slice(start,end);
  const sandbox={module:{exports:{}},exports:{},console};
  vm.runInNewContext(code,sandbox,{timeout:5000});
  return sandbox.module.exports;
}

function approx(actual,expected,tol=0.02,label='value'){
  if(Math.abs(actual-expected)>tol) throw new Error(`${label}: expected ${expected}, got ${actual}`);
}

function testV10(html){
  const E=extractEngine(html);
  const base=E.clone(E.DEFAULT_STATE);
  base.vatRate=16;base.incomeTaxRate=20;base.ownerTaxRate=0;
  Object.values(base.channels).forEach(c=>{c.active=true;c.share=0;c.sellInReductionPct=0;c.invoiceDiscountPct=0;c.rebatePct=0;c.returnsPct=0;c.paymentFeePct=0;c.lastMilePerUnit=0;});
  base.channels.retail.share=100;base.channels.retail.sellInReductionPct=25;
  Object.assign(base.singleProduct,{purchasePrice:246000,purchasePriceMode:'net',inputVatRecoverable:true,purchasedUnits:1,soldUnits:1,writeoffUnits:0,approvedRrpGross:400000});
  base.expenses.forEach(e=>{e.status='na';e.value=0;});

  const inbound=base.expenses.find(e=>e.id==='inbound_logistics');
  Object.assign(inbound,{status:'include',category:'inventory',method:'pct',value:3,base:'invoiceGross',vatTreatment:'gross_recoverable',taxDeductible:true});
  let r=E.calcProduct(base,base.singleProduct);
  approx(r.inventoryCash,9000,0.02,'inbound cash');
  approx(r.inventoryPnl,9000/1.16,0.02,'inbound pnl');
  approx(r.inventoryVat,9000-9000/1.16,0.02,'inbound VAT');
  approx(r.totals.cogs,246000+9000/1.16,0.02,'COGS with inbound');

  inbound.status='na';
  const customs=base.expenses.find(e=>e.id==='customs_cert');
  Object.assign(customs,{status:'include',category:'inventory',method:'pct',value:3,base:'purchaseCost',vatTreatment:'no_vat',taxDeductible:true});
  r=E.calcProduct(base,base.singleProduct);
  approx(r.inventoryPnl,7380,0.02,'customs pnl');
  approx(r.totals.cogs,253380,0.02,'COGS with customs');

  customs.status='na';
  const warranty=base.expenses.find(e=>e.id==='warranty_returns');
  Object.assign(warranty,{status:'include',category:'variable',method:'pct',value:2,base:'netRevenueBeforeContra',vatTreatment:'no_vat',taxDeductible:true});
  r=E.calcProduct(base,base.singleProduct);
  approx(r.totals.variable,(300000/1.16)*0.02,0.02,'warranty variable');

  warranty.status='review';
  r=E.calcProduct(base,base.singleProduct);
  approx(r.totals.variable,0,0.001,'review exclusion');
  console.log('v10 expense tests passed');
}

function auditV9(html){
  const required=[
    "if(!p.en) return;",
    "basePerUnit(p.base,ch,core,totalsPre)",
    "byChannel[ch.key][p.treat]+=v;",
    "const totalCogs=coreCogs+cogsAddons;",
    "const netRevenue=revenueBeforeContra-sums.contraRevenue;",
    "const contribution=grossProfit-sums.variableSelling;",
    "const ebitda=contribution-sums.marketing-sums.fixedOpex;",
    "const pbt=ebit-sums.finance;",
    "const taxableIncome=pbt+sums.nonDeductible;"
  ];
  for(const x of required) if(!html.includes(x)) throw new Error('v9 audit marker missing: '+x);
  console.log('v9 expense audit passed');
}

function updateBuildFiles(){
  const indexPath=path.join('margin-calculators','v10','index.html');
  let index=fs.readFileSync(indexPath,'utf8');
  index=index.replace(/const BUILD='[^']+';/,`const BUILD='${BUILD}';`)
             .replace(/manifest\.webmanifest\?v=[^"']+/g,`manifest.webmanifest?v=${BUILD}`)
             .replace(/icon\.svg\?v=[^"']+/g,`icon.svg?v=${BUILD}`);
  fs.writeFileSync(indexPath,index);
  const swPath=path.join('margin-calculators','v10','service-worker.js');
  let sw=fs.readFileSync(swPath,'utf8').replace(/const BUILD='[^']+';/,`const BUILD='${BUILD}';`);
  fs.writeFileSync(swPath,sw);
}

const outDir=path.join('margin-calculators','_debug');
fs.mkdirSync(outDir,{recursive:true});
const v9=readPacked('v9',5);
auditV9(v9);
fs.writeFileSync(path.join(outDir,'v9-source.html'),v9);
let v10=readPacked('v10',6);
v10=patchV10(v10);
testV10(v10);
fs.writeFileSync(path.join(outDir,'v10-source.html'),v10);
writePacked('v10',6,v10);
updateBuildFiles();
console.log('v10 patched and packed',v10.length,BUILD);
