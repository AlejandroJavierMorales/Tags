"use client";

import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer
} from "recharts";

export default function QrsClicks({ data }) {

    // opcional: limitar para que no explote visualmente
    const chartData = data.slice(0, 50);

    return (
        <div className="card p-3 mb-4">
            <h5>Clicks por QR (Top 50)</h5>

            <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                    <XAxis
                        dataKey="code" // 👈 ahora sí existe
                        interval={0}
                        angle={-30}
                        textAnchor="end"
                        height={60}
                    />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="clicks" fill="#0d6efd" />
                </BarChart>
            </ResponsiveContainer>

            {/* TABLA REFERENCIA */}
            <table className="table table-sm mt-3">
                <thead>
                    <tr>
                        <th>QR</th>
                        <th>Label</th>
                        <th>Clicks</th>
                        <th>Únicos</th>
                    </tr>
                </thead>
                <tbody>
                    {data.map((q, i) => (
                        <tr key={i}>
                            <td>{q.code}</td>
                            <td>{q.label || "-"}</td>
                            <td>{q.clicks}</td>
                            <td>{q.uniques}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}