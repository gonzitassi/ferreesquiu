# Stock y reposición de ESQUIÚ

## Alcance

La sección vive dentro de `/web/admin/` y solo aparece para las cuentas con rol `owner` o `admin`. La API vuelve a comprobar ese rol en cada operación. Las tablas nuevas de Supabase tienen RLS habilitado y deniegan acceso directo a `anon` y `authenticated`; las consultas pasan por la función administrativa existente.

La carga manual crea snapshots de stock en tablas propias de ESQUIÚ. No actualiza la tabla de productos de la tienda, no descuenta unidades al vender y no llama ni escribe en Alegon. Los mínimos, proveedores corregidos, sugerencias, pedidos y estados son datos internos de ESQUIÚ.

## Primera prueba

1. En Alegon, exportar de forma manual entre 3 y 10 productos a CSV o Excel.
2. Revisar que el archivo tenga código, nombre o descripción, stock y precio. Categoría, stock mínimo y proveedor se importan si están disponibles; los mínimos y proveedores se pueden corregir después desde la sección.
3. Confirmar si el precio exportado es precio de venta o costo de compra. El total del pedido es solo orientativo y la página pide confirmar precio y disponibilidad con el proveedor.
4. En `Stock y reposición → Importar`, revisar la vista previa y recién entonces guardar el snapshot.
5. Comparar códigos, unidades, stock y precios con Alegon. Esta comparación no requiere modificar Alegon.

Encabezados reconocidos: `codigo` o `sku`; `nombre`, `producto` o `descripcion`; `categoria`, `rubro` o `sector`; `stock`, `existencia` o `cantidad`; `stock_minimo` o `minimo` (opcional); `precio`, `precio venta` o `venta`; `proveedor` (opcional). Se admiten CSV y Excel `.xlsx`, hasta 500 filas y 10 MB.

## Pedidos

La cantidad sugerida empieza en la diferencia entre stock mínimo y stock actual. Se puede cambiar por producto antes de guardar. Al crear pedidos, ESQUIÚ agrupa los productos por proveedor y guarda borradores. El botón «Copiar mensaje» solo copia texto al portapapeles; el usuario lo envía manualmente por WhatsApp o correo. El estado cambia manualmente de borrador a enviado y luego a recibido. Ningún estado escribe en Alegon.

## Alternativa recomendada para sincronizar Alegon

1. Primero hacer la prueba manual descrita arriba y validar qué representa cada columna, sobre todo unidades, precio y proveedor.
2. Si Alegon ofrece una API oficial, usar una credencial de integración restringida a lectura, consultada desde un backend y guardada como secreto. No poner tokens en JavaScript del navegador.
3. Si no hay API, usar una exportación automática a un canal privado que ESQUIÚ solo pueda leer. Si solo se ofrece acceso a base de datos, pedir al proveedor un usuario separado con permisos `SELECT` y limitarlo a las tablas necesarias; no usar credenciales de administración.

La conexión automática queda fuera de esta implementación hasta recibir la documentación oficial de Alegon y aprobar el mapeo. La importación manual es el piloto seguro y reversible.

## Publicación

Antes de desplegar la nueva función o el panel, aplicar `supabase/migrations/20261013000000_esquiu_stock_replenishment.sql` al proyecto Supabase de ESQUIÚ y luego publicar la función `esquiu-api` y los archivos de `web/`. La migración solo agrega tablas e índices; no modifica las tablas de LubriApp ni las tablas actuales del catálogo de ESQUIÚ. Mantener las nuevas tablas fuera de acceso directo público y no copiar secretos al repositorio.

