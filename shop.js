let iconCart = document.querySelector(".icon-cart");
let closeCart = document.querySelector(".close");
let body = document.querySelector("body");
let listProductHTML = document.querySelector(".listProduct");
let listCartHTML = document.querySelector(".listCart");
let iconCartSpan = document.querySelector(".icon-cart span");
let radioCategorize = document.getElementById("categorize");
let radioAll = document.getElementById("all");

let listProducts = [];
let carts = [];

iconCart.addEventListener("click", () => {
  body.classList.toggle("showCart");
});
closeCart.addEventListener("click", () => {
  body.classList.toggle("showCart");
});

if (radioCategorize) {
  radioCategorize.addEventListener("change", () => {
    if (radioCategorize.checked) {
      renderCategorizedProducts();
    }
  });
}

if (radioAll) {
  radioAll.addEventListener("change", () => {
    if (radioAll.checked) {
      addDataToHTML(listProducts);
    }
  });
}

// Reads saved stock status from Admin storage
const getStockStatus = () => {
  return JSON.parse(localStorage.getItem("admin_stock_status") || "{}");
};

const renderShopProducts = (products) => {
  const stockStatus = getStockStatus();
  const shopContainer = document.querySelector(".shop-container"); // Adjust selector as needed
  if (!shopContainer) return;

  shopContainer.innerHTML = products
    .map((product) => {
      const productStock = stockStatus[product.id] || {};

      let colorsArray = Array.isArray(product.color)
        ? product.color
        : [product.color || "yellow"];

      const isMainProductOut = productStock.isProductOutOfStock === true;
      const areAllColorsOut = colorsArray.every(
        (col) => productStock.colorsOutOfStock?.[col] === true,
      );
      const isOutOfStock = isMainProductOut || areAllColorsOut;

      let buttonText = "Add to Cart";
      if (isMainProductOut) {
        buttonText = "Out of Stock";
      } else if (areAllColorsOut) {
        buttonText = "All Colors Out";
      }

      return `
      <div class="product-card ${isOutOfStock ? "out-of-stock" : ""}">
        <img src="${product.image}" alt="${product.name}" />
        <h3>${product.name}</h3>
        <p>₹${product.price}</p>
        
        <button 
          class="add-to-cart-btn" 
          data-id="${product.id}" 
          ${isOutOfStock ? 'disabled style="cursor:not-allowed; opacity:0.5;"' : ""}>
          ${buttonText}
        </button>
      </div>
    `;
    })
    .join("");
};

// Global click delegation check for Add to Cart on shop page
document.addEventListener("click", (e) => {
  if (e.target.classList.contains("add-to-cart-btn")) {
    const productId = e.target.dataset.id;
    const stockStatus = getStockStatus();
    const productStock = stockStatus[productId] || {};

    // Safety guard step
    if (productStock.isProductOutOfStock) {
      alert("This item is currently out of stock.");
      return;
    }

    if (!checkLoginBeforeAction()) return;
    addToCart(productId);
  }
});

// Helper function to check if the user is currently logged in
const checkLoginBeforeAction = () => {
  let currentUser = JSON.parse(localStorage.getItem("currentUser"));
  if (!currentUser || !currentUser.email) {
    alert("Please log in first to perform this action!");
    window.location.href = "login.html";
    return false;
  }
  return true;
};

// Listen for clicks inside the product container (restricted with login check)
listProductHTML.addEventListener("click", (event) => {
  // Check if the click was on the wishlist button or its children
  let wishlistBtn = event.target.closest(".wishlist-btn");
  if (wishlistBtn) {
    // Stop guests from using the wishlist
    if (!checkLoginBeforeAction()) return;

    let productId = wishlistBtn.dataset.id;
    toggleWishlist(productId, wishlistBtn);
    return;
  }

  // Check if the click was on the "Add To Cart" button
  let addCartBtn = event.target.closest(".addCart");
  if (addCartBtn) {
    // Stop guests from adding to cart
    if (!checkLoginBeforeAction()) return;

    let clickedItem = event.target.closest(".item");
    let productId = clickedItem.dataset.id;
    addToCart(productId);
    return;
  }

  // Otherwise, navigate to product detail page if clicking the card/image
  let clickedItem = event.target.closest(".item");
  if (clickedItem) {
    let productId = clickedItem.dataset.id;
    window.location.href = `pro-de.html?id=${productId}`;
  }
});

