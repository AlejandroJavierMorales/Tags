# TAX — Google Business Profile 360

## Especificación técnica y funcional completa

---

# 1. VISIÓN GENERAL DEL MÓDULO

Desarrollar dentro de la plataforma **TAX** un módulo completo denominado provisionalmente:

# Google Business Profile 360

El objetivo del módulo es permitir que cualquier cliente de TAX pueda:

1. Construir una ficha empresarial completa y estructurada dentro de TAX.
2. Completar un proceso guiado e inteligente según su tipo de negocio.
3. Detectar automáticamente si su negocio ya existe en Google Maps.
4. Conectar un Perfil de Negocio de Google existente.
5. Solicitar o gestionar derechos sobre un perfil existente cuando corresponda.
6. Crear una nueva ubicación/perfil de negocio cuando no exista.
7. Ejecutar el proceso de verificación utilizando las APIs oficiales de Google cuando el método lo permita.
8. Guiar al usuario en cualquier paso de verificación que Google requiera fuera de la plataforma.
9. Publicar y sincronizar información empresarial con Google.
10. Optimizar la información disponible para mejorar la calidad y completitud del perfil.
11. Mantener TAX como la fuente central de información del negocio.
12. Reutilizar esa información automáticamente en otros módulos de TAX.

La filosofía principal del sistema será:

> **Cargar una vez la información del negocio y reutilizarla en todos los canales digitales.**

---

# 2. CONCEPTO: BUSINESS DATA ENGINE

Antes de pensar únicamente en Google Maps, se debe crear dentro de TAX un sistema centralizado de información empresarial.

Este sistema será el núcleo de datos del negocio.

Nombre interno sugerido:

```text
Business Data Engine
```

Cada negocio tendrá un perfil empresarial central.

Ejemplo:

```text
TAX BUSINESS
│
├── Información básica
├── Identidad comercial
├── Ubicación
├── Contacto
├── Horarios
├── Categorías
├── Servicios
├── Productos
├── Atributos
├── Redes sociales
├── Sitio web
├── Fotos
├── Videos
├── Descripción
├── Preguntas frecuentes
└── Datos específicos por industria
```

Esta información deberá poder alimentar:

```text
Google Business Profile
        │
        ├── Google Maps
        ├── Google Search
        │
TAX Directory
        │
Página Web
        │
QR Page
        │
Tags ID
        │
eCommerce
        │
Booking
        │
Menú Digital
        │
Chatbot
        │
Redes Sociales
```

---

# 3. OBJETIVO PRINCIPAL DEL WIZARD

El cliente no debe enfrentarse a un formulario gigante.

El sistema debe funcionar como un proceso guiado.

Ejemplo:

```text
PASO 1
¿Qué tipo de negocio tenés?

        ↓

PASO 2
Preguntas específicas según el negocio

        ↓

PASO 3
Información general

        ↓

PASO 4
Ubicación

        ↓

PASO 5
Servicios y atributos

        ↓

PASO 6
Presencia digital

        ↓

PASO 7
Optimización

        ↓

PASO 8
Google Business Profile
```

El sistema debe realizar preguntas dinámicas.

Las preguntas deben cambiar según:

- categoría del negocio;
- tipo de negocio;
- industria;
- país;
- existencia de local físico;
- área de servicio;
- módulos activos dentro de TAX.

---

# 4. ARQUITECTURA DE TIPOS DE NEGOCIO

Crear una estructura jerárquica:

```text
business_type
    │
    ├── accommodation
    ├── restaurant
    ├── tourism
    ├── retail
    ├── professional_service
    ├── beauty
    ├── health
    ├── automotive
    ├── home_services
    ├── sports
    ├── education
    ├── events
    └── other
```

Cada tipo tendrá:

```javascript
{
    id,
    name,
    description,
    icon,
    question_flow,
    recommended_google_categories,
    required_fields,
    optional_fields,
    seo_fields,
    attributes
}
```

---

# 5. FLUJO INICIAL DEL CLIENTE

## Pantalla 1 — Bienvenida

```text
Optimicemos tu presencia en Google y en internet
```

Explicar brevemente:

- TAX organizará la información del negocio.
- Se detectará si ya existe un perfil en Google.
- Se podrá conectar o crear un perfil.
- Google determinará los requisitos de verificación.
- TAX acompañará al usuario durante todo el proceso.

Botón:

