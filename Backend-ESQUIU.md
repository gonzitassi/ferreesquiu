# Versión pública de ESQUIÚ

Esta versión de GitHub contiene código e imágenes. Por indicación del negocio, no incluye el Excel ni el catálogo real con sus precios. Se importan privadamente desde el panel. El ZIP local entregado conserva el catálogo original; no se sube a GitHub.

# Backend y panel de ESQUIÚ

## Qué quedó implementado

- Base de datos persistente: productos, pedidos, líneas de pedido, usuarios del equipo, cupones, configuración, importaciones, fotos e historial.
- Panel privado para editar y publicar productos, subir fotos, actualizar precios y administrar ofertas.
- Importación Excel/CSV por código, con vista previa, control de duplicados y actualización de precios sin perder fotos ni rubros.
- Los **80 productos Lusqtoff** del archivo entregado se cargan como borradores. Se conserva VENTA como precio en pesos. El Excel original no fue modificado.
- **Sin control de stock**: no hay unidades inventadas. Los pedidos requieren confirmar disponibilidad y entrega antes de coordinar el pago.
- Pedidos calculados en el servidor, prevención de duplicados, estados, seguimiento privado del cliente, confirmación del total y registro de pagos recibidos.
- Clientes derivados de los pedidos, permisos por función, historial de cambios y exportación de registros.
- Edición de contactos, horarios, banners y fotos de los ocho rubros.

## Abrir la versión local

1. Descomprimí `esquiu-backend.zip` en una carpeta.
2. Ejecutá `ABRIR-PANEL.cmd`. Requiere Node 24.4 o posterior; en este equipo también reconoce el Node incluido con Codex.
3. Abrí `http://127.0.0.1:4190/admin/`.
4. La clave se genera en `.local-data/local-admin-key.txt` dentro de esa carpeta. Es exclusiva de la instalación local; no se envía a un proveedor externo.
5. La tienda está en `http://127.0.0.1:4190/`. Mantené la ventana del servidor abierta mientras lo usás.

La carpeta `.local-data/` contiene la base de datos, fotos y copias locales. Conservála; descomprimir una nueva versión en otra carpeta crea una instalación distinta. No se incluye esa carpeta en el ZIP para evitar compartir claves o datos privados. Las sesiones locales duran ocho horas y se cierran al reiniciar el servidor.

`panel-esquiu.html` es una vista de revisión en solo lectura. **No es el panel conectado** y no guarda ediciones.

## Cómo usar los productos del Excel

En Productos, buscá un código y elegí Editar. Revisá el precio, elegí uno de los ocho rubros, agregá una foto real y publicá. Si falta una foto se muestra «Foto pendiente», sin inventar una imagen del modelo. Podés archivar un producto desactivando su disponibilidad para recibir pedidos.

En Importar Excel se puede volver a cargar el archivo entregado o seleccionar uno nuevo con CODIGO, MARCA, DESCRIPCION y VENTA. Los códigos existentes se actualizan; los nuevos quedan en borrador. Antes de guardar se muestran los cambios de precio. Hasta 1000 productos y 10 MB por archivo. Las fórmulas se leen con su resultado guardado, sin ejecutarlas.

## Flujo de pedidos

El cliente completa contacto y entrega, y envía un pedido a confirmar. La página devuelve su código y un enlace privado de seguimiento. El equipo verifica disponibilidad y carga el costo de entrega —cero para retiro—. El cliente puede revisar y aceptar el total confirmado. Después se coordina el pago usando las instrucciones del negocio. El equipo registra un pago efectivamente recibido con su referencia y marca la entrega. No se envían emails ni WhatsApp automáticamente.

No hay cobro automático de tarjetas ni conexión con Mercado Pago todavía. Eso requiere la cuenta y credenciales del negocio, la configuración del proveedor y sus notificaciones autenticadas. Registrar un pago en el panel no cobra dinero. No se completó ningún pedido real durante el desarrollo.

## Publicación y Alegon

La versión para alojamiento está preparada como Worker con base D1 e imágenes R2. Las migraciones Drizzle se generaron y se probaron localmente. Se reutiliza el proyecto Sites existente; no se creó otro. Falta autorizar la subida que la revisión automática bloqueó previamente, desplegar y comprobar las conexiones reales.

Variables necesarias: `ADMIN_EMAILS` para las cuentas autorizadas y `RATE_LIMIT_SALT` como valor secreto aleatorio. El panel hospedado usa el inicio de sesión de la plataforma; el servidor comprueba permisos en cada operación. La vista privada actual de Sites solo permite al propietario. El público de la tienda y el acceso de otras personas se configuran aparte de los permisos internos del panel.

**Alegon no está conectado.** El importador está listo para cargas manuales. Para sincronizarlo se necesitarán su documentación, acceso y reglas sobre qué datos deben actualizarse. No se confundió ni reemplazó Alegon por otro sistema.

## Copias y comprobaciones

La versión local crea una copia de SQLite al iniciar cada día y conserva las últimas siete. Las fotos están en `.local-data/media/` y deben incluirse al respaldar esa carpeta. El ZIP no incluye datos privados de ejecución. La exportación JSON del panel es una exportación de registros; excluye tokens de seguimiento y no incluye los bytes de las fotos. No reemplaza la copia completa de la base y las imágenes.

Se probaron las reglas de importación, permisos, precios del servidor, pedidos duplicados, seguimiento, descuentos, estados, edición concurrente y persistencia. El lector del panel coincidió con los 80 códigos y precios del Excel recibido. Se verificó la generación de todas las secciones del panel con la API real en memoria. Estas pruebas no reemplazan pruebas de navegador.

La revisión visual en navegador y la activación en alojamiento siguen pendientes: el entorno no permitió conectar con el servidor local. No se afirma que la versión esté desplegada.

### Referencias técnicas

[D1: consultas preparadas y transacciones](https://developers.cloudflare.com/d1/worker-api/d1-database/), [R2: almacenamiento de imágenes](https://developers.cloudflare.com/r2/api/workers/workers-api-reference/), [ExcelJS](https://github.com/exceljs/exceljs).