// Function to display specific array of products with Wishlist hearts
const addDataToHTML = (productsToDisplay) => {
  listProductHTML.innerHTML = "";

  // Get current wishlist items from localStorage to persist red hearts on reload
  let wishlistKey = getUserStorageKey("wishlist");
  let wishlist = JSON.parse(localStorage.getItem(wishlistKey)) || [];
  const stockStatus = getStockStatus();

  if (productsToDisplay.length > 0) {
    productsToDisplay.forEach((product) => {
      let newProduct = document.createElement("div");
      newProduct.classList.add("item");
      newProduct.dataset.id = product.id;

      // Check stock status for button disabling
      const productStock = stockStatus[product.id] || {};
      let colorsArray = Array.isArray(product.color)
        ? product.color
        : [product.color || "yellow"];

      const isMainProductOut = productStock.isProductOutOfStock === true;
      const areAllColorsOut = colorsArray.every(
        (col) => productStock.colorsOutOfStock?.[col] === true,
      );
      const isCartDisabled = isMainProductOut || areAllColorsOut;

      let buttonText = "Add To Cart";
      if (isMainProductOut) {
        buttonText = "Out of Stock";
      } else if (areAllColorsOut) {
        buttonText = "Colors Out of Stock";
      }

      // Check if this product is already liked/in the wishlist
      let isLiked = wishlist.some((item) => item.id == product.id);
      let activeClass = isLiked ? "active" : "";

      newProduct.innerHTML = `
    <!-- Interactive Wishlist Heart Button replacing yellow dot -->
    <button class="wishlist-btn ${activeClass}" data-id="${product.id}">
        <svg viewBox="0 0 24 24">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
        </svg>
    </button>
    <div class="product-img-wrapper" style="position: relative; display: inline-block; width: 100%;">
        <img src="${product.image}" alt="${product.name}" loading="lazy" style="${isMainProductOut ? "opacity: 0.5; filter: grayscale(40%); transition: opacity 0.3s ease;" : ""}">
        ${
          isMainProductOut
            ? `
            <div class="out-of-stock-overlay" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(0, 0, 0, 0.75); color: #ff3333; padding: 6px 14px; font-weight: bold; font-size: 0.9rem; border-radius: 4px; border: 1px solid #ff3333; text-transform: uppercase; letter-spacing: 1px; pointer-events: none; white-space: nowrap; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">
                Out of Stock
            </div>
        `
            : ""
        }
    </div>
    <h2>${product.name}</h2>
    <div class="price">₹${product.price}</div>
    <button class="addCart" ${isCartDisabled ? 'disabled style="cursor:not-allowed; opacity:0.5;"' : ""}>
        ${buttonText}
    </button>
`;
      listProductHTML.appendChild(newProduct);
    });
  }
};

const toggleWishlist = (productId, buttonElement) => {
  buttonElement.classList.toggle("active");

  let wishlistKey = getUserStorageKey("wishlist");
  let wishlist = JSON.parse(localStorage.getItem(wishlistKey)) || [];
  let productIndex = wishlist.findIndex((item) => item.id == productId);

  if (productIndex > -1) {
    wishlist.splice(productIndex, 1);
  } else {
    let productToAdd = listProducts.find((item) => item.id == productId);
    if (productToAdd) {
      wishlist.push(productToAdd);
    }
  }

  localStorage.setItem(wishlistKey, JSON.stringify(wishlist));
};

// Function to filter unique categories and show a random product for each
const renderCategorizedProducts = () => {
  let categoryMap = {};

  listProducts.forEach((product) => {
    if (!categoryMap[product.category]) {
      categoryMap[product.category] = [];
    }
    categoryMap[product.category].push(product);
  });

  let randomCategorizedList = [];

  for (let category in categoryMap) {
    let productsInCat = categoryMap[category];
    let randomIndex = Math.floor(Math.random() * productsInCat.length);
    randomCategorizedList.push(productsInCat[randomIndex]);
  }

  addDataToHTML(randomCategorizedList);
};

