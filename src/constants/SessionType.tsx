export const SessionType = Object.freeze({
    Broadcast: 'broadcast',
    Scheduled: 'scheduled'
} as const);

export type SessionType =
    typeof SessionType[keyof typeof SessionType];