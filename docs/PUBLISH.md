# Publicación real en Firebase Hosting

El propietario pidió publicar y probar en modo real, sin demostración, usando **https://rositanails.firebaseapp.com**. La publicación requiere autorización sobre el proyecto `rositanails`; el bloque público `firebaseConfig` no concede permisos de despliegue.

## Estado y orden

1. Autorizar el acceso a Firebase para publicar Hosting y verificar reglas/índices.
2. Crear y conectar el Worker real a Firestore. Las reservas y la verificación del rol del personal dependen de esta API; publicar solo los archivos estáticos no conecta esos flujos.
3. Publicar la web con la URL de la API y `VITE_DEMO_MODE=false`.
4. Configurar el negocio desde la cuenta del personal: servicios, precios, días y horarios reales. Habilitar reservas después de revisar esos datos.
5. Conectar Cloudinary y Telegram. Estas integraciones pueden agregarse después de verificar el inicio de sesión y las reservas reales.

No se ha configurado una autorización de publicación de Firebase ni se ha confirmado un despliegue de Hosting. No presentar el enlace de destino como una versión publicada hasta obtener un resultado exitoso del proveedor y comprobar el sitio.

## Acceso mediante la integración oficial

Agregar la integración oficial Firebase al chat y, si solicita una cuenta de Google, usar la que administra `rositanails`. La instalación no equivale por sí sola a autorización del proyecto: comprobar las herramientas y el acceso real antes de desplegar. No solicitar contraseñas o claves privadas por el chat.

## Alternativa con GitHub Actions

El repositorio incluye `.github/workflows/deploy-firebase.yml`. Se activa manualmente o al crear/actualizar la rama `deploy-firebase`; las subidas normales a `main` guardan código sin publicar Hosting.

En una cuenta de servicio dedicada al despliegue, otorgar en el proyecto `rositanails`:

- Firebase Hosting Admin: `roles/firebasehosting.admin`.
- API Keys Viewer: `roles/serviceusage.apiKeysViewer`, requerido actualmente por el despliegue mediante Firebase CLI.

El propietario guarda su JSON directamente en los [Repository secrets de Actions](https://github.com/kemsko/rositanails/settings/secrets/actions), con nombre **FIREBASE_SERVICE_ACCOUNT_ROSITANAILS**. No se sube al código ni al chat. Esta cuenta es distinta de la cuenta de ejecución del Worker, que solo necesita los permisos de Firestore descritos en `INSTALL.md`.

Crear la variable de Actions **ROSITA_API_URL** con el origen HTTPS del Worker real, sin rutas. Por ejemplo, la dirección devuelta por Cloudflare al desplegar `rosita-api`. No inventar esa dirección ni usar un valor de ejemplo como configuración real.

El workflow:

1. Comprueba que la credencial exista y pertenezca a `rositanails`, sin imprimirla.
2. Instala dependencias y ejecuta las pruebas.
3. Ejecuta `npm run build:production`: rechaza el modo demo y una URL de API ausente, local o de ejemplo.
4. Consulta `/settings` desde el origen `https://rositanails.firebaseapp.com` para verificar respuesta real y CORS. `/health` por sí solo no comprueba la conexión a Firestore.
5. Publica el canal **live** del sitio **rositanails** mediante la acción oficial de Firebase.

La publicación técnica puede completarse aunque el negocio aún tenga las reservas deshabilitadas para configurarlo desde el panel. Eso no equivale a una comprobación de reservas operativas: antes de afirmarlo, verificar que haya servicios activos, horarios definitivos y `bookingEnabled=true`, y hacer una prueba autorizada desde el navegador.

## Desde una computadora autenticada

```sh
npm ci
npm test
# Configurar VITE_API_URL con la dirección real; mantener VITE_DEMO_MODE=false.
npm run build:production
node scripts/verify-production-api.mjs
npx firebase-tools login
npx firebase-tools deploy --only hosting --project rositanails
```

Esto publica Hosting. Las reglas/índices de Firestore y el Worker se configuran por separado según `INSTALL.md`.

## Referencias oficiales

- [Firebase Hosting con GitHub](https://firebase.google.com/docs/hosting/github-integration)
- [Roles de Hosting y requisito API Keys Viewer](https://firebase.google.com/docs/projects/iam/roles-predefined-product#firebase_hosting_roles)
- [Acción oficial de publicación](https://github.com/FirebaseExtended/action-hosting-deploy)
