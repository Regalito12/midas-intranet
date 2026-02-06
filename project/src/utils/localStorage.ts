// localStorage utility functions for the intranet prototype

import { User, News, Event, Employee } from '../types';
import { mockNews, mockEvents, mockEmployees } from '../data/mockData';

// Storage keys
const STORAGE_KEYS = {
  USER: 'midas_user',
  NEWS: 'midas_news',
  EVENTS: 'midas_events',
  EMPLOYEES: 'midas_employees',
} as const;

// Initialize localStorage with mock data if not present
export const initializeStorage = () => {
  if (!localStorage.getItem(STORAGE_KEYS.NEWS)) {
    localStorage.setItem(STORAGE_KEYS.NEWS, JSON.stringify(mockNews));
  }
  if (!localStorage.getItem(STORAGE_KEYS.EVENTS)) {
    localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(mockEvents));
  }
  if (!localStorage.getItem(STORAGE_KEYS.EMPLOYEES)) {
    localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(mockEmployees));
  }
};

// User authentication functions
export const getCurrentUser = (): User | null => {
  const userStr = localStorage.getItem(STORAGE_KEYS.USER);
  if (!userStr) return null;

  try {
    const user = JSON.parse(userStr);
    // Strict Validation
    if (!user.id || !user.username || !user.role || !user.name) {
      console.warn('Invalid user data found in storage, clearing session.');
      localStorage.removeItem(STORAGE_KEYS.USER);
      return null;
    }
    return user;
  } catch (e) {
    console.error('Error parsing user data:', e);
    localStorage.removeItem(STORAGE_KEYS.USER);
    return null;
  }
};

export const setCurrentUser = (user: User): void => {
  localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
};

export const logoutUser = (): void => {
  localStorage.removeItem(STORAGE_KEYS.USER);
  // Clear all auth tokens (legacy and enterprise)
  localStorage.removeItem('token');
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
};



// News functions
export const getNews = (): News[] => {
  const newsStr = localStorage.getItem(STORAGE_KEYS.NEWS);
  return newsStr ? JSON.parse(newsStr) : [];
};

export const addNews = (newsItem: Omit<News, 'id' | 'date' | 'author' | 'image'> & { image?: string }): News => {
  const news = getNews();
  const newNews: News = {
    ...newsItem,
    id: Date.now().toString(),
    date: new Date().toISOString(),
    author: 'Usuario Actual', // Esto se reemplazarÃ¡ con el usuario real
    image: newsItem.image || 'https://via.placeholder.com/800x400?text=Sin+imagen',
  };

  const updatedNews = [newNews, ...news];
  localStorage.setItem(STORAGE_KEYS.NEWS, JSON.stringify(updatedNews));
  return newNews;
};

export const updateNews = (id: string, updates: Partial<News>): News | null => {
  const news = getNews();
  const index = news.findIndex(item => item.id === id);

  if (index === -1) return null;

  const updatedItem = { ...news[index], ...updates };
  news[index] = updatedItem;
  localStorage.setItem(STORAGE_KEYS.NEWS, JSON.stringify(news));
  return updatedItem;
};

export const deleteNews = (id: string): boolean => {
  const news = getNews();
  const filteredNews = news.filter(item => item.id !== id);

  if (news.length === filteredNews.length) return false;

  localStorage.setItem(STORAGE_KEYS.NEWS, JSON.stringify(filteredNews));
  return true;
};

export const getNewsById = (id: string): News | null => {
  const news = getNews();
  return news.find(item => item.id === id) || null;
};

export const searchNews = (query: string): News[] => {
  const news = getNews();
  const lowerQuery = query.toLowerCase();
  return news.filter(item =>
    item.title.toLowerCase().includes(lowerQuery) ||
    item.content.toLowerCase().includes(lowerQuery) ||
    item.excerpt.toLowerCase().includes(lowerQuery) ||
    item.author.toLowerCase().includes(lowerQuery)
  );
};

// Events functions
export const getEvents = (): Event[] => {
  const eventsStr = localStorage.getItem(STORAGE_KEYS.EVENTS);
  return eventsStr ? JSON.parse(eventsStr) : [];
};

export const getUpcomingEvents = (): Event[] => {
  const events = getEvents();
  const today = new Date().toISOString().split('T')[0];
  return events
    .filter(event => event.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 4);
};

// Employees functions
export const getEmployees = (): Employee[] => {
  const employeesStr = localStorage.getItem(STORAGE_KEYS.EMPLOYEES);
  return employeesStr ? JSON.parse(employeesStr) : [];
};

export const searchEmployees = (query: string): Employee[] => {
  const employees = getEmployees();
  const lowerQuery = query.toLowerCase();
  return employees.filter(employee =>
    employee.name.toLowerCase().includes(lowerQuery) ||
    employee.email.toLowerCase().includes(lowerQuery) ||
    employee.position.toLowerCase().includes(lowerQuery) ||
    employee.department.toLowerCase().includes(lowerQuery)
  );
};

export const getEmployeeById = (id: string): Employee | null => {
  const employees = getEmployees();
  return employees.find(employee => employee.id === id) || null;
};
