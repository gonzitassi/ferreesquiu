import { parseAlegonPreview } from './alegon-preview.js';
let apiCall, notify, stockData = null, selected = new Set(), pendingRows = null, initialSupplier = '';
const $ = (s, root = document) => root.querySelector(s);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money = cents => new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS'}).format((Number(cents)||0)/100);
const units = value => value == null ? 'Sin dato' : new Intl.NumberFormat('es-AR',{maximumFractionDigits:3}).format(Number(value));
const stamp = value => value ? new Date(Number(value)).toLocaleString('es-AR') : '—';
const supplierName = item => item.supplier || 'Sin proveedor';
const level = item => item.stock == null ? 'unknown' : Number(item.stock) <= 0 ? 'critical' : item.minStock == null ? 'unknown' : Number(item.minStock)>0 && Number(item.stock)<=Number(item.minStock) ? 'low' : 'ok';
const levelText = item => ({critical:'Cantidad registrada ≤ 0',low:'Revisar mínimo',ok:'En nivel',unknown:'Revisar datos'}[level(item)]);
const suggested = item => item.suggestedQty == null ? '' : Math.max(0,Number(item.suggestedQty)||0);

export function setReplenishmentHandlers({api,toast}) {
  apiCall=api; notify=toast;
  document.addEventListener('input', event => {
    if(event.target.matches('#stockSearch,#stockLevelFilter,#stockSupplierFilter')) renderStockCards();
  });
  document.addEventListener('change', async event => {
    if(event.target.matches('#stockLevelFilter,#stockSupplierFilter')) renderStockCards();
    if(event.target.id==='stockFile' && event.target.files?.[0]) {
      try { pendingRows=await parseStockFile(event.target.files[0]); renderImportPreview(event.target.files[0].name); }
      catch(error) { pendingRows=null; $('#stockImportPreview')?.replaceChildren(Object.assign(document.createElement('p'),{className:'error',textContent:error.message})); }
    }
    if(event.target.matches('[data-stock-select]')) {
      event.target.checked ? selected.add(event.target.value) : selected.delete(event.target.value);
      updateSelectedSummary();
    }
    if(event.target.id==='stockSelectAll') {
      filteredItems().forEach(item=>event.target.checked?selected.add(item.sku):selected.delete(item.sku));
      renderStockCards();
    }
  });
  document.addEventListener('click', async event => {
    const button=event.target.closest('button'); if(!button)return;
    try {
      if(button.hasAttribute('data-alegon-preview')) {
        const rows=parseAlegonPreview($('#alegonPrices').value,$('#alegonStock').value);
        $('#alegonResults').innerHTML=`<p>${rows.length} productos. Stock físico pendiente de conteo; verificá precios antes de usarlos.</p><div class="table-wrap"><table><thead><tr><th>Código</th><th>Marca</th><th>Producto</th><th>Precio exportado</th><th>Stock ALEGON</th></tr></thead><tbody>${rows.map(row=>`<tr><td>${esc(row.sku)}</td><td>${esc(row.brand)}</td><td>${esc(row.name)}</td><td>${esc(row.price)}</td><td>${row.stockStatus==='revisar'?'Varios registros: revisar':row.stockStatus==='sin dato'?'Sin dato':esc(row.stock)}</td></tr>`).join('')}</tbody></table></div>`;
      }
      if(button.dataset.stockVendor){location.hash=`#/replenishment?view=stock&supplier=${encodeURIComponent(button.dataset.stockVendor)}`;return;}
      if(button.hasAttribute('data-save-stock-rule')) {
        const card=button.closest('[data-stock-card]');
        const minValue=$('.stock-min',card).value.trim(), qtyValue=$('.stock-suggested',card).value.trim(); const minStock=minValue ? Number(minValue) : null, suggestedQty=qtyValue ? Number(qtyValue) : null;
        if((minStock!=null&&(!Number.isFinite(minStock)||minStock<0))||(suggestedQty!=null&&(!Number.isFinite(suggestedQty)||suggestedQty<0)))throw Error('Ingresá cantidades válidas, iguales o mayores a cero.');
        button.disabled=true;
        await apiCall(`replenishment/rules/${encodeURIComponent(card.dataset.stockCard)}`,{method:'PUT',body:{minStock,suggestedQty,supplier:$('.stock-supplier',card).value.trim()}});
        const item=stockData.items.find(row=>row.sku===card.dataset.stockCard); item.minStock=minStock;item.suggestedQty=suggestedQty;item.supplier=$('.stock-supplier',card).value.trim();
        notify('Mínimo, proveedor y sugerencia guardados en Esquiú. Alegon no se modificó.'); renderStockCards();
      }
      if(button.hasAttribute('data-stock-order')) {
        const card=button.closest('[data-stock-card]'),item=stockData.items.find(row=>row.sku===card.dataset.stockCard);
        const result=await apiCall('replenishment/orders',{method:'POST',body:{items:[{sku:item.sku,quantity:Number($('.stock-suggested',card).value)}]}});
        notify(`Borrador creado para ${result.created} proveedor.`);location.hash='#/replenishment?view=orders';
      }
      if(button.hasAttribute('data-build-stock-orders')) {
        const visibleOverview=$('#overviewItems') ? new Set($$('#overviewItems [data-stock-select]:checked').map(input=>input.value)) : null;
        const items=stockData.items.filter(item=>selected.has(item.sku)&&(!visibleOverview||visibleOverview.has(item.sku))).map(item=>({sku:item.sku,quantity:Number($(`[data-stock-qty="${CSS.escape(item.sku)}"]`)?.value??suggested(item))}));
        if(!items.length)throw Error('Seleccioná al menos un producto.');
        if(items.some(row=>!Number.isFinite(row.quantity)||row.quantity<=0))throw Error('La cantidad a pedir debe ser mayor que cero.');
        button.disabled=true;const result=await apiCall('replenishment/orders',{method:'POST',body:{items}});
        selected.clear();notify(`Se crearon ${result.created} borradores, agrupados por proveedor.`);location.hash='#/replenishment?view=orders';
      }
      if(button.dataset.copyReplenishment) {
        const order=stockData.orders.find(row=>row.id===button.dataset.copyReplenishment);if(!order)throw Error('No encontramos ese pedido.');
        await copyText(orderMessage(order));notify('Mensaje copiado. Enviá el pedido manualmente por WhatsApp o correo.');
      }
      if(button.dataset.replenishmentStatus) {
        button.disabled=true;await apiCall(`replenishment/orders/${button.dataset.replenishmentStatus}`,{method:'PUT',body:{status:button.dataset.nextStatus}});
        notify(button.dataset.nextStatus==='sent'?'Pedido marcado como enviado.':'Pedido marcado como recibido.');$('#main').innerHTML=await loadAndRender('orders',new URLSearchParams(location.hash.split('?')[1]||'').get('supplier'));
      }
      if(button.hasAttribute('data-stock-refresh')) $('#main').innerHTML=await loadAndRender(new URLSearchParams(location.hash.split('?')[1]||'').get('view')||'overview');
      if(button.hasAttribute('data-stock-select-all')) { const checks=$$('#stockItems [data-stock-select]');const shouldSelect=checks.some(check=>!check.checked);checks.forEach(check=>{check.checked=shouldSelect;check.dispatchEvent(new Event('change',{bubbles:true}));}); }
      if(button.hasAttribute('data-overview-select-all')) { const checks=$$('#overviewItems [data-stock-select]');const shouldSelect=checks.some(check=>!check.checked);checks.forEach(check=>{check.checked=shouldSelect;check.dispatchEvent(new Event('change',{bubbles:true}));}); }
      if(button.hasAttribute('data-stock-commit-import')) {
        if(!pendingRows?.length)throw Error('Elegí y revisá primero un archivo de productos.');button.disabled=true;
        const file=$('#stockFile')?.files?.[0];await apiCall('replenishment/import',{method:'POST',body:{source:file?.name||'Importación manual',rows:pendingRows}});
        pendingRows=null;selected.clear();notify('Snapshot guardado en Supabase. Alegon quedó intacto.');await loadAndRender('overview');
      }
    } catch(error) { button.disabled=false;notify(error.message||'No se pudo completar la acción.'); }
  });
}

