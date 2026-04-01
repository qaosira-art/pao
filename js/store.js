// Polyfill for randomUUID (since file:/// or some HTTP setups don't allow crypto.randomUUID securely)
if (typeof crypto === 'undefined' || !crypto.randomUUID) {
    if (typeof crypto === 'undefined') window.crypto = {};
    crypto.randomUUID = function () {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    };
}

const Store = {
    isReady: false,
    supabase: null,
    cache: { rooms: [], subjects: [], students: [], exams: [], scores: [] },
    async initFirebase() {
        console.log("Store.initFirebase: Starting...");
        const SUPABASE_URL = 'https://cmzbbigtowewhdnvmasr.supabase.co';
        const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtemJiaWd0b3dld2hkbnZtYXNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2OTA0NDQsImV4cCI6MjA5MDI2NjQ0NH0.EWqOxWnoByg7NBZXbmB3o_UYDCUiv8Ge_l9BX307Zx8';

        if (!window.supabase) {
            console.error("Store: Supabase SDK not found in window");
            alert("⚠️ ระบบขัดข้อง: ไม่สามารถเชื่อมต่อฐานข้อมูลได้ (Supabase SDK missing)");
            return;
        }

        try {
            this.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
            console.log("Store: Client created.");

            // Fetch initial data
            await Promise.all([
                this.fetchCollection('rooms'),
                this.fetchCollection('subjects'),
                this.fetchCollection('students'),
                this.fetchCollection('exams'),
                this.fetchCollection('scores')
            ]);
            
            this.isReady = true;
            console.log("Store: Initial fetch successful. Cache loaded.");
            this.subscribeToAll();
        } catch (e) {
            console.error("Store: Initialization failed: ", e);
            alert("⚠️ ระบบขัดข้อง: การเชื่อมต่อฐานข้อมูลผิดพลาด " + e.message);
        }
    },

    async fetchCollection(colName) {
        if (!this.supabase) return;
        const { data, error } = await this.supabase.from(colName).select('*').order('created_at', { ascending: true });
        if (error) {
            console.error(`Error loading ${colName}:`, error);
        } else {
            this.cache[colName] = data || [];
        }
    },

    subscribeToAll() {
        if (!this.supabase) return;
        this.supabase.channel('public:all')
            .on('postgres_changes', { event: '*', schema: 'public' }, payload => {
                const table = payload.table;
                if (!this.cache[table]) return;
                
                const eventType = payload.eventType;
                const newRec = payload.new;
                const oldRec = payload.old;
                
                if (eventType === 'INSERT') {
                    if (!this.cache[table].find(x => x.id === newRec.id)) this.cache[table].push(newRec);
                } else if (eventType === 'UPDATE') {
                    const idx = this.cache[table].findIndex(x => x.id === newRec.id);
                    if (idx > -1) this.cache[table][idx] = newRec;
                } else if (eventType === 'DELETE') {
                    const idx = this.cache[table].findIndex(x => x.id === oldRec.id);
                    if (idx > -1) this.cache[table].splice(idx, 1);
                }
                
                this.cache[table].sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));
                this.refreshUI(table);
            })
            .subscribe((status, err) => {
                if(err) console.error("Realtime err:", err);
            });
    },
    
    refreshUI(colName) {
        if (window.App && window.App.currentUser) {
            const role = window.App.currentUser.role;
            if (role === 'admin' && window.AdminPortal) {
                if (colName === 'rooms') window.AdminPortal.renderRooms();
                if (colName === 'subjects') window.AdminPortal.renderSubjects();
                if (colName === 'students') window.AdminPortal.renderStudents();
                if (colName === 'exams') {
                    const el = document.getElementById('exam-subject-select');
                    if(el && el.value) window.AdminPortal.renderExams(el.value);
                }
            }
            if (role === 'advisor' && window.AdvisorPortal && colName === 'scores') window.AdvisorPortal.renderTable();
            if (role === 'student' && window.StudentPortal && colName === 'students') window.StudentPortal.renderLoginTable();
        }
    },

    // Rooms
    getRooms() {
        return this.cache.rooms.map(r => r.name); 
    },
    async addRoom(name) {
        if(!this.isReady) return { success: false, error: 'Store not initialized' };
        const exists = this.cache.rooms.find(r => r.name === name);
        if (exists) return { success: false, error: 'duplicate' };
        
        const tempId = crypto.randomUUID();
        const data = { id: tempId, name };
        this.cache.rooms.push(data);

        const { error } = await this.supabase.from('rooms').insert([data]);
        if (error) {
            console.error("Supabase addRoom error:", error);
            this.cache.rooms = this.cache.rooms.filter(r => r.id !== tempId);
            return { success: false, error: error.message };
        }
        return { success: true };
    },
    async deleteRoom(name) {
        const roomIndex = this.cache.rooms.findIndex(r => r.name === name);
        if (roomIndex > -1) {
            const roomId = this.cache.rooms[roomIndex].id;
            const removed = this.cache.rooms.splice(roomIndex, 1);
            const { error } = await this.supabase.from('rooms').delete().eq('id', roomId);
            if (error) {
                console.error("Supabase deleteRoom error:", error);
                this.cache.rooms.splice(roomIndex, 0, ...removed);
                return false;
            }
        }
        return true;
    },

    // Subjects
    getSubjects() { return this.cache.subjects; },
    async addSubject(name, year) {
        if(!this.isReady) return { success: false, error: 'Store not initialized' };
        const tempId = crypto.randomUUID();
        const data = { id: tempId, name, year, isOpen: false };
        this.cache.subjects.push(data);
        const { error } = await this.supabase.from('subjects').insert([data]);
        if (error) {
            console.error("Supabase addSubject error:", error);
            this.cache.subjects = this.cache.subjects.filter(s => s.id !== tempId);
            return { success: false, error: error.message };
        }
        return { success: true };
    },
    async updateSubject(id, updates) {
        const sIndex = this.cache.subjects.findIndex(s => s.id === id);
        if (sIndex > -1) {
            const old = { ...this.cache.subjects[sIndex] };
            this.cache.subjects[sIndex] = { ...this.cache.subjects[sIndex], ...updates };
            const { error } = await this.supabase.from('subjects').update(updates).eq('id', id);
            if (error) {
                console.error("Supabase updateSubject error:", error);
                this.cache.subjects[sIndex] = old;
                return false;
            }
        }
        return true;
    },
    async deleteSubject(id) {
        const sIndex = this.cache.subjects.findIndex(s => s.id === id);
        if (sIndex > -1) {
            const removed = this.cache.subjects.splice(sIndex, 1);
            const { error } = await this.supabase.from('subjects').delete().eq('id', id);
            if (error) {
                console.error("Supabase deleteSubject error:", error);
                this.cache.subjects.splice(sIndex, 0, ...removed);
                return false;
            }
            this.deleteExamsBySubject(id);
        }
        return true;
    },

    // Students
    getStudents() { return this.cache.students; },
    async addStudent(year, room, firstName, lastName) {
        if(!this.isReady) return { success: false, error: 'Store not initialized' };
        const fullName = `${firstName} ${lastName}`.trim();
        const exists = this.cache.students.some(s => `${s.firstName} ${s.lastName}`.trim() === fullName);
        if (exists) return { success: false, error: 'duplicate' };

        const tempId = crypto.randomUUID();
        const data = {
            id: tempId,
            year: year,
            room: room,
            firstName: firstName,
            lastName: lastName,
            isEligible: true,
            profilePicture: null
        };
        this.cache.students.push(data);
        const { error } = await this.supabase.from('students').insert([data]);
        if (error) {
            console.error("Supabase addStudent error:", error);
            this.cache.students = this.cache.students.filter(s => s.id !== tempId);
            return { success: false, error: error.message };
        }
        return { success: true };
    },
    async updateStudent(id, updates) {
        const stIndex = this.cache.students.findIndex(s => s.id === id);
        if (stIndex > -1) {
            const old = { ...this.cache.students[stIndex] };
            this.cache.students[stIndex] = { ...this.cache.students[stIndex], ...updates };
            const { error } = await this.supabase.from('students').update(updates).eq('id', id);
            if (error) {
                console.error("Supabase updateStudent error:", error);
                this.cache.students[stIndex] = old;
                return false;
            }
        }
        return true;
    },
    async updateStudentEligibility(id, status) {
        return this.updateStudent(id, { isEligible: status });
    },
    async deleteStudent(id) {
        const stIndex = this.cache.students.findIndex(s => s.id === id);
        if (stIndex > -1) {
            const removed = this.cache.students.splice(stIndex, 1);
            const { error } = await this.supabase.from('students').delete().eq('id', id);
            if (error) {
                console.error("Supabase deleteStudent error:", error);
                this.cache.students.splice(stIndex, 0, ...removed);
                return false;
            }
        }
        return true;
    },
    async deleteAllStudents() {
        const allIds = this.cache.students.map(s => s.id);
        const oldCache = [...this.cache.students];
        this.cache.students = [];
        if(allIds.length > 0) {
            const { error } = await this.supabase.from('students').delete().in('id', allIds);
            if (error) {
                console.error("Supabase deleteAllStudents error:", error);
                this.cache.students = oldCache;
                return false;
            }
        }
        return true;
    },

    // Exams (Questions)
    getExams() { return this.cache.exams; },
    getExamsBySubject(subjectId) {
        return this.cache.exams.filter(e => e.subjectId === subjectId);
    },
    async addExamQuestion(subjectId, questionText, choices, correctIndex) {
        if(!this.isReady) return { success: false, error: 'Store not initialized' };
        const tempId = crypto.randomUUID();
        const data = {
            id: tempId,
            subjectId: subjectId,
            questionText: questionText,
            choices: choices,
            correctIndex: parseInt(correctIndex)
        };
        this.cache.exams.push(data);
        const { error } = await this.supabase.from('exams').insert([data]);
        if (error) {
            console.error("Supabase addExamQuestion error:", error);
            this.cache.exams = this.cache.exams.filter(e => e.id !== tempId);
            return { success: false, error: error.message };
        }
        return { success: true };
    },
    async updateExamQuestion(id, updates) {
        const index = this.cache.exams.findIndex(e => e.id === id);
        if (index > -1) {
            const old = { ...this.cache.exams[index] };
            this.cache.exams[index] = { ...this.cache.exams[index], ...updates };
            const { error } = await this.supabase.from('exams').update(updates).eq('id', id);
            if (error) {
                console.error("Supabase updateExamQuestion error:", error);
                this.cache.exams[index] = old;
                return false;
            }
        }
        return true;
    },
    async deleteExamQuestion(id) {
        const index = this.cache.exams.findIndex(e => e.id === id);
        if (index > -1) {
            const removed = this.cache.exams.splice(index, 1);
            const { error } = await this.supabase.from('exams').delete().eq('id', id);
            if (error) {
                console.error("Supabase deleteExamQuestion error:", error);
                this.cache.exams.splice(index, 0, ...removed);
                return false;
            }
        }
        return true;
    },
    async deleteExamsBySubject(subjectId) {
        const toDeleteIds = this.cache.exams.filter(e => e.subjectId === subjectId).map(e => e.id);
        const oldExams = [...this.cache.exams];
        this.cache.exams = this.cache.exams.filter(e => e.subjectId !== subjectId);
        if (toDeleteIds.length > 0) {
            const { error } = await this.supabase.from('exams').delete().in('id', toDeleteIds);
            if (error) {
                console.error("Supabase deleteExamsBySubject error:", error);
                this.cache.exams = oldExams;
                return false;
            }
        }
        return true;
    },

    // Scores
    getScores() { return this.cache.scores; },
    async addScore(studentId, subjectId, score, total) {
        if(!this.isReady) return { success: false, error: 'Store not initialized' };
        const existing = this.cache.scores.find(s => s.studentId === studentId && s.subjectId === subjectId);
        
        if (existing) {
            const updates = { score, total, date: new Date().toISOString() };
            const old = { ...existing };
            Object.assign(existing, updates);
            const { error } = await this.supabase.from('scores').update(updates).eq('id', existing.id);
            if (error) {
                console.error("Supabase updateScore error:", error);
                Object.assign(existing, old);
                return { success: false, error: error.message };
            }
        } else {
            const tempId = crypto.randomUUID();
            const record = { id: tempId, studentId, subjectId, score, total, date: new Date().toISOString() };
            this.cache.scores.push(record);
            const { error } = await this.supabase.from('scores').insert([record]);
            if (error) {
                console.error("Supabase addScore error:", error);
                this.cache.scores = this.cache.scores.filter(s => s.id !== tempId);
                return { success: false, error: error.message };
            }
        }
        return { success: true };
    },
    getStudentScores(studentId) {
        return this.cache.scores.filter(s => s.studentId === studentId);
    }
};

window.Store = Store;
