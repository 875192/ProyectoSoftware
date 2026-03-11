
const StaffUI = {
    toast: (msg, type='info') => {
        const el = document.getElementById('toast');
        if(!el) return;
        el.textContent = msg;
        el.style.borderLeftColor = type==='error' ? 'var(--status-rejected)' : type==='success' ? 'var(--status-approved)' : 'var(--accent)';
        el.classList.add('show');
        setTimeout(() => el.classList.remove('show'), 3000);
    },
    openModal: (id) => {
        const m = document.getElementById(id);
        if(m) { m.classList.add('show'); m.querySelector('textarea, input')?.focus(); }
    },
    closeModal: (id) => {
        const m = document.getElementById(id);
        if(m) m.classList.remove('show');
    }
};

document.addEventListener('keydown', (e) => {
    if(e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay.show').forEach(m => m.classList.remove('show'));
    }
});
