import "./StatCard.css";

function StatCard({ title, value, icon }) {
  return (
    <div className="stat-card">
      <div className="stat-icon">{icon}</div>

      <h3>{title}</h3>

      <h1>{value}</h1>
    </div>
  );
}

export default StatCard;