```text
COMENZAR
```

---

# 6. PASO: IDENTIFICACIÓN DEL NEGOCIO

Preguntar:

### ¿Cuál describe mejor tu negocio?

Mostrar categorías visuales.

Ejemplo:

```text
🏨 Alojamiento

🍽️ Restaurante / Gastronomía

🛍️ Comercio

💇 Belleza

🩺 Salud

🔧 Servicios

🏆 Deportes

🎓 Educación

🎉 Eventos

🚗 Automotor

🏠 Servicios para el hogar

📌 Otro
```

Al seleccionar una categoría:

```text
business_type = accommodation
```

El sistema carga dinámicamente el flujo correspondiente.

---

# 7. MOTOR DE PREGUNTAS DINÁMICAS

El sistema debe tener un motor configurable.

No se deben programar todas las preguntas directamente en componentes React.

Las preguntas deben almacenarse en base de datos o en una estructura central configurable.

Ejemplo:

```javascript
{
    id: "has_pool",
    business_type: "accommodation",
    question: "¿Tenés pileta?",
    type: "boolean",
    required: false,
    google_attribute: true,
    seo_relevance: "high"
}
```

Tipos de preguntas:

```text
text
textarea
boolean
select
multiselect
number
date
time
address
phone
email
url
image
video
location
```

Las preguntas podrán tener condiciones.

Ejemplo:

```javascript
{
    id: "pool_heated",
    show_if: {
        field: "has_pool",
        equals: true
    }
}
```

---

# 8. EJEMPLO — ALOJAMIENTO

Si el cliente selecciona:

```text
ALOJAMIENTO
```

Preguntar:

## Información general

- Nombre comercial
- Tipo de alojamiento
- Cantidad de unidades
- Capacidad máxima
- Cantidad de habitaciones

## Servicios

- WiFi
- Estacionamiento
- Pileta
- Pileta climatizada
- Aire acondicionado
- Calefacción
- Desayuno
- Parrilla
- Cocina
- Ropa blanca
- Mascotas permitidas
- Accesibilidad

## Ubicación

- Dirección
- Localidad
- Provincia
- País
- Código postal
- Coordenadas
- Ubicación exacta en mapa

## Diferenciadores

- ¿Qué hace especial a tu alojamiento?
- ¿Qué lugares turísticos hay cerca?
- ¿Qué tipo de huéspedes recibís?
- ¿Es ideal para parejas?
- ¿Es ideal para familias?
- ¿Es ideal para grupos?

## Presencia digital

- Sitio web
- Instagram
- Facebook
- TikTok
- WhatsApp

---

# 9. EJEMPLO — RESTAURANTE

Preguntar:

## Tipo de gastronomía

- Argentina
- Italiana
- Parrilla
- Café
- Bar
- Hamburguesería
- Pizzería
- Otro

## Modalidad

- Salón
- Delivery
- Take away
- Reservas
- Mesas exteriores

## Servicios

- Menú digital
- Carta de vinos
- Opciones vegetarianas
- Opciones veganas
- Opciones sin gluten

## Información adicional

- Capacidad
- Horarios
- Métodos de pago
- Estacionamiento
- Accesibilidad

---

# 10. PERFIL EMPRESARIAL CENTRAL

Toda la información recopilada debe guardarse independientemente del módulo de Google.

Crear una entidad principal:

```text
tax_business_profile
```

Campos sugeridos:

```text
id
business_id

business_type
business_subtype

commercial_name
legal_name

description_short
description_long

primary_category
secondary_categories

phone
whatsapp
email

website_url

instagram_url
facebook_url
tiktok_url
youtube_url
linkedin_url

address
city
state
country
postal_code

latitude
longitude

has_physical_location
is_service_area_business

service_areas

regular_hours
special_hours

status

created_at
updated_at
```

---

# 11. TABLA DE DATOS DINÁMICOS

Crear:

```text
tax_business_profile_answers
```

Campos:

```text
id
business_profile_id

question_id
value

created_at
updated_at
```

Esto permitirá agregar nuevas preguntas sin modificar la estructura principal.

---

# 12. GOOGLE CATEGORY ENGINE

Nunca utilizar categorías inventadas.

Las categorías disponibles deben provenir de Google cuando sea posible.

El sistema deberá:

1. Consultar categorías disponibles.
2. Mostrar categorías sugeridas según el tipo de negocio.
3. Permitir buscar categorías.
4. Guardar la categoría oficial de Google.

