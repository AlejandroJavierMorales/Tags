# Tags Google Maps Profile

## Arquitectura implementada

El addon usa `tags_businesses` y `tags_business_places` como fuente única para nombre, descripción, contacto, redes, dirección y coordenadas. No crea una ficha paralela del cliente.

Las tablas `tags_google_*` guardan únicamente:

- tipo de negocio, categoría oficial, horarios, servicios y respuestas específicas;
- conexión OAuth y referencias de Google;
- estado de propiedad y verificación;
- historial de sincronizaciones y errores controlados.

La migración es:

`database/migrations/2026-08-30-tags-google-business-profile.sql`

## Variables de entorno

```env
GOOGLE_BUSINESS_CLIENT_ID=""
GOOGLE_BUSINESS_CLIENT_SECRET=""
GOOGLE_BUSINESS_REDIRECT_URI="https://tags.com.ar/api/google-business-profile/oauth/callback"
GOOGLE_BUSINESS_TOKEN_ENCRYPTION_KEY="una-clave-privada-larga-y-aleatoria"
GOOGLE_BUSINESS_OAUTH_STATE_SECRET="otra-clave-privada-larga-y-aleatoria"
```

Las dos claves privadas deben ser diferentes, largas y aleatorias. No se exponen al frontend.

## Configuración en Google Cloud

1. Crear o elegir el proyecto de Google Cloud de Tags.
2. Solicitar y obtener acceso a Google Business Profile APIs.
3. Configurar la pantalla de consentimiento OAuth con el nombre y dominio de Tags.
4. Crear un cliente OAuth de tipo aplicación web.
5. Agregar exactamente esta URI autorizada:

   `https://tags.com.ar/api/google-business-profile/oauth/callback`

6. Habilitar las APIs aprobadas por Google:
   - Google My Business API;
   - My Business Account Management API;
   - My Business Business Information API;
   - My Business Verifications API;
   - y las restantes APIs de Business Profile que Google habilite para el proyecto.

Google exige aprobación del proyecto y no ofrece un sandbox para crear negocios ficticios. La cuota en cero indica que el proyecto todavía no fue aprobado.

## Flujo disponible

1. Asignar el addon `google_business_profile` al negocio mediante una suscripción o desde la administración existente de addons.
2. Abrir el Panel del negocio y entrar a `Tags Google Maps Profile`.
3. Completar el perfil guiado y el puntaje de presencia digital.
4. Conectar la cuenta Google del propietario mediante OAuth.
5. Seleccionar la cuenta empresarial y un perfil ya administrado.
6. Si no aparece, buscar coincidencias antes de crear:
   - perfil reclamado: abrir la solicitud oficial de acceso;
   - perfil no reclamado: validar y crear bajo la cuenta elegida;
   - sin coincidencias: validar y crear un perfil nuevo.
7. Consultar los métodos de verificación ofrecidos por Google.
8. Iniciar un método disponible y completar el PIN cuando corresponda.
9. Revisar el resumen y sincronizar manualmente Tags hacia Google.
10. Consultar el historial técnico y funcional del negocio.

## Reglas de seguridad

- Los tokens OAuth se cifran con AES-256-GCM antes de guardarse.
- Los tokens nunca se devuelven al frontend ni se escriben en logs.
- Cada endpoint valida la sesión y el `business_id`.
- Un cliente requiere el addon activo; el administrador de Tags puede ingresar para soporte.
- Crear y sincronizar exige confirmación explícita.
- Primero se usa `validateOnly`; luego se ejecuta la operación real.
- El PIN de verificación nunca se guarda.

## Prueba recomendada

1. Ejecutar la migración solamente en desarrollo.
2. Asignar `google_business_profile` a un negocio de prueba real que administre la cuenta Google usada.
3. Verificar que el addon aparezca en el Panel y en la barra de herramientas.
4. Completar datos y confirmar que nombre, contacto y ubicación se reflejen en la edición central del cliente.
5. Conectar Google y revisar cuentas/perfiles sin sincronizar.
6. Probar sincronización primero sobre un perfil real controlado por Tags y revisar el resumen antes de confirmar.
7. Revisar `tags_google_business_sync_logs` después de cada operación.

No usar perfiles ficticios: Google no los permite para pruebas de producción.
