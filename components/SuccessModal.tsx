import { Palette } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

type SuccessModalProps = {
  visible: boolean;
  title: string;
  message: string;
  primaryLabel: string;
  secondaryLabel?: string;
  onPrimary: () => void;
  onSecondary?: () => void;
};

export const SuccessModal: React.FC<SuccessModalProps> = ({
  visible,
  title,
  message,
  primaryLabel,
  secondaryLabel,
  onPrimary,
  onSecondary,
}) => {
  const handleClose = () => {
    if (onSecondary) {
      onSecondary();
    } else {
      onPrimary();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <Pressable style={styles.backdrop} onPress={handleClose}>
        <Pressable style={styles.card} onPress={() => {}}>
          <View style={styles.iconWrapper}>
            <View style={styles.iconCircle}>
              <Ionicons name="checkmark" size={26} color="white" />
            </View>
          </View>
          <View style={styles.content}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.message}>{message}</Text>
          </View>
          <View style={styles.actions}>
            {secondaryLabel && onSecondary && (
              <Pressable
                style={styles.secondaryButton}
                onPress={onSecondary}
              >
                <Text style={styles.secondaryText}>{secondaryLabel}</Text>
              </Pressable>
            )}
            <Pressable
              style={styles.primaryButton}
              onPress={onPrimary}
            >
              <Text style={styles.primaryText}>{primaryLabel}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    borderRadius: 24,
    backgroundColor: Palette.card,
    paddingTop: 32,
    paddingHorizontal: 20,
    paddingBottom: 20,
    alignItems: 'center',
  },
  iconWrapper: {
    position: 'absolute',
    top: -32,
    alignSelf: 'center',
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Palette.success,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  content: {
    marginTop: 16,
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontFamily: 'Outfit-Bold',
    color: Palette.text,
    marginBottom: 6,
  },
  message: {
    fontSize: 14,
    fontFamily: 'Outfit',
    color: Palette.textSecondary,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 20,
    alignSelf: 'stretch',
  },
  secondaryButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 8,
  },
  secondaryText: {
    fontSize: 14,
    fontFamily: 'Outfit-SemiBold',
    color: Palette.textSecondary,
  },
  primaryButton: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 999,
    backgroundColor: Palette.primary,
  },
  primaryText: {
    fontSize: 14,
    fontFamily: 'Outfit-SemiBold',
    color: 'white',
  },
});

export default SuccessModal;