Ejemplo:

```text
Categoría principal:

🏨 Hotel
🏡 Cottage
🏕️ Camping cabin
🏠 Vacation home rental
```

La categoría principal debe ser cuidadosamente seleccionada.

El sistema puede sugerir.

El usuario confirma.

---

# 13. GOOGLE ATTRIBUTE ENGINE

Los atributos disponibles dependen de:

- categoría;
- país;
- idioma.

El sistema debe consultar los atributos disponibles desde Google.

Luego TAX debe mostrar únicamente los atributos válidos.

Ejemplo:

```text
☑ WiFi

☑ Estacionamiento gratuito

☑ Accesible

☑ Mesas al aire libre
```

Nunca asumir que un atributo existe.

---

# 14. GEOLOCALIZACIÓN

El usuario debe poder:

1. Escribir la dirección.
2. Buscar la dirección en Google Maps.
3. Colocar un pin manualmente.
4. Ajustar el punto exacto.

Guardar:

```text
formatted_address
latitude
longitude
place_id
```

Debe existir validación de dirección antes de crear el perfil.

---

# 15. CONEXIÓN CON GOOGLE

Crear una sección:

# Conectar Google

Botón:

```text
CONTINUAR CON GOOGLE
```

El cliente debe autenticarse mediante OAuth.

IMPORTANTE:

Los perfiles deben crearse preferentemente utilizando las credenciales OAuth del propietario del negocio.

TAX nunca debe convertirse innecesariamente en propietario principal de todos los negocios de los clientes.

Flujo:

```text
CLIENTE

↓

Google OAuth

↓

Cliente autoriza TAX

↓

TAX obtiene autorización

↓

TAX consulta cuentas Business Profile
```

Guardar tokens de forma segura.

Nunca exponer:

```text
access_token
refresh_token
```

en frontend.

---

# 16. DETECCIÓN DE PERFIL EXISTENTE

Antes de crear un nuevo perfil, siempre buscar coincidencias.

Datos utilizados:

```text
nombre
dirección
teléfono
categoría
```

El sistema consulta Google.

Resultados posibles:

```text
NO_MATCH

POSSIBLE_MATCH

EXACT_MATCH

CLAIMED_BY_OTHER_OWNER
```

---

# 17. CASO A — EL NEGOCIO YA EXISTE

Mostrar:

```text
Encontramos posibles perfiles de tu negocio
```

Cada resultado:

```text
Nombre

Dirección

Categoría

Estado
```

El usuario selecciona:

```text
ESTE ES MI NEGOCIO
```

Luego determinar:

```text
¿El usuario ya tiene acceso?

SI
    ↓
Conectar y sincronizar

NO
    ↓
Solicitar derechos
```

---

# 18. SOLICITUD DE PROPIEDAD

Si Google devuelve una URL o flujo de solicitud de derechos:

Mostrar:

```text
Este negocio ya está administrado por otra cuenta.

Vamos a iniciar una solicitud para que puedas administrarlo.
```

TAX debe:

- registrar el estado;
- guardar fecha de solicitud;
- realizar seguimiento;
- mostrar estado al cliente.

Estados:

```text
not_requested

requested

pending

approved

rejected

manual_action_required
```

---

# 19. CASO B — EL NEGOCIO NO EXISTE

Si no existen coincidencias:

```text
¡Tu negocio todavía no tiene una presencia administrada en Google!

Vamos a crearla.
```

Antes de crear:

## Validación final

Mostrar resumen:

```text
Nombre
Categoría
Dirección
Teléfono
Web
Horarios
Servicios
```

Botón:

```text
CREAR PERFIL
```

Antes de ejecutar la creación real:

```text
validateOnly = true
```

Validar datos.

Si todo es correcto:

```text
CREATE LOCATION
```

---

# 20. CREACIÓN DEL PERFIL

El backend debe crear la ubicación utilizando las APIs oficiales correspondientes.

Guardar:

```text
google_account_id

google_location_id

google_place_id

google_maps_url

google_status
```

Estados:

```text
draft

created

pending_verification

verified

published

suspended

duplicate

error
```

---

# 21. VERIFICACIÓN

Después de crear la ubicación:

Consultar estado.

Si requiere verificación:

Consultar métodos disponibles.

Ejemplos posibles:

