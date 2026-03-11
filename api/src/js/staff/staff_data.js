
const StaffData = {
    init: () => {
        if(!localStorage.getItem('staff_mats')) {
            localStorage.setItem('staff_mats', JSON.stringify([
                {id:'MAT-001', name:'MacBook Pro M2', cat:'Equipos', cond:'operativo', status:'disponible'},
                {id:'MAT-002', name:'Proyector HDMI', cat:'Accesorios', cond:'operativo', status:'en_prestamo'},
                {id:'MAT-003', name:'Sala Audiovisual B', cat:'Espacios', cond:'en_mantenimiento', status:'mantenimiento'}
            ]));
        }
        if(!localStorage.getItem('staff_reqs')) {
            localStorage.setItem('staff_reqs', JSON.stringify([
                {id:'REQ-100', user:'estudiante@upm.es', mat:'MacBook Pro M2', start:'2026-03-10', end:'2026-03-15', status:'pendiente', notes:'Necesario para proyecto final'},
                {id:'REQ-101', user:'profesor@upm.es', mat:'Proyector HDMI', start:'2026-03-08', end:'2026-03-09', status:'aprobada', notes:'Clase magistral'},
                {id:'REQ-102', user:'estudiante2@upm.es', mat:'Sala Audiovisual B', start:'2026-03-05', end:'2026-03-05', status:'en_prestamo', notes:''},
            ]));
        }
        if(!localStorage.getItem('staff_logs')) {
            localStorage.setItem('staff_logs', JSON.stringify([]));
        }
        if(!localStorage.getItem('staff_incidents')) {
            localStorage.setItem('staff_incidents', JSON.stringify([]));
        }
    },
    get: (key) => JSON.parse(localStorage.getItem(key)||'[]'),
    set: (key, val) => localStorage.setItem(key, JSON.stringify(val)),
    log: (action, detail) => {
        const logs = StaffData.get('staff_logs');
        logs.unshift({ date: new Date().toLocaleString(), user: 'Personal', action, detail });
        StaffData.set('staff_logs', logs);
    }
};
StaffData.init();