const addToCart = (product_id) => {
  let productInfo = listProducts.find((value) => value.id == product_id);
  if (!productInfo) return;

  const stockStatus = getStockStatus();
  const productStock = stockStatus[product_id] || {
    isProductOutOfStock: false,
    colorsOutOfStock: {},
  };

  // Check overall product availability
  if (productStock.isProductOutOfStock) {
    alert("This product is currently out of stock!");
    return;
  }

  let colors = Array.isArray(productInfo.color)
    ? productInfo.color
    : [productInfo.color || "yellow"];

  // Filter out any colors marked as out of stock in local storage
  let availableColors = colors.filter(
    (col) => !productStock.colorsOutOfStock?.[col],
  );

  if (availableColors.length === 0) {
    alert("All color variants for this product are currently out of stock!");
    return;
  }

  // Automatically pick a random color strictly from IN-STOCK variants
  let selectedColor =
    availableColors[Math.floor(Math.random() * availableColors.length)];

  let positionThisProductInCart = carts.findIndex(
    (value) => value.product_id == product_id && value.color == selectedColor,
  );

  if (carts.length <= 0 || positionThisProductInCart < 0) {
    carts.push({
      product_id: product_id,
      color: selectedColor,
      quantity: 1,
    });
  } else {
    carts[positionThisProductInCart].quantity =
      carts[positionThisProductInCart].quantity + 1;
  }
  addCartToHTML();
  addCartToMemory();
};

const addCartToMemory = () => {
  let cartKey = getUserStorageKey("cart");
  localStorage.setItem(cartKey, JSON.stringify(carts));
};

const addCartToHTML = () => {
  listCartHTML.innerHTML = "";
  let totalQuantity = 0;

  if (carts.length > 0) {
    let processedBlouses = new Set();

    carts.forEach((cart) => {
      let positionProduct = listProducts.findIndex(
        (value) => value.id == cart.product_id,
      );
      let info = listProducts[positionProduct];

      if (!info) return;

      let productIdNum = Number(info.id);
      let isBlouseFront = productIdNum >= 81 && productIdNum <= 89;
      let isBlouseBack = productIdNum >= 90 && productIdNum <= 124;

      if (isBlouseFront || isBlouseBack) {
        if (processedBlouses.has(cart.product_id)) return;

        let pairItem = null;
        let pairInfo = null;

        if (isBlouseFront) {
          pairItem = carts.find((c) => {
            let pId = Number(c.product_id);
            return pId >= 90 && pId <= 124 && c.color === cart.color;
          });
        } else {
          pairItem = carts.find((c) => {
            let pId = Number(c.product_id);
            return pId >= 81 && pId <= 89 && c.color === cart.color;
          });
        }

        if (pairItem) {
          let pairPos = listProducts.findIndex((v) => v.id == pairItem.product_id);
          pairInfo = listProducts[pairPos];
          processedBlouses.add(pairItem.product_id);
        }

        processedBlouses.add(cart.product_id);

        let frontImage = isBlouseFront ? info.image : (pairInfo ? pairInfo.image : null);
        let backImage = isBlouseBack ? info.image : (pairInfo ? pairInfo.image : null);

        let frontQty = isBlouseFront ? cart.quantity : (pairItem ? pairItem.quantity : 1);
        let backQty = isBlouseBack ? cart.quantity : (pairItem ? pairItem.quantity : 1);
        let effectiveQty = Math.max(frontQty, backQty);
        totalQuantity += effectiveQty;

        let combinedPrice = (info.price * cart.quantity) + (pairInfo ? pairInfo.price * pairItem.quantity : 0);

        let frontSlotHTML = frontImage
          ? `<img src="${frontImage}" alt="Front" style="width:50%; height:100%; object-fit:cover; border-right:1px solid #ccc;">`
          : `<div style="width:50%; height:100%; display:flex; align-items:center; justify-content:center; background:#eee; color:#888; font-size:9px; border-right:1px solid #ccc;">Missing Front</div>`;

        let backSlotHTML = backImage
          ? `<img src="${backImage}" alt="Back" style="width:50%; height:100%; object-fit:cover;">`
          : `<div style="width:50%; height:100%; display:flex; align-items:center; justify-content:center; background:#eee; color:#888; font-size:9px;">Missing Back</div>`;

        let newCart = document.createElement("div");
        newCart.classList.add("item");
        newCart.dataset.id = cart.product_id;
        newCart.innerHTML = `
            <div class="image" style="display:flex; width:60px; height:60px; overflow:hidden; border:1px solid #ddd; border-radius:4px;">
                ${frontSlotHTML}
                ${backSlotHTML}
            </div>
            <div class="name">
                ${info.name} <small style="display:block; font-size:10px; color:#666;">(Blouse Set)</small>
                <div style="width: 25px; height: 12px; background-color: ${cart.color || "yellow"}; border: 1px solid #ccc; margin-top: 4px; border-radius: 2px;"></div>
            </div>
            <div class="totalPrice">
                ₹${combinedPrice}
            </div>
            <div class="quantity">
                <span class="minus"><</span>
                <span>${effectiveQty}</span>
                <span class="plus">></span>
            </div>
        `;
        listCartHTML.appendChild(newCart);

      } else {
        totalQuantity = totalQuantity + cart.quantity;
        let newCart = document.createElement("div");
        newCart.classList.add("item");
        newCart.dataset.id = cart.product_id;
        newCart.innerHTML = `
            <div class="image">
                <img src="${info.image}" alt="">
            </div>
            <div class="name">
                ${info.name}
                <div style="width: 25px; height: 12px; background-color: ${cart.color || "yellow"}; border: 1px solid #ccc; margin-top: 4px; border-radius: 2px;"></div>
            </div>
            <div class="totalPrice">
                ₹${info.price * cart.quantity}
            </div>
            <div class="quantity">
                <span class="minus"><</span>
                <span>${cart.quantity}</span>
                <span class="plus">></span>
            </div>
        `;
        listCartHTML.appendChild(newCart);
      }
    });
  }
  if (typeof iconCartSpan !== "undefined" && iconCartSpan) {
    iconCartSpan.innerText = totalQuantity;
  }
};

