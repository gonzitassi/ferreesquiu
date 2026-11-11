// Lectura local: no guarda ni envía datos a ALEGON o Supabase.
export function parseAlegonPreview(pricesText, stockText) {
  const lines = text => text.split(/\r?\n/).map(x=>x.trim()).filter(Boolean).map(x=>x.split(';').map(v=>v.trim()));
  const prices=lines(pricesText), stocks=lines(stockText), stockMap=new Map(), seen=new Set();
  if(!prices.length) throw Error('Pegá al menos una línea del archivo de precios.');
  for(const [index,row] of stocks.entries()) {
    if(row.length<3 || !row[0] || !row[1] || !/^-?\d+(?:\.\d+)?$/.test(row[2])) throw Error(`Revisá la línea ${index+1} de stock.`);
    const values=stockMap.get(row[1])||[]; values.push({location:row[0],quantity:row[2]}); stockMap.set(row[1],values);
  }
  return prices.map((row,index)=>{
    if(row.length<6 || !row[0] || !row[2] || !/^\d+(?:\.\d+)?$/.test(row[4])) throw Error(`Revisá la línea ${index+1} de precios.`);
    if(seen.has(row[0])) throw Error(`El código ${row[0]} está repetido en precios; revisalo.`);seen.add(row[0]);
    const records=stockMap.get(row[0])||[];
    return {sku:row[0],brand:row[1],name:row[2],additionalCode:row[3],price:row[4],flag:row[5],stock:records.length===1?records[0].quantity:null,stockStatus:records.length>1?'revisar':records.length?'registrado':'sin dato'};
  });
}
