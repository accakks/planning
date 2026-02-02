import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Dimensions } from 'react-native';
import { supabase } from '@shared/services/supabase';
import { Sparkles, ArrowRight, KeyRound } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

const Login: React.FC = () => {
    const [accessCode, setAccessCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleAccessCodeLogin = async () => {
        if (accessCode.length !== 4) {
            Alert.alert('Error', 'Access code must be 4 characters');
            return;
        }

        setIsLoading(true);

        try {
            // Convention: code@planning.app / access-code-code
            const email = `${accessCode.toLowerCase()}@planning.app`;
            const password = `access-code-${accessCode.toLowerCase()}`;

            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                if (error.message === 'Invalid login credentials') {
                    throw new Error('Invalid access code');
                }
                throw error;
            }

            // Success: AuthContext in _layout will detect session change and redirect.

        } catch (err: any) {
            Alert.alert('Error', err.message || 'An error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            {/* Background Decor - Simplified for RN */}
            <View style={[styles.blob, styles.blob1]} />
            <View style={[styles.blob, styles.blob2]} />
            <View style={[styles.blob, styles.blob3]} />

            <View style={styles.glassCard}>
                <View style={styles.header}>
                    <LinearGradient
                        colors={['#f43f5e', '#f97316']}
                        start={{ x: 0, y: 1 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.iconContainer}
                    >
                        <Sparkles size={32} color="#fff" />
                    </LinearGradient>
                    <Text style={styles.title}>Enter Access Code</Text>
                    <Text style={styles.subtitle}>
                        Please enter your unique 4-letter code to continue.
                    </Text>
                </View>

                <View style={styles.inputContainer}>
                    <KeyRound size={20} color="#94a3b8" style={styles.inputIcon} />
                    <TextInput
                        style={styles.input}
                        value={accessCode}
                        onChangeText={(text) => setAccessCode(text.toUpperCase())}
                        maxLength={4}
                        placeholder="CODE"
                        placeholderTextColor="#cbd5e1"
                        autoCapitalize="characters"
                        autoCorrect={false}
                    />
                </View>

                <TouchableOpacity
                    style={[styles.button, (isLoading || accessCode.length !== 4) && styles.buttonDisabled]}
                    onPress={handleAccessCodeLogin}
                    disabled={isLoading || accessCode.length !== 4}
                >
                    {isLoading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <View style={styles.buttonContent}>
                            <Text style={styles.buttonText}>Continue</Text>
                            <ArrowRight size={20} color="#fff" />
                        </View>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
        justifyContent: 'center',
        alignItems: 'center',
    },
    blob: {
        position: 'absolute',
        borderRadius: 999,
        opacity: 0.2,
    },
    blob1: {
        width: 300,
        height: 300,
        backgroundColor: '#fda4af',
        top: -50,
        right: -50,
    },
    blob2: {
        width: 250,
        height: 250,
        backgroundColor: '#d8b4fe',
        top: 50,
        left: -50,
    },
    blob3: {
        width: 300,
        height: 300,
        backgroundColor: '#fdba74',
        bottom: -50,
        left: 50,
    },
    glassCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        padding: 30,
        borderRadius: 24,
        width: width * 0.9,
        maxWidth: 400,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.5)',
    },
    header: {
        alignItems: 'center',
        marginBottom: 30,
    },
    iconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        shadowColor: '#f43f5e',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1e293b',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        color: '#475569',
        textAlign: 'center',
    },
    inputContainer: {
        marginBottom: 20,
        position: 'relative',
    },
    inputIcon: {
        position: 'absolute',
        left: 16,
        top: 18,
        zIndex: 1,
    },
    input: {
        backgroundColor: 'rgba(255, 255, 255, 0.5)',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 16,
        paddingLeft: 48,
        fontSize: 18,
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
        letterSpacing: 2,
        color: '#1e293b',
    },
    button: {
        backgroundColor: '#0f172a',
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    buttonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    buttonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
});

export default Login;
