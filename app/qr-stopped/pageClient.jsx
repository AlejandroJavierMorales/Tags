"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import Image from "next/image";

export const dynamic = "force-dynamic";



export default function QRStoppedPageClient({searchParams}) {


    const code = searchParams.code;

    const [message, setMessage] = useState(
        
    );

    // =========================
    // GET QR INFO
    // =========================

    useEffect(() => {

        async function load() {

            try {

                const res = await fetch(
                    `/api/qr/get-stop-message?code=${code}`
                );

                const data = await res.json();

                if (data?.stop_message) {
                    setMessage(data.stop_message);
                }

            } catch (err) {
                console.log(err);
            }
        }

        if (code) {
            load();
        }

    }, [code]);

    return (

        <div className="tags_container m-0 p-0">

            {/* HEADER */}
            <h1
                className="tags_text_normal text-center p-2"
                style={{
                    backgroundColor: "#0fd15a",
                    color: "#fff"
                }}
            >
                Tags - Sistema de Gestión y Reporting de Códigos QR
            </h1>

            {/* OVERLAY */}
            <div className="tags_stopped_overlay">

                <div className="tags_stopped_modal">

                    {/* LOGO */}
                    <div className="text-center mb-3">

                        <Image
                            src="/logo_tags_transparente.webp"
                            alt="Tags"
                            width={180}
                            height={120}
                            className="img-fluid"
                        />

                    </div>

                    {/* ICON */}
                    <div className="tags_stopped_icon">
                        ⛔
                    </div>

                    {/* TITLE */}
                    <h2 className="tags_title_super text-center mb-2">
                        QR Temporalmente No Operativo
                    </h2>

                    {/* MESSAGE */}
                    <p
                        className="tags_text_normal text-center"
                        style={{
                            opacity: .85,
                            fontSize: "18px",
                            lineHeight: "1.6"
                        }}
                    >
                        {message}
                    </p>

                    {/* SUB */}
                    <p
                        className="text-center mt-4"
                        style={{
                            fontSize: "14px",
                            opacity: .6
                        }}
                    >
                        Intentá nuevamente más tarde.
                    </p>

                </div>

            </div>

            <style jsx>{`

                .tags_stopped_overlay{
                    min-height: calc(100vh - 48px);

                    display: flex;
                    align-items: center;
                    justify-content: center;

                    padding: 20px;

                    background:
                        linear-gradient(
                            135deg,
                            #f4f4f4 0%,
                            #e8fff1 100%
                        );
                }

                .tags_stopped_modal{

                    width: 100%;
                    max-width: 560px;

                    background: #fff;

                    border-radius: 28px;

                    padding: 50px 40px;

                    box-shadow:
                        0 10px 40px rgba(0,0,0,.12);

                    border: 1px solid #dff5e7;

                    animation: fadeUp .35s ease;
                }

                .tags_stopped_icon{

                    width: 90px;
                    height: 90px;

                    margin: 0 auto 24px auto;

                    border-radius: 50%;

                    background: #ffeaea;

                    display: flex;
                    align-items: center;
                    justify-content: center;

                    font-size: 42px;
                }

                @keyframes fadeUp{

                    from{
                        opacity: 0;
                        transform: translateY(20px);
                    }

                    to{
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

            `}</style>

        </div>
    );
}