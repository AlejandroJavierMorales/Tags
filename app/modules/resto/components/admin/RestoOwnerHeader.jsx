"use client";

import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import { FaHome, FaSignOutAlt } from "react-icons/fa";

export default function RestoOwnerHeader({ name, channel = null }) {
    const params = useParams();
    const businessId = params?.id;
    const brand = channel?.brandConfig || {};
    const brandName = brand.displayName || channel?.name || "Tags";
    const brandLogo = brand.logoUrl || brand.logo_url || (channel?.code === "calamuchitar"
        ? "/directory/calamuchitar/LogoCalamuchitar.webp"
        : "/logo_tags_transparente.webp");

    return <header className="resto_staff_access_header">
        <div>
            <Image src={brandLogo} alt={brandName} width={132} height={48} style={{ width: "auto", height: 48, maxWidth: 132, objectFit: "contain" }} />
            <span><strong>{brandName} · Resto</strong><small>{name || "Owner"} · Owner</small></span>
        </div>
        <nav>
            {businessId && <Link href={`/dashboard/businesses/${businessId}/resto`}><FaHome /> Inicio</Link>}
            {businessId && <Link href={`/dashboard/businesses/${businessId}`}>Dashboard</Link>}
            <Link href="/logout"><FaSignOutAlt /> Cerrar sesión</Link>
        </nav>
    </header>;
}
