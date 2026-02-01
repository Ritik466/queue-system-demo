export function ErrorAlert({ error, onDismiss }) {
  if (!error) return null;

  return (
    <div style={styles.container}>
      <p style={styles.text}>⚠️ {error}</p>
      {onDismiss && (
        <button style={styles.dismissBtn} onClick={onDismiss}>
          ✕
        </button>
      )}
    </div>
  );
}

const styles = {
  container: {
    background: "rgba(239, 68, 68, 0.2)",
    border: "1px solid #ef4444",
    color: "#fca5a5",
    borderRadius: 12,
    padding: "12px 16px",
    marginBottom: 20,
    fontSize: 14,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },

  text: {
    margin: 0,
    flex: 1,
  },

  dismissBtn: {
    background: "none",
    border: "none",
    color: "#fca5a5",
    cursor: "pointer",
    fontSize: 18,
    padding: "0 0 0 12px",
  },
};
