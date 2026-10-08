# Ferretería ESQUIÚ — tienda y administración



Este repositorio contiene la tienda y el backend de ferretería. El proyecto `gonzitassi/lubricentroesquiu` se mantiene separado.



## Iniciar localmente



Requiere Node.js 24.4 o posterior y pnpm 11.25.



```sh

pnpm install

pnpm build

pnpm dev

```



Tienda: http://127.0.0.1:4190/ · Administración: http://127.0.0.1:4190/admin/



La clave local se genera en `.local-data/local-admin-key.txt`. Mantener privada y respaldar toda la carpeta `.local-data/`, incluyendo base de datos e imágenes. No se sube a GitHub.



## Incluido



- Productos, precios, fotos, ofertas, banners y rubros editables.

- Importación privada de productos desde Excel o CSV; los nuevos quedan en borrador.

- Pedidos sin control de stock: confirmar disponibilidad y total antes de cobrar.

- Seguimiento privado, registro manual de pagos y entregas.

- Usuarios con permisos, importación Excel/CSV, cupones y auditoría.



## Estado del alojamiento



Subir este código a GitHub no activa el backend. GitHub Pages solo sirve archivos estáticos y no ejecuta la API ni la base de datos. La versión Worker/D1/R2 de Sites está preparada; falta desplegar y verificar el alojamiento. Alegon y los cobros automáticos no están conectados. No se cargan claves ni datos de clientes al repositorio.



Ver [documentación del backend](Backend-ESQUIU.md).



## Código



- `web/`: tienda y panel.

- `server/`: API, Worker y servidor local.

- `db/` y `drizzle/`: esquema y migraciones.

- Catalogo comercial excluido de GitHub. Los productos se cargan privadamente desde el panel.

- `scripts/build.mjs`: genera `dist/client` y `dist/server`.



17 pruebas automatizadas pasaron durante el desarrollo; revisión visual de navegador y despliegue pendientes. La prueba de importación del archivo original requiere el Excel original y se omite si no se indica su ruta.



```sh

pnpm test

```



El ZIP local privado conserva el catálogo original. Esta versión pública inicia sin productos y no incluye el Excel, precios comerciales ni registros de ejecución. Las pruebas del backend usan datos sintéticos.

