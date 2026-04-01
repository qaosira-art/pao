const AdvisorPortal = {
    currentPage: 1,
    itemsPerPage: 50,
    
    init() {
        try {
            this.bindEvents();
            this.initLogin();
        } catch (e) {
            console.error("AdvisorPortal.init failed", e);
        }
    },

    bindEvents() {
        document.getElementById('btn-advisor-back').addEventListener('click', () => {
            App.switchView('view-home');
        });

        // Filter event listeners
        ['adv-filter-year', 'adv-filter-room', 'adv-filter-subject', 'adv-filter-name'].forEach(id => {
            const el = document.getElementById(id);
            if(el) el.addEventListener('input', () => {
                this.currentPage = 1;
                this.renderTable();
            });
        });
    },
    
    initLogin() {
        const form = document.getElementById('advisor-login-form');
        const passInput = document.getElementById('advisor-password');
        const errorMsg = document.getElementById('advisor-login-error');

        if (!form) return;

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const pass = passInput.value.trim();
            if (pass === 'ntc') {
                if(errorMsg) errorMsg.classList.add('hidden');
                passInput.value = '';
                App.login('advisor', {});
            } else {
                if(errorMsg) errorMsg.classList.remove('hidden');
            }
        });
    },

    loadFilters() {
        const students = Store.getStudents();
        const years = [...new Set(students.map(s => s.year.toString()))].sort((a, b) => parseInt(a) - parseInt(b));
        const rooms = [...new Set(students.map(s => s.room.toString()))].sort((a, b) => a.localeCompare(b, 'th', { numeric: true }));
        const subjects = Store.getSubjects();

        const yearSelect = document.getElementById('adv-filter-year');
        const currentYear = yearSelect.value;
        yearSelect.innerHTML = '<option value="">ชั้นปี</option>';
        years.forEach(y => {
            const opt = document.createElement('option');
            opt.value = y; opt.innerText = y;
            yearSelect.appendChild(opt);
        });
        if (years.includes(currentYear)) yearSelect.value = currentYear;

        const roomSelect = document.getElementById('adv-filter-room');
        const currentRoom = roomSelect.value;
        roomSelect.innerHTML = '<option value="">ห้อง</option>';
        rooms.forEach(r => {
            const opt = document.createElement('option');
            opt.value = r; opt.innerText = r;
            roomSelect.appendChild(opt);
        });
        if (rooms.includes(currentRoom)) roomSelect.value = currentRoom;

        const subSelect = document.getElementById('adv-filter-subject');
        if (subSelect) {
            const currentSub = subSelect.value;
            subSelect.innerHTML = '<option value="">-- เลือกวิชา (จำเป็น) --</option>';
            subjects.forEach(sub => {
                const opt = document.createElement('option');
                opt.value = sub.id; opt.innerText = sub.name;
                subSelect.appendChild(opt);
            });
            if (subjects.find(s => s.id === currentSub)) subSelect.value = currentSub;
        }
    },

    renderTable() {
        let students = Store.getStudents();
        const subjects = Store.getSubjects();
        const scores = Store.getScores();

        // Filters
        const fYear = document.getElementById('adv-filter-year') ? document.getElementById('adv-filter-year').value : '';
        const fRoom = document.getElementById('adv-filter-room') ? document.getElementById('adv-filter-room').value : '';
        const fName = document.getElementById('adv-filter-name') ? document.getElementById('adv-filter-name').value.trim().toLowerCase() : '';
        const fSubId = document.getElementById('adv-filter-subject') ? document.getElementById('adv-filter-subject').value : '';

        if (fRoom) students = students.filter(s => s.room.toString() === fRoom);
        if (fName) students = students.filter(s => `${s.firstName} ${s.lastName}`.toLowerCase().includes(fName));

        // Sort students: Year -> Room -> Name
        students.sort((a, b) => {
            const yearA = parseInt(a.year) || 0;
            const yearB = parseInt(b.year) || 0;
            if (yearA !== yearB) return yearA - yearB;
            
            const roomCompare = a.room.localeCompare(b.room, 'th', { numeric: true });
            if (roomCompare !== 0) return roomCompare;
            
            return a.firstName.localeCompare(b.firstName, 'th');
        });

        const tbody = document.getElementById('adv-table-body');
        const thead = document.getElementById('adv-table-header');
        
        // If subject is not chosen, show prompt
        if (!fSubId) {
            thead.innerHTML = '';
            tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 40px; color: var(--apple-gray); font-size: 14px;">กรุณาเลือกวิชาจากกล่องด้านบน เพื่อดูคะแนนของนักเรียน</td></tr>`;
            if (document.getElementById('adv-pagination')) {
                document.getElementById('adv-pagination').innerHTML = '';
            }
            return;
        }

        const selectedSubject = subjects.find(s => s.id === fSubId);
        if (!selectedSubject) return;

        // Render Header
        let thHTML = `
            <th style="border-bottom: 2px solid #e5e5ea; font-size: 13px; font-weight: 500;">ชั้นปี</th>
            <th style="border-bottom: 2px solid #e5e5ea; font-size: 13px; font-weight: 500;">ห้อง</th>
            <th style="border-bottom: 2px solid #e5e5ea; font-size: 13px; font-weight: 500;">ชื่อ - นามสกุล</th>
            <th style="border-bottom: 2px solid #e5e5ea; font-size: 13px; font-weight: 500;">สิทธิ์สอบ</th>
            <th style="border-bottom: 2px solid #e5e5ea; font-size: 13px; font-weight: 500; color: #0ea5e9;">${selectedSubject.name}</th>
        `;
        thead.innerHTML = thHTML;

        // Render Body
        tbody.innerHTML = '';
        
        if (students.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 20px; color: var(--apple-gray);">ไม่พบข้อมูลนักเรียน</td></tr>`;
            if (document.getElementById('adv-pagination')) {
                document.getElementById('adv-pagination').innerHTML = '';
            }
            return;
        }

        const totalItems = students.length;
        const totalPages = Math.ceil(totalItems / this.itemsPerPage);
        
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const paginatedStudents = students.slice(startIndex, endIndex);

        paginatedStudents.forEach(s => {
            const tr = document.createElement('tr');
            
            // Eligibility Badge
            const eligBadge = s.isEligible 
                ? `<span style="background: #e3fbed; color: #1e7e46; padding: 4px 12px; border-radius: 12px; font-weight: 600; font-size: 13px;">มี</span>`
                : `<span style="background: #f5f5f7; color: #6e6e73; padding: 4px 12px; border-radius: 12px; font-weight: 600; font-size: 13px;">ไม่มี</span>`;

            // Find Score
            const sc = scores.find(x => x.studentId === s.id && x.subjectId === selectedSubject.id);
            const scoreText = sc ? `${sc.score}/${sc.total}` : '-';

            let tdHTML = `
                <td style="padding: 16px; font-size: 14px;">${s.year}</td>
                <td style="padding: 16px; font-size: 14px;">${s.room}</td>
                <td style="padding: 16px; font-size: 14px; font-weight: 500;">${s.firstName} ${s.lastName}</td>
                <td style="padding: 16px; font-size: 14px;">${eligBadge}</td>
                <td style="padding: 16px; font-size: 15px; font-weight: 600; color: #0ea5e9;">${scoreText}</td>
            `;

            tr.innerHTML = tdHTML;
            tbody.appendChild(tr);
        });

        this.renderPagination(totalPages);
    },

    renderPagination(totalPages) {
        const pagContainer = document.getElementById('adv-pagination');
        if (!pagContainer) return;
        pagContainer.innerHTML = '';

        if (totalPages <= 1) return;

        for (let i = 1; i <= totalPages; i++) {
            const btn = document.createElement('button');
            btn.innerText = i;
            btn.style.width = '32px';
            btn.style.height = '32px';
            btn.style.borderRadius = '8px';
            btn.style.border = 'none';
            btn.style.fontWeight = '600';
            btn.style.cursor = 'pointer';
            
            if (i === this.currentPage) {
                btn.style.background = '#0ea5e9';
                btn.style.color = 'white';
            } else {
                btn.style.background = 'white';
                btn.style.color = '#1d1d1f';
                btn.style.border = '1px solid #d2d2d7';
            }

            btn.addEventListener('click', () => {
                this.currentPage = i;
                this.renderTable();
            });
            pagContainer.appendChild(btn);
        }
    }
};

window.AdvisorPortal = AdvisorPortal;
