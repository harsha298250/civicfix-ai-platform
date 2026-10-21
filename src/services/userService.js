import { INITIAL_USERS } from './mockData';

const USERS_STORAGE_KEY = 'civicfix_users_v1';

const getStoredUsers = () => {
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('LocalStorage error', e);
  }
  return INITIAL_USERS;
};

const saveUsers = (users) => {
  try {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  } catch (e) {
    console.warn('LocalStorage save failed', e);
  }
};

export const userService = {
  getAll: async () => {
    return [...getStoredUsers()];
  },

  getById: async (id) => {
    const users = getStoredUsers();
    return users.find(u => u.id === id) || null;
  },

  getByRole: async (role) => {
    const users = getStoredUsers();
    return users.filter(u => u.role === role);
  },

  getFieldWorkers: async () => {
    const users = getStoredUsers();
    return users.filter(u => u.role === 'WORKER' && u.status === 'ACTIVE');
  },

  approveStaff: async (userId) => {
    const users = getStoredUsers();
    const idx = users.findIndex(u => u.id === userId);
    if (idx !== -1) {
      users[idx] = { ...users[idx], status: 'ACTIVE' };
      saveUsers(users);
      return users[idx];
    }
    throw new Error('User not found');
  },

  rejectStaff: async (userId) => {
    const users = getStoredUsers();
    const updated = users.filter(u => u.id !== userId);
    saveUsers(updated);
    return updated;
  },

  createStaffAccount: async (staffData) => {
    const users = getStoredUsers();
    const newUser = {
      id: `usr-${String(Math.floor(100 + Math.random() * 900))}`,
      name: staffData.name,
      email: staffData.email,
      phone: staffData.phone || '+91 94440 00000',
      role: staffData.role,
      ward: staffData.ward || 'District 04 Headquarters',
      status: 'ACTIVE',
      trustScore: 95,
      avatar: staffData.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase(),
      department: staffData.department || 'Municipal Operations',
      joinedDate: 'Today'
    };
    const updated = [newUser, ...users];
    saveUsers(updated);
    return newUser;
  }
};
