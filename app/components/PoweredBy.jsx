
import Image from "next/image"

export default function PoweredBy() {
    return (
        <section className="text-center mt-4">
            <a href={'https://www.calamuchita.ar'} target="_blank" rel="noopener noreferrer">

                <span style={{color:'#f8f9fa'}} className="d-block small ">
                    Tags es un producto de
                </span>

                <div style={{ width: "160px", margin: "0 auto" }}>
                    <Image
                    className="p-1"
                        src="/assets/images/tags/logoCalamuchitar.webp"
                        alt="CalamuchitAr la Plataforma Comercial"
                        width={1136}
                        height={148}
                        style={{ width: "100%", height: "auto", backgroundColor:"#f7f4f4", borderRadius:"5px" }}
                        priority
                    />
                </div>

            </a>
        </section>
    )
}
