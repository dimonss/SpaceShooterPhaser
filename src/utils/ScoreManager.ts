export interface ScoreEntry {
    username: string;
    score: number;
    date: string;
}

const STORAGE_KEY = 'space_shooter_scores';

export class ScoreManager {
    static saveScore(username: string, score: number): void {
        const normalizedUsername = ScoreManager.normalizeUsername(username);
        const scores = ScoreManager.getAllScores();
        const existingIndex = scores.findIndex((entry) => entry.username === normalizedUsername);

        if (existingIndex === -1) {
            scores.push({
                username: normalizedUsername,
                score,
                date: new Date().toLocaleDateString(),
            });
        } else if (score > scores[existingIndex].score) {
            scores[existingIndex] = {
                ...scores[existingIndex],
                score,
                date: new Date().toLocaleDateString(),
            };
        }

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

            const parsed: unknown = JSON.parse(raw);
            if (!Array.isArray(parsed)) return [];
            const uniqueByUsername = new Map<string, ScoreEntry>();

            for (const entry of parsed) {
                if (!entry || typeof entry !== 'object') continue;

                const { username: rawUsername, score, date } = entry as {
                    username?: unknown;
                    score?: unknown;
                    date?: unknown;
                };

                if (typeof score !== 'number') continue;

                const username = ScoreManager.normalizeUsername(
                    typeof rawUsername === 'string' ? rawUsername : 'PILOT',
                );
                const existing = uniqueByUsername.get(username);

                if (!existing || score > existing.score) {
                    uniqueByUsername.set(username, {
                        username,
                        score,
                        date: typeof date === 'string' ? date : new Date().toLocaleDateString(),
                    });
                }
            }

            return Array.from(uniqueByUsername.values());
        } catch {
            return [];
        }
    }

    private static normalizeUsername(username: string): string {
        return (username || 'PILOT').trim().toUpperCase();
    }
}
