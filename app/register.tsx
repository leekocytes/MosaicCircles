import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  ActivityIndicator,
  useColorScheme,
  KeyboardAvoidingView,
  Platform,
  Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import * as Haptics from 'expo-haptics';

export default function RegisterScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { signUp } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!email.trim() || !password.trim() || !confirmPassword.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password should be at least 6 characters');
      return;
    }

    try {
      setLoading(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await signUp(email, password);
      router.push('/');
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Registration Failed', error.message || 'Please try again');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: isDark ? '#000' : '#fff' }]}
    >
      <Text style={[styles.title, { color: isDark ? '#fff' : '#000' }]}>
        Mosaic Circles
      </Text>
      <View style={styles.formContainer}>
        <Text style={[styles.subtitle, { color: isDark ? '#fff' : '#000' }]}>Create Account</Text>
        
        <TextInput
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          style={[
            styles.input,
            { 
              backgroundColor: isDark ? '#1a1a1a' : '#f0f0f0',
              color: isDark ? '#fff' : '#000',
              borderColor: isDark ? '#333' : '#ddd'
            }
          ]}
          placeholderTextColor={isDark ? '#999' : '#666'}
        />
        
        <TextInput
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          style={[
            styles.input,
            { 
              backgroundColor: isDark ? '#1a1a1a' : '#f0f0f0',
              color: isDark ? '#fff' : '#000',
              borderColor: isDark ? '#333' : '#ddd'
            }
          ]}
          placeholderTextColor={isDark ? '#999' : '#666'}
        />
        
        <TextInput
          placeholder="Confirm Password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          style={[
            styles.input,
            { 
              backgroundColor: isDark ? '#1a1a1a' : '#f0f0f0',
              color: isDark ? '#fff' : '#000',
              borderColor: isDark ? '#333' : '#ddd'
            }
          ]}
          placeholderTextColor={isDark ? '#999' : '#666'}
        />
        
        <TouchableOpacity 
          style={styles.button} 
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Register</Text>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity 
          onPress={() => router.push('/login')}
          style={styles.linkContainer}
        >
          <Text style={[styles.link, { color: isDark ? '#6a8fff' : '#3366ff' }]}>
            Already have an account? Login
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  formContainer: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 15,
    paddingHorizontal: 15,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#4287f5',
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  linkContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  link: {
    fontSize: 16,
  },
});