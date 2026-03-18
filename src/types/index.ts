
export type UserRole = 'citizen' | 'rescue' | 'admin';

export type EmergencyType = 'Trapped' | 'Injured' | 'Medical emergency' | 'Food/Water shortage' | 'Elderly/Child rescue' | 'Other';

export type TicketStatus = 'Pending' | 'Accepted' | 'In Progress' | 'Rescued' | 'Closed';

export type Priority = 'Critical' | 'High' | 'Medium' | 'Low';

export interface Ticket {
  id: string;
  userId: string;
  userName: string;
  userPhone: string;
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  emergencyType: EmergencyType;
  numberOfPeople: number;
  notes?: string;
  mediaUrls?: string[];
  status: TicketStatus;
  priority: Priority;
  aiReasoning?: string;
  createdAt: string;
  assignedTeamId?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  isVerified: boolean;
}

export interface RescueTeam {
  id: string;
  name: string;
  location: {
    lat: number;
    lng: number;
  };
  status: 'Available' | 'On Mission' | 'Offline';
  members: string[];
}
