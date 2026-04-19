const AdminPortal = {
    editingId: null,
    currentSubjectId: null,
    
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
            const year = document.getElementById('add-room-year').value;
            const numberInput = document.getElementById('add-room-number-input');
            const number = numberInput.value;
            const name = `${year}/${number}`;
            
            const result = await Store.addRoom(name);
            if (result.success) { 
                numberInput.value = '';
                AdminPortal.renderRooms(); 
            } else { 
                App.showModal(result.error === 'duplicate' ? 'มีห้องเรียนนี้อยู่แล้ว' : `เกิดข้อผิดพลาด: ${result.error}`); 
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
                    AdminPortal.renderSubjects();
                } else {
                    App.showModal(`เกิดข้อผิดพลาด: ${result.error}`);
                }
            }
        });

        // Exams Navigation & State
        document.getElementById('exam-subject-select').addEventListener('change', (e) => {
            this.currentSubjectId = e.target.value;
            this.editingId = null;
            const builder = document.getElementById('exam-builder-container');
            if (this.currentSubjectId) {
                builder.classList.remove('hidden');
                this.renderExams(this.currentSubjectId);
            } else {
                builder.classList.add('hidden');
            }
        });

        // Add New Card Button
        document.getElementById('btn-add-new-card').addEventListener('click', async () => {
            if (!AdminPortal.currentSubjectId) {
                App.showModal('กรุณาเลือกวิชาก่อนเพิ่มข้อสอบ');
                return;
            }
            
            // Add a blank question to store
            const result = await Store.addExamQuestion(
                AdminPortal.currentSubjectId, 
                '', 
                ['', '', '', ''], 
                0, 
                null
            );
            
            if (result.success) {
                // Find the ID of the newly added question (last one)
                const exams = Store.getExamsBySubject(AdminPortal.currentSubjectId);
                const newEx = exams[exams.length - 1];
                AdminPortal.editingId = newEx.id;
                AdminPortal.renderExams(AdminPortal.currentSubjectId);
                
                // Scroll to bottom
                setTimeout(() => {
                    const cards = document.querySelectorAll('.exam-card');
                    if (cards.length > 0) cards[cards.length - 1].scrollIntoView({ behavior: 'smooth' });
                }, 100);
            } else {
                App.showModal(`ไม่สามารถเพิ่มข้อสอบได้: ${result.error || 'Unknown Error'}`);
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
            AdminPortal.renderStudents();

            if (duplicates.length > 0) {
                App.showModal(`มีรายชื่อซ้ำ ไม่สามารถเพิ่มได้:\n${duplicates.join(', ')}`);
            } else if (added > 0) {
                App.showModal(`เพิ่มนักเรียนสำเร็จ ${added} คน`, null);
            }
        });
        
        // Dynamic Room Filtering for Students
        document.getElementById('stu-year').addEventListener('change', () => {
            this.renderRooms();
        });

        // Delete All Students (Filtered)
        document.getElementById('btn-delete-all-students').addEventListener('click', () => {
            const query = document.getElementById('search-student').value.trim().toLowerCase();
            let studentsToDelete = Store.getStudents();
            
            if (query) {
                studentsToDelete = studentsToDelete.filter(s => 
                    s.year.toString().includes(query) || 
                    s.room.toLowerCase().includes(query) || 
                    `${s.firstName} ${s.lastName}`.toLowerCase().includes(query)
                );
            }

            if (studentsToDelete.length === 0) {
                App.showModal('ไม่พบรายชื่อที่ต้องการลบ');
                return;
            }

            App.showModal(`ต้องการลบรายชื่อที่แสดงอยู่ทั้งหมดจำนวน ${studentsToDelete.length} คน ใช่หรือไม่?`, async () => {
                const deletePromises = studentsToDelete.map(s => Store.deleteStudent(s.id));
                await Promise.all(deletePromises);
                AdminPortal.renderStudents();
                App.showModal(`ลบรายชื่อสำเร็จ ${studentsToDelete.length} คน`, null);
            });
        });

        // Student Search
        document.getElementById('search-student').addEventListener('input', () => AdminPortal.renderStudents());

        // Promotion Events
        const promoSrcYearEl = document.getElementById('promo-src-year');
        if(promoSrcYearEl) promoSrcYearEl.addEventListener('change', () => AdminPortal.renderPromotion());
        const promoSrcRoomEl = document.getElementById('promo-src-room');
        if(promoSrcRoomEl) promoSrcRoomEl.addEventListener('change', () => AdminPortal.updatePromotionCount());

        const btnPromo = document.getElementById('btn-promo-confirm');
        if(btnPromo) {
            btnPromo.addEventListener('click', async () => {
                const oldYear = document.getElementById('promo-src-year').value;
                const oldRoom = document.getElementById('promo-src-room').value;
                const newYear = document.getElementById('promo-target-year').value;
                const newRoom = document.getElementById('promo-target-room').value;

                if(!oldYear || !oldRoom || !newYear || !newRoom) {
                    App.showModal('กรุณากรอกข้อมูลให้ครบถ้วนทั้งต้นทางและเป้าหมาย');
                    return;
                }

                if(oldYear.toString() === newYear.toString() && oldRoom === newRoom) {
                    App.showModal('ไม่สามารถย้ายไปยังห้องเดิมได้');
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
                        AdminPortal.renderPromotion();
                        AdminPortal.renderStudents();
                    } else {
                        App.showModal(`เกิดข้อผิดพลาด: ${result.error}`);
                    }
                });
            });
        }

        // Promo Target Room Population
        const targetYearSelect = document.getElementById('promo-target-year');
        if (targetYearSelect) {
            targetYearSelect.addEventListener('change', () => {
                const year = targetYearSelect.value;
                const targetRoomSelect = document.getElementById('promo-target-room');
                const rooms = Store.getRooms().filter(r => r.startsWith(year + '/')).sort();
                
                targetRoomSelect.innerHTML = '<option value="">-- เลือกห้อง --</option>';
                rooms.forEach(r => {
                    const opt = document.createElement('option');
                    opt.value = r; opt.innerText = r;
                    targetRoomSelect.appendChild(opt);
                });
            });
        }
    },

    // Rendering Data
    renderRooms() {
        const rooms = Store.getRooms();
        
        // Numeric sort function for "Year/Number" format
        const roomSort = (a, b) => {
            const [yA, rA] = a.split('/').map(Number);
            const [yB, rB] = b.split('/').map(Number);
            if (yA !== yB) return yA - yB;
            return rA - rB;
        };

        // Split rooms by year
        const year1Rooms = rooms.filter(r => r.startsWith('1/')).sort(roomSort);
        const year2Rooms = rooms.filter(r => r.startsWith('2/')).sort(roomSort);
        
        const populateSelect = (roomList, selectId) => {
            const select = document.getElementById(selectId);
            if (!select) return;
            const currVal = select.value;
            select.innerHTML = '<option value="">-- เลือกห้อง --</option>';
            roomList.forEach(r => {
                const opt = document.createElement('option');
                opt.value = r; opt.innerText = r;
                select.appendChild(opt);
            });
            if (roomList.includes(currVal)) select.value = currVal;
        };

        populateSelect(year1Rooms, 'room-select-1');
        populateSelect(year2Rooms, 'room-select-2');

        // Bind deletes for dropdowns
        ['1', '2'].forEach(yr => {
            const btn = document.getElementById(`btn-delete-room-${yr}`);
            const sel = document.getElementById(`room-select-${yr}`);
            if (btn && sel) {
                // Clear existing listeners by replacing the element (simple way for dynamic render)
                const newBtn = btn.cloneNode(true);
                btn.parentNode.replaceChild(newBtn, btn);
                newBtn.addEventListener('click', async () => {
                    const roomId = sel.value;
                    if (!roomId) {
                        App.showModal('กรุณาเลือกห้องที่ต้องการลบ');
                        return;
                    }
                    App.showModal(`ยืนยันการลบห้อง ${roomId}?`, async () => {
                        await Store.deleteRoom(roomId);
                        AdminPortal.renderRooms();
                    });
                });
            }
        });

        // Sync other selects
        const syncSelect = (id, filterYear = null) => {
            const el = document.getElementById(id);
            if (el) {
                const currVal = el.value;
                el.innerHTML = '<option value="">-- เลือกห้อง --</option>';
                rooms
                    .filter(r => !filterYear || r.startsWith(`${filterYear}/`))
                    .sort(roomSort)
                    .forEach(r => {
                        const opt = document.createElement('option');
                        opt.value = r; opt.innerText = r;
                        el.appendChild(opt);
                    });
                if (rooms.includes(currVal)) el.value = currVal;
            }
        };

        const stuYear = document.getElementById('stu-year')?.value;
        syncSelect('stu-room', stuYear);
        
        // Promotion sync
        const promoSrcYear = document.getElementById('promo-src-year')?.value;
        const promoTargetYear = document.getElementById('promo-target-year')?.value;
        syncSelect('promo-src-room', promoSrcYear);
        syncSelect('promo-target-room', promoTargetYear);

        // Bind deletes
        document.querySelectorAll('.delete-room-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                await Store.deleteRoom(id);
                AdminPortal.renderRooms();
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
                ? `<button class="toggle-sub-btn" data-id="${s.id}" style="background: #e3fbed; color: #1e7e46; padding: 4px 0; width: 50px; display: inline-block; text-align: center; border-radius: 12px; font-size: 12px; font-weight: 600; border: none; cursor: pointer; outline: none;">เปิด</button>` 
                : `<button class="toggle-sub-btn" data-id="${s.id}" style="background: #e5e5ea; color: var(--apple-gray); padding: 4px 0; width: 50px; display: inline-block; text-align: center; border-radius: 12px; font-size: 12px; font-weight: 600; border: none; cursor: pointer; outline: none;">ปิด</button>`;

            tr.innerHTML = `
                <td>${s.name}</td>
                <td>${s.year}</td>
                <td style="text-align: center;">${statusBadge}</td>
                <td style="text-align: center;">
                    <button class="btn btn-sm edit-sub-btn" data-id="${s.id}" style="background: #f5f5f7; color: #1d1d1f; border: 1px solid #d2d2d7; margin-right: 5px; padding: 4px 12px; border-radius: 6px;">แก้ไข</button>
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
                    AdminPortal.renderSubjects();
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
                AdminPortal.renderSubjects();
            });
        });

        document.querySelectorAll('.delete-sub-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.target.getAttribute('data-id');
                await Store.deleteSubject(id);
                AdminPortal.renderSubjects();
            });
        });
    },

    renderExams(subjectId) {
        if (!subjectId) return;
        this.currentSubjectId = subjectId;
        const exams = Store.getExamsBySubject(subjectId);
        const list = document.getElementById('question-list');
        list.innerHTML = '';
        
        exams.forEach((ex, idx) => {
            const isEditing = this.editingId === ex.id;
            const card = document.createElement('div');
            card.className = 'exam-card';
            card.style.cssText = `
                background: white; 
                border: 1px solid #e5e5ea; 
                border-radius: 12px; 
                padding: ${isEditing ? '24px' : '20px 24px'}; 
                position: relative; 
                cursor: ${isEditing ? 'default' : 'pointer'};
                transition: all 0.2s ease;
                ${isEditing ? 'border-left: 6px solid #0ea5e9; box-shadow: 0 4px 20px rgba(0,0,0,0.08);' : 'box-shadow: none;'}
            `;
            
            if (isEditing) {
                // EDIT MODE
                card.innerHTML = `
                    <div style="margin-bottom: 24px;">
                        <textarea class="edit-q-text" placeholder="พิมพ์คำถามที่นี่..." rows="2" style="width: 100%; border: none; border-bottom: 1px solid #e5e5ea; padding: 10px 0; font-family: inherit; font-size: 16px; font-weight: 600; outline: none; resize: none; background: #fafafa; padding: 12px; border-radius: 8px;">${ex.questionText}</textarea>
                        
                        <div style="margin-top: 16px; display: flex; align-items: center; gap: 12px;">
                            <input type="file" class="card-image-input hidden" accept="image/*">
                            <button class="btn-card-upload-img" style="background: #f5f5f7; border: 1px solid #d2d2d7; border-radius: 8px; padding: 8px 16px; font-size: 13px; cursor: pointer;">🖼️ ${ex.imageUrl ? 'เปลี่ยนรูป' : 'ใส่รูปภาพ'}</button>
                            <div class="card-img-preview-wrap ${ex.imageUrl && ex.imageUrl.trim() !== '' ? '' : 'hidden'}" style="position: relative;">
                                <img src="${ex.imageUrl || ''}" onerror="this.parentElement.classList.add('hidden')" style="height: 50px; border-radius: 6px; border: 1px solid #e5e5ea;">
                                <button class="btn-card-remove-img" style="position: absolute; top: -8px; right: -8px; background: #ff3b30; color: white; border: none; border-radius: 50%; width: 20px; height: 20px; font-size: 12px; cursor: pointer;">×</button>
                            </div>
                        </div>
                    </div>
                    <div class="edit-choices-list" style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 24px;">
                        ${ex.choices.map((c, i) => `
                            <div style="display: flex; align-items: center; gap: 12px; background: #fff; padding: 4px; border-radius: 10px;">
                                <label class="radio-custom-container" style="margin: 0; padding: 0;">
                                    <input type="radio" name="correct_${ex.id}" value="${i}" ${ex.correctIndex === i ? 'checked' : ''}>
                                    <span class="radio-custom-mark"></span>
                                </label>
                                <input type="text" class="edit-choice-input" data-index="${i}" value="${c}" placeholder="ตัวเลือก ${['ก','ข','ค','ง'][i]}" style="flex: 1; border: 1px solid #e5e5ea; border-radius: 8px; padding: 10px 14px; outline: none; font-size: 14px; background: #fff;">
                            </div>
                        `).join('')}
                    </div>
                    <div style="display: flex; justify-content: flex-end; gap: 12px; border-top: 1px solid #f5f5f7; padding-top: 20px;">
                        <button class="btn-card-delete" style="background: none; border: none; cursor: pointer; padding: 4px; display: flex; align-items: center; justify-content: center; transition: opacity 0.2s;" title="ลบข้อนี้">
                            <svg viewBox="0 0 24 24" width="20" height="20" stroke="#ff3b30" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                        </button>
                        <div style="flex: 1;"></div>
                        <button class="btn-card-save" style="background: #0ea5e9; color: white; border: none; border-radius: 8px; padding: 8px 24px; font-weight: 700; font-size: 13px; cursor: pointer;">บันทึก</button>
                    </div>
                `;
                
                // Event Listeners for editing
                card.querySelector('.btn-card-save').addEventListener('click', (e) => {
                    e.stopPropagation();
                    AdminPortal.saveCard(ex.id, card);
                });
                card.querySelector('.btn-card-delete').addEventListener('click', (e) => {
                    e.stopPropagation();
                    App.showModal('ยืนยันการลบข้อสอบข้อนี้?', async () => {
                        await Store.deleteExamQuestion(ex.id);
                        AdminPortal.editingId = null;
                        AdminPortal.renderExams(AdminPortal.currentSubjectId);
                    });
                });
                
                // Image Handling
                const fileInput = card.querySelector('.card-image-input');
                card.querySelector('.btn-card-upload-img').addEventListener('click', () => fileInput.click());
                fileInput.addEventListener('change', (e) => {
                    const file = e.target.files[0];
                    if (file) {
                        const reader = new FileReader();
                        reader.onload = (ev) => {
                            const img = card.querySelector('img');
                            img.src = ev.target.result;
                            card.querySelector('.card-img-preview-wrap').classList.remove('hidden');
                        };
                        reader.readAsDataURL(file);
                    }
                });
                card.querySelector('.btn-card-remove-img').addEventListener('click', () => {
                    card.querySelector('img').src = '';
                    card.querySelector('.card-img-preview-wrap').classList.add('hidden');
                });

            } else {
                // VIEW MODE
                card.innerHTML = `
                    <div style="font-size: 16px; font-weight: 600; color: #1d1d1f; margin-bottom: 12px;">
                        ${idx + 1}. ${ex.questionText || '<span style="color: #86868b; font-weight: 400; font-style: italic;">ไม่ได้ระบุคำถาม...</span>'}
                    </div>
                    ${(ex.imageUrl && ex.imageUrl.trim() !== '') ? `<img src="${ex.imageUrl}" onerror="this.style.display='none'" style="max-width: 200px; max-height: 150px; border-radius: 8px; margin-bottom: 12px; border: 1px solid #e5e5ea;">` : ''}
                    <div style="display: flex; flex-direction: column; gap: 8px;">
                        ${ex.choices.map((c, i) => `
                            <div style="font-size: 14px; color: ${ex.correctIndex === i ? '#0071e3' : '#48484a'}; font-weight: ${ex.correctIndex === i ? '600' : '400'}; display: flex; align-items: center; gap: 12px; padding: 4px 0;">
                                <div class="radio-custom-container">
                                    <input type="radio" disabled ${ex.correctIndex === i ? 'checked' : ''}>
                                    <span class="radio-custom-mark" style="${ex.correctIndex === i ? 'border-color: #0071e3;' : ''}"></span>
                                </div>
                                <span style="margin-left: -4px;">${['ก.','ข.','ค.','ง.'][i]} ${c || '-'}</span>
                            </div>
                        `).join('')}
                    </div>
                `;
                
                card.addEventListener('click', () => {
                    AdminPortal.editingId = ex.id;
                    AdminPortal.renderExams(subjectId);
                });
            }

            list.appendChild(card);
        });
    },

    async saveCard(id, cardEl) {
        const qText = cardEl.querySelector('.edit-q-text').value.trim();
        const choices = Array.from(cardEl.querySelectorAll('.edit-choice-input')).map(input => input.value.trim());
        const correctRadio = cardEl.querySelector(`input[name="correct_${id}"]:checked`);
        const imageUrl = cardEl.querySelector('img').src;

        if (!qText) {
            App.showModal('กรุณากรอกคำถาม');
            return;
        }

        const updates = {
            questionText: qText,
            choices: choices,
            correctIndex: correctRadio ? parseInt(correctRadio.value) : 0,
            imageUrl: imageUrl || null
        };

        const success = await Store.updateExamQuestion(id, updates);
        if (success) {
            AdminPortal.editingId = null;
            AdminPortal.renderExams(AdminPortal.currentSubjectId);
        } else {
            App.showModal('เกิดข้อผิดพลาดในการบันทึก');
        }
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
                ? `<span style="background: #e3fbed; color: #1e7e46; padding: 4px 0; width: 54px; display: inline-block; text-align: center; border-radius: 12px; font-weight: 600; font-size: 13px;">มี</span>`
                : `<span style="background: #f5f5f7; color: #6e6e73; padding: 4px 0; width: 54px; display: inline-block; text-align: center; border-radius: 12px; font-weight: 600; font-size: 13px;">ไม่มี</span>`;

            tr.innerHTML = `
                <td style="padding: 16px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${s.year}</td>
                <td style="padding: 16px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${s.room}</td>
                <td style="padding: 16px; font-weight: 500; color: #1d1d1f; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${s.firstName} ${s.lastName}</td>
                <td style="padding: 16px; text-align: center;">
                    <button class="toggle-elig-btn" data-id="${s.id}" style="border:none; cursor:pointer; background:none; padding:0;">
                        ${eligBadge}
                    </button>
                </td>
                <td style="padding: 16px; text-align: center;">
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
                if (!st) return;

                const newYear = prompt('แก้ไขปี:', st.year);
                if (newYear === null) return;

                const newRoom = prompt('แก้ไขห้อง:', st.room);
                if (newRoom === null) return;

                const newName = prompt('แก้ไขชื่อ-นามสกุล:', `${st.firstName} ${st.lastName}`);
                if (newName === null) return;

                if (newName.trim() !== '') {
                    const parts = newName.trim().split(/\s+/);
                    if (parts.length >= 2) {
                        const first = parts[0];
                        const last = parts.slice(1).join(' ');
                        
                        await Store.updateStudent(id, { 
                            year: newYear.trim(),
                            room: newRoom.trim(),
                            firstName: first, 
                            lastName: last 
                        });
                        AdminPortal.renderStudents();
                    } else {
                        App.showModal('กรุณากรอกทั้งชื่อและนามสกุล');
                    }
                }
            });
        });

        document.querySelectorAll('.toggle-elig-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                const st = Store.getStudents().find(x => x.id === id);
                if (st) {
                    await Store.updateStudentEligibility(id, !st.isEligible);
                    AdminPortal.renderStudents();
                }
            });
        });

        document.querySelectorAll('.delete-stu-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                await Store.deleteStudent(e.target.getAttribute('data-id'));
                AdminPortal.renderStudents();
            });
        });
    },

    renderPromotion() {
        const students = Store.getStudents() || [];
        // Robust extraction of unique years and rooms, handling potential case-sensitivity issues
        const years = [...new Set(students.map(s => s.year ?? s.Year))].filter(y => y != null).sort((a, b) => parseInt(a) - parseInt(b));
        
        const yearSelect = document.getElementById('promo-src-year');
        const roomSelect = document.getElementById('promo-src-room');
        const selectedYear = yearSelect?.value;

        const rooms = [...new Set(students.map(s => s.room ?? s.Room))]
            .filter(r => r != null && (!selectedYear || r.toString().startsWith(selectedYear + '/')))
            .sort((a, b) => a.toString().localeCompare(b.toString(), 'th', { numeric: true }));

        if(yearSelect) {
            const currentYear = yearSelect.value;
            yearSelect.innerHTML = '<option value="">-- เลือกปี --</option>';
            years.forEach(y => {
                const opt = document.createElement('option');
                opt.value = y; opt.innerText = "ปี " + y;
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
            // Verify if previous selection is still valid in filtered list
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
