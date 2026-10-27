/** @description Sample venue configuration — replace via admin tools in production. */

/**
 * @description Builds table seed rows for an area prefix.
 * @param {string} prefix - Table id prefix (e.g. R, O, RT).
 * @param {string} areaId - Dining area id.
 * @param {number} count - Number of tables to create.
 * @param {number[]} capacities - Capacity pattern cycled per table.
 * @returns {Array<{ id: string; areaId: string; capacity: number; label: string; active: boolean }>} Table configs.
 */
function buildTables(
  prefix: string,
  areaId: string,
  count: number,
  capacities: number[],
): Array<{ id: string; areaId: string; capacity: number; label: string; active: boolean }> {
  return Array.from({ length: count }, (_, index) => {
    const id = `${prefix}-${index + 1}`;
    return {
      id,
      areaId,
      capacity: capacities[index % capacities.length] ?? 4,
      label: id,
      active: true,
    };
  });
}

export const SEED_AREAS = [
  {
    id: 'restaurant',
    name: 'Restaurant (Indoor)',
    description: 'Traditional dining area',
    imageSrc: '/images/hero-cider-house-interior.jpg',
    imageAlt: 'Interior dining hall',
    tableCount: 16,
    capacityRange: '2 - 10 seats',
    active: true,
  },
  {
    id: 'open-space',
    name: 'Open Space',
    description: 'Outdoor seating with nature',
    imageSrc: '/images/hero-outdoor-terrace.jpg',
    imageAlt: 'Outdoor dining area',
    tableCount: 12,
    capacityRange: '2 - 8 seats',
    active: true,
  },
  {
    id: 'roof-terrace',
    name: 'Roof / Terrace',
    description: 'Open air with scenic views',
    imageSrc: '/images/banner-location-mountains.jpg',
    imageAlt: 'Terrace with valley views',
    tableCount: 10,
    capacityRange: '2 - 10 seats',
    active: true,
  },
] as const;

export const SEED_TABLES = [
  ...buildTables('R', 'restaurant', 16, [2, 4, 4, 6, 6, 8, 4, 4, 6, 8, 2, 4, 6, 8, 10, 4]),
  ...buildTables('O', 'open-space', 12, [2, 4, 4, 4, 6, 6, 2, 4, 6, 8, 4, 6]),
  ...buildTables('RT', 'roof-terrace', 10, [2, 4, 4, 6, 8, 2, 4, 6, 8, 10]),
];

export const SEED_SHIFTS = [
  {
    id: 'lunch-weekend',
    label: 'Lunch (Thu–Sun)',
    service: 'lunch' as const,
    startTime: '13:00',
    endTime: '16:00',
    lastBookingTime: '15:00',
    active: true,
  },
  {
    id: 'dinner-arranged',
    label: 'Dinner (by arrangement)',
    service: 'dinner' as const,
    startTime: '20:00',
    endTime: '23:30',
    lastBookingTime: '22:00',
    active: true,
  },
];
