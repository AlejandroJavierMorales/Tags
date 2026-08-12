"use client";

import "../../styles/resto-public.css";
import "../../styles/resto-builder-blocks.css";

const DEFAULT_ITEMS = [
    { title: "Pedido desde la mesa", text: "Elegí y confirmá tu pedido." },
    { title: "Seguimiento", text: "Consultá el estado de preparación." },
    { title: "Atención", text: "Llamá al personal cuando lo necesites." }
];

export default function RestoTrustBarBlock({ content = {}, styles = {} }) {
    const items = Array.isArray(content.items) && content.items.length ? content.items : DEFAULT_ITEMS;
    const sectionStyle = {
        backgroundColor: styles?.backgroundColor || undefined,
        color: styles?.textColor || undefined,
        textAlign: styles?.alignment || undefined,
        padding: styles?.padding || undefined,
        marginTop: styles?.marginTop || undefined,
        marginBottom: styles?.marginBottom || undefined
    };
    return <section className="resto_trust_bar" style={sectionStyle}><div className="container"><div className="resto_trust_bar_grid">{items.map((item, index) => <article key={`${item.title || "item"}-${index}`}><strong>{item.title}</strong><p>{item.text}</p></article>)}</div></div></section>;
}
