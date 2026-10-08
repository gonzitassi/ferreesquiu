import fs from 'node:fs';
import vm from 'node:vm';
const box={window:{}};vm.runInNewContext(fs.readFileSync('web/data.js','utf8'),box);const d=box.window.ESQUIU_DATA;fs.writeFileSync('server/defaults.mjs','export const DEFAULTS = '+JSON.stringify({business:d.business,categories:d.categories,presentation:{hero:null,lubricentro:null,empresas:null},payment:{instructions:''}})+';\n');
fs.writeFileSync('server/initial-catalog.mjs','export const INITIAL_IMPORT = '+(fs.existsSync('private/lusqtoff-import.json')?fs.readFileSync('private/lusqtoff-import.json','utf8'):JSON.stringify({source:'Carga manual privada',rows:[]}))+';\n');
fs.mkdirSync('dist/client',{recursive:true});fs.mkdirSync('dist/server',{recursive:true});fs.cpSync('web','dist/client',{recursive:true});fs.cpSync('server/api.mjs','dist/server/api.mjs');fs.cpSync('server/defaults.mjs','dist/server/defaults.mjs');fs.cpSync('server/worker.mjs','dist/server/index.js');fs.mkdirSync('dist/client/admin/vendor',{recursive:true});fs.copyFileSync('node_modules/exceljs/dist/exceljs.min.js','dist/client/admin/vendor/exceljs.min.js');
fs.mkdirSync('dist/.openai',{recursive:true});fs.copyFileSync('.openai/hosting.json','dist/.openai/hosting.json');console.log('Web y Worker de ESQUIÚ preparados.');
fs.copyFileSync('server/initial-catalog.mjs','dist/server/initial-catalog.mjs');
