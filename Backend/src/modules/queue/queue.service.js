import * as repo from "./queue.repository.js";
import { emitQueueUpdate } from "../../sockets/queue.socket.js";

export async function getQueueStatus() {
    const session = await repo.getSession();
    const waiting = await repo.getWaitingCount();

    return {
        nowServing: session.current_serving,
        lastIssued: session.current_token,
        waiting,
    };
}

export async function joinQueue() {
    const token = await repo.joinQueue();
    emitQueueUpdate(await getQueueStatus());
    return token;
}

export async function serveNext() {
    const session = await repo.getSession();
    const currentServing = session.current_serving;
    const next = currentServing + 1;

    await repo.markTokenDone(currentServing);
    await repo.updateServing(next);

    emitQueueUpdate(await getQueueStatus());
    return next;
}
