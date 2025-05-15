export interface Response<T> {
    data: T;
    message: string;
    success: boolean;
}
// Interfaces
export interface ChatMessage {
    type: 'message' | 'system' | 'error' | 'status';
    text?: string;
    message?: string;
    sender?: string;
    status_code: number;
}

export interface ExtendedWebSocket extends WebSocket {
    _socket: {
        remoteAddress: string;
    };
}