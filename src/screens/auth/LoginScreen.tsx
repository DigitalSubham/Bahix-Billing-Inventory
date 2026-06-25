// src/screens/auth/LoginScreen.js
import React, { useState } from 'react';
import {
    View,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Alert,
    Image,
    useWindowDimensions,
} from 'react-native';
import {
    TextInput,
    Button,
    Text,
    Divider,
    Surface,
} from 'react-native-paper';
import { useLoginEmail } from '../../hooks/useAuth';

const appLogo = require('../../assests/logo.png');

const LoginScreen = ({ navigation }: any) => {
    const { height } = useWindowDimensions();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const emailLoginMutation = useLoginEmail();
    const isShortScreen = height < 720;

    const handleEmailLogin = () => {
        if (!email || !password) {
            Alert.alert('Missing Fields', 'Please enter both email and password');
            return;
        }

        emailLoginMutation.mutate({ email: email.trim(), password: password.trim() }, {
            onError: (err: any) => {
                Alert.alert("Error", err?.message || "Failed");
            },
        });
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 24 : 0}
            style={styles.container}>
            <View style={styles.blobTop} />
            <View style={styles.blobBottom} />
            <ScrollView
                contentContainerStyle={[
                    styles.scrollContent,
                    isShortScreen && styles.scrollContentCompact,
                ]}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
                showsVerticalScrollIndicator={false}>
                <View style={styles.content}>
                    <View style={styles.header}>
                        <View style={styles.logoOuter}>
                            <View style={styles.logoInner}>
                                <Image source={appLogo} style={styles.logoImage} resizeMode="cover" />
                            </View>
                        </View>
                        <Text variant="headlineLarge" style={styles.title}>
                            Bahix : Billing &amp; Inventory
                        </Text>
                        <Text variant="bodyMedium" style={styles.subtitle}>
                            Sign in to manage invoices, stock, and customer records from one place.
                        </Text>
                    </View>

                    <Surface style={styles.form} elevation={2}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Welcome back</Text>
                            <Text style={styles.sectionCaption}>Use your email credentials to continue.</Text>
                        </View>

                        <TextInput
                            label="Email"
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            returnKeyType="next"
                            style={styles.input}
                            mode="outlined"
                            outlineStyle={styles.inputOutline}
                            textColor="#24153D"
                        />
                        <TextInput
                            label="Password"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                            returnKeyType="done"
                            style={styles.input}
                            mode="outlined"
                            outlineStyle={styles.inputOutline}
                            textColor="#24153D"
                        />
                        <Button
                            mode="contained"
                            onPress={handleEmailLogin}
                            loading={emailLoginMutation.isPending}
                            disabled={emailLoginMutation.isPending}
                            buttonColor="#4a2090"
                            contentStyle={styles.buttonContent}
                            style={styles.button}>
                            Login
                        </Button>

                        <Divider style={styles.divider} />

                        <Button
                            mode="outlined"
                            onPress={() => navigation.navigate('Register')}
                            textColor="#4a2090"
                            style={styles.registerButton}>
                            Create New Account
                        </Button>
                    </Surface>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F7F4FF',
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingHorizontal: 20,
        paddingTop: 28,
        paddingBottom: 56,
    },
    scrollContentCompact: {
        justifyContent: 'flex-start',
        paddingTop: 18,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
    },
    header: {
        alignItems: 'center',
        marginBottom: 28,
    },
    logoOuter: {
        width: 88,
        height: 88,
        borderRadius: 24,
        backgroundColor: '#EEF2FF',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#D9E8FF',
        marginBottom: 16,
    },
    logoInner: {
        width: 70,
        height: 70,
        borderRadius: 18,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    logoImage: {
        width: 70,
        height: 70,
    },
    title: {
        fontWeight: 'bold',
        color: '#4a2090',
        marginBottom: 8,
        textAlign: 'center',
        lineHeight: 40,
    },
    subtitle: {
        color: '#5F5A73',
        textAlign: 'center',
        lineHeight: 21,
        maxWidth: 300,
    },
    form: {
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 20,
        shadowColor: '#4a2090',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.08,
        shadowRadius: 24,
    },
    sectionHeader: {
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#24153D',
        marginBottom: 4,
    },
    sectionCaption: {
        color: '#756E86',
        fontSize: 13,
        lineHeight: 18,
    },
    highlightsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 18,
    },
    highlightChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#F4EEFF',
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 7,
    },
    highlightText: {
        color: '#4a2090',
        fontSize: 12,
        fontWeight: '600',
    },
    input: {
        marginBottom: 16,
        backgroundColor: '#FFFFFF',
    },
    inputOutline: {
        borderRadius: 16,
        borderColor: '#D7CCE9',
    },
    button: {
        marginTop: 8,
        borderRadius: 16,
    },
    buttonContent: {
        paddingVertical: 8,
    },
    errorText: {
        color: '#d32f2f',
        textAlign: 'center',
        marginTop: 12,
    },
    divider: {
        marginVertical: 20,
    },
    registerButton: {
        borderColor: '#C9B7E8',
        borderRadius: 16,
    },
    blobTop: {
        position: 'absolute',
        width: 220,
        height: 220,
        borderRadius: 110,
        backgroundColor: '#E9DEFF',
        top: -80,
        right: -60,
    },
    blobBottom: {
        position: 'absolute',
        width: 260,
        height: 260,
        borderRadius: 130,
        backgroundColor: '#EAF1FF',
        bottom: -120,
        left: -90,
    },
});

export default LoginScreen;
