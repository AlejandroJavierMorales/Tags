"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { FaHome, FaSignOutAlt, FaUtensils } from "react-icons/fa";

export default function RestoOwnerHeader({ name }) {
    const params = useParams();
    const businessId = params?.id;

    return <header className="resto_staff_access_header">
        <div><FaUtensils /><span><strong>Tags Resto</strong><small>{name || "Owner"} · Owner</small></span></div>
        <nav>
            {businessId && <Link href={`/dashboard/businesses/${businessId}/resto`}><FaHome /> Inicio</Link>}
            {businessId && <Link href={`/dashboard/businesses/${businessId}`}>Dashboard</Link>}
            <Link href="/logout"><FaSignOutAlt /> Cerrar sesión</Link>
        </nav>
    </header>;
}
