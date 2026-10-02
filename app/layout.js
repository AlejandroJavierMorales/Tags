import "bootstrap/dist/css/bootstrap.min.css";
import "./styles/tags_global.css";
import "./components/ui/styles_ui.css"
import { Suspense } from "react";
import { headers } from "next/headers";
import { getChannelContextFromHost, getHeadersHost } from "@/app/lib/channelContext";
import PublicAudienceTracker from "@/app/modules/audience/components/PublicAudienceTracker";

import {
    Inter,
    Poppins,
    Montserrat,
    Raleway,
    Playfair_Display,
    Lora,
    Oswald,
    Bebas_Neue
} from "next/font/google";

const inter = Inter({
    subsets: ["latin"],
    variable: "--font-inter"
});

const poppins = Poppins({
    weight: ["400", "500", "600", "700", "800"],
    subsets: ["latin"],
    variable: "--font-poppins"
});

const montserrat = Montserrat({
    subsets: ["latin"],
    variable: "--font-montserrat"
});

const raleway = Raleway({
    subsets: ["latin"],
    variable: "--font-raleway"
});

const playfair = Playfair_Display({
    subsets: ["latin"],
    variable: "--font-playfair"
});

const lora = Lora({
    subsets: ["latin"],
    variable: "--font-lora"
});

const oswald = Oswald({
    subsets: ["latin"],
    variable: "--font-oswald"
});

const bebasNeue = Bebas_Neue({
    weight: ["400"],
    subsets: ["latin"],
    variable: "--font-bebas"
});

const defaultMetadata = {
    title: "Tags",
    description: "App de QR dinámicos",
    robots: {
        index: true,
        follow: true
    }
};

export async function generateMetadata() {
    try {
        const requestHeaders = await headers();
        const channel = await getChannelContextFromHost(getHeadersHost(requestHeaders));
        const directoryName = channel?.brandConfig?.displayName || channel?.name;
        if (directoryName && !channel?.isTags) {
            return {
                ...defaultMetadata,
                title: directoryName
            };
        }
    } catch {}
    return defaultMetadata;
}

export default function RootLayout({ children }) {

    return (
        <html lang="es">
            <body
                className={`
                    ${inter.variable}
                    ${poppins.variable}
                    ${montserrat.variable}
                    ${raleway.variable}
                    ${playfair.variable}
                    ${lora.variable}
                    ${oswald.variable}
                    ${bebasNeue.variable}
                `}
            >
                <div className="app_container">
                    {children}
                </div>
                <Suspense fallback={null}>
                    <PublicAudienceTracker />
                </Suspense>
            </body>
        </html>
    );
}