listCartHTML.addEventListener("click", (event) => {
  let positionClick = event.target;
  if (
    positionClick.classList.contains("minus") ||
    positionClick.classList.contains("plus")
  ) {
    let product_id = positionClick.parentElement.parentElement.dataset.id;
    let type = "minus";
    if (positionClick.classList.contains("plus")) {
      type = "plus";
    }
    changeQuantity(product_id, type);
  }
});

const changeQuantity = (product_id, type) => {
  let positionItemInCart = carts.findIndex(
    (value) => value.product_id == product_id,
  );
  if (positionItemInCart >= 0) {
    switch (type) {
      case "plus":
        carts[positionItemInCart].quantity =
          carts[positionItemInCart].quantity + 1;
        break;
      default:
        let valueChange = carts[positionItemInCart].quantity - 1;
        if (valueChange > 0) {
          carts[positionItemInCart].quantity = valueChange;
        } else {
          carts.splice(positionItemInCart, 1);
        }
        break;
    }
  }
  addCartToMemory();
  addCartToHTML();
};

// --- CHECKOUT FUNCTIONALITY WITH INDIVIDUAL SET VALIDATION ---
let checkoutBtn = document.querySelector(".checkOut");

if (checkoutBtn) {
  checkoutBtn.addEventListener("click", (e) => {
    e.preventDefault();

    if (!carts || carts.length === 0) {
      alert("Your cart is empty! Add some items before checking out.");
      return;
    }

    // Group blouse items by color/set
    let blouseSets = {};

    carts.forEach((cartItem) => {
      let pId = Number(cartItem.product_id || cartItem.id);
      let isFront = pId >= 81 && pId <= 89;
      let isBack = pId >= 90 && pId <= 124;

      if (isFront || isBack) {
        let setKey = cartItem.color || "default_blouse";
        if (!blouseSets[setKey]) {
          blouseSets[setKey] = { front: false, back: false, name: "" };
        }

        let product = typeof listProducts !== "undefined" ? listProducts.find((p) => p.id == pId) : null;
        if (product) blouseSets[setKey].name = product.name;

        if (isFront) blouseSets[setKey].front = true;
        if (isBack) blouseSets[setKey].back = true;
      }
    });

    // Verify each individual blouse set contains both Front and Back
    for (let key in blouseSets) {
      let set = blouseSets[key];
      if (set.front && !set.back) {
        alert(`Incomplete Set! You added the Front design for ${set.name || 'a blouse'} (${key}), but you are missing the Back design (ID: 90 to 124).`);
        return;
      }
      if (set.back && !set.front) {
        alert(`Incomplete Set! You added the Back design for ${set.name || 'a blouse'} (${key}), but you are missing the Front design (ID: 81 to 89).`);
        return;
      }
    }

    // 1. Map cart items so they include full product details required by OrderEngine
    const formattedCart = carts.map((cartItem) => {
      const product =
        typeof listProducts !== "undefined" && listProducts.length > 0
          ? listProducts.find(
              (p) => p.id == (cartItem.product_id || cartItem.id),
            )
          : null;

      return {
        id:
          cartItem.id ||
          cartItem.product_id ||
          (product
            ? product.id
            : `PROD-${Math.random().toString(36).substring(2, 7)}`),
        name: cartItem.name || (product ? product.name : "Custom Product"),
        price: Number(cartItem.price || (product ? product.price : 0)),
        color: cartItem.color || "default",
        qty: Number(cartItem.quantity || cartItem.qty || 1),
        image:
          cartItem.image ||
          cartItem.img ||
          (product ? product.image : "saree1.png"),
      };
    });

    // 2. Save under 'app_cart_items' so OrderEngine detects it
    localStorage.setItem("app_cart_items", JSON.stringify(formattedCart));

    // Also save to 'cart' for backward compatibility
    localStorage.setItem("cart", JSON.stringify(carts));

    // 3. Clear active order ID so OrderEngine generates a fresh active order
    localStorage.removeItem("app_active_order_id");

    // 4. Redirect to order page
    window.location.href = "order.html";
  });
}

