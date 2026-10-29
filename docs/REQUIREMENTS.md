# Requisitos recuperados

Origen: el propietario adjuntó una conversación anterior después de informar que se perdió el código y el chat original. Se conserva aquí lo que esa conversación permitía saber, sin afirmar que el diseño original se haya recuperado.

## Confirmado en el contexto aportado

- Web de uñas Rosita con catálogo, reservas y panel del personal.
- Cuatro horarios diarios, sin reservas duplicadas ni cruces de horario.
- Confirmación manual de las citas por el personal.
- Un único cambio, con 24 horas de anticipación.
- Inicio de sesión con Google y permisos separados para clientas y personal.
- Historial de cada clienta; referencias y fotografías del trabajo terminado.
- Logo y plantillas editables.
- Notificaciones a Telegram y botones hacia WhatsApp.
- Diseño móvil con transparencias y animaciones.
- Intención de comenzar sin costo mensual, dentro de los límites gratuitos.

## Decisiones nuevas del propietario

- Subir todo el código a GitHub para conservarlo fuera del entorno de OpenAI.
- Usar Firebase para cuentas y datos.
- Usar un Worker de Cloudflare para Telegram y Cloudinary para imágenes.
- Guardar todas las imágenes del proyecto dentro de la carpeta `ROSITA` de Cloudinary, sin mezclarlas con otros proyectos.
- Proyecto Firebase `rositanails`; configuración pública proporcionada por el propietario.

## Supuestos de esta implementación, por revisar

- «Un cambio» se interpreta como un cambio por cita, no uno por cuenta para toda la vida.
- Se exige que tanto la cita original como la nueva estén a 24 horas o más de la hora actual.
- Hora del negocio: America/Guatemala, UTC−6. No hay implementación de cambios de zona horaria.
- Cancelaciones por el personal; las clientas se comunican mediante WhatsApp.
- Las citas nuevas y los cambios vuelven a requerir confirmación.
- Referencias y resultados son privados. Solo el logo y las fotos subidas expresamente para el catálogo son públicos.
- La plantilla editable corresponde al mensaje de confirmación para WhatsApp.
- Horarios iniciales propuestos: 09:00, 11:00, 14:00 y 16:00. La agenda de producción empieza deshabilitada.

## Faltante del negocio

Servicios, precios, duración, días y horarios definitivos; dirección, WhatsApp, personal autorizado, logo, imágenes, textos y política final de cancelación. El diseño exacto anterior no está disponible. Las ilustraciones y el estilo de esta versión son una nueva propuesta.
