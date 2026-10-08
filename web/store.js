(function () {
  'use strict';
  const key='esquiu.store.v2';
  const normalize=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const read=()=>{try{return JSON.parse(localStorage.getItem(key))||{}}catch{return {}}};
  const saved=read();
  const state={cart:Array.isArray(saved.cart)?saved.cart:[],favorites:Array.isArray(saved.favorites)?saved.favorites:[],products:[],status:'loading',error:null};
  const limit=p=>p.stockMode==='untracked'?(p.maxQuantity||99):p.stock;
  const save=()=>{try{localStorage.setItem(key,JSON.stringify({cart:state.cart,favorites:state.favorites}))}catch{ /* A storage restriction must not break navigation. */ }};
  const money=n=>new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS',minimumFractionDigits:2,maximumFractionDigits:2}).format(n);
  function validateProducts(rows){
    if(!Array.isArray(rows))throw Error('El catálogo debe ser una lista.');
    const ids=new Set(),slugs=new Set(ESQUIU_DATA.categories.map(c=>c.slug));
    return rows.map(p=>{
      if(!p||typeof p.id!=='string'||!p.id||ids.has(p.id)||typeof p.name!=='string'||!p.name||!slugs.has(p.category)||!Number.isFinite(p.price)||p.price<0||!(p.stockMode==='untracked'&&p.stock===null)&&(!Number.isInteger(p.stock)||p.stock<0)||typeof p.image!=='string'||!p.image)throw Error('Hay un producto con datos incompletos.');
      if(!(/^(assets\/|https:\/\/|\/media\/)/.test(p.image)))throw Error('La imagen de producto debe ser local o HTTPS.');
      ids.add(p.id);return {...p};
    });
  }
  async function load(){
    try{
      let rows=ESQUIU_DATA.products;
      if(ESQUIU_DATA.integrations.catalogEndpoint){const r=await EsquiuApi.fetch(ESQUIU_DATA.integrations.catalogEndpoint);if(!r.ok)throw Error('Catálogo no disponible.');rows=await r.json()}
      state.products=validateProducts(rows);state.status='ready';state.error=null;
      state.cart=state.cart.filter(r=>state.products.some(p=>p.id===r.id)&&Number.isInteger(r.qty)&&r.qty>0).map(r=>({id:r.id,qty:Math.min(r.qty,limit(state.products.find(p=>p.id===r.id)))})).filter(r=>r.qty>0);
      state.favorites=state.favorites.filter(id=>state.products.some(p=>p.id===id));save();
    }catch(e){state.status='error';state.error=e.message;state.products=[];state.cart=[];state.favorites=[]}
  }
  function search(query,category=''){const terms=normalize(query).split(/\s+/).filter(Boolean);return state.products.filter(p=>(!category||p.category===category)&&terms.every(t=>normalize([p.name,p.sku,p.brand,p.description].join(' ')).includes(t)))}
  function add(id,qty=1){const p=state.products.find(p=>p.id===id);if(!p||limit(p)<1)throw Error('Este producto no tiene stock confirmado.');let r=state.cart.find(r=>r.id===id);const next=(r?.qty||0)+qty;if(!Number.isInteger(qty)||qty<1||next>limit(p))throw Error(p.stockMode==='untracked'?'La cantidad supera el límite permitido por pedido.':'La cantidad supera el stock disponible.');if(r)r.qty=next;else state.cart.push({id,qty});save()}
  function quantity(id,qty){const p=state.products.find(p=>p.id===id);if(!p)return;if(!Number.isInteger(qty)||qty<0||qty>limit(p))throw Error('Revisá la cantidad permitida para este pedido.');if(qty===0)state.cart=state.cart.filter(r=>r.id!==id);else {const r=state.cart.find(r=>r.id===id);if(r)r.qty=qty}save()}
  function favorite(id){if(!state.products.some(p=>p.id===id))return;state.favorites=state.favorites.includes(id)?state.favorites.filter(x=>x!==id):[...state.favorites,id];save()}
  const lines=()=>state.cart.map(r=>({...r,product:state.products.find(p=>p.id===r.id)})).filter(r=>r.product);
  const total=()=>lines().reduce((sum,r)=>sum+r.product.price*r.qty,0);
  window.EsquiuStore={limit,state,normalize,money,load,search,validateProducts,add,quantity,favorite,lines,total,count:()=>state.cart.reduce((n,r)=>n+r.qty,0)};
})();
