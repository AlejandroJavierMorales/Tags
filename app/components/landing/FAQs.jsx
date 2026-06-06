"use client";

import { useState } from "react";
import { FaChevronDown } from "react-icons/fa";

export default function FAQs({
    title = "Preguntas frecuentes",
    subtitle = "Respondemos las dudas más comunes sobre nuestros productos y servicios.",
    faqs = [],
}) {

    const [openIndex, setOpenIndex] = useState(null);

    const toggleFAQ = (index) => {
        setOpenIndex(openIndex === index ? null : index);
    };

    return (
        <section className="faq-section">

            <div className="container">

                {/* HEADER */}
                <div className="faq-header">

                    <span className="faq-badge">
                        FAQ
                    </span>

                    <h2 >
                        {title}
                    </h2>

                    <p>
                        {subtitle}
                    </p>

                </div>

                {/* FAQS */}
                <div className="faq-list">

                    {faqs.map((faq, index) => {

                        const isOpen = openIndex === index;

                        return (
                            <div
                                key={index}
                                className={`faq-item ${isOpen ? "active" : ""}`}
                            >

                                <button
                                    className="faq-question"
                                    onClick={() => toggleFAQ(index)}
                                    aria-expanded={isOpen}
                                >

                                    <div className="faq-question-left">

                                        <div className="faq-number">
                                            {String(index + 1).padStart(2, "0")}
                                        </div>

                                        <span>
                                            {faq.question}
                                        </span>

                                    </div>

                                    <FaChevronDown
                                        className={`faq-icon ${isOpen ? "rotate" : ""}`}
                                    />

                                </button>

                                <div
                                    className={`faq-answer-wrapper ${isOpen ? "open" : ""}`}
                                >

                                    <div className="faq-answer">
                                        {faq.answer}
                                    </div>

                                </div>

                            </div>
                        );
                    })}

                </div>

            </div>

            <style jsx>{`

                .faq-section{
                    padding: 110px 20px;
                    background: #f5f7f6;
                }

                .container{
                    max-width: 950px;
                    margin: 0 auto;
                }

                /* HEADER */

                .faq-header{
                    text-align: center;
                    margin-bottom: 60px;
                }

                .faq-badge{
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;

                    padding: 8px 18px;

                    border-radius: 999px;

                    background: rgba(0, 128, 96, 0.16);

                    border: 1px solid rgba(0, 128, 96, 0.28);

                    color: #22c79a;

                    font-size: 13px;
                    font-weight: 700;
                    letter-spacing: 1px;

                    margin-bottom: 18px;
                }

                .faq-header h2{
                    font-size: clamp(1.5rem, 5vw, 2rem);
                    line-height: 1.1;

                    font-weight: 800;

                    color: #202423;

                    margin-bottom: 18px;
                }

                .faq-header p{
                    max-width: 700px;
                    margin: 0 auto;

                    color: #5f6663;

                    font-size: 1.05rem;
                    line-height: 1.8;
                }

                /* LIST */

                .faq-list{
                    display: flex;
                    flex-direction: column;
                    gap: 18px;
                }

                .faq-item{
                    border-radius: 24px;

                    background: #ffffff;

                    border: 1px solid #dde4e1;

                    overflow: hidden;

                    transition:
                        transform .25s ease,
                        box-shadow .25s ease,
                        border-color .25s ease;
                }

                .faq-item:hover{
                    transform: translateY(-2px);

                    border-color: rgba(13,122,95,.25);

                    box-shadow:
                        0 12px 30px rgba(0,0,0,.05);
                }

                .faq-item.active{
                    border-color: rgba(13,122,95,.3);

                    box-shadow:
                        0 18px 40px rgba(0,0,0,.06);
                }

                /* QUESTION */

                .faq-question{
                    width: 100%;

                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 20px;

                    padding: 28px 30px;

                    background: transparent;
                    border: none;

                    cursor: pointer;

                    text-align: left;
                }

                .faq-question-left{
                    display: flex;
                    align-items: center;
                    gap: 18px;
                }

                .faq-number{
                    min-width: 48px;
                    min-height: 48px;

                    display: flex;
                    align-items: center;
                    justify-content: center;

                    border-radius: 14px;

                    background: #edf5f2;

                    color: #0d7a5f;

                    font-size: 14px;
                    font-weight: 800;
                }

                .faq-question span{
                    color: #202423;

                    font-size: 1.08rem;
                    font-weight: 700;

                    line-height: 1.5;
                }

                /* ICON */

                .faq-icon{
                    flex-shrink: 0;

                    color: #0d7a5f;

                    font-size: 18px;

                    transition:
                        transform .3s ease;
                }

                .faq-icon.rotate{
                    transform: rotate(180deg);
                }

                /* ANSWER */

                .faq-answer-wrapper{
                    display: grid;
                    grid-template-rows: 0fr;

                    transition:
                        grid-template-rows .35s ease;
                }

                .faq-answer-wrapper.open{
                    grid-template-rows: 1fr;
                }

                .faq-answer{
                    overflow: hidden;

                    padding: 0 30px;

                    color: #5f6663;

                    font-size: 1rem;
                    line-height: 1.9;

                    opacity: 0;

                    transition:
                        opacity .3s ease,
                        padding .3s ease;
                }

                .faq-answer-wrapper.open .faq-answer{
                    padding: 0 30px 30px 96px;
                    opacity: 1;
                }

                /* MOBILE */

                @media (max-width: 768px){

                    .faq-section{
                        padding: 90px 18px;
                    }

                    .faq-header{
                        margin-bottom: 45px;
                    }

                    .faq-question{
                        padding: 22px;
                    }

                    .faq-question-left{
                        gap: 14px;
                    }

                    .faq-number{
                        min-width: 42px;
                        min-height: 42px;

                        border-radius: 12px;
                    }

                    .faq-question span{
                        font-size: 1rem;
                    }

                    .faq-answer{
                        padding: 0 22px;
                    }

                    .faq-answer-wrapper.open .faq-answer{
                        padding: 0 22px 22px 78px;
                    }

                    .faq-header p{
                        font-size: 1rem;
                    }

                }

            `}</style>

        </section>
    );
}