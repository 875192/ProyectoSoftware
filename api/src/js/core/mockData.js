const MOCK_DATA = {
  users: [
    { id: 'u1', name: 'Ana García', email: 'ana.garcia@univ.edu', role: 'estudiante', password: '123' },
    { id: 'u2', name: 'Carlos Pérez', email: 'carlos.pere@univ.edu', role: 'profesor', password: '123' },
    { id: 'u3', name: 'Laura Gómez', email: 'laura.gomez@univ.edu', role: 'personal', password: '123' },
    { id: 'u4', name: 'Roberto Díaz', email: 'roberto.diaz@univ.edu', role: 'mantenimiento', password: '123' }
  ],
  inventory: [
    { id: 'i1', name: 'Proyector Epson X400', category: 'Audiovisual', status: 'disponible', condition: 'bueno' },
    { id: 'i2', name: 'Cámara Canon EOS 90D', category: 'Fotografía', status: 'prestado', condition: 'bueno' },
    { id: 'i3', name: 'Kit Arduino Uno', category: 'Electrónica', status: 'disponible', condition: 'bueno' },
    { id: 'i4', name: 'Osciloscopio Tektronix', category: 'Electrónica', status: 'mantenimiento', condition: 'falla_pantalla' }
  ],
  requests: [
    { id: 'r1', userId: 'u1', itemId: 'i2', startDate: '2026-03-08', endDate: '2026-03-10', status: 'en_prestamo', purpose: 'Proyecto audiovisual' },
    { id: 'r2', userId: 'u2', itemId: 'i1', startDate: '2026-03-12', endDate: '2026-03-12', status: 'pendiente', purpose: 'Clase magistral' }
  ],
  incidents: [
    { id: 'inc1', itemId: 'i4', reportedBy: 'u3', date: '2026-03-05', description: 'Pantalla no enciende', status: 'en_proceso' }
  ],
  notifications: [
    { id: 'n1', userId: 'u1', text: 'Tu solicitud de Proyector ha sido aprobada.', read: false, date: '2026-03-07' }
  ]
};

export function initStorage() {
  if (!localStorage.getItem('app_initialized')) {
    localStorage.setItem('users', JSON.stringify(MOCK_DATA.users));
    localStorage.setItem('inventory', JSON.stringify(MOCK_DATA.inventory));
    localStorage.setItem('requests', JSON.stringify(MOCK_DATA.requests));
    localStorage.setItem('incidents', JSON.stringify(MOCK_DATA.incidents));
    localStorage.setItem('notifications', JSON.stringify(MOCK_DATA.notifications));
    localStorage.setItem('app_initialized', 'true');
  }
}
