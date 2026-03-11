
const StaffPages = {
    currentId: null,

    initDashboard: () => {
        StaffUI.toast('Bienvenido de nuevo, Personal', 'success');
        const reqs = StaffData.get('staff_reqs');
        const logs = StaffData.get('staff_logs');
        document.getElementById('kpi-pendientes').textContent = reqs.filter(r=>r.status==='pendiente').length;
        document.getElementById('kpi-entregas').textContent = reqs.filter(r=>r.status==='aprobada').length;
        document.getElementById('kpi-activos').textContent = reqs.filter(r=>r.status==='en_prestamo').length;
        document.getElementById('kpi-incidencias').textContent = StaffData.get('staff_incidents').length;
        
        const tbody = document.querySelector('#recent-requests-table tbody');
        tbody.innerHTML = reqs.slice(0,5).map(r => 
            `<tr><td>${r.id}</td><td>${r.user}</td><td>${r.mat}</td><td><span class="chip ${r.status}">${r.status.replace('_',' ')}</span></td></tr>`
        ).join('');

        const dlogs = document.getElementById('dashboard-notifications');
        const recentLogs = logs.slice(0,4);
        if(recentLogs.length > 0){
            dlogs.innerHTML = recentLogs.map(l => `<div style="margin-bottom:10px; border-bottom:1px solid #e2e8f0; padding-bottom:5px;"><strong>${l.action}</strong>: ${l.detail} <br><small style="color:#94a3b8">${l.date}</small></div>`).join('');
        }
    },

    initSolicitudes: () => {
        const render = () => {
            const reqs = StaffData.get('staff_reqs');
            const statusFilter = document.getElementById('filter-status').value;
            const term = document.getElementById('search-input').value.toLowerCase();
            
            const filtered = reqs.filter(r => {
                let sMatch = statusFilter === 'all' || r.status === statusFilter;
                let tMatch = r.user.toLowerCase().includes(term) || r.id.toLowerCase().includes(term);
                return sMatch && tMatch;
            });
            
            document.querySelector('#requests-table tbody').innerHTML = filtered.map(r => 
                `<tr><td>${r.id}</td><td>${r.user}</td><td>${r.mat}</td><td>${r.start} / ${r.end}</td><td><span class="chip ${r.status}">${r.status.replace('_',' ')}</span></td>
                <td><a href="solicitud_detalle.html?id=${r.id}" class="btn btn-secondary" style="text-decoration:none;">Revisar</a></td></tr>`
            ).join('');
        };
        
        document.getElementById('filter-status').addEventListener('change', render);
        document.getElementById('search-input').addEventListener('input', render);
        render();
    },

    initSolicitudDetalle: () => {
        const id = new URLSearchParams(window.location.search).get('id');
        StaffPages.currentId = id;
        const reqs = StaffData.get('staff_reqs');
        const r = reqs.find(x=>x.id===id);
        
        if(!r) { StaffUI.toast('Solicitud no encontrada', 'error'); return; }
        
        document.getElementById('det-id').textContent = 'Solicitud ' + r.id;
        document.getElementById('det-user').textContent = r.user;
        document.getElementById('det-mat').textContent = r.mat;
        document.getElementById('det-dates').textContent = r.start + ' al ' + r.end;
        document.getElementById('det-notes').textContent = r.notes || "Sin notas.";
        document.getElementById('det-status').textContent = r.status.replace('_', ' ');
        document.getElementById('det-status').className = 'chip ' + (r.status);
        
        if(r.status !== 'pendiente') {
            document.getElementById('det-actions').style.display = 'none';
        }
    },

    doApproveCurrent: () => {
        const reqs = StaffData.get('staff_reqs');
        const r = reqs.find(x=>x.id===StaffPages.currentId);
        r.status = 'aprobada';
        StaffData.set('staff_reqs', reqs);
        StaffData.log('Aprobación', 'Solicitud ' + r.id + ' aprobada.');
        StaffUI.toast('Solicitud Aprobada correctamente', 'success');
        setTimeout(() => window.location.href = 'entregas_personal.html', 1500);
    },

    doRejectCurrent: () => {
        const reason = document.getElementById('reject-reason').value.trim();
        if(!reason) { StaffUI.toast('Debes indicar un motivo', 'error'); return; }
        
        const reqs = StaffData.get('staff_reqs');
        const r = reqs.find(x=>x.id===StaffPages.currentId);
        r.status = 'rechazada';
        StaffData.set('staff_reqs', reqs);
        StaffData.log('Rechazo', 'Solicitud ' + r.id + ' rechazada. Motivo: ' + reason);
        StaffUI.closeModal('reject-modal');
        StaffUI.toast('Solicitud Rechazada', 'success');
        setTimeout(() => window.location.href = 'solicitudes_personal.html', 1500);
    },

    initEntregas: () => {
        const reqs = StaffData.get('staff_reqs').filter(r=>r.status==='aprobada');
        document.querySelector('#deliveries-table tbody').innerHTML = reqs.map(r => 
            `<tr><td>${r.id}</td><td>${r.user}</td><td>${r.mat}</td><td>${r.start}</td>
            <td><button class="btn btn-primary" onclick="StaffPages.doDeliver('${r.id}')">Registrar Entrega</button></td></tr>`
        ).join('') || '<tr><td colspan="5">No hay entregas pendientes</td></tr>';
    },

    doDeliver: (id) => {
        const reqs = StaffData.get('staff_reqs');
        const r = reqs.find(x=>x.id===id);
        r.status = 'en_prestamo'; // Pasa a préstamo
        StaffData.set('staff_reqs', reqs);
        
        let mats = StaffData.get('staff_mats');
        let m = mats.find(x=>x.name===r.mat);
        if(m) { m.status = 'en_prestamo'; StaffData.set('staff_mats', mats); }

        StaffData.log('Entrega', 'Material entregado para solicitud ' + id);
        StaffUI.toast('Entrega registrada exitosamente', 'success');
        setTimeout(() => location.reload(), 1000);
    },

    initDevoluciones: () => {
        const reqs = StaffData.get('staff_reqs').filter(r=>r.status==='en_prestamo');
        document.querySelector('#returns-table tbody').innerHTML = reqs.map(r => 
            `<tr><td>${r.id}</td><td>${r.user}</td><td>${r.mat}</td><td>${r.end}</td>
            <td><button class="btn btn-secondary" onclick="StaffPages.openReturn('${r.id}')">Recibir</button></td></tr>`
        ).join('') || '<tr><td colspan="5">No hay préstamos activos</td></tr>';

        document.getElementById('return-status').addEventListener('change', (e) => {
            document.getElementById('incident-notes-group').style.display = e.target.value === 'damaged' ? 'block' : 'none';
        });
    },

    openReturn: (id) => {
        StaffPages.currentId = id;
        document.getElementById('return-status').value = 'ok';
        document.getElementById('incident-notes').value = '';
        document.getElementById('incident-notes-group').style.display = 'none';
        StaffUI.openModal('return-modal');
    },

    confirmReturn: () => {
        const st = document.getElementById('return-status').value;
        const notes = document.getElementById('incident-notes').value;

        if(st === 'damaged' && !notes.trim()) {
            StaffUI.toast('Debe detallar los daños para crear la incidencia', 'error'); return;
        }

        const reqs = StaffData.get('staff_reqs');
        const r = reqs.find(x=>x.id===StaffPages.currentId);
        r.status = 'finalizada';
        StaffData.set('staff_reqs', reqs);

        let mats = StaffData.get('staff_mats');
        let m = mats.find(x=>x.name===r.mat);
        if(m) {
            if(st==='damaged') {
                m.cond = 'en_mantenimiento'; m.status = 'mantenimiento';
                const incs = StaffData.get('staff_incidents');
                incs.push({ ref: r.id, mat: m.name, user: r.user, date: new Date().toLocaleString(), notes });
                StaffData.set('staff_incidents', incs);
                StaffData.log('Devolución/Incidencia', 'Devuelto con daños: ' + m.name + '. ' + notes);
                StaffUI.toast('Devolución procesada y reporte enviado a Mantenimiento', 'error');
            } else {
                m.status = 'disponible';
                StaffData.log('Devolución', 'Devolución correcta: ' + m.name);
                StaffUI.toast('Devolución completada sin incidencias', 'success');
            }
            StaffData.set('staff_mats', mats);
        }

        StaffUI.closeModal('return-modal');
        setTimeout(() => location.reload(), 1500);
    },

    initInventario: () => {
        const render = () => {
            const mats = StaffData.get('staff_mats');
            const filt = document.getElementById('inv-filter').value;
            const res = filt === 'all' ? mats : mats.filter(m=>m.cat===filt);
            document.querySelector('#inventory-table tbody').innerHTML = res.map(m => 
                `<tr><td>${m.id}</td><td>${m.name}</td><td>${m.cat}</td>
                <td><span class="chip ${m.cond}">${m.cond.replace('_',' ')}</span></td>
                <td><span class="chip ${m.status}">${m.status.replace('_',' ')}</span></td></tr>`
            ).join('');
        };
        document.getElementById('inv-filter').addEventListener('change', render);
        render();
    },

    initMaterialForm: () => {},

    saveMaterial: () => {
        const n = document.getElementById('mat-name').value.trim();
        const c = document.getElementById('mat-cat').value;
        const o = document.getElementById('mat-cond').value;
        if(!n) { StaffUI.toast('Nombre requerido', 'error'); return; }

        let mats = StaffData.get('staff_mats');
        const id = 'MAT-' + String(mats.length + 1).padStart(3, '0');
        mats.push({ id, name: n, cat: c, cond: o, status: o==='operativo'?'disponible':'mantenimiento' });
        StaffData.set('staff_mats', mats);
        StaffData.log('Inventario', 'Añadido nuevo material: ' + id);
        StaffUI.toast('Material registrado', 'success');
        setTimeout(() => window.location.href = 'inventario_personal.html', 1000);
    },

    initAuditoria: () => {
        const logs = StaffData.get('staff_logs');
        document.querySelector('#audit-table tbody').innerHTML = logs.map(l => 
            `<tr><td>${l.date}</td><td>${l.user}</td><td>${l.action}</td><td>${l.detail}</td></tr>`
        ).join('') || '<tr><td colspan="4">No hay logs registrados</td></tr>';
    },

    initReportes: () => {
        document.getElementById('rep-total').textContent = StaffData.get('staff_reqs').length;
        document.getElementById('rep-inc').textContent = StaffData.get('staff_incidents').length;
        document.getElementById('rep-rej').textContent = StaffData.get('staff_reqs').filter(r=>r.status==='rechazada').length;
    }
};
