const AdminPortal = {
    editingId: null,
    currentSubjectId: null,
    
    init() {
        this.bindEvents();
        this.loadFilters();
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

        // Sidebar Navigation (Converted to Segmented Control)
        document.querySelectorAll('.segmented-item').forEach(item => {
            item.addEventListener('click', (e) => {
                document.querySelectorAll('.segmented-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                const target = item.getAttribute('data-target');
                document.querySelectorAll('.admin-tab').forEach(t => t.classList.add('hidden'));
                document.getElementById(target).classList.remove('hidden');
            });
        });

        document.getElementById('btn-sidebar-logout')?.addEventListener('click', () => {
            App.logout();
        });



        // Subjects
        document.getElementById('form-add-subject').addEventListener('submit', async (e) => {
            e.preventDefault();
            const baseName = document.getElementById('sub-name').value.trim();
            const rawYear = document.getElementById('sub-year').value.trim();
            const acadYear = document.getElementById('sub-acad-year').value.trim();
            const term = document.getElementById('sub-term').value.trim();
            const year = `${rawYear} (ปี ${term}/${acadYear})`;
            
            const name = `${baseName}`; // Removed redundant (เทอม X) since it's now in the year column
            
            if (baseName && year) {
                const result = await Store.addSubject(name, year);
                if (result.success) {
                    const modalAddSub = document.getElementById('modal-add-subject');
                    if (modalAddSub) modalAddSub.classList.add('hidden');
                    document.getElementById('form-add-subject').reset();
                    AdminPortal.renderSubjects();
                } else {
                    App.showModal(`เกิดข้อผิดพลาด: ${result.error}`);
                }
            }
        });

        // Filter Subjects by Academic Year
        const filterSubAcadYear = document.getElementById('filter-subject-acad-year');
        if (filterSubAcadYear) {
            filterSubAcadYear.addEventListener('change', () => {
                AdminPortal.renderSubjects();
            });
        }

        // Add Student Modal Toggle
        const btnOpenAddStu = document.getElementById('btn-open-add-student-modal');
        const btnCloseAddStu = document.getElementById('btn-close-add-student-modal');
        const btnCancelAddStu = document.getElementById('btn-cancel-add-student');
        const modalAddStu = document.getElementById('modal-add-student');

        if (btnOpenAddStu) {
            btnOpenAddStu.addEventListener('click', () => {
                modalAddStu.classList.remove('hidden');
                document.getElementById('stu-acad-year').focus();
            });
        }

        const closeModal = () => {
            modalAddStu.classList.add('hidden');
            document.getElementById('form-add-students').reset();
        };

        if (btnCloseAddStu) btnCloseAddStu.addEventListener('click', closeModal);
        if (btnCancelAddStu) btnCancelAddStu.addEventListener('click', closeModal);

        // Add Subject Modal Toggle
        const btnOpenAddSub = document.getElementById('btn-open-add-subject-modal');
        const btnCloseAddSub = document.getElementById('btn-close-add-subject-modal');
        const btnCancelAddSub = document.getElementById('btn-cancel-add-subject');
        const modalAddSub = document.getElementById('modal-add-subject');

        if (btnOpenAddSub) {
            btnOpenAddSub.addEventListener('click', () => {
                modalAddSub.classList.remove('hidden');
                document.getElementById('sub-name').focus();
            });
        }

        const closeSubModal = () => {
            modalAddSub.classList.add('hidden');
            document.getElementById('form-add-subject').reset();
        };

        if (btnCloseAddSub) btnCloseAddSub.addEventListener('click', closeSubModal);
        if (btnCancelAddSub) btnCancelAddSub.addEventListener('click', closeSubModal);

        // Close Modal on Background Click
        modalAddSub?.addEventListener('click', (e) => {
            if (e.target === modalAddSub) closeSubModal();
        });

        // Close Modal on Background Click
        modalAddStu?.addEventListener('click', (e) => {
            if (e.target === modalAddStu) closeModal();
        });

        // Close Exam Editor Modal
        const closeExamModal = () => {
            document.getElementById('modal-manage-exams').classList.add('hidden');
            AdminPortal.currentSubjectId = null;
            AdminPortal.editingId = null;
        };

        document.getElementById('btn-close-exam-editor')?.addEventListener('click', closeExamModal);
        document.getElementById('btn-done-exam-editor')?.addEventListener('click', closeExamModal);

        // Close Modal on Background Click
        const modalManageExams = document.getElementById('modal-manage-exams');
        modalManageExams?.addEventListener('click', (e) => {
            if (e.target === modalManageExams) closeExamModal();
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
            const rawYear = document.getElementById('stu-year').value;
            const acadYear = document.getElementById('stu-acad-year').value.trim();
            const term = document.getElementById('stu-term').value;
            const year = `${rawYear} (ปี ${term}/${acadYear})`;
            const roomInput = document.getElementById('stu-room').value.trim();
            const room = `${rawYear}/${roomInput}`;
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

            // Close Modal and Reset
            const modalAddStu = document.getElementById('modal-add-student');
            if (modalAddStu) modalAddStu.classList.add('hidden');
            document.getElementById('form-add-students').reset();
            AdminPortal.renderStudents();

            if (duplicates.length > 0) {
                App.showModal(`มีรายชื่อซ้ำ ไม่สามารถเพิ่มได้:\n${duplicates.join(', ')}`);
            } else if (added > 0) {
                App.showModal(`เพิ่มนักเรียนสำเร็จ ${added} คน`, null);
            }
        });
        


        // Delete All Students (Filtered)
        document.getElementById('btn-delete-all-students').addEventListener('click', () => {
            const query = document.getElementById('search-student').value.trim().toLowerCase();
            const filterAcadYear = document.getElementById('filter-student-acad-year').value;
            let studentsToDelete = Store.getStudents();
            
            if (filterAcadYear) {
                studentsToDelete = studentsToDelete.filter(s => {
                    const match = s.year ? s.year.toString().match(/\(ปี\s*([^)]+)\)/) : null;
                    return match && match[1].trim() === filterAcadYear;
                });
            }

            if (query) {
                studentsToDelete = studentsToDelete.filter(s => 
                    s.year.toString().toLowerCase().includes(query) || 
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

        // Delete All Subjects (Filtered)
        document.getElementById('btn-delete-all-subjects')?.addEventListener('click', () => {
            const query = document.getElementById('search-subject').value.trim().toLowerCase();
            const filterAcadYear = document.getElementById('filter-subject-acad-year').value;
            let subjectsToDelete = Store.getSubjects();
            
            if (filterAcadYear) {
                subjectsToDelete = subjectsToDelete.filter(s => {
                    const match = s.year ? s.year.toString().match(/\(ปี\s*([^)]+)\)/) : null;
                    return match && match[1].trim() === filterAcadYear;
                });
            }

            if (query) {
                subjectsToDelete = subjectsToDelete.filter(s => 
                    s.name.toLowerCase().includes(query) || 
                    s.year.toString().toLowerCase().includes(query)
                );
            }

            if (subjectsToDelete.length === 0) {
                App.showModal('ไม่พบรายวิชาที่ต้องการลบ');
                return;
            }

            App.showModal(`ยืนยันการลบรายวิชาที่แสดงอยู่ทั้งหมดจำนวน ${subjectsToDelete.length} วิชา? (ข้อสอบที่เกี่ยวข้องจะถูกลบไปด้วย และไม่สามารถกู้คืนได้)`, async () => {
                const deletePromises = subjectsToDelete.map(s => Store.deleteSubject(s.id));
                await Promise.all(deletePromises);
                AdminPortal.renderSubjects();
                App.showModal(`ลบรายวิชาสำเร็จ ${subjectsToDelete.length} วิชา`, null);
            });
        });

        // Student Search & Filter
        document.getElementById('search-student').addEventListener('input', () => AdminPortal.renderStudents());
        document.getElementById('filter-student-acad-year').addEventListener('change', () => AdminPortal.renderStudents());

        // Subject Search & Filter
        document.getElementById('search-subject')?.addEventListener('input', () => AdminPortal.renderSubjects());
        document.getElementById('filter-subject-acad-year')?.addEventListener('change', () => AdminPortal.renderSubjects());

        // Promotion Events
        const promoSrcYearEl = document.getElementById('promo-src-year');
        if(promoSrcYearEl) promoSrcYearEl.addEventListener('change', () => AdminPortal.renderPromotion());
        const promoSrcRoomEl = document.getElementById('promo-src-room');
        if(promoSrcRoomEl) promoSrcRoomEl.addEventListener('change', () => AdminPortal.updatePromotionCount());

        const btnPromo = document.getElementById('btn-promo-confirm');
        if(btnPromo) {
            btnPromo.addEventListener('click', async () => {
                const oldRawYear = document.getElementById('promo-src-year').value;
                const newRawYear = document.getElementById('promo-target-year').value;
                const newAcadYear = document.getElementById('promo-target-acad-year').value.trim();
                
                const oldYear = oldRawYear; 
                const newYear = `${newRawYear} (ปี ${newAcadYear})`;
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
            targetYearSelect.addEventListener('input', () => {
                const yearPrefix = targetYearSelect.value;
                const targetRoomSelect = document.getElementById('promo-target-room');
                const rooms = Store.getRooms().filter(r => r.startsWith(yearPrefix + '/')).sort();
                
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


    // Duplicated renderSubjects removed for cleanliness. Use the one defined below at line 600.

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
                background: #fff; 
                border-radius: 12px; 
                padding: 24px; 
                position: relative; 
                cursor: ${isEditing ? 'default' : 'pointer'};
                border: 1px solid ${isEditing ? '#0071e3' : '#d2d2d7'};
                box-shadow: ${isEditing ? '0 10px 30px rgba(0,0,0,0.1)' : 'none'};
                transition: transform 0.1s ease;
            `;
            
            if (isEditing) {
                // EDIT MODE
                card.innerHTML = `
                    <div style="margin-bottom: 20px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                            <span style="font-size: 13px; font-weight: 700; color: #000;">ข้อที่ ${idx + 1}</span>
                            <button class="btn-card-delete" style="background: none; border: none; cursor: pointer; color: #ff3b30; font-size: 12px; font-weight: 600;">ลบข้อสอบ</button>
                        </div>
                        <textarea class="edit-q-text" placeholder="พิมพ์คำถาม..." rows="2" style="width: 100%; border: 1px solid #d2d2d7; border-radius: 8px; padding: 12px; font-family: inherit; font-size: 15px; outline: none; background: #fff;">${ex.questionText}</textarea>
                        
                        <div style="margin-top: 12px; display: flex; align-items: center; gap: 10px;">
                            <input type="file" class="card-image-input hidden" accept="image/*">
                            <button class="btn-card-upload-img" style="background: #f5f5f7; border: 1px solid #d2d2d7; border-radius: 6px; padding: 6px 12px; font-size: 12px; cursor: pointer;">🖼️ เพิ่มรูป</button>
                            <div class="card-img-preview-wrap ${ex.imageUrl && ex.imageUrl.trim() !== '' ? '' : 'hidden'}" style="position: relative;">
                                <img src="${ex.imageUrl || ''}" onerror="this.parentElement.classList.add('hidden')" style="height: 40px; border-radius: 4px; border: 1px solid #d2d2d7;">
                                <button class="btn-card-remove-img" style="position: absolute; top: -5px; right: -5px; background: #000; color: #fff; border: none; border-radius: 50%; width: 16px; height: 16px; font-size: 9px; cursor: pointer;">×</button>
                            </div>
                        </div>
                    </div>
                    <div class="edit-choices-list" style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px;">
                        ${ex.choices.map((c, i) => `
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <input type="radio" name="correct_${ex.id}" value="${i}" ${ex.correctIndex === i ? 'checked' : ''} style="width: 18px; height: 18px; cursor: pointer;">
                                <input type="text" class="edit-choice-input" data-index="${i}" value="${c}" placeholder="ตัวเลือก ${['ก','ข','ค','ง'][i]}" style="flex: 1; border: 1px solid #d2d2d7; border-radius: 8px; padding: 8px 12px; outline: none; font-size: 14px;">
                            </div>
                        `).join('')}
                    </div>
                    <div style="display: flex; justify-content: flex-end; border-top: 1px solid #f2f2f7; padding-top: 15px;">
                        <button class="btn-card-save" style="background: #0071e3; color: white; border: none; border-radius: 8px; padding: 8px 25px; font-weight: 600; font-size: 14px; cursor: pointer;">บันทึกข้อนี้</button>
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
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                        <span style="font-size: 13px; font-weight: 700; color: #86868b;">ข้อที่ ${idx + 1}</span>
                        <span style="font-size: 12px; color: #0071e3; font-weight: 600;">แก้ไข</span>
                    </div>
                    <div style="font-size: 15px; font-weight: 600; color: #000; margin-bottom: 15px; line-height: 1.4;">
                        ${ex.questionText || '<span style="color: #bfbfbf;">(ไม่ได้ระบุคำถาม)</span>'}
                    </div>
                    ${(ex.imageUrl && ex.imageUrl.trim() !== '') ? `<img src="${ex.imageUrl}" onerror="this.style.display='none'" style="max-width: 100%; max-height: 150px; border-radius: 8px; margin-bottom: 15px; border: 1px solid #e5e5ea;">` : ''}
                    <div style="display: flex; flex-direction: column; gap: 8px;">
                        ${ex.choices.map((c, i) => `
                            <div style="font-size: 14px; color: ${ex.correctIndex === i ? '#0071e3' : '#333'}; font-weight: ${ex.correctIndex === i ? '700' : '400'}; padding: 4px 0; display: flex; align-items: center; gap: 8px;">
                                <div style="width: 12px; height: 12px; border-radius: 50%; border: 2px solid ${ex.correctIndex === i ? '#0071e3' : '#d2d2d7'}; background: ${ex.correctIndex === i ? '#0071e3' : 'transparent'}; flex-shrink: 0;"></div>
                                <span>${['ก.', 'ข.', 'ค.', 'ง.'][i]} ${c || '-'}</span>
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

    renderSubjects() {
        let subjects = Store.getSubjects();
        const filterEl = document.getElementById('filter-subject-acad-year');
        const filterVal = filterEl ? filterEl.value : '';

        // Populate filter options if needed
        if (filterEl) {
            const acadYears = new Set();
            Store.getSubjects().forEach(s => {
                const match = s.year ? s.year.toString().match(/\(ปี\s*([^)]+)\)/) : null;
                if (match && match[1]) {
                    acadYears.add(match[1].split('/').pop());
                }
            });
            const sortedYears = Array.from(acadYears).sort((a, b) => b - a);
            
            const currentVal = filterEl.value;
            filterEl.innerHTML = '<option value="">ทุกปีการศึกษา</option>';
            sortedYears.forEach(y => {
                const opt = document.createElement('option');
                opt.value = y;
                opt.innerText = y;
                opt.style.textAlign = 'center';
                filterEl.appendChild(opt);
            });
            filterEl.value = currentVal;
        }

        // Apply filtering
        if (filterVal) {
            subjects = subjects.filter(s => {
                const match = s.year ? s.year.toString().match(/\(ปี\s*([^)]+)\)/) : null;
                const acaYearOnly = match ? match[1].split('/').pop() : ''; 
                return acaYearOnly === filterVal || (match && match[1] === filterVal);
            });
        }

        const tbody = document.getElementById('subject-table-body');
        if (!tbody) return;
        tbody.innerHTML = '';
        
        const countSpan = document.getElementById('subject-count-display');
        if (countSpan) countSpan.innerText = subjects.length;

        subjects.forEach(s => {
            const tr = document.createElement('tr');
            
            const acadYearMatch = s.year ? s.year.toString().match(/\(ปี\s*([^)]+)\)/) : null;
            const combinedTermYear = acadYearMatch ? acadYearMatch[1] : '-';
            const yearLevelDisplay = s.year.toString().split(' ')[0];
            const cleanName = s.name.replace(/\s*\(เทอม\s*\d+\)$/, '');

            tr.innerHTML = `
                <td style="text-align: center; color: #1d1d1f; font-weight: 500;">${combinedTermYear}</td>
                <td style="text-align: center;">
                    <a href="javascript:void(0)" class="manage-exams-link" data-id="${s.id}" data-name="${s.name}" style="color: #0071e3; font-weight: 600; text-decoration: none; transition: all 0.2s;">
                        ${cleanName}
                    </a>
                </td>
                <td style="text-align: center; color: #1d1d1f;">${yearLevelDisplay}</td>
                <td style="text-align: center;">
                    <button class="btn toggle-subject-btn" data-id="${s.id}" style="background: ${s.isOpen ? '#e3fbed' : '#f5f5f7'}; color: ${s.isOpen ? '#1e7e46' : '#6e6e73'}; padding: 4px 12px; border-radius: 12px; font-weight: 600; font-size: 11px; border: none; cursor: pointer;">
                        ${s.isOpen ? 'เปิด' : 'ปิด'}
                    </button>
                </td>
                <td style="text-align: center;">
                    <div style="display: flex; gap: 8px; justify-content: center; align-items: center;">
                        <button class="btn btn-sm edit-subject-btn" data-id="${s.id}" style="background: #f5f5f7; color: #1d1d1f; border: 1px solid #d2d2d7; padding: 7px 12px; border-radius: 8px; font-weight: 500; font-size: 12px; cursor: pointer;">แก้ไข</button>
                        <button class="btn btn-sm delete-subject-btn" data-id="${s.id}" style="background: #fff; color: #ff3b30; border: 1px solid #ff3b30; padding: 7px 12px; border-radius: 8px; font-weight: 500; font-size: 12px; cursor: pointer;">ลบ</button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });

        // Bind Subject Status Toggle - Update cache & UI in-place immediately
        document.querySelectorAll('.toggle-subject-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                const sub = Store.getSubjects().find(x => x.id === id);
                if (!sub) return;

                const newIsOpen = !sub.isOpen;
                // Update local cache immediately to prevent stale state
                sub.isOpen = newIsOpen;

                // Update button UI in-place (no re-render needed)
                const btnEl = e.currentTarget;
                btnEl.style.background = newIsOpen ? '#e3fbed' : '#f5f5f7';
                btnEl.style.color = newIsOpen ? '#1e7e46' : '#6e6e73';
                btnEl.innerText = newIsOpen ? 'เปิด' : 'ปิด';

                // Fire DB update (no await - realtime will confirm)
                Store.updateSubject(id, { isOpen: newIsOpen });
            });
        });

        // Bind Edit Subject Button
        document.querySelectorAll('.edit-subject-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.target.getAttribute('data-id');
                const s = Store.getSubjects().find(x => x.id === id);
                if (!s) return;

                const acadYearMatch = s.year ? s.year.toString().match(/\(ปี\s*([^)]+)\)/) : null;
                const currentAcadYear = acadYearMatch ? acadYearMatch[1] : '';
                const currentYearLevel = s.year.toString().split(' ')[0];
                const currentName = s.name.split(' (เทอม')[0];
                const currentTermMatch = s.name.match(/\(เทอม\s*(\d+)\)/);
                const currentTerm = currentTermMatch ? currentTermMatch[1] : '1';

                const newFullAcadYear = prompt('แก้ไขเทอม/ปีการศึกษา (เช่น 1/2567):', currentAcadYear);
                if (newFullAcadYear === null) return;

                const newName = prompt('แก้ไขชื่อวิชา:', currentName);
                if (newName === null) return;

                const newYearLevel = prompt('แก้ไขชั้นปี:', currentYearLevel);
                if (newYearLevel === null) return;

                const updatedFullYear = `${newYearLevel.trim()} (ปี ${newFullAcadYear.trim()})`;
                const updatedFullName = newName.trim(); // Name no longer needs (เทอม X) appended separately

                await Store.updateSubject(id, { 
                    name: updatedFullName,
                    year: updatedFullYear
                });
                AdminPortal.renderSubjects();
            });
        });

        document.querySelectorAll('.delete-subject-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.target.getAttribute('data-id');
                App.showModal('ยืนยันการลบวิชานี้และข้อสอบทั้งหมดในวิชา?', async () => {
                    await Store.deleteSubject(id);
                    AdminPortal.renderSubjects();
                });
            });
        });

        // Bind Manage Exams Link (Subject Name)
        document.querySelectorAll('.manage-exams-link').forEach(link => {
            link.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                const name = e.currentTarget.getAttribute('data-name');
                AdminPortal.currentSubjectId = id;
                AdminPortal.editingId = null;
                
                document.getElementById('editing-subject-title').innerText = `จัดการข้อสอบ: ${name}`;
                document.getElementById('modal-manage-exams').classList.remove('hidden');
                AdminPortal.renderExams(id);
            });
        });
    },

    async saveCard(id, cardEl) {
        const qText = cardEl.querySelector('.edit-q-text').value.trim();
        const choices = Array.from(cardEl.querySelectorAll('.edit-choice-input')).map(input => input.value.trim());
        const correctRadio = cardEl.querySelector(`input[name="correct_${id}"]:checked`);
        
        // Only get imageUrl if the preview wrap is NOT hidden
        const previewWrap = cardEl.querySelector('.card-img-preview-wrap');
        const hasImage = previewWrap && !previewWrap.classList.contains('hidden');
        const imageUrl = hasImage ? cardEl.querySelector('img').src : null;

        if (!qText) {
            App.showModal('กรุณากรอกคำถาม');
            return;
        }

        const updates = {
            questionText: qText,
            choices: choices,
            correctIndex: correctRadio ? parseInt(correctRadio.value) : 0,
            imageUrl: imageUrl
        };

        const result = await Store.updateExamQuestion(id, updates);
        if (result === true || (result && result.success)) {
            AdminPortal.editingId = null;
            AdminPortal.renderExams(AdminPortal.currentSubjectId);
        } else {
            const errorMsg = (result && result.error) ? `: ${result.error}` : '';
            App.showModal(`เกิดข้อผิดพลาดในการบันทึก${errorMsg}`);
        }
    },

    renderStudents() {
        const students = Store.getStudents();
        const search = document.getElementById('search-student').value.trim().toLowerCase();
        const filterAcadYearEl = document.getElementById('filter-student-acad-year');
        const filterAcadYear = filterAcadYearEl ? filterAcadYearEl.value : '';
        
        // Extract unique academic years from student records
        const acadYears = new Set();
        students.forEach(s => {
            const match = s.year ? s.year.toString().match(/\(ปี\s*([^)]+)\)/) : null;
            if (match && match[1]) {
                acadYears.add(match[1].split('/').pop());
            }
        });
        const sortedAcadYears = Array.from(acadYears).sort((a, b) => parseInt(b) - parseInt(a));
        
        // Populate dropdown if not already populated correctly
        if (filterAcadYearEl) {
            const currentVal = filterAcadYearEl.value;
            filterAcadYearEl.innerHTML = '<option value="">ทุกปีการศึกษา</option>';
            sortedAcadYears.forEach(year => {
                const opt = document.createElement('option');
                opt.value = year;
                opt.innerText = year;
                opt.style.textAlign = 'center';
                filterAcadYearEl.appendChild(opt);
            });
            // Restore selection if valid
            if (sortedAcadYears.includes(currentVal)) {
                filterAcadYearEl.value = currentVal;
            }
        }
        
        let filtered = students;
        
        // Apply Academic Year Filter
        if (filterAcadYear) {
            filtered = filtered.filter(s => {
                const match = s.year ? s.year.toString().match(/\(ปี\s*([^)]+)\)/) : null;
                const acaYearOnly = match ? match[1].split('/').pop() : ''; 
                return acaYearOnly === filterAcadYear || (match && match[1] === filterAcadYear);
            });
        }

        // Apply Search Text Filter
        if (search) {
            filtered = filtered.filter(s => 
                s.year.toString().includes(search) || 
                s.room.toLowerCase().includes(search) || 
                `${s.firstName} ${s.lastName}`.toLowerCase().includes(search)
            );
        }

        // Students are kept in chronological order from Store

        const stuCountEl = document.getElementById('stu-count');
        if (stuCountEl) stuCountEl.innerText = filtered.length;

        const tbody = document.getElementById('student-table-body');
        tbody.innerHTML = '';

        filtered.forEach(s => {
            const tr = document.createElement('tr');
            
            const eligBadge = s.isEligible 
                ? `<span style="background: #e3fbed; color: #1e7e46; padding: 4px 0; width: 54px; display: inline-block; text-align: center; border-radius: 12px; font-weight: 600; font-size: 13px;">มี</span>`
                : `<span style="background: #f5f5f7; color: #6e6e73; padding: 4px 0; width: 54px; display: inline-block; text-align: center; border-radius: 12px; font-weight: 600; font-size: 13px;">ไม่มี</span>`;

            const acadYearMatch = s.year ? s.year.toString().match(/\(ปี\s*([^)]+)\)/) : null;
            const acadYearDisplay = acadYearMatch ? acadYearMatch[1] : '-';
            const yearLevelDisplay = s.year.toString().split(' ')[0];

            tr.innerHTML = `
                <td style="text-align: center; color: #1d1d1f; font-weight: 500;">${acadYearDisplay}</td>
                <td style="text-align: center; color: #1d1d1f;">${yearLevelDisplay}</td>
                <td style="text-align: center; color: #1d1d1f;">${s.room}</td>
                <td style="text-align: center; color: #1d1d1f; font-weight: 500;">${s.firstName} ${s.lastName}</td>
                <td style="text-align: center;">
                    <button class="toggle-elig-btn" data-id="${s.id}" style="border:none; cursor:pointer; background:none; padding:0;">
                        ${eligBadge}
                    </button>
                </td>
                <td style="text-align: center;">
                    <div style="display: flex; gap: 8px; justify-content: center; align-items: center;">
                        <button class="btn btn-sm edit-stu-btn" data-id="${s.id}" style="background: #f5f5f7; color: #1d1d1f; border: 1px solid #d2d2d7; padding: 7px 12px; border-radius: 8px; font-weight: 500; font-size: 12px; cursor: pointer;">แก้ไข</button>
                        <button class="btn btn-sm delete-stu-btn" data-id="${s.id}" style="background: #fff; color: #ff3b30; border: 1px solid #ff3b30; padding: 7px 12px; border-radius: 8px; font-weight: 500; font-size: 12px; cursor: pointer;">ลบ</button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });

        document.querySelectorAll('.edit-stu-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.target.getAttribute('data-id');
                const st = Store.getStudents().find(x => x.id === id);
                if (!st) return;

                // Extract current parts
                const currentYearLevel = st.year.toString().split(' ')[0];
                const currentAcadYearMatch = st.year.toString().match(/\(ปี\s*([^)]+)\)/);
                const currentFullAcadYear = currentAcadYearMatch ? currentAcadYearMatch[1] : '';

                const newFullAcadYear = prompt('แก้ไขเทอม/ปีการศึกษา (เช่น 1/2567):', currentFullAcadYear);
                if (newFullAcadYear === null) return;

                const newYearLevel = prompt('แก้ไขชั้นปี:', currentYearLevel);
                if (newYearLevel === null) return;

                const newFullYear = `${newYearLevel.trim()} (ปี ${newFullAcadYear.trim()})`;

                const newRoomInput = prompt('แก้ไขห้อง:', st.room.split('/')[1] || st.room);
                if (newRoomInput === null) return;
                const newRoom = `${newYearLevel.trim()}/${newRoomInput.trim()}`;

                const newName = prompt('แก้ไขชื่อ-นามสกุล:', `${st.firstName} ${st.lastName}`);
                if (newName === null) return;

                if (newName.trim() !== '') {
                    const parts = newName.trim().split(/\s+/);
                    if (parts.length >= 2) {
                        const first = parts[0];
                        const last = parts.slice(1).join(' ');
                        
                        await Store.updateStudent(id, { 
                            year: newFullYear,
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
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                const st = Store.getStudents().find(x => x.id === id);
                if (!st) return;

                const newIsEligible = !st.isEligible;
                // Update local cache immediately to prevent stale state
                st.isEligible = newIsEligible;

                // Update badge UI in-place (no re-render needed)
                const btnEl = e.currentTarget;
                const badge = btnEl.querySelector('span');
                if (badge) {
                    badge.style.background = newIsEligible ? '#e3fbed' : '#f5f5f7';
                    badge.style.color = newIsEligible ? '#1e7e46' : '#6e6e73';
                    badge.innerText = newIsEligible ? 'มี' : 'ไม่มี';
                }

                // Fire DB update (no await - realtime will confirm)
                Store.updateStudentEligibility(id, newIsEligible);
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
            .filter(r => {
                if (!r) return false;
                if (!selectedYear) return true;
                const yearPrefix = selectedYear.toString().split(' ')[0];
                return r.toString().startsWith(yearPrefix + '/');
            })
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
    },

    loadFilters() {
        const students = Store.getStudents();
        const subjects = Store.getSubjects();

        // Academic Years for Students
        const stuAcadYears = new Set();
        students.forEach(s => {
            const match = s.year ? s.year.toString().match(/\(ปี\s*(\d+)\)/) : null;
            if (match) stuAcadYears.add(match[1]);
        });
        
        const stuFilter = document.getElementById('filter-student-acad-year');
        if (stuFilter) {
            const current = stuFilter.value;
            stuFilter.innerHTML = '<option value="">ทุกปีการศึกษา</option>';
            Array.from(stuAcadYears).sort((a, b) => b - a).forEach(y => {
                const opt = document.createElement('option');
                opt.value = y; opt.innerText = y;
                stuFilter.appendChild(opt);
            });
            stuFilter.value = current;
        }

        // Academic Years for Subjects
        const subAcadYears = new Set();
        subjects.forEach(s => {
            const match = s.year ? s.year.toString().match(/\(ปี\s*(\d+)\)/) : null;
            if (match) subAcadYears.add(match[1]);
        });

        const subFilter = document.getElementById('filter-subject-acad-year');
        if (subFilter) {
            const current = subFilter.value;
            subFilter.innerHTML = '<option value="">ทุกปีการศึกษา</option>';
            Array.from(subAcadYears).sort((a, b) => b - a).forEach(y => {
                const opt = document.createElement('option');
                opt.value = y; opt.innerText = y;
                subFilter.appendChild(opt);
            });
            subFilter.value = current;
        }
    }
};

window.AdminPortal = AdminPortal;
