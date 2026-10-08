const originalExcel=process.env.ESQUIU_TEST_EXCEL;
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import ExcelJS from 'exceljs';

import {INITIAL_IMPORT} from '../server/initial-catalog.mjs';

function store(products){const c={window:{},ESQUIU_DATA:{categories:[{slug:'herramientas'}],products,integrations:{}},localStorage:{getItem:()=>null,setItem(){}},Intl,console};vm.createContext(c);vm.runInContext(fs.readFileSync('web/store.js','utf8'),c);return c.window.EsquiuStore}

test('productos sin control de stock permiten pedir y muestran un límite de cantidad, sin inventar existencias',async()=>{const S=store([{id:'X',sku:'X',name:'Prueba',category:'herramientas',price:100,stock:null,stockMode:'untracked',maxQuantity:99,image:'/media/12345678-1234-1234-1234-123456789abc'}]);await S.load();assert.equal(S.state.status,'ready');S.add('X',2);assert.equal(S.count(),2);assert.equal(S.total(),200);assert.equal(S.state.products[0].stock,null);assert.throws(()=>S.add('X',100));S.quantity('X',0);assert.equal(S.count(),0)});

test('lector del panel interpreta el Excel entregado con los mismos 80 códigos y precios',{skip:!originalExcel},async()=>{const source=fs.readFileSync('web/admin/admin.js','utf8');const start=source.indexOf('function cellValue('),end=source.indexOf('async function reviewImport(');const ctx={ExcelJS,window:{ExcelJS},File,console};vm.createContext(ctx);vm.runInContext(source.slice(start,end)+';globalThis.reader=readImport',ctx);const bytes=fs.readFileSync(originalExcel);const file=new File([bytes],'PRODUCTOS LUSTOFF (MAQUINAS) OCT 2026.xlsx');const data=await ctx.reader(file);assert.equal(data.rows.length,80);assert.equal(new Set(data.rows.map(r=>r.sku)).size,80);assert.ok(data.rows.every(r=>Number.isSafeInteger(r.priceCents)&&r.priceCents>0))});

test('lector CSV soporta separador argentino y campos entre comillas',async()=>{const source=fs.readFileSync('web/admin/admin.js','utf8');const ctx={window:{},File};vm.createContext(ctx);vm.runInContext(source.slice(source.indexOf('function cellValue('),source.indexOf('async function reviewImport('))+';globalThis.reader=readImport',ctx);const file=new File(['CODIGO;MARCA;DESCRIPCION;VENTA\r\nA;LUSQTOFF;"Nombre; con separador";"1.234,50"'],'cat.csv');const data=await ctx.reader(file);assert.equal(data.rows[0].priceCents,123450);assert.equal(data.rows[0].name,'Nombre; con separador')});

