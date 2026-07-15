'use strict';
const fs=require('fs');
const path=require('path');
const root=path.join(__dirname,'..','margin-calculators','ai-proxy');
const sourcePath=path.join(root,'calculator_ai_proxy_v2_3.js');
const outputPath=path.join(root,'calculator_ai_proxy_v2_4.js');
let source=fs.readFileSync(sourcePath,'utf8');
function replaceOne(from,to){if(!source.includes(from))throw new Error('Pattern not found: '+from.slice(0,90));source=source.replace(from,to)}
function replaceAll(from,to){if(!source.includes(from))throw new Error('Pattern not found: '+from.slice(0,90));source=source.split(from).join(to)}
replaceOne("const PROXY_VERSION = '2.3.0';", "const PROXY_VERSION = '2.4.0';\nconst { normalizeActions } = require('./action-normalizer-v2');");
replaceOne('function safeParseResult(text, allowActions) {','function safeParseResult(text, allowActions, snapshot) {');
replaceOne("  let actions = Array.isArray(parsed.actions) ? parsed.actions : [];\n  actions = actions.filter(a => a && actionTypes.includes(a.type)).slice(0, 30).map(a => ({\n    type: String(a.type), target: String(a.target || ''), field: String(a.field || ''),\n    value_text: String(a.value_text ?? ''), reason: String(a.reason || '')\n  }));\n  if (!allowActions) actions = [];", "  const actions = normalizeActions(parsed.actions, snapshot, allowActions);");
replaceAll('return safeParseResult(text, allowActions);','return safeParseResult(text, allowActions, snapshot);');
replaceOne('Предпочтительно верни JSON {"answer":"полный ответ","warnings":[],"actions":[]}.','Предпочтительно верни JSON {"answer":"полный ответ","warnings":[],"actions":[]}. Каждое действие должно содержать type, target, field и value_text. Для изменения статуса расхода используй, например: {"type":"set_expense","target":"customs_cert","field":"status","value_text":"include"}. Не возвращай действие без поля или нового значения.');
fs.writeFileSync(outputPath,source);
const pkgPath=path.join(root,'package.json');
const pkg=JSON.parse(fs.readFileSync(pkgPath,'utf8'));
pkg.version='2.4.0';
pkg.description='Secure AI proxy for margin calculators with canonical AI action normalization';
pkg.scripts.start='node calculator_ai_proxy_v2_4.js';
fs.writeFileSync(pkgPath,JSON.stringify(pkg));
console.log('Built calculator_ai_proxy_v2_4.js and updated package.json');
