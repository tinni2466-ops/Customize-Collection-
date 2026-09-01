const EVENTS = Object.freeze({
  ORDER_UPDATED: "orderUpdated",
  ORDER_COMPLETED: "orderCompleted",
  PAYMENT_COMPLETED: "paymentCompleted",
  CART_UPDATED: "cartUpdated",
});

const STORAGE_KEYS = Object.freeze({
  CART: "app_cart_items",
  LEGACY_CART: "cart",
  ORDERS: "app_pending_orders",
  ACTIVE_ORDER: "app_active_order_id",
  USER_ADDRESS: "app_saved_address",
  CURRENT_USER: "currentUser",
});

const CUSTOMIZATION_QUESTIONS = Object.freeze([
  {
    id: 1,
    q: "What specific fit adjustments do you need for this item?",
    options: ["Standard Fit", "Slim Fit", "Custom Measurement"],
  },
  {
    id: 2,
    q: "Any custom fabric preferences or color tone variations?",
    options: ["Original Material", "Extra Silk", "Darker Shade"],
  },
  {
    id: 3,
    q: "What size specifications should we follow?",
    options: [
      "Standard Sizing",
      "Custom Bust/Waist",
      "Provide Measurements Later",
    ],
  },
  {
    id: 4,
    q: "Do you have any specific neck or sleeve style requests?",
    options: ["Standard Style", "Full Sleeves", "Custom Neckline"],
  },
  {
    id: 5,
    q: "What is your preferred event date or delivery deadline?",
    options: ["Standard Delivery", "Urgent Stitching (3 Days)", "Flexible"],
  },
  {
    id: 6,
    q: "Any additional notes or special packaging requests?",
    options: ["No Special Request", "Gift Wrap Needed", "Eco-Packaging"],
  },
]);

// --- CHECK USER LOGIN STATUS IN HEADER ---
const checkUserLogin = () => {
  let authContainer = document.getElementById("auth-container");
  if (!authContainer) return;

  let currentUser = JSON.parse(localStorage.getItem("currentUser"));

  if (currentUser && currentUser.email) {
    // User is logged in: Show their name/email and a Logout button
    // We take the first letter of their name for a tiny custom avatar circle
    let firstLetter = currentUser.name
      ? currentUser.name.charAt(0).toUpperCase()
      : "U";

    authContainer.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
                <div style="width: 35px; height: 35px; background: #3b50fb; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 15px;" title="${currentUser.name || currentUser.email}">
                    ${firstLetter}
                </div>
                <button id="logout-btn" style="background: #e02d2d; color: white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 12px; margin-left: 5px;">Logout</button>
            </div>
        `;

    // Add logout functionality
    document.getElementById("logout-btn").addEventListener("click", () => {
      // Clear current working cart so it doesn't linger on screen
      if (typeof carts !== "undefined") {
        carts = [];
      }
      if (typeof addCartToHTML === "function") {
        addCartToHTML();
      }

      // Remove user session
      localStorage.removeItem("currentUser");

      alert("Logged out successfully!");
      window.location.reload(); // Refresh to reset header to "Login"
    });
  } else {
    // User is not logged in: Keep default Login link
    authContainer.innerHTML = `<a href="login.html" style="text-decoration: none; color: inherit; font-weight: 500;">Login</a>`;
  }
};

class EventBus {
  static dispatch(eventName, detail = {}) {
    window.dispatchEvent(new CustomEvent(eventName, { detail, bubbles: true }));
  }

  static listen(eventName, callback) {
    window.addEventListener(eventName, callback);
  }
}

class StorageManager {
  static get(key, fallback = null) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : fallback;
    } catch (e) {
      console.error(`[StorageManager] Error reading key "${key}":`, e);
      return fallback;
    }
  }

  static set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      EventBus.dispatch(EVENTS.ORDER_UPDATED, { key, value });
    } catch (e) {
      console.error(`[StorageManager] Error writing key "${key}":`, e);
    }
  }

  static remove(key) {
    try {
      localStorage.removeItem(key);
      EventBus.dispatch(EVENTS.ORDER_UPDATED, { key, value: null });
    } catch (e) {
      console.error(`[StorageManager] Error removing key "${key}":`, e);
    }
  }
}

class AccountService {
  static getCurrentUser() {
    const savedUser = StorageManager.get(STORAGE_KEYS.CURRENT_USER);
    if (savedUser && savedUser.email) {
      return {
        name: savedUser.name || savedUser.email.split("@")[0],
        email: savedUser.email,
      };
    }
    return {
      name: "Guest User",
      email: "guest@example.com",
    };
  }
}

class AvatarService {
  static generateSVG(name) {
    const cleanName = (name || "Guest Customer").trim();
    const firstLetter = cleanName.charAt(0).toUpperCase() || "G";

    let hash = 0;
    for (let i = 0; i < cleanName.length; i++) {
      hash = cleanName.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash) % 360;
    const bgColor = `hsl(${hue}, 65%, 45%)`;

    const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%">
<rect width="100" height="100" rx="50" fill="${bgColor}" />
<text x="50" y="55" font-size="48" font-family="Arial, sans-serif" font-weight="bold" fill="#FFFFFF" text-anchor="middle" dominant-baseline="central">
${firstLetter}
</text>
</svg>`.trim();

    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }
}

