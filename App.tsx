import React, { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { configured } from "./src/firebase";
import { StatusBar } from "expo-status-bar";
import { AppProvider, Product, useStore } from "./src/store";
const money = (n: number) => n.toLocaleString("vi-VN") + " ₫";
function Button({
  title,
  onPress,
  disabled = false,
  secondary = false,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        s.button,
        secondary && s.secondary,
        (disabled || pressed) && { opacity: 0.55 },
      ]}
    >
      <Text style={[s.buttonText, secondary && { color: "#36594d" }]}>
        {title}
      </Text>
    </Pressable>
  );
}
function Field({
  label,
  value,
  onChangeText,
  secureTextEntry = false,
  numeric = false,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  secureTextEntry?: boolean;
  numeric?: boolean;
}) {
  return (
    <View style={{ marginBottom: 15 }}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        style={s.input}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        autoCapitalize="none"
        keyboardType={
          numeric
            ? "number-pad"
            : label.includes("Email")
              ? "email-address"
              : "default"
        }
      />
    </View>
  );
}
function Auth() {
  const { authenticate } = useStore();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit() {
    setBusy(true);
    setError("");
    try {
      await authenticate(mode, { email: email.trim(), password });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <ScrollView
      contentContainerStyle={s.authWrap}
      keyboardShouldPersistTaps="handled"
    >
      <View style={s.authCard}>
        <Text style={s.brand}>◈ KHO HÀNG</Text>
        <Text style={s.hero}>Quản lý gọn gàng.{"\n"}Kinh doanh dễ dàng.</Text>
        <Text style={s.muted}>Không gian nhỏ cho mọi sản phẩm của bạn.</Text>
        <View style={s.tabs}>
          {(["login", "register"] as const).map((m) => (
            <Pressable
              key={m}
              disabled={busy}
              onPress={() => {
                setMode(m);
                setError("");
              }}
              style={[s.tab, mode === m && s.activeTab]}
            >
              <Text style={{ color: "#234b3d", fontWeight: "600" }}>
                {m === "login" ? "Đăng nhập" : "Tạo tài khoản"}
              </Text>
            </Pressable>
          ))}
        </View>
        <Field label="Email" value={email} onChangeText={setEmail} />
        <Field
          label="Mật khẩu"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        {mode === "register" && (
          <Text style={s.muted}>Mật khẩu từ 8 đến 128 ký tự.</Text>
        )}
        {!!error && (
          <Text accessibilityRole="alert" style={s.error}>
            {error}
          </Text>
        )}
        <Button
          title={
            busy
              ? "Đang xử lý…"
              : mode === "login"
                ? "Đăng nhập →"
                : "Tạo tài khoản →"
          }
          onPress={() => void submit()}
          disabled={busy}
        />
        <Text style={[s.muted, { textAlign: "center", marginTop: 22 }]}>
          Phân hệ quản trị sản phẩm · Firebase
        </Text>
      </View>
    </ScrollView>
  );
}
function Dashboard() {
  const { user, products, productsLoading, loadError, save, remove, logout } =
    useStore();
  const [editor, setEditor] = useState<Product | "new" | null>(null);
  const [deleting, setDeleting] = useState<Product | null>(null);
  const [name, setName] = useState("");
  const [image, setImage] = useState("");
  const [picking, setPicking] = useState(false);
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  function open(p: Product | "new") {
    setEditor(p);
    setFormError("");
    setName(p === "new" ? "" : p.name);
    setImage(p === "new" ? "" : p.image);
    setPrice(p === "new" ? "" : String(p.price));
    setQuantity(p === "new" ? "" : String(p.soluong));
  }
  async function pickImage() {
    setPicking(true);
    setFormError("");
    try {
      if (Platform.OS !== "web") {
        const permission =
          await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted)
          throw new Error("Vui lòng cấp quyền truy cập ảnh cho ứng dụng.");
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        base64: true,
        quality: 0.6,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (!asset.base64 || asset.base64.length > 933336)
        throw new Error("Ảnh quá lớn. Hãy chọn ảnh nhỏ hơn 700 KB.");
      const mime = asset.mimeType || "image/jpeg";
      if (!["image/jpeg", "image/png", "image/webp"].includes(mime))
        throw new Error("Chỉ hỗ trợ ảnh JPG, PNG hoặc WebP.");
      setImage(`data:${mime};base64,${asset.base64}`);
    } catch (error) {
      setFormError((error as Error).message);
    } finally {
      setPicking(false);
    }
  }
  async function submit() {
    if (
      !name.trim() ||
      !image ||
      !/^(\d+)(\.\d{1,2})?$/.test(price) ||
      !/^\d+$/.test(quantity)
    ) {
      setFormError(
        "Điền đủ thông tin và chọn ảnh. Giá không âm; số lượng phải là số nguyên không âm.",
      );
      return;
    }
    setBusy(true);
    setFormError("");
    try {
      await save(
        { name, image, price: Number(price), soluong: Number(quantity) },
        editor && editor !== "new" ? editor.key : undefined,
      );
      setEditor(null);
    } catch (e) {
      setFormError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function act(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <ScrollView
      contentContainerStyle={s.page}
      keyboardShouldPersistTaps="handled"
    >
      <View style={s.header}>
        <Text style={s.brand}>◈ KHO HÀNG</Text>
        <View style={s.row}>
          <Text style={s.muted}>{user?.email}</Text>
          <Button
            title="Đăng xuất"
            secondary
            disabled={busy}
            onPress={() => void act(logout)}
          />
        </View>
      </View>
      <View style={s.heading}>
        <View>
          <Text style={s.eyebrow}>KHÔNG GIAN CỦA BẠN</Text>
          <Text style={s.hero}>Sản phẩm</Text>
          <Text style={s.muted}>Thêm, sửa và xóa sản phẩm của bạn.</Text>
        </View>
        <Button title="＋ Thêm sản phẩm" onPress={() => open("new")} />
      </View>
      {!!(error || loadError) && (
        <Text accessibilityRole="alert" style={s.error}>
          {error || loadError}
        </Text>
      )}
      <View style={s.panel}>
        {productsLoading ? (
          <ActivityIndicator color="#275c46" />
        ) : loadError ? (
          <Text style={s.muted}>
            Chưa tải được dữ liệu. Kiểm tra quyền admin và kết nối Firebase.
          </Text>
        ) : !products.length ? (
          <View style={s.empty}>
            <Text style={s.emptyTitle}>Chưa có sản phẩm</Text>
            <Text style={s.muted}>Thêm sản phẩm đầu tiên để bắt đầu.</Text>
            <Button
              title="＋ Thêm sản phẩm đầu tiên"
              onPress={() => open("new")}
            />
          </View>
        ) : (
          products.map((p) => (
            <View key={p.key} style={s.product}>
              <Image
                source={{ uri: p.image }}
                accessibilityLabel={`Ảnh ${p.name}`}
                style={{ width: 88, height: 88, borderRadius: 12 }}
                resizeMode="cover"
              />
              <View style={{ flex: 1, minWidth: 150 }}>
                <Text style={s.productName}>{p.name}</Text>
                <Text style={s.muted}>{money(p.price)}</Text>
                <Text style={s.stock}>Số lượng: {p.soluong}</Text>
              </View>
              <View style={s.row}>
                <Button title="Sửa" secondary onPress={() => open(p)} />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Xóa ${p.name}`}
                  onPress={() => {
                    setError("");
                    setDeleting(p);
                  }}
                  style={{ padding: 12 }}
                >
                  <Text style={{ color: "#ab4141" }}>Xóa</Text>
                </Pressable>
              </View>
            </View>
          ))
        )}
      </View>
      <Text style={[s.muted, { marginTop: 24 }]}>
        KHO HÀNG · Đơn giản mỗi ngày
      </Text>
      {editor !== null && (
        <Modal
          visible={true}
          transparent
          animationType="fade"
          onRequestClose={() => {
            if (!busy) setEditor(null);
          }}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={s.overlay}
          >
            <ScrollView
              contentContainerStyle={s.modalScroll}
              keyboardShouldPersistTaps="handled"
            >
              <View style={s.modalCard}>
                <Text style={s.modalTitle}>
                  {editor === "new" ? "Thêm sản phẩm" : "Sửa sản phẩm"}
                </Text>
                <Text style={[s.muted, { marginBottom: 24 }]}>
                  Thông tin rõ ràng, quản lý dễ dàng.
                </Text>
                <Field
                  label="Tên sản phẩm"
                  value={name}
                  onChangeText={setName}
                />
                <Field
                  label="Giá bán (VNĐ)"
                  value={price}
                  onChangeText={setPrice}
                  numeric
                />
                <Field
                  label="Số lượng"
                  value={quantity}
                  onChangeText={setQuantity}
                  numeric
                />
                <Text style={s.label}>Hình ảnh sản phẩm (JPG, PNG, WebP)</Text>
                {!!image && (
                  <Image
                    source={{ uri: image }}
                    accessibilityLabel="Ảnh đã chọn"
                    style={{
                      width: "100%",
                      height: 160,
                      marginBottom: 12,
                      borderRadius: 10,
                    }}
                    resizeMode="contain"
                  />
                )}
                <Button
                  title={
                    picking
                      ? "Đang chọn ảnh…"
                      : image
                        ? "Đổi hình ảnh"
                        : "Chọn hình ảnh"
                  }
                  secondary
                  disabled={busy || picking}
                  onPress={() => void pickImage()}
                />
                <Text style={[s.muted, { marginVertical: 10 }]}>
                  Ảnh dưới 700 KB. Ảnh được lưu trực tiếp cùng sản phẩm.
                </Text>
                {!!formError && (
                  <Text accessibilityRole="alert" style={s.error}>
                    {formError}
                  </Text>
                )}
                <View style={s.row}>
                  <Button
                    title="Hủy"
                    secondary
                    disabled={busy}
                    onPress={() => setEditor(null)}
                  />
                  <Button
                    title={busy ? "Đang lưu…" : "Lưu sản phẩm"}
                    disabled={busy || picking}
                    onPress={() => void submit()}
                  />
                </View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </Modal>
      )}
      {deleting !== null && (
        <Modal
          visible={true}
          transparent
          animationType="fade"
          onRequestClose={() => {
            if (!busy) setDeleting(null);
          }}
        >
          <View style={s.overlay}>
            <View style={s.modalCard}>
              <Text style={s.modalTitle}>Xóa sản phẩm?</Text>
              <Text style={[s.muted, { marginVertical: 20 }]}>
                Bạn muốn xóa “{deleting?.name}”? Thao tác này không thể hoàn
                tác.
              </Text>
              {!!error && <Text style={s.error}>{error}</Text>}
              <View style={s.row}>
                <Button
                  title="Giữ lại"
                  secondary
                  disabled={busy}
                  onPress={() => setDeleting(null)}
                />
                <Button
                  title={busy ? "Đang xóa…" : "Xác nhận xóa"}
                  disabled={busy}
                  onPress={() =>
                    void act(async () => {
                      await remove(deleting!.key);
                      setDeleting(null);
                    })
                  }
                />
              </View>
            </View>
          </View>
        </Modal>
      )}
    </ScrollView>
  );
}
function Root() {
  const { loading, user, isAdmin, logout } = useStore();
  return (
    <SafeAreaView style={s.root}>
      <StatusBar style="dark" />
      {!configured ? (
        <ScrollView contentContainerStyle={s.authWrap}>
          <View style={s.authCard}>
            <Text style={s.modalTitle}>Thiết lập Firebase</Text>
            <Text style={[s.muted, { marginTop: 16 }]}>
              Chưa có cấu hình Firebase. Làm theo README: tạo dự án, bật
              Authentication và Realtime Database, nhập database/products.json
              rồi điền .env. Sau đó khởi động lại Expo.
            </Text>
          </View>
        </ScrollView>
      ) : loading ? (
        <View style={s.empty}>
          <ActivityIndicator color="#275c46" />
          <Text style={s.muted}>Đang tải dữ liệu…</Text>
        </View>
      ) : user && !isAdmin ? (
        <ScrollView contentContainerStyle={s.authWrap}>
          <View style={s.authCard}>
            <Text style={s.modalTitle}>Tài khoản chưa có quyền admin</Text>
            <Text style={[s.muted, { marginVertical: 16 }]}>
              Nhờ người quản trị cấp quyền cho tài khoản này. Nếu bạn đang thiết
              lập bài tập, sao chép UID vào .env và Database Rules theo README.
            </Text>
            <Text selectable style={{ marginBottom: 20 }}>
              {user.uid}
            </Text>
            <Button title="Đăng xuất" onPress={() => void logout()} />
          </View>
        </ScrollView>
      ) : user ? (
        <Dashboard />
      ) : (
        <Auth />
      )}
    </SafeAreaView>
  );
}
export default function App() {
  return (
    <AppProvider>
      <Root />
    </AppProvider>
  );
}
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f5f6f1" },
  page: {
    padding: 24,
    paddingTop: 42,
    maxWidth: 1150,
    width: "100%",
    alignSelf: "center",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 14,
    paddingBottom: 30,
    borderBottomWidth: 1,
    borderColor: "#dfe5db",
  },
  brand: {
    color: "#24533e",
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: 2,
  },
  hero: {
    color: "#1c392e",
    fontSize: 36,
    fontWeight: "700",
    marginVertical: 12,
  },
  muted: { color: "#738078", fontSize: 14, lineHeight: 22 },
  heading: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 20,
    marginVertical: 34,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.7,
    color: "#7d8c80",
    marginBottom: 8,
  },
  button: {
    backgroundColor: "#285b45",
    paddingHorizontal: 19,
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  secondary: { backgroundColor: "#eaf0e7" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  panel: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 22,
    borderWidth: 1,
    borderColor: "#e3e8df",
  },
  input: {
    backgroundColor: "#f9faf7",
    borderWidth: 1,
    borderColor: "#dbe2d8",
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    color: "#203c2f",
  },
  label: { fontSize: 13, color: "#42594b", marginBottom: 8, fontWeight: "600" },
  product: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 16,
    borderTopWidth: 1,
    borderColor: "#edf0e9",
    paddingVertical: 20,
  },
  productIcon: {
    width: 52,
    height: 56,
    backgroundColor: "#edf2e8",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  productName: {
    fontSize: 17,
    color: "#253f30",
    fontWeight: "600",
    marginBottom: 4,
  },
  stock: { fontSize: 12, color: "#3c7b54", marginTop: 5 },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 65,
    gap: 15,
  },
  emptyTitle: { fontSize: 22, fontWeight: "600", color: "#2e4b39" },
  authWrap: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  authCard: {
    backgroundColor: "#fff",
    borderRadius: 22,
    padding: 30,
    width: "100%",
    maxWidth: 480,
    borderWidth: 1,
    borderColor: "#e0e7da",
  },
  tabs: {
    flexDirection: "row",
    backgroundColor: "#f1f4ed",
    borderRadius: 10,
    padding: 4,
    marginVertical: 26,
  },
  tab: { flex: 1, alignItems: "center", paddingVertical: 12, borderRadius: 8 },
  activeTab: { backgroundColor: "#fff" },
  error: { color: "#af3838", marginVertical: 12, lineHeight: 21 },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(18,38,28,0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  modalScroll: { flexGrow: 1, justifyContent: "center", width: "100%" },
  modalCard: {
    backgroundColor: "#fff",
    padding: 28,
    borderRadius: 20,
    width: "100%",
    maxWidth: 480,
    alignSelf: "center",
  },
  modalTitle: { fontSize: 25, fontWeight: "700", color: "#234b39" },
});
