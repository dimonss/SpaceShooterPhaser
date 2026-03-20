/**
 * AuthService — singleton client for ChalyshAuth API.
 *
 * Handles Telegram login, token management (localStorage),
 * auto-refresh, user profile, and additionalFields (best score).
 */

const API_BASE = 'http://localhost:3000';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface AuthUser {
    id: string;
    telegramId: string | null;
    googleId: string | null;
    email: string | null;
    firstName: string;
    lastName: string | null;
    username: string | null;
    photoUrl: string | null;
}

export interface AuthResult {
    accessToken: string;
    refreshToken: string;
    user: AuthUser;
}

export interface TelegramLoginData {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    photo_url?: string;
    auth_date: number;
    hash: string;
}

/* ------------------------------------------------------------------ */
/*  Storage helpers                                                    */
/* ------------------------------------------------------------------ */

const KEYS = {
    ACCESS: 'chalysh_access_token',
    REFRESH: 'chalysh_refresh_token',
    USER: 'chalysh_user',
} as const;

function saveTokens(access: string, refresh: string): void {
    localStorage.setItem(KEYS.ACCESS, access);
    localStorage.setItem(KEYS.REFRESH, refresh);
}

function clearTokens(): void {
    localStorage.removeItem(KEYS.ACCESS);
    localStorage.removeItem(KEYS.REFRESH);
    localStorage.removeItem(KEYS.USER);
}

function getAccessToken(): string | null {
    return localStorage.getItem(KEYS.ACCESS);
}

function getRefreshTokenValue(): string | null {
    return localStorage.getItem(KEYS.REFRESH);
}

function saveUser(user: AuthUser): void {
    localStorage.setItem(KEYS.USER, JSON.stringify(user));
}

function loadUser(): AuthUser | null {
    const raw = localStorage.getItem(KEYS.USER);
    if (!raw) return null;
    try {
        return JSON.parse(raw) as AuthUser;
    } catch {
        return null;
    }
}

/* ------------------------------------------------------------------ */
/*  AuthService class                                                  */
/* ------------------------------------------------------------------ */

class AuthService {
    private user: AuthUser | null = null;

    constructor() {
        this.user = loadUser();
    }

    /* --- state ---------------------------------------------------- */

    isLoggedIn(): boolean {
        return !!getAccessToken() && !!this.user;
    }

    getUser(): AuthUser | null {
        return this.user;
    }

    /* --- auth ----------------------------------------------------- */

    async loginWithTelegram(data: TelegramLoginData): Promise<AuthResult> {
        const res = await fetch(`${API_BASE}/api/auth/telegram`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error((err as { message?: string }).message || 'Telegram login failed');
        }

        const result: AuthResult = await res.json();
        saveTokens(result.accessToken, result.refreshToken);
        saveUser(result.user);
        this.user = result.user;
        return result;
    }

    async refreshTokens(): Promise<boolean> {
        const rt = getRefreshTokenValue();
        if (!rt) return false;

        try {
            const res = await fetch(`${API_BASE}/api/auth/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken: rt }),
            });

            if (!res.ok) {
                clearTokens();
                this.user = null;
                return false;
            }

            const data: { accessToken: string; refreshToken: string } = await res.json();
            saveTokens(data.accessToken, data.refreshToken);
            return true;
        } catch {
            clearTokens();
            this.user = null;
            return false;
        }
    }

    async logout(): Promise<void> {
        const rt = getRefreshTokenValue();
        if (rt) {
            await fetch(`${API_BASE}/api/auth/logout`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken: rt }),
            }).catch(() => {});
        }
        clearTokens();
        this.user = null;
    }

    /* --- authorised requests -------------------------------------- */

    private async authFetch(url: string, options: RequestInit = {}): Promise<Response> {
        const token = getAccessToken();
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            ...(options.headers as Record<string, string> || {}),
        };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        let res = await fetch(url, { ...options, headers });

        // If 401 — try to refresh and retry once
        if (res.status === 401) {
            const refreshed = await this.refreshTokens();
            if (refreshed) {
                const newToken = getAccessToken();
                if (newToken) headers['Authorization'] = `Bearer ${newToken}`;
                res = await fetch(url, { ...options, headers });
            }
        }

        return res;
    }

    /* --- profile & fields ----------------------------------------- */

    async getProfile(): Promise<AuthUser | null> {
        try {
            const res = await this.authFetch(`${API_BASE}/api/user/me`);
            if (!res.ok) return null;
            const data = await res.json();
            this.user = data as AuthUser;
            saveUser(this.user);
            return this.user;
        } catch {
            return null;
        }
    }

    async getFields(): Promise<Record<string, unknown>> {
        try {
            const res = await this.authFetch(`${API_BASE}/api/user/me/fields`);
            if (!res.ok) return {};
            const data = await res.json();
            return (data as { additionalFields: Record<string, unknown> }).additionalFields ?? {};
        } catch {
            return {};
        }
    }

    async updateFields(fields: Record<string, unknown>): Promise<void> {
        await this.authFetch(`${API_BASE}/api/user/me/fields`, {
            method: 'PATCH',
            body: JSON.stringify(fields),
        });
    }

    /**
     * Try to restore the session from localStorage.
     * Returns true if the user is still authenticated.
     */
    async tryRestoreSession(): Promise<boolean> {
        if (!getAccessToken() || !getRefreshTokenValue()) {
            return false;
        }

        // Quick profile fetch to validate the session
        const profile = await this.getProfile();
        return !!profile;
    }
}

/* ------------------------------------------------------------------ */
/*  Singleton                                                          */
/* ------------------------------------------------------------------ */

export const authService = new AuthService();
