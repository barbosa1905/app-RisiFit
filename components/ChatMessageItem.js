import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, Alert } from 'react-native';
import { auth, db } from '../services/firebaseConfig';
import moment from 'moment';
import 'moment/locale/pt-br';
import { MaterialIcons } from '@expo/vector-icons';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';

export default function ChatMessageItem({ message, senderName, lastReplyTime, chatId }) {
  const isSender = message.senderId === auth.currentUser?.uid;
  const timestamp = message.createdAt?.toDate?.();
  const displayName = isSender ? 'Você' : String(senderName || 'Usuário');
  const initial = displayName.charAt(0).toUpperCase();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 350,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  // 🔁 Reenviar mensagem com erro
  const resendMessage = async () => {
    try {
      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        text: message.text,
        senderId: auth.currentUser.uid,
        createdAt: serverTimestamp(),
        lida: false,
      });
      Alert.alert('Mensagem reenviada com sucesso!');
    } catch (error) {
      Alert.alert('Erro ao reenviar mensagem.');
    }
  };

  // 📌 Lógica dos ícones de estado
  let readStatusIcon = null;

  if (isSender) {
    if (!timestamp) {
      // ⏳ Mensagem ainda a ser enviada
      readStatusIcon = (
        <MaterialIcons
          name="schedule"
          size={16}
          color="#999"
          style={{ marginLeft: 4 }}
        />
      );
    } else if (message.error) {
      // ⚠️ Erro ao enviar — com botão de reenvio
      readStatusIcon = (
        <TouchableOpacity onPress={resendMessage}>
          <MaterialIcons
            name="error-outline"
            size={16}
            color="#e53935"
            style={{ marginLeft: 4 }}
          />
        </TouchableOpacity>
      );
    } else if (message.lida) {
      if (!lastReplyTime || (timestamp && timestamp > lastReplyTime)) {
        // ✅✅ Lida e ainda sem resposta
        readStatusIcon = (
          <MaterialIcons
            name="done-all"
            size={16}
            color="#34b7f1"
            style={{ marginLeft: 4 }}
          />
        );
      }
      // Se já houve resposta, não mostra nada
    } else {
      // ✅✅ Enviada mas ainda não lida
      readStatusIcon = (
        <MaterialIcons
          name="done-all"
          size={16}
          color="#999"
          style={{ marginLeft: 4 }}
        />
      );
    }
  }

  return (
    <Animated.View
      style={[
        styles.messageRow,
        { justifyContent: isSender ? 'flex-end' : 'flex-start', opacity: fadeAnim },
      ]}
    >
      {!isSender && (
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
      )}

      <View
        style={[
          styles.bubble,
          {
            backgroundColor: isSender ? '#dcf8c6' : '#fff',
            borderTopRightRadius: isSender ? 0 : 16,
            borderTopLeftRadius: isSender ? 16 : 0,
          },
        ]}
      >
        {!isSender && <Text style={styles.senderName}>{displayName}</Text>}

        {typeof message.text === 'string' && message.text.trim() !== '' && (
          <Text style={styles.messageText}>{message.text}</Text>
        )}

        <View style={styles.timestampRow}>
          <Text style={styles.timestamp}>
            {timestamp ? moment(timestamp).format('HH:mm') : '...'}
          </Text>
          {readStatusIcon}
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  messageRow: {
    flexDirection: 'row',
    marginVertical: 6,
    paddingHorizontal: 10,
    alignItems: 'flex-end',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#007bff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  avatarText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  bubble: {
    maxWidth: '75%',
    padding: 10,
    borderRadius: 16,
  },
  senderName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#555',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 16,
    color: '#111',
  },
  timestampRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 6,
  },
  timestamp: {
    fontSize: 10,
    color: '#555',
  },
});