// ============================================================
// Central Hostel Data Store + localStorage Persistence
// ============================================================

export const ALLOCATION_KEY = 'hostel_allocation_v1';
export const LOCKED_ROOMS_KEY = 'locked_rooms_v1';
export const LOCKED_REGS_KEY = 'locked_registrations_v1';

// ── Gender-segregated hostels ──────────────────────────────
export const HOSTELS_BY_GENDER = {
  male: [
    { id: 'block-a', name: 'Block A', description: 'North Campus · AC Rooms Available', badge: 'BOYS' },
    { id: 'block-b', name: 'Block B', description: 'Central Campus · Budget Friendly', badge: 'BOYS' },
  ],
  female: [
    { id: 'block-c', name: 'Block C', description: 'South Campus · AC Rooms Available', badge: 'GIRLS' },
    { id: 'block-d', name: 'Block D', description: 'East Campus · Premium Wing', badge: 'GIRLS' },
  ],
};

// ── Room type labels ───────────────────────────────────────
export const ROOM_TYPES = [
  { beds: 1, label: 'Single', sublabel: '1 Bed' },
  { beds: 2, label: 'Double', sublabel: '2 Beds' },
  { beds: 4, label: 'Quad',   sublabel: '4 Beds' },
  { beds: 6, label: 'Dorm',   sublabel: '6 Beds' },
];

// ── Room data per hostel ───────────────────────────────────
const makeRooms = (prefix, wing) => ({
  1: [
    { id: `${prefix}-101`, type: 'Deluxe Single', wing, floor: 1, amenities: ['WiFi', 'AC'], capacity: 1, occupants: 0, status: 'available' },
    { id: `${prefix}-102`, type: 'Standard Single', wing, floor: 1, amenities: ['WiFi'], capacity: 1, occupants: 0, status: 'available' },
    { id: `${prefix}-103`, type: 'Standard Single', wing, floor: 1, amenities: ['WiFi'], capacity: 1, occupants: 1, status: 'occupied' },
    { id: `${prefix}-104`, type: 'Deluxe Single', wing, floor: 1, amenities: ['WiFi', 'AC'], capacity: 1, occupants: 0, status: 'available' },
    { id: `${prefix}-105`, type: 'Premium Single', wing, floor: 1, amenities: ['WiFi', 'AC', 'Balcony'], capacity: 1, occupants: 1, status: 'occupied' },
    { id: `${prefix}-106`, type: 'Standard Single', wing, floor: 1, amenities: ['WiFi'], capacity: 1, occupants: 0, status: 'available' },
  ],
  2: [
    { id: `${prefix}-201`, type: 'Standard Double', wing, floor: 2, amenities: ['WiFi'], capacity: 2, occupants: 0, status: 'available' },
    { id: `${prefix}-202`, type: 'Deluxe Double', wing, floor: 2, amenities: ['WiFi', 'AC'], capacity: 2, occupants: 1, status: 'available' },
    { id: `${prefix}-203`, type: 'Standard Double', wing, floor: 2, amenities: ['WiFi'], capacity: 2, occupants: 2, status: 'occupied' },
    { id: `${prefix}-204`, type: 'Premium Double', wing, floor: 2, amenities: ['WiFi', 'AC', 'Balcony'], capacity: 2, occupants: 0, status: 'available' },
    { id: `${prefix}-205`, type: 'Standard Double', wing, floor: 2, amenities: ['WiFi'], capacity: 2, occupants: 1, status: 'available' },
  ],
  4: [
    { id: `${prefix}-301`, type: 'Standard Quad', wing, floor: 3, amenities: ['WiFi'], capacity: 4, occupants: 1, status: 'available' },
    { id: `${prefix}-302`, type: 'Deluxe Quad', wing, floor: 3, amenities: ['WiFi', 'AC'], capacity: 4, occupants: 2, status: 'available' },
    { id: `${prefix}-303`, type: 'Standard Quad', wing, floor: 3, amenities: ['WiFi'], capacity: 4, occupants: 4, status: 'occupied' },
    { id: `${prefix}-304`, type: 'Deluxe Quad', wing, floor: 3, amenities: ['WiFi', 'AC'], capacity: 4, occupants: 0, status: 'available' },
  ],
  6: [
    { id: `${prefix}-401`, type: 'Dormitory', wing, floor: 4, amenities: ['WiFi'], capacity: 6, occupants: 3, status: 'available' },
    { id: `${prefix}-402`, type: 'Dormitory', wing, floor: 4, amenities: ['WiFi'], capacity: 6, occupants: 5, status: 'available' },
    { id: `${prefix}-403`, type: 'Dormitory', wing, floor: 4, amenities: ['WiFi'], capacity: 6, occupants: 6, status: 'occupied' },
  ],
});

export const ROOM_DATA = {
  'block-a': makeRooms('A', 'North'),
  'block-b': makeRooms('B', 'Central'),
  'block-c': makeRooms('C', 'South'),
  'block-d': makeRooms('D', 'East'),
};

// ── Get rooms merging base data with locked rooms ──────────
export function getRooms(hostelId, beds) {
  const locked = getLockedRooms();
  const base = (ROOM_DATA[hostelId] || {})[beds] || [];
  return base.map((room) =>
    locked.has(room.id) ? { ...room, status: 'occupied' } : room
  );
}

// ── Auto-allocate: picks first available room in hostel+beds ─
export function findBestRoom(hostelId, beds) {
  const rooms = getRooms(hostelId, beds);
  return rooms.find((r) => r.status === 'available') || null;
}

// ── localStorage helpers ───────────────────────────────────
export function saveAllocation(data) {
  localStorage.setItem(ALLOCATION_KEY, JSON.stringify(data));
  // Lock the room
  const locked = getLockedRooms();
  locked.add(data.roomId);
  localStorage.setItem(LOCKED_ROOMS_KEY, JSON.stringify([...locked]));
}

export function loadAllocation() {
  try {
    const raw = localStorage.getItem(ALLOCATION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearAllocation() {
  localStorage.removeItem(ALLOCATION_KEY);
}

export function getLockedRooms() {
  try {
    const raw = localStorage.getItem(LOCKED_ROOMS_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

export function getLockedRegistrations() {
  try {
    const raw = localStorage.getItem(LOCKED_REGS_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

export function lockRegistration(regNo) {
  const locked = getLockedRegistrations();
  locked.add(regNo.trim().toUpperCase());
  localStorage.setItem(LOCKED_REGS_KEY, JSON.stringify([...locked]));
}

export function isRegistrationLocked(regNo) {
  return getLockedRegistrations().has(regNo.trim().toUpperCase());
}
