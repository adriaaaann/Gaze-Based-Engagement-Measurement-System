export class TrialManager {
    /**
     * Generates a balanced, randomized sequence of AOI targets with no immediate repeats.
     * @param {number} length 
     * @returns {string[]} sequence
     */
    static generateTargetSequence(length = 18) {
        const aois = ['LEFT', 'TOP', 'RIGHT', 'BOTTOM'];
        let pool = [];
        for (let i = 0; i < Math.ceil(length / aois.length); i++) {
            pool.push(...aois);
        }
        
        const shuffle = (array) => {
            let currentIndex = array.length, randomIndex;
            while (currentIndex !== 0) {
                randomIndex = Math.floor(Math.random() * currentIndex);
                currentIndex--;
                [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
            }
        };

        let valid = false;
        while (!valid) {
            shuffle(pool);
            valid = true;
            for (let i = 1; i < length; i++) {
                if (pool[i] === pool[i-1]) {
                    valid = false;
                    break;
                }
            }
        }
        return pool.slice(0, length);
    }
}
