# Instalación y publicación

El proyecto Firebase del propietario es `rositanails`. La aplicación web registrada tiene el ID `1:566777557346:web:f7db37dc414ee036187c3b`. Su configuración pública está en `src/firebase-config.ts`.

No se requiere Supabase, Firebase Storage, Firebase Cloud Functions ni Firebase App Hosting. Mantener Firebase en Spark. Se usa Firebase Hosting clásico para la web estática.

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

Crear o usar el entorno de imágenes de tu cuenta. En el Worker configurar:

- Variables públicas `CLOUDINARY_CLOUD_NAME` y `CLOUDINARY_API_KEY`.
- Secreto `CLOUDINARY_API_SECRET`.

No se usa un preset de subida pública sin firma. Las imágenes pasan por el Worker, que verifica sesión, permisos, formato declarado y tamaño, y firma la petición a Cloudinary.

Las referencias y resultados se suben con tipo **authenticated**. Se consultan a través del Worker, después de comprobar el propietario o el rol del personal. El navegador recibe el archivo, sin una dirección pública permanente. Logo y fotos del catálogo son públicos y solo el personal puede subirlos. Hasta 5 MB por imagen; referencias y resultados admiten JPG, PNG y WebP.

## 4. Cloudflare Worker

Desde tu computadora:

```sh
npx wrangler login
```

Editar `worker/wrangler.jsonc`:

- Mantener `FIREBASE_PROJECT_ID=rositanails`.
- Cambiar `ALLOWED_ORIGIN` al dominio exacto de la web, sin barra final. Para varios dominios autorizados, separarlos por comas. No usar `*`.
- Configurar el cloud name y API key de Cloudinary.

Guardar los secretos con estos comandos. La CLI solicita cada valor de forma interactiva; no incluir valores en la línea de comandos ni en archivos del repositorio:

```sh
npx wrangler secret put FIREBASE_CLIENT_EMAIL --config worker/wrangler.jsonc
npx wrangler secret put FIREBASE_PRIVATE_KEY --config worker/wrangler.jsonc
npx wrangler secret put STAFF_UIDS --config worker/wrangler.jsonc
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
