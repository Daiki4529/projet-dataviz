import React from "react";

const AttackDetailModal = ({ isOpen, onClose, record }) => {
  if (!isOpen || !record) return null;

  // Destructure record; use defaults for counts in case they are undefined
  const {
    sourceCountry,
    destinationCountry,
    total,
    attackTypeCounts = {},
    protocolCounts = {},
  } = record;

  // Ensure country names are valid (trimmed and non-empty)
  const displaySourceCountry =
    sourceCountry.trim() !== "" ? sourceCountry : "N/A";
  const displayDestinationCountry =
    destinationCountry.trim() !== "" ? destinationCountry : "N/A";

  // Helper to calculate percentage breakdowns
  const calculatePercentages = (counts) => {
    return Object.entries(counts).map(([type, count]) => ({
      type: type.trim() !== "" ? type : "N/A",
      percentage: ((count / total) * 100).toFixed(1),
    }));
  };

  const attackTypePercentages = calculatePercentages(attackTypeCounts);
  const protocolPercentages = calculatePercentages(protocolCounts);

  // Inline styles for the modal overlay and content
  const overlayStyle = {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  };

  const modalStyle = {
    background: "#fff",
    padding: "20px",
    borderRadius: "8px",
    width: "80%",
    maxWidth: "800px",
    color: "#333",
  };

  const columnStyle = {
    flex: 1,
    padding: "10px",
  };

  const containerStyle = {
    display: "flex",
    justifyContent: "space-between",
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} style={{ float: "right" }}>
          Close
        </button>
        <h2 style={{ textAlign: "center" }}>Attack Details</h2>
        <div style={containerStyle}>
          {/* Source country details */}
          <div style={columnStyle}>
            <h3>Source: {displaySourceCountry}</h3>
            <h4>Attack Types</h4>
            <ul>
              {attackTypePercentages.map((item) => (
                <li key={`source-attack-${item.type}`}>
                  {item.type}: {item.percentage}%
                </li>
              ))}
            </ul>
            <h4>Protocol Types</h4>
            <ul>
              {protocolPercentages.map((item) => (
                <li key={`source-protocol-${item.type}`}>
                  {item.type}: {item.percentage}%
                </li>
              ))}
            </ul>
          </div>
          {/* Destination country details */}
          <div style={columnStyle}>
            <h3>Destination: {displayDestinationCountry}</h3>
            <h4>Attack Types</h4>
            <ul>
              {attackTypePercentages.map((item) => (
                <li key={`dest-attack-${item.type}`}>
                  {item.type}: {item.percentage}%
                </li>
              ))}
            </ul>
            <h4>Protocol Types</h4>
            <ul>
              {protocolPercentages.map((item) => (
                <li key={`dest-protocol-${item.type}`}>
                  {item.type}: {item.percentage}%
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttackDetailModal;