```text
AUTO

EMAIL

SMS

VOICE_CALL

POSTCARD

OTRO MÉTODO DISPONIBLE
```

IMPORTANTE:

Google decide los métodos disponibles.

TAX nunca debe prometer un método específico.

---

# 22. VERIFICACIÓN DENTRO DE TAX

Si Google permite un método compatible con la API:

Mostrar:

```text
Verificá tu negocio
```

Ejemplo:

```text
📧 Email

Recibirás un código en:

a******@empresa.com
```

Botón:

```text
ENVIAR CÓDIGO
```

Después:

```text
Ingresá el código que recibiste

[______]

VERIFICAR
```

El código se envía al backend.

El backend completa la verificación.

---

# 23. VERIFICACIÓN AUTOMÁTICA

Si Google devuelve:

```text
AUTO
```

Mostrar:

```text
Google está verificando automáticamente tu negocio.
```

Consultar periódicamente el estado.

No solicitar ninguna acción innecesaria al usuario.

---

# 24. VERIFICACIÓN QUE REQUIERE ACCIÓN EXTERNA

Diseñar una arquitectura que contemple casos donde Google requiera:

- video;
- evidencia;
- acción desde Google;
- revisión manual;
- otros procedimientos futuros.

Mostrar:

```text
Google necesita información adicional para verificar tu negocio.
```

TAX debe:

1. explicar claramente qué debe hacer el usuario;
2. proporcionar instrucciones;
3. abrir el flujo oficial cuando sea necesario;
4. guardar el estado;
5. permitir volver al módulo;
6. consultar automáticamente si la verificación fue completada.

Nunca bloquear definitivamente al usuario.

Estado:

```text
external_action_required
```

---

# 25. POLLING DE VERIFICACIÓN

Crear proceso backend:

```text
checkVerificationStatus()
```

Frecuencia configurable.

Ejemplo:

```text
cada 1 hora
```

Mientras:

```text
pending_verification
```

Cuando:

```text
verified
```

Actualizar automáticamente:

```text
google_status = verified
```

Mostrar:

# 🎉 ¡Tu negocio fue verificado!

---

# 26. SINCRONIZACIÓN TAX → GOOGLE

Una vez conectado el perfil:

El sistema debe permitir sincronizar:

```text
Nombre

Categoría

Dirección

Teléfono

Web

Horarios

Servicios

Atributos

Fotos

Descripción cuando corresponda
```

Antes de sincronizar cambios sensibles:

Mostrar advertencia:

```text
Algunos cambios pueden requerir una nueva revisión o verificación por parte de Google.
```

---

# 27. SINCRONIZACIÓN GOOGLE → TAX

Crear proceso para detectar cambios realizados por Google.

Ejemplo:

```text
Google modificó la dirección sugerida.

¿Querés aceptar este cambio?
```

Estados:

```text
google_update_pending

accepted

rejected
```

---

# 28. REDES SOCIALES

El Business Profile de TAX debe almacenar:

```text
Instagram

Facebook

TikTok

YouTube

LinkedIn

X
```

IMPORTANTE:

No asumir que todas estas redes se pueden publicar directamente en todos los campos de Google Business Profile.

La arquitectura debe separar:

```text
TAX BUSINESS DATA
```

de:

```text
GOOGLE-SUPPORTED FIELDS
```

De esta manera, TAX puede utilizar las redes para:

- página web;
- QR Page;
- Tags ID;
- SEO interno;
- otros módulos;

aunque Google no acepte todas como campos administrables por API.

---

# 29. INTEGRACIÓN CON LA WEB DEL CLIENTE

Si el cliente tiene:

```text
website_url
```

o una web generada por TAX:

La información debe estar sincronizada conceptualmente.

Ejemplo:

```text
Nombre comercial

↓

TAX Business Data

↓

Web
Google
Directory
QR Page
```

---

# 30. TAX DIRECTORY

El perfil del directorio TAX debe alimentarse automáticamente.

No duplicar información.

Ejemplo:

```text
business_profile
        ↓
tax_directory_listing
```

El directorio puede consumir:

- nombre;
- descripción;
- categoría;
- ubicación;
- teléfono;
- WhatsApp;
- imágenes;
- servicios.

---

# 31. SEO OPTIMIZATION ENGINE

Crear un motor de evaluación.

Nombre:

```text
TAX Presence Score
```

Puntaje:

```text
0 - 100
```