// --- SEARCH FUNCTIONALITY ---
const initSearch = () => {
  let searchInput = document.querySelector(".pr-search");
  if (!searchInput) return;

  searchInput.addEventListener("input", (e) => {
    let query = e.target.value.toLowerCase().trim();

    // If search is cleared, you can reset or hide the search results container
    if (query === "") {
      let resultsContainer = document.querySelector(
        ".search-results-container",
      );
      if (resultsContainer) resultsContainer.innerHTML = "";
      return;
    }

    // Filter products: matches full name, partial substring, or first letter of the name
    let filteredProducts = listProducts.filter((product) => {
      let name = product.name.toLowerCase();
      let words = name.split(" ");

      // 1. Matches full name or partial substring anywhere
      let matchesSubstring = name.includes(query);

      // 2. Matches the first letter of the name or first letter of any word inside the name
      let matchesFirstLetter = words.some((word) => word.startsWith(query));

      return matchesSubstring || matchesFirstLetter;
    });

    renderSearchResults(filteredProducts);
  });
};

// Helper function to display search results dynamically
const renderSearchResults = (results) => {
  let resultsContainer = document.querySelector(".search-results-container");

  // Create container if it doesn't exist yet
  if (!resultsContainer) {
    resultsContainer = document.createElement("div");
    resultsContainer.classList.add("search-results-container");
    resultsContainer.style.cssText =
      "left: 4%; position: absolute; background: #fff; border: 1px solid #ccc; width: 100%; max-height: 400px; overflow-y: auto; z-index: 1000; box-shadow: 0 4px 6px rgba(0,0,0,0.1);";

    let searchBox = document.querySelector(".search");
    if (searchBox) {
      searchBox.style.position = "relative";
      searchBox.appendChild(resultsContainer);
    } else {
      document.body.appendChild(resultsContainer);
    }
  }

  if (results.length === 0) {
    resultsContainer.innerHTML = `<p style="padding: 10px; margin: 0; color: #777;">No products found</p>`;
    return;
  }

  let html = "";
  results.forEach((product) => {
    html += `
            <a href="pro-de.html?id=${product.id}" style="display: flex; align-items: center; gap: 10px; padding: 10px; text-decoration: none; color: #333; border-bottom: 1px solid #eee;">
                <img src="${product.image}" alt="" style="width: 40px; height: 40px; object-fit: cover; border-radius: 4px;">
                <div>
                    <h4 style="margin: 0; font-size: 0.9rem;">${product.name}</h4>
                    <span style="font-size: 0.8rem; color: #666;">₹${product.price}</span>
                </div>
            </a>
        `;
  });
  resultsContainer.innerHTML = html;
};

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
      carts = [];
      addCartToHTML();

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

// Helper to get a unique storage key based on the logged-in user's email
const getUserStorageKey = (baseKey) => {
  let currentUser = JSON.parse(localStorage.getItem("currentUser"));
  if (currentUser && currentUser.email) {
    return `${baseKey}_${currentUser.email.trim().toLowerCase()}`;
  }
  return `${baseKey}_guest`;
};

const initApp = () => {
  // 1. Check login state and render header first
  checkUserLogin();

  // 2. Fetch products and then load the correct user's cart/wishlist
  fetch("products.json")
    .then((response) => response.json())
    .then((data) => {
      listProducts = data;

      // Load account-specific cart data securely
      let cartKey = getUserStorageKey("cart");
      let savedCart = localStorage.getItem(cartKey);

      if (savedCart) {
        carts = JSON.parse(savedCart);
      } else {
        carts = []; // Empty cart for new/other accounts
      }
      addCartToHTML(); // Refresh cart UI

      // Render products (which will also check account-specific wishlist hearts)
      if (radioCategorize && radioCategorize.checked) {
        renderCategorizedProducts();
      } else {
        addDataToHTML(listProducts);
      }

      initSearch();
    })
    .catch((error) => console.error("Error loading products:", error));
};

initApp();
