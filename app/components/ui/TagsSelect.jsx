// =====================================
// Archivo:
// app/components/tags-ui/TagsSelect.jsx
//
// Descripción:
// Select custom reutilizable para la plataforma Tags.
// Consume tokens CSS --qr-* desde el contenedor padre.
// =====================================

"use client";

import {
    useEffect,
    useRef,
    useState
} from "react";

import {
    FiChevronDown
} from "react-icons/fi";

export default function TagsSelect({
    value,
    options = [],
    onChange,
    placeholder = "Seleccionar",
    className = "",
    disabled = false,
    maxWidth = null,
    size = "md",
    searchable = false,
    searchPlaceholder = "Buscar..."
}) {

    const [open, setOpen] =
        useState(false);

    const [query, setQuery] =
        useState("");

    const ref =
        useRef(null);

    const selected = options.find(option => String(option.value) === String(value));
    const visibleOptions = searchable
        ? options.filter(option => String(option.label || "").toLowerCase().includes(query.toLowerCase()))
        : options;

    useEffect(() => {

        function handleClickOutside(e) {

            if (
                ref.current &&
                !ref.current.contains(e.target)
            ) {
                setOpen(false);
            }

        }

        document.addEventListener(
            "mousedown",
            handleClickOutside
        );

        return () =>
            document.removeEventListener(
                "mousedown",
                handleClickOutside
            );

    }, []);

    return (
        <div
            ref={ref}
            className={`tags_select tags_select_${size} ${className}`}
            style={{
                maxWidth: maxWidth || undefined
            }}
        >
            <button
                type="button"
                className="tags_select_trigger"
                disabled={disabled}
                onClick={() => setOpen(prev => !prev)}
            >
                <span>
                    {
                        selected?.label ||
                        placeholder
                    }
                </span>

                <FiChevronDown />
            </button>

            {
                open && !disabled && (

                    <div className="tags_select_menu">

                        {searchable && <input
                            type="search"
                            className="tags_select_search"
                            value={query}
                            placeholder={searchPlaceholder}
                            onChange={event => setQuery(event.target.value)}
                            onClick={event => event.stopPropagation()}
                        />}

                        {
                            visibleOptions.map(option => (

                                <button
                                    key={option.value}
                                    type="button"
                                    className={
                                        String(option.value) === String(value)
                                            ? "active"
                                            : ""
                                    }
                                    onClick={() => {
                                        onChange?.(option.value);
                                        setQuery("");
                                        setOpen(false);
                                    }}
                                >
                                    {option.label}
                                </button>

                            ))
                        }
                        {searchable && !visibleOptions.length && <span className="tags_select_empty">No se encontraron opciones.</span>}

                    </div>

                )
            }
        </div>
    );

}
