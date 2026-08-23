"use client";

import {
    PieChart,
    Pie,
    Cell,
    Tooltip,
    ResponsiveContainer
} from "recharts";

const COLORS = ["#0d6efd", "#198754", "#ffc107", "#dc3545", "#6f42c1"];

export default function DeviceChart({ data = [] }) {

    const devices = Array.isArray(data) ? data : [];
    const sortedDevices = [...devices].sort((a, b) => Number(b.total || 0) - Number(a.total || 0));

    return (
        <div className="card p-3 mb-4">

            <h5>Dispositivos</h5>

            {/* ===================== CHART ===================== */}
            <ResponsiveContainer width="100%" height={300}>
                <PieChart>

                    <Pie
                        data={devices}
                        dataKey="total"
                        nameKey="device_type"
                        outerRadius={100}
                        label={({ name, value }) => `${name}: ${value}`}
                    >
                        {devices.map((_, i) => (
                            <Cell
                                key={i}
                                fill={COLORS[i % COLORS.length]}
                            />
                        ))}
                    </Pie>

                    <Tooltip />

                </PieChart>
            </ResponsiveContainer>

            {/* ===================== TABLE ===================== */}
            <div className="table-responsive mt-3">

                <table className="table table-sm">

                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Dispositivo</th>
                            <th>Clicks</th>
                            <th>%</th>
                        </tr>
                    </thead>

                    <tbody>
                        {sortedDevices
                            .map((d, i) => {

                                const totalAll = sortedDevices.reduce((acc, x) => acc + Number(x.total || 0), 0);
                                const percent = totalAll
                                    ? ((d.total / totalAll) * 100).toFixed(1)
                                    : 0;

                                return (
                                    <tr key={i}>
                                        <td>{i + 1}</td>
                                        <td>{d.device_type || "-"}</td>
                                        <td>{d.total}</td>
                                        <td>{percent}%</td>
                                    </tr>
                                );
                            })}
                    </tbody>

                </table>

            </div>

        </div>
    );
}
