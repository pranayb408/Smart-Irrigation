import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function MoistureChart({ data = [] }) {
  const chartData = data.length ? data : [];
  return <div className="chart-wrap">
    {chartData.length === 0 ? <div className="empty-state">Sensor data will appear here when readings are recorded.</div> :
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 12, right: 10, left: -18, bottom: 0 }}>
          <defs><linearGradient id="moistureFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#41aa7b" stopOpacity={0.2} /><stop offset="95%" stopColor="#41aa7b" stopOpacity={0.01} /></linearGradient></defs>
          <CartesianGrid stroke="#edf1eb" strokeDasharray="3 5" vertical={false} />
          <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#8b958e', fontSize: 11 }} dy={8} />
          <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: '#8b958e', fontSize: 11 }} tickFormatter={(value) => `${value}%`} />
          <Tooltip contentStyle={{ border: '1px solid #edf1eb', borderRadius: 12, boxShadow: '0 8px 24px #173f3510' }} formatter={(value) => [`${value}%`, 'Soil moisture']} />
          <Area type="monotone" dataKey="moisture" stroke="#25845a" strokeWidth={2.5} fill="url(#moistureFill)" activeDot={{ r: 5, strokeWidth: 0 }} />
        </AreaChart>
      </ResponsiveContainer>}
  </div>;
}
