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
        // Filter event listeners for Login screen
        ['stu-filter-year', 'stu-filter-room', 'stu-filter-name'].forEach(id => {
            const el = document.getElementById(id);
            if(el) el.addEventListener('input', () => {
                this.currentPage = 1;
                this.renderLoginTable();
            });
        });

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

                const reader = new FileReader();
                reader.onload = (event) => {
                    const img = new Image();
                    img.onload = () => {
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');
                        const maxSize = 200;
                        let width = img.width;
                        let height = img.height;

                        if (width > height) {
                            if (width > maxSize) {
                                height *= maxSize / width;
                                width = maxSize;
                            }
                        } else {
                            if (height > maxSize) {
                                width *= maxSize / height;
                                height = maxSize;
                            }
                        }

                        canvas.width = width;
                        canvas.height = height;
                        ctx.drawImage(img, 0, 0, width, height);

                        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                        
                        if (App.currentUser && App.currentUser.data && App.currentUser.data.id) {
                            Store.updateStudent(App.currentUser.data.id, { profilePicture: dataUrl }).then(() => {
                                App.currentUser.data.profilePicture = dataUrl;
                                this.renderDashboard();
                            });
                        }
                    };
                    img.src = event.target.result;
                };
                reader.readAsDataURL(file);
            });
        }
    },

    loadLoginFilters() {
        const students = Store.getStudents();
        const years = [...new Set(students.map(s => s.year))].sort((a, b) => parseInt(a) - parseInt(b));
        const rooms = [...new Set(students.map(s => s.room))].sort((a, b) => a.localeCompare(b, 'th', { numeric: true }));

        const yearSelect = document.getElementById('stu-filter-year');
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

    renderLoginTable() {
        let students = Store.getStudents();

        // Filters
        const fYear = document.getElementById('stu-filter-year') ? document.getElementById('stu-filter-year').value : '';
        const fRoom = document.getElementById('stu-filter-room') ? document.getElementById('stu-filter-room').value : '';
        const fName = document.getElementById('stu-filter-name') ? document.getElementById('stu-filter-name').value.trim().toLowerCase() : '';

        if (fYear) students = students.filter(s => s.year.toString() === fYear);
        if (fRoom) students = students.filter(s => s.room.toString() === fRoom);
        if (fName) students = students.filter(s => `${s.firstName} ${s.lastName}`.toLowerCase().includes(fName));

        // Sort: Year -> Room -> Name
        students.sort((a, b) => {
            const yearA = parseInt(a.year) || 0;
            const yearB = parseInt(b.year) || 0;
            if (yearA !== yearB) return yearA - yearB;
            
            const roomCompare = a.room.localeCompare(b.room, 'th', { numeric: true });
            if (roomCompare !== 0) return roomCompare;
            
            return a.firstName.localeCompare(b.firstName, 'th');
        });

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
            tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 20px; color: var(--apple-gray);">ไม่พบข้อมูลที่ตรงกัน</td></tr>`;
            if (document.getElementById('stu-login-pagination')) {
                document.getElementById('stu-login-pagination').innerHTML = '';
            }
            return;
        }

        paginatedStudents.forEach(s => {
            const tr = document.createElement('tr');
            
            let tdHTML = `
                <td style="padding: 16px; font-size: 14px;">${s.year}</td>
                <td style="padding: 16px; font-size: 14px;">${s.room}</td>
                <td style="padding: 16px; font-size: 14px; font-weight: 500;">${s.firstName} ${s.lastName}</td>
                <td style="padding: 16px; font-size: 14px; text-align: right;">
                    <button class="btn btn-primary btn-select-student" style="padding: 6px 16px; font-size: 13px;" data-id="${s.id}">เลือก</button>
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
        document.getElementById('student-dash-greeting').innerText = `สวัสดี ${user.firstName} ${user.lastName}`;

        // Render eligibility badge
        const badge = document.getElementById('student-eligibility-badge');
        if (user.isEligible) {
            badge.className = 'badge elig-yes';
            badge.innerText = 'มีสิทธิ์สอบ';
        } else {
            badge.className = 'badge elig-no';
            badge.innerText = 'ไม่มีสิทธิ์สอบ';
        }

        const subjects = Store.getSubjects();
        const availableSubs = subjects.filter(s => s.year === user.year).sort((a, b) => a.name.localeCompare(b.name, 'th'));
        
        const listEl = document.getElementById('student-exams-list');
        listEl.innerHTML = '';

        if (availableSubs.length === 0) {
            listEl.innerHTML = '<p style="color:var(--apple-gray)">ยังไม่มีวิชาที่อยู่ในระบบ</p>';
            return;
        }

        const scores = Store.getStudentScores(user.id);

        availableSubs.forEach(sub => {
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

            const leftHtml = `
                <div>
                    <div style="font-weight: 700; font-size: 16px; color: #1d1d1f; margin-bottom: 4px;">${sub.name}</div>
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
                        <div style="color: #34c759; font-size: 18px; font-weight: 700;">${hasTaken.score}/${hasTaken.total}</div>
                        <div style="color: #86868b; font-size: 12px; margin-top: 2px;">สอบแล้ว</div>
                    </div>
                `;
            } else if (questionsCount === 0) {
                rightHtml = `<div style="color: #86868b; font-size: 14px;">ยังไม่มีข้อสอบ</div>`;
            } else if (!user.isEligible) {
                rightHtml = `<button class="btn btn-secondary" disabled style="padding: 6px 16px; font-size: 13px;">ไม่มีสิทธิ์สอบ</button>`;
            } else if (!sub.isOpen) {
                rightHtml = `<button class="btn btn-secondary" disabled style="padding: 6px 16px; font-size: 13px;">ยังไม่เปิดสอบ</button>`;
            } else {
                rightHtml = `<button class="btn btn-primary btn-take-exam" data-id="${sub.id}" style="padding: 8px 20px; font-size: 14px; font-weight: 600; border-radius: 8px;">เริ่มทำข้อสอบ</button>`;
            }

            div.innerHTML = leftHtml + rightHtml;
            listEl.appendChild(div);
        });

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
        document.getElementById('exam-subject-display').innerText = `วิชา: ${sub.name}`;
        
        this.currentExam = {
            subjectId: subjectId,
            questions: questions,
            answers: new Array(questions.length).fill(-1),
            currentIndex: 0
        };

        this.renderQuestion(0);
        this.renderPagination();
        App.switchView('view-exam-room');
    },

    renderQuestion(index) {
        this.currentExam.currentIndex = index;
        const q = this.currentExam.questions[index];
        const area = document.getElementById('exam-taking-area');
        
        document.getElementById('exam-counter-pill').innerText = `ข้อ ${index + 1}/${this.currentExam.questions.length}`;

        area.innerHTML = '';

        const qTitle = document.createElement('p');
        qTitle.style.fontSize = '16px';
        qTitle.style.fontWeight = '700';
        qTitle.style.color = '#1d1d1f';
        qTitle.style.marginBottom = '20px';
        qTitle.innerText = `ข้อที่ ${index + 1}: ${q.questionText}`;
        area.appendChild(qTitle);
        
        q.choices.forEach((choice, cIndex) => {
            const label = document.createElement('label');
            label.style.display = 'flex';
            label.style.alignItems = 'center';
            label.style.gap = '12px';
            label.style.border = '1px solid #e5e5ea';
            label.style.borderRadius = '8px';
            label.style.padding = '14px 20px';
            label.style.marginBottom = '12px';
            label.style.cursor = 'pointer';
            
            // Highlight selected
            if (this.currentExam.answers[index] === cIndex) {
                label.style.borderColor = '#0ea5e9';
                label.style.background = '#f0f9ff';
            }

            label.innerHTML = `
                <input type="radio" name="q_current" value="${cIndex}" ${this.currentExam.answers[index] === cIndex ? 'checked' : ''} style="accent-color: #0ea5e9;">
                <span style="font-size: 15px; color: #1d1d1f;">${choice}</span>
            `;
            
            label.addEventListener('change', (e) => {
                this.currentExam.answers[index] = parseInt(e.target.value);
                this.renderQuestion(index); // Re-render to show selected styling
                this.renderPagination(); // Re-render pagination to show answered state
            });

            area.appendChild(label);
        });
    },

    renderPagination() {
        const pagArea = document.getElementById('exam-pagination');
        pagArea.innerHTML = '';
        
        this.currentExam.questions.forEach((_, idx) => {
            const btn = document.createElement('button');
            btn.innerText = idx + 1;
            btn.style.width = '40px';
            btn.style.height = '40px';
            btn.style.borderRadius = '8px';
            btn.style.border = 'none';
            btn.style.fontWeight = '600';
            btn.style.cursor = 'pointer';
            
            if (idx === this.currentExam.currentIndex) {
                // Active page
                btn.style.background = '#0ea5e9';
                btn.style.color = 'white';
            } else if (this.currentExam.answers[idx] !== -1) {
                // Answered
                btn.style.background = '#e3fbed';
                btn.style.color = '#1e7e46';
                btn.style.border = '1px solid #1e7e46';
            } else {
                // Unanswered
                btn.style.background = 'white';
                btn.style.color = '#1d1d1f';
                btn.style.border = '1px solid #d2d2d7';
            }

            btn.addEventListener('click', () => {
                this.renderQuestion(idx);
                this.renderPagination();
            });

            pagArea.appendChild(btn);
        });
    },

    submitExam() {
        // Find unanswered
        const unanswered = [];
        this.currentExam.answers.forEach((ans, idx) => {
            if (ans === -1) unanswered.push(idx + 1);
        });

        if (unanswered.length > 0) {
            App.showModal(`คุณยังไม่ได้ตอบข้อ: ${unanswered.join(', ')} กรุณาตอบให้ครบก่อนส่ง`, null);
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
        document.getElementById('result-subject-title').innerText = sub.name;
        document.getElementById('result-score').innerText = score;
        document.getElementById('result-total').innerText = total;

        App.switchView('view-exam-result');
        this.currentExam = null; // reset
    }
};

window.StudentPortal = StudentPortal;
