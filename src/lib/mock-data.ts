
import { Ticket, User, RescueTeam } from '@/types';

export const MOCK_USER: User = {
  id: 'user-1',
  name: 'John Citizen',
  email: 'john@example.com',
  phone: '+1234567890',
  role: 'citizen',
  isVerified: true
};

export const MOCK_RESCUE: User = {
  id: 'rescue-1',
  name: 'Sarah Rescue',
  email: 'sarah@rescue.org',
  phone: '+1987654321',
  role: 'rescue',
  isVerified: true
};

export const MOCK_ADMIN: User = {
  id: 'admin-1',
  name: 'Admin Commander',
  email: 'admin@floodguard.gov',
  phone: '+1112223333',
  role: 'admin',
  isVerified: true
};

export const MOCK_TICKETS: Ticket[] = [
  {
    id: 't-1',
    userId: 'user-2',
    userName: 'Mary Smith',
    userPhone: '+15550001',
    location: { lat: 40.7128, lng: -74.0060, address: '123 River St, Floodville' },
    emergencyType: 'Trapped',
    numberOfPeople: 4,
    notes: 'Water is rising fast on the second floor.',
    status: 'Pending',
    priority: 'Critical',
    aiReasoning: 'Rising water levels and multiple people trapped in a multi-story building.',
    createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
  },
  {
    id: 't-2',
    userId: 'user-3',
    userName: 'Robert Brown',
    userPhone: '+15550002',
    location: { lat: 40.7306, lng: -73.9352, address: '45 Lake Rd, North District' },
    emergencyType: 'Food/Water shortage',
    numberOfPeople: 2,
    notes: 'Out of clean water for 24 hours.',
    status: 'Accepted',
    priority: 'Medium',
    aiReasoning: 'Non-immediate life threat, but resource shortage requiring attention.',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    assignedTeamId: 'rt-1'
  }
];

export const MOCK_RESCUE_TEAMS: RescueTeam[] = [
  {
    id: 'rt-1',
    name: 'Rapid Response Alpha',
    location: { lat: 40.7100, lng: -74.0100 },
    status: 'On Mission',
    members: ['Sarah Rescue', 'Mike Help']
  },
  {
    id: 'rt-2',
    name: 'Water Rescue 7',
    location: { lat: 40.7500, lng: -73.9800 },
    status: 'Available',
    members: ['David Boat', 'Lisa Swim']
  }
];
