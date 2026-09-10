import "./Navbar.css";

function Navbar() {
  return (
    <div className="navbar">

      <div className="navbar-left">

        <div className="logo">
          ❄️
        </div>

        <div className="title-text">
          <h1>ColdTrace Dashboard</h1>
          <p>Live Cold Chain Monitoring System</p>
        </div>

      </div>

      <div className="navbar-right">

        <div className="live-status">
          <span className="dot"></span>
          LIVE
        </div>

        <div className="date-time">
          {new Date().toLocaleString()}
        </div>

      </div>

    </div>
  );
}

export default Navbar;