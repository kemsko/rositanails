# Instalación y publicación

El proyecto Firebase del propietario es `rositanails`. La aplicación web registrada tiene el ID `1:566777557346:web:f7db37dc414ee036187c3b`. Su configuración pública está en `src/firebase-config.ts`.

No se requiere Supabase, Firebase Storage, Firebase Cloud Functions ni Firebase App Hosting. Mantener Firebase en Spark. Se usa Firebase Hosting clásico para la web estática.

## Datos para completar la conexión

El propietario ya proporcionó la configuración pública de Firebase y una captura que muestra Google habilitado en Authentication. No hay que solicitar de nuevo esa configuración. La carpeta de Cloudinary elegida es `ROSITA`.

El Cloud name **`dvnhszmdt`** ya está guardado en el código. La captura muestra la carpeta **`ROSITA`**, en mayúsculas; se usa ese nombre exacto. El Worker todavía no existe. Para permitir que el asistente lo cree sin pegar credenciales en el chat, seguir la sección de despliegue con GitHub Actions que aparece abajo.

Las credenciales se introducen directamente en Cloudflare, en **Workers & Pages → el Worker → Settings → Variables and Secrets → Add → Secret**:

| Nombre en el Worker     | Valor que se introduce directamente allí                                       |
| ----------------------- | ------------------------------------------------------------------------------ |
| `CLOUDINARY_API_KEY`    | API key del entorno de Cloudinary donde está la carpeta `ROSITA`               |
| `CLOUDINARY_API_SECRET` | API secret del mismo par de credenciales de Cloudinary                         |
| `FIREBASE_CLIENT_EMAIL` | Campo `client_email` de la cuenta de servicio dedicada a Rosita                |
| `FIREBASE_PRIVATE_KEY`  | Campo `private_key` de esa cuenta de servicio                                  |
| `STAFF_UIDS`            | UID de Firebase Authentication de cada persona autorizada, separados por comas |

El bloque `firebaseConfig` de la app web identifica el proyecto y permite iniciar sesión. No autoriza al Worker a leer o escribir citas: para eso se configura la cuenta de servicio con permisos mínimos descrita más abajo. No pegar API secrets, JSON de cuentas de servicio, claves privadas ni tokens en el chat o en GitHub.

La conexión oficial de Firebase para operar desde el asistente es independiente de las credenciales de ejecución del Worker. Su configuración pública por sí sola tampoco permite publicar reglas ni Hosting desde esta sesión.

