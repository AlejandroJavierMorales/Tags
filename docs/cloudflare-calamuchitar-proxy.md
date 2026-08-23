# CalamuchitAr sobre Tags mediante Cloudflare

## Contrato

- `https://calamuchita.ar/` renderiza internamente `/directorio`, sin exponer esa ruta.
- `https://calamuchita.ar/directorio` redirige a la raíz y cada ficha conserva `https://calamuchita.ar/[slug]`.
- El navegador conserva el dominio y las rutas históricas indexadas.
- El Worker consulta internamente `https://tags.com.ar/...` conservando ruta, query, método, body y cookies.
- El Worker envía `x-forwarded-host: calamuchita.ar` y `x-forwarded-proto: https`.
- Tags resuelve `tags_directory_sites.primary_host`, valida el canal y genera redirects y magic links sobre el dominio original.
- `www.calamuchita.ar` redirige de forma permanente al dominio canónico `calamuchita.ar`, conservando ruta y query.

## DNS

En la zona de Cloudflare:

1. Mantener los registros `MX` actuales de cPanel sin proxy.
2. Mantener los registros de correo (`mail`, SPF, DKIM y DMARC) como **DNS only**.
3. Crear `A` o `CNAME` para `@` y `www` con nube naranja. El destino DNS es secundario porque las rutas quedan interceptadas por el Worker.
4. No cambiar nameservers o registros MX sin comprobar antes la zona completa importada en Cloudflare.

## Rutas del Worker

Asignar el Worker a:

```text
calamuchita.ar/*
www.calamuchita.ar/*
```

El archivo desplegable es `cloudflare/directory-domain-proxy-worker.js`. Si ya existe un Worker general, incorporar esta rama antes de su resolver actual o reutilizar su lógica estableciendo los mismos dos headers.

## Registro en Tags

La fila de `tags_directory_sites` correspondiente a CalamuchitAr debe tener:

```text
code: calamuchitar
primary_host: calamuchita.ar
is_active: 1
```

El `brand_config` debe contener, como mínimo, `displayName`, `logoUrl`, `slogan` y `primaryColor` para que `/login` y el panel adopten el branding del Directorio.

## Prueba integral

1. Abrir `https://calamuchita.ar/` y verificar que la URL no cambia a Tags.
2. Abrir una ficha histórica y comprobar assets, imágenes y navegación.
3. Abrir `https://www.calamuchita.ar/login` y comprobar la redirección a `https://calamuchita.ar/login`.
4. Solicitar acceso con un negocio asignado a CalamuchitAr.
5. Verificar que el email contiene un enlace `https://calamuchita.ar/api/auth/verify?...`.
6. Abrirlo y comprobar que redirige a `https://calamuchita.ar/dashboard/businesses/{id}` con branding del canal.
7. Intentar un email existente pero no asignado al canal: debe responder que no está habilitado.
8. Intentar ingresar como administrador general desde CalamuchitAr: debe rechazarse. El administrador entra únicamente por `https://tags.com.ar/login`.
9. Probar logout y nuevo login.
10. Verificar `https://calamuchita.ar/publicar-mi-negocio` y el retorno de Mercado Pago.

Las rutas `/login`, `/dashboard`, `/api`, `/logout` y `/suscripcion` llevan `Cache-Control: private, no-store` desde el Worker.