class GeoService {
  static async getCoordinates() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation is not supported by your browser."));
        return;
      }
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      });
    });
  }

  static async reverseGeocode(lat, lon) {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`;
    const response = await fetch(url, {
      headers: { "User-Agent": "FashionStoreEcommerceApp/1.0" },
    });
    if (!response.ok) throw new Error("Geocoding service unavailable");
    return await response.json();
  }
}

class OrderEngine {
  static generateOrderId() {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `ORD-${dateStr}-${randomStr}`;
  }

  static getCartFromStorage() {
    const primaryCart = StorageManager.get(STORAGE_KEYS.CART, []);
    if (primaryCart.length > 0) return primaryCart;
    return StorageManager.get(STORAGE_KEYS.LEGACY_CART, []);
  }

  static syncCartToActiveOrder() {
    const cartItems = this.getCartFromStorage();
    const activeOrder = this.getActiveOrder();

    if (cartItems.length > 0) {
      const catalog =
        typeof listProducts !== "undefined" && Array.isArray(listProducts)
          ? listProducts
          : [];

      activeOrder.items = cartItems.map((item) => {
        const prodId = item.id || item.product_id;
        const matchedProduct = catalog.find((p) => p.id == prodId);

        return {
          id:
            prodId ||
            (matchedProduct
              ? matchedProduct.id
              : `PROD-${Math.random().toString(36).substring(2, 7)}`),
          name:
            item.name ||
            (matchedProduct ? matchedProduct.name : "Custom Fashion Dress"),
          price: Number(
            item.price || (matchedProduct ? matchedProduct.price : 0),
          ),
          color: item.color || "#b70707",
          size: item.size || "M",
          qty: Number(item.qty || item.quantity) || 1,
          image:
            item.image ||
            item.img ||
            (matchedProduct ? matchedProduct.image : "saree1.png"),
          customization: item.customization || null,
        };
      });

      this.saveOrder(activeOrder);
    }
    return activeOrder;
  }

  static createInitialOrder() {
    let orders = StorageManager.get(STORAGE_KEYS.ORDERS, []);
    let activeId = StorageManager.get(STORAGE_KEYS.ACTIVE_ORDER);

    let activeOrder = orders.find((o) => o.id === activeId && !o.isCompleted);

    if (!activeOrder) {
      activeId = this.generateOrderId();
      const user = AccountService.getCurrentUser();

      activeOrder = {
        id: activeId,
        customer: {
          name: user.name,
          email: user.email,
          avatar: AvatarService.generateSVG(user.name),
        },
        items: this.getCartFromStorage(),
        address: StorageManager.get(STORAGE_KEYS.USER_ADDRESS, {
          address1: "",
          city: "",
          state: "",
          zip: "",
          country: "IN",
        }),
        customizationChat: [],
        questionStep: 0,
        customizationCompleted: false,
        talkToOwnerRequested: false,
        talkToOwnerFee: 50,
        adminExtraCharge: 0,
        paymentStatus: "UNPAID",
        status: "PENDING",
        isCompleted: false,
        createdAt: new Date().toISOString(),
      };

      orders.push(activeOrder);
      StorageManager.set(STORAGE_KEYS.ORDERS, orders);
      StorageManager.set(STORAGE_KEYS.ACTIVE_ORDER, activeId);
    } else {
      activeOrder.adminExtraCharge = Number(activeOrder.adminExtraCharge) || 0;
    }

    return activeOrder;
  }

  static getActiveOrder() {
    const activeId = StorageManager.get(STORAGE_KEYS.ACTIVE_ORDER);
    const orders = StorageManager.get(STORAGE_KEYS.ORDERS, []);
    return orders.find((o) => o.id === activeId) || this.createInitialOrder();
  }

  static saveOrder(order) {
    const orders = StorageManager.get(STORAGE_KEYS.ORDERS, []);
    const index = orders.findIndex((o) => o.id === order.id);
    if (index !== -1) {
      orders[index] = order;
    } else {
      orders.push(order);
    }
    StorageManager.set(STORAGE_KEYS.ORDERS, orders);
  }

  static updateActiveOrder(updateFn) {
    const order = this.getActiveOrder();
    updateFn(order);
    this.saveOrder(order);

    if (order.items) {
      StorageManager.set(STORAGE_KEYS.CART, order.items);
      StorageManager.set(STORAGE_KEYS.LEGACY_CART, order.items);
    }
  }

  static calculateTotals(order) {
    const items = order.items || [];
    const subtotal = items.reduce(
      (sum, item) => sum + Number(item.price) * Number(item.qty),
      0,
    );
    const ownerFee = order.talkToOwnerRequested
      ? Number(order.talkToOwnerFee || 0)
      : 0;
    const extraCharge = Number(order.adminExtraCharge) || 0;
    const grandTotal = subtotal + ownerFee + extraCharge;

    return { subtotal, ownerFee, extraCharge, grandTotal };
  }

  static generateTalkPassword(order) {
    // Generate password if it doesn't exist yet
    if (!order.talkPassword && !order.passkey) {
      order.talkPassword = Math.random()
        .toString(36)
        .substring(2, 8)
        .toUpperCase();
    }

    const generatedPass = order.talkPassword || order.passkey;

    // 1. Save to active order
    localStorage.setItem("active_order", JSON.stringify(order));

    // 2. Save/Update inside admin_orders map under order.id
    let allOrders = JSON.parse(localStorage.getItem("admin_orders")) || {};
    allOrders[order.id] = {
      ...allOrders[order.id],
      ...order,
      talkPassword: generatedPass,
      passkey: generatedPass,
    };
    localStorage.setItem("admin_orders", JSON.stringify(allOrders));

    return generatedPass;
  }
}

class OrderUIController {
  static init() {
    if (
      !document.querySelector(".orcud3") &&
      !document.querySelector(".ite1") &&
      !document.querySelector(".item")
    ) {
      return;
    }

    OrderEngine.syncCartToActiveOrder();
    this.applyCustomizationDeskStyles();
    this.bindEvents();
    this.renderAll();
  }

  static applyCustomizationDeskStyles() {
    const desk = document.querySelector(".orcud3");
    if (desk) {
      desk.style.maxHeight = "420px";
      desk.style.overflowY = "auto";
      desk.style.display = "flex";
      desk.style.flexDirection = "column";
      desk.style.padding = "15px";
      desk.style.gap = "12px";
      desk.style.boxSizing = "border-box";
    }

    const inputBar = document.querySelector(".orcud6");
    if (inputBar) {
      inputBar.style.position = "sticky";
      inputBar.style.bottom = "0";
      inputBar.style.background = "#fff";
      inputBar.style.padding = "10px 0 0 0";
      inputBar.style.marginTop = "auto";
      inputBar.style.zIndex = "5";
    }
  }

  static bindEvents() {
    const clearBtn = document.querySelector(".right-header button");
    if (clearBtn) {
      clearBtn.onclick = () => {
        if (confirm("Are you sure you want to clear your current order?")) {
          StorageManager.remove(STORAGE_KEYS.ACTIVE_ORDER);
          StorageManager.remove(STORAGE_KEYS.CART);
          StorageManager.remove(STORAGE_KEYS.LEGACY_CART);
          OrderEngine.createInitialOrder();
          this.renderAll();
        }
      };
    }

    const talkCheckbox = document.getElementById("talk");
    if (talkCheckbox) {
      talkCheckbox.onchange = (e) => {
        OrderEngine.updateActiveOrder((order) => {
          order.talkToOwnerRequested = e.target.checked;
        });

        // Re-render components and broadcast event
        OrderUIController.renderAll();
        EventBus.dispatch(EVENTS.ORDER_UPDATED);
      };
    }

    const addressForm =
      document.querySelector(".loca3 form") || document.querySelector(".loca3");
    if (addressForm) {
      const handleAddressSave = (e) => {
        if (e && e.preventDefault) e.preventDefault();
        const addressObj = {
          address1: document.getElementById("address1")?.value || "",
          city: document.getElementById("city")?.value || "",
          state: document.getElementById("state")?.value || "",
          zip: document.getElementById("zip")?.value || "",
          country: document.getElementById("country")?.value || "IN",
        };

        OrderEngine.updateActiveOrder((order) => {
          order.address = addressObj;
        });
        StorageManager.set(STORAGE_KEYS.USER_ADDRESS, addressObj);
        alert("Delivery address saved successfully!");
      };

      if (addressForm.tagName === "FORM") {
        addressForm.onsubmit = handleAddressSave;
      } else {
        const saveAddrBtn =
          addressForm.querySelector('button[type="submit"]') ||
          addressForm.querySelector("button");
        if (saveAddrBtn) saveAddrBtn.onclick = handleAddressSave;
      }
    }

    const chatSendBtn = document.querySelector(".orcud6 button");
    const chatInput = document.getElementById("chat");

    const handleSend = () => {
      if (chatInput) {
        this.sendChatMessage(chatInput.value.trim());
      }
    };

    if (chatSendBtn) chatSendBtn.onclick = handleSend;
    if (chatInput) {
      chatInput.onkeypress = (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          handleSend();
        }
      };
    }

    const confirmBtn =
      document.getElementById("confirmOrderBtn") ||
      document.querySelector(".btn-confirm");
    if (confirmBtn) {
      confirmBtn.onclick = () => {
        const order = OrderEngine.getActiveOrder();
        if (!order.customizationCompleted) {
          alert(
            "Please complete all 6 customization questions before confirming your order.",
          );
          return;
        }
        this.showPaymentModal();
      };
    }

    window.addEventListener("storage", (e) => {
      if (
        [
          STORAGE_KEYS.CART,
          STORAGE_KEYS.ORDERS,
          STORAGE_KEYS.ACTIVE_ORDER,
        ].includes(e.key)
      ) {
        this.renderAll();
      }
    });

    EventBus.listen(EVENTS.ORDER_UPDATED, () => this.renderAll());
  }

  static sendChatMessage(answerText) {
    const order = OrderEngine.getActiveOrder();
    const totalItems = (order.items || []).reduce(
      (sum, item) => sum + (Number(item.qty || item.quantity) || 1),
      0,
    );
    let currentItemIdx = order.currentItemIndex || 0;
    let qStep = order.questionStep || 0;

    if (order.customizationCompleted || currentItemIdx >= totalItems) {
      return;
    }

    if (!answerText) return;

    const currentQData = CUSTOMIZATION_QUESTIONS[qStep];

    OrderEngine.updateActiveOrder((ord) => {
      if (!ord.customizationChat) ord.customizationChat = [];

      // Store answer along with item number context
      ord.customizationChat.push({
        itemNumber: currentItemIdx + 1,
        qIndex: qStep + 1,
        q: currentQData.q,
        a: answerText,
        timestamp: new Date().toLocaleTimeString(),
      });

      // Advance to next question
      qStep += 1;

      // If 6 questions answered for current item, move to the next item
      if (qStep >= CUSTOMIZATION_QUESTIONS.length) {
        qStep = 0;
        currentItemIdx += 1;
      }

      ord.questionStep = qStep;
      ord.currentItemIndex = currentItemIdx;

      // Finish when all items have answered all questions
      if (currentItemIdx >= totalItems) {
        ord.customizationCompleted = true;
        ord.status = "READY_FOR_CONFIRMATION";
      } else {
        ord.status = "CUSTOMIZATION_IN_PROGRESS";
      }
    });

    const chatInput = document.getElementById("chat");
    if (chatInput) chatInput.value = "";

    this.renderChatMessages();
    this.updateConfirmButtonState();
  }

  // Add/update this inside OrderUIController:
  static renderAll() {
    const order = OrderEngine.getActiveOrder();

    const orderIdEl = document.getElementById("active-order-id");
    if (orderIdEl) {
      orderIdEl.style.display = "block";
      orderIdEl.innerText = `Active Order ID: ${order.id}`;
    }

    this.renderOrderItems(order);

    if (order.address) {
      ["address1", "city", "state", "zip", "country"].forEach((field) => {
        const input = document.getElementById(field);
        if (input && order.address[field] !== undefined) {
          input.value = order.address[field];
        }
      });
    }

    const talkCheckbox = document.getElementById("talk");
    if (talkCheckbox) talkCheckbox.checked = !!order.talkToOwnerRequested;

    this.renderTotals();
    this.renderChatMessages();
    this.updateConfirmButtonState();

    // If payment modal is open, re-render it in real time
    const modalContainer = document.getElementById("paymentModal");
    if (modalContainer && modalContainer.style.display !== "none") {
      this.showPaymentModal();
    }
  }

  static renderOrderItems(order) {
    let itemsContainer = document.querySelector(".ite1");
    if (!itemsContainer) {
      const firstItem = document.querySelector(".item");
      if (firstItem) itemsContainer = firstItem.parentElement;
    }

    if (!itemsContainer || !order.items) return;

    if (order.items.length === 0) {
      itemsContainer.innerHTML =
        '<p style="padding:20px; color:#777; text-align:center;">Your cart is empty. Please add items to proceed.</p>';
      return;
    }

    itemsContainer.innerHTML = order.items
      .map(
        (item, idx) => `
<div class="item" data-id="${item.id}" data-index="${idx}" style="display:flex; justify-content:space-between; align-items:center; padding:12px; border-bottom:1px solid #eee;">
<div class="leftit" style="display:flex; gap:12px; align-items:center;">
<div class="leftit1" style="width:60px; height:60px; border-radius:8px; overflow:hidden; flex-shrink:0;">
<img src="${item.image}" alt="${item.name}" style="width:100%; height:100%; object-fit:cover;">
</div>
<div class="leftit2">
<h2 style="font-size:1rem; margin:0 0 4px 0;">${item.name}</h2>
<div class="colo" style="font-size:0.85rem; color:#555;">
<span>Color: </span>
<div class="color" style="background-color: ${item.color}; display:inline-block; width:14px; height:14px; border-radius:50%; margin-left:4px; vertical-align:middle; border:1px solid #ccc;"></div>
<span style="margin-left:10px;">Size: <strong>${item.size || "Standard"}</strong></span>
</div>
<div class="qty-controls" style="margin-top:6px; display:flex; align-items:center; gap:8px;">
<button type="button" onclick="OrderUIController.updateQuantity(${idx}, ${item.qty - 1})" style="padding:2px 8px; cursor:pointer; border:1px solid #ccc; background:#fff; border-radius:4px;">-</button>
<span style="font-weight:600; font-size:0.85rem;">Qty: ${item.qty}</span>
<button type="button" onclick="OrderUIController.updateQuantity(${idx}, ${item.qty + 1})" style="padding:2px 8px; cursor:pointer; border:1px solid #ccc; background:#fff; border-radius:4px;">+</button>
</div>
</div>
</div>
<div class="rightit" style="text-align:right;">
<p style="font-weight:bold; margin:0 0 8px 0; color:#b70707;">₹${item.price * item.qty}</p>
<p style="font-size:0.75rem; color:#777; margin:0 0 6px 0;">(₹${item.price} each)</p>
<button type="button" onclick="OrderUIController.removeItem(${idx})" title="Remove Item" style="background:none; border:none; cursor:pointer;">
<svg fill="#b70707" width="18px" height="20px" viewBox="0 0 24 24"><path d="M22,5H17V2a1,1,0,0,0-1-1H8A1,1,0,0,0,7,2V5H2A1,1,0,0,0,2,7H3.117L5.008,22.124A1,1,0,0,0,6,23H18a1,1,0,0,0,.992-.876L20.883,7H22a1,1,0,0,0,0-2ZM9,3h6V5H9Zm8.117,18H6.883L5.133,7H18.867Z"/></svg>
</button>
</div>
</div>
`,
      )
      .join("");
  }

  static updateQuantity(index, newQty) {
    if (newQty < 1) {
      this.removeItem(index);
      return;
    }
    OrderEngine.updateActiveOrder((order) => {
      if (order.items && order.items[index]) {
        order.items[index].qty = newQty;
      }
    });
    this.renderAll();
  }

  static removeItem(index) {
    OrderEngine.updateActiveOrder((order) => {
      if (order.items) {
        order.items.splice(index, 1);
      }
    });
    this.renderAll();
  }

  static renderTotals() {
    const order = OrderEngine.getActiveOrder();
    const totals = OrderEngine.calculateTotals(order);

    const priceEl = document.querySelector(".tota2 .price");
    if (priceEl) priceEl.innerText = `₹${totals.grandTotal}`;

    const subtotalEl = document.querySelector(".subtotal-val");
    if (subtotalEl) subtotalEl.innerText = `₹${totals.subtotal}`;

    const ownerFeeEl = document.querySelector(".owner-fee-val");
    if (ownerFeeEl) ownerFeeEl.innerText = `₹${totals.ownerFee}`;

    const extraChargeEl = document.querySelector(".extra-charge-val");
    if (extraChargeEl) extraChargeEl.innerText = `₹${totals.extraCharge}`;
  }

  static renderChatMessages() {
    const order = OrderEngine.getActiveOrder();
    const chatBox = document.querySelector(".orcud3");
    if (!chatBox) return;

    // Calculate total items across all products in order
    const totalItems = (order.items || []).reduce(
      (sum, item) => sum + (Number(item.qty || item.quantity) || 1),
      0,
    );
    const currentItemIdx = order.currentItemIndex || 0;

    let html = "";
    const history = order.customizationChat || [];

    // Render past answers
    if (history.length > 0) {
      html += history
        .map(
          (c) => `
<div style="margin-bottom:8px; font-size:0.88rem; max-width:100%; word-break:break-word;">
<p style="margin:0; color:#b70707; font-weight:600;">[Item ${c.itemNumber || 1} of ${totalItems}] Q${c.qIndex}: ${c.q}</p>
<p style="margin:4px 0 0 8px; background:#f0f4f8; border-left:3px solid #b70707; padding:6px 12px; border-radius:0 8px 8px 0; display:inline-block; color:#333;">
A: <strong>${c.a}</strong>
</p>
</div>
`,
        )
        .join("");
    }

    // Check if all questions for all items are completed
    if (
      order.customizationCompleted ||
      currentItemIdx >= totalItems ||
      totalItems === 0
    ) {
      html += `
<div style="background:#e8f8f0; border:1px solid #28a745; padding:15px; border-radius:10px; margin-top:10px; color:#155724;">
<p style="margin:0 0 6px 0; font-weight:bold; font-size:1rem;">✅ Thank you.</p>
<p style="margin:0 0 6px 0;">Your customization request for all ${totalItems} item(s) has been saved successfully.</p>
<p style="margin:0 0 6px 0;">Your order is now ready for confirmation.</p>
<p style="margin:0;">Please click <strong>Confirm Order</strong> to continue.</p>
</div>
`;

      const inputBar = document.querySelector(".orcud6");
      if (inputBar) inputBar.style.display = "none";
    } else {
      const qStep = order.questionStep || 0;
      const currentQData = CUSTOMIZATION_QUESTIONS[qStep];

      html += `
<div style="padding:10px 12px; background:#fff3f3; border-radius:8px; border-left:4px solid #b70707; margin-top:6px; color:#444; max-width:100%; word-break:break-word;">
<strong>Assistant (Item ${currentItemIdx + 1} of ${totalItems} — Question ${qStep + 1} of ${CUSTOMIZATION_QUESTIONS.length}):</strong> ${currentQData.q}
</div>
`;

      if (currentQData.options && currentQData.options.length > 0) {
        html += `<div class="floating-options" style="margin-top:8px; display:flex; gap:8px; flex-wrap:wrap;">`;
        currentQData.options.forEach((opt) => {
          html += `<button type="button" onclick="OrderUIController.sendChatMessage('${opt.replace(/'/g, "\\'")}')" style="background:#b70707; color:#fff; border:none; padding:6px 14px; border-radius:15px; cursor:pointer; font-size:0.82rem; font-weight:500; transition:all 0.2s;">${opt}</button>`;
        });
        html += `</div>`;
      }

      const inputBar = document.querySelector(".orcud6");
      if (inputBar) inputBar.style.display = "flex";
    }

    chatBox.innerHTML = html;
    chatBox.scrollTop = chatBox.scrollHeight;
  }

  static updateConfirmButtonState() {
    const order = OrderEngine.getActiveOrder();
    const confirmBtn =
      document.getElementById("confirmOrderBtn") ||
      document.querySelector(".btn-confirm");
    if (!confirmBtn) return;

    if (order.customizationCompleted) {
      confirmBtn.disabled = false;
      confirmBtn.removeAttribute("disabled");
      confirmBtn.style.opacity = "1";
      confirmBtn.style.cursor = "pointer";
      confirmBtn.style.pointerEvents = "auto";
    } else {
      confirmBtn.disabled = true;
      confirmBtn.setAttribute("disabled", "disabled");
      confirmBtn.style.opacity = "0.5";
      confirmBtn.style.cursor = "not-allowed";
      confirmBtn.style.pointerEvents = "none";
    }
  }

  static showPaymentModal() {
    const order = OrderEngine.getActiveOrder();
    const totals = OrderEngine.calculateTotals(order);

    // 1. Ensure modal container exists dynamically
    let modalContainer = document.getElementById("paymentModal");
    if (!modalContainer) {
      modalContainer = document.createElement("div");
      modalContainer.id = "paymentModal";
      modalContainer.style.cssText = `
                position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
                background: rgba(0,0,0,0.65); display: flex; align-items: center;
                justify-content: center; z-index: 10000; backdrop-filter: blur(4px);
            `;
      document.body.appendChild(modalContainer);
    }

    // 2. Talk to Owner logic
    const isTalkRequested = order.talkToOwnerRequested || false;
    const passkey = isTalkRequested
      ? OrderEngine.generateTalkPassword(order)
      : "";
    const talkToUrl = `talkto.html?orderId=${encodeURIComponent(order.id)}`;

    const talkToOwnerBlock = isTalkRequested
      ? `
            <div class="talk-owner-box" style="background:#f0f7ff; border:1px solid #007bff; padding:12px; border-radius:10px; margin-bottom:15px; text-align:left;">
                <h4 style="margin:0 0 6px 0; color:#0056b3; font-size:0.95rem; display:flex; align-items:center; gap:6px;">
                    💬 Talk to Owner Portal
                </h4>
                <p style="margin:0 0 8px 0; font-size:0.82rem; color:#333;">
                    Use the unique passcode below to access your private conversation:
                </p>
                <div style="display:flex; justify-content:space-between; align-items:center; background:#fff; padding:8px 12px; border-radius:6px; border:1px dashed #007bff; margin-bottom:6px;">
                    <span style="font-size:0.8rem; color:#555;">Passcode: <strong style="font-size:1rem; color:#007bff; letter-spacing:1px;">${passkey}</strong></span>
                    <a href="${talkToUrl}" target="_blank" style="background:#007bff; color:#fff; padding:5px 12px; border-radius:4px; text-decoration:none; font-size:0.78rem; font-weight:bold;">
                        Open Chat ↗
                    </a>
                </div>
                <small style="color:#666; font-size:0.72rem; display:block;">
                    * Talk fee (₹${order.talkToOwnerFee || 50}) is included in your total breakdown.
                </small>
            </div>
        `
      : "";

    // 3. Render Modal Content (With Disabled Initial Pay Button state)
    modalContainer.innerHTML = `
            <div style="background: #fff; border-radius: 16px; padding: 30px; width: 90%; max-width: 460px; text-align: center; box-shadow: 0 10px 30px rgba(0,0,0,0.3); position:relative;">
                <span id="closePayModalCross" style="position:absolute; right:18px; top:12px; cursor:pointer; font-size:1.5rem; color:#888;">&times;</span>
                
                <h2 style="margin-top:0; color:#b70707; font-size:1.4rem;">Complete Your Payment</h2>
                <img src="Logo.png" alt="Logo" style="display: block; margin: 0 auto 10px auto; width: 120px; height: auto;">
                <p style="font-size:0.9rem; color:#555; margin-bottom:15px;">Order Reference: <strong>${order.id}</strong></p>

                <!-- Talk to Owner Block -->
                ${talkToOwnerBlock}

                <!-- Price Summary Breakdown -->
                <div style="text-align:left; font-size:0.95rem; line-height: 1.8; background:#f9f9f9; padding:12px; border-radius:10px;">
                    <p style="display:flex; justify-content:space-between; margin:4px 0;"><span>Items Subtotal:</span> <strong>₹${totals.subtotal}</strong></p>
                    ${totals.ownerFee ? `<p style="display:flex; justify-content:space-between; margin:4px 0; color:#007bff;"><span>Owner Customization Fee:</span> <strong>₹${totals.ownerFee}</strong></p>` : ""}
                    ${totals.extraCharge ? `<p style="display:flex; justify-content:space-between; margin:4px 0; color:#b70707;"><span>Admin Extra Charges:</span> <strong>₹${totals.extraCharge}</strong></p>` : ""}
                    <hr style="border:none; border-top:1px solid #eee; margin:8px 0;">
                    <p style="display:flex; justify-content:space-between; font-size:1.15rem; color:#b70707; margin:4px 0;"><span>Grand Total:</span> <strong>₹${totals.grandTotal}</strong></p>
                </div>

                <!-- Action Buttons -->
                <div style="margin-top:20px; display:flex; gap:10px; justify-content:center;">
                    <button id="cancelPayBtn" type="button" style="padding:10px 20px; border-radius:20px; border:1px solid #ccc; background:#fff; cursor:pointer; font-size:0.9rem;">Cancel</button>
                    <button id="payNowBtn" type="button" disabled style="padding:10px 25px; border-radius:20px; border:none; background:#ccc; color:#666; font-weight:bold; cursor:not-allowed; font-size:0.9rem;">Please wait (60s)</button>
                </div>
            </div>
        `;

    modalContainer.style.display = "flex";

    // 4. Timer & Event Handlers
    let timerInterval = null;

    const closeModal = () => {
      if (timerInterval) clearInterval(timerInterval);
      modalContainer.remove();
    };

    document.getElementById("cancelPayBtn").onclick = closeModal;
    document.getElementById("closePayModalCross").onclick = closeModal;

    // 60-Second Countdown Logic
    const payNowBtn = document.getElementById("payNowBtn");
    let timeLeft = 60;

    timerInterval = setInterval(() => {
      timeLeft--;
      if (timeLeft > 0) {
        payNowBtn.innerText = `Please wait (${timeLeft}s)`;
      } else {
        clearInterval(timerInterval);
        payNowBtn.disabled = false;
        payNowBtn.innerText = `Pay Now (₹${totals.grandTotal})`;
        payNowBtn.style.background = "#b70707";
        payNowBtn.style.color = "#fff";
        payNowBtn.style.cursor = "pointer";

        payNowBtn.onclick = () => {
          alert(
            "Please wait at least 5 minutes before proceeding to the next step. Your status will show as 'Order Settlement Confirmed' under Order Tracking.",
          );
          window.location.href = "hisdel.html";
        };
      }
    }, 1000);
  }

  static closePaymentModal() {
    const modalContainer = document.getElementById("paymentModal");
    if (modalContainer) modalContainer.remove();
  }

  static generateTalkPassword(order) {
    if (!order.talkPassword) {
      order.talkPassword = Math.random()
        .toString(36)
        .substring(2, 8)
        .toUpperCase();

      // Save to active_order
      localStorage.setItem("active_order", JSON.stringify(order));

      // Save directly to admin_orders indexed by Order ID
      let allOrders = JSON.parse(localStorage.getItem("admin_orders")) || {};
      allOrders[order.id] = { ...allOrders[order.id], ...order };
      localStorage.setItem("admin_orders", JSON.stringify(allOrders));
    }
    return order.talkPassword;
  }
}

