// state.js
// Handles saving and loading user data and study plans to localStorage for the MVP.

const StorageKeys = {
    USER_DATA: 'ai_tutor_user_data',
    CURRENT_PLAN: 'ai_tutor_active_plan'
};

const State = {
    saveUserData(data) {
        localStorage.setItem(StorageKeys.USER_DATA, JSON.stringify(data));
    },
    
    loadUserData() {
        const data = localStorage.getItem(StorageKeys.USER_DATA);
        return data ? JSON.parse(data) : null;
    },

    savePlan(plan) {
        localStorage.setItem(StorageKeys.CURRENT_PLAN, JSON.stringify(plan));
    },

    loadPlan() {
        const data = localStorage.getItem(StorageKeys.CURRENT_PLAN);
        return data ? JSON.parse(data) : null;
    },

    clearAll() {
        localStorage.removeItem(StorageKeys.USER_DATA);
        localStorage.removeItem(StorageKeys.CURRENT_PLAN);
    },

    // Utility to toggle the status of a specific task within a day and save
    updateTaskStatus(dayId, taskId, isCompleted) {
        const plan = this.loadPlan();
        if (!plan) return;

        const day = plan.roadmap.find(d => d.id === dayId);
        if (day) {
            const task = day.tasks.find(t => t.id === taskId);
            if (task) {
                task.completed = isCompleted;
                this.savePlan(plan);
            }
        }
    },

    // Dynamically calculate what percentage of tasks are checked off
    calculateProgress() {
        const plan = this.loadPlan();
        if (!plan) return 0;

        let total = 0;
        let completed = 0;

        plan.roadmap.forEach(day => {
            day.tasks.forEach(task => {
                total++;
                if (task.completed) completed++;
            });
        });

        return total === 0 ? 0 : Math.round((completed / total) * 100);
    }
};

// Make State globally available for other scripts
window.AppState = State;
console.log('State module loaded.');
