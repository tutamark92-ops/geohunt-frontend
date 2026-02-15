/**
 * Game constants — badge definitions for the treasure hunt.
 * Badges are earned by completing specific achievements.
 */

/** Badge definitions — each badge has criteria checked in UserProgress.checkBadges() */
export const BADGES = [
  { id: 'explorer', name: 'Rookie Scout', icon: 'Compass', description: 'Acquired your first campus secret' },
  { id: 'scholar', name: 'High IQ', icon: 'GraduationCap', description: 'Unlocked all Academic landmarks' },
  { id: 'socialite', name: 'Social Star', icon: 'Star', description: 'Visited the Student Union' },
  { id: 'master', name: 'Elite Hunter', icon: 'Trophy', description: 'Completed the entire campus hunt' }
];
