import React, { useEffect, useState } from 'react';
import CyberAttackMap from './CyberAttackMap';
import * as d3 from 'd3';

function App() {
  const [data, setData] = useState([]);

  useEffect(() => {
    d3.csv('./src/Cyberattacks Detection.csv').then(csvData => {
      setData(csvData);
    });
  }, []);

  return (
    <div className="App">
      <h1>Cyber Attack Flux Map</h1>
      <div className="main-content">
        <div className="map-container">
          <CyberAttackMap data={data} />
        </div>
        <div className="sidebar">
          {/* Place filter components here if not already in CyberAttackMap */}
          {/* If filters are part of CyberAttackMap, they can be styled with the .sidebar class */}
        </div>
      </div>
    </div>
  );
}

export default App;
