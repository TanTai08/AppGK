import React from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import {
  SafeAreaProvider,
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

type Props = {
  children: React.ReactNode;
  onClose: () => void;
  busy?: boolean;
};

// Each native modal owns its safe area and a bounded scroll viewport. Giving
// the ScrollView only a content width can make Yoga size it beyond the phone.
export function AppModal({ children, onClose, busy = false }: Props) {
  return (
    <Modal
      visible
      transparent
      animationType="fade"
      presentationStyle="overFullScreen"
      onRequestClose={() => {
        if (!busy) onClose();
      }}
    >
      <SafeAreaProvider>
        <ModalContent>{children}</ModalContent>
      </SafeAreaProvider>
    </Modal>
  );
}

function ModalContent({ children }: { children: React.ReactNode }) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const compact = width < 600;
  const gutter = compact ? 12 : 20;
  const cardWidth = Math.max(
    0,
    Math.min(480, width - insets.left - insets.right - gutter * 2),
  );
  return (
    <SafeAreaView style={s.overlay}>
      <KeyboardAvoidingView
        style={s.viewport}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          testID="modal-scroll"
          style={s.scroll}
          contentContainerStyle={[s.content, { paddingHorizontal: gutter }]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <View
            testID="modal-card"
            style={[s.card, { width: cardWidth, padding: compact ? 20 : 28 }]}
          >
            {children}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(18,38,28,0.45)" },
  viewport: { flex: 1, width: "100%" },
  scroll: { flex: 1, width: "100%" },
  content: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
  },
  card: { backgroundColor: "#fff", borderRadius: 20, alignSelf: "center" },
});
