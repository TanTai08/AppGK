import React, { createContext, useContext, useEffect, useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
} from "firebase/auth";
import {
  onSnapshot,
  collection,
  doc,
  addDoc,
  setDoc,
  deleteDoc,
} from "firebase/firestore";
import { auth, db, configured, adminUid } from "./firebase";
import { productData, ProductData } from "./product.mjs";
export type Product = ProductData & { key: string }; // key is UI metadata, never written to Firebase.
export function errorMessage(error: unknown) {
  const code = (error as { code?: string })?.code || "";
  if (/invalid-credential|wrong-password|user-not-found/.test(code))
    return "Email hoặc mật khẩu không đúng.";
  if (/email-already-in-use/.test(code)) return "Email đã được đăng ký.";
  if (/invalid-email/.test(code)) return "Email không hợp lệ.";
  if (/weak-password/.test(code)) return "Mật khẩu phải có ít nhất 8 ký tự.";
  if (/too-many-requests/.test(code))
    return "Quá nhiều yêu cầu. Vui lòng thử lại sau.";
  if (/network-request-failed|unavailable|deadline-exceeded/.test(code))
    return "Không kết nối được Firebase. Kiểm tra Internet.";
  if (/permission.denied|PERMISSION_DENIED/i.test(code))
    return "Không có quyền truy cập. Kiểm tra UID admin và Firestore Rules.";
  return error instanceof Error
    ? error.message
    : "Có lỗi xảy ra. Vui lòng thử lại.";
}
function useAppStore() {
  const [user, setUser] = useState<User | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(configured);
  const [productsLoading, setProductsLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const isAdmin = !!user && !!adminUid && user.uid === adminUid;
  useEffect(() => {
    if (!auth) return;
    return onAuthStateChanged(auth, (value) => {
      setUser(value);
      setProducts([]);
      setLoadError("");
      setLoading(false);
    });
  }, []);
  useEffect(() => {
    if (!isAdmin || !db) {
      setProducts([]);
      setProductsLoading(false);
      return;
    }
    setProductsLoading(true);
    setLoadError("");
    return onSnapshot(
      collection(db, "products"),
      (snapshot) => {
        const values: Product[] = [];
        snapshot.docs.forEach((item) => {
          values.push({ ...item.data(), key: item.id } as Product);
        });
        setProducts(values.reverse());
        setProductsLoading(false);
        setLoadError("");
      },
      (error) => {
        setLoadError(errorMessage(error));
        setProductsLoading(false);
      },
    );
  }, [user?.uid, isAdmin]);
  async function authenticate(
    mode: "login" | "register",
    values: { email: string; password: string },
  ) {
    if (!auth) throw new Error("Chưa cấu hình Firebase. Xem README.");
    if (
      !values.email.trim() ||
      values.password.length < 8 ||
      values.password.length > 128
    )
      throw new Error("Nhập email và mật khẩu từ 8 đến 128 ký tự.");
    try {
      await (
        mode === "register"
          ? createUserWithEmailAndPassword
          : signInWithEmailAndPassword
      )(auth, values.email.trim(), values.password);
    } catch (error) {
      throw new Error(errorMessage(error));
    }
  }
  async function save(values: ProductData, key?: string) {
    if (!isAdmin || !db)
      throw new Error("Chỉ quản trị viên được phép thao tác.");
    const data = productData(values);
    try {
      if (key) await setDoc(doc(db, "products", key), data);
      else await addDoc(collection(db, "products"), data);
    } catch (error) {
      throw new Error(errorMessage(error));
    }
  }
  async function remove(key: string) {
    if (!isAdmin || !db)
      throw new Error("Chỉ quản trị viên được phép thao tác.");
    try {
      await deleteDoc(doc(db, "products", key));
    } catch (error) {
      throw new Error(errorMessage(error));
    }
  }
  async function logout() {
    if (auth) await signOut(auth);
  }
  return {
    user,
    isAdmin,
    products,
    loading,
    productsLoading,
    loadError,
    authenticate,
    save,
    remove,
    logout,
  };
}
const Store = createContext<ReturnType<typeof useAppStore> | null>(null);
export function AppProvider({ children }: { children: React.ReactNode }) {
  const value = useAppStore();
  return <Store.Provider value={value}>{children}</Store.Provider>;
}
export function useStore() {
  return useContext(Store)!;
}
