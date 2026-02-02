import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { UserProfile, ChatMessage, Task, Theme } from '@shared/types';
import { chatWithCopilot } from '@shared/services/gemini';
import { getChatSessions, saveChatSession, createNewSession } from '@shared/services/chatHistory';
import { Send, Bot, User, Sparkles } from 'lucide-react-native';

interface CopilotProps {
    user: UserProfile;
    currentTheme: Theme;
    tasks: Task[];
    onClose: () => void;
}

const Copilot: React.FC<CopilotProps> = ({ user, currentTheme, tasks, onClose }) => {
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const flatListRef = useRef<FlatList>(null);

    // Load initial session on mount
    useEffect(() => {
        // Ideally load from history, for now start fresh or simple
        const sessions = getChatSessions(user.email);
        if (sessions.length > 0) {
            setMessages(sessions[0].messages);
        } else {
            const newSession = createNewSession(user.name, currentTheme.title);
            setMessages(newSession.messages);
        }
    }, []);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMsg: ChatMessage = {
            id: Date.now().toString(),
            text: input,
            sender: 'user',
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        try {
            // Prepare history for API
            const history = messages.map(m => ({
                role: m.sender === 'user' ? 'user' : 'model',
                parts: [{ text: m.text }]
            }));

            const responseText = await chatWithCopilot(history, input, user, currentTheme, tasks, []);

            const aiMsg: ChatMessage = {
                id: (Date.now() + 1).toString(),
                text: responseText,
                sender: 'ai',
                timestamp: new Date()
            };

            setMessages(prev => [...prev, aiMsg]);

            // Save session (basic)
            if (messages.length > 0) {
                // Logic to update session in storage would go here
            }

        } catch (error) {
            console.error(error);
            const errorMsg: ChatMessage = {
                id: Date.now().toString(),
                text: "Sorry, I'm having trouble connecting right now.",
                sender: 'ai',
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setIsLoading(false);
        }
    };

    const renderItem = ({ item }: { item: ChatMessage }) => {
        const isUser = item.sender === 'user';
        return (
            <View style={[styles.messageRow, isUser ? styles.userRow : styles.aiRow]}>
                {!isUser && (
                    <View style={styles.avatar}>
                        <Bot size={16} color="#fff" />
                    </View>
                )}
                <View style={[styles.bubble, isUser ? styles.userBubble : styles.aiBubble]}>
                    <Text style={[styles.messageText, isUser ? styles.userText : styles.aiText]}>
                        {item.text}
                    </Text>
                </View>
                {isUser && (
                    <View style={[styles.avatar, styles.userAvatar]}>
                        <User size={16} color="#fff" />
                    </View>
                )}
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.headerTitle}>
                    <Sparkles size={20} color="#f43f5e" />
                    <Text style={styles.title}>Copilot</Text>
                </View>
                <TouchableOpacity onPress={onClose}>
                    <Text style={styles.closeText}>Close</Text>
                </TouchableOpacity>
            </View>

            <FlatList
                ref={flatListRef}
                data={messages}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.listContent}
                onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
            >
                <View style={styles.inputArea}>
                    <TextInput
                        style={styles.input}
                        value={input}
                        onChangeText={setInput}
                        placeholder="Ask Copilot..."
                        placeholderTextColor="#94a3b8"
                        multiline
                    />
                    <TouchableOpacity
                        style={[styles.sendButton, !input.trim() && styles.sendButtonDisabled]}
                        onPress={handleSend}
                        disabled={!input.trim() || isLoading}
                    >
                        {isLoading ? <ActivityIndicator color="#fff" size="small" /> : <Send size={20} color="#fff" />}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        paddingTop: 50,
        paddingHorizontal: 20,
        paddingBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    headerTitle: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#0f172a',
    },
    closeText: {
        color: '#64748b',
        fontSize: 16,
    },
    listContent: {
        padding: 20,
        gap: 16,
    },
    messageRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 8,
        marginBottom: 4,
    },
    userRow: {
        justifyContent: 'flex-end',
    },
    aiRow: {
        justifyContent: 'flex-start',
    },
    avatar: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#f43f5e',
        justifyContent: 'center',
        alignItems: 'center',
    },
    userAvatar: {
        backgroundColor: '#0f172a',
    },
    bubble: {
        maxWidth: '80%',
        padding: 12,
        borderRadius: 16,
        borderBottomLeftRadius: 4,
    },
    userBubble: {
        backgroundColor: '#0f172a',
        borderBottomRightRadius: 4,
        borderBottomLeftRadius: 16,
    },
    aiBubble: {
        backgroundColor: '#f1f5f9',
    },
    messageText: {
        fontSize: 16,
        lineHeight: 22,
    },
    userText: {
        color: '#fff',
    },
    aiText: {
        color: '#0f172a',
    },
    inputArea: {
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: '#fff',
    },
    input: {
        flex: 1,
        backgroundColor: '#f8fafc',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 10,
        fontSize: 16,
        color: '#0f172a',
        maxHeight: 100,
    },
    sendButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#f43f5e',
        justifyContent: 'center',
        alignItems: 'center',
    },
    sendButtonDisabled: {
        opacity: 0.5,
        backgroundColor: '#cbd5e1',
    },
});

export default Copilot;
