import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, Image, KeyboardAvoidingView,
  Platform, SafeAreaView, StatusBar, StyleSheet, Text, TextInput,
  TouchableOpacity, View
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';

const API_URL = 'https://nova-ai-server-v475.onrender.com';
const STORAGE_KEY = 'nova-ai-history-v1';

export default function App() {
  const [messages, setMessages] = useState([
    { id: 'welcome', role: 'assistant', text: 'Привет! Я Nova AI. Чем могу помочь?' }
  ]);
  const [input, setInput] = useState('');
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved) setMessages(JSON.parse(saved));
      } catch { /* ignore corrupted local history */ }
    })();
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(messages)).catch(() => {});
  }, [messages]);

  async function chooseImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Нужен доступ к фото', 'Разреши доступ к выбранным фотографиям в настройках iPhone.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], quality: 0.75, base64: true, allowsEditing: true
    });
    if (!result.canceled && result.assets?.[0]) {
      const asset = result.assets[0];
      if (!asset.base64) {
        Alert.alert('Не удалось загрузить фото', 'Попробуй выбрать изображение ещё раз.');
        return;
      }
      setImage({ uri: asset.uri, dataUrl: `data:${asset.mimeType || 'image/jpeg'};base64,${asset.base64}` });
    }
  }

  async function send() {
    const text = input.trim();
    if ((!text && !image) || loading) return;
    if (API_URL.includes('YOUR-BACKEND')) {
      Alert.alert('Нужно подключить сервер', 'Сначала разверни сервер Nova AI и укажи его адрес в EXPO_PUBLIC_API_URL.');
      return;
    }
    const userMessage = { id: `${Date.now()}`, role: 'user', text: text || 'Что изображено на фото?', imageUri: image?.uri };
    const next = [...messages, userMessage];
    setMessages(next); setInput(''); setLoading(true);
    const selectedImage = image; setImage(null);
    try {
      const response = await fetch(`${API_URL.replace(/\/$/, '')}/api/chat`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text || 'Опиши изображение и ответь на мой вопрос.',
          history: next.filter(m => m.role === 'user' || m.role === 'assistant').slice(-12).map(m => ({ role: m.role, text: m.text })),
          imageDataUrl: selectedImage?.dataUrl || null
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Сервер вернул ошибку.');
      setMessages(current => [...current, { id: `${Date.now()}-reply`, role: 'assistant', text: data.text || 'Не удалось получить ответ.' }]);
    } catch (error) {
      setMessages(current => [...current, { id: `${Date.now()}-error`, role: 'assistant', text: `Не удалось получить ответ: ${error.message}. Проверь подключение к интернету и сервер.` }]);
    } finally { setLoading(false); }
  }

  function clearHistory() {
    Alert.alert('Очистить историю?', 'Переписка будет удалена с этого устройства.', [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Очистить', style: 'destructive', onPress: () => setMessages([{ id: `${Date.now()}`, role: 'assistant', text: 'История очищена. Чем займёмся?' }]) }
    ]);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <View style={styles.brandMark}><Text style={styles.brandMarkText}>✦</Text></View>
        <View style={{ flex: 1 }}><Text style={styles.title}>Nova AI</Text><Text style={styles.subtitle}>Твой умный помощник</Text></View>
        <TouchableOpacity onPress={clearHistory} accessibilityLabel="Очистить историю" style={styles.headerButton}><Text style={styles.headerButtonText}>Очистить</Text></TouchableOpacity>
      </View>
      <FlatList
        data={messages} keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={[styles.messageRow, item.role === 'user' ? styles.userRow : styles.aiRow]}>
            {item.role === 'assistant' && <View style={styles.avatar}><Text style={styles.avatarText}>✦</Text></View>}
            <View style={[styles.bubble, item.role === 'user' ? styles.userBubble : styles.aiBubble]}>
              {item.imageUri && <Image source={{ uri: item.imageUri }} style={styles.messageImage} />}
              <Text style={[styles.messageText, item.role === 'user' && styles.userText]}>{item.text}</Text>
            </View>
          </View>
        )}
        ListFooterComponent={loading ? <View style={styles.loading}><ActivityIndicator color="#6658E8" /><Text style={styles.loadingText}>Nova думает…</Text></View> : null}
      />
      {image && <View style={styles.attachment}><Image source={{ uri: image.uri }} style={styles.attachmentImage} /><Text style={styles.attachmentText}>Фото прикреплено</Text><TouchableOpacity onPress={() => setImage(null)}><Text style={styles.removeImage}>Убрать</Text></TouchableOpacity></View>}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={8}>
        <View style={styles.composer}>
          <TouchableOpacity onPress={chooseImage} style={styles.attachButton} accessibilityLabel="Добавить фото"><Text style={styles.attachText}>＋</Text></TouchableOpacity>
          <TextInput value={input} onChangeText={setInput} placeholder="Спроси что-нибудь…" placeholderTextColor="#9998A5" style={styles.input} multiline maxLength={4000} />
          <TouchableOpacity onPress={send} disabled={loading || (!input.trim() && !image)} style={[styles.sendButton, (loading || (!input.trim() && !image)) && styles.sendDisabled]} accessibilityLabel="Отправить"><Text style={styles.sendText}>↑</Text></TouchableOpacity>
        </View>
        <Text style={styles.disclaimer}>Nova AI может ошибаться. Проверяй важную информацию.</Text>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8F8FC' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 12, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#ECECF3' },
  brandMark: { width: 42, height: 42, borderRadius: 15, backgroundColor: '#6658E8', alignItems: 'center', justifyContent: 'center', marginRight: 11 },
  brandMarkText: { color: '#FFFFFF', fontSize: 25 }, title: { color: '#191827', fontSize: 19, fontWeight: '800' }, subtitle: { color: '#888796', fontSize: 12, marginTop: 2 },
  headerButton: { padding: 8 }, headerButtonText: { color: '#6658E8', fontSize: 12, fontWeight: '600' },
  list: { paddingHorizontal: 15, paddingTop: 18, paddingBottom: 20 }, messageRow: { flexDirection: 'row', marginBottom: 16, alignItems: 'flex-end' }, aiRow: { justifyContent: 'flex-start' }, userRow: { justifyContent: 'flex-end' },
  avatar: { width: 28, height: 28, borderRadius: 10, backgroundColor: '#E9E6FF', alignItems: 'center', justifyContent: 'center', marginRight: 8 }, avatarText: { color: '#6658E8', fontSize: 17 },
  bubble: { maxWidth: '84%', borderRadius: 20, paddingHorizontal: 15, paddingVertical: 12 }, aiBubble: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#ECECF3', borderBottomLeftRadius: 6 }, userBubble: { backgroundColor: '#6658E8', borderBottomRightRadius: 6 },
  messageText: { color: '#272638', fontSize: 15, lineHeight: 22 }, userText: { color: '#FFFFFF' }, messageImage: { width: 180, height: 160, borderRadius: 12, marginBottom: 8 },
  loading: { flexDirection: 'row', alignItems: 'center', marginLeft: 36, marginBottom: 15 }, loadingText: { marginLeft: 9, color: '#888796', fontSize: 13 },
  attachment: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderColor: '#ECECF3' }, attachmentImage: { width: 38, height: 38, borderRadius: 9 }, attachmentText: { flex: 1, marginLeft: 10, color: '#555365', fontSize: 13 }, removeImage: { color: '#6658E8', fontWeight: '600', padding: 6 },
  composer: { flexDirection: 'row', alignItems: 'flex-end', marginHorizontal: 12, marginTop: 8, padding: 7, borderRadius: 25, borderWidth: 1, borderColor: '#E5E4EF', backgroundColor: '#FFFFFF', shadowColor: '#2E245B', shadowOpacity: 0.05, shadowRadius: 12, elevation: 2 },
  attachButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F0EEFF', alignItems: 'center', justifyContent: 'center' }, attachText: { color: '#6658E8', fontSize: 27, lineHeight: 30 }, input: { flex: 1, maxHeight: 120, paddingHorizontal: 12, paddingTop: 11, paddingBottom: 9, color: '#272638', fontSize: 15 },
  sendButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#6658E8', alignItems: 'center', justifyContent: 'center' }, sendDisabled: { backgroundColor: '#C8C4EF' }, sendText: { color: '#FFFFFF', fontSize: 25, fontWeight: '700', marginTop: -2 }, disclaimer: { textAlign: 'center', fontSize: 10, color: '#A2A1AD', paddingTop: 8, paddingBottom: 6 }
});
