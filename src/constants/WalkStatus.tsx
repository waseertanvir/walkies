export const WalkStatus = Object.freeze({
  Pending:   'pending',
  Accepted:  'walker_has_accepted',
  InProgress:'walk_in_progress',
  Completed: 'walk_completed',
  Rate:      'rate_walk',
} as const);

export type WalkStatus =
  typeof WalkStatus[keyof typeof WalkStatus];