Fuentes: [credenciales de Cloudinary](https://cloudinary.com/documentation/finding_your_credentials_tutorial), [secretos en Cloudflare](https://developers.cloudflare.com/workers/configuration/secrets/), [autorización del servidor en Firebase](https://firebase.google.com/docs/admin/setup#initialize_the_sdk_in_non-google_environments).

## 1. Recuperar el código y probar

Requisitos: Git y Node.js 24.

```sh
git clone https://github.com/kemsko/rositanails.git
cd rositanails
npm ci
npm test
npm run build
npm run worker:check
```

Para probar sin conectar las cuentas, crear `.env.local` con `VITE_DEMO_MODE=true` y ejecutar `npm run dev`. El aviso visible identifica la demostración. Los precios, servicios y horarios de ese modo son ficticios; sus citas quedan solo en el almacenamiento del navegador. Las fotografías y Telegram no se simulan como enviados.

Para salir de la demostración, quitar esa variable o usar `false` y volver a compilar. Nunca publicar la demostración como sistema real de reservas.

## 2. Firebase

En la consola del proyecto `rositanails`:

1. Habilitar **Authentication → Sign-in method → Google** y elegir un correo de soporte.
2. En Authentication, autorizar el dominio de Hosting y cualquier otro dominio real de la web. Para desarrollo, agregar `localhost` si corresponde.
3. Verificar que Cloud Firestore sea **Standard, Native mode**, con base `(default)`. El código no usa Realtime Database.
4. Las reglas del repositorio bloquean todo acceso directo desde el navegador. La API del Worker comprueba cada permiso y usa IAM para acceder a Firestore.
5. Crear una cuenta de servicio dedicada para el Worker, con acceso de lectura y escritura a Firestore (`roles/datastore.user`) únicamente en este proyecto. No otorgar Owner ni Editor.
6. Crear una clave de esa cuenta si la política de la organización lo permite. El correo y la clave privada se introducen directamente como secretos del Worker; no compartirlos por el chat ni subir el JSON a GitHub. Si la organización prohíbe claves, se necesita adaptar la integración a credenciales de corta duración antes del despliegue.

Para publicar reglas e índices desde una computadora autenticada con tu cuenta:

```sh
npx firebase-tools login
npx firebase-tools deploy --only firestore:rules,firestore:indexes --project rositanails
```

Revisar antes las reglas existentes: este archivo las reemplaza y está pensado para la base dedicada de Rosita.

## 3. Cloudinary

Usar el entorno de imágenes donde el propietario creó la carpeta `ROSITA`. En el Worker configurar:

- Variable `CLOUDINARY_CLOUD_NAME`.
- Secretos `CLOUDINARY_API_KEY` y `CLOUDINARY_API_SECRET`, del mismo par de credenciales.

Todas las subidas del proyecto se asignan a `ROSITA` en la biblioteca de medios. En modo de carpetas dinámicas se envía `asset_folder=ROSITA`; conservar un prefijo `ROSITA/` en el identificador no basta por sí solo para elegir esa carpeta visual. Para cuentas heredadas en modo fijo, configurar `CLOUDINARY_FOLDER_MODE=fixed`; el prefijo del identificador mantiene los archivos dentro de `ROSITA` y sus subcarpetas. El valor configurado en `worker/wrangler.jsonc` es `dynamic`. No hay que cambiar el modo de carpetas de la cuenta para conectar Rosita. [Referencia oficial de modos de carpetas](https://cloudinary.com/documentation/folder_modes#public_ids_with_slashes).

No se usa un preset de subida pública sin firma. Las imágenes pasan por el Worker, que verifica sesión, permisos, formato declarado y tamaño, y firma la petición a Cloudinary.

Las referencias y resultados se suben con tipo **authenticated**. Se consultan a través del Worker, después de comprobar el propietario o el rol del personal. El navegador recibe el archivo, sin una dirección pública permanente. Logo y fotos del catálogo son públicos y solo el personal puede subirlos. Hasta 5 MB por imagen; referencias y resultados admiten JPG, PNG y WebP.

## 4. Cloudflare Worker

### Dar acceso de despliegue mediante GitHub Actions

Esta vía permite que el asistente prepare y ejecute el despliegue desde el repositorio sin recibir el token por el chat.

1. En [Cloudflare → API Tokens](https://dash.cloudflare.com/profile/api-tokens), crear un token personalizado para la cuenta elegida con **Account → Workers Scripts → Edit**, limitado a **esa cuenta**. No usar Global API Key ni permisos sobre DNS o todas las cuentas. Elegir una caducidad adecuada al despliegue.
2. Copiar el **Account ID** de esa cuenta de Cloudflare. No es el nombre de usuario ni el Zone ID de un dominio.
3. Abrir [los secretos de Actions del repositorio](https://github.com/kemsko/rositanails/settings/secrets/actions) y agregar dos **Repository secrets**: `CLOUDFLARE_API_TOKEN` y `CLOUDFLARE_ACCOUNT_ID`.
4. Informar al asistente que ambos secretos ya están guardados. No enviar sus valores ni capturas que muestren el token.
5. El workflow `.github/workflows/deploy-worker.yml` se puede ejecutar manualmente desde Actions, o al crear/actualizar la rama `deploy-cloudflare`. El asistente puede publicar esa rama desde el código comprobado. Las subidas normales a `main` conservan el código sin activar este despliegue.

El workflow instala las dependencias, ejecuta las pruebas, compila y empaqueta antes de desplegar `rosita-api`. Si la cuenta todavía no tiene subdominio workers.dev, prepara `rosita-` seguido de ocho caracteres del Account ID. Si ya tiene uno, lo conserva. El script no cambia un subdominio existente.

Este acceso crea y publica el Worker. Los secretos de ejecución de Firebase, Cloudinary y Telegram se agregan por separado en Cloudflare, como indica la tabla anterior. Tener el Worker publicado por sí solo no significa que las reservas ya estén conectadas.

### Alternativa desde tu computadora

Desde tu computadora:

```sh
npx wrangler login
```

Editar `worker/wrangler.jsonc`:

- Mantener `FIREBASE_PROJECT_ID=rositanails`.
- Cambiar `ALLOWED_ORIGIN` al dominio exacto de la web, sin barra final. Para varios dominios autorizados, separarlos por comas. No usar `*`.
- Configurar el cloud name de Cloudinary como variable; la API key y el API secret se guardan como secretos.

Guardar los secretos con estos comandos. La CLI solicita cada valor de forma interactiva; no incluir valores en la línea de comandos ni en archivos del repositorio:

```sh
npx wrangler secret put FIREBASE_CLIENT_EMAIL --config worker/wrangler.jsonc
npx wrangler secret put FIREBASE_PRIVATE_KEY --config worker/wrangler.jsonc
npx wrangler secret put STAFF_UIDS --config worker/wrangler.jsonc
npx wrangler secret put CLOUDINARY_API_KEY --config worker/wrangler.jsonc
npx wrangler secret put CLOUDINARY_API_SECRET --config worker/wrangler.jsonc
npx wrangler secret put TELEGRAM_BOT_TOKEN --config worker/wrangler.jsonc
npx wrangler secret put TELEGRAM_CHAT_ID --config worker/wrangler.jsonc
npm run worker:deploy
```

`FIREBASE_PRIVATE_KEY` acepta saltos de línea reales o la secuencia literal `\n`. `STAFF_UIDS` es una lista de UID de Firebase Authentication separada por comas; no son correos electrónicos. Podés obtener el UID del personal desde Authentication después de que ingrese por primera vez. Solo los UID de esta lista administran citas, imágenes públicas y configuración.

Telegram usa tu bot y el chat autorizado del personal. Agregar el bot al chat y darle permiso de envío. No se llama a Telegram desde la página. El Worker guarda una notificación junto con cada operación en una transacción y un cron intenta enviarlas cada diez minutos. No son avisos instantáneos. Las solicitudes fallidas se reintentan hasta cinco veces; ver `docs/OPERATIONS.md`.

El Worker obtiene credenciales de Google de corta duración a partir de la cuenta de servicio guardada como secreto. No necesita activar Cloud Functions ni Firebase Storage.

## 5. Conectar la web y publicarla

Crear `.env.local` (ignorado por Git):

```dotenv
VITE_API_URL=https://rosita-api.TU-SUBDOMINIO.workers.dev
VITE_DEMO_MODE=false
```

La configuración pública de Firebase ya está incluida. Las variables de `.env.example` permiten reemplazarla sin editar componentes. No existe ningún lugar para claves privadas en variables `VITE_`: se incorporan al navegador.

```sh
npm run build
npx firebase-tools deploy --only hosting --project rositanails
```

Firebase mostrará la dirección real al completar el despliegue. El proyecto está configurado para `https://rositanails.web.app`, pero no se debe anunciar como publicado hasta comprobar el despliegue.

## 6. Configurar Rosita y habilitar reservas

1. Ingresar con la cuenta del personal y confirmar que su UID esté en `STAFF_UIDS`.
2. En **Mi negocio**, cargar servicios, precios, duración, días de atención, cuatro horarios, fechas cerradas, WhatsApp, dirección, logo y fotos públicas.
3. Los horarios iniciales 09:00, 11:00, 14:00 y 16:00 son una propuesta de configuración. No fueron confirmados por el propietario. Se usa hora de Guatemala (UTC−6).
4. Definir el mensaje editable de WhatsApp. Los enlaces abren WhatsApp; el envío lo hace la persona.
5. Habilitar las solicitudes de reserva solo después de revisar los datos.
6. Probar dos solicitudes simultáneas al mismo horario, confirmación, cambio único, acceso de otra clienta, fotos privadas y Telegram antes de recibir clientas reales.

## Costos y propiedad

Cada cuenta debe pertenecer al propietario. Se apunta a planes gratuitos, dentro de los límites vigentes de Firebase, Cloudflare y Cloudinary. No se promete servicio ilimitado o costo cero permanente. No se activa facturación automáticamente con estos archivos.

GitHub conserva el código y su historial. Respaldar los datos y las imágenes por separado según `docs/OPERATIONS.md`.
