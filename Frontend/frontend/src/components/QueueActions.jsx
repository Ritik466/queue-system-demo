export function QueueActions({ onJoin, loading, waiting, lastIssued }) {
  return (
    <div style={styles.container}>
      <button style={styles.button} onClick={onJoin} disabled={loading}>
        {loading ? "Processing..." : "Take Token"}
      </button>

      <div style={styles.stats}>
        <div style={styles.stat}>
          <p style={styles.statLabel}>Last Issued</p>
          <p style={styles.statValue}>{lastIssued ?? "--"}</p>
        </div>
        <div style={styles.stat}>
          <p style={styles.statLabel}>Waiting</p>
          <p style={styles.statValue}>{waiting ?? "--"}</p>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    width: "100%",
  },

  button: {
    width: "100%",
    padding: "14px 0",
    borderRadius: 12,
    border: "none",
    fontSize: 16,
    fontWeight: 600,
    background: "#3b82f6",
    color: "white",
    cursor: "pointer",
    marginBottom: 20,
    boxShadow: "0 10px 25px rgba(59,130,246,0.4)",
    transition: "all 0.3s ease",
  },

  stats: {
    display: "flex",
    justifyContent: "space-between",
    gap: 10,
  },

  stat: {
    flex: 1,
    background: "rgba(255,255,255,0.08)",
    borderRadius: 12,
    padding: 14,
  },

  statLabel: {
    fontSize: 12,
    opacity: 0.7,
    margin: "0 0 6px 0",
  },

  statValue: {
    fontSize: 20,
    fontWeight: 600,
    margin: 0,
  },
};
