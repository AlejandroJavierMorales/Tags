import { FaChevronDown } from "react-icons/fa6";
import "./DirectorySectionGroup.css";

export default function DirectorySectionGroup({ group, items = [] }) {
  if (!group || !items.length) return null;
  const accordion = group.layout === "accordion";

  return <div className={`tags_directory_section_group is_${accordion ? "accordion" : "cards"}`}>
    <header className={group.imageUrl ? "has_image" : ""}>
      <div>{group.eyebrow && <span>{group.eyebrow}</span>}<h2>{group.title}</h2>{group.description && <p>{group.description}</p>}</div>
      {group.imageUrl && <img src={group.imageUrl} alt={group.imageAlt || group.title} loading="lazy" />}
    </header>
    {accordion
      ? <div className="tags_directory_section_group_accordion">{items.map((item, index) => <details key={item.id} open={index === 0}><summary><span>{item.title}</span><FaChevronDown /></summary><div>{item.content}</div></details>)}</div>
      : <div className="tags_directory_section_group_cards">{items.map(item => <article key={item.id}>{item.content}</article>)}</div>}
  </div>;
}
