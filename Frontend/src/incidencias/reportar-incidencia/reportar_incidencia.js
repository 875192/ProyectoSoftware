import { auth } from '../../compartido/nucleo/auth.js';
  import { api } from '../../compartido/nucleo/api.js';
  import { mountSidebar } from '../../compartido/componentes-ui/sidebar/sidebar.js';

  const user = auth.requireAuth(['estudiante', 'profesor']);
  mountSidebar({ activePage: 'incidencias', basePath: '../..' });
  if (user) init(user);

  async function init(user) {
    const form = document.getElementById('incidenceForm');
    const loanSel = document.getElementById('loanSelect');
    const description = document.getElementById('description');
    const charCount = document.getElementById('charCount');
    const btnSubmit = document.getElementById('btnSubmit');
    const fileInput = document.getElementById('fileInput');
    const uploader = document.getElementById('uploader');
    const previewGrid = document.getElementById('previewGrid');
    const toast = document.getElementById('toast');

    const MAX_FILES = 5;
    const MAX_SIZE = 5 * 1024 * 1024;
    let files = [];

    // Cargar préstamos activos del usuario
    try {
      const prestamos = await api.getPrestamos(user.id);
      const activos = prestamos.filter(p => p.estado === 'activo' || p.estado === 'retrasado');
      if (activos.length === 0) {
        loanSel.innerHTML = '<option value="" disabled selected>No tienes préstamos activos</option>';
      } else {
        const fmtRel = (iso) => {
          if (!iso) return '';
          const d = new Date(iso);
          const today = new Date(); today.setHours(0, 0, 0, 0);
          const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
          const diff = Math.round((target - today) / 86400000);
          if (diff === 0) return 'devolución hoy';
          if (diff === 1) return 'devolución mañana';
          if (diff > 0)   return `devolución en ${diff} días`;
          return `con ${Math.abs(diff)} días de retraso`;
        };
        loanSel.innerHTML = '<option value="" disabled selected>Selecciona el préstamo…</option>' +
          activos.map(p => {
            const sub = fmtRel(p.fechaDevolucionPrevista);
            return `<option value="${p.id}">#${p.id} · ${p.materialName}${sub ? ' (' + sub + ')' : ''}</option>`;
          }).join('');
      }
    } catch (err) {
      console.error('Error al cargar préstamos:', err);
      loanSel.innerHTML = '<option value="" disabled selected>Error al cargar préstamos</option>';
    }

    description.addEventListener('input', () => {
      charCount.textContent = description.value.length;
      revalidate();
    });
    loanSel.addEventListener('change', revalidate);
    document.querySelectorAll('input[name="type"]').forEach(r => r.addEventListener('change', revalidate));

    function revalidate() {
      const type = document.querySelector('input[name="type"]:checked');
      const ok = loanSel.value && type && description.value.trim().length >= 10;
      btnSubmit.disabled = !ok;
    }

    // Uploader (las fotos por ahora se muestran solo en cliente; subida real pendiente de endpoint de archivos)
    uploader.addEventListener('click', () => fileInput.click());
    uploader.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); }
    });
    ['dragenter', 'dragover'].forEach(ev =>
      uploader.addEventListener(ev, (e) => { e.preventDefault(); uploader.classList.add('dragover'); })
    );
    ['dragleave', 'drop'].forEach(ev =>
      uploader.addEventListener(ev, (e) => { e.preventDefault(); uploader.classList.remove('dragover'); })
    );
    uploader.addEventListener('drop', (e) => addFiles(e.dataTransfer.files));
    fileInput.addEventListener('change', (e) => addFiles(e.target.files));

    function addFiles(fileList) {
      for (const f of fileList) {
        if (files.length >= MAX_FILES) break;
        if (!f.type.startsWith('image/')) continue;
        if (f.size > MAX_SIZE) continue;
        files.push(f);
      }
      renderPreviews();
    }

    function renderPreviews() {
      previewGrid.innerHTML = '';
      files.forEach((f, idx) => {
        const url = URL.createObjectURL(f);
        const item = document.createElement('div');
        item.className = 'preview-item';
        item.innerHTML = `
          <img src="${url}" alt="Foto ${idx + 1}" />
          <button type="button" class="preview-remove" aria-label="Eliminar foto">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>`;
        item.querySelector('.preview-remove').addEventListener('click', () => {
          URL.revokeObjectURL(url);
          files.splice(idx, 1);
          renderPreviews();
        });
        previewGrid.appendChild(item);
      });
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (btnSubmit.disabled) return;

      const tipo = document.querySelector('input[name="type"]:checked')?.value;
      const prestamoId = loanSel.value;
      const desc = description.value.trim();

      btnSubmit.disabled = true;
      btnSubmit.innerHTML = '<span style="opacity:0.85">Enviando…</span>';

      try {
        await api.createIncidencia({
          usuarioId: user.id,
          prestamoId,
          tipo,
          descripcion: desc,
        });
        toast.classList.add('show');
        setTimeout(() => {
          window.location.href = '../../paneles/panel-usuario/panel_usuarios.html';
        }, 1300);
      } catch (err) {
        console.error('Error al enviar incidencia:', err);
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          Reintentar`;
        alert('No se pudo enviar la incidencia: ' + err.message);
      }
    });
  }