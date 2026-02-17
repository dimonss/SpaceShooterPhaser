export interface ScoreEntry {
    username: string;
    score: number;
    date: string;
}

const STORAGE_KEY = 'space_shooter_scores';

export class ScoreManager {
    static saveScore(username: string, score: number): void {
        const scores = ScoreManager.getAllScores();
        scores.push({
            username,
            score,
            date: new Date().toLocaleDateString(),
        });
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(scores));
        } catch {
            // localStorage may be unavailable or full — silently fail
        }
    }

    static getTopScores(limit = 5): ScoreEntry[] {
        return ScoreManager.getAllScores()
            .sort((a, b) => b.score - a.score)
            .slice(0, limit);
    }

    private static getAllScores(): ScoreEntry[] {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return [];
            return JSON.parse(raw) as ScoreEntry[];
        } catch {
            return [];
        }
    }
}