// --- PRODUCT STOCK MANAGEMENT SYSTEM ---

// In-memory stock status tracking (persisted via localStorage)
let Products = [];
let stockStatus = JSON.parse(
  localStorage.getItem("admin_stock_status") || "{}",
);

// Helper to save stock states across reloads
const saveStockStatus = () => {
  localStorage.setItem("admin_stock_status", JSON.stringify(stockStatus));
};

// Function to generate individual color SVGs
const createColorSVG = (col, productId, isOutOfStock) => {
  const strokeColor = isOutOfStock ? "#ff0000" : "#ccc";
  const strokeWidth = isOutOfStock ? "4" : "2";
  const opacity = isOutOfStock ? "0.3" : "1";

  return `
    <svg width="45" height="45" xmlns="http://www.w3.org/2000/svg" 
         style="margin-right: 8px; cursor: pointer; opacity: ${opacity};" 
         class="color-option" 
         data-product-id="${productId}" 
         data-color="${col}">
        <circle cx="22" cy="22" r="20" stroke="${strokeColor}" stroke-width="${strokeWidth}" fill="${col}" />
        ${isOutOfStock ? `<line x1="6" y1="6" x2="38" y2="38" stroke="#ff0000" stroke-width="4" />` : ""}
    </svg>
  `;
};

