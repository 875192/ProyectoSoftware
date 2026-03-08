import { db } from './db.js';

export const auth = {
  login: (email, password) => {
    const user = db.find('users', u => u.email === email && u.password === password);
    if (user) {
      localStorage.setItem('currentUser', JSON.stringify({
        id: user.id,
        name: user.name,
        role: user.role,
        email: user.email
      }));
      return user;
    }
    return null;
  },

  loginSocial: (email) => {
    const user = db.find('users', u => u.email === email);
    if (!user) return null;
    localStorage.setItem('currentUser', JSON.stringify({
      id: user.id,
      name: user.name,
      role: user.role,
      email: user.email
    }));
    return user;
  },

  logout: () => {
    localStorage.removeItem('currentUser');
    window.location.href = '../public/login.html';
  },

  getCurrentUser: () => {
    const userStr = localStorage.getItem('currentUser');
    return userStr ? JSON.parse(userStr) : null;
  },

  requireAuth: (allowedRoles = []) => {
    const user = auth.getCurrentUser();
    if (!user) {
      window.location.href = '../public/login.html';
      return null;
    }
    
    if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
      alert("No tienes permiso para ver esta página.");
      // Redirigir según su rol
      const roleDbs = {
        'estudiante': '../student/dashboard_estudiante.html',
        'profesor': '../profesor/dashboard_profesor.html',
        'personal': '../staff/dashboard.html',
        'mantenimiento': '../maintenance/dashboard.html'
      };
      window.location.href = roleDbs[user.role] || '../public/login.html';
      return null;
    }
    
    return user;
  }
};
