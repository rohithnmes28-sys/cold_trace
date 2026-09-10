import {
    FaHome,
    FaChartBar,
    FaMapMarkedAlt,
    FaCog
} from "react-icons/fa";

import "./Sidebar.css";

function Sidebar() {

    return (

        <div className="sidebar">

            <div className="logo">

                ❄

                <h2>ColdTrace</h2>

            </div>

            <div className="menu">

                <div className="menu-item active">
                    <FaHome />
                    <span>Dashboard</span>
                </div>

                <div className="menu-item">
                    <FaChartBar />
                    <span>Analytics</span>
                </div>

                <div className="menu-item">
                    <FaMapMarkedAlt />
                    <span>Location</span>
                </div>

                <div className="menu-item">
                    <FaCog />
                    <span>Settings</span>
                </div>

            </div>

        </div>

    );

}

export default Sidebar;