// db.js — IndexedDB wrapper (replaces plain localStorage for plans & history)
// Provides a real browser database with object stores, keys, and async queries.

const DB_NAME    = 'ai_tutor_db';
const DB_VERSION = 1;

const STORES = {
    PLANS   : 'plans',    // one record per student (keyed by email)
    HISTORY : 'history',  // all past generated plans (append-only)
    STUDENTS: 'students'  // student profiles
};

const DB = {
    _db: null,

    // Openi / initialise the database 
    async open() {
        if (this._db) return this._db;

        return new Promise((resolve, reject) => {
            const req = indexedDB.open(DB_NAME, DB_VERSION);

            req.onupgradeneeded = e => {
                const db = e.target.result;

                // Plans store — one active plan per student
                if (!db.objectStoreNames.contains(STORES.PLANS)) {
                    db.createObjectStore(STORES.PLANS, { keyPath: 'email' });
                }

                // History store — every plan ever generated, with auto-increment id
                if (!db.objectStoreNames.contains(STORES.HISTORY)) {
                    const hs = db.createObjectStore(STORES.HISTORY, { keyPath: 'id', autoIncrement: true });
                    hs.createIndex('email', 'email', { unique: false });
                    hs.createIndex('createdAt', 'createdAt', { unique: false });
                }

                // Students store
                if (!db.objectStoreNames.contains(STORES.STUDENTS)) {
                    db.createObjectStore(STORES.STUDENTS, { keyPath: 'email' });
                }
            };

            req.onsuccess = e => { this._db = e.target.result; resolve(this._db); };
            req.onerror   = e => reject(e.target.error);
        });
    },
    async _tx(store, mode, fn) {
        const db = await this.open();
        return new Promise((resolve, reject) => {
            const tx  = db.transaction(store, mode);
            const obj = tx.objectStore(store);
            const req = fn(obj);
            req.onsuccess = () => resolve(req.result);
            req.onerror   = () => reject(req.error);
        });
    },

    // Students 
    async saveStudent(student) {
        return this._tx(STORES.STUDENTS, 'readwrite', s => s.put(student));
    },

    async getStudent(email) {
        return this._tx(STORES.STUDENTS, 'readonly', s => s.get(email));
    },

    // Active Plan (one per student) 
    async savePlan(email, plan) {
        const record = { email, plan, savedAt: new Date().toISOString() };
        return this._tx(STORES.PLANS, 'readwrite', s => s.put(record));
    },

    async getPlan(email) {
        const record = await this._tx(STORES.PLANS, 'readonly', s => s.get(email));
        return record ? record.plan : null;
    },

    async deletePlan(email) {
        return this._tx(STORES.PLANS, 'readwrite', s => s.delete(email));
    },

    // History (append-only log of all plans) 
    async addToHistory(email, plan) {
        const record = {
            email,
            topic      : plan.metadata?.topic || 'Unknown',
            goal       : plan.metadata?.goal  || '',
            weaknesses : plan.metadata?.weaknessFocus || '',
            createdAt  : new Date().toISOString(),
            plan       : plan
        };
        return this._tx(STORES.HISTORY, 'readwrite', s => s.add(record));
    },

    async getHistory(email) {
        const db = await this.open();
        return new Promise((resolve, reject) => {
            const tx    = db.transaction(STORES.HISTORY, 'readonly');
            const store = tx.objectStore(STORES.HISTORY);
            const index = store.index('email');
            const req   = index.getAll(email);
            req.onsuccess = () => resolve(req.result.reverse()); 
            req.onerror   = () => reject(req.error);
        });
    },

    //  Task checkbox update inside DB 
    async updateTask(email, dayId, taskId, completed) {
        const plan = await this.getPlan(email);
        if (!plan) return;
        const day  = plan.roadmap.find(d => d.id === dayId);
        if (day) {
            const task = day.tasks.find(t => t.id === taskId);
            if (task) {
                task.completed = completed;
                await this.savePlan(email, plan);
            }
        }
        return plan;
    },

    // Progress calculation 
    async calculateProgress(email) {
        const plan = await this.getPlan(email);
        if (!plan) return 0;
        let total = 0, done = 0;
        plan.roadmap.forEach(d => d.tasks.forEach(t => { total++; if (t.completed) done++; }));
        return total === 0 ? 0 : Math.round((done / total) * 100);
    }
};

window.DB = DB;
console.log('[DB] IndexedDB module ready.');
