"use client";

import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer
} from "recharts";

export default function TimelineChart({ data }) {
    return (
        <div className="card p-3 mb-4">
            <h5>Clicks diarios</h5>

            <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data}>
                    <XAxis
                        dataKey="date"
                        interval="preserveStartEnd"
                        minTickGap={20}
                        tickFormatter={(v) => new Date(v).toLocaleDateString("es-AR", {
                            day: "2-digit",
                            month: "2-digit"
                        })}
                    />
                    <YAxis />
                    <Tooltip />
                    <Line
                        type="monotone"
                        dataKey="clicks"
                        stroke="#0d6efd"
                        strokeWidth={2}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}