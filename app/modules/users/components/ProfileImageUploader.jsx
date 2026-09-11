// =====================================
// COMPONENT: ProfileImageUploader
// Descripcion: Carga de imagen personal mediante el MediaUploader existente.
// =====================================

"use client";

import MediaUploader from "@/app/components/MediaUploader";

export default function ProfileImageUploader({ userId, value, onChange }) {
    return (
        <div>
            <p className="small text-muted mb-2">Imagen cuadrada de 750×750 px. Máximo 2 MB.</p>
            <MediaUploader
                businessId={userId}
                value={value || ""}
                accept="image/jpeg,image/png,image/webp,image/avif"
                label={value ? "Cambiar imagen" : "Cargar imagen de perfil"}
                uploadEndpoint="/api/users/profile-image"
                onChange={media => onChange?.(media?.url || "")}
            />
        </div>
    );
}
