import Dashboard from '../components/Dashboard';
import { View, StyleSheet } from 'react-native';

export default function IndexPage() {
    return (
        <View style={styles.container}>
            <Dashboard />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    }
});
