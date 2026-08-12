import { FaArrowRight } from "react-icons/fa6";
import Link from "next/link";
import Image from "next/image";
import { directoryImageUrl } from "../../lib/directoryPublicFormatting";
import "./DirectoryCategoryGrid.css";

function categoryHref(id) { return `/directorio?categoria=${id}`; }

export default function DirectoryCategoryGrid({ categories, title }) {
  if (!categories.length) return null;
  return <section className="tags_directory_categories" id="rubros" aria-labelledby="directory-categories-title">
    <div className="tags_directory_section_heading"><div><span>EXPLORAR</span><h2 id="directory-categories-title">{title}</h2></div><small>{categories.length} opciones</small></div>
    <div className="tags_directory_category_grid">
      {categories.map(category => <Link href={categoryHref(category.id)} scroll={false} className="tags_directory_category_card" key={category.id}>
        <div className="tags_directory_category_image">
          {category.image_url ? <Image src={directoryImageUrl(category.image_url, category.depth)} alt="" width={128} height={128} sizes="(max-width: 700px) 25vw, 128px" /> : <span>{category.name.charAt(0)}</span>}
        </div>
        <div><h3>{category.name}</h3><p>{Number(category.listing_count)} prestadores</p></div>
        <FaArrowRight aria-hidden="true" />
      </Link>)}
    </div>
  </section>;
}
