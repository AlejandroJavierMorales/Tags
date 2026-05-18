export default function HowItWorks() {
    return (
        <section className="tags_landing_how py-5">
            <div className="container text-center">

                <h5 className="tags_landing_how_subtitle">
                    ¿Cómo funcionan los QR de Tags? <span style={{ fontWeight: "700", color: "#ff8c42" }}>Super fácil!</span>
                </h5>

                <h2 className="tags_landing_how_title mb-5">
                    Recibís tu QR, lo Activás con tu Email y listo!
                </h2>

                <div className="row g-4">

                    {/* STEP 1 */}
                    <div className="col-md-4">
                        <div className="tags_landing_how_card">
                            <div className="tags_landing_how_number">1</div>

                            <h5>Seleccioná tu QR</h5>

                            <p>
                                Elegí el tipo de QR y definí el destino: Web, Instagram, WhatsApp, Google, personalizado...
                            </p>
                        </div>
                    </div>

                    {/* STEP 2 */}
                    <div className="col-md-4">
                        <div className="tags_landing_how_card">
                            <div className="tags_landing_how_number">2</div>

                            <h5>Activalo en segundos</h5>

                            <p>
                                Recibís tu QR y en el Primer Escaneo lo Activás! Es Dinámico y Reutilizable.
                            </p>
                        </div>
                    </div>

                    {/* STEP 3 */}
                    <div className="col-md-4">
                        <div className="tags_landing_how_card">
                            <div className="tags_landing_how_number">3</div>

                            <h5>Medí resultados</h5>

                            <p>
                                Visualizá escaneos, horarios, ubicación geográfica, disposiitivo... Todo en tiempo real.
                            </p>
                        </div>
                    </div>

                </div>
                <p className="tags_landing_how_cta tags_subtitle mt-4">
                    Probalo en vivo 👇
                </p>
                <a href="#demo" className="btn tags_btn_main btn-lg" style={{minWidth:"200px"}}>PROBAR DEMO</a>
            </div>
            
        </section>
    );
}