/**
 * AuthService — singleton client for ChalyshAuth API.
 *
 * Handles Telegram login, token management (localStorage),
 * auto-refresh, user profile, and additionalFields (best score).
 */

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

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

export type AuthProviderType = 'google' | 'telegram';

/* ------------------------------------------------------------------ */
/*  Storage helpers                                                    */
/* ------------------------------------------------------------------ */

export const APP_ID = 'space_shooter';
const APP_PROVIDER_KEY = `${APP_ID}_auth_provider`;

export function hasTokensFor(provider: AuthProviderType): boolean {
    return !!localStorage.getItem(`${provider}_accessToken`) && !!localStorage.getItem(`${provider}_refreshToken`);
}

export function getAvailableProviders(): AuthProviderType[] {
    const list: AuthProviderType[] = [];
    if (hasTokensFor('google')) list.push('google');
    if (hasTokensFor('telegram')) list.push('telegram');
    return list;
}

export function getActiveProvider(): AuthProviderType | null {
    const hasGoogle = hasTokensFor('google');
    const hasTelegram = hasTokensFor('telegram');

    if (!hasGoogle && !hasTelegram) {
        return null;
    }
    if (hasGoogle && !hasTelegram) {
        return 'google';
    }
    if (hasTelegram && !hasGoogle) {
        return 'telegram';
    }

    const stored = localStorage.getItem(APP_PROVIDER_KEY) as AuthProviderType | null;
    if (stored === 'google' || stored === 'telegram') {
        return stored;
    }

    return 'google';
}

export function setActiveProvider(provider: AuthProviderType): void {
    localStorage.setItem(APP_PROVIDER_KEY, provider);
}

function saveTokens(access: string, refresh: string, provider?: AuthProviderType): void {
    const target = provider || getActiveProvider() || 'google';
    localStorage.setItem(`${target}_accessToken`, access);
    localStorage.setItem(`${target}_refreshToken`, refresh);
    localStorage.setItem(APP_PROVIDER_KEY, target);
}

function clearTokens(onlyCurrent: boolean = true): void {
    const current = getActiveProvider();
    if (current && onlyCurrent) {
        localStorage.removeItem(`${current}_accessToken`);
        localStorage.removeItem(`${current}_refreshToken`);
        localStorage.removeItem(`${current}_user`);
        const remaining = getActiveProvider();
        if (remaining) {
            localStorage.setItem(APP_PROVIDER_KEY, remaining);
        } else {
            localStorage.removeItem(APP_PROVIDER_KEY);
        }
    } else {
        localStorage.removeItem('google_accessToken');
        localStorage.removeItem('google_refreshToken');
        localStorage.removeItem('google_user');
        localStorage.removeItem('telegram_accessToken');
        localStorage.removeItem('telegram_refreshToken');
        localStorage.removeItem('telegram_user');
        localStorage.removeItem(APP_PROVIDER_KEY);
    }
}

function getAccessToken(): string | null {
    const provider = getActiveProvider();
    if (!provider) return null;
    return localStorage.getItem(`${provider}_accessToken`);
}

function getRefreshTokenValue(): string | null {
    const provider = getActiveProvider();
    if (!provider) return null;
    return localStorage.getItem(`${provider}_refreshToken`);
}

function saveUser(user: AuthUser, provider?: AuthProviderType): void {
    const target = provider || getActiveProvider() || 'google';
    localStorage.setItem(`${target}_user`, JSON.stringify(user));
}

function loadUser(): AuthUser | null {
    const provider = getActiveProvider();
    if (!provider) return null;
    const raw = localStorage.getItem(`${provider}_user`);
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
        return !!getAccessToken();
    }

    getUser(): AuthUser | null {
        return this.user;
    }

    getActiveProvider(): AuthProviderType | null {
        return getActiveProvider();
    }

    getAvailableProviders(): AuthProviderType[] {
        return getAvailableProviders();
    }

    async switchProvider(provider: AuthProviderType): Promise<boolean> {
        setActiveProvider(provider);
        this.user = loadUser();
        const token = getAccessToken();
        if (token) {
            await this.getProfile();
            return true;
        }
        return false;
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
        saveTokens(result.accessToken, result.refreshToken, 'telegram');
        saveUser(result.user, 'telegram');
        setActiveProvider('telegram');
        this.user = result.user;
        return result;
    }

    async loginWithGoogle(idToken: string): Promise<AuthResult> {
        const res = await fetch(`${API_BASE}/api/auth/google`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken }),
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error((err as { message?: string }).message || 'Google login failed');
        }

        const result: AuthResult = await res.json();
        saveTokens(result.accessToken, result.refreshToken, 'google');
        saveUser(result.user, 'google');
        setActiveProvider('google');
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
        clearTokens(true);
        const remaining = getActiveProvider();
        if (remaining) {
            this.user = loadUser();
            await this.getProfile();
        } else {
            this.user = null;
        }
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

    async getLeaderboard(): Promise<Array<{ username: string | null; firstName: string; bestScore: number }>> {
        try {
            const res = await this.authFetch(`${API_BASE}/api/user/leaderboard`);
            if (!res.ok) return [];
            const data = await res.json();
            return (data as { leaderboard: Array<any> }).leaderboard ?? [];
        } catch {
            return [];
        }
    }

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
        const res = await this.authFetch(`${API_BASE}/api/user/me/fields`, {
            method: 'PATCH',
            body: JSON.stringify(fields),
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error((err as { message?: string }).message || 'Failed to update fields');
        }
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