Ejemplo:

```text
Perfil empresarial        100%

Ubicación                  100%

Contacto                   100%

Horarios                   100%

Categorías                  80%

Servicios                   90%

Fotos                       40%

Presencia web              100%

Google                      60%
```

Resultado:

# Presencia Digital: 82%

---

# 32. SISTEMA DE RECOMENDACIONES

El sistema debe generar acciones.

Ejemplo:

```text
🔴 Agregá más fotografías

🟠 Completá tus horarios especiales

🟠 Agregá servicios

🟢 Tu sitio web está conectado

🔴 Tu perfil de Google todavía no está verificado
```

Cada recomendación debe tener:

```text
priority

title

description

action_url

status
```

---

# 33. MOTOR DE SEO ASISTIDO POR IA

Crear una capa opcional de IA.

La IA debe trabajar únicamente con información real disponible.

Nunca inventar:

- servicios;
- características;
- ubicaciones;
- premios;
- horarios;
- atributos.

La IA puede ayudar a:

```text
Generar descripción

Mejorar redacción

Identificar información faltante

Proponer preguntas adicionales

Organizar servicios

Generar FAQs

Generar contenido para web

Generar ideas de publicaciones
```

---

# 34. DESCRIPCIÓN DEL NEGOCIO

El sistema debe generar:

```text
Descripción corta

Descripción comercial

Descripción web

Descripción SEO

Meta description
```

Todas deben poder ser editadas.

---

# 35. FOTOS Y MEDIA

Crear sección:

# Fotos de tu negocio

Categorías internas:

```text
logo

cover

exterior

interior

products

services

team

food

rooms

other
```

El sistema debe indicar:

```text
Cantidad de fotos

Calidad

Resolución

Completitud
```

Preparar arquitectura para sincronización con Google Media API cuando corresponda.

---

# 36. DASHBOARD PRINCIPAL

Crear:

# Google Business Profile 360

Mostrar:

```text
🟢 Google conectado

🟢 Perfil creado

🟡 Verificación pendiente

🟢 Información completa

🟠 SEO mejorable
```

Widgets:

```text
Presence Score

Google Status

Profile Completion

Photos

Reviews

Website

Next Actions
```

---

# 37. FLUJO COMPLETO DEL USUARIO

```text
CLIENTE TAX

↓

Selecciona tipo de negocio

↓

Completa wizard inteligente

↓

TAX estructura información

↓

TAX calcula Presence Score

↓

Cliente conecta Google

↓

TAX busca negocio existente

↓

¿Existe?

├── SI
│
│   ├── Cliente tiene acceso
│   │       ↓
│   │   Conectar
│   │
│   └── Cliente no tiene acceso
│           ↓
│       Solicitar derechos
│
└── NO
        ↓
    Crear ubicación

↓

Consultar estado

↓

¿Requiere verificación?

├── NO
│       ↓
│   Publicado
│
└── SI
        ↓
    Consultar métodos disponibles

        ├── Automático
        │
        ├── Email
        │
        ├── SMS
        │
        ├── Llamada
        │
        ├── Postal
        │
        └── Acción externa requerida

↓

Verificado

↓

Sincronización continua

↓

Optimización permanente
```

---

# 38. BASE DE DATOS GOOGLE

Crear tabla:

```text
tax_google_connections
```

Campos:

```text
id

business_id

google_user_email

google_account_id

google_location_id

google_place_id

google_maps_url

connection_status

verification_status

ownership_status

last_sync_at

created_at

updated_at
```

---

# 39. TABLA DE SINCRONIZACIÓN

```text
tax_google_sync_logs
```

Campos:

```text
id

business_id

action

direction

status

request_data

response_data

error_message

created_at
```

Dirección:

```text
tax_to_google

google_to_tax
```

---

# 40. TABLA DE VERIFICACIONES

```text
tax_google_verifications
```

Campos:

```text
id

business_id

google_location_id

verification_id

method

status

external_action_required

created_at

updated_at

completed_at
```

---

# 41. API INTERNA TAX

Crear endpoints backend.

Ejemplo:

```text
/api/google/connect

/api/google/oauth/callback

/api/google/accounts

/api/google/search-location

/api/google/claim-location

/api/google/create-location

/api/google/location

/api/google/sync

/api/google/verification/options

/api/google/verification/start

/api/google/verification/complete

/api/google/verification/status

/api/google/disconnect
```

