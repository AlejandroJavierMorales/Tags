import ClubPublicAccount from "@/app/modules/sports/components/public/ClubPublicAccount";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function ClubAccountPage({ params }) {
    const { slug } = await params;
    return <ClubPublicAccount slug={slug}/>;
}
