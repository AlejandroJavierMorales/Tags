import Swal from 'sweetalert2';

const showAlert = async ({
    title = '',
    text = '',
    icon = 'info',
    confirmButtonText = 'OK',
    cancelButtonText = 'Cancelar',
    showCancelButton = false,
    timer = null,
    isHtml = false // Nueva opción para manejar texto como HTML
}) => {
    const result = await Swal.fire({
        title,
        html: isHtml ? text : undefined, // Usa html si isHtml es true
        text: !isHtml ? text : undefined, // Usa text si isHtml es false
        icon,
        confirmButtonText,
        cancelButtonText,
        showCancelButton,
        timer,
        allowOutsideClick: !showCancelButton, // Previene cerrar si requiere confirmación
        showConfirmButton: !timer // Oculta el botón de confirmación si hay un tiempo de cierre automático
    });

    // Devuelve true/false si el usuario confirma/cancela, o null si es un mensaje con timer.
    if (result.isConfirmed) {
        return true;
    } else if (result.isDismissed) {
        return false;
    }
    return null;
};

export default showAlert;