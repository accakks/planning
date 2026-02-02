import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Modal, ScrollView, Switch, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Task, Category } from '@shared/types';
import { saveTasks } from '@shared/services/storage';
import { X, Calendar, Check, Wand2 } from 'lucide-react-native';
import { analyzeTask } from '@shared/services/gemini';

interface TaskModalProps {
    visible: boolean;
    onClose: () => void;
    onSave: (task: Task) => void;
    task?: Task;
    userEmail: string;
}

const TaskModal: React.FC<TaskModalProps> = ({ visible, onClose, onSave, task, userEmail }) => {
    const [title, setTitle] = useState('');
    const [category, setCategory] = useState<Category>(Category.PERSONAL);
    const [estimatedMinutes, setEstimatedMinutes] = useState('30');
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    useEffect(() => {
        if (task) {
            setTitle(task.title);
            setCategory(task.category);
            setEstimatedMinutes(task.estimatedMinutes.toString());
        } else {
            resetForm();
        }
    }, [task, visible]);

    const resetForm = () => {
        setTitle('');
        setCategory(Category.PERSONAL);
        setEstimatedMinutes('30');
    };

    const handleSave = () => {
        if (!title.trim()) {
            Alert.alert('Error', 'Please enter a task title');
            return;
        }

        const newTask: Task = {
            id: task?.id || Date.now().toString(),
            title,
            category,
            estimatedMinutes: parseInt(estimatedMinutes) || 30,
            completed: task?.completed || false,
            themeId: task?.themeId || '1', // Default
            dueDate: task?.dueDate || new Date().toISOString(),
            isAiGenerated: task?.isAiGenerated || false
        };

        onSave(newTask);
        onClose();
    };

    const handleAIAnalyze = async () => {
        if (!title.trim()) return;
        setIsAnalyzing(true);
        try {
            const result = await analyzeTask(title, []);
            setCategory(result.category);
            setEstimatedMinutes(result.estimatedMinutes.toString());
        } catch (e) {
            console.error(e);
        } finally {
            setIsAnalyzing(false);
        }
    };

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="formSheet">
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.container}
            >
                <View style={styles.header}>
                    <Text style={styles.title}>{task ? 'Edit Task' : 'New Task'}</Text>
                    <TouchableOpacity onPress={onClose}>
                        <X color="#64748b" size={24} />
                    </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={styles.content}>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Task Title</Text>
                        <View style={styles.row}>
                            <TextInput
                                style={[styles.input, { flex: 1 }]}
                                value={title}
                                onChangeText={setTitle}
                                placeholder="What do you need to do?"
                                onBlur={handleAIAnalyze} // Auto analyze on blur
                            />
                            <TouchableOpacity
                                style={[styles.aiButton, isAnalyzing && styles.aiButtonActive]}
                                onPress={handleAIAnalyze}
                                disabled={isAnalyzing}
                            >
                                <Wand2 size={20} color={isAnalyzing ? '#fff' : '#f43f5e'} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Category</Text>
                        <View style={styles.categories}>
                            {Object.values(Category).map((cat) => (
                                <TouchableOpacity
                                    key={cat}
                                    style={[
                                        styles.catChip,
                                        category === cat && styles.catChipActive
                                    ]}
                                    onPress={() => setCategory(cat)}
                                >
                                    <Text style={[
                                        styles.catText,
                                        category === cat && styles.catTextActive
                                    ]}>{cat}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Estimated Minutes</Text>
                        <TextInput
                            style={styles.input}
                            value={estimatedMinutes}
                            onChangeText={setEstimatedMinutes}
                            keyboardType="numeric"
                            placeholder="30"
                        />
                    </View>

                </ScrollView>

                <View style={styles.footer}>
                    <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                        <Text style={styles.saveButtonText}>Save Task</Text>
                    </TouchableOpacity>
                </View>

            </KeyboardAvoidingView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#0f172a',
    },
    content: {
        padding: 20,
        gap: 24,
    },
    inputGroup: {
        gap: 8,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#64748b',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    input: {
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        color: '#0f172a',
    },
    row: {
        flexDirection: 'row',
        gap: 12,
        alignItems: 'center',
    },
    aiButton: {
        width: 50,
        height: 50,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#f43f5e',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    aiButtonActive: {
        backgroundColor: '#f43f5e',
    },
    categories: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    catChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#f1f5f9',
    },
    catChipActive: {
        backgroundColor: '#0f172a',
    },
    catText: {
        fontSize: 14,
        color: '#64748b',
    },
    catTextActive: {
        color: '#fff',
    },
    footer: {
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
    },
    saveButton: {
        backgroundColor: '#0f172a',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default TaskModal;