// Main function to render products inside container from products.json
const renderAdminProducts = async (containerSelector = ".a9-container") => {
  const container = document.querySelector(containerSelector);
  if (!container) return;

  // Fetch products.json if not already loaded
  if (Products.length === 0) {
    try {
      const res = await fetch("products.json");
      Products = await res.json();
    } catch (err) {
      console.error("Failed to load products.json for stock management:", err);
      return;
    }
  }

  container.innerHTML = "";

  Products.forEach((product) => {
    // Initialize stock object if not present
    if (!stockStatus[product.id]) {
      stockStatus[product.id] = {
        isProductOutOfStock: false,
        colorsOutOfStock: {},
      };
      const colors = Array.isArray(product.color)
        ? product.color
        : [product.color || "yellow"];
      colors.forEach(
        (c) => (stockStatus[product.id].colorsOutOfStock[c] = false),
      );
    }

    const prodStock = stockStatus[product.id];
    const colorsArray = Array.isArray(product.color)
      ? product.color
      : [product.color || "yellow"];

    const colorsHTML = colorsArray
      .map((col) =>
        createColorSVG(col, product.id, prodStock.colorsOutOfStock[col]),
      )
      .join("");

    const productWrapper = document.createElement("div");
    productWrapper.classList.add("a9");
    productWrapper.dataset.id = product.id;

    if (prodStock.isProductOutOfStock) {
      productWrapper.classList.add("out-of-stock-product");
    }

    productWrapper.innerHTML = `
      <div class="a8" style="${prodStock.isProductOutOfStock ? "opacity: 0.5; filter: grayscale(1);" : ""}">
        <div class="a1">
          <input type="checkbox" class="product-out-toggle" id="a3_${product.id}" name="Product" value="${product.id}" ${prodStock.isProductOutOfStock ? "checked" : ""} />
          <div class="a7" style="align-items: center;">
            <label for="a3_${product.id}">
              <img style="width: 90px; height: 90px; border-radius: 10px; align-items: center; margin:20px 0;" src="${product.image}" alt="${product.name}" />
            </label>
          </div>
        </div>
        <div class="a2">
          <h3>${product.name} ${prodStock.isProductOutOfStock ? '<span style="color:red;">(Out of Stock)</span>' : ""}</h3>
          <div class="a4">
            <div class="a5">
              <p>colors</p>
            </div>
            <div class="a6">
              <div class="svg1" style="display: flex; align-items: center;">
                ${colorsHTML}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    container.appendChild(productWrapper);
  });

  attachStockEventListeners(containerSelector);
};

// Event Handler Attachment
const attachStockEventListeners = (containerSelector) => {
  const container = document.querySelector(containerSelector);
  if (!container) return;

  // Toggle Whole Product Out-of-Stock via Checkbox
  container.querySelectorAll(".product-out-toggle").forEach((checkbox) => {
    checkbox.addEventListener("change", (e) => {
      const productId = e.target.value;
      stockStatus[productId].isProductOutOfStock = e.target.checked;
      saveStockStatus();
      renderAdminProducts(containerSelector);
    });
  });

  // Toggle Specific Color Out-of-Stock via SVG Click
  container.querySelectorAll(".color-option").forEach((svg) => {
    svg.addEventListener("click", (e) => {
      const targetSVG = e.currentTarget;
      const productId = targetSVG.dataset.productId;
      const color = targetSVG.dataset.color;

      // Toggle state
      const currentState = stockStatus[productId].colorsOutOfStock[color];
      stockStatus[productId].colorsOutOfStock[color] = !currentState;
      saveStockStatus();

      renderAdminProducts(containerSelector);
    });
  });
};

// --- EXISTING ADMIN CONTROLLER CLASS (UNTOUCHED & EXTENDED) ---

class AdminUIController {
  static init() {
    const isAdminPage =
      document.querySelector(".admin1") ||
      document.querySelector(".admi1") ||
      document.getElementById("orders-list") ||
      document.querySelector(".a9-container");
    if (!isAdminPage) return;

    this.selectedOrderId = null;
    this.bindEvents();
    this.initScheduleControls();
    this.startBackgroundScheduler();
    this.renderOrdersList();

    // Trigger dynamic stock management render
    renderAdminProducts(".a9-container");
  }

  static bindEvents() {
    const exInput =
      document.querySelector(".ad1 .ex") ||
      document.getElementById("extra-charge-input");
    if (exInput) {
      exInput.oninput = (e) => {
        if (!this.selectedOrderId) return;
        const extraVal = Number(e.target.value) || 0;

        const orders = StorageManager.get(STORAGE_KEYS.ORDERS, []);
        const order = orders.find((o) => o.id === this.selectedOrderId);
        if (order) {
          order.adminExtraCharge = extraVal;
          StorageManager.set(STORAGE_KEYS.ORDERS, orders);

          // Dispatch event so active modal and totals sync in real-time
          EventBus.dispatch(EVENTS.ORDER_UPDATED, {
            key: STORAGE_KEYS.ORDERS,
            value: orders,
          });

          this.renderSelectedOrderDetails(order);
        }
      };
    }

    const statusMap = {
      settlement: "SETTLED",
      delivery: "OUT_FOR_DELIVERY",
      package: "COMPLETED",
    };

    Object.keys(statusMap).forEach((btnId) => {
      const btn = document.getElementById(btnId);
      if (btn) {
        btn.onclick = () => {
          if (!this.selectedOrderId)
            return alert("Please select an order first.");

          const orders = StorageManager.get(STORAGE_KEYS.ORDERS, []);
          const order = orders.find((o) => o.id === this.selectedOrderId);
          if (order) {
            const now = new Date();
            const nowIso = now.toISOString();

            order.status = statusMap[btnId];
            order.timestamps = order.timestamps || {};

            // Specific timestamps and pre-fill updates based on button pressed
            if (btnId === "settlement") {
              order.paymentStatus = "PAID";
              order.isCompleted = true;
              order.timestamps.settlement = nowIso;
            } else if (btnId === "delivery") {
              order.timestamps.delivery = nowIso;
              order.scheduledDeliveryTime =
                order.scheduledDeliveryTime || nowIso;
              this.updateDateTimeInputValue("delivery-schedule-input", now);
            } else if (btnId === "package") {
              order.timestamps.package = nowIso;
              order.scheduledPackageTime = order.scheduledPackageTime || nowIso;
              this.updateDateTimeInputValue("package-schedule-input", now);
            }

            StorageManager.set(STORAGE_KEYS.ORDERS, orders);

            // Broadcast update event so other components remain in sync
            EventBus.dispatch(EVENTS.ORDER_UPDATED, {
              key: STORAGE_KEYS.ORDERS,
              value: orders,
            });

            alert(`Order status updated to: ${statusMap[btnId]}`);
            this.renderOrdersList();
          }
        };
      }
    });

    window.addEventListener("storage", (e) => {
      if (e.key === STORAGE_KEYS.ORDERS) {
        this.renderOrdersList();
      }
    });

    EventBus.listen(EVENTS.ORDER_UPDATED, () => this.renderOrdersList());
  }

  // --- INTEGRATED SCHEDULING LOGIC ---

  static formatForDateTimeInput(date) {
    const pad = (n) => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  static updateDateTimeInputValue(inputId, date) {
    const input = document.getElementById(inputId);
    if (input) {
      input.value = this.formatForDateTimeInput(date);
    }
  }

  static initScheduleControls() {
    const deliveryInput = document.getElementById("delivery-schedule-input");
    const packageInput = document.getElementById("package-schedule-input");

    if (deliveryInput) {
      deliveryInput.addEventListener("change", (e) => {
        if (!this.selectedOrderId || !e.target.value) return;
        const scheduledIso = new Date(e.target.value).toISOString();

        const orders = StorageManager.get(STORAGE_KEYS.ORDERS, []);
        const order = orders.find((o) => o.id === this.selectedOrderId);
        if (order) {
          order.scheduledDeliveryTime = scheduledIso;
          StorageManager.set(STORAGE_KEYS.ORDERS, orders);
          EventBus.dispatch(EVENTS.ORDER_UPDATED, {
            key: STORAGE_KEYS.ORDERS,
            value: orders,
          });
        }
      });
    }

    if (packageInput) {
      packageInput.addEventListener("change", (e) => {
        if (!this.selectedOrderId || !e.target.value) return;
        const scheduledIso = new Date(e.target.value).toISOString();

        const orders = StorageManager.get(STORAGE_KEYS.ORDERS, []);
        const order = orders.find((o) => o.id === this.selectedOrderId);
        if (order) {
          order.scheduledPackageTime = scheduledIso;
          StorageManager.set(STORAGE_KEYS.ORDERS, orders);
          EventBus.dispatch(EVENTS.ORDER_UPDATED, {
            key: STORAGE_KEYS.ORDERS,
            value: orders,
          });
        }
      });
    }
  }

  static syncScheduleInputsForSelectedOrder(order) {
    const deliveryInput = document.getElementById("delivery-schedule-input");
    const packageInput = document.getElementById("package-schedule-input");

    if (deliveryInput) {
      deliveryInput.value =
        order && order.scheduledDeliveryTime
          ? this.formatForDateTimeInput(new Date(order.scheduledDeliveryTime))
          : "";
    }
    if (packageInput) {
      packageInput.value =
        order && order.scheduledPackageTime
          ? this.formatForDateTimeInput(new Date(order.scheduledPackageTime))
          : "";
    }
  }

  static startBackgroundScheduler() {
    setInterval(() => {
      const orders = StorageManager.get(STORAGE_KEYS.ORDERS, []);
      if (!orders.length) return;

      const now = new Date();
      let changed = false;

      orders.forEach((order) => {
        // Auto-click OUT_FOR_DELIVERY when delivery date/time arrives
        if (
          order.scheduledDeliveryTime &&
          order.status !== "OUT_FOR_DELIVERY" &&
          order.status !== "COMPLETED"
        ) {
          const target = new Date(order.scheduledDeliveryTime);
          if (now >= target) {
            order.status = "OUT_FOR_DELIVERY";
            order.timestamps = order.timestamps || {};
            order.timestamps.delivery = target.toISOString();
            changed = true;
          }
        }

        // Auto-click COMPLETED when package date/time arrives
        if (order.scheduledPackageTime && order.status !== "COMPLETED") {
          const target = new Date(order.scheduledPackageTime);
          if (now >= target) {
            order.status = "COMPLETED";
            order.timestamps = order.timestamps || {};
            order.timestamps.package = target.toISOString();
            changed = true;
          }
        }
      });

      if (changed) {
        StorageManager.set(STORAGE_KEYS.ORDERS, orders);
        EventBus.dispatch(EVENTS.ORDER_UPDATED, {
          key: STORAGE_KEYS.ORDERS,
          value: orders,
        });
      }
    }, 1000);
  }

  // --- RENDER METHODS ---

  static renderOrdersList() {
    const orders = StorageManager.get(STORAGE_KEYS.ORDERS, []).filter(
      (o) => o.customizationCompleted || o.isCompleted,
    );
    const container =
      document.getElementById("orders-list") ||
      document.querySelector(".admi1");
    if (!container) return;

    if (orders.length === 0) {
      container.innerHTML =
        '<p style="padding:15px; font-size:0.85rem; color:#777;">No active orders found.</p>';
      return;
    }

    if (!this.selectedOrderId && orders.length > 0) {
      this.selectedOrderId = orders[0].id;
    }

    container.innerHTML = orders
      .map(
        (order) => `
            <button class="admi3" type="button" onclick="AdminUIController.selectOrder('${order.id}')" style="width:100%; border:none; text-align:left; cursor:pointer; padding:10px; margin-bottom:6px; border-radius:8px; display:flex; align-items:center; ${this.selectedOrderId === order.id ? "background:#e0e0e0;" : "background:#f9f9f9;"}">
                <div class="admi2" style="width:36px; height:36px; border-radius:50%; overflow:hidden; flex-shrink:0;">
                    <img src="${order.customer.avatar}" alt="avatar" style="width:100%; height:100%; object-fit:cover;">
                </div>
                <div style="margin-left:8px; overflow:hidden;">
                    <h4 style="margin:0; font-size:0.85rem; text-overflow:ellipsis; overflow:hidden; white-space:nowrap;">${order.id}</h4>
                    <span style="font-size:0.72rem; color:#666;">${new Date(order.createdAt).toLocaleDateString()}</span>
                </div>
            </button>
        `,
      )
      .join("");

    if (this.selectedOrderId) {
      const current = orders.find((o) => o.id === this.selectedOrderId);
      if (current) this.renderSelectedOrderDetails(current);
    }
  }

  static selectOrder(orderId) {
    this.selectedOrderId = orderId;
    this.renderOrdersList();
  }

  static renderSelectedOrderDetails(order) {
    // Sync datetime local inputs to match current selected order
    this.syncScheduleInputsForSelectedOrder(order);

    const exInput =
      document.querySelector(".ad1 .ex") ||
      document.getElementById("extra-charge-input");
    if (exInput && document.activeElement !== exInput) {
      exInput.value = order.adminExtraCharge || 0;
    }

    const totals = OrderEngine.calculateTotals(order);

    const adm3 = document.querySelector(".adm3");
    if (adm3) {
      adm3.innerHTML = `
      <div style="display:flex; align-items:center; gap:10px;">
          <div class="adm7" style="width:48px; height:48px; border-radius:50%; overflow:hidden; flex-shrink:0;">
              <img src="${order.customer.avatar}" alt="avatar" style="width:100%; height:100%; object-fit:cover;">
          </div>
          <div>
              <h4 style="margin:0; font-size:1rem;">${order.customer.name}</h4>
              <p style="margin:2px 0 0 0; font-size:0.8rem; color:#666;">${order.customer.email}</p>
          </div>
      </div>
      <div style="margin-top:8px;">
          <span style="background:${order.paymentStatus === "PAID" ? "#28a745" : "#dc3545"}; color:#fff; padding:2px 8px; border-radius:12px; font-size:0.75rem;">${order.paymentStatus}</span>
          <span style="background:#6c757d; color:#fff; padding:2px 8px; border-radius:12px; font-size:0.75rem; margin-left:4px;">STATUS: ${order.status}</span>
          <br>
          ${order.talkToOwnerRequested ? '<span style="background:#007bff; color:#fff; padding:2px 8px; border-radius:12px; font-size:0.75rem; margin-left:4px;">✔ Talk To Owner</span>' : ""}
      </div>
    `;
    }

    const addrText = document.querySelector(".adm4 p");
    if (addrText) {
      const a = order.address || {};
      addrText.innerText = `${a.address1 || "N/A"}, ${a.city || ""}, ${a.state || ""} ${a.zip || ""}, ${a.country || ""}`;
    }

    const itemsContainer = document.querySelector(".adm5");
    if (itemsContainer && order.items) {
      itemsContainer.innerHTML = order.items
        .map(
          (item) => `
          <div class="adm8" style="display:flex; align-items:center; gap:12px; margin-bottom:12px; padding-bottom:8px; border-bottom:1px solid #eee;">
              <img src="${item.image}" alt="${item.name}" style="width:50px; height:50px; object-fit:cover; border-radius:6px;">
              <div class="adm9" style="flex:1;">
                  <h3 style="margin:0; font-size:0.92rem;">${item.name}</h3>
                  <div class="adm11" style="font-size:0.8rem; color:#666; margin-top:2px;">
                      <span>ID: ${item.id}</span> | <span>Qty: ${item.qty}</span> | <span>Size: ${item.size || "N/A"}</span>
                      <div style="display:inline-block; width:10px; height:10px; border-radius:50%; background:${item.color}; margin-left:4px; vertical-align:middle; border:1px solid #ccc;"></div>
                  </div>
                  <p style="margin:2px 0 0 0; font-weight:bold; font-size:0.85rem; color:#b70707;">₹${item.price * item.qty}</p>
              </div>
          </div>
        `,
        )
        .join("");
    }

    const customContainer =
      document.querySelector(".adm10") ||
      document.querySelector(".adm6") ||
      document.getElementById("admin-customization-chat");

    if (customContainer) {
      const history = order.customizationChat || [];
      if (history.length === 0) {
        customContainer.innerHTML =
          '<p style="font-size:0.8rem; color:#777;">No customization notes provided.</p>';
      } else {
        customContainer.innerHTML = (order.items || [])
          .map((item, itemIdx) => {
            const itemHistory = history.filter(
              (c) => (c.itemNumber || 1) === itemIdx + 1,
            );

            const qnaMarkup =
              itemHistory.length > 0
                ? itemHistory
                    .map(
                      (c) => `
                      <div style="margin-bottom:6px; font-size:0.82rem;">
                          <span style="color:#555; font-weight:600;">Q${c.qIndex}: ${c.q}</span><br>
                          <span style="color:#b70707; font-weight:bold; margin-left:8px;">👉 ${c.a}</span>
                      </div>
                    `,
                    )
                    .join("")
                : '<p style="font-size:0.8rem; color:#999; margin: 4px 0;">No customization details recorded for this item.</p>';

            return `
            <div style="border-bottom: 1px solid #eee; padding-bottom: 12px; margin-bottom: 14px;">
              <div style="display:flex; align-items:center; gap:10px; margin-bottom:8px;">
                <div style="width:40px; height:40px; border-radius:6px; overflow:hidden; flex-shrink:0;">
                  <img src="${item.image}" alt="${item.name}" style="width:100%; height:100%; object-fit:cover;">
                </div>
                <div>
                  <h4 style="font-size:0.95rem; margin:0; color:#333;">${item.name}</h4>
                  <div style="font-size:0.8rem; color:#555;">
                    <span>Color: </span>
                    <div style="background-color:${item.color}; display:inline-block; width:12px; height:12px; border-radius:50%; vertical-align:middle; border:1px solid #ccc;"></div>
                    <span style="margin-left:8px;">Size: <strong>${item.size || "Standard"}</strong></span>
                  </div>
                </div>
              </div>
              <h5 style="margin:8px 0 6px 0; font-size:0.85rem; color:#b70707;">Customization Answers:</h5>
              ${qnaMarkup}
            </div>
          `;
          })
          .join("");
      }
    }

    const priceDisplay = document.querySelector(".price");
    if (priceDisplay) priceDisplay.innerText = `₹${totals.subtotal}`;

    const grandTotalDisplay = document.querySelector(".total");
    if (grandTotalDisplay)
      grandTotalDisplay.innerText = `₹${totals.grandTotal}`;
  }
}

// Global DOM Content Loaded Listener
document.addEventListener("DOMContentLoaded", () => {
  AdminUIController.init();
});

window.detectMy_Location = async () => {
  const btn = document.querySelector(".geo-btn");
  try {
    if (btn) btn.innerText = "Detecting location...";
    const pos = await GeoService.getCoordinates();
    const data = await GeoService.reverseGeocode(
      pos.coords.latitude,
      pos.coords.longitude,
    );

    const addr = data.address || {};
    const fieldMap = {
      address1: addr.road || addr.suburb || addr.neighbourhood || "",
      city: addr.city || addr.town || addr.village || "",
      state: addr.state || "",
      zip: addr.postcode || "",
    };

    Object.keys(fieldMap).forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.value = fieldMap[id];
    });

    if (btn) btn.innerHTML = "📍 Location Updated!";
    setTimeout(() => {
      if (btn) btn.innerHTML = "Autofill Current Coordinates";
    }, 3000);
  } catch (err) {
    alert("Location detection failed: " + err.message);
    if (btn) btn.innerText = "Autofill Current Coordinates";
  }
};

window.checkUserLogin = checkUserLogin;
window.OrderEngine = OrderEngine;
window.OrderUIController = OrderUIController;
window.AdminUIController = AdminUIController;
window.StorageManager = StorageManager;
window.EventBus = EventBus;

document.addEventListener("DOMContentLoaded", () => {
  checkUserLogin();
  OrderUIController.init();
  AdminUIController.init();
});
