import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, RefreshControl, Modal, Alert, ActivityIndicator } from 'react-native';
import { UserProfile, Task } from '@shared/types';
import { getTasks, saveTasks } from '@shared/services/storage';
import { Plus, Sparkles, Calendar, Clock, CheckCircle2 } from 'lucide-react-native';
import Copilot from './Copilot';
import TaskModal from './TaskModal';
import { useAuth } from '../context/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';

const Dashboard: React.FC = () => {
    const { user } = useAuth();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [showCopilot, setShowCopilot] = useState(false);

    const [showTaskModal, setShowTaskModal] = useState(false);
    const [selectedTask, setSelectedTask] = useState<Task | undefined>(undefined);

    // Mock theme for now
    const dummyTheme = {
        id: '1', title: '2026 Planning', description: 'Planning the year',
        startDate: '2026-01-01', endDate: '2026-12-31',
        style: { gradientFrom: '#f43f5e', gradientTo: '#f97316', accentColor: '#f43f5e', bgOverlay: '', cardBorder: '' }
    };

    useEffect(() => {
        if (user) {
            loadData();
        }
    }, [user]);

    const loadData = async () => {
        if (!user) return;
        try {
            const data = await getTasks(user.email);
            // Filter out Work (lnoType) tasks
            const planningTasks = data.filter(t => !t.lnoType);
            setTasks(planningTasks);
        } catch (e) {
            console.log(e);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    };

    const handleSaveTask = async (task: Task) => {
        if (!user) return;
        // Optimistic update
        const newTasks = task.id === selectedTask?.id
            ? tasks.map(t => t.id === task.id ? task : t)
            : [...tasks, task];

        setTasks(newTasks);

        try {
            await saveTasks(user.email, newTasks);
            loadData(); // Reload to ensure sync
        } catch (e) {
            Alert.alert("Error", "Failed to save task");
            loadData(); // Revert
        }
    };

    const openNewTask = () => {
        setSelectedTask(undefined);
        setShowTaskModal(true);
    };

    const openEditTask = (task: Task) => {
        setSelectedTask(task);
        setShowTaskModal(true);
    };

    if (!user) {
        return <ActivityIndicator style={{ marginTop: 50 }} />;
    }

    return (
        <View style={styles.container}>
            <Modal visible={showCopilot} animationType="slide" presentationStyle="pageSheet">
                <Copilot
                    user={user}
                    tasks={tasks}
                    currentTheme={dummyTheme}
                    onClose={() => setShowCopilot(false)}
                />
            </Modal>

            <TaskModal
                visible={showTaskModal}
                onClose={() => setShowTaskModal(false)}
                onSave={handleSaveTask}
                task={selectedTask}
                userEmail={user.email}
            />

            <LinearGradient
                colors={['#fff', '#fff1f2']}
                style={styles.header}
            >
                <View>
                    <Text style={styles.greeting}>Hello, {user.name.split(' ')[0]}!</Text>
                    <Text style={styles.subtitle}>Ready to plan your day?</Text>
                </View>
                <TouchableOpacity style={styles.copilotBtn} onPress={() => setShowCopilot(true)}>
                    <LinearGradient
                        colors={['#f43f5e', '#f97316']}
                        style={styles.copilotGradient}
                    >
                        <Sparkles size={20} color="#fff" />
                    </LinearGradient>
                </TouchableOpacity>
            </LinearGradient>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Your Tasks ({tasks.length})</Text>
                </View>

                {tasks.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyText}>No tasks yet. Tap + to add one!</Text>
                    </View>
                ) : (
                    tasks.map(task => (
                        <TouchableOpacity key={task.id} onPress={() => openEditTask(task)}>
                            <View style={styles.taskCard}>
                                <View style={styles.taskHeader}>
                                    <Text style={styles.taskTitle}>{task.title}</Text>
                                    {task.completed && <CheckCircle2 size={16} color="#22c55e" />}
                                </View>
                                <View style={styles.taskFooter}>
                                    <View style={styles.metaItem}>
                                        <Clock size={14} color="#64748b" />
                                        <Text style={styles.taskMeta}>{task.estimatedMinutes}m</Text>
                                    </View>
                                    <View style={styles.tag}>
                                        <Text style={styles.tagText}>{task.category}</Text>
                                    </View>
                                </View>
                            </View>
                        </TouchableOpacity>
                    ))
                )}
            </ScrollView>

            <TouchableOpacity style={styles.fab} onPress={openNewTask}>
                <LinearGradient
                    colors={['#0f172a', '#334155']}
                    style={styles.fabGradient}
                >
                    <Plus color="#fff" size={24} />
                </LinearGradient>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    header: {
        paddingTop: 70,
        paddingHorizontal: 24,
        paddingBottom: 24,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    greeting: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#1e293b',
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 16,
        color: '#64748b',
        marginTop: 4,
    },
    copilotBtn: {
        shadowColor: '#f43f5e',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    copilotGradient: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 100,
    },
    sectionHeader: {
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#334155',
        letterSpacing: -0.3,
    },
    taskCard: {
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        shadowColor: '#64748b',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
        borderWidth: 1,
        borderColor: '#f1f5f9',
    },
    taskHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    taskTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1e293b',
        flex: 1,
        marginRight: 8,
    },
    taskFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    taskMeta: {
        fontSize: 13,
        color: '#64748b',
        fontWeight: '500',
    },
    tag: {
        backgroundColor: '#f1f5f9',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    tagText: {
        fontSize: 12,
        color: '#475569',
        fontWeight: '600',
    },
    emptyState: {
        padding: 40,
        alignItems: 'center',
    },
    emptyText: {
        color: '#94a3b8',
        fontSize: 16,
    },
    fab: {
        position: 'absolute',
        bottom: 30,
        right: 30,
        shadowColor: '#0f172a',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
    },
    fabGradient: {
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default Dashboard;
