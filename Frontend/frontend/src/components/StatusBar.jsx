export function StatusBar() {
  return (
    <div style={styles.bar}>
      🏥 City Hospital — Live Queue Management System
    </div>
  );
}

const styles = {
  bar: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    height: 60,
    background: "linear-gradient(90deg, #0f172a, #1e293b)",
    color: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 18,
    fontWeight: 600,
    letterSpacing: 1,
    zIndex: 1000,
  },
};
