"use client";

import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer
} from "recharts";

export default function CityChart({ data = [] }) {

    // 🔒 seguridad total
    const cities = Array.isArray(data) ? data : [];

    return (
        <div className="card p-3 mb-4">

            <h5>Clicks por ciudad</h5>

            {/* ===================== CHART ===================== */}
            <ResponsiveContainer width="100%" height={300}>
                <BarChart data={cities}>

                    <XAxis
                        dataKey="city"
                        interval={0}
                        angle={-30}
                        textAnchor="end"
                        height={80}
                    />

                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="total" fill="#198754" />

                </BarChart>
            </ResponsiveContainer>

            {/* ===================== TABLE (IMPORTANTE) ===================== */}
            <div className="table-responsive mt-3">

                <table className="table table-sm">

                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Ciudad</th>
                            <th>Clicks</th>
                        </tr>
                    </thead>

                    <tbody>
                        {[...(cities || [])]
                            .sort((a, b) => b.total - a.total)
                            .map((c, i) => (
                                <tr key={i}>
                                    <td>{i + 1}</td>
                                    <td>{c.city}</td>
                                    <td>{c.total}</td>
                                </tr>
                            ))}
                    </tbody>
                </table>

            </div>

        </div>
    );
}