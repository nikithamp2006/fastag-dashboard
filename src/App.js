import { useState, useEffect } from "react";
import Papa from "papaparse";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";

function App() {
  const [data, setData] = useState([]);
  const [source, setSource] = useState("");
  const [destination, setDestination] = useState("");
  const [result, setResult] = useState(null);
  // KPI calculations
  // Filter out any rows with missing or invalid data
  const cleanData = data.filter(row => row.Debit_Amount && !isNaN(row.Debit_Amount));

  const totalTransactions = cleanData.length;
  const totalRevenue = Math.round(cleanData.reduce((sum, row) => sum + row.Debit_Amount, 0));
  const avgToll = Math.round(totalRevenue / totalTransactions) || 0;
  const roundTripPct = Math.round((cleanData.filter(row => row.Round_Trip_Flag === "Yes").length / totalTransactions) * 100) || 0;
  

  useEffect(() => {
    Papa.parse("/fastag.csv", {
      download: true,
      header: true,
      dynamicTyping: true,
      complete: (result) => {
        setData(result.data);
      }
    });
  }, []);

  // Group data by hour and count transactions
  const byHour = Object.entries(
    data.reduce((acc, row) => {
      const hour = row.Hour;
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {})
  )
    .map(([hour, count]) => ({ hour: `${hour}:00`, count }))
    .sort((a, b) => parseInt(a.hour) - parseInt(b.hour));

  // Group data by month and sum the amounts
  const byMonth = Object.entries(
    data.reduce((acc, row) => {
      const month = row.Month_Year;
      acc[month] = (acc[month] || 0) + row.Debit_Amount;
      return acc;
    }, {})
  ).map(([month, total]) => ({ month, total: Math.round(total) }));
  // Count transactions per spend tier
const bySpendTier = Object.entries(
  data.reduce((acc, row) => {
    const tier = row.Spend_Tier;
    acc[tier] = (acc[tier] || 0) + 1;
    return acc;
  }, {})
).map(([tier, count]) => ({ tier, count }));

// Colors for each slice
const COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444"];
// Sum revenue per plaza, sort highest first, take top 10
const byPlaza = Object.entries(
  data.reduce((acc, row) => {
    const plaza = row.Plaza_Name;
    acc[plaza] = (acc[plaza] || 0) + row.Debit_Amount;
    return acc;
  }, {})
)
  .map(([plaza, total]) => ({ plaza, total: Math.round(total) }))
  .sort((a, b) => b.total - a.total)
  .slice(0, 10);
  // Build a lookup table: { PlazaName: averageTollAmount }
const avgByPlaza = {};
data.forEach(row => {
  if (!avgByPlaza[row.Plaza_Name]) avgByPlaza[row.Plaza_Name] = [];
  avgByPlaza[row.Plaza_Name].push(row.Debit_Amount);
});
const plazaNames = Object.keys(avgByPlaza).sort();
Object.keys(avgByPlaza).forEach(plaza => {
  const amounts = avgByPlaza[plaza];
  avgByPlaza[plaza] = Math.round(amounts.reduce((a, b) => a + b, 0) / amounts.length);
});
function calculate() {
  if (!source || !destination) return;
  const oneway = (avgByPlaza[source] || 0) + (avgByPlaza[destination] || 0);
  setResult({
    oneway: oneway,
    roundTrip: oneway * 2
  });
}
return (
  <div style={{ padding: "24px", background: "#f3f4f6", minHeight: "100vh" }}>
    <h1 style={{ marginBottom: "24px" }}>FASTag Dashboard</h1>

    {/* KPI Cards */}
    <div style={{ display: "flex", gap: "16px", marginBottom: "24px", flexWrap: "wrap" }}>
      {[
        { label: "Total Transactions", value: totalTransactions.toLocaleString(), color: "#6366f1" },
        { label: "Total Revenue", value: `₹${totalRevenue.toLocaleString()}`, color: "#22c55e" },
        { label: "Avg Toll Amount", value: `₹${avgToll}`, color: "#f59e0b" },
        { label: "Round Trips", value: `${roundTripPct}%`, color: "#ef4444" },
      ].map((kpi) => (
        <div key={kpi.label} style={{
          background: "white",
          padding: "20px",
          borderRadius: "12px",
          flex: 1,
          minWidth: "150px",
          borderTop: `4px solid ${kpi.color}`
        }}>
          <p style={{ margin: 0, color: "#666", fontSize: "14px" }}>{kpi.label}</p>
          <h2 style={{ margin: "8px 0 0 0", color: kpi.color }}>{kpi.value}</h2>
        </div>
      ))}
    </div>

    {/* 2 column grid for charts */}
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>

      {/* Chart 1 - Transactions by Hour */}
      <div style={{ background: "white", padding: "20px", borderRadius: "12px" }}>
        <h2>Transactions by Hour</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={byHour}>
            <XAxis dataKey="hour" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="count" fill="#6366f1" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Chart 2 - Monthly Revenue Trend */}
      <div style={{ background: "white", padding: "20px", borderRadius: "12px" }}>
        <h2>Monthly Revenue Trend</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={byMonth}>
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="total" stroke="#6366f1" strokeWidth={2} dot={true} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Chart 3 - Spend Tier */}
      <div style={{ background: "white", padding: "20px", borderRadius: "12px" }}>
        <h2>Transactions by Spend Tier</h2>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={bySpendTier}
              dataKey="count"
              nameKey="tier"
              cx="50%"
              cy="50%"
              outerRadius={100}
              label
            >
              {bySpendTier.map((entry, index) => (
                <Cell key={index} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Chart 4 - Top 10 Plazas */}
      <div style={{ background: "white", padding: "20px", borderRadius: "12px" }}>
        <h2>Top 10 Plazas by Revenue</h2>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={byPlaza} layout="vertical" margin={{ left: 150 }}>
            <XAxis type="number" />
            <YAxis type="category" dataKey="plaza" width={150} />
            <Tooltip />
            <Bar dataKey="total" fill="#22c55e" />
          </BarChart>
        </ResponsiveContainer>
      </div>

    </div>
    {/* End of grid */}

    {/* Round Trip Calculator - full width below grid */}
    <div style={{ background: "white", padding: "20px", borderRadius: "12px", marginTop: "24px" }}>
      <h2>Round Trip Calculator</h2>
      <p style={{ color: "#666" }}>Estimates based on average toll amounts from your data</p>

      <div style={{ display: "flex", gap: "16px", marginTop: "16px", flexWrap: "wrap" }}>
        <div>
          <label style={{ display: "block", marginBottom: "6px", fontWeight: "bold" }}>Source Plaza</label>
          <select
            value={source}
            onChange={e => setSource(e.target.value)}
            style={{ padding: "8px", borderRadius: "6px", border: "1px solid #ddd", minWidth: "200px" }}
          >
            <option value="">Select source...</option>
            {plazaNames.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>

        <div>
          <label style={{ display: "block", marginBottom: "6px", fontWeight: "bold" }}>Destination Plaza</label>
          <select
            value={destination}
            onChange={e => setDestination(e.target.value)}
            style={{ padding: "8px", borderRadius: "6px", border: "1px solid #ddd", minWidth: "200px" }}
          >
            <option value="">Select destination...</option>
            {plazaNames.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>

        <div style={{ display: "flex", alignItems: "flex-end" }}>
          <button
            onClick={calculate}
            style={{ padding: "8px 24px", background: "#6366f1", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}
          >
            Calculate
          </button>
        </div>
      </div>

      {result && (
        <div style={{ marginTop: "24px", display: "flex", gap: "16px" }}>
          <div style={{ background: "#f0f9ff", padding: "16px", borderRadius: "8px", flex: 1 }}>
            <p style={{ color: "#666", margin: 0 }}>One-way estimate</p>
            <h2 style={{ margin: "4px 0", color: "#6366f1" }}>₹{result.oneway}</h2>
          </div>
          <div style={{ background: "#f0fdf4", padding: "16px", borderRadius: "8px", flex: 1 }}>
            <p style={{ color: "#666", margin: 0 }}>Round trip estimate</p>
            <h2 style={{ margin: "4px 0", color: "#22c55e" }}>₹{result.roundTrip}</h2>
          </div>
        </div>
      )}
    </div>

  </div>
);
}

export default App;