// Global App State & Router

const App = {
    currentUser: null, // { role: 'admin'|'student'|'advisor', data: {} }
    views: ['view-home', 'view-contact', 'view-admin-login', 'view-admin', 'view-student-login', 'view-student-dashboard', 'view-exam-prep', 'view-exam-room', 'view-exam-result', 'view-advisor-login', 'view-advisor'],
    
    async init() {
        try {
            this.bindNav();
            this.initSlider();
            
            // Wait for Supabase to download initial caches
            await Store.initFirebase();
            
            // Hide global loader
            const l = document.getElementById('global-loading');
            if(l) l.style.display = 'none';

            this.switchView('view-home');
        } catch (error) {
            console.error("App.init: Bootstrap failed!", error);
            const l = document.getElementById('global-loading');
            if(l) l.style.display = 'none';
        }
    },

    bindNav() {
        document.getElementById('nav-logo').addEventListener('click', (e) => { e.preventDefault(); this.switchView('view-home'); });
        document.getElementById('menu-student').addEventListener('click', (e) => { e.preventDefault(); this.switchView('view-student-login'); });
        document.getElementById('menu-advisor').addEventListener('click', (e) => { e.preventDefault(); this.switchView('view-advisor-login'); });
        document.getElementById('menu-admin').addEventListener('click', (e) => { e.preventDefault(); this.switchView('view-admin-login'); });
        document.getElementById('menu-contact').addEventListener('click', (e) => { e.preventDefault(); this.switchView('view-contact'); });
        
        document.getElementById('btn-back-home').addEventListener('click', (e) => { e.preventDefault(); this.switchView('view-home'); });
        document.getElementById('btn-logout').addEventListener('click', (e) => { e.preventDefault(); this.logout(); });
    },

    switchView(viewId) {
        this.views.forEach(v => {
            const el = document.getElementById(v);
            if (el) el.classList.add('hidden');
        });
        const target = document.getElementById(viewId);
        if (target) {
            target.classList.remove('hidden');
            target.classList.add('active');
        }
        this.updateHeader(viewId);
    },

    updateHeader(viewId) {
        const backBtn = document.getElementById('btn-back-home');
        const logoutBtn = document.getElementById('btn-logout');
        const greeting = document.getElementById('header-greeting');
        
        // Default Hide
        backBtn.classList.add('hidden');
        logoutBtn.classList.add('hidden');
        greeting.classList.add('hidden');

        if (this.currentUser) {
            if (this.currentUser.role === 'student' && viewId !== 'view-exam-room') {
                greeting.classList.remove('hidden');
                document.getElementById('user-name-display').innerText = `${this.currentUser.data.firstName} ${this.currentUser.data.lastName}`;
                logoutBtn.classList.remove('hidden');
            } else if (this.currentUser.role === 'admin') {
                logoutBtn.classList.remove('hidden');
            }
        }

        if (viewId === 'view-advisor') {
            backBtn.classList.remove('hidden');
        }
    },

    login(role, data) {
        this.currentUser = { role, data };
        if (role === 'admin') {
            this.switchView('view-admin');
            AdminPortal.renderRooms();
            AdminPortal.renderSubjects();
            AdminPortal.renderExams();
            AdminPortal.renderStudents();
        } else if (role === 'student') {
            this.switchView('view-student-dashboard');
        } else if (role === 'advisor') {
            this.switchView('view-advisor');
            AdvisorPortal.loadFilters();
            AdvisorPortal.renderTable();
        }
    },

    logout() {
        this.currentUser = null;
        this.switchView('view-home');
    },

    // Global Modal
    showModal(text, onConfirm) {
        const modal = document.getElementById('global-modal');
        document.getElementById('modal-text').innerText = text;
        const confirmBtn = document.getElementById('modal-btn-confirm');
        const cancelBtn = document.getElementById('modal-btn-cancel');
        
        modal.classList.remove('hidden');
        
        // If onConfirm exists, it's a confirmation dialogue, show cancel
        if (onConfirm) {
            cancelBtn.classList.remove('hidden');
        } else {
            cancelBtn.classList.add('hidden'); // Just an alert
        }

        // Cleanup old listeners by replacing elements
        const newConfirm = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirm, confirmBtn);
        
        newConfirm.addEventListener('click', () => {
            modal.classList.add('hidden');
            if (onConfirm) onConfirm();
        });

        const newCancel = cancelBtn.cloneNode(true);
        cancelBtn.parentNode.replaceChild(newCancel, cancelBtn);
        newCancel.addEventListener('click', () => {
            modal.classList.add('hidden');
        });
    },

    // Home Slider
    initSlider() {
        let currentSlide = 0;
        const slides = document.querySelectorAll('.slide');
        const dots = document.querySelectorAll('.dot');
        const total = slides.length;
        if (total === 0) return;

        const updateSlider = (index) => {
            slides.forEach(s => s.classList.remove('active'));
            dots.forEach(d => d.classList.remove('active'));
            
            slides[index].classList.add('active');
            dots[index].classList.add('active');
            currentSlide = index;
        };

        // Auto slide every 3 seconds
        setInterval(() => {
            let next = currentSlide + 1;
            if (next >= total) next = 0;
            updateSlider(next);
        }, 3000);

        // Click dots
        dots.forEach((dot, idx) => {
            dot.addEventListener('click', () => {
                updateSlider(idx);
            });
        });
    }
};

window.onload = async () => {
    try { await App.init(); } catch(e) {}
    try { AdminPortal.init(); } catch(e) {}
    try { StudentPortal.init(); } catch(e) {}
    try { AdvisorPortal.init(); } catch(e) {}
};
