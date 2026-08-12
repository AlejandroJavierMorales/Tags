import GuestExperiencePublicApp from "@/app/modules/guest-experience/components/public/GuestExperiencePublicApp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function GuestExperiencePage({ params }) {
    const resolved = await params;
    return <GuestExperiencePublicApp slug={resolved.slug} initialSection={resolved.section?.[0] || "inicio"} />;
}
