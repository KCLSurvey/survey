'use strict';
const fs=require('fs');
const path=require('path');
const Module=require('module');
const sourcePath=path.join(__dirname,'calculator_ai_proxy_v2_3.js');
let source=fs.readFileSync(sourcePath,'utf8');
const replacements=[
  ["const PROXY_VERSION = '2.3.0';", "const PROXY_VERSION = '2.4.0';\nconst { normalizeActions } = require('./action-normalizer-v2');"],
  ['function safeParseResult(text, allowActions) {','function safeParseResult(text, allowActions, snapshot) {'],
  ["  let actions = Array.isArray(parsed.actions) ? parsed.actions : [];\n  actions = actions.filter(a => a && actionTypes.includes(a.type)).slice(0, 30).map(a => ({\n    type: String(a.type), target: String(a.target || ''), field: String(a.field || ''),\n    value_text: String(a.value_text ?? ''), reason: String(a.reason || '')\n  }));\n  if (!allowActions) actions = [];", "  const actions = normalizeActions(parsed.actions, snapshot, allowActions);"],
  ['return safeParseResult(text, allowActions);','return safeParseResult(text, allowActions, snapshot);'],
  ['Предпочтительно верни JSON {"answer":"полный ответ","warnings":[],"actions":[]}.', 'Предпочтительно верни JSON {"answer":"полный ответ","warnings":[],"actions":[]}. Каждое действие должно содержать type, target, field и value_text. Для изменения статуса расхода используй, например: {"type":"set_expense","target":"customs_cert","field":"status","value_text":"include"}. Не возвращай действие без поля или нового значения.']
];
for(const [from,to] of replacements){
  if(!source.includes(from))throw new Error('Proxy patch pattern not found: '+from.slice(0,80));
  source=source.replace(from,to);
}
const mod=new Module(sourcePath,module.parent);
mod.filename=sourcePath;
mod.paths=Module._nodeModulePaths(__dirname);
mod._compile(source,sourcePath);
