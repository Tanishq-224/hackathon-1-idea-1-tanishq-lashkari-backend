/** @description Sample venue configuration — replace via admin tools in production. */

export const SEED_AREAS = [
  {
    id: 'restaurant',
    name: 'Restaurant (Indoor)',
    description: 'Traditional dining area',
    imageSrc: '/images/hero-cider-house-interior.jpg',
    imageAlt: 'Interior dining hall',
    tableCount: 12,
    capacityRange: '2 - 8 seats',
    active: true,
  },
  {
    id: 'open-space',
    name: 'Open Space',
    description: 'Outdoor seating with nature',
    imageSrc: '/images/hero-outdoor-terrace.jpg',
    imageAlt: 'Outdoor dining area',
    tableCount: 8,
    capacityRange: '2 - 6 seats',
    active: true,
  },
  {
    id: 'roof-terrace',
    name: 'Roof / Terrace',
    description: 'Open air with scenic views',
    imageSrc: '/images/banner-location-mountains.jpg',
    imageAlt: 'Terrace with valley views',
    tableCount: 5,
    capacityRange: '2 - 8 seats',
    active: true,
  },
] as const;

export const SEED_TABLES = [
  { id: 'R-1', areaId: 'restaurant', capacity: 2, label: 'R-1', active: true },
  { id: 'R-2', areaId: 'restaurant', capacity: 4, label: 'R-2', active: true },
  { id: 'R-3', areaId: 'restaurant', capacity: 4, label: 'R-3', active: true },
  { id: 'R-4', areaId: 'restaurant', capacity: 6, label: 'R-4', active: true },
  { id: 'R-5', areaId: 'restaurant', capacity: 6, label: 'R-5', active: true },
  { id: 'R-6', areaId: 'restaurant', capacity: 8, label: 'R-6', active: true },
  { id: 'O-1', areaId: 'open-space', capacity: 2, label: 'O-1', active: true },
  { id: 'O-2', areaId: 'open-space', capacity: 4, label: 'O-2', active: true },
  { id: 'O-3', areaId: 'open-space', capacity: 4, label: 'O-3', active: true },
  { id: 'RT-1', areaId: 'roof-terrace', capacity: 2, label: 'RT-1', active: true },
  { id: 'RT-2', areaId: 'roof-terrace', capacity: 4, label: 'RT-2', active: true },
] as const;

export const SEED_SHIFTS = [
  {
    id: 'lunch-weekend',
    label: 'Lunch (Thu–Sun)',
    service: 'lunch' as const,
    startTime: '13:00',
    endTime: '16:00',
    lastBookingTime: '14:30',
    active: true,
  },
  {
    id: 'dinner-arranged',
    label: 'Dinner (by arrangement)',
    service: 'dinner' as const,
    startTime: '20:00',
    endTime: '23:30',
    lastBookingTime: '21:00',
    active: true,
  },
];
