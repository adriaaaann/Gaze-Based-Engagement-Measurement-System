
export class Router {
    constructor() {
        this.screens = document.querySelectorAll('.screen');
    }

    navigate(screenId) {
        this.screens.forEach(s => s.classList.remove('active'));
        const target = document.getElementById(screenId);
        if (target) {
            target.classList.add('active');
        } else {
            console.error(`Screen ${screenId} not found`);
        }
    }
}
