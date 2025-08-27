// components/FancyToast.js
import React, { forwardRef, useImperativeHandle, useRef, useState, useEffect } from 'react';
import { Modal, View, Text, StyleSheet, Pressable, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const Colors = {
  primary: '#2A3B47',
  secondary: '#FFB800',
  background: '#F0F2F5',
  white: '#FFFFFF',
  textPrimary: '#333333',
  textSecondary: '#666666',
  success: '#2ECC71',
  error: '#E74C3C',
  info: '#3498DB',
};

const typeStyles = {
  success: { icon: 'checkmark-circle', color: Colors.success, title: 'Sucesso' },
  error:   { icon: 'close-circle',     color: Colors.error,   title: 'Erro'     },
  info:    { icon: 'information-circle', color: Colors.info,  title: 'Info'     },
};

const FancyToast = forwardRef(function FancyToast(_, ref) {
  const [visible, setVisible] = useState(false);
  const [payload, setPayload] = useState({ type: 'success', title: '', message: '' });

  // animações
  const scale = useRef(new Animated.Value(0.85)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useImperativeHandle(ref, () => ({
    show(opts) {
      const { type = 'success', title, message, duration = 1600, persist = false } = opts || {};
      setPayload({ type, title: title ?? typeStyles[type].title, message: message ?? '' });
      setVisible(true);
      Animated.parallel([
        Animated.timing(scale, { toValue: 1, duration: 180, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 120, useNativeDriver: true }),
      ]).start();

      if (!persist) {
        clearTimeout(this._t);
        this._t = setTimeout(() => hide(), duration);
      }
    },
    hide,
  }));

  useEffect(() => () => clearTimeout(FancyToast._t), []);

  function hide() {
    Animated.parallel([
      Animated.timing(scale, { toValue: 0.95, duration: 140, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 140, useNativeDriver: true }),
    ]).start(({ finished }) => finished && setVisible(false));
  }

  if (!visible) return null;
  const t = typeStyles[payload.type] || typeStyles.success;

  return (
    <Modal transparent animationType="none" visible={visible} onRequestClose={hide}>
      <View style={styles.backdrop}>
        <Animated.View style={[styles.cardWrap, { opacity, transform: [{ scale }] }]}>
          <LinearGradient
            colors={['#FFFFFF', '#FAFAFA']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.card}
          >
            <View style={[styles.iconRing, { borderColor: t.color + '55' }]}>
              <LinearGradient
                colors={[t.color, t.color]}
                style={styles.iconBadge}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name={t.icon} size={28} color="#fff" />
              </LinearGradient>
            </View>

            <Text style={styles.title}>{payload.title}</Text>
            {!!payload.message && <Text style={styles.message}>{payload.message}</Text>}

            <Pressable onPress={hide} style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}>
              <LinearGradient colors={[Colors.primary, '#1d2a33']} style={styles.btn}>
                <Text style={styles.btnText}>OK</Text>
              </LinearGradient>
            </Pressable>
          </LinearGradient>
        </Animated.View>
      </View>
    </Modal>
  );
});

export default FancyToast;

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  cardWrap: { width: '100%' },
  card: {
    borderRadius: 18,
    paddingVertical: 22,
    paddingHorizontal: 18,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  iconRing: {
    width: 66,
    height: 66,
    borderRadius: 33,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    marginBottom: 10,
  },
  iconBadge: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    marginTop: 4,
    fontSize: 20,
    fontWeight: '800',
    color: '#1E2937',
  },
  message: {
    textAlign: 'center',
    color: '#5E6B78',
    marginTop: 6,
    marginBottom: 14,
    lineHeight: 20,
  },
  btn: {
    paddingHorizontal: 24,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 110,
  },
  btnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
  },
});
