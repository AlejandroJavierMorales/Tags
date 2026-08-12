import TurnosCustomerBookings from "@/app/modules/turnos/components/public/TurnosCustomerBookings";

export const runtime="nodejs";
export const dynamic="force-dynamic";

export default async function TurnosCustomerBookingsPage({params}){const {slug}=await params;return <TurnosCustomerBookings slug={slug}/>;}
