# Operación y continuidad

## Qué se guarda y dónde

| Recurso                                                       | Ubicación               |
| ------------------------------------------------------------- | ----------------------- |
| Código, reglas, dependencias exactas, documentación y pruebas | GitHub                  |
| Cuentas y acceso con Google                                   | Firebase Authentication |
| Configuración, citas, ocupación y cola de avisos              | Firestore               |
| Fotografías privadas y material público del negocio           | Cloudinary              |
| API, cron y secretos                                          | Cloudflare Workers      |

## Retomar en otra sesión

Clonar el repositorio y leer `README.md`, `docs/STATUS.md` y `docs/INSTALL.md`. Instalar con `npm ci`. La prueba de que un avance quedó guardado es que `git rev-parse HEAD` coincida con `git ls-remote origin refs/heads/main` después de subirlo. Un archivo que solo existe en el entorno de trabajo no es un respaldo.

Subir cada etapa con un commit y un push; no esperar al final del proyecto. No usar GitHub como almacén de contraseñas, datos de clientas o imágenes privadas.

## Reservas y permisos

Las citas nuevas quedan pendientes. Un cambio vuelve a dejarlas pendientes. Hay un solo cambio por cita; tanto el horario original como el nuevo deben estar a 24 horas o más de la hora del servidor. Los cambios y las reservas comprueban ocupación y duración de manera transaccional en Firestore. Los cuatro horarios están configurados por el negocio. Las citas finalizadas siguen ocupando su espacio histórico; las canceladas lo liberan.

La clienta no cancela desde la web: contacta al personal. Solo el personal confirma, cancela y finaliza. Cambiar los días o servicios disponibles no elimina ni reprograma citas existentes.

Las reglas de Firestore deniegan el acceso directo. Los permisos reales están en el Worker y en IAM. Nunca convertir las reglas en `allow read, write: if true` para solucionar una conexión.

## Avisos de Telegram

La colección `events` es una cola, no una página pública. Cada evento tiene estado, intentos y una concesión temporal para impedir dos envíos concurrentes. Una reserva válida no se pierde si Telegram está caído. El cron intenta diez avisos por ejecución cada diez minutos.

Después de cinco intentos, revisar la configuración y el estado de Telegram. Un administrador puede restablecer `attempts` a 0 y `leaseUntil` a 0 manteniendo `status=pending`, desde la consola de Firestore, para reintentar. La semántica es de entrega al menos una vez: una interrupción entre el envío y la confirmación puede repetir un aviso. No se garantiza entrega instantánea ni exactamente una vez.

El destino de Telegram se fija en los secretos del Worker. La clienta no puede elegir el destino ni mandar un texto arbitrario al bot mediante la API.

## Respaldos de datos

El repositorio no respalda automáticamente Firestore, Authentication ni Cloudinary. Antes de operar con clientas, acordar una frecuencia de respaldo, conservación y recuperación de estos datos. Las exportaciones administradas de Google pueden exigir facturación; no activarlas sin revisar los requisitos. La infraestructura de respaldos automáticos todavía no está implementada.

Conservar los secretos en un gestor de contraseñas bajo control del propietario y configurar recuperación de acceso y segundo factor en las cuentas. Si una credencial se expone, rotarla en su proveedor y actualizar el Worker.

## Límites de esta primera versión

- La agenda y el historial se cargan por páginas de 50 citas mediante «Ver más». El historial completo de cada clienta puede requerir cargar páginas adicionales. La vista no es una exportación de respaldo.
- El límite de ocho fotos por cita es una comprobación previa; subidas simultáneas pueden superar ese límite. Es un límite de interfaz y uso, no una cuota de facturación garantizada.
- Quitar una imagen del catálogo o del logo no borra el archivo de Cloudinary. Revisar imágenes sin uso para controlar el almacenamiento.
- No hay todavía exportación/restauración automática de datos, lista de espera ni avisos automáticos a clientas.
- Las validaciones locales y el empaquetado no sustituyen las pruebas de los servicios conectados antes de publicar.
