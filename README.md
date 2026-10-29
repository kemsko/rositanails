# Rosita Nails

Web de reservas de Rosita, reconstruida y conservada en GitHub. La configuración pública corresponde al proyecto Firebase **rositanails** del propietario.

**Estado:** código reconstruido y comprobado localmente; los servicios reales todavía no están conectados ni hay un despliegue verificado en Firebase Hosting. No anunciar la aplicación como lista para recibir clientas hasta completar la instalación y las pruebas de los servicios.

Para revisar el diseño ahora: [abrir la vista privada publicada de Rosita](https://rosita-nails-vista-previa-e83c1c4.choiceriver17.chatgpt.site). Esta vista temporal permite ver el frontend; Firebase Hosting sigue pendiente de autorización y las reservas todavía están deshabilitadas.

## Arquitectura elegida

| Necesidad                                          | Servicio                 |
| -------------------------------------------------- | ------------------------ |
| Código, historial y documentación                  | GitHub: este repositorio |
| Acceso con Google                                  | Firebase Authentication  |
| Citas, clientas, horarios y configuración          | Cloud Firestore          |
| Web estática                                       | Firebase Hosting clásico |
| API, comprobación de permisos y avisos de Telegram | Cloudflare Worker        |
| Fotografías privadas, logo y catálogo              | Cloudinary               |

Se evita Firebase Cloud Functions y Firebase Storage para mantener Firebase en Spark. Cada servicio está sujeto a sus cuotas vigentes. No se garantiza alojamiento gratuito ilimitado.

## Funciones implementadas

- Inicio, catálogo editable, diseño adaptable a móviles e ilustraciones de muestra.
- Reservas en cuatro horarios configurables por día, con validación de duración y ocupación en transacciones de Firestore.
- Confirmación manual, finalización y cancelación por el personal.
- Un cambio por cita con al menos 24 horas de anticipación, tanto respecto del horario original como del nuevo. Un cambio requiere una nueva confirmación.
- Cuenta de clienta, consulta de citas y panel del personal con agenda e historial paginado.
- Configuración de servicios, precios, días, horarios, fechas cerradas, logo, imágenes públicas, contacto y plantilla de WhatsApp.
- Referencias y resultados privados en Cloudinary, con permisos comprobados por la API.
- Cola de notificaciones al personal por Telegram. El cron procesa avisos cada diez minutos con reintentos.
- Modo de demostración explícito; sus citas no se envían al negocio.
- Pruebas de reglas, permisos, transacciones y solicitudes concurrentes con almacenamiento simulado; compilación de web y empaquetado del Worker.

**Las integraciones están programadas, pero todavía requieren configurar las cuentas y probarse con los servicios reales.** Los horarios por defecto no fueron confirmados por el propietario; en modo real las reservas están deshabilitadas hasta que el personal configure el negocio. Los precios de demostración no son precios de Rosita.

## Ejecutar y verificar

Usar Node.js 24.

```sh
npm ci
npm test
npm run build
npm run worker:check
```

Para una demostración local, crear `.env.local` con `VITE_DEMO_MODE=true` y ejecutar `npm run dev`.

Para publicar primero la web sin esperar al Worker, seguir **[la guía de publicación](docs/PUBLISH.md)**. Para conectar las cuentas después, seguir **[la guía de instalación](docs/INSTALL.md)**. Nunca introducir claves privadas en variables `VITE_` o en GitHub.

## Documentación para retomar el trabajo

- [Estado real y pendientes](docs/STATUS.md)
- [Publicación real en rositanails.firebaseapp.com](docs/PUBLISH.md)
- [Instalación de Firebase, Cloudflare y Cloudinary](docs/INSTALL.md)
- [Requisitos recuperados y decisiones pendientes](docs/REQUIREMENTS.md)
- [Operación, respaldos y límites conocidos](docs/OPERATIONS.md)

## Conservación y recuperación

Subir cada etapa a GitHub y verificar el commit remoto. No depender del historial del chat ni del disco del entorno de desarrollo. Este repositorio incluye código, reglas, configuración reproducible, dependencias fijadas y documentación.

**GitHub no respalda automáticamente las citas ni las fotografías.** Los datos de Firebase y Cloudinary necesitan su propio procedimiento de respaldo y recuperación. Las credenciales privadas deben permanecer bajo control del propietario, fuera de este repositorio.

## Referencias oficiales

- [Planes de Firebase](https://firebase.google.com/pricing)
- [Firebase Hosting](https://firebase.google.com/docs/hosting)
- [Transacciones de Firestore](https://firebase.google.com/docs/firestore/manage-data/transactions)
- [Verificación de sesiones de Firebase](https://firebase.google.com/docs/auth/admin/verify-id-tokens)
- [Cloudflare Workers](https://developers.cloudflare.com/workers/)
- [Subidas autenticadas de Cloudinary](https://cloudinary.com/documentation/upload_images)
