export const WalkStatus = Object.freeze({
    Pending: 'pending',
    Accepted: 'walker_has_accepted',
    InProgress: 'walk_in_progress',
    Rate: 'rate_walk',
    Completed: 'walk_completed'
} as const);

export type WalkStatus =
    typeof WalkStatus[keyof typeof WalkStatus];