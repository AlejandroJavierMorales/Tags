// =====================================
// Archivo:
// /app/modules/store/lib/normalizeProductVariants.js
//
// Descripción:
// Normaliza variantes de producto para
// mostrarlas como opciones seleccionables
// tipo MercadoLibre.
//
// Entrada:
// - variants con options_json
//
// Salida:
// - variantOptions agrupadas por opción
// - variantes normalizadas
//
// Contexto:
// store
// =====================================

export function normalizeProductVariants(
    variants = []
) {

    const optionMap =
        new Map();

    const normalizedVariants =
        variants.map(
            (variant) => {

                const options =
                    parseVariantOptions(
                        variant.options_json
                    );

                options.forEach(
                    (option) => {

                        if (!optionMap.has(option.option_id)) {

                            optionMap.set(
                                option.option_id,
                                {
                                    option_id:
                                        option.option_id,

                                    name:
                                        option.option_name,

                                    values:
                                        []
                                }
                            );

                        }

                        const group =
                            optionMap.get(
                                option.option_id
                            );

                        const exists =
                            group.values.some(
                                item =>
                                    String(item.value_id) ===
                                    String(option.value_id)
                            );

                        if (!exists) {

                            group.values.push({
                                value_id:
                                    option.value_id,

                                value:
                                    option.value
                            });

                        }

                    }
                );

                return {
                    ...variant,
                    options
                };

            }
        );

    return {
        variants:
            normalizedVariants,

        variantOptions:
            Array.from(
                optionMap.values()
            )
    };

}

function parseVariantOptions(value) {

    if (!value) {
        return [];
    }

    if (Array.isArray(value)) {
        return value;
    }

    try {
        return JSON.parse(value);
    } catch {
        return [];
    }

}