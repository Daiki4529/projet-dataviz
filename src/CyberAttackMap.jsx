import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import AttackDetailModal from './AttackDetailModal';
import countriesJson from './countries.json';

// Utility to get cached country centroids
function getCountryCentroid(countryName, countries) {
  if (!countries) return null;
  const country = countries.find(
    (item) =>
      item.name.toLowerCase() === countryName.toLowerCase() ||
      item.code.toUpperCase() === countryName.toUpperCase()
  );
  return country ? { lat: country.latitude, lng: country.longitude } : null;
}

function CyberAttackMap({ data }) {
  const svgRef = useRef();

  // Filtered/aggregated data
  const [filteredData, setFilteredData] = useState([]);

  // World geometry and country centroid data
  const [worldData, setWorldData] = useState(null);
  const [countries, setCountries] = useState(null);

  // Unique values for the dropdowns
  const [uniqueSourceCountries, setUniqueSourceCountries] = useState([]);
  const [uniqueDestinationCountries, setUniqueDestinationCountries] = useState([]);
  const [uniqueProtocols, setUniqueProtocols] = useState([]);
  const [uniqueAttackTypes, setUniqueAttackTypes] = useState([]);

  // Filters state
  const [filters, setFilters] = useState({
    sourceCountry: '',
    destinationCountry: '',
    protocol: '',
    attackType: ''
  });

  // Modal state for arrow click details
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fixed sidebar width
  const sidebarWidth = 300;

  // Load countries data once
  useEffect(() => {
    setCountries(countriesJson);
  }, []);

  // Load world GeoJSON
  useEffect(() => {
    d3.json(
      'https://raw.githubusercontent.com/ben-tiki/d3-globe/refs/heads/main/data/globeCoordinates.json'
    )
      .then(setWorldData)
      .catch((error) => console.error('Error loading GeoJSON:', error));
  }, []);

  // Gather unique values for dropdowns from the CSV data
  useEffect(() => {
    if (!data || data.length === 0) return;

    const unique = (arr) => Array.from(new Set(arr.filter(Boolean))).sort();

    setUniqueSourceCountries(unique(data.map((d) => d['Source Country'])));
    setUniqueDestinationCountries(unique(data.map((d) => d['Destination Country'])));
    setUniqueProtocols(unique(data.map((d) => d['Protocol'])));
    setUniqueAttackTypes(unique(data.map((d) => d['Attack Type'])));
  }, [data]);

  // Filter & aggregate the CSV data
  useEffect(() => {
    if (!data || data.length === 0) return;

    const filtered = data.filter((d) => {
      const source = d['Source Country'];
      const destination = d['Destination Country'];
      const protocol = d['Protocol'];
      const attackType = d['Attack Type'];

      if (!source || !destination) return false;
      if (filters.sourceCountry && source !== filters.sourceCountry) return false;
      if (filters.destinationCountry && destination !== filters.destinationCountry) return false;
      if (filters.protocol && protocol !== filters.protocol) return false;
      if (filters.attackType && attackType !== filters.attackType) return false;
      return true;
    });

    // Aggregate by source/destination
    const aggregatedMap = d3.rollup(
      filtered,
      (leaves) => {
        const total = leaves.length;
        const attackTypeCounts = {};
        const protocolCounts = {};
        leaves.forEach((row) => {
          attackTypeCounts[row['Attack Type']] =
            (attackTypeCounts[row['Attack Type']] || 0) + 1;
          protocolCounts[row['Protocol']] =
            (protocolCounts[row['Protocol']] || 0) + 1;
        });
        return { total, attackTypeCounts, protocolCounts };
      },
      (d) => d['Source Country'],
      (d) => d['Destination Country']
    );

    const aggregated = [];
    for (const [sourceCountry, destMap] of aggregatedMap.entries()) {
      for (const [destinationCountry, info] of destMap.entries()) {
        aggregated.push({
          sourceCountry,
          destinationCountry,
          ...info
        });
      }
    }
    setFilteredData(aggregated);
  }, [data, filters]);

  // Function to render arrows, used both on initial render and after drag updates
  const renderArrows = (svg, projection, colorScale) => {
    filteredData.forEach((record) => {
      const { sourceCountry, destinationCountry, total } = record;
      const sourceCoord = getCountryCentroid(sourceCountry, countries);
      const destinationCoord = getCountryCentroid(destinationCountry, countries);
      if (!sourceCoord || !destinationCoord) return;

      const sourceProj = projection([sourceCoord.lng, sourceCoord.lat]);
      const destinationProj = projection([destinationCoord.lng, destinationCoord.lat]);

      // Slight curve midpoint
      const midPoint = [
        (sourceProj[0] + destinationProj[0]) / 2,
        (sourceProj[1] + destinationProj[1]) / 2 - 30
      ];
      const lineGenerator = d3.line().curve(d3.curveBasis);
      const arrowPath = lineGenerator([sourceProj, midPoint, destinationProj]);

      svg
        .append('path')
        .attr('d', arrowPath)
        .attr('stroke', colorScale(total))
        .attr('stroke-width', 2)
        .attr('fill', 'none')
        .style('cursor', 'pointer')
        .on('click', (event) => {
          event.stopPropagation(); // Prevent drag or other events from firing
          setSelectedRecord(record);
          setIsModalOpen(true);
        });
    });
  };

  // Render the globe, land, and arcs
  useEffect(() => {
    if (!worldData || !countries) return;

    // Map container dimensions (width = viewport minus sidebar, full viewport height)
    const width = window.innerWidth - sidebarWidth;
    const height = window.innerHeight;

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height);

    // Set the globe scale smaller by multiplying by 0.8
    const globeScale = (Math.min(width, height) / 2 - 20) * 0.8;

    // Orthographic projection for a globe with reduced scale
    const projection = d3
      .geoOrthographic()
      .scale(globeScale)
      .translate([width / 2, height / 2])
      .clipAngle(90);

    const pathGenerator = d3.geoPath().projection(projection);

    // Color scale for arcs (based on "total" requests)
    const minTotal = d3.min(filteredData, (d) => d.total) || 0;
    const maxTotal = d3.max(filteredData, (d) => d.total) || 1;
    const colorScale = d3
      .scaleLinear()
      .domain([minTotal, maxTotal])
      .range(['#00ff00', '#ff0000']); // green -> red

    // Clear existing elements
    svg.selectAll('*').remove();

    // BACKGROUND — dark star-like color
    svg
      .append('rect')
      .attr('width', width)
      .attr('height', height)
      .attr('fill', '#0d1b2a');

    // Define a radial gradient for a glow effect around Earth
    const defs = svg.append('defs');
    const glow = defs
      .append('radialGradient')
      .attr('id', 'earthGlow')
      .attr('cx', '50%')
      .attr('cy', '50%')
      .attr('r', '70%');
    glow
      .append('stop')
      .attr('offset', '0%')
      .attr('stop-color', '#fff')
      .attr('stop-opacity', 0.4);
    glow
      .append('stop')
      .attr('offset', '80%')
      .attr('stop-color', '#fff')
      .attr('stop-opacity', 0);

    // EARTH GLOW (using reduced scale)
    svg
      .append('circle')
      .attr('cx', width / 2)
      .attr('cy', height / 2)
      .attr('r', globeScale * 1.1)
      .style('fill', 'url(#earthGlow)');

    // OCEAN — light blue, drawn with globe scale
    svg
      .append('circle')
      .attr('cx', width / 2)
      .attr('cy', height / 2)
      .attr('r', globeScale)
      .attr('fill', '#87CEFA');

    // LAND — pale color
    svg
      .append('g')
      .selectAll('path')
      .data(worldData.features)
      .enter()
      .append('path')
      .attr('d', pathGenerator)
      .attr('fill', '#f2efe9')
      .attr('stroke', '#aaa')
      .attr('stroke-width', 0.5);

    // Render arrows with click events
    renderArrows(svg, projection, colorScale);

    // DRAG to rotate the globe
    svg.call(
      d3.drag().on('drag', (event) => {
        const currentRotate = projection.rotate();
        const sensitivity = 0.25;
        const newRotate = [
          currentRotate[0] + event.dx * sensitivity,
          currentRotate[1] - event.dy * sensitivity
        ];
        projection.rotate(newRotate);

        // Redraw everything after rotation
        svg.selectAll('*').remove();

        // Redraw background and all elements using the updated projection
        svg
          .append('rect')
          .attr('width', width)
          .attr('height', height)
          .attr('fill', '#0d1b2a');

        const defs2 = svg.append('defs');
        const glow2 = defs2
          .append('radialGradient')
          .attr('id', 'earthGlow2')
          .attr('cx', '50%')
          .attr('cy', '50%')
          .attr('r', '70%');
        glow2
          .append('stop')
          .attr('offset', '0%')
          .attr('stop-color', '#fff')
          .attr('stop-opacity', 0.4);
        glow2
          .append('stop')
          .attr('offset', '80%')
          .attr('stop-color', '#fff')
          .attr('stop-opacity', 0);

        svg
          .append('circle')
          .attr('cx', width / 2)
          .attr('cy', height / 2)
          .attr('r', globeScale * 1.1)
          .style('fill', 'url(#earthGlow2)');

        svg
          .append('circle')
          .attr('cx', width / 2)
          .attr('cy', height / 2)
          .attr('r', globeScale)
          .attr('fill', '#87CEFA');

        svg
          .append('g')
          .selectAll('path')
          .data(worldData.features)
          .enter()
          .append('path')
          .attr('d', pathGenerator)
          .attr('fill', '#f2efe9')
          .attr('stroke', '#aaa')
          .attr('stroke-width', 0.5);

        // Render arrows again after rotation
        renderArrows(svg, projection, colorScale);
      })
    );
  }, [filteredData, worldData, countries, sidebarWidth]);

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh' }}>
      {/* Map Container */}
      <div style={{ flex: 1, position: 'relative' }}>
        <svg ref={svgRef} style={{ display: 'block' }} />
      </div>
      {/* Sidebar Filters */}
      <div
        style={{
          width: `${sidebarWidth}px`,
          background: 'rgba(255,255,255,0.8)',
          padding: '10px',
          overflowY: 'auto'
        }}
      >
        <h3 style={{ textAlign: 'center', marginBottom: '20px', color: '#000' }}>Filters</h3>
        <label style={{ display: 'block', marginBottom: '15px', color: '#000' }}>
          Source Country:
          <select
            style={{ width: '100%', padding: '5px', marginTop: '5px' }}
            value={filters.sourceCountry}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, sourceCountry: e.target.value }))
            }
          >
            <option value="">All</option>
            {uniqueSourceCountries.map((country) => (
              <option key={country} value={country}>
                {country}
              </option>
            ))}
          </select>
        </label>
        <label style={{ display: 'block', marginBottom: '15px', color: '#000' }}>
          Destination Country:
          <select
            style={{ width: '100%', padding: '5px', marginTop: '5px' }}
            value={filters.destinationCountry}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, destinationCountry: e.target.value }))
            }
          >
            <option value="">All</option>
            {uniqueDestinationCountries.map((country) => (
              <option key={country} value={country}>
                {country}
              </option>
            ))}
          </select>
        </label>
        <label style={{ display: 'block', marginBottom: '15px', color: '#000' }}>
          Protocol:
          <select
            style={{ width: '100%', padding: '5px', marginTop: '5px' }}
            value={filters.protocol}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, protocol: e.target.value }))
            }
          >
            <option value="">All</option>
            {uniqueProtocols.map((proto) => (
              <option key={proto} value={proto}>
                {proto}
              </option>
            ))}
          </select>
        </label>
        <label style={{ display: 'block', marginBottom: '15px', color: '#000' }}>
          Attack Type:
          <select
            style={{ width: '100%', padding: '5px', marginTop: '5px' }}
            value={filters.attackType}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, attackType: e.target.value }))
            }
          >
            <option value="">All</option>
            {uniqueAttackTypes.map((attack) => (
              <option key={attack} value={attack}>
                {attack}
              </option>
            ))}
          </select>
        </label>
      </div>
      {/* Attack Details Modal */}
      <AttackDetailModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        record={selectedRecord} 
      />
    </div>
  );
}

export default CyberAttackMap;
