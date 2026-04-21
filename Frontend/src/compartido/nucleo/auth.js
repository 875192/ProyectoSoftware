import { api } from './api.js';

export const auth = {
  login: async (email, password) => {
    const user = await api.login(email, password);
    localStorage.setItem('currentUser', JSON.stringify(user));
    return user;
  },

  loginSocial: async (email) => {
    // Social login: try to authenticate with email only (not supported by backend yet)
    // Falls back to checking if user exists via a server call
    try {
      // For now, social login is not fully supported with backend auth
      // This would need a dedicated endpoint
      return null;
    } catch {
      return null;
    }
  },

  logout: () => {
    localStorage.removeItem('currentUser');
    window.location.href = '../../autenticacion/login_registro/login.html';
  },

  getCurrentUser: () => {
    const userStr = localStorage.getItem('currentUser');
    return userStr ? JSON.parse(userStr) : null;
  },

  requireAuth: (allowedRoles = []) => {
    const user = auth.getCurrentUser();
    if (!user) {
      window.location.href = '../../autenticacion/login_registro/login.html';
      return null;
    }
    
    if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
      alert("No tienes permiso para ver esta página.");
      // Redirigir según su rol
      const roleDbs = {
        'estudiante':       '../../paneles/panel-estudiante/panel-estudiante.html',
        'personal_gestion': '../../paneles/panel-staff/panel-staff.html',
        'mantenimiento':    '../../mantenimiento/mantenimiento.html'
      };
      window.location.href = roleDbs[user.role] || '../public/login.html';
      return null;
    }
    
    return user;
  }
};
