const AdminPortal = {
    init() {
        this.bindEvents();
        this.renderRooms();
        this.renderSubjects();
        this.renderExams();
        this.renderStudents();
        this.renderPromotion();
    },

    bindEvents() {
        // Admin Login
        document.getElementById('admin-login-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const pass = document.getElementById('admin-password').value;
            if (pass === 'pp1234') {
                App.login('admin', null);
            } else {
                document.getElementById('login-error').classList.remove('hidden');
            }
        });

        // Sidebar Navigation
        document.querySelectorAll('.admin-menu-item').forEach(item => {
            item.addEventListener('click', (e) => {
                document.querySelectorAll('.admin-menu-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                const target = item.getAttribute('data-target');
                document.querySelectorAll('.admin-tab').forEach(t => t.classList.add('hidden'));
                document.getElementById(target).classList.remove('hidden');
            });
        });

        document.getElementById('btn-sidebar-logout').addEventListener('click', () => {
            App.logout();
        });

        // Rooms
        document.getElementById('form-add-room').addEventListener('submit', async (e) => {
            e.preventDefault();
            const input = document.getElementById('room-name');
            const name = input.value.trim();
            if (name) {
                const result = await Store.addRoom(name);
                if (result.success) { 
                    input.value = ''; 
                    this.renderRooms(); 
                } else { 
                    App.showModal(result.error === 'duplicate' ? 'มีห้องเรียนนี้อยู่แล้ว' : `เกิดข้อผิดพลาด: ${result.error}`); 
                }
            }
        });

        // Subjects
        document.getElementById('form-add-subject').addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('sub-name').value.trim();
            const year = document.getElementById('sub-year').value.trim();
            if (name && year) {
                const result = await Store.addSubject(name, year);
                if (result.success) {
                    document.getElementById('sub-name').value = '';
                    document.getElementById('sub-year').value = '';
                    this.renderSubjects();
                } else {
                    App.showModal(`เกิดข้อผิดพลาด: ${result.error}`);
                }
            }
        });

        // Exams
        document.getElementById('exam-subject-select').addEventListener('change', (e) => {
            const subjectId = e.target.value;
            const builder = document.getElementById('exam-builder-container');
            if (subjectId) {
                builder.classList.remove('hidden');
                this.renderExams(subjectId);
            } else {
                builder.classList.add('hidden');
            }
        });

        document.getElementById('btn-add-question').addEventListener('click', async (e) => {
            const btn = e.target;
            const subjectId = document.getElementById('exam-subject-select').value;
            const q = document.getElementById('exam-q-text').value.trim();
            const choices = [
                document.getElementById('exam-c-0').value.trim(),
                document.getElementById('exam-c-1').value.trim(),
                document.getElementById('exam-c-2').value.trim(),
                document.getElementById('exam-c-3').value.trim()
            ];
            
            let correctRadio = document.querySelector('input[name="correct_choice"]:checked');
            
            if (q && choices.every(c => c !== '') && correctRadio) {
                const correctIndex = correctRadio.value;
                const editId = btn.getAttribute('data-edit-id');
                
                if (editId) {
                    await Store.updateExamQuestion(editId, {
                        questionText: q,
                        choices: choices,
                        correctIndex: parseInt(correctIndex)
                    });
                    btn.removeAttribute('data-edit-id');
                    btn.innerText = '+ เพิ่มคำถาม';
                } else {
                    await Store.addExamQuestion(subjectId, q, choices, correctIndex);
                }
                
                // Reset form
                document.getElementById('exam-q-text').value = '';
                for(let i=0; i<4; i++) document.getElementById(`exam-c-${i}`).value = '';
                document.querySelector('input[name="correct_choice"][value="0"]').checked = true;
                
                this.renderExams(subjectId);
            } else {
                App.showModal('กรุณากรอกข้อมูลให้ครบถ้วน');
            }
        });

        // Students Adding
        document.getElementById('form-add-students').addEventListener('submit', async (e) => {
            e.preventDefault();
            const year = document.getElementById('stu-year').value;
            const room = document.getElementById('stu-room').value;
            const text = document.getElementById('stu-names').value;
            
            const lines = text.split('\n');
            const duplicates = [];
            let added = 0;

            for (const line of lines) {
                const parts = line.trim().split(/\s+/);
                if (parts.length >= 2) {
                    const first = parts[0];
                    const last = parts.slice(1).join(' '); 
                    
                    const result = await Store.addStudent(year, room, first, last);
                    if (!result.success) {
                        if (result.error === 'duplicate') {
                            duplicates.push(`${first} ${last}`);
                        } else {
                            console.error(`Error adding ${first} ${last}:`, result.error);
                        }
                    } else {
                        added++;
                    }
                }
            }

            document.getElementById('stu-names').value = '';
            this.renderStudents();

            if (duplicates.length > 0) {
                App.showModal(`มีรายชื่อซ้ำ ไม่สามารถเพิ่มได้:\n${duplicates.join(', ')}`);
            } else if (added > 0) {
                App.showModal(`เพิ่มนักเรียนสำเร็จ ${added} คน`, null);
            }
        });

        // Delete All Students
        document.getElementById('btn-delete-all-students').addEventListener('click', () => {
            App.showModal('คุณต้องการลบรายชื่อทั้งหมด ใช่หรือไม่?', async () => {
                await Store.deleteAllStudents();
                this.renderStudents();
            });
        });

        // Student Search
        document.getElementById('search-student').addEventListener('input', () => this.renderStudents());

        // Promotion Events
        ['promo-src-year', 'promo-src-room'].forEach(id => {
            const el = document.getElementById(id);
            if(el) el.addEventListener('change', () => this.updatePromotionCount());
        });

        const btnPromo = document.getElementById('btn-promo-confirm');
        if(btnPromo) {
            btnPromo.addEventListener('click', async () => {
                const oldYear = document.getElementById('promo-src-year').value;
                const oldRoom = document.getElementById('promo-src-room').value;
                const newYear = document.getElementById('promo-target-year').value.trim();
                const newRoom = document.getElementById('promo-target-room').value.trim();

                if(!oldYear || !oldRoom || !newYear || !newRoom) {
                    App.showModal('กรุณากรอกข้อมูลให้ครบถ้วนทั้งต้นทางและเป้าหมาย');
                    return;
                }

                const students = Store.getStudents().filter(s => s.year.toString() === oldYear.toString() && s.room === oldRoom);
                if(students.length === 0) {
                    App.showModal('ไม่พบนักเรียนในห้องที่เลือก');
                    return;
                }

                App.showModal(`ยืนยันการเลื่อนชั้นเรียนนักเรียนจำนวน ${students.length} คน จากปี ${oldYear} ห้อง ${oldRoom} ไปยังปี ${newYear} ห้อง ${newRoom} ใช่หรือไม่?`, async () => {
                    const result = await Store.promoteStudents(oldYear, oldRoom, newYear, newRoom);
                    if(result.success) {
                        App.showModal(`เลื่อนชั้นเรียนสำเร็จ ${students.length} คน`, null);
                        // Reset target inputs
                        document.getElementById('promo-target-year').value = '';
                        document.getElementById('promo-target-room').value = '';
                        this.renderPromotion();
                        this.renderStudents();
                    } else {
                        App.showModal(`เกิดข้อผิดพลาด: ${result.error}`);
                    }
                });
            });
        }
    },

    // Rendering Data
    renderRooms() {
        const rooms = Store.getRooms();
        
        const countSpan = document.getElementById('room-count');
        if (countSpan) countSpan.innerText = rooms.length;
        
        const tbody = document.getElementById('room-table-body');
        if (tbody) {
            tbody.innerHTML = '';
            rooms.forEach(r => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td style="padding: 12px 16px; border-bottom: 1px solid #f5f5f7;">${r}</td>
                    <td style="padding: 12px 16px; border-bottom: 1px solid #f5f5f7;">
                        <button class="delete-room-btn btn" data-id="${r}" style="background: #ff3b30; color: white; border: none; padding: 4px 14px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer;">ลบ</button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        }

        // Update Room Select for Students
        const stuRoom = document.getElementById('stu-room');
        const currVal = stuRoom.value;
        stuRoom.innerHTML = '<option value="">-- เลือกห้อง --</option>';
        rooms.forEach(r => {
            const opt = document.createElement('option');
            opt.value = r; opt.innerText = r;
            stuRoom.appendChild(opt);
        });
        if (rooms.includes(currVal)) stuRoom.value = currVal;

        // Bind deletes
        document.querySelectorAll('.delete-room-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.target.getAttribute('data-id');
                await Store.deleteRoom(id);
                this.renderRooms();
            });
        });
    },

    renderSubjects() {
        const subjects = Store.getSubjects();
        const tbody = document.getElementById('subject-table-body');
        tbody.innerHTML = '';
        
        const countSpan = document.getElementById('subject-count-display');
        if (countSpan) countSpan.innerText = subjects.length;

        const examSelect = document.getElementById('exam-subject-select');
        examSelect.innerHTML = '<option value="">-- เลือกวิชา --</option>';

        subjects.forEach(s => {
            const tr = document.createElement('tr');
            
            const statusBadge = s.isOpen 
                ? `<span style="background: #e3fbed; color: #1e7e46; padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 600;">เปิด</span>` 
                : `<span style="background: #e5e5ea; color: var(--apple-gray); padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 600;">ปิด</span>`;

            tr.innerHTML = `
                <td>${s.name}</td>
                <td>${s.year}</td>
                <td>${statusBadge}</td>
                <td>
                    <button class="btn btn-sm edit-sub-btn" data-id="${s.id}" style="background: #f5f5f7; color: #1d1d1f; border: 1px solid #d2d2d7; margin-right: 5px; padding: 4px 12px; border-radius: 6px;">แก้ไข</button>
                    <button class="btn btn-sm toggle-sub-btn" data-id="${s.id}" style="background: #ff3b30; color: white; border: none; margin-right: 5px; padding: 4px 12px; border-radius: 6px;">
                        ${s.isOpen ? 'ปิด' : 'เปิด'}
                    </button>
                    <button class="btn btn-sm delete-sub-btn" data-id="${s.id}" style="background: #ff3b30; color: white; border: none; padding: 4px 12px; border-radius: 6px;">ลบ</button>
                </td>
            `;
            tbody.appendChild(tr);

            const opt = document.createElement('option');
            opt.value = s.id; opt.innerText = s.name;
            examSelect.appendChild(opt);
        });

        document.querySelectorAll('.edit-sub-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.target.getAttribute('data-id');
                const sub = Store.getSubjects().find(x => x.id === id);
                
                const newName = prompt('แก้ไขชื่อวิชา:', sub.name);
                if (newName === null) return; // Cancelled
                
                const newYear = prompt('แก้ไขปี:', sub.year);
                if (newYear === null) return; // Cancelled
                
                if (newName.trim() !== '' && newYear.trim() !== '') {
                    await Store.updateSubject(id, { name: newName.trim(), year: newYear.trim() });
                    this.renderSubjects();
                } else {
                    App.showModal('กรุณากรอกข้อมูลให้ครบถ้วน');
                }
            });
        });

        document.querySelectorAll('.toggle-sub-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.target.getAttribute('data-id');
                const sub = Store.getSubjects().find(x => x.id === id);
                await Store.updateSubject(id, { isOpen: !sub.isOpen });
                this.renderSubjects();
            });
        });

        document.querySelectorAll('.delete-sub-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.target.getAttribute('data-id');
                await Store.deleteSubject(id);
                this.renderSubjects();
            });
        });
    },

    renderExams(subjectId) {
        if (!subjectId) return;
        const exams = Store.getExamsBySubject(subjectId);
        
        const countSpan = document.getElementById('exam-count');
        if(countSpan) countSpan.innerText = exams.length;
        
        const list = document.getElementById('question-list');
        list.innerHTML = '';
        
        exams.forEach((ex, idx) => {
            const div = document.createElement('div');
            const isLast = idx === exams.length - 1;
            div.style.cssText = `display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-bottom: ${isLast ? 'none' : '1px solid #e5e5ea'};`;
            div.innerHTML = `
                <div style="font-size: 14px; color: #1d1d1f; font-weight: 500;">
                    <span style="font-weight: 600;">ข้อ ${idx + 1}:</span> ${ex.questionText}
                </div>
                <div style="display: flex; gap: 8px;">
                    <button class="btn btn-sm edit-exam-btn" data-id="${ex.id}" style="background: #e5e5ea; color: #1d1d1f; border: none; padding: 6px 14px; border-radius: 6px; font-weight: 500;">แก้ไข</button>
                    <button class="btn btn-sm delete-exam-btn" data-id="${ex.id}" style="background: #ff3b30; color: white; border: none; padding: 6px 14px; border-radius: 6px; font-weight: 500;">ลบ</button>
                </div>
            `;
            list.appendChild(div);
        });

        document.querySelectorAll('.delete-exam-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.target.getAttribute('data-id');
                await Store.deleteExamQuestion(id);
                this.renderExams(subjectId); // Re-render
            });
        });

        document.querySelectorAll('.edit-exam-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.getAttribute('data-id');
                const ex = Store.getExams().find(x => x.id === id);
                if (ex) {
                    document.getElementById('exam-q-text').value = ex.questionText;
                    ex.choices.forEach((c, i) => document.getElementById(`exam-c-${i}`).value = c);
                    document.querySelector(`input[name="correct_choice"][value="${ex.correctIndex}"]`).checked = true;
                    
                    const addBtn = document.getElementById('btn-add-question');
                    addBtn.setAttribute('data-edit-id', id);
                    addBtn.innerText = 'บันทึกการแก้ไข';
                    
                    document.getElementById('exam-q-text').scrollIntoView({ behavior: 'smooth' });
                }
            });
        });
    },

    renderStudents() {
        const students = Store.getStudents();
        const search = document.getElementById('search-student').value.trim().toLowerCase();
        
        let filtered = students;
        if (search) {
            filtered = students.filter(s => 
                s.year.toString().includes(search) || 
                s.room.toLowerCase().includes(search) || 
                `${s.firstName} ${s.lastName}`.toLowerCase().includes(search)
            );
        }

        // Students are kept in chronological order from Store

        document.getElementById('stu-count').innerText = filtered.length;

        const tbody = document.getElementById('student-table-body');
        tbody.innerHTML = '';

        filtered.forEach(s => {
            const tr = document.createElement('tr');
            
            const eligBadge = s.isEligible 
                ? `<span style="background: #e3fbed; color: #1e7e46; padding: 4px 12px; border-radius: 12px; font-weight: 600; font-size: 13px;">มี</span>`
                : `<span style="background: #f5f5f7; color: #6e6e73; padding: 4px 12px; border-radius: 12px; font-weight: 600; font-size: 13px;">ไม่มี</span>`;

            tr.innerHTML = `
                <td style="padding: 16px;">${s.year}</td>
                <td style="padding: 16px;">${s.room}</td>
                <td style="padding: 16px; font-weight: 500; color: #1d1d1f;">${s.firstName} ${s.lastName}</td>
                <td style="padding: 16px;">
                    <button class="toggle-elig-btn" data-id="${s.id}" style="border:none; cursor:pointer; background:none; padding:0;">
                        ${eligBadge}
                    </button>
                </td>
                <td style="padding: 16px;">
                    <button class="btn btn-sm edit-stu-btn" data-id="${s.id}" style="background: #e5e5ea; color: #1d1d1f; border: none; margin-right: 5px; padding: 6px 14px; border-radius: 6px; font-weight: 500;">แก้ไข</button>
                    <button class="btn btn-sm delete-stu-btn" data-id="${s.id}" style="background: #ff3b30; color: white; border: none; padding: 6px 14px; border-radius: 6px; font-weight: 500;">ลบ</button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        document.querySelectorAll('.edit-stu-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.target.getAttribute('data-id');
                const st = Store.getStudents().find(x => x.id === id);
                const newName = prompt('แก้ไขชื่อ-นามสกุล:', `${st.firstName} ${st.lastName}`);
                if (newName && newName.trim() !== '') {
                    const parts = newName.trim().split(/\s+/);
                    const first = parts[0] || '';
                    const last = parts.slice(1).join(' ');
                    await Store.updateStudent(id, { firstName: first, lastName: last });
                    this.renderStudents();
                }
            });
        });

        document.querySelectorAll('.toggle-elig-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                const st = Store.getStudents().find(x => x.id === id);
                if (st) {
                    await Store.updateStudentEligibility(id, !st.isEligible);
                    this.renderStudents();
                }
            });
        });

        document.querySelectorAll('.delete-stu-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                await Store.deleteStudent(e.target.getAttribute('data-id'));
                this.renderStudents();
            });
        });
    },

    renderPromotion() {
        const students = Store.getStudents();
        const years = [...new Set(students.map(s => s.year))].sort((a, b) => parseInt(a) - parseInt(b));
        const rooms = [...new Set(students.map(s => s.room))].sort((a, b) => a.localeCompare(b, 'th', { numeric: true }));

        const yearSelect = document.getElementById('promo-src-year');
        const roomSelect = document.getElementById('promo-src-room');

        if(yearSelect) {
            const currentYear = yearSelect.value;
            yearSelect.innerHTML = '<option value="">-- เลือกปี --</option>';
            years.forEach(y => {
                const opt = document.createElement('option');
                opt.value = y; opt.innerText = y;
                yearSelect.appendChild(opt);
            });
            if (years.includes(currentYear)) yearSelect.value = currentYear;
        }

        if(roomSelect) {
            const currentRoom = roomSelect.value;
            roomSelect.innerHTML = '<option value="">-- เลือกห้อง --</option>';
            rooms.forEach(r => {
                const opt = document.createElement('option');
                opt.value = r; opt.innerText = r;
                roomSelect.appendChild(opt);
            });
            if (rooms.includes(currentRoom)) roomSelect.value = currentRoom;
        }

        this.updatePromotionCount();
    },

    updatePromotionCount() {
        const year = document.getElementById('promo-src-year').value;
        const room = document.getElementById('promo-src-room').value;
        const countBox = document.getElementById('promo-src-count');

        if(year && room) {
            const count = Store.getStudents().filter(s => s.year.toString() === year.toString() && s.room === room).length;
            countBox.innerHTML = `พบนักเรียน <span style="color: var(--apple-blue); font-weight: 700; font-size: 18px;">${count}</span> คน ในห้องนี้`;
            countBox.style.background = '#e3f2fd';
            countBox.style.borderColor = 'var(--apple-blue)';
        } else {
            countBox.innerText = 'กรุณาเลือกชั้นปีและห้องเรียน';
            countBox.style.background = '#f5f5f7';
            countBox.style.borderColor = '#d2d2d7';
        }
    }
};

window.AdminPortal = AdminPortal;
