-- Importación de los Themes de Tags Resto desde Desarrollo a Producción.
-- Idempotente por code: actualiza la definición si ya existe y no duplica filas.

INSERT INTO tags_qr_page_themes
    (code, name, description, global_styles, header_config, footer_config, section_styles, is_active, sort_order, css_tokens)
VALUES
('resto_modern', 'Resto Modern', 'Tema moderno y luminoso con acentos cálidos para restaurantes contemporáneos.', '{}', '{}', '{}', '{}', 1, 21, '{"--qr-bg":"#f7f4f1","--qr-text":"#25211f","--qr-muted":"#80736d","--qr-border":"#e3d9d2","--qr-radius":"20px","--qr-shadow":"0 18px 42px rgba(83,57,43,.12)","--qr-primary":"#e85d3f","--qr-surface":"#fffdfb","--qr-surface-alt":"#f1ebe6","--qr-primary-text":"#ffffff","--qr-primary-hover":"#cf4930"}'),
('resto_dark', 'Resto Dark', 'Tema oscuro cálido y elegante, sin fondos negros puros.', '{}', '{}', '{}', '{}', 1, 22, '{"--qr-bg":"#171512","--qr-text":"#f5f1e8","--qr-muted":"#b8aea0","--qr-border":"#3a342d","--qr-radius":"20px","--qr-shadow":"0 18px 44px rgba(8,7,6,.34)","--qr-primary":"#d9954e","--qr-surface":"#211e1a","--qr-surface-alt":"#2b2722","--qr-primary-text":"#1d1711","--qr-primary-hover":"#e8aa68"}'),
('resto_italian', 'Resto Italian', 'Tema italiano cálido con crema, verde oliva y rojo terracota.', '{}', '{}', '{}', '{}', 1, 23, '{"--qr-bg":"#f6f1df","--qr-text":"#29291f","--qr-muted":"#6f715f","--qr-border":"#d8cfb5","--qr-radius":"18px","--qr-shadow":"0 16px 38px rgba(76,72,43,.13)","--qr-primary":"#a63d32","--qr-surface":"#fffaf0","--qr-surface-alt":"#ebe5cf","--qr-primary-text":"#ffffff","--qr-primary-hover":"#8d3028"}'),
('resto_burger', 'Resto Burger', 'Tema urbano para hamburgueserías con mostaza, naranja y tonos carbón.', '{}', '{}', '{}', '{}', 1, 24, '{"--qr-bg":"#25231f","--qr-text":"#f8f3e8","--qr-muted":"#c9bdab","--qr-border":"#4a453c","--qr-radius":"16px","--qr-shadow":"0 18px 42px rgba(14,13,11,.30)","--qr-primary":"#f4b942","--qr-surface":"#302d27","--qr-surface-alt":"#3a362f","--qr-primary-text":"#2b2110","--qr-primary-hover":"#ffc95f"}'),
('resto_sushi', 'Resto Sushi', 'Tema sobrio inspirado en restaurantes japoneses, con rojo profundo y tonos piedra.', '{}', '{}', '{}', '{}', 1, 25, '{"--qr-bg":"#242322","--qr-text":"#f2eee8","--qr-muted":"#aaa29a","--qr-border":"#45413e","--qr-radius":"14px","--qr-shadow":"0 18px 40px rgba(12,11,11,.30)","--qr-primary":"#c94b45","--qr-surface":"#2d2b2a","--qr-surface-alt":"#373432","--qr-primary-text":"#ffffff","--qr-primary-hover":"#de5d57"}'),
('resto_coffee', 'Resto Coffee', 'Tema cálido para cafeterías con tonos café, crema y caramelo.', '{}', '{}', '{}', '{}', 1, 26, '{"--qr-bg":"#f2e8da","--qr-text":"#3c2c24","--qr-muted":"#806b5c","--qr-border":"#d7c4ae","--qr-radius":"22px","--qr-shadow":"0 18px 42px rgba(91,61,43,.14)","--qr-primary":"#9b6037","--qr-surface":"#fff9f0","--qr-surface-alt":"#e7d8c5","--qr-primary-text":"#ffffff","--qr-primary-hover":"#7f4b2a"}'),
('resto_mexican', 'Resto Mexican', 'Tema vibrante con terracota, verde cactus y amarillo cálido.', '{}', '{}', '{}', '{}', 1, 27, '{"--qr-bg":"#f7e8c6","--qr-text":"#33261e","--qr-muted":"#75624f","--qr-border":"#ddc594","--qr-radius":"20px","--qr-shadow":"0 18px 42px rgba(115,67,36,.14)","--qr-primary":"#d4512d","--qr-surface":"#fff3d8","--qr-surface-alt":"#ead8ae","--qr-primary-text":"#ffffff","--qr-primary-hover":"#b63f21"}'),
('resto_premium', 'Resto Premium', 'Tema elegante y sofisticado con carbón suave, marfil y dorado.', '{}', '{}', '{}', '{}', 1, 28, '{"--qr-bg":"#24221f","--qr-text":"#f5f0e6","--qr-muted":"#b9afa0","--qr-border":"#48423a","--qr-radius":"16px","--qr-shadow":"0 20px 46px rgba(11,10,9,.32)","--qr-primary":"#c8a464","--qr-surface":"#2e2b27","--qr-surface-alt":"#39352f","--qr-primary-text":"#211b12","--qr-primary-hover":"#d8b97e"}'),
('resto_minimal', 'Resto Minimal', 'Tema minimalista claro con superficies limpias y acento verde suave.', '{}', '{}', '{}', '{}', 1, 29, '{"--qr-bg":"#f5f6f4","--qr-text":"#262b28","--qr-muted":"#758079","--qr-border":"#dce1dd","--qr-radius":"14px","--qr-shadow":"0 14px 34px rgba(43,55,48,.09)","--qr-primary":"#55796a","--qr-surface":"#ffffff","--qr-surface-alt":"#eef0ed","--qr-primary-text":"#ffffff","--qr-primary-hover":"#436456"}')
ON DUPLICATE KEY UPDATE
    name = VALUES(name),
    description = VALUES(description),
    global_styles = VALUES(global_styles),
    header_config = VALUES(header_config),
    footer_config = VALUES(footer_config),
    section_styles = VALUES(section_styles),
    is_active = VALUES(is_active),
    sort_order = VALUES(sort_order),
    css_tokens = VALUES(css_tokens),
    updated_at = CURRENT_TIMESTAMP;
