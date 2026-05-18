export const getVideoUrls = async (type) => {
    const videos = [
        // Puedes obtener estos datos de tu base de datos.
        {
            id: 1,
            name: "navegacion_de_la_plataforma.mp4",
            type: "publisher",
            title: "Navegar La Plataforma y Contactar a un Prestador de Servicios",
            description: "Este tutorial muestra las maneras en las que un usuario de la Plataforma puede navegarla, acceder a los prestadores de servicios y cómo acceder a contactarlo, verificar su ubicación, acceder a sus servicios, tienda online, solicitar un pproducto o servicio, etc..."
        },
        {
            id: 2,
            name: "editar_mi_web.mp4",
            type: "publisher",
            title: "Editar Mi Página Web - Agregar Secciones",
            description: "Este video muestra cómo debe hacer un Prestador de Servicios que forma parte de la Plataforma para administrar su publicidad agregando, editando las Secciones de su Página Web"
        },
        {
            id: 3,
            name: "administrar_mi_tienda_online.mp4",
            type: "publisher",
            title: "Administrar Mi Tienda o Catálogo",
            description: "Este video muestra a un Prestador de Servicio que adquirió la Tienda/Cátalogo dentro de su subcripción, cómo crear la estructura de categorías y subcategorías, Productos, agregar imágenes a un producto, de forma tal de poder generar su catálogo de productos o servicios."
        },
        {
            id: 4,
            name: "editar_carta_de_menu_de_restoran.mp4",
            type: "publisher",
            title: "Generar Mi Carta de Menú accesible por código QR",
            description: "Este tutorial muestra al Prestador de servicios de Restoran o Casa de Comidas, cómo generar la Carta de Menú Digital, la cual podrá ser accedida por código QR. Una vez generada la carta Digital podrá generar su código QR apuntando a la dirección https://calamuchita.ar/[nombre de comerco o servicio]/menu o bién, nos lo podrán solicitar via Whatsapp al 3546-562855 o por email a info@calamuchita.ar"
        },
        {
            id: 5,
            name: "navegacion_de_la_plataforma.mp4",
            type: "user",
            title: "Navegar La Plataforma y Contactar a un Prestador de Servicios",
            description: "Este tutorial muestra las maneras en las que un usuario de la Plataforma puede navegarla, acceder a los prestadores de servicios y cómo acceder a contactarlo, verificar su ubicación, acceder a sus servicios, tienda online, solicitar un pproducto o servicio, etc..."
        },
        {
            id: 6,
            name: "herramientas_de_usuario_registrado.mp4",
            type: "user",
            title: "Herramientas para Usuarios Registrados",
            description: "En este video mostramos qué herramientas se activan para un Usuario que se registra en la Plataforma e ingresa con su email y contraseña (Favoritos, Anotador, Agenda, Perfil), y como utilizarlas."
        },
    ];

    return videos
        .filter((video) => video.type === type)
        .map((video) => ({
            id: video.id,
            url: `https://storage.googleapis.com/bucket_calamuchitar_videos/${type}s/${video.name}`,
            title: video.title,
            description: video.description
        }));
};
