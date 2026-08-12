import Link from "next/link";
import Image from "next/image";
import DirectoryPublicHeader from "./DirectoryPublicHeader";
import DirectoryCategoryGrid from "./DirectoryCategoryGrid";
import DirectoryListingGrid from "./DirectoryListingGrid";
import DirectoryResultsHeading from "./DirectoryResultsHeading";
import DirectoryLocalityFilter from "./DirectoryLocalityFilter";
import DirectoryResultsMap from "./DirectoryResultsMap";
import DirectoryPublicFooter from "./DirectoryPublicFooter";
import "./DirectoryTourismPage.css";

const PAGE_CONFIG = {
  accommodation: { title: "Alojamientos en el Valle de Calamuchita", eyebrow: "DÓNDE DORMIR", route: "/alojamientos", intro: "Encontrá cabañas, hoteles, posadas, hosterías y campings para disfrutar tu estadía en el Valle de Calamuchita.", images: ["alojamiento-en-calamuchita.webp", "hoteles-en-calamuchita.webp", "cabanas-en-calamuchita.webp", "donde-dormir-en-calamuchita.webp"], seo: ["El Valle de Calamuchita ofrece una gran cantidad y variedad de alojamiento en distintas modalidades. Cabañas, hoteles, posadas, hosterías, campings, etc. Aquí podrán encontrar el alojamiento que más se ajuste a sus necesidades y expectativas, contactando directamente con el establecimiento. Cada localidad del Valle de Calamuchita, su gente, sus atractivos naturales y sus eventos los esperan para hacer de sus vacaciones una experiencia inolvidable."] },
  restaurants: { title: "Dónde Comer en el Valle de Calamuchita", eyebrow: "DÓNDE COMER", route: "/donde-comer", intro: "Descubrí restaurantes, bares, cervecerías, comedores y sabores regionales de cada localidad.", images: ["restaurant-en-calamuchita.webp", "gastronomia-en-calamuchita.webp", "donde-comer-en-calamuchita.webp", "cerveceria-en-calamuchita.webp"], seo: ["La Gastronomía expresa la identidad de cada pueblo y el Valle de Calamuchita no es la excepción. Cada localidad, cada paraje, deja ver sus raíces en base a la carta gastronómica que tiene para ofrecer. Pueblos criollos y centroeuropeos —alemanes, suizos, belgas y austríacos—, junto con italianos y españoles, agasajan a los visitantes con delicias típicas.", "Humitas, asados, comidas al disco, cabrito, gulash, spätzle, pizzas, lomitos, pastas, truchas, cervezas artesanales, gin local y vinos regionales son algunas de las opciones de una amplísima carta, junto con una gran oferta de restaurantes, casas de comida y comedores."] },
  activities: { title: "Qué Hacer en el Valle de Calamuchita", eyebrow: "QUÉ HACER", route: "/actividades-turisticas", intro: "Encontrá excursiones, actividades, alquileres, experiencias y propuestas para vivir Calamuchita.", images: ["kayak-en-calamuchita.webp", "cicloturismo-en-calamuchita.webp", "senderismo-en-calamuchita.webp", "cuatriciclos-en-calamuchita.webp"], seo: ["Si estás planeando vacacionar en las Sierras de Córdoba y tu intención es disfrutar de la naturaleza, pasear, recorrer, andar en bicicleta, hacer trekking, senderismo, cabalgatas, cuatriciclos, kayak, actividades náuticas, excursiones, ascenso a los cerros, visitar parques recreativos, bodegas y productores regionales, el Valle de Calamuchita te espera con innumerables alternativas.", "En nuestra plataforma vas a encontrar prestadores de servicios para todo tipo de actividades. Podés contactarlos y coordinar tu actividad en forma directa y sin intermediarios. Un sinfín de entretenimientos y actividades te esperan para hacer de tu estadía una experiencia inolvidable."] },
  gifts: { title: "Regalos, Artesanías y Regionales", eyebrow: "QUÉ REGALAR", route: "/regalos-artesanias-regionales", intro: "Llevate un recuerdo del Valle: artesanías, alfajores, chocolates, cervezas y productos regionales.", images: ["regalos-en-calamuchita.webp", "artesanias-en-calamuchita.webp", "regionales-en-calamuchita.webp", "alfajores-y-chocolates-en-calamuchita.webp"], seo: ["Cuando salimos de vacaciones es habitual llevarnos un recuerdo o souvenir representativo del lugar que visitamos. En cada localidad del Valle de Calamuchita vas a encontrar innumerables comercios con una amplia variedad de opciones en regalos, artesanías y artículos regionales.", "En CalamuchitAr los ponemos a tu disposición. Encontrarás proveedores de vasijas, jarrones, macetas de barro, alfajores, chocolates, conservas, dulces, embutidos, cervezas artesanales, productos tejidos, textiles, remeras, sombreros, jarros y productos de cerámica, entre muchas cosas más."] },
};

export default function DirectoryTourismPage({ data, kind }) {
  const config = PAGE_CONFIG[kind];
  const returnHref = config.route;
  const resultsTitle = data.selectedTourismCategory ? `Prestadores de ${data.selectedTourismCategory.name}` : "Prestadores turísticos";
  const categoryHref = categoryId => `/directorio?categoria=${categoryId}#resultados`;

  return <main className="tags_directory_tourism_page">
    <DirectoryPublicHeader site={data.site} compact showSearch={false} />
    <section className="tags_directory_tourism_hero"><div><span>{config.eyebrow}</span><h1>{config.title}</h1><p>{config.intro}</p></div></section>
    <div className="tags_directory_tourism_images tags_directory_tourism_images_desktop">{config.images.map(image => <Image src={`/directory/calamuchitar/tourism/${image}`} alt="" width={480} height={190} sizes="25vw" key={image} />)}</div>
    <div className="tags_directory_tourism_images tags_directory_tourism_images_mobile">{config.images.slice(0, 2).map(image => <Image src={`/directory/calamuchitar/tourism/${image}`} alt="" width={240} height={125} sizes="50vw" key={image} />)}</div>
    <div className="tags_directory_tourism_page_content">
      <nav className="tags_directory_tourism_back"><Link href="/directorio">← Volver al Directorio</Link></nav>
      {data.categories.length > 0 && <DirectoryCategoryGrid categories={data.categories} title="Explorá por categoría" />}
      <section className="tags_directory_tourism_results" id="resultados">
        <header><DirectoryResultsHeading title={resultsTitle} total={data.pagination.total} navigationKey={`${kind}|${data.pagination.total}`} /><DirectoryLocalityFilter localities={data.localities} categoryId={data.filters.categoryId} /></header>
        <DirectoryResultsMap listings={data.mapListings} apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""} mapId={process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || "DEMO_MAP_ID"} />
        <DirectoryListingGrid listings={data.listings} returnHref={returnHref} navigationTrail={[{ label: config.title, href: returnHref }]} />
      </section>
      <div className="tags_directory_tourism_images tags_directory_tourism_images_mobile">{config.images.slice(2).map(image => <Image src={`/directory/calamuchitar/tourism/${image}`} alt="" width={240} height={125} sizes="50vw" key={image} />)}</div>
      <section className="tags_directory_tourism_seo">{config.seo.map((paragraph, index) => <p key={index}>{paragraph}</p>)}</section>
    </div>
    <DirectoryPublicFooter site={data.site} />
  </main>;
}
