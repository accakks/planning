import Login from '../components/Login';
import { View, StyleSheet } from 'react-native';

export default function LoginPage() {
    return (
        <View style={styles.container}>
            <Login />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    }
});
