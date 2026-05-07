// Global App State & Router

const App = {
    currentUser: null, // { role: 'admin'|'student'|'advisor', data: {} }
    views: ['view-home', 'view-contact', 'view-admin-login', 'view-admin', 'view-student-login', 'view-student-dashboard', 'view-exam-prep', 'view-exam-room', 'view-exam-result', 'view-advisor-login', 'view-advisor'],
    
    async init() {
        try {
            this.bindNav();
            this.initSlider();
            FilterModal.init(); // Initialize global filter modal
            
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

// Global Filter Modal Controller
const FilterModal = {
    currentMode: 'student', // 'student' or 'advisor'

    init() {
        const modal = document.getElementById('filter-modal');
        const btnClose = document.getElementById('btn-close-filter');
        const btnApply = document.getElementById('btn-apply-filter');
        const btnClear = document.getElementById('btn-clear-filter');

        if (!modal) return;

        if (btnClose) btnClose.addEventListener('click', () => this.close());
        
        if (btnApply) {
            btnApply.addEventListener('click', () => {
                if (this.currentMode === 'student') {
                    StudentPortal.currentPage = 1;
                    StudentPortal.renderLoginTable();
                } else {
                    AdvisorPortal.currentPage = 1;
                    AdvisorPortal.renderTable();
                }
                this.close();
            });
        }

        if (btnClear) {
            btnClear.addEventListener('click', () => {
                if (this.currentMode === 'student') {
                    const fAca = document.getElementById('stu-filter-academic-year');
                    const fYear = document.getElementById('stu-filter-year');
                    const fRoom = document.getElementById('stu-filter-room');
                    const fName = document.getElementById('stu-search-student');
                    if (fAca) fAca.value = '';
                    if (fYear) fYear.value = '';
                    if (fRoom) fRoom.value = '';
                    if (fName) fName.value = '';
                    StudentPortal.loadLoginFilters();
                    StudentPortal.renderLoginTable();
                } else {
                    const fAca = document.getElementById('adv-filter-academic-year');
                    const fYear = document.getElementById('adv-filter-year');
                    const fRoom = document.getElementById('adv-filter-room');
                    const fSub = document.getElementById('adv-filter-subject');
                    const fName = document.getElementById('adv-search-student');
                    if (fAca) fAca.value = '';
                    if (fYear) fYear.value = '';
                    if (fRoom) fRoom.value = '';
                    if (fSub) fSub.value = '';
                    if (fName) fName.value = '';
                    AdvisorPortal.loadFilters();
                    AdvisorPortal.renderTable();
                }
                this.close();
            });
        }

        modal.addEventListener('click', (e) => {
            if (e.target === modal) this.close();
        });
    },

    open(mode) {
        this.currentMode = mode;
        const modal = document.getElementById('filter-modal');
        const title = document.getElementById('filter-modal-title');
        const body = document.getElementById('filter-modal-body');

        if (mode === 'student') {
            title.innerText = '🔍 ค้นหาข้อมูลนักเรียน';
            body.innerHTML = `
                <div style="display: flex; flex-direction: column; gap: 16px;">
                    <div>
                        <label style="display: block; font-size: 13px; color: #86868b; margin-bottom: 6px; font-weight: 500;">ปีการศึกษา</label>
                        <select id="stu-filter-academic-year" class="filter-select" style="width: 100%; height: 48px; border-radius: 12px; background: #f5f5f7; border: none; padding: 0 12px; font-size: 15px;"></select>
                    </div>
                    <div>
                        <label style="display: block; font-size: 13px; color: #86868b; margin-bottom: 6px; font-weight: 500;">ชั้นปี</label>
                        <select id="stu-filter-year" class="filter-select" style="width: 100%; height: 48px; border-radius: 12px; background: #f5f5f7; border: none; padding: 0 12px; font-size: 15px;"></select>
                    </div>
                    <div>
                        <label style="display: block; font-size: 13px; color: #86868b; margin-bottom: 6px; font-weight: 500;">ห้อง</label>
                        <select id="stu-filter-room" class="filter-select" style="width: 100%; height: 48px; border-radius: 12px; background: #f5f5f7; border: none; padding: 0 12px; font-size: 15px;"></select>
                    </div>
                    <div>
                        <label style="display: block; font-size: 13px; color: #86868b; margin-bottom: 6px; font-weight: 500;">ชื่อ - นามสกุล</label>
                        <input type="text" id="stu-search-student" placeholder="พิมพ์ชื่อเพื่อค้นหา..." style="width: 100%; height: 48px; border-radius: 12px; background: #f5f5f7; border: none; padding: 0 16px; font-size: 15px;">
                    </div>
                </div>
            `;
            StudentPortal.loadLoginFilters();
        } else {
            title.innerText = '🔍 ค้นหาคะแนน (ที่ปรึกษา)';
            body.innerHTML = `
                <div style="display: flex; flex-direction: column; gap: 16px;">
                    <div>
                        <label style="display: block; font-size: 13px; color: #86868b; margin-bottom: 6px; font-weight: 500;">วิชา</label>
                        <select id="adv-filter-subject" class="filter-select" style="width: 100%; height: 48px; border-radius: 12px; background: #fff; border: 1.5px solid #0071e3; padding: 0 12px; font-size: 15px; font-weight: 600; color: #0071e3;"></select>
                    </div>
                    <div>
                        <label style="display: block; font-size: 13px; color: #86868b; margin-bottom: 6px; font-weight: 500;">ปีการศึกษา</label>
                        <select id="adv-filter-academic-year" class="filter-select" style="width: 100%; height: 48px; border-radius: 12px; background: #f5f5f7; border: none; padding: 0 12px; font-size: 15px;"></select>
                    </div>
                    <div>
                        <label style="display: block; font-size: 13px; color: #86868b; margin-bottom: 6px; font-weight: 500;">ชั้นปี</label>
                        <select id="adv-filter-year" class="filter-select" style="width: 100%; height: 48px; border-radius: 12px; background: #f5f5f7; border: none; padding: 0 12px; font-size: 15px;"></select>
                    </div>
                    <div>
                        <label style="display: block; font-size: 13px; color: #86868b; margin-bottom: 6px; font-weight: 500;">ห้อง</label>
                        <select id="adv-filter-room" class="filter-select" style="width: 100%; height: 48px; border-radius: 12px; background: #f5f5f7; border: none; padding: 0 12px; font-size: 15px;"></select>
                    </div>
                    <div>
                        <label style="display: block; font-size: 13px; color: #86868b; margin-bottom: 6px; font-weight: 500;">ชื่อนักเรียน</label>
                        <input type="text" id="adv-search-student" placeholder="พิมพ์ชื่อเพื่อค้นหา..." style="width: 100%; height: 48px; border-radius: 12px; background: #f5f5f7; border: none; padding: 0 16px; font-size: 15px;">
                    </div>
                </div>
            `;
            AdvisorPortal.loadFilters();

            // Bind cascading for Advisor Modal
            const advAcaYear = document.getElementById('adv-filter-academic-year');
            const advYear = document.getElementById('adv-filter-year');
            if (advAcaYear) {
                advAcaYear.onchange = () => {
                    AdvisorPortal.updateSubjectDropdown();
                    AdvisorPortal.updateRoomDropdown();
                };
            }
            if (advYear) {
                advYear.onchange = () => {
                    AdvisorPortal.updateSubjectDropdown();
                    AdvisorPortal.updateRoomDropdown();
                };
            }
        }

        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden'; // Prevent scroll
    },

    close() {
        const modal = document.getElementById('filter-modal');
        modal.classList.add('hidden');
        document.body.style.overflow = ''; // Restore scroll
    }
};

window.FilterModal = FilterModal;

window.onload = async () => {
    try { await App.init(); } catch(e) {}
    try { AdminPortal.init(); } catch(e) {}
    try { StudentPortal.init(); } catch(e) {}
    try { AdvisorPortal.init(); } catch(e) {}
};
