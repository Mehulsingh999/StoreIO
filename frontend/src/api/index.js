// src/api/index.js
const getToken = () => localStorage.getItem("token");

const req = async (url, opts = {}) => {
  const token = getToken();
  const r = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers || {}),
    },
    ...opts,
  });

  if (r.status === 401) {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.reload();
    return {};
  }

  return r.json();
};

export const api = {
  // Auth
  login: (username, password) =>
    req("/api/auth/login", { method: "POST", body: JSON.stringify({ username, password }) }),

  // Outlets
  getOutlets:   ()       => req("/api/catalog/outlets"),
  addOutlet:    (data)   => req("/api/catalog/outlets", { method: "POST", body: JSON.stringify(data) }),
  deleteOutlet: (id)     => req(`/api/catalog/outlets/${id}`, { method: "DELETE" }),

  // Categories
  getCategories:  (outlet_id) => req(`/api/catalog/categories${outlet_id ? `?outlet_id=${outlet_id}` : ""}`),
  addCategory:    (data)      => req("/api/catalog/categories", { method: "POST", body: JSON.stringify(data) }),
  deleteCategory: (id)        => req(`/api/catalog/categories/${id}`, { method: "DELETE" }),

  // Products
  getProducts:   (params = {}) => req(`/api/catalog/products?${new URLSearchParams(params)}`),
  addProduct:    (data)        => req("/api/catalog/products", { method: "POST", body: JSON.stringify(data) }),
  updateProduct: (id, data)    => req(`/api/catalog/products/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteProduct: (id)          => req(`/api/catalog/products/${id}`, { method: "DELETE" }),

  // Inventory
  getInventory: (outlet_id) => req(`/api/inventory${outlet_id ? `?outlet_id=${outlet_id}` : ""}`),
  getAlerts:    ()          => req("/api/inventory/alerts"),
  updateQty:    (pid, oid, data) =>
    req(`/api/inventory/${pid}/${oid}`, { method: "PUT", body: JSON.stringify(data) }),
  getLog: () => req("/api/inventory/log"),

  // Import
  importExcel: (file) => {
    const fd = new FormData();
    fd.append("file", file);
    return fetch("/api/import/excel", {
      method: "POST",
      headers: { Authorization: `Bearer ${getToken()}` },
      body: fd,
    }).then(r => r.json());
  },

  // Chat
  chat: (messages) => req("/api/chat", { method: "POST", body: JSON.stringify({ messages }) }),
};