---

# 42. SEGURIDAD

REGLAS OBLIGATORIAS:

- OAuth tokens nunca en frontend.
- Tokens cifrados en base de datos.
- Refresh tokens manejados exclusivamente por backend.
- Validación de permisos por business_id.
- Un usuario nunca puede acceder a conexiones Google de otro negocio.
- Registrar acciones importantes.
- No guardar PIN de verificación.
- No registrar secretos en logs.

---

# 43. MANEJO DE ERRORES

Crear estados amigables.

Ejemplo:

```text
No pudimos conectar Google.

Volvé a intentarlo.
```

Nunca mostrar directamente:

```text
403 PERMISSION_DENIED
```

al usuario final.

Registrar el error técnico internamente.

---

# 44. ESTADOS GENERALES DEL MÓDULO

```text
NOT_STARTED

PROFILE_IN_PROGRESS

PROFILE_COMPLETE

GOOGLE_NOT_CONNECTED

GOOGLE_CONNECTED

SEARCHING_LOCATION

LOCATION_FOUND

OWNERSHIP_REQUESTED

LOCATION_CREATED

VERIFICATION_REQUIRED

VERIFICATION_PENDING

EXTERNAL_ACTION_REQUIRED

VERIFIED

PUBLISHED

SYNC_ERROR

SUSPENDED
```

---

# 45. REGLAS FUNDAMENTALES

## No duplicar negocios

Siempre buscar coincidencias antes de crear.

## No inventar información

Toda información debe provenir:

- del cliente;
- de TAX;
- de Google;
- de fuentes autorizadas.

## No garantizar posicionamiento

TAX puede optimizar completitud y calidad de información.

Nunca prometer:

```text
Primer puesto en Google
```

## Google controla verificación

TAX debe automatizar y orquestar.

Google determina los requisitos finales.

---

# 46. INTEGRACIÓN CON EL RESTO DE TAX

El módulo debe integrarse con:

```text
TAX Directory

TAX Web

QR Page

Tags ID

Tags Reviews

Tags Booking

Tags eCommerce

Restaurant Menu

Chatbot
```

Todos deben consumir la misma fuente central de información empresarial.

---

# 47. PRINCIPIO DE SINGLE SOURCE OF TRUTH

La información principal del negocio debe existir una sola vez.

Ejemplo:

```text
BUSINESS PROFILE

phone
```

Debe alimentar:

```text
Google

Web

Directory

WhatsApp

QR Page

Tags ID
```

No crear copias independientes del teléfono.

---

# 48. FUTURO

Preparar arquitectura para:

```text
Google Reviews Management

Review AI Replies

Google Posts

Google Performance Metrics

Call Tracking

Website Click Tracking

Directions Tracking

SEO Monitoring

Competitor Monitoring
```

---

# 49. CRITERIOS DE ÉXITO

El módulo estará correctamente implementado cuando un cliente pueda:

1. Crear su perfil empresarial en TAX.
2. Completar preguntas específicas según su negocio.
3. Obtener recomendaciones automáticas.
4. Conectar su cuenta Google.
5. Detectar si su negocio ya existe.
6. Conectar un perfil existente o iniciar el flujo de propiedad.
7. Crear una nueva ubicación cuando corresponda.
8. Realizar la verificación disponible mediante la plataforma cuando Google lo permita.
9. Ser guiado cuando Google requiera acciones externas.
10. Saber en todo momento el estado de su perfil.
11. Mantener sincronizada su presencia digital.
12. Reutilizar sus datos en todos los módulos de TAX.

---

# 50. PRINCIPIO FINAL DEL PRODUCTO

El producto no debe sentirse como:

```text
Un formulario para Google Maps
```

Debe sentirse como:

# EL CENTRO DE PRESENCIA DIGITAL DEL NEGOCIO

El cliente completa y mantiene su negocio dentro de TAX.

TAX utiliza esa información para construir y administrar:

```text
🌐 Su sitio web

📍 Google Maps

🔎 Google Search

📱 Sus QR Pages

💳 Su tarjeta digital

📖 Su presencia en el directorio

⭐ Sus reseñas

📅 Sus reservas

🛒 Su tienda

🍽️ Su menú

🤖 Su asistente

📊 Su presencia digital completa
```

La propuesta de valor final es:

> **Tu negocio. Una sola plataforma. Toda tu presencia digital.**