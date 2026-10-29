# Estado del proyecto — 29 de octubre de 2026

## Conservado en GitHub

- Contexto recuperado y arquitectura elegida por el propietario.
- App React/TypeScript estática: inicio, catálogo, reserva, citas e historial.
- Panel de personal: confirmación, finalización, cancelación, clientas y configuración.
- Configuración pública del proyecto Firebase `rositanails`.
- API Cloudflare: autenticación Firebase, permisos, transacciones de reservas y cambio único.
- Integración programada con Cloudinary para imágenes privadas, logo y catálogo público.
- Cola de notificaciones para Telegram y cron en el Worker.
- Reglas Firestore, configuración de Hosting, pruebas, lockfile e instrucciones de instalación.
- Control de publicación real y CORS para ambos dominios Firebase, incluido `rositanails.firebaseapp.com`.

## Comprobaciones locales

Las pruebas de reglas, formato Firestore, reintento de transacciones y límites de acceso pasan localmente. La app estática compila y Wrangler empaqueta el Worker en dry-run. Ver el resultado de GitHub Actions para el commit actual cuando esté disponible. No se ha hecho una prueba real con Firebase, Cloudinary ni Telegram.

No hay herramienta de navegador disponible en este entorno para comprobar visualmente la interfaz. El diseño se debe revisar en un navegador antes de publicar.

## Todavía no conectado ni publicado

- Firebase: el propietario confirmó que creó proyecto y base. Una captura del propietario muestra Google habilitado en Authentication. Falta verificar que la base sea Firestore `(default)`, publicar reglas/índices y conectar una cuenta de servicio con permisos mínimos al Worker.
- Cloudflare: el propietario confirmó que el Worker aún no existe. Se preparó un workflow de despliegue desde GitHub Actions. El Account ID ya está configurado a partir de la captura del propietario. La red del entorno devuelve 403 antes de autenticar contra la API de Cloudflare; el despliegue se hará mediante GitHub Actions. Falta guardar CLOUDFLARE_API_TOKEN como Repository secret, ejecutar el despliegue y configurar los secretos de ejecución. No se ha verificado el token ni un despliegue real.
- Cloudinary: el propietario creó la carpeta `ROSITA`. Las subidas se asignan a esa carpeta. El Cloud name `dvnhszmdt` ya está configurado en el código. Falta configurar API key y API secret directamente como secretos en Cloudflare y verificar una subida real.
- Telegram: falta configurar el bot y su chat en los secretos del Worker y probar entrega.
- Frontend: el propietario pidió publicación real, sin modo demo, en `rositanails.firebaseapp.com`. Están preparados el sitio y el workflow de Hosting con comprobación de API real. Falta autorizar Firebase, configurar la URL del Worker conectado y publicar Hosting. El estado de una posible publicación externa no se pudo verificar; no hay despliegue exitoso confirmado desde esta sesión.
- Negocio: faltan precios, servicios, horarios definitivos, contacto, imágenes y revisión de las reglas de cancelación.
- Respaldos: falta implementar y probar el procedimiento de respaldo/restauración de datos e imágenes por separado del código.

Las reservas de producción empiezan deshabilitadas y el catálogo real empieza vacío. Los ejemplos solo se activan mediante `VITE_DEMO_MODE=true`, con un aviso visible. No hay un enlace de producción verificado.

## Origen y decisiones

El código anterior se dio por perdido. Se reconstruyó desde el texto proporcionado por el propietario. Las 19 pruebas mencionadas en aquella conversación pertenecían a la versión perdida; no son resultados de este repositorio. El propietario pidió guardar todo el código en GitHub, usar Firebase para el backend, un Worker de Cloudflare para Telegram y Cloudinary para almacenamiento de fotos. La arquitectura actual evita Firebase Cloud Functions y Firebase Storage para mantener Spark.

## Protección de proyectos existentes

El propietario excluyó expresamente el Worker/proyecto de opticafel. No se ha creado ni modificado ningún Worker en Cloudflare desde esta sesión. El despliegue de Rosita solo creará el recurso nuevo `rosita-api`, con una comprobación que se detiene si ya existe un Worker con ese nombre. Se eliminó el código que administraba el subdominio de la cuenta. No se renombrarán ni se actualizarán otros Workers. El rate limiter usa un namespace propio de este repositorio para evitar compartir los contadores del valor de ejemplo `1001`.
