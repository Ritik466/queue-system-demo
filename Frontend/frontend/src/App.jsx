import { useEffect, useState } from "react";
import { getQueueStatus, joinQueue as joinQueueAPI } from "./api/queueApi";
import { socket } from "./socket/queueSocket";
import { StatusBar } from "./components/StatusBar";
import { NowServing } from "./components/NowServing";
import { YourToken } from "./components/YourToken";
import { QueueActions } from "./components/QueueActions";
import { ErrorAlert } from "./components/ErrorAlert";

export default function App() {
  // State
  const [status, setStatus] = useState(null);
  const [token, setToken] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // Initial load + Socket setup
  useEffect(() => {
    // Fetch initial status
    const fetchStatus = async () => {
      try {
        const data = await getQueueStatus();
        setStatus(data);
      } catch (err) {
        setError(err.message);
      }
    };

    fetchStatus();

    // Socket: Queue updates (source of truth for real-time data)
    socket.on("queue:update", (data) => {
      setStatus(data);
      setError(null);
    });

    // Socket: Connection errors
    socket.on("error", (err) => {
      setError("Connection error: " + err);
    });

    // Cleanup
    return () => {
      socket.off("queue:update");
      socket.off("error");
    };
  }, []);

  // Join queue action
  const handleJoinQueue = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await joinQueueAPI();
      // Optimistic update - set token immediately
      setToken(data.token);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <StatusBar />

      <div style={styles.page}>
        <div style={styles.container}>
          <h1 style={styles.title}>Patient Token System</h1>

          <ErrorAlert error={error} onDismiss={() => setError(null)} />

          <NowServing nowServing={status?.nowServing} />

          <YourToken token={token} nowServing={status?.nowServing} />

          <QueueActions
            onJoin={handleJoinQueue}
            loading={loading}
            waiting={status?.waiting}
            lastIssued={status?.lastIssued}
          />
        </div>
      </div>
    </>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #0f172a, #1e293b)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 60,
  },

  container: {
    background: "rgba(255,255,255,0.08)",
    borderRadius: 18,
    padding: "40px 30px",
    width: 380,
    textAlign: "center",
    boxShadow: "0 25px 60px rgba(0,0,0,0.4)",
    color: "white",
    backdropFilter: "blur(10px)",
  },

  title: {
    fontSize: 26,
    marginBottom: 25,
  },
};
