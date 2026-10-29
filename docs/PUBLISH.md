# Publicación de la web en Firebase Hosting

El propietario pidió publicar primero la web en **https://rositanails.firebaseapp.com** y conectar el Worker después. Se mantiene el modo real, sin demostración ni citas simuladas.

## Publicar ahora, sin Worker

El workflow `.github/workflows/deploy-firebase.yml` configura:

- `VITE_DEMO_MODE=false`.
- `VITE_FRONTEND_ONLY=true`.
- `VITE_API_URL` vacío.

Esta variante muestra la web pública y mantiene las reservas y las acciones que dependen del backend deshabilitadas, con un aviso visible. No consulta ningún Worker, no guarda citas locales y no usa los precios ni los datos de la demostración. El catálogo real sigue pendiente de que el negocio proporcione y configure sus servicios.

El modo frontend-only es explícito: una API ausente no convierte automáticamente la aplicación en demostración. Cuando se conecte el backend, se publicará una nueva versión con `VITE_FRONTEND_ONLY=false` y la URL real de la API.

## Autorizar Firebase Hosting

La configuración pública `firebaseConfig` identifica el proyecto, pero no autoriza la publicación. Hace falta una conexión Firebase autenticada con permisos de Hosting, o una cuenta de servicio de despliegue en GitHub Actions.

### Integración oficial

Agregar la integración oficial Firebase al chat y, si solicita una cuenta de Google, usar la que administra `rositanails`. La instalación no equivale por sí sola a autorización del proyecto: comprobar las herramientas y el acceso real antes de desplegar. No solicitar contraseñas o claves privadas por el chat.

### GitHub Actions

El workflow se activa manualmente o al crear/actualizar la rama `deploy-firebase`; las subidas normales a `main` guardan código sin publicar Hosting.

La cuenta dedicada al despliegue necesita en el proyecto `rositanails`:

- Firebase Hosting Admin: `roles/firebasehosting.admin`.
- API Keys Viewer: `roles/serviceusage.apiKeysViewer`, requerido actualmente por el despliegue mediante Firebase CLI.

Para preparar esa cuenta sin dar acceso de administrador a todo el proyecto:

1. Abrir [Cuentas de servicio de Google Cloud, proyecto rositanails](https://console.cloud.google.com/iam-admin/serviceaccounts?project=rositanails) con la cuenta propietaria.
2. Crear una cuenta llamada `rosita-hosting` y asignarle los dos roles indicados arriba, únicamente en el proyecto `rositanails`.
3. Dentro de esa cuenta, ir a **Keys / Claves → Add key / Agregar clave → Create new key / Crear clave nueva → JSON**. Guardar el archivo descargado de forma privada.
4. En GitHub, abrir **New repository secret**, poner el nombre `FIREBASE_SERVICE_ACCOUNT_ROSITANAILS` y pegar el contenido completo del JSON en el campo **Secret**. No adjuntar ese JSON al chat ni añadirlo al código.

El propietario guarda su JSON directamente en los [Repository secrets de Actions](https://github.com/kemsko/rositanails/settings/secrets/actions), con nombre **FIREBASE_SERVICE_ACCOUNT_ROSITANAILS**. No se sube al código ni al chat. Esta cuenta es distinta de la cuenta de ejecución del Worker, que se configurará después.

El workflow comprueba que la credencial exista y pertenezca a `rositanails`, instala las dependencias, ejecuta las pruebas, compila la web y publica el canal **live** del sitio **rositanails** mediante la acción oficial de Firebase. La variante frontend-only no necesita URL de API ni hace solicitudes a Cloudflare.

No anunciar la web como publicada hasta que el despliegue termine correctamente. Un secreto ausente detiene el workflow antes de llamar a Firebase. Ese estado no equivale a una publicación exitosa.

## Desde una computadora autenticada

```sh
npm ci
npm test
# Crear .env.local con VITE_DEMO_MODE=false y VITE_FRONTEND_ONLY=true.
npm run build:production
npx firebase-tools login
npx firebase-tools deploy --only hosting --project rositanails
```

Esto publica únicamente Hosting. El Worker, las reglas/índices de Firestore y las credenciales privadas de Cloudinary y Telegram se configuran después.

## Conectar las reservas después

1. Crear el Worker independiente de Rosita y conectarlo a Firestore según `INSTALL.md`, respetando la exclusión del proyecto de opticafel.
2. Configurar la URL real de la API y cambiar `VITE_FRONTEND_ONLY=false` en el build de publicación.
3. `npm run build:production` vuelve a exigir una URL HTTPS real. `scripts/verify-production-api.mjs` comprueba `/settings` y CORS desde `https://rositanails.firebaseapp.com`.
4. Configurar personal autorizado, servicios, precios y horarios desde el panel. Habilitar las reservas y comprobar un flujo real antes de anunciar que están operativas.
5. Conectar Cloudinary y Telegram.

## Referencias oficiales

- [Firebase Hosting con GitHub](https://firebase.google.com/docs/hosting/github-integration)
- [Roles de Hosting y requisito API Keys Viewer](https://firebase.google.com/docs/projects/iam/roles-predefined-product#firebase_hosting_roles)
- [Acción oficial de publicación](https://github.com/FirebaseExtended/action-hosting-deploy)

## Último resultado comprobado

El [primer intento de publicación sin Worker](https://github.com/kemsko/rositanails/actions/runs/40939137970) se detuvo porque falta `FIREBASE_SERVICE_ACCOUNT_ROSITANAILS`. La publicación a Firebase no llegó a ejecutarse. Una vez que el propietario guarde ese secreto, se puede reintentar el job fallido; no es necesario crear un Worker para esta publicación.
