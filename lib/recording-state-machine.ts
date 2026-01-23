import { RecordingState } from "./types";

type StateCallback = (state: RecordingState) => void;

export class RecordingStateMachine {
    private _state: RecordingState = "idle";
    private listeners: Set<StateCallback> = new Set();

    constructor(initialState: RecordingState = "idle") {
        this._state = initialState;
    }

    get state(): RecordingState {
        return this._state;
    }

    /**
     * Validates and executes a state transition.
     * Enforces strict one-way flow:
     * idle -> initializing -> recording -> stopping -> completed
     * Any state -> error
     */
    transition(to: RecordingState): boolean {
        const from = this._state;

        // Ignore identical transitions
        if (from === to) return true;

        // Error can happen from any state
        if (to === "error") {
            this._commit(to);
            return true;
        }

        // Reset flow: completed/error -> idle
        if ((from === "completed" || from === "error") && to === "idle") {
            this._commit(to);
            return true;
        }

        let isValid = false;

        switch (from) {
            case "idle":
                isValid = to === "initializing";
                break;
            case "initializing":
                isValid = to === "recording" || to === "idle"; // Allow cancel during init
                break;
            case "recording":
                isValid = to === "stopping";
                break;
            case "stopping":
                isValid = to === "completed";
                break;
            case "completed":
                // Already handled reset above
                isValid = false;
                break;
        }

        if (isValid) {
            this._commit(to);
            return true;
        } else {
            console.warn(`Invalid state transition: ${from} -> ${to}`);
            return false;
        }
    }

    private _commit(newState: RecordingState) {
        this._state = newState;
        this.notify();
    }

    subscribe(callback: StateCallback): () => void {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }

    private notify() {
        this.listeners.forEach((cb) => cb(this._state));
    }
}
