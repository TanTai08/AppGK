import React, { useMemo, useState } from "react";
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
  useWindowDimensions,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { configured } from "./src/firebase";
import { StatusBar } from "expo-status-bar";
import { AppProvider, Product, useStore } from "./src/store";
import {
  inventoryStats,
  inventoryView,
  LOW_STOCK,
  StockFilter,
  InventorySort,
} from "./src/inventory.mjs";
const SORT_OPTIONS: { value: InventorySort; label: string }[] = [
  { value: "default", label: "Thứ tự mặc định" },
  { value: "name", label: "Tên A → Z" },
  { value: "priceAsc", label: "Giá thấp → cao" },
  { value: "priceDesc", label: "Giá cao → thấp" },
  { value: "stockAsc", label: "Tồn kho ít → nhiều" },
];
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
            ? label.includes("Giá")
              ? "decimal-pad"
              : "number-pad"
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
          Quản trị admin
        </Text>
      </View>
    </ScrollView>
  );
}
function Dashboard() {
  return <DashboardView store={useStore()} />;
}
export function DashboardView({
  store,
}: {
  store: ReturnType<typeof useStore>;
}) {
  const { user, products, productsLoading, loadError, save, remove, logout } =
    store;
  const compact = useWindowDimensions().width < 600;
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<StockFilter>("all");
  const [sort, setSort] = useState<InventorySort>("default");
  const [sortOpen, setSortOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const stats = useMemo(() => inventoryStats(products), [products]);
  const visible = useMemo(
    () => inventoryView(products, search, filter, sort),
    [products, search, filter, sort],
  );
  const ready = !productsLoading && !loadError;
  const filters: { value: StockFilter; label: string; count: number }[] = [
    { value: "all", label: "Tất cả", count: stats.count },
    { value: "available", label: "Còn hàng", count: stats.count - stats.out },
    { value: "low", label: "Sắp hết", count: stats.low },
    { value: "out", label: "Hết hàng", count: stats.out },
  ];
  function resetFilters() {
    setSearch("");
    setFilter("all");
    setSort("default");
  }
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
      setNotice(
        editor === "new"
          ? "Đã thêm sản phẩm. Danh sách và thống kê đã cập nhật."
          : "Đã lưu thay đổi sản phẩm.",
      );
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
          <Text style={s.eyebrow}>QUẢN TRỊ KHO HÀNG</Text>
          <Text style={s.hero}>Tổng quan sản phẩm</Text>
          <Text style={s.muted}>
            Nắm rõ tồn kho, quản lý từng sản phẩm dễ dàng.
          </Text>
        </View>
        <Button title="＋ Thêm sản phẩm" onPress={() => open("new")} />
      </View>
      <View style={s.summaryHeading}>
        <Text style={s.sectionTitle}>Kho hàng của bạn</Text>
      </View>
      <View style={s.statsGrid}>
        {[
          {
            label: "Mặt hàng",
            value: stats.count.toLocaleString("vi-VN"),
            detail: "Số sản phẩm trong danh sách",
          },
          {
            label: "Tổng số lượng",
            value: stats.quantity.toLocaleString("vi-VN"),
            detail: "Tổng đơn vị sản phẩm còn trong kho",
          },
          {
            label: "Giá trị tồn kho",
            value: money(stats.value),
            detail: "Tổng giá × số lượng",
          },
          {
            label: "Cần bổ sung",
            value: (stats.low + stats.out).toLocaleString("vi-VN"),
            detail: `${stats.low} sắp hết · ${stats.out} hết hàng`,
          },
        ].map((card, index) => (
          <View
            key={card.label}
            style={[
              s.statCard,
              compact && { minWidth: 140, flexBasis: "45%", padding: 16 },
              index === 2 && s.statCardAccent,
            ]}
          >
            <Text style={[s.statLabel, index === 2 && { color: "#c9decf" }]}>
              {card.label}
            </Text>
            <Text
              style={[
                s.statValue,
                compact && { fontSize: 22 },
                index === 2 && { color: "#fff" },
              ]}
            >
              {ready ? card.value : "—"}
            </Text>
            <Text style={[s.statDetail, index === 2 && { color: "#c9decf" }]}>
              {ready ? card.detail : "Chờ tải dữ liệu"}
            </Text>
          </View>
        ))}
      </View>
      {!!notice && (
        <View accessibilityLiveRegion="polite" style={s.notice}>
          <Text style={{ color: "#285b45", flex: 1 }}>{notice}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Đóng thông báo"
            onPress={() => setNotice("")}
            style={{ padding: 8 }}
          >
            <Text>✕</Text>
          </Pressable>
        </View>
      )}
      {!!(error || loadError) && (
        <Text accessibilityRole="alert" style={s.error}>
          {error || loadError}
        </Text>
      )}
      <View style={s.panel}>
        <View style={s.summaryHeading}>
          <View>
            <Text style={s.sectionTitle}>Danh sách sản phẩm</Text>
            <Text style={s.muted}>
              Sắp hết: từ 1 đến {LOW_STOCK} · Hết hàng: 0
            </Text>
          </View>
          <Text style={s.resultCount}>
            {ready
              ? `${visible.length} / ${products.length} mặt hàng`
              : "Đang tải…"}
          </Text>
        </View>
        <View style={s.toolbar}>
          <View style={s.searchBox}>
            <Text style={s.searchIcon}>⌕</Text>
            <TextInput
              accessibilityLabel="Tìm kiếm sản phẩm"
              placeholder="Tìm tên sản phẩm, có dấu hoặc không dấu…"
              placeholderTextColor="#87928c"
              value={search}
              onChangeText={setSearch}
              autoCapitalize="none"
              autoCorrect={false}
              style={s.searchInput}
            />
            {!!search && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Xóa từ khóa"
                onPress={() => setSearch("")}
                style={{ padding: 12 }}
              >
                <Text style={s.muted}>✕</Text>
              </Pressable>
            )}
          </View>
          <Button
            secondary
            title={`Sắp xếp: ${SORT_OPTIONS.find((o) => o.value === sort)!.label} ▾`}
            onPress={() => setSortOpen(true)}
          />
        </View>
        <View style={[s.row, { marginBottom: 20 }]}>
          {filters.map((f) => (
            <Pressable
              key={f.value}
              accessibilityRole="button"
              accessibilityState={{ selected: filter === f.value }}
              onPress={() => setFilter(f.value)}
              style={[s.filterChip, filter === f.value && s.filterActive]}
            >
              <Text
                style={[s.filterText, filter === f.value && { color: "#fff" }]}
              >
                {f.label} · {ready ? f.count : "—"}
              </Text>
            </Pressable>
          ))}
          {(search || filter !== "all" || sort !== "default") && (
            <Pressable
              accessibilityRole="button"
              onPress={resetFilters}
              style={{ padding: 10 }}
            >
              <Text style={{ color: "#536e60" }}>Đặt lại</Text>
            </Pressable>
          )}
        </View>
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
        ) : !visible.length ? (
          <View style={s.empty}>
            <Text style={s.emptyTitle}>Không tìm thấy sản phẩm</Text>
            <Text style={s.muted}>
              Thử tên khác hoặc bỏ bộ lọc để xem toàn bộ kho.
            </Text>
            <Button title="Bỏ bộ lọc" secondary onPress={resetFilters} />
          </View>
        ) : (
          visible.map((p) => (
            <View key={p.key} style={s.product}>
              <Image
                source={{ uri: p.image }}
                accessibilityLabel={`Ảnh ${p.name}`}
                style={{ width: 88, height: 88, borderRadius: 12 }}
                resizeMode="cover"
              />
              <View style={{ flex: 1, minWidth: 150 }}>
                <Text style={s.productName}>{p.name}</Text>
                <Text style={s.productPrice}>{money(p.price)}</Text>
                <View style={s.row}>
                  <Text style={s.muted}>
                    Số lượng: {p.soluong.toLocaleString("vi-VN")}
                  </Text>
                  <Text
                    style={[
                      s.stockBadge,
                      p.soluong === 0
                        ? s.badgeOut
                        : p.soluong <= LOW_STOCK
                          ? s.badgeLow
                          : s.badgeAvailable,
                    ]}
                  >
                    {p.soluong === 0
                      ? "Hết hàng"
                      : p.soluong <= LOW_STOCK
                        ? "Sắp hết"
                        : "Còn hàng"}
                  </Text>
                </View>
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
      {sortOpen && (
        <Modal
          visible
          transparent
          animationType="fade"
          onRequestClose={() => setSortOpen(false)}
        >
          <View style={s.overlay}>
            <View style={s.modalCard}>
              <Text style={[s.modalTitle, { marginBottom: 20 }]}>
                Sắp xếp sản phẩm
              </Text>
              {SORT_OPTIONS.map((option) => (
                <Pressable
                  key={option.value}
                  accessibilityRole="button"
                  accessibilityState={{ selected: sort === option.value }}
                  onPress={() => {
                    setSort(option.value);
                    setSortOpen(false);
                  }}
                  style={[s.sortOption, sort === option.value && s.secondary]}
                >
                  <Text
                    style={{
                      color: "#285b45",
                      fontWeight: sort === option.value ? "700" : "400",
                    }}
                  >
                    {option.label}
                    {sort === option.value ? " ✓" : ""}
                  </Text>
                </Pressable>
              ))}
              <Button
                title="Đóng"
                secondary
                onPress={() => setSortOpen(false)}
              />
            </View>
          </View>
        </Modal>
      )}
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
                      setNotice("Đã xóa sản phẩm. Thống kê đã cập nhật.");
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
  summaryHeading: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: "700",
    color: "#284535",
    marginBottom: 4,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
    marginBottom: 28,
  },
  statCard: {
    flex: 1,
    minWidth: 220,
    padding: 22,
    backgroundColor: "#fff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#e2e8dd",
  },
  statCardAccent: { backgroundColor: "#285b45", borderColor: "#285b45" },
  statLabel: { fontSize: 14, color: "#667b6e", fontWeight: "600" },
  statValue: {
    fontSize: 29,
    fontWeight: "700",
    color: "#234b39",
    marginVertical: 15,
  },
  statDetail: { fontSize: 12, color: "#7c897e", lineHeight: 19 },
  notice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#e5f0e2",
    padding: 14,
    borderRadius: 12,
    marginBottom: 18,
  },
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 18,
  },
  searchBox: {
    flex: 1,
    minWidth: 220,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f7f9f4",
    borderWidth: 1,
    borderColor: "#dce4d7",
    borderRadius: 12,
  },
  searchIcon: { fontSize: 26, color: "#627c69", paddingLeft: 15 },
  searchInput: {
    flex: 1,
    minWidth: 0,
    padding: 14,
    fontSize: 14,
    color: "#234b39",
  },
  filterChip: {
    paddingHorizontal: 15,
    paddingVertical: 11,
    borderRadius: 24,
    backgroundColor: "#f0f4eb",
  },
  filterActive: { backgroundColor: "#285b45" },
  filterText: { fontSize: 13, fontWeight: "600", color: "#536d5e" },
  resultCount: { fontSize: 13, color: "#718273" },
  productPrice: {
    fontSize: 17,
    fontWeight: "600",
    color: "#365f49",
    marginBottom: 8,
  },
  stockBadge: {
    fontSize: 11,
    fontWeight: "600",
    paddingVertical: 4,
    paddingHorizontal: 9,
    borderRadius: 6,
  },
  badgeAvailable: { color: "#35613e", backgroundColor: "#eaf2e5" },
  badgeLow: { color: "#8a5b0d", backgroundColor: "#fff2d5" },
  badgeOut: { color: "#a34646", backgroundColor: "#fcebea" },
  sortOption: { padding: 16, borderRadius: 10, marginBottom: 8 },
  root: { flex: 1, backgroundColor: "#f5f6f1" },
  page: {
    padding: 24,
    paddingTop: 42,
    maxWidth: 1280,
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
  productName: {
    fontSize: 17,
    color: "#253f30",
    fontWeight: "600",
    marginBottom: 4,
  },

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
