import { directoryBenefitLabel } from "../../lib/directoryBenefitFormatting";
import "./DirectoryBenefitsBlock.css";

export default function DirectoryBenefitsBlock({ benefits = [], content = {}, styles = {} }) {
  if (!benefits.length) return null;
  return <div className="tags_directory_benefits_block" style={styles}>
    <header><span>{content.eyebrow || "BENEFICIOS"}</span><h2>{content.title || "Beneficios para vos"}</h2>{content.subtitle && <p>{content.subtitle}</p>}</header>
    <div className="tags_directory_benefits_grid">
      {benefits.map(item => <article key={item.id}>
        {item.image_url && <img src={item.image_url} alt="" loading="lazy" />}
        <div><strong>{item.name}</strong><b>{directoryBenefitLabel(item)}</b><small>Válido del {String(item.valid_from).slice(0, 10)} al {String(item.valid_until).slice(0, 10)}</small>{item.description && <p>{item.description}</p>}</div>
      </article>)}
    </div>
  </div>;
}
