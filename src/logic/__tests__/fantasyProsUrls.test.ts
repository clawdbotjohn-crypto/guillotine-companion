import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { FANTASYPROS_ROS_URLS } = require('../../../api/ecr-rankings/urls.js') as {
  FANTASYPROS_ROS_URLS: Record<'ppr' | 'half' | 'standard', string>;
};

describe('FantasyPros ranking endpoints', () => {
  it('uses rest-of-season pages for every scoring format', () => {
    expect(FANTASYPROS_ROS_URLS).toEqual({
      ppr: 'https://www.fantasypros.com/nfl/rankings/ros-ppr-overall.php',
      half: 'https://www.fantasypros.com/nfl/rankings/ros-half-point-ppr-overall.php',
      standard: 'https://www.fantasypros.com/nfl/rankings/ros-overall.php',
    });
    expect(Object.values(FANTASYPROS_ROS_URLS)).toHaveLength(3);
    expect(Object.values(FANTASYPROS_ROS_URLS).every((url) => url.includes('/ros-'))).toBe(true);
  });
});
