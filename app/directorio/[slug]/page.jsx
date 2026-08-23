import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function LegacyDirectoryProviderRoute({ params, searchParams }) {
  const values = await Promise.resolve(params);
  const query = await Promise.resolve(searchParams || {});
  const forwarded = new URLSearchParams();
  forwarded.set("volver", String(query.volver || "/directorio"));
  if (query.ruta) forwarded.set("ruta", String(query.ruta));
  redirect(`/${values.slug}?${forwarded.toString()}`);
}
