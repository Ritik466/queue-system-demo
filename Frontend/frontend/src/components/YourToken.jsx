export function YourToken({ token, nowServing }) {
  if (!token) return null;

  const position = nowServing ? Math.max(token - nowServing, 0) : "?";

  return (
    <div style={styles.container}>
      <p style={styles.label}>Your Token</p>
      <h2 style={styles.number}>{token}</h2>
      <p style={styles.position}>
        Position in Queue: <strong>{position}</strong>
      </p>
    </div>
  );
}

const styles = {
  container: {
    background: "rgba(255,255,255,0.1)",
    borderRadius: 14,
    padding: 20,
    marginBottom: 20,
  },

  label: {
    fontSize: 16,
    margin: "0 0 10px 0",
    opacity: 0.9,
  },

  number: {
    fontSize: 36,
    margin: "8px 0",
    color: "#38bdf8",
  },

  position: {
    fontSize: 14,
    opacity: 0.9,
    margin: 0,
  },
};
