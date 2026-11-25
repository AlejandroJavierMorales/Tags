import Swal from 'sweetalert2';

const showAlert = async ({
    title = '',
    text = '',
    icon = 'info',
    confirmButtonText = 'OK',
    cancelButtonText = 'Cancelar',
    showCancelButton = false,
    timer = null,
    width = null,
    isHtml = false, // Nueva opción para manejar texto como HTML
    input = null,
    inputValue = null,
    inputLabel = null,
    inputAttributes = null,
    returnValue = false
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
        width: width || undefined,
        input: input || undefined,
        inputValue: inputValue ?? undefined,
        inputLabel: inputLabel || undefined,
        inputAttributes: inputAttributes || undefined,
        inputValidator: input ? value => (!value || Number(value) <= 0 ? "Ingresá un importe mayor a cero" : undefined) : undefined,
        allowOutsideClick: !showCancelButton, // Previene cerrar si requiere confirmación
        showConfirmButton: !timer // Oculta el botón de confirmación si hay un tiempo de cierre automático
    });

    // Devuelve true/false si el usuario confirma/cancela, o null si es un mensaje con timer.
    if (result.isConfirmed) {
        return returnValue ? result.value : true;
    } else if (result.isDismissed) {
        return false;
    }
    return null;
};

export default showAlert;
