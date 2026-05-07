const StudentPortal = {
    currentExam: null, // Holds the current exam state {subjectId, questions, answers, currentIndex}
    currentPage: 1,
    itemsPerPage: 50,
    
    init() {
        this.bindEvents();
        const stuNav = document.getElementById('menu-student');
        if(stuNav) {
            stuNav.addEventListener('click', () => {
                this.loadLoginFilters();
                this.renderLoginTable();
            });
        }
    },

    bindEvents() {
        // Filter Button
        const btnOpenFilter = document.getElementById('btn-open-student-filter');
        if (btnOpenFilter) {
            btnOpenFilter.addEventListener('click', () => {
                FilterModal.open('student');
            });
        }

        // Exam Submission & Controls
        const btnSubmit = document.getElementById('btn-submit-exam');
        if(btnSubmit) {
            btnSubmit.addEventListener('click', () => {
                this.submitExam();
            });
        }

        const btnCancelPrep = document.getElementById('btn-cancel-exam-prep');
        if (btnCancelPrep) {
            btnCancelPrep.addEventListener('click', () => {
                App.switchView('view-student-dashboard');
            });
        }

        const btnStartNow = document.getElementById('btn-start-exam-now');
        if (btnStartNow) {
            btnStartNow.addEventListener('click', () => {
                if(this.currentExam && this.currentExam.subjectId) {
                    this.startExam(this.currentExam.subjectId);
                }
            });
        }

        const btnCancelExam = document.getElementById('btn-cancel-exam');
        if (btnCancelExam) {
            btnCancelExam.addEventListener('click', () => {
                App.showModal('ยืนยันการยกเลิกใช่หรือไม่? ข้อมูลที่คุณทำไว้จะถูกลบทั้งหมด', () => {
                    this.currentExam = null; // Clear state
                    this.renderDashboard();
                    App.switchView('view-student-dashboard');
                });
            });
        }

        // Back to dash from result
        const btnBack = document.getElementById('btn-back-student-dash');
        if(btnBack) {
            btnBack.addEventListener('click', () => {
                this.renderDashboard();
                App.switchView('view-student-dashboard');
            });
        }

        // Avatar Upload
        const avatarUpload = document.getElementById('student-avatar-upload');
        if (avatarUpload) {
            avatarUpload.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (!file) return;
                this.openCropModal(file);
            });
        }

        // Crop Modal Controls
        document.getElementById('btn-crop-cancel').addEventListener('click', () => {
            this.closeCropModal();
        });

        document.getElementById('btn-crop-done').addEventListener('click', () => {
            this.saveCroppedAvatar();
        });
    },

    cropper: null,
    openCropModal(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const cropImage = document.getElementById('crop-image');
            cropImage.src = e.target.result;
            
            document.getElementById('crop-modal').classList.remove('hidden');
            
            if (this.cropper) {
                this.cropper.destroy();
            }
            
            this.cropper = new Cropper(cropImage, {
                aspectRatio: 1,
                viewMode: 1, // Restrict crop box to not exceed image
                dragMode: 'move', // Allow moving the image behind the crop box
                autoCropArea: 0.8,
                restore: false,
                guides: false,
                center: false,
                highlight: false,
                cropBoxMovable: false,
                cropBoxResizable: false,
                toggleDragModeOnDblclick: false,
                background: false,
                modal: true,
                movable: true,
                zoomable: true,
                touchDragZoom: true,
                preview: '#student-avatar-preview' // Real-time preview on dashboard
            });
        };
        reader.readAsDataURL(file);
    },

    closeCropModal() {
        document.getElementById('crop-modal').classList.add('hidden');
        if (this.cropper) {
            this.cropper.destroy();
            this.cropper = null;
        }
        document.getElementById('student-avatar-upload').value = '';
    },

    async saveCroppedAvatar() {
        if (!this.cropper) return;
        
        const canvas = this.cropper.getCroppedCanvas({
            width: 300,
            height: 300
        });
        
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        
        if (App.currentUser && App.currentUser.data && App.currentUser.data.id) {
            await Store.updateStudent(App.currentUser.data.id, { profilePicture: dataUrl });
            App.currentUser.data.profilePicture = dataUrl;
            this.closeCropModal();
            this.renderDashboard();
        }
    },
    loadLoginFilters() {
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
        const rooms = [...new Set(students.map(s => s.room))].sort((a, b) => a.localeCompare(b, 'th', { numeric: true }));

        const acaYearSelect = document.getElementById('stu-filter-academic-year');
        if(acaYearSelect) {
            const currentVal = acaYearSelect.value;
            acaYearSelect.innerHTML = '<option value="">ปีการศึกษา</option>';
            academicYears.forEach(y => {
                const opt = document.createElement('option');
                opt.value = y; opt.innerText = y;
                acaYearSelect.appendChild(opt);
            });
            if (academicYears.includes(currentVal)) acaYearSelect.value = currentVal;
            
            acaYearSelect.onchange = () => {
                this.updateCascadingFilters();
            };
        }

        const yearSelect = document.getElementById('stu-filter-year');
        if(yearSelect) {
            const currentYear = yearSelect.value;
            yearSelect.innerHTML = '<option value="">ชั้นปี</option>';
            
            // Get unique cleaned grades
            const cleanedGrades = [...new Set(years.map(y => y.toString().split(' ')[0]))]
                .sort((a, b) => parseInt(a) - parseInt(b));

            cleanedGrades.forEach(cg => {
                const opt = document.createElement('option');
                opt.value = cg; 
                opt.innerText = cg;
                yearSelect.appendChild(opt);
            });
            if (cleanedGrades.includes(currentYear)) yearSelect.value = currentYear;

            yearSelect.onchange = () => {
                this.updateCascadingFilters();
            };
        }

        const roomSelect = document.getElementById('stu-filter-room');
        if(roomSelect) {
            const currentRoom = roomSelect.value;
            roomSelect.innerHTML = '<option value="">ห้อง</option>';
            rooms.forEach(r => {
                const opt = document.createElement('option');
                opt.value = r; opt.innerText = r;
                roomSelect.appendChild(opt);
            });
            if (rooms.includes(currentRoom)) roomSelect.value = currentRoom;
        }
    },

    updateCascadingFilters() {
        const students = Store.getStudents();
        const fAcaYear = document.getElementById('stu-filter-academic-year') ? document.getElementById('stu-filter-academic-year').value : '';
        const fYear = document.getElementById('stu-filter-year') ? document.getElementById('stu-filter-year').value : '';
        
        let filtered = students;
        if (fAcaYear) {
            filtered = filtered.filter(s => {
                const match = s.year ? s.year.toString().match(/\(ปี\s*([^)]+)\)/) : null;
                const acaYear = match ? match[1].split('/').pop() : (s.academicYear ? s.academicYear.toString() : '');
                return acaYear === fAcaYear;
            });
        }
        if (fYear) {
            filtered = filtered.filter(s => s.year.toString().startsWith(fYear));
        }

        const rooms = [...new Set(filtered.map(s => s.room))].sort((a, b) => a.localeCompare(b, 'th', { numeric: true }));
        const roomSelect = document.getElementById('stu-filter-room');
        if (roomSelect) {
            const current = roomSelect.value;
            roomSelect.innerHTML = '<option value="">ห้อง</option>';
            rooms.forEach(r => {
                const opt = document.createElement('option');
                opt.value = r; opt.innerText = r;
                roomSelect.appendChild(opt);
            });
            if (rooms.includes(current)) roomSelect.value = current;
        }
    },

    renderLoginTable() {
        let students = Store.getStudents();

        // Filters
        const fAcaYear = document.getElementById('stu-filter-academic-year') ? document.getElementById('stu-filter-academic-year').value : '';
        const fYear = document.getElementById('stu-filter-year') ? document.getElementById('stu-filter-year').value : '';
        const fRoom = document.getElementById('stu-filter-room') ? document.getElementById('stu-filter-room').value : '';
        const fName = document.getElementById('stu-filter-name') ? document.getElementById('stu-filter-name').value.trim().toLowerCase() : '';

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

        // Pagination logic
        const totalItems = students.length;
        const totalPages = Math.ceil(totalItems / this.itemsPerPage);

        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const paginatedStudents = students.slice(startIndex, endIndex);

        // Render Body
        const tbody = document.getElementById('stu-login-table-body');
        if(!tbody) return;
        tbody.innerHTML = '';
        
        if (students.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 40px; color: #86868b;">ไม่พบข้อมูลนักเรียนที่ตรงกัน</td></tr>`;
            if (document.getElementById('stu-login-pagination')) {
                document.getElementById('stu-login-pagination').innerHTML = '';
            }
            return;
        }

        paginatedStudents.forEach(s => {
            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid #f2f2f7';
            
            const displayGrade = s.year.toString().split(' ')[0];
            const match = s.year ? s.year.toString().match(/\(ปี\s*([^)]+)\)/) : null;
            const displayAcaYear = match ? match[1] : (s.academicYear || '-');
            
            let tdHTML = `
                <td style="padding: 12px; text-align: center; color: #1d1d1f; font-weight: 500;">${displayAcaYear}</td>
                <td style="padding: 12px; text-align: center; color: #1d1d1f;">${displayGrade}</td>
                <td style="padding: 12px; text-align: center; color: #1d1d1f;">${s.room}</td>
                <td style="padding: 12px; text-align: center; color: #1d1d1f; font-weight: 500;">${s.firstName} ${s.lastName}</td>
                <td style="padding: 12px; text-align: center;">
                    <span style="background: #e8f5e9; color: #2e7d32; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 600;">มี</span>
                </td>
                <td style="padding: 12px; text-align: center;">
                    <button class="btn btn-primary btn-select-student" style="padding: 5px 16px; font-size: 12px; border-radius: 8px; background: #0071e3; border: none; color: white; cursor: pointer; font-weight: 600;" data-id="${s.id}">เลือก</button>
                </td>
            `;

            tr.innerHTML = tdHTML;
            tbody.appendChild(tr);
        });

        document.querySelectorAll('.btn-select-student').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.getAttribute('data-id');
                const m = Store.getStudents().find(st => st.id === id);
                if(m) {
                    App.login('student', m);
                    if(document.getElementById('stu-filter-name')) document.getElementById('stu-filter-name').value = '';
                    this.renderDashboard();
                }
            });
        });

        this.renderLoginPagination(totalPages);
    },

    renderLoginPagination(totalPages) {
        const pagContainer = document.getElementById('stu-login-pagination');
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
                this.renderLoginTable();
            });
            pagContainer.appendChild(btn);
        }
    },

    renderDashboard() {
        const user = App.currentUser.data;
        
        // Avatar
        const avatarPreview = document.getElementById('student-avatar-preview');
        if (avatarPreview) {
            if (user.profilePicture) {
                avatarPreview.innerHTML = `<img src="${user.profilePicture}" style="width: 100%; height: 100%; object-fit: cover;">`;
            } else {
                avatarPreview.innerHTML = `
                    <svg id="student-avatar-default" viewBox="0 0 24 24" width="40" height="40" stroke="#0ea5e9" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                `;
            }
        }

        // Greeting
        document.getElementById('student-dash-greeting').innerText = `${user.firstName} ${user.lastName}`;
        const infoEl = document.getElementById('student-dash-info');
        if (infoEl) {
            infoEl.innerText = `ชั้นปี ${user.year.toString().split(' ')[0]} ห้อง ${user.room}`;
        }

        const subjects = Store.getSubjects();

        // Helper: extract year level and academic year from a year string
        // e.g. "1 (ปี 1/2567)" or "1 (ปี 2567)" → { level: "1", acadYear: "2567" }
        const parseYear = (yearStr) => {
            if (!yearStr) return { level: '', acadYear: '' };
            const str = yearStr.toString();
            const level = str.split(' ')[0];
            // New format: (ปี 1/2567) or (ปี 2/2567)
            const matchNew = str.match(/\(ปี\s*\d+\/(\d+)\)/);
            if (matchNew) return { level, acadYear: matchNew[1] };
            // Old format: (ปี 2567)
            const matchOld = str.match(/\(ปี\s*(\d+)\)/);
            if (matchOld) return { level, acadYear: matchOld[1] };
            return { level, acadYear: '' };
        };

        const userParsed = parseYear(user.year);
        const availableSubs = subjects.filter(s => {
            const subParsed = parseYear(s.year);
            return subParsed.level === userParsed.level && subParsed.acadYear === userParsed.acadYear;
        });
        // Kept in chronological order from Store

        
        const containerEl = document.getElementById('student-exams-container');
        if (!containerEl) return;
        containerEl.innerHTML = '';

        if (availableSubs.length === 0) {
            containerEl.innerHTML = '<p style="color:var(--apple-gray)">ยังไม่มีวิชาที่อยู่ในระบบ</p>';
            return;
        }

        const scores = Store.getStudentScores(user.id);

        const renderSubjectCard = (sub) => {
            const hasTaken = scores.find(sc => sc.subjectId === sub.id);
            const questionsCount = Store.getExamsBySubject(sub.id).length;
            
            const div = document.createElement('div');
            div.style.border = '1px solid #e5e5ea';
            div.style.borderRadius = '12px';
            div.style.padding = '16px 20px';
            div.style.display = 'flex';
            div.style.justifyContent = 'space-between';
            div.style.alignItems = 'center';
            div.style.background = 'white';
            
            let statusDotHtml = sub.isOpen 
                ? `<span style="color: #34c759;"><span style="display: inline-block; width: 6px; height: 6px; background: #34c759; border-radius: 50%; margin-right: 4px; vertical-align: middle;"></span>เปิดสอบ</span>` 
                : `<span style="color: #86868b;"><span style="display: inline-block; width: 6px; height: 6px; background: #86868b; border-radius: 50%; margin-right: 4px; vertical-align: middle;"></span>ปิดชั่วคราว</span>`;

            let displayName = sub.name;
            const termMatch = sub.name.match(/\(เทอม\s+(\d+)\)$/);
            if (termMatch) {
                displayName = sub.name.replace(/\s*\(เทอม\s+\d+\)$/, '');
            }

            const leftHtml = `
                <div>
                    <div style="font-weight: 500; font-size: 16px; color: #1d1d1f; margin-bottom: 4px;">${displayName}</div>
                    <div style="font-size: 13px; color: #86868b; display: flex; align-items: center; gap: 12px;">
                        <span>${questionsCount} ข้อ</span>
                        ${statusDotHtml}
                    </div>
                </div>
            `;

            let rightHtml = '';
            if (hasTaken) {
                rightHtml = `
                    <div style="text-align: right;">
                        <div style="color: var(--apple-blue); font-size: 18px; font-weight: 700;">${hasTaken.score}/${hasTaken.total}</div>
                        <div style="color: #86868b; font-size: 12px; margin-top: 2px;">สอบแล้ว</div>
                    </div>
                `;
            } else if (questionsCount === 0) {
                rightHtml = `<div style="color: #86868b; font-size: 14px;">ยังไม่มีข้อสอบ</div>`;
            } else if (!user.isEligible) {
                rightHtml = `<button class="btn btn-secondary" disabled style="padding: 6px 16px; font-size: 13px;">ไม่มีสิทธิ์</button>`;
            } else if (!sub.isOpen) {
                rightHtml = `<button class="btn btn-secondary" disabled style="padding: 6px 16px; font-size: 13px;">ยังไม่เปิดสอบ</button>`;
            } else {
                rightHtml = `<button class="btn btn-primary btn-take-exam" data-id="${sub.id}" style="padding: 8px 20px; font-size: 14px; font-weight: 600; border-radius: 8px;">สอบ</button>`;
            }

            div.innerHTML = leftHtml + rightHtml;
            return div;
        };

        const term1Subs = [];
        const term2Subs = [];
        const otherSubs = [];

        availableSubs.forEach(sub => {
            // First try to get term from name (legacy) then from year (new format)
            let term = null;
            const termMatchName = sub.name.match(/\(เทอม\s+(\d+)\)$/);
            const termMatchYear = sub.year ? sub.year.toString().match(/\(ปี\s*(\d+)\//) : null;
            
            if (termMatchYear) term = termMatchYear[1];
            else if (termMatchName) term = termMatchName[1];

            if (term === '1') term1Subs.push(sub);
            else if (term === '2') term2Subs.push(sub);
            else otherSubs.push(sub);
        });

        const renderGroupCard = (title, subs) => {
            if (subs.length === 0) return;
            
            const card = document.createElement('div');
            card.style.background = 'white';
            card.style.borderRadius = '12px';
            card.style.border = '1px solid #e5e5ea';
            card.style.padding = '24px';

            const header = document.createElement('h3');
            header.innerText = title;
            header.style.fontSize = '18px';
            header.style.fontWeight = '700';
            header.style.marginBottom = '20px';
            header.style.color = '#1d1d1f';
            card.appendChild(header);

            const list = document.createElement('div');
            list.style.display = 'flex';
            list.style.flexDirection = 'column';
            list.style.gap = '16px';
            
            subs.forEach(sub => {
                list.appendChild(renderSubjectCard(sub));
            });
            
            card.appendChild(list);
            containerEl.appendChild(card);
        };

        // Build title with academic year extracted from first subject in each group
        const getAcadYear = (subs) => {
            if (subs.length === 0) return '';
            const sub = subs[0];
            // New format: "1 (ปี 1/2567)" → extract "2567"
            const matchNew = sub.year ? sub.year.toString().match(/\(ปี\s*\d+\/(\d+)\)/) : null;
            if (matchNew) return '/' + matchNew[1];
            // Fallback: "1 (ปี 2567)" → extract "2567"
            const matchOld = sub.year ? sub.year.toString().match(/\(ปี\s*(\d+)\)/) : null;
            if (matchOld) return '/' + matchOld[1];
            return '';
        };

        renderGroupCard(`1${getAcadYear(term1Subs)}`, term1Subs);
        renderGroupCard(`2${getAcadYear(term2Subs)}`, term2Subs);
        renderGroupCard('อื่นๆ', otherSubs);



        document.querySelectorAll('.btn-take-exam').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const subId = e.target.getAttribute('data-id');
                this.prepExam(subId);
            });
        });
    },

    prepExam(subjectId) {
        // Pre-stage the exam state
        this.currentExam = {
            subjectId: subjectId,
            questions: [],
            answers: [],
            currentIndex: 0
        };
        App.switchView('view-exam-prep');
    },

    startExam(subjectId) {
        const questions = Store.getExamsBySubject(subjectId);
        if (questions.length === 0) {
            App.showModal('วิชานี้ยีงไม่มีข้อสอบ', null);
            return;
        }
        
        const sub = Store.getSubjects().find(s => s.id === subjectId);
        const headerTitle = document.getElementById('exam-header-title');
        if (headerTitle) {
            let displayName = sub.name;
            const termMatch = sub.name.match(/\(เทอม\s+(\d+)\)$/);
            if (termMatch) {
                displayName = sub.name.replace(/\s*\(เทอม\s+\d+\)$/, '');
            }
            headerTitle.innerText = `วิชา: ${displayName} (${questions.length} ข้อ)`;
        }
        
        this.currentExam = {
            subjectId: subjectId,
            questions: questions,
            answers: new Array(questions.length).fill(-1),
            currentIndex: 0
        };

        this.renderAllQuestions();
        App.switchView('view-exam-room');
    },

    renderAllQuestions() {
        const area = document.getElementById('exam-taking-area');
        area.innerHTML = '';

        this.currentExam.questions.forEach((q, qIndex) => {
            const qCard = document.createElement('div');
            qCard.style.background = 'white';
            qCard.style.border = '1px solid #e5e5ea';
            qCard.style.borderRadius = '12px';
            qCard.style.padding = '30px';
            qCard.style.marginBottom = '20px';

            const qText = document.createElement('p');
            qText.style.fontSize = '17px';
            qText.style.fontWeight = '700';
            qText.style.color = '#1d1d1f';
            qText.style.marginBottom = '20px';
            qText.innerText = `${qIndex + 1}. ${q.questionText}`;
            qCard.appendChild(qText);

            if (q.imageUrl && q.imageUrl.trim() !== '') {
                const img = document.createElement('img');
                img.src = q.imageUrl;
                img.onerror = function() { this.style.display = 'none'; };
                img.style.maxWidth = '100%';
                img.style.maxHeight = '300px';
                img.style.borderRadius = '8px';
                img.style.marginBottom = '20px';
                img.style.display = 'block';
                qCard.appendChild(img);
            }

            const choicesContainer = document.createElement('div');
            choicesContainer.style.display = 'flex';
            choicesContainer.style.flexDirection = 'column';
            choicesContainer.style.gap = '12px';

            q.choices.forEach((choice, cIndex) => {
                const label = document.createElement('label');
                label.className = 'radio-custom-container';
                label.style.display = 'flex';
                label.style.alignItems = 'center';
                label.style.gap = '12px';
                label.style.border = '1.5px solid #e5e5ea';
                label.style.borderRadius = '12px';
                label.style.padding = '14px 18px';
                label.style.cursor = 'pointer';
                label.style.transition = 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)';
                label.style.background = '#fff';
                
                // Unique Name for each question's radio group
                const radioName = `q_${qIndex}`;
                
                const isSelected = this.currentExam.answers[qIndex] === cIndex;
                if (isSelected) {
                    label.style.borderColor = '#0071e3';
                    label.style.background = '#f5faff';
                    label.style.boxShadow = '0 2px 8px rgba(0, 113, 227, 0.08)';
                }

                label.innerHTML = `
                    <input type="radio" name="${radioName}" value="${cIndex}" ${isSelected ? 'checked' : ''}>
                    <span class="radio-custom-mark"></span>
                    <span style="font-size: 15px; color: #1d1d1f; font-weight: 500;">${choice}</span>
                `;
                
                label.addEventListener('click', (e) => {
                    // Prevent double firing if clicking input directly
                    if (e.target.tagName === 'INPUT') return;
                    
                    const radio = label.querySelector('input');
                    radio.checked = true;
                    this.updateAnswer(qIndex, cIndex);
                });

                label.querySelector('input').addEventListener('change', () => {
                    this.updateAnswer(qIndex, cIndex);
                });

                choicesContainer.appendChild(label);
            });

            qCard.appendChild(choicesContainer);
            area.appendChild(qCard);
        });
    },

    updateAnswer(qIndex, cIndex) {
        this.currentExam.answers[qIndex] = cIndex;
        // Update styling of all labels for this question
        const radioName = `q_${qIndex}`;
        const labels = document.querySelectorAll(`input[name="${radioName}"]`);
        labels.forEach((radio, idx) => {
            const label = radio.closest('label');
            if (parseInt(radio.value) === cIndex) {
                label.style.borderColor = '#0ea5e9';
                label.style.background = '#f0f9ff';
            } else {
                label.style.borderColor = '#e5e5ea';
                label.style.background = 'white';
            }
        });
    },

    renderQuestion(index) {
        // Obsolete but kept for compatibility if needed elsewhere temporarily
    },

    renderPagination() {
        // Obsolete but kept for compatibility if needed elsewhere temporarily
    },

    submitExam() {
        // Find unanswered
        const unanswered = [];
        this.currentExam.answers.forEach((ans, idx) => {
            if (ans === -1) unanswered.push(idx + 1);
        });

        if (unanswered.length > 0) {
            App.showModal(`คุณยังทำข้อสอบไม่ครบ (ขาดอีก ${unanswered.length} ข้อ) กรุณาตอบให้ครบก่อนส่ง`, null);
            return;
        }

        App.showModal('ยืนยันการส่งข้อสอบใช่หรือไม่?', () => {
            this.evaluateExam();
        });
    },

    async evaluateExam() {
        let score = 0;
        const total = this.currentExam.questions.length;

        this.currentExam.questions.forEach((q, idx) => {
            if (this.currentExam.answers[idx] === parseInt(q.correctIndex)) {
                score++;
            }
        });

        const result = await Store.addScore(App.currentUser.data.id, this.currentExam.subjectId, score, total);
        if (!result.success) {
            console.error("Failed to save score:", result.error);
        }
        
        const sub = Store.getSubjects().find(s => s.id === this.currentExam.subjectId);
        let displayName = sub.name;
        const termMatch = sub.name.match(/\(เทอม\s+(\d+)\)$/);
        if (termMatch) {
            displayName = sub.name.replace(/\s*\(เทอม\s+\d+\)$/, '');
        }
        document.getElementById('result-subject-title').innerText = 'วิชา ' + displayName;
        document.getElementById('result-score').innerText = score;
        document.getElementById('result-total').innerText = total;

        App.switchView('view-exam-result');
        this.currentExam = null; // reset
    }
};

window.StudentPortal = StudentPortal;
