"use client";

import Link from "next/link";
import {
    useParams
} from "next/navigation";
import {
    FaHome,
    FaSignOutAlt,
    FaUtensils
} from "react-icons/fa";

export default function RestoStaffHeader({
    name,
    roleName
}) {
    const params = useParams();
    const businessId =
        params?.id;

    return (
        <header className="resto_staff_access_header">
            <div>
                <FaUtensils />
                <span>
                    <strong>Tags Resto</strong>
                    <small>
                        {name}
                        {roleName
                            ? ` · ${roleName}`
                            : ""}
                    </small>
                </span>
            </div>
            <nav>
                {businessId && (
                    <Link
                        href={`/dashboard/businesses/${businessId}/resto`}
                    >
                        <FaHome /> Inicio
                    </Link>
                )}
                <Link href="/resto/logout">
                    <FaSignOutAlt />
                    Cerrar sesión
                </Link>
            </nav>
        </header>
    );
}
