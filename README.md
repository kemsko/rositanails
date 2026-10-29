# Rosita Nails

Reconstrucción del proyecto de reservas y atención a clientas de Rosita.

## Estado real — 29 de octubre de 2026

Este repositorio conserva los requisitos recuperados de la conversación aportada por su propietario.
Todavía no contiene la aplicación reconstruida ni hay un despliegue verificado.
El código de la versión anterior no está disponible en esta sesión.
Las pruebas y exportaciones mencionadas en la conversación anterior no equivalen a pruebas de esta reconstrucción.

## Conservación del proyecto

- Guardar el código fuente, configuración reproducible, reglas de seguridad, pruebas y documentación en este repositorio desde las primeras etapas.
- Subir avances pequeños y comprobar el commit remoto después de cada etapa.
- Documentar decisiones, estado y pasos pendientes para retomar el trabajo desde otro entorno.
- No incluir credenciales privadas, tokens, cuentas de servicio ni datos personales de clientas.
- Respaldar los datos y fotografías por separado: GitHub conserva el código, no sustituye los respaldos del backend.

## Requisitos recuperados

- Sitio público para Rosita Nails, catálogo de trabajos y formulario de reserva.
- Diseño adaptable a celulares, con transparencias y animaciones.
- Cuatro horarios de citas al día; horarios exactos y días de atención pendientes de definir.
- Evitar reservas duplicadas, incluso cuando dos clientas soliciten el mismo horario a la vez.
- Confirmación manual de las reservas por el personal.
- Un solo cambio de cita permitido por clienta, con al menos 24 horas de anticipación. Se debe precisar si esa anticipación aplica también al nuevo horario.
- Inicio de sesión con Google.
- Permisos distintos para clientas y personal, comprobados por el backend.
- Panel del personal para gestionar citas e historial de clientas.
- Logo y plantillas editables; contenido y alcance de las plantillas pendientes de precisar.
- Fotografías de referencia y del trabajo terminado, con control de acceso según el uso de cada imagen.
- Notificaciones al personal por Telegram.
- Botones hacia WhatsApp; no se acordó mensajería automática mediante la API de WhatsApp.
- Objetivo anterior de comenzar sin costo mensual, sujeto a cuotas.

## Nueva propuesta: Firebase

El propietario pidió evaluar Firebase como backend en lugar de la arquitectura previa con Supabase.
No se ha activado facturación ni se ha creado o conectado un proyecto Firebase.

| Necesidad | Servicio propuesto |
| --- | --- |
| Acceso con Google | Firebase Authentication |
| Clientas, citas, historial y configuración | Cloud Firestore |
| Autorización y validación | Security Rules y, si se elige Blaze, Cloud Functions |
| Reservas simultáneas y cambio único | Transacciones y validaciones del backend |
| Fotografías | Cloud Storage for Firebase si se elige Blaze |
| Envío privado a Telegram | Cloud Functions si se elige Blaze |
| Publicación de la interfaz estática | Firebase Hosting |
| Código y documentación | Este repositorio de GitHub |

Firebase Spark permite comenzar con Authentication, Firestore y Hosting dentro de sus cuotas sin activar un medio de pago.
Cloud Functions en producción y Cloud Storage for Firebase requieren Blaze y una cuenta de facturación.
Blaze ofrece cuotas sin costo, pero el uso adicional y otros recursos pueden generar cargos.
No se garantiza costo cero. Las alertas de presupuesto no son un tope de gasto.

Para mantener Spark sin facturación, las fotografías y el envío privado a Telegram necesitarían servicios externos. Es una alternativa por evaluar, no una integración existente.

## Decisiones pendientes

1. Mantener la condición de no activar facturación, o permitir Firebase Blaze para integrar las funciones y las fotos.
2. Identificar o crear el proyecto Firebase del propietario y configurar los accesos necesarios.
3. Definir servicios, precios, duración, días de atención y los cuatro horarios.
4. Definir cancelaciones, reservas pendientes, cambios de citas y bloqueos del calendario.
5. Definir personal autorizado, contacto de WhatsApp y destino de Telegram.
6. Definir colores, logo, textos y fotografías disponibles.
7. Configurar respaldos de datos y fotografías aparte del código.

## Verificación prevista

- Impedir que dos reservas ocupen el mismo horario.
- Validar el cambio único y la frontera de 24 horas con hora del servidor.
- Impedir acceso a citas, historial y fotografías privadas de otras clientas.
- Impedir que una clienta se asigne permisos de personal.
- Verificar confirmación del personal, cancelaciones y disponibilidad.
- Probar la experiencia móvil y un flujo completo de reserva.
- Comprobar que ningún secreto se incluya en el navegador o en GitHub.

## Fuentes oficiales consultadas

- [Precios y planes de Firebase](https://firebase.google.com/pricing)
- [Requisitos de facturación de Cloud Storage](https://firebase.google.com/docs/storage/faqs-storage-changes-announced-sept-2024)
- [Despliegue de Cloud Functions y requisito Blaze](https://firebase.google.com/docs/functions/get-started)
- [Transacciones de Firestore](https://firebase.google.com/docs/firestore/manage-data/transactions)
- [Firebase Hosting](https://firebase.google.com/docs/hosting)
