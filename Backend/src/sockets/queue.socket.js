let io = null;

export function initSocket(server) {
    io = server;
    io.on("connection", (socket) => {
        console.log("Client connected:", socket.id);

        socket.on("disconnect", () => {
            console.log("Client disconnected:", socket.id);
        });
    });
}

export function emitQueueUpdate(data) {
    if (!io) throw new Error("Socket not initialized");
    io.emit("queue:update", data);
}
