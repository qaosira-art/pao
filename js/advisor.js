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
        const btnBack = document.getElementById('btn-advisor-back');
        if (btnBack) {
            btnBack.addEventListener('click', () => {
                App.switchView('view-home');
            });
        }

        // Filter Button
        const btnOpenFilter = document.getElementById('btn-open-advisor-filter');
        if (btnOpenFilter) {
            btnOpenFilter.addEventListener('click', () => {
                FilterModal.open('advisor');
            });
        }
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
        
        // Extract academic years using regex from s.year string
        const acadYearsSet = new Set();
        students.forEach(s => {
            const match = s.year ? s.year.toString().match(/\(ปี\s*([^)]+)\)/) : null;
            if (match && match[1]) acadYearsSet.add(match[1].split('/').pop());
            else if (s.academicYear) acadYearsSet.add(s.academicYear.toString());
        });
        const academicYears = Array.from(acadYearsSet).sort((a, b) => parseInt(b) - parseInt(a));

        const years = [...new Set(students.map(s => s.year.toString().split(' ')[0]))].sort((a, b) => parseInt(a) - parseInt(b));

        const acaYearSelect = document.getElementById('adv-filter-academic-year');
        if(acaYearSelect) {
            const currentVal = acaYearSelect.value;
            acaYearSelect.innerHTML = '<option value="">ปีการศึกษา</option>';
            academicYears.forEach(y => {
                const opt = document.createElement('option');
                opt.value = y; opt.innerText = y;
                acaYearSelect.appendChild(opt);
            });
            if (academicYears.includes(currentVal)) acaYearSelect.value = currentVal;
        }

        const yearSelect = document.getElementById('adv-filter-year');
        if(yearSelect) {
            const currentYear = yearSelect.value;
            yearSelect.innerHTML = '<option value="">ชั้นปี</option>';
            years.forEach(y => {
                const opt = document.createElement('option');
                opt.value = y; opt.innerText = y;
                yearSelect.appendChild(opt);
            });
            if (years.includes(currentYear)) yearSelect.value = currentYear;
        }

        this.updateRoomDropdown();
        this.updateSubjectDropdown();
    },

    updateRoomDropdown() {
        const acaYearSelect = document.getElementById('adv-filter-academic-year');
        const yearSelect = document.getElementById('adv-filter-year');
        const roomSelect = document.getElementById('adv-filter-room');
        if (!roomSelect) return;

        const selectedAcaYear = acaYearSelect ? acaYearSelect.value : '';
        const selectedYear = yearSelect ? yearSelect.value : '';
        const students = Store.getStudents();
        const currentRoom = roomSelect.value;

        // Filter students by acaYear and gradeLevel
        let filteredStudents = students;
        if (selectedAcaYear || selectedYear) {
            filteredStudents = students.filter(s => {
                const match = s.year ? s.year.toString().match(/\(ปี\s*([^)]+)\)/) : null;
                const acaYear = match ? match[1].split('/').pop() : (s.academicYear ? s.academicYear.toString() : '');
                const yearLevel = s.year.toString().split(' ')[0];
                
                let ok = true;
                if (selectedAcaYear && acaYear !== selectedAcaYear) ok = false;
                if (selectedYear && yearLevel !== selectedYear) ok = false;
                return ok;
            });
        }
        
        const rooms = [...new Set(filteredStudents.map(s => s.room.toString()))].sort((a, b) => a.localeCompare(b, 'th', { numeric: true }));

        roomSelect.innerHTML = '<option value="">ห้อง</option>';
        rooms.forEach(r => {
            const opt = document.createElement('option');
            opt.value = r; opt.innerText = r;
            roomSelect.appendChild(opt);
        });

        // Restore previous selection if still valid
        if (rooms.includes(currentRoom)) {
            roomSelect.value = currentRoom;
        } else {
            roomSelect.value = '';
        }
    },

    updateSubjectDropdown() {
        const acaYearSelect = document.getElementById('adv-filter-academic-year');
        const yearSelect = document.getElementById('adv-filter-year');
        const subSelect = document.getElementById('adv-filter-subject');
        if (!subSelect) return;

        const selectedAcaYear = acaYearSelect ? acaYearSelect.value : '';
        const selectedYear = yearSelect ? yearSelect.value : '';
        const subjects = Store.getSubjects();
        const currentSubId = subSelect.value;

        // Filter subjects by year if a year is selected
        let filteredSubjects = subjects;
        if (selectedAcaYear || selectedYear) {
            filteredSubjects = subjects.filter(s => {
                const match = s.year ? s.year.toString().match(/\(ปี\s*([^)]+)\)/) : null;
                const acaYear = match ? match[1].split('/').pop() : (s.academicYear ? s.academicYear.toString() : '');
                const yearLevel = s.year.toString().split(' ')[0];
                
                let ok = true;
                if (selectedAcaYear && acaYear !== selectedAcaYear) ok = false;
                if (selectedYear && yearLevel !== selectedYear) ok = false;
                return ok;
            });
        }

        // Sort by term (smaller first), then alphabetically
        filteredSubjects.sort((a, b) => {
            const termMatchA = a.name.match(/\(เทอม\s+(\d+)\)/);
            const termMatchB = b.name.match(/\(เทอม\s+(\d+)\)/);
            const termA = termMatchA ? parseInt(termMatchA[1]) : 0;
            const termB = termMatchB ? parseInt(termMatchB[1]) : 0;
            
            if (termA !== termB) {
                return termA - termB;
            }
            return a.name.localeCompare(b.name, 'th');
        });

        subSelect.innerHTML = '<option value="">-- เลือกวิชา (จำเป็น) --</option>';
        filteredSubjects.forEach(sub => {
            const opt = document.createElement('option');
            opt.value = sub.id; opt.innerText = sub.name;
            subSelect.appendChild(opt);
        });

        // Restore previous selection if still valid
        if (filteredSubjects.find(s => s.id === currentSubId)) {
            subSelect.value = currentSubId;
        } else {
            subSelect.value = '';
        }
    },

    renderTable() {
        let students = Store.getStudents();
        const subjects = Store.getSubjects();
        const scores = Store.getScores();

        // Filters
        const fAcaYear = document.getElementById('adv-filter-academic-year') ? document.getElementById('adv-filter-academic-year').value : '';
        const fYear = document.getElementById('adv-filter-year') ? document.getElementById('adv-filter-year').value : '';
        const fRoom = document.getElementById('adv-filter-room') ? document.getElementById('adv-filter-room').value : '';
        const fName = document.getElementById('adv-search-student') ? document.getElementById('adv-search-student').value.trim().toLowerCase() : '';
        const fSubId = document.getElementById('adv-filter-subject') ? document.getElementById('adv-filter-subject').value : '';

        if (fAcaYear) {
            students = students.filter(s => {
                const match = s.year ? s.year.toString().match(/\(ปี\s*([^)]+)\)/) : null;
                const acaYear = match ? match[1].split('/').pop() : (s.academicYear ? s.academicYear.toString() : '');
                return acaYear === fAcaYear;
            });
        }
        if (fYear) students = students.filter(s => s.year.toString().startsWith(fYear));
        if (fRoom) students = students.filter(s => s.room.toString() === fRoom);
        if (fName) students = students.filter(s => `${s.firstName} ${s.lastName}`.toLowerCase().includes(fName));

        // Students are kept in chronological order from Store

        const tbody = document.getElementById('adv-table-body');
        const thead = document.getElementById('adv-table-header');
        
        // Render Header
        if (thead) {
            thead.innerHTML = `
                <th style="padding: 12px 14px; color: #1d1d1f; font-weight: 600; text-align: center;">ปีการศึกษา</th>
                <th style="padding: 12px 14px; color: #1d1d1f; font-weight: 600; text-align: center;">ชั้นปี</th>
                <th style="padding: 12px 14px; color: #1d1d1f; font-weight: 600; text-align: center;">ห้อง</th>
                <th style="padding: 12px 14px; color: #1d1d1f; font-weight: 600; text-align: center; min-width: 150px;">ชื่อ - นามสกุล</th>
                <th style="padding: 12px 14px; color: #1d1d1f; font-weight: 600; text-align: center;">สิทธิ์</th>
                <th style="padding: 12px 14px; color: #1d1d1f; font-weight: 600; text-align: center; min-width: 100px;">คะแนน</th>
            `;
        }

        // Render Body
        tbody.innerHTML = '';
        
        if (students.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 20px; color: var(--apple-gray);">ไม่พบข้อมูลนักเรียน</td></tr>`;
            if (document.getElementById('adv-pagination')) {
                document.getElementById('adv-pagination').innerHTML = '';
            }
            return;
        }

        const selectedSubject = fSubId ? subjects.find(sub => sub.id === fSubId) : null;

        const totalItems = students.length;
        const totalPages = Math.ceil(totalItems / this.itemsPerPage);
        
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const paginatedStudents = students.slice(startIndex, endIndex);

        paginatedStudents.forEach(s => {
            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid #f2f2f7';
            
            const displayGrade = s.year.toString().split(' ')[0];
            const match = s.year ? s.year.toString().match(/\(ปี\s*([^)]+)\)/) : null;
            const displayAcaYear = match ? match[1] : (s.academicYear || '-');
            let displayTerm = '-';
            if (selectedSubject) {
                const termMatch = selectedSubject.name.match(/\(เทอม\s*(\d+)\)/);
                if (termMatch) displayTerm = termMatch[1];
            }
            const combinedAcaYear = displayTerm !== '-' ? `${displayTerm}/${displayAcaYear}` : displayAcaYear;

            // Eligibility Badge
            const eligBadge = s.isEligible 
                ? `<span style="background: #e8f5e9; color: #2e7d32; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;">มี</span>`
                : `<span style="background: #f5f5f7; color: #6e6e73; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;">ไม่มี</span>`;

            // Find Score if subject selected
            let scoreText = '-';
            if (selectedSubject) {
                const sc = scores.find(x => x.studentId === s.id && x.subjectId === selectedSubject.id);
                scoreText = sc ? `${sc.score}/${sc.total}` : '-';
            }

            let tdHTML = `
                <td style="padding: 12px; text-align: center; color: #1d1d1f; font-weight: 500;">${combinedAcaYear}</td>
                <td style="padding: 12px; text-align: center; color: #1d1d1f;">${displayGrade}</td>
                <td style="padding: 12px; text-align: center; color: #1d1d1f;">${s.room}</td>
                <td style="padding: 12px; text-align: center; color: #1d1d1f; font-weight: 500;">${s.firstName} ${s.lastName}</td>
                <td style="padding: 12px; text-align: center;">${eligBadge}</td>
                <td style="padding: 12px; text-align: center; font-size: 14px; font-weight: 600; color: var(--apple-blue);">${scoreText}</td>
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
