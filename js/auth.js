// auth.js — Student Login / Session Management

const Auth = {
    STORAGE_KEY: 'ai_tutor_student',

    getStudent() {
        const raw = localStorage.getItem(this.STORAGE_KEY);
        return raw ? JSON.parse(raw) : null;
    },

    login(name, email) {
        const student = { name, email, joinedAt: new Date().toISOString() };
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(student));
        return student;
    },

    logout() {
        localStorage.removeItem(this.STORAGE_KEY);
        localStorage.removeItem('ai_tutor_active_plan');
    },

    isLoggedIn() {
        return !!this.getStudent();
    }
};

window.Auth = Auth;
