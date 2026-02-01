export function NowServing({ nowServing }) {
  return (
    <div style={styles.container}>
      <p style={styles.label}>Now Serving</p>
      <h2 style={styles.number}>
        {nowServing !== null && nowServing !== undefined ? nowServing : "--"}
      </h2>
    </div>
  );
}

const styles = {
  container: {
    background: "linear-gradient(135deg, #22c55e, #16a34a)",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    color: "#022c22",
    boxShadow: "0 10px 30px rgba(34,197,94,0.4)",
  },

  label: {
    fontSize: 18,
    margin: "0 0 10px 0",
  },

  number: {
    fontSize: 56,
    margin: 0,
    fontWeight: 800,
  },
};