const $$ = (s,root=document) => [...root.querySelectorAll(s)];
export async function renderReplenishment(view='overview',params=new URLSearchParams()) { return loadAndRender(view,params.get('supplier')); }

async function loadAndRender(view='overview',supplier=null) {
  if(view==='muestra')return sampleView(await apiCall('replenishment/alegon-sample'));
  stockData=await apiCall('replenishment');
  if(view==='alegon')return alegonView();
  if(view==='import')return importView();
  if(view==='suppliers')return suppliersView();
  if(view==='orders')return ordersView();
  if(view==='stock')return stockView(supplier);
  return overviewView();
}

function tabs(active) {
  return `<nav class="stock-tabs" aria-label="Secciones de stock">${[['overview','Hoy'],['stock','Stock'],['suppliers','Proveedores'],['orders','Pedidos'],['import','Importar'],['alegon','Archivos ALEGON'],['muestra','Muestra guardada']].map(([key,label])=>`<a class="${active===key?'active':''}" href="#/replenishment?view=${key}">${label}</a>`).join('')}</nav>`;
}
function title(view,heading,subtitle,actions='') {
  return `<div class="page-head"><div><p class="stock-eyebrow">STOCK Y REPOSICIÓN</p><h1>${heading}</h1><p class="muted">${subtitle}</p></div><div class="actions">${actions}</div></div>${tabs(view)}`;
}
function summaryCards() {
  const rows=stockData.items||[],critical=rows.filter(i=>i.stock!=null&&Number(i.stock)<=0).length,low=rows.filter(i=>i.stock!=null&&i.minStock!=null&&Number(i.stock)>0&&Number(i.minStock)>0&&Number(i.stock)<=Number(i.minStock)).length,unknown=rows.filter(i=>i.stock==null).length;
  const inTransit=(stockData.orders||[]).filter(o=>o.status==='sent').length;
  return `<div class="rep-stats"><article class="rep-stat rep-stat-alert"><span>Stock registrado ≤ 0</span><strong>${critical}</strong><small>Para revisar</small></article><article class="rep-stat"><span>Bajo el mínimo</span><strong>${low}</strong><small>Con mínimo cargado</small></article><article class="rep-stat"><span>Stock sin dato</span><strong>${unknown}</strong><small>Requiere revisión</small></article><article class="rep-stat"><span>Pedidos enviados</span><strong>${inTransit}</strong><small>Esperando recepción</small></article></div>`;
}
function overviewView() {
  const items=stockData.items||[], rows=items.filter(i=>level(i)!=='ok').slice(0,6), orders=stockData.orders||[], draft=orders.find(o=>o.status==='draft'), recent=orders.filter(o=>o.status!=='received').slice(0,3);
  const safety=stockData.sample ? 'Muestra Lüsqtoff guardada · Sin actualización automática · Stock físico pendiente de conteo.' : 'Datos de la última importación · Sin actualización automática · Stock físico pendiente de conteo.';
  const orderStatus={draft:'Borrador',sent:'Enviado',received:'Recibido'};
  const orderCard=draft?`<p class="rep-card-kicker">BORRADOR PARA REVISAR</p><h2>${esc(draft.supplier)}</h2><p class="muted">${draft.itemCount} ${draft.itemCount===1?'producto':'productos'} · precio de compra a confirmar.</p><div class="rep-order-lines">${draft.items.slice(0,3).map(i=>`<div><span>${esc(i.name)}</span><strong>${units(i.quantity)} u.</strong></div>`).join('')}${draft.items.length>3?`<small>y ${draft.items.length-3} más</small>`:''}</div><button class="rep-copy" data-copy-replenishment="${esc(draft.id)}">Copiar mensaje para proveedor</button>`:`<p class="rep-card-kicker">PEDIDOS A PROVEEDORES</p><h2>Prepará tu primer pedido</h2><p class="muted">Asigná un proveedor y una cantidad en Stock. Después podés guardar un borrador para revisarlo.</p><a class="btn yellow" href="#/replenishment?view=stock">Ir a productos</a>`;
  return title('overview','Qué hacer hoy','Organizá la reposición desde un solo lugar.',`<button class="btn outline" data-stock-refresh>Actualizar vista</button>`)+`<div class="rep-sync"><span><span class="rep-sync-dot"></span>${esc(safety)}</span><a href="#/replenishment?view=alegon">Ver datos de ALEGON</a></div><div class="rep-hero"><div><p class="rep-kicker">TU RESUMEN DE REPOSICIÓN</p><h2>${items.length?`${items.length} ${items.length===1?'producto disponible':'productos disponibles'} para revisar`:'Empezá con una carga de productos'}</h2><p>Revisá las cantidades registradas y prepará pedidos por proveedor.</p></div><a class="rep-hero-btn" href="#/replenishment?view=stock">Ver productos</a></div>${summaryCards()}<div class="rep-workspace"><section class="rep-panel"><div class="rep-panel-head"><div><h2>Prioridad de hoy</h2><p>Seleccioná productos y cargá la cantidad que querés pedir.</p></div><button class="btn outline" data-overview-select-all>Seleccionar visibles</button></div><div id="overviewItems">${rows.length?rows.map(item=>`<div class="rep-item"><label class="rep-check"><input type="checkbox" data-stock-select value="${esc(item.sku)}" ${selected.has(item.sku)?'checked':''} aria-label="Seleccionar ${esc(item.name)}"></label><div class="rep-product"><strong>${esc(item.name)}</strong><small>${esc(item.sku)} · ${esc(supplierName(item))}<br>Registrado: ${units(item.stock)} · Mínimo: ${units(item.minStock)}</small></div><label class="rep-quantity"><span>Pedir</span><input type="number" min="0.001" step="0.001" data-stock-qty="${esc(item.sku)}" value="${esc(suggested(item))}" aria-label="Cantidad a pedir de ${esc(item.name)}"></label><span class="badge ${level(item)}">${levelText(item)}</span></div>`).join(''):`<div class="rep-empty">${items.length?'No hay productos pendientes de revisión.':'Todavía no hay productos cargados para revisar.'}</div>`}</div><div class="rep-panel-footer"><a href="#/replenishment?view=stock">Ver todo el stock →</a><button class="btn yellow" data-build-stock-orders>Crear borradores <span id="selectedCount">(${rows.filter(item=>selected.has(item.sku)).length})</span></button></div></section><div class="rep-side"><section class="rep-panel rep-supplier">${orderCard}</section><section class="rep-panel rep-tracking"><div class="rep-panel-head"><div><h2>Seguimiento rápido</h2><p>Pedidos que todavía falta resolver.</p></div></div>${recent.length?recent.map(order=>`<div class="rep-track-row"><span class="rep-track-icon">↗</span><div><strong>${esc(order.supplier)}</strong><small>${order.itemCount} ${order.itemCount===1?'producto':'productos'} · ${esc(order.code)}</small></div><span class="rep-track-status">${esc(orderStatus[order.status]||order.status)}</span></div>`).join(''):'<div class="rep-empty">Todavía no hay pedidos para mostrar.</div>'}<a class="rep-track-link" href="#/replenishment?view=orders">Ver todos los pedidos →</a></section></div></div>`;
}
function stockView(supplier=null) {
  const suppliers=[...new Set((stockData.items||[]).map(supplierName))].sort();
  const safeSupplier=supplier&&suppliers.includes(supplier)?supplier:'';
  initialSupplier=safeSupplier;
  return title('stock','Stock de productos','Buscá por nombre o código, corregí mínimos y cantidades a reponer.')+`<div class="notice stock-safety"><strong>Solo lectura de origen:</strong> el stock mostrado proviene de la muestra o la última importación y está pendiente de conteo físico. No hay actualización automática. Los mínimos, proveedores, sugerencias y pedidos se guardan por separado en Esquiú.<br><span>Actualizado: ${esc(stamp(stockData.snapshot?.importedAt))}</span></div><div class="stock-filters"><input id="stockSearch" type="search" placeholder="Buscar por nombre o código" aria-label="Buscar stock" autocomplete="off"><select id="stockLevelFilter" aria-label="Filtrar por nivel"><option value="all">Todos los niveles</option><option value="critical">Cantidad registrada ≤ 0</option><option value="unknown">Revisar datos</option><option value="low">Stock bajo</option><option value="ok">En nivel</option></select><select id="stockSupplierFilter" aria-label="Filtrar por proveedor"><option value="">Todos los proveedores</option>${suppliers.map(name=>`<option value="${esc(name)}" ${name===safeSupplier?'selected':''}>${esc(name)}</option>`).join('')}</select></div><div class="stock-bulk"><label><input type="checkbox" id="stockSelectAll"> Seleccionar productos visibles</label><button class="btn yellow" data-build-stock-orders>Crear borradores por proveedor <span id="selectedCount">(${selected.size})</span></button></div><div id="stockItems" class="stock-items">${stockCards()}</div>`;
}
function filteredItems() {
  if(!stockData?.items)return [];
  const query=($('#stockSearch')?.value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim(),levelFilter=$('#stockLevelFilter')?.value||'all',supplier=$('#stockSupplierFilter')?.value??initialSupplier;
  return stockData.items.filter(item=>`${item.name} ${item.sku} ${item.brand||''} ${item.category}`.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().includes(query)&&(levelFilter==='all'||level(item)===levelFilter)&&(!supplier||supplierName(item)===supplier));
}
function stockCards() {
  const rows=filteredItems();
  if(!rows.length)return `<div class="empty">${stockData.items?.length?'No encontramos productos con esos filtros.':'No hay stock cargado. Usá Importar para cargar una exportación de prueba.'}</div>`;
  return rows.map(item=>`<article class="stock-card" data-stock-card="${esc(item.sku)}"><div class="stock-card-main"><label class="stock-check"><input type="checkbox" data-stock-select value="${esc(item.sku)}" ${selected.has(item.sku)?'checked':''} aria-label="Seleccionar ${esc(item.name)}"><span></span></label><div class="stock-product"><strong>${esc(item.name)}</strong><span>${esc(item.sku)} · ${esc(item.brand||item.category||'Sin categoría')}</span></div><span class="badge ${level(item)}">${levelText(item)}</span></div><div class="stock-metrics"><div><small>Stock registrado</small><strong>${units(item.stock)}</strong></div><div><small>Precio exportado · a confirmar</small><strong>${money(item.priceCents)}</strong></div><label><small>Stock mínimo</small><input class="stock-min" type="number" min="0" step="0.001" value="${esc(item.minStock)}" aria-label="Mínimo ${esc(item.name)}"></label><label><small>Proveedor</small><input class="stock-supplier" value="${esc(item.supplier||'')}" placeholder="Sin asignar" aria-label="Proveedor ${esc(item.name)}"></label><label><small>Cantidad a pedir</small><input class="stock-suggested" data-stock-qty="${esc(item.sku)}" type="number" min="0.001" step="0.001" value="${esc(suggested(item))}" aria-label="Cantidad sugerida ${esc(item.name)}"></label></div><div class="stock-card-actions"><button class="btn outline" data-save-stock-rule>Guardar ajustes</button><button class="btn" data-stock-order>Preparar pedido</button></div></article>`).join('');
}
function renderStockCards() { const container=$('#stockItems');if(container)container.innerHTML=stockCards();updateSelectedSummary(); }
function updateSelectedSummary() { const label=$('#selectedCount');if(label){const n=$('#overviewItems') ? $$('#overviewItems [data-stock-select]:checked').length : selected.size;label.textContent=`(${n})`;} }
function suppliersView() {
  const groups=Object.groupBy?Object.groupBy(stockData.items||[],supplierName):(stockData.items||[]).reduce((out,item)=>((out[supplierName(item)]??=[]).push(item),out),{});
  const cards=Object.entries(groups).sort(([a],[b])=>a.localeCompare(b,'es')).map(([name,items])=>`<article class="supplier-card"><div><p class="stock-eyebrow">PROVEEDOR</p><h2>${esc(name)}</h2><p class="muted">${items.length} ${items.length===1?'producto':'productos'} · ${items.filter(i=>level(i)!=='ok').length} para revisar</p></div><div class="supplier-products">${items.slice(0,4).map(item=>`<span>${esc(item.name)} <b>${units(item.stock)} / ${units(item.minStock)}</b></span>`).join('')}${items.length>4?`<small>y ${items.length-4} más</small>`:''}</div><button class="btn outline" data-stock-vendor="${esc(name)}">Ver productos</button></article>`).join('');
  return title('suppliers','Proveedores','Agrupamos los productos del último archivo por proveedor.')+`<div class="notice stock-safety">Los proveedores importados o corregidos acá se guardan solo en Esquiú; no se escribe nada en Alegon.</div><div class="supplier-grid">${cards||'<div class="empty">Importá productos para agruparlos por proveedor.</div>'}</div>`;
}
function ordersView() {
  const statuses={draft:'Borrador',sent:'Enviado',received:'Recibido'};
  const rows=(stockData.orders||[]).map(order=>`<article class="replenishment-order"><div class="order-head"><div><p class="stock-eyebrow">${esc(order.code)}</p><h2>${esc(order.supplier)}</h2><span class="muted">${esc(stamp(order.createdAt))} · ${order.itemCount} productos</span></div><span class="badge ${esc(order.status)}">${statuses[order.status]||esc(order.status)}</span></div><div class="order-lines">${order.items.map(item=>`<div><span>${esc(item.sku)} · ${esc(item.name)}</span><b>${units(item.quantity)} u.</b></div>`).join('')}</div><p class="muted">Precio de compra a confirmar con el proveedor.</p><div class="stock-card-actions"><button class="btn outline" data-copy-replenishment="${esc(order.id)}">Copiar mensaje</button>${order.status==='draft'?`<button class="btn" data-replenishment-status="${esc(order.id)}" data-next-status="sent">Marcar enviado</button>`:''}${order.status==='sent'?`<button class="btn yellow" data-replenishment-status="${esc(order.id)}" data-next-status="received">Marcar recibido</button>`:''}</div><p class="muted order-note">Copiá el texto y envialo manualmente por WhatsApp o correo. No se envía automáticamente.</p></article>`).join('');
  return title('orders','Pedidos a proveedores','Historial de pedidos preparados desde Esquiú.')+`<div class="notice stock-safety">Los estados y pedidos son registros internos de Esquiú. Marcar un pedido no actualiza el stock de Alegon.</div><div class="order-grid">${rows||'<div class="empty">Todavía no hay pedidos. Desde Stock podés preparar uno.</div>'}</div>`;
}
function sampleView(result) {
  const rows=Array.isArray(result.rows)?result.rows:[];
  const price=value=>new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS',minimumFractionDigits:2,maximumFractionDigits:3}).format(Number(value));
  return title('muestra','Muestra guardada en Supabase','Cinco productos Lüsqtoff de la exportación compartida.')+`<div class="notice stock-safety"><strong>Muestra inicial:</strong> el stock proviene de ALEGON y está pendiente de conteo físico. El precio exportado debe confirmarse antes de usarlo para vender o comprar. Esta copia no se actualiza automáticamente.</div><section class="panel"><div class="panel-title"><div><h2>Productos de la muestra</h2><p class="muted">Los datos se consultan en Supabase para administradores. No modifican ALEGON ni la tienda.</p></div><button class="btn outline" data-stock-refresh>Actualizar vista</button></div><div class="table-wrap"><table><thead><tr><th>Código</th><th>Marca</th><th>Producto</th><th>Precio exportado</th><th>Stock registrado</th><th>Conteo físico</th></tr></thead><tbody>${rows.map(row=>`<tr><td>${esc(row.codigo)}</td><td>${esc(row.marca)}</td><td>${esc(row.descripcion)}</td><td>${price(row.precio_exportado)}</td><td>${row.stock_alegon==null?'Sin dato':esc(row.stock_alegon)}</td><td>${row.stock_fisico_verificado?'Verificado':'Pendiente'}</td></tr>`).join('')||'<tr><td colspan="6">No hay productos en la muestra.</td></tr>'}</tbody></table></div></section>`;
}
function alegonView() {
  return title('alegon','Revisar archivos de ALEGON','Uní precios y stock por código antes de decidir cómo importarlos.')+`<div class="notice stock-safety"><strong>Vista previa local:</strong> los datos pegados solo se procesan en este navegador y se pierden al salir de la sección. No se guardan ni se envían. El stock de ALEGON está pendiente de conteo físico; el precio debe verificarse.</div><div class="panel"><label class="field">1. Pegá las líneas de precios<textarea id="alegonPrices" rows="6" placeholder="Código;marca;descripción;código adicional;precio;indicador"></textarea></label><label class="field">2. Pegá las líneas de stock<textarea id="alegonStock" rows="6" placeholder="Identificador;código;cantidad"></textarea></label><button class="btn yellow" data-alegon-preview>Ver productos</button><div id="alegonResults" aria-live="polite"></div></div>`;
}
function importView() {
  return title('import','Importar una muestra de stock','Empezá con unos pocos productos exportados manualmente de Alegon.')+`<div class="notice stock-safety"><strong>Prueba segura:</strong> el archivo se guarda como una foto de datos en Supabase. Esta función no inicia sesión en Alegon, no llama a su API y no modifica sus productos ni cantidades. Usá primero 3 a 10 filas y revisá códigos, unidades, precios y proveedores. Confirmá si el precio exportado es costo de compra o precio de venta antes de usar los totales estimados.</div><div class="panel stock-import-panel"><h2>1. Seleccioná una exportación</h2><p>Admite Excel (.xlsx) o CSV (.csv). Encabezados reconocidos: <code>código</code>, <code>nombre/descripcion</code>, <code>categoria/rubro</code>, <code>stock/existencia</code>, <code>stock_minimo</code> (opcional), <code>precio</code> y <code>proveedor</code> (opcional).</p><label class="field">Archivo de stock<input type="file" id="stockFile" accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"></label><div id="stockImportPreview" class="import-preview"><p class="muted">La importación es manual. No conectamos Alegon hasta acordar acceso seguro.</p></div></div><div class="panel"><h2>¿Qué alternativa recomendamos?</h2><ol class="stock-steps"><li><strong>Prueba inicial:</strong> exportación CSV/Excel manual de 3 a 10 productos para confirmar el significado de cada columna y la unidad del stock.</li><li><strong>Luego:</strong> API oficial de Alegon con una credencial exclusiva de lectura, si el proveedor la ofrece. La clave se guardaría solo en backend, nunca en el navegador.</li><li><strong>Si no hay API:</strong> exportación automática depositada en un canal privado y de solo lectura. No recomendamos acceso directo a la base de datos salvo soporte oficial con un usuario restringido a SELECT.</li></ol></div>`;
}

async function parseStockFile(file) {
  if(file.size>10_000_000)throw Error('El archivo debe pesar menos de 10 MB.');
  let rows;
  if(file.name.toLowerCase().endsWith('.csv')) rows=csvRows(await file.text());
  else if(file.name.toLowerCase().endsWith('.xlsx')) {
    if(!window.ExcelJS)throw Error('No está disponible el lector Excel. Recargá el panel.');
    const workbook=new ExcelJS.Workbook();await workbook.xlsx.load(await file.arrayBuffer());const sheet=workbook.worksheets[0];
    if(!sheet||sheet.rowCount>501)throw Error('El archivo está vacío o supera 500 filas.');rows=[];sheet.eachRow(row=>rows.push(row.values.slice(1).map(cell=>cell?.result??cell?.text??cell??'')));
  } else throw Error('Elegí un archivo .xlsx o .csv.');
  if(rows.length<2||rows.length>501)throw Error('El archivo debe tener encabezados y entre 1 y 500 productos.');
  const norm=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/\s+/g,' '),header=rows[0].map(norm);
  const find=options=>header.findIndex(value=>options.includes(value));
  const indexes={sku:find(['codigo','sku','codigo producto','cod']),name:find(['nombre','producto','descripcion','descripcion producto']),category:find(['categoria','rubro','sector']),stock:find(['stock','existencia','stock actual','cantidad']),minStock:find(['stock minimo','minimo','minimo stock','stock_minimo','min stock']),price:find(['precio','precio venta','precio de venta','venta']),supplier:find(['proveedor','marca proveedor','distribuidor'])};
  for(const required of ['sku','name','stock','price'])if(indexes[required]<0)throw Error(`Falta una columna obligatoria: ${required==='sku'?'código':required==='name'?'nombre o descripción':required==='stock'?'stock':'precio'}.`);
  const parseNumber=(value,label,allowCurrency=false)=>{if(typeof value==='number'){if(Number.isFinite(value)&&value>=0)return Math.round(value*1000)/1000;throw Error(`${label}: valor inválido.`)}let raw=String(value??'').trim().replace(/[\s$]/g,'');if(!raw)throw Error(`${label}: valor vacío.`);if(allowCurrency){if(raw.includes(','))raw=raw.replace(/\./g,'').replace(',','.');}else if(raw.includes(',')&&raw.includes('.'))raw=raw.replace(/\./g,'').replace(',','.');else raw=raw.replace(',','.');const number=Number(raw);if(!Number.isFinite(number)||number<0)throw Error(`${label}: valor inválido.`);return Math.round(number*1000)/1000;};
  const seen=new Set(),out=[];
  for(let i=1;i<rows.length;i++){const row=rows[i];if(!row?.some(value=>String(value??'').trim()))continue;const sku=String(row[indexes.sku]??'').trim(),name=String(row[indexes.name]??'').trim();if(!sku||!name)throw Error(`Falta código o nombre en la fila ${i+1}.`);const key=sku.toLocaleUpperCase('es-AR');if(seen.has(key))throw Error(`Código repetido en el archivo: ${sku}.`);seen.add(key);const price=parseNumber(row[indexes.price],`Precio en fila ${i+1}`,true);out.push({sku,name,category:indexes.category<0?'':String(row[indexes.category]??'').trim(),stock:parseNumber(row[indexes.stock],`Stock en fila ${i+1}`),minStock:indexes.minStock<0||String(row[indexes.minStock]??'').trim()===''?null:parseNumber(row[indexes.minStock],`Mínimo en fila ${i+1}`),priceCents:Math.round(price*100),supplier:indexes.supplier<0?'':String(row[indexes.supplier]??'').trim()});}
  if(!out.length)throw Error('No hay productos para importar.');return out;
}
function csvRows(text) {
  text=text.replace(/^\uFEFF/,'');const first=text.split(/\r?\n/)[0]||'',delimiter=(first.match(/;/g)||[]).length>(first.match(/,/g)||[]).length?';':',';let rows=[],row=[],cell='',quoted=false;
  for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}else if(!quoted&&c===delimiter){row.push(cell);cell='';}else if(!quoted&&(c==='\n'||c==='\r')){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(v=>v.trim()))rows.push(row);row=[];cell='';}else cell+=c;}
  if(quoted)throw Error('El CSV tiene comillas sin cerrar.');row.push(cell);if(row.some(v=>v.trim()))rows.push(row);return rows;
}
function renderImportPreview(fileName) {
  const container=$('#stockImportPreview');if(!container)return;
  container.innerHTML=`<h3>2. Revisá antes de guardar</h3><p>${pendingRows.length} productos en <strong>${esc(fileName)}</strong>. Las filas se guardan en un snapshot nuevo; los anteriores siguen disponibles en el historial de pedidos.</p><div class="table-wrap"><table><thead><tr><th>Código</th><th>Producto</th><th>Stock</th><th>Mínimo</th><th>Precio</th><th>Proveedor</th></tr></thead><tbody>${pendingRows.slice(0,8).map(row=>`<tr><td>${esc(row.sku)}</td><td>${esc(row.name)}</td><td>${units(row.stock)}</td><td>${row.minStock===null?'A configurar':units(row.minStock)}</td><td>${money(row.priceCents)}</td><td>${esc(row.supplier||'Sin asignar')}</td></tr>`).join('')}</tbody></table></div>${pendingRows.length>8?`<p class="muted">Mostrando 8 de ${pendingRows.length} productos.</p>`:''}<div class="form-actions"><button class="btn yellow" data-stock-commit-import>Guardar snapshot en Esquiú</button></div>`;
}
function orderMessage(order) {
  const lines=order.items.map(item=>`• ${item.sku} — ${item.name}: ${units(item.quantity)} unidades`);
  return [`Hola, queremos preparar un pedido para ${order.supplier}:`,'',...lines,'','Por favor confirmar disponibilidad, precio y plazo.'].join('\n');
}
async function copyText(value) {
  try { await navigator.clipboard.writeText(value); }
  catch { const field=document.createElement('textarea');field.value=value;field.style.position='fixed';field.style.opacity='0';document.body.append(field);field.select();const copied=document.execCommand('copy');field.remove();if(!copied)throw Error('No se pudo copiar el mensaje.'); }
}

