import { db } from "./firebase";
import { ref, set, push, onValue, remove, update } from "firebase/database";

// Products
export const addProduct = (product) => push(ref(db, "products"), product);
export const updateProduct = (id, product) => update(ref(db, `products/${id}`), product);
export const deleteProduct = (id) => remove(ref(db, `products/${id}`));
export const watchProducts = (callback) => onValue(ref(db, "products"), (snap) => callback(snap.val()));

// Cart
export const addToCart = (uid, product) => set(ref(db, `carts/${uid}/${product.id}`), product);
export const removeFromCart = (uid, pid) => remove(ref(db, `carts/${uid}/${pid}`));
export const watchCart = (uid, callback) => onValue(ref(db, `carts/${uid}`), (snap) => callback(snap.val()));

// Orders
export const placeOrder = async (uid, orderData) => {
  const newOrderRef = push(ref(db, "orders"));
  await set(newOrderRef, { ...orderData, userId: uid, status: "Pending", timestamp: Date.now() });
  return remove(ref(db, `carts/${uid}`)); // Clear cart
};
export const watchUserOrders = (uid, callback) => {
    onValue(ref(db, "orders"), (snap) => {
        const allOrders = snap.val() || {};
        const userOrders = Object.entries(allOrders)
            .filter(([_, o]) => o.userId === uid)
            .map(([id, o]) => ({ id, ...o }));
        callback(userOrders);
    });
};
export const watchAllOrders = (callback) => onValue(ref(db, "orders"), (snap) => callback(snap.val()));
export const updateOrderStatus = (orderId, status) => update(ref(db, `orders/${orderId}`), { status });
