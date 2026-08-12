import Link from "next/link";
import Image from "next/image";
import "./DirectoryTourismShortcuts.css";

const SHORTCUTS = [
  { title: "Dónde alojarse", text: "Cabañas, hoteles, posadas y campings", image: "donde_dormir.webp", href: "/alojamientos" },
  { title: "Dónde comer", text: "Restaurantes, bares y sabores regionales", image: "donde_comer.webp", href: "/donde-comer" },
  { title: "Qué hacer", text: "Excursiones, actividades y experiencias", image: "que_hacer_1.webp", href: "/actividades-turisticas" },
  { title: "Qué regalar", text: "Artesanías y productos de Calamuchita", image: "que_regalar.webp", href: "/regalos-artesanias-regionales" },
];

export default function DirectoryTourismShortcuts() {
  return <section className="tags_directory_tourism" aria-labelledby="directory-tourism-title">
    <div><span>VIVÍ CALAMUCHITA</span><h2 id="directory-tourism-title">¿Estás haciendo turismo?</h2><p>Accedé rápidamente a todo lo que la región tiene para ofrecerte.</p></div>
    <div className="tags_directory_tourism_grid">{SHORTCUTS.map(item => <Link href={item.href} scroll={false} key={item.title}><Image src={`/directory/calamuchitar/touristing-buttons/${item.image}`} alt="" width={64} height={64} sizes="64px" /><div><h3>{item.title}</h3><p>{item.text}</p></div></Link>)}</div>
  </section>;
}
