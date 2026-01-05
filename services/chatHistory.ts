import { ChatSession, ChatMessage } from '../types';

const STORAGE_KEY_PREFIX = 'copilot_sessions_';
const MAX_SESSIONS = 20; // Limit to prevent storage bloat

// Helper to serialize messages (convert Date to string)
const serializeMessages = (messages: ChatMessage[]): any[] => {
    return messages.map(m => ({
        ...m,
        timestamp: m.timestamp.toISOString()
    }));
};

// Helper to deserialize messages (convert string to Date)
const deserializeMessages = (messages: any[]): ChatMessage[] => {
    return messages.map(m => ({
        ...m,
        timestamp: new Date(m.timestamp)
    }));
};

export const getChatSessions = (email: string): ChatSession[] => {
    try {
        const key = STORAGE_KEY_PREFIX + email;
        const stored = localStorage.getItem(key);
        if (!stored) return [];

        const sessions = JSON.parse(stored);
        return sessions.map((s: any) => ({
            ...s,
            messages: deserializeMessages(s.messages)
        }));
    } catch (error) {
        console.error('Failed to load chat sessions', error);
        return [];
    }
};

export const saveChatSession = (email: string, session: ChatSession): void => {
    try {
        const key = STORAGE_KEY_PREFIX + email;
        const sessions = getChatSessions(email);

        // Update or add session
        const index = sessions.findIndex(s => s.id === session.id);
        const sessionToSave = {
            ...session,
            messages: serializeMessages(session.messages),
            updatedAt: new Date().toISOString()
        };

        if (index >= 0) {
            sessions[index] = sessionToSave as any;
        } else {
            sessions.unshift(sessionToSave as any);
        }

        // Limit number of sessions
        const limitedSessions = sessions.slice(0, MAX_SESSIONS);

        localStorage.setItem(key, JSON.stringify(limitedSessions));
    } catch (error) {
        console.error('Failed to save chat session', error);
    }
};

export const deleteChatSession = (email: string, sessionId: string): void => {
    try {
        const key = STORAGE_KEY_PREFIX + email;
        const sessions = getChatSessions(email);
        const filtered = sessions.filter(s => s.id !== sessionId);

        const serialized = filtered.map(s => ({
            ...s,
            messages: serializeMessages(s.messages)
        }));

        localStorage.setItem(key, JSON.stringify(serialized));
    } catch (error) {
        console.error('Failed to delete chat session', error);
    }
};

export const createNewSession = (userName: string, themeName: string): ChatSession => {
    return {
        id: crypto.randomUUID(),
        title: 'New Chat',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messages: [{
            id: 'init',
            text: `Hey ${userName}! I'm ready to help you plan the "${themeName}" era. Need ideas or tasks?`,
            sender: 'ai',
            timestamp: new Date()
        }]
    };
};

export const generateSessionTitle = (firstUserMessage: string): string => {
    // Use first 40 chars of first user message as title
    const title = firstUserMessage.trim().slice(0, 40);
    return title.length < firstUserMessage.trim().length ? title + '...' : title;
};
