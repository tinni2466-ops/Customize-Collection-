let iconCart = document.querySelector(".icon-cart");
let closeCart = document.querySelector(".close");
let body = document.querySelector("body");
let ProductHTML = document.querySelector(".Product");
let listCartHTML = document.querySelector(".listCart");
let iconCartSpan = document.querySelector(".icon-cart span");

let Products = [];
let carts = [];
let selectedColor = ""; // Tracks currently chosen color

// --- ACCOUNT-SPECIFIC STORAGE HELPER ---
const getUserStorageKey = (baseKey) => {
  let currentUser = JSON.parse(localStorage.getItem("currentUser"));
  if (currentUser && currentUser.email) {
    return `${baseKey}_${currentUser.email.trim().toLowerCase()}`;
  }
  return `${baseKey}_guest`;
};

// --- LOGIN CHECK BEFORE ACTION ---
const checkLoginBeforeAction = () => {
  let currentUser = JSON.parse(localStorage.getItem("currentUser"));
  if (!currentUser || !currentUser.email) {
    alert("Please log in first to perform this action!");
    window.location.href = "login.html";
    return false;
  }
  return true;
};

iconCart.addEventListener("click", () => {
  body.classList.toggle("showCart");
});
closeCart.addEventListener("click", () => {
  body.classList.toggle("showCart");
});

// Function to extract the product ID from the URL (e.g., ?id=5)
const getProductIdFromUrl = () => {
  let params = new URLSearchParams(window.location.search);
  return params.get("id");
};

// Helper function to fetch admin stock status from localStorage
const getStockStatus = () => {
  return JSON.parse(localStorage.getItem("admin_stock_status") || "{}");
};

const addDataToHTML = () => {
  ProductHTML.innerHTML = "";
  let productId = getProductIdFromUrl();

  if (Products.length > 0) {
    let product =
      Products.find((value) => value.id == productId) || Products[0];

    // Fetch dynamic stock status for this product
    const stockStatus = getStockStatus();
    const productStock = stockStatus[product.id] || {
      isProductOutOfStock: false,
      colorsOutOfStock: {},
    };

    let colorsArray = Array.isArray(product.color)
      ? product.color
      : [product.color || "yellow"];

    // Auto-select the first AVAILABLE color (prevents auto-selecting an out-of-stock color)
    selectedColor =
      colorsArray.find((col) => !productStock.colorsOutOfStock[col]) || null;

    // Render SVGs with dynamic out-of-stock strikethrough styling
    let colorsHTML = colorsArray
      .map((col) => {
        const isColorOut = productStock.colorsOutOfStock[col] === true;
        const isSelected = col === selectedColor;

        const strokeColor = isSelected
          ? "#000"
          : isColorOut
            ? "#ff0000"
            : "#ccc";
        const strokeWidth = isSelected ? "4" : isColorOut ? "4" : "2";
        const opacity = isColorOut ? "0.3" : "1";
        const cursor = isColorOut ? "not-allowed" : "pointer";

        return `
            <svg width="45" height="45" xmlns="http://www.w3.org/2000/svg" 
                 style="margin-right: 8px; cursor: ${cursor}; opacity: ${opacity}; position: relative;" 
                 class="color-option ${isColorOut ? "disabled-color" : ""}" 
                 data-color="${col}">
                <circle cx="22" cy="22" r="20" stroke="${strokeColor}" stroke-width="${strokeWidth}" fill="${col}" />
                ${
                  isColorOut
                    ? `<line x1="6" y1="6" x2="38" y2="38" stroke="#ff0000" stroke-width="4" />`
                    : ""
                }
            </svg>
        `;
      })
      .join("");

    let newProduct = document.createElement("div");
    newProduct.classList.add("Product");
    newProduct.dataset.id = product.id;

    // Check if this product is in the user's specific wishlist
    let wishlistKey = getUserStorageKey("wishlist");
    let wishlist = JSON.parse(localStorage.getItem(wishlistKey)) || [];
    let isLiked = wishlist.some((item) => item.id == product.id);
    let activeClass = isLiked ? "active" : "";

    // Calculate disabled status for main Add to Cart button
    const isMainProductOut = productStock.isProductOutOfStock;
    const areAllColorsOut = colorsArray.every(
      (col) => productStock.colorsOutOfStock[col] === true,
    );
    const isCartDisabled = isMainProductOut || areAllColorsOut;

    let buttonText = "Add To Cart";
    if (isMainProductOut) {
      buttonText = "Product Out of Stock";
    } else if (areAllColorsOut) {
      buttonText = "All Variants Out of Stock";
    }

    newProduct.innerHTML = `
    <!-- Interactive Wishlist Heart Button -->
    <button class="wishlist-btn ${activeClass}" onclick="handleWishlistClick(${product.id}, this)">
        <svg viewBox="0 0 24 24">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
        </svg>
    </button>
    <div class="item" style="position: relative; display: inline-block; width: 90%;">
        <img src="${product.image}" alt="${product.name}" style="${isMainProductOut ? "opacity: 0.5; filter: grayscale(40%); transition: opacity 0.3s ease;" : ""}">
        ${
          isMainProductOut
            ? `
            <div class="out-of-stock-overlay" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(0, 0, 0, 0.75); color: #ff3333; padding: 8px 16px; font-weight: bold; font-size: 1.1rem; border-radius: 4px; border: 1px solid #ff3333; text-transform: uppercase; letter-spacing: 1px; pointer-events: none; white-space: nowrap; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">
                Out of Stock
            </div>
        `
            : ""
        }
    </div>
    <div class="Product-de">
        <h1>${product.name}</h1>
        <div style="display: flex; justify-content: space-between; align-items: center;">
            <div class="price">₹${product.price}</div>
            <div class="avg-stars-display product-avg-stars" style="display: flex; gap: 4px; align-items: center;">
                <!-- Dynamic Average Stars rendered here opposite price (Visible to everyone) -->
                <span style="color: #ccc;">&#9734;&#9734;&#9734;&#9734;&#9734; (0)</span>
            </div>
        </div>
        <div class="colour">
            <h2>Select Colour</h2>
            <div class="color-picker-container" style="display: flex; align-items: center;">${colorsHTML}</div>
        </div>
        <div class="size">
            <h2>Size</h2>
            <p>(when you purchase our product then will ask you briefly)</p>
        </div>
        <button class="addCart" ${isCartDisabled ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : ""}>${buttonText}</button>
        <div class="description">${product.description || "Lorem ipsum dolor, sit amet consectetur adipisicing elit. Minima, quia!"}</div>
        <div class="rating" style="display: flex; gap: 5px; margin-top: 15px;">
            <h3 style="width: 100%; margin-bottom: 5px;">Rate this product:</h3>
            ${[1, 2, 3, 4, 5].map(() => `<svg width="25" height="25" viewBox="0 0 256 256"><path fill="#444" d="M131.264,252.073c-5.062,0-14.637-2.011-21.904-15.468L92.547,205.47c-5.373-9.954-19.95-19.75-31.198-20.966l-35.176-3.803c-11.466-1.24-19.797-6.747-22.857-15.109c-3.06-8.361-0.25-17.945,7.708-26.292l24.417-25.608c7.804-8.187,12.617-25.08,10.298-36.151l-7.255-34.626c-2.503-11.955,0.875-19.27,4.15-23.301c3.912-4.815,9.72-7.468,16.355-7.468c4.484,0,9.258,1.2,14.189,3.566l31.898,15.307c4.325,2.075,10.501,3.265,16.944,3.265c7.843,0,15.552-1.735,20.621-4.642l30.691-17.6c5.395-3.093,10.668-4.661,15.675-4.661c6.169,0,11.699,2.438,15.573,6.865c3.3,3.772,6.906,10.718,5.343,22.384l-4.7,35.069c-1.502,11.21,4.533,27.706,12.916,35.299l26.225,23.753c8.551,7.744,12.053,17.097,9.611,25.659c-2.438,8.564-10.346,14.665-21.688,16.738l-34.806,6.367c-11.127,2.034-24.947,12.873-29.58,23.19l-14.486,32.282C148.543,245.848,140.468,252.073,131.264,252.073z"/></svg>`).join("")}
        </div>
    </div>
`;
    ProductHTML.appendChild(newProduct);

    // Dynamic click handlers for color swatches with stock restrictions
    document.querySelectorAll(".color-option").forEach((svg) => {
      svg.addEventListener("click", () => {
        const colorVal = svg.dataset.color;

        // Block manual selection of out-of-stock color
        if (productStock.colorsOutOfStock[colorVal]) {
          alert(`The color ${colorVal} is currently out of stock!`);
          return;
        }

        selectedColor = colorVal;
        document.querySelectorAll(".color-option circle").forEach((c) => {
          c.setAttribute("stroke", "#ccc");
          c.setAttribute("stroke-width", "2");
        });
        svg.querySelector("circle").setAttribute("stroke", "#000");
        svg.querySelector("circle").setAttribute("stroke-width", "4");
      });
    });

    renderSimilarAndOtherProducts(product.id, Products);

    let currentProdId = product.id;
    let ratingSvgList = newProduct.querySelectorAll(".rating svg");

    // Retrieve account-specific rating storage key for this specific product
    let userRatingKey = getUserStorageKey(`user_rating_${currentProdId}`);
    let userSelectedRating = localStorage.getItem(userRatingKey) || 0;

    const updateStarVisuals = (rating) => {
      ratingSvgList.forEach((svg, idx) => {
        svg
          .querySelector("path")
          .setAttribute("fill", idx < rating ? "#ffc107" : "#444");
      });
    };
    updateStarVisuals(userSelectedRating);

    const updateAverageStarsDisplay = (targetProdId) => {
      let savedReviews = JSON.parse(localStorage.getItem("ratings") || "{}");
      let productReviews = savedReviews[targetProdId] || [];
      let avgDisplay = newProduct.querySelector(".product-avg-stars");
      if (!avgDisplay) return;

      if (productReviews.length === 0) {
        avgDisplay.innerHTML = `<span style="color: #ccc;">&#9734;&#9734;&#9734;&#9734;&#9734; (0)</span>`;
        return;
      }

      let avg =
        productReviews.reduce((acc, r) => {
          let ratingVal = typeof r === "object" ? r.rating : r;
          return acc + ratingVal;
        }, 0) / productReviews.length;

      avgDisplay.innerHTML = "";
      for (let i = 1; i <= 5; i++) {
        let starColor = i <= Math.round(avg) ? "#ffc107" : "#ccc";
        avgDisplay.innerHTML += `<svg width="20" height="20" viewBox="0 0 256 256"><path fill="${starColor}" d="M131.264,252.073c-5.062,0-14.637-2.011-21.904-15.468L92.547,205.47c-5.373-9.954-19.95-19.75-31.198-20.966l-35.176-3.803c-11.466-1.24-19.797-6.747-22.857-15.109c-3.06-8.361-0.25-17.945,7.708-26.292l24.417-25.608c7.804-8.187,12.617-25.08,10.298-36.151l-7.255-34.626c-2.503-11.955,0.875-19.27,4.15-23.301c3.912-4.815,9.72-7.468,16.355-7.468c4.484,0,9.258,1.2,14.189,3.566l31.898,15.307c4.325,2.075,10.501,3.265,16.944,3.265c7.843,0,15.552-1.735,20.621-4.642l30.691-17.6c5.395-3.093,10.668-4.661,15.675-4.661c6.169,0,11.699,2.438,15.573,6.865c3.3,3.772,6.906,10.718,5.343,22.384l-4.7,35.069c-1.502,11.21,4.533,27.706,12.916,35.299l26.225,23.753c8.551,7.744,12.053,17.097,9.611,25.659c-2.438,8.564-10.346,14.665-21.688,16.738l-34.806,6.367c-11.127,2.034-24.947,12.873-29.58,23.19l-14.486,32.282C148.543,245.848,140.468,252.073,131.264,252.073z"/></svg>`;
      }
      avgDisplay.innerHTML += `<span style="font-size: 0.9rem; color: #666; margin-left: 4px;">(${productReviews.length})</span>`;
    };

    updateAverageStarsDisplay(currentProdId);

    // Rating click action restricted by login check + 1-time per account limit
    ratingSvgList.forEach((svg, index) => {
      svg.style.cursor = "pointer";
      svg.onclick = () => {
        if (!checkLoginBeforeAction()) return;

        let currentKey = getUserStorageKey(`user_rating_${currentProdId}`);
        let existingRating = localStorage.getItem(currentKey);

        if (existingRating && Number(existingRating) > 0) {
          alert("You have already rated this product!");
          return;
        }

        let chosenRating = index + 1;
        let surveyAnswers = [];
        if (chosenRating < 3) {
          let questions = [
            "1. What specifically did you dislike about the quality?",
            "2. Was the pricing expected to be different?",
            "3. Did the color match your expectation?",
            "4. How can we improve this product?",
            "5. Would you consider buying from us again if resolved?",
          ];
          for (let q of questions) {
            let ans = prompt(q);
            if (!ans || ans.trim() === "") {
              alert(
                "All 5 questions must be answered to submit ratings below 3 stars.",
              );
              return;
            }
            surveyAnswers.push(ans);
          }
        }

        let savedReviews = JSON.parse(localStorage.getItem("ratings") || "{}");
        if (!savedReviews[currentProdId]) savedReviews[currentProdId] = [];

        savedReviews[currentProdId].push({
          rating: chosenRating,
          surveyData: surveyAnswers,
          date: new Date().toISOString(),
        });

        localStorage.setItem("ratings", JSON.stringify(savedReviews));
        localStorage.setItem(currentKey, chosenRating);

        updateStarVisuals(chosenRating);
        updateAverageStarsDisplay(currentProdId);
        alert("Thank you for your rating!");
      };
    });

    initCommentSystem(currentProdId);
  }
};

// Wrapper for wishlist action with login check
const handleWishlistClick = (productId, buttonElement) => {
  if (!checkLoginBeforeAction()) return;
  toggleWishlist(productId, buttonElement);
};

const toggleWishlist = (productId, buttonElement) => {
  buttonElement.classList.toggle("active");

  let wishlistKey = getUserStorageKey("wishlist");
  let wishlist = JSON.parse(localStorage.getItem(wishlistKey)) || [];
  let productIndex = wishlist.findIndex((item) => item.id == productId);

  if (productIndex > -1) {
    wishlist.splice(productIndex, 1);
  } else {
    let productToAdd = Products.find((item) => item.id == productId);
    if (productToAdd) {
      wishlist.push(productToAdd);
    }
  }

  localStorage.setItem(wishlistKey, JSON.stringify(wishlist));
};

const renderSimilarAndOtherProducts = (productId, Products) => {
  let currentProduct = Products.find((p) => p.id == productId);

  let moreContainer = document.querySelector(".more");
  if (!moreContainer) {
    moreContainer = document.createElement("div");
    moreContainer.classList.add("more");
    ProductHTML.after(moreContainer);
  }

  moreContainer.innerHTML = "";
  if (!currentProduct) return;

  let currentName = currentProduct.name.toLowerCase();
  let keyword = "";
  const categories = [
    "saree",
    "gown",
    "dress",
    "lehenga",
    "kurti",
    "jumpsuit",
    "peplum",
    "pavadai",
    "sharara",
    "ghagra",
    "choli",
  ];

  for (let cat of categories) {
    if (currentName.includes(cat)) {
      keyword = cat;
      break;
    }
  }

  let similarProducts = Products.filter((product) => {
    let productName = product.name.toLowerCase();
    if (keyword) {
      return product.id != productId && productName.includes(keyword);
    } else {
      let words = currentName.split(" ");
      return (
        product.id != productId &&
        words.some((word) => word.length > 3 && productName.includes(word))
      );
    }
  });

  let otherProducts = Products.filter((product) => product.id != productId);
  otherProducts = otherProducts.sort(() => 0.5 - Math.random()).slice(0, 6);

  let similarHTML = `
        <h2>Similar</h2>
        <div class="similar">
            <span>&lt;</span>
            <div class="proA-container" style="display: flex; gap: 15px; overflow-x: auto;">
    `;

  if (similarProducts.length > 0) {
    similarProducts.forEach((product) => {
      similarHTML += `
                <a href="?id=${product.id}" class="proA">
                    <div class="pro"><img src="${product.image}" alt=""></div>
                    <div class="prona">
                        <h4>${product.name}</h4>
                        <div class="price-tag">₹${product.price}</div>
                    </div>
                </a>
            `;
    });
  } else {
    similarHTML += `<p>No similar products found.</p>`;
  }

  similarHTML += `</div><span>&gt;</span></div>`;

  setTimeout(() => {
    moreContainer.querySelectorAll(".similar, .other").forEach((section) => {
      let container = section.querySelector(".proA-container");
      let arrows = section.querySelectorAll("span");
      if (arrows.length >= 2) {
        arrows[0].onclick = () => {
          container.scrollBy({ left: -200, behavior: "smooth" });
        };
        arrows[1].onclick = () => {
          container.scrollBy({ left: 200, behavior: "smooth" });
        };
      }
    });
  }, 100);

  let otherHTML = `
        <h2>Other</h2>
        <div class="other">
            <span>&lt;</span>
            <div class="proA-container" style="display: flex; gap: 15px; overflow-x: auto;">
    `;

  otherProducts.forEach((product) => {
    otherHTML += `
            <a href="?id=${product.id}" class="proA" style="text-decoration: none; color: inherit;">
                <div class="pro"><img src="${product.image}" alt="" style="object-fit: cover;"></div>
                <div class="prona"><h4>${product.name} <br> ₹${product.price}</h4></div>
            </a>
        `;
  });

  otherHTML += `</div><span>&gt;</span></div>`;
  moreContainer.innerHTML = similarHTML + otherHTML;
};

// Add to cart click event restricted by login check & stock availability checks
body.addEventListener("click", (event) => {
  let positionClick = event.target;
  if (positionClick.classList.contains("addCart")) {
    if (!checkLoginBeforeAction()) return;

    let product_id = positionClick.closest(".Product").dataset.id;
    const stockStatus = getStockStatus();
    const productStock = stockStatus[product_id] || {
      isProductOutOfStock: false,
      colorsOutOfStock: {},
    };

    // Safety checks before allowing item into cart
    if (productStock.isProductOutOfStock) {
      alert("This product is currently out of stock!");
      return;
    }

    if (!selectedColor) {
      alert("Please select an available color variant.");
      return;
    }

    if (productStock.colorsOutOfStock[selectedColor]) {
      alert(`The color ${selectedColor} is out of stock!`);
      return;
    }

    addToCart(product_id, selectedColor);
  }
});

const addToCart = (product_id, color) => {
  let positionThisProductInCart = carts.findIndex(
    (value) => value.product_id == product_id && value.color == color,
  );

  if (carts.length <= 0 || positionThisProductInCart < 0) {
    carts.push({
      product_id: product_id,
      color: color,
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
      let positionProduct = Products.findIndex(
        (value) => value.id == cart.product_id,
      );
      let info = Products[positionProduct];

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
          let pairPos = Products.findIndex((v) => v.id == pairItem.product_id);
          pairInfo = Products[pairPos];
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
                <div style="width: 25px; height: 12px; background-color: ${cart.color}; border: 1px solid #ccc; margin-top: 4px; border-radius: 2px;"></div>
            </div>
            <div class="totalPrice">₹${combinedPrice}</div>
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
            <div class="image"><img src="${info.image}" alt=""></div>
            <div class="name">
                ${info.name}
                <div style="width: 25px; height: 12px; background-color: ${cart.color}; border: 1px solid #ccc; margin-top: 4px; border-radius: 2px;"></div>
            </div>
            <div class="totalPrice">₹${info.price * cart.quantity}</div>
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

// --- RENDER COMMENTS FUNCTION (Visible to everyone) ---
const renderComments = (productId) => {
  let commentSectionContainer = document.querySelector(
    ".comment-display-section",
  );
  if (!commentSectionContainer) return;

  let allComments = JSON.parse(
    localStorage.getItem("product_comments") || "{}",
  );
  let productComments = allComments[productId] || [];

  let html = `<h3 style="margin-bottom: 15px;">Customer Comments (${productComments.length})</h3>`;
  if (productComments.length === 0) {
    html += `<p style="color: #777;">No comments yet. Be the first to share your thoughts!</p>`;
  } else {
    productComments.forEach((c) => {
      html += `
                <div style="display: flex; gap: 12px; margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid #eee; align-items: flex-start;">
                    <img src="${c.profilePic}" alt="avatar" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover; background: #f0f0f0;">
                    <div style="flex-grow: 1;">
                        <div style="display: flex; justify-content: space-between;">
                            <h4 style="margin: 0; font-size: 0.95rem; color: #333;">${c.user}</h4>
                            <span style="font-size: 0.75rem; color: #999;">${c.date}</span>
                        </div>
                        <p style="margin: 5px 0; color: #444; font-size: 0.9rem; word-break: break-word;">${c.text || ""}</p>
                        ${c.image ? `<img src="${c.image}" alt="attachment" style="max-width: 150px; max-height: 150px; border-radius: 6px; margin-top: 8px; display: block; object-fit: cover;">` : ""}
                    </div>
                </div>
            `;
    });
  }
  commentSectionContainer.innerHTML = html;
};

// --- COMMENT & CAMERA SUBMISSION SYSTEM (Restricted behind login) ---
const initCommentSystem = (productId) => {
  let commentInput = document.querySelector(".comment");
  let enterBtn = document.querySelector(".enter");
  let cameraBtn = document.querySelector(".camera");

  let commentSectionContainer = document.querySelector(
    ".comment-display-section",
  );
  if (!commentSectionContainer) {
    commentSectionContainer = document.createElement("div");
    commentSectionContainer.classList.add("comment-display-section");
    commentSectionContainer.style.cssText =
      "margin: 20px auto; max-width: 800px; padding: 10px;";
    let footerEl = document.querySelector("footer");
    if (footerEl) {
      footerEl.before(commentSectionContainer);
    } else {
      let prodEl = document.querySelector(".Product");
      if (prodEl) prodEl.after(commentSectionContainer);
    }
  }

  let attachedImageBase64 = null;

  let fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = "image/*";
  fileInput.style.display = "none";
  document.body.appendChild(fileInput);

  fileInput.onchange = (e) => {
    let file = e.target.files[0];
    if (file) {
      let reader = new FileReader();
      reader.onload = (uploadEvent) => {
        attachedImageBase64 = uploadEvent.target.result;
        alert(
          "Image attached successfully! Now type your comment and hit enter or click send.",
        );
      };
      reader.readAsDataURL(file);
    }
  };

  if (cameraBtn) {
    cameraBtn.style.cursor = "pointer";
    cameraBtn.onclick = (e) => {
      e.preventDefault();
      if (!checkLoginBeforeAction()) return;
      fileInput.click();
    };
  }

  const submitUserComment = () => {
    if (!checkLoginBeforeAction()) return;

    let activeInput = document.querySelector(".comment");
    let text = activeInput ? activeInput.value.trim() : "";
    if (!text && !attachedImageBase64) return;

    let currentUser = JSON.parse(localStorage.getItem("currentUser"));
    let userName = currentUser.name || currentUser.email.split("@")[0];
    let firstLetter = userName.charAt(0).toUpperCase();

    let allComments = JSON.parse(
      localStorage.getItem("product_comments") || "{}",
    );
    if (!allComments[productId]) allComments[productId] = [];

    allComments[productId].push({
      user: userName,
      profilePic: `https://ui-avatars.com/api/?name=${firstLetter}&background=3b50fb&color=fff`,
      text: text,
      image: attachedImageBase64,
      date: new Date().toLocaleDateString(),
    });

    localStorage.setItem("product_comments", JSON.stringify(allComments));
    if (activeInput) activeInput.value = "";
    attachedImageBase64 = null;
    renderComments(productId);
  };

  if (enterBtn) {
    enterBtn.style.cursor = "pointer";
    enterBtn.onclick = (e) => {
      e.preventDefault();
      submitUserComment();
    };
  }

  if (commentInput) {
    commentInput.onkeydown = (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        submitUserComment();
      }
    };
  }

  renderComments(productId);
};

const initApp = () => {
  fetch("products.json")
    .then((response) => response.json())
    .then((data) => {
      Products = data;

      let cartKey = getUserStorageKey("cart");
      let savedCart = localStorage.getItem(cartKey);
      if (savedCart) {
        carts = JSON.parse(savedCart);
      } else {
        carts = [];
      }
      addCartToHTML();

      addDataToHTML();
    });
};

// --- CHECKOUT FUNCTIONALITY (FIXED) ---
let checkoutBtn = document.querySelector(".checkOut");

if (checkoutBtn) {
  checkoutBtn.addEventListener("click", (e) => {
    e.preventDefault();

    // Retrieve active user cart if memory variable is empty
    let cartKey = getUserStorageKey("cart");
    let activeCart =
      carts.length > 0
        ? carts
        : JSON.parse(localStorage.getItem(cartKey)) || [];

    if (!activeCart || activeCart.length === 0) {
      alert("Your cart is empty! Add some items before checking out.");
      return;
    }

    // Check strict Blouse Front and Back pairing requirements
    let hasBlouseFront = activeCart.some((c) => {
      let id = Number(c.product_id || c.id);
      return id >= 81 && id <= 89;
    });

    let hasBlouseBack = activeCart.some((c) => {
      let id = Number(c.product_id || c.id);
      return id >= 90 && id <= 124;
    });

    if (hasBlouseFront && !hasBlouseBack) {
      alert("You have added a Blouse Front. You must also add a Blouse Back (ID: 90 to 124) to complete your order and checkout!");
      return;
    }

    if (hasBlouseBack && !hasBlouseFront) {
      alert("You have added a Blouse Back. You must also add a Blouse Front (ID: 81 to 89) to complete your order and checkout!");
      return;
    }

    // Map cart items with exact details looked up from the loaded 'Products' array
    const formattedCart = activeCart.map((cartItem) => {
      const targetId = cartItem.product_id || cartItem.id;
      const product =
        Products.length > 0 ? Products.find((p) => p.id == targetId) : null;

      return {
        id:
          targetId ||
          (product
            ? product.id
            : `PROD-${Math.random().toString(36).substring(2, 7)}`),
        name: cartItem.name || (product ? product.name : "Product"),
        price: Number(cartItem.price || (product ? product.price : 0)),
        color: cartItem.color || "default",
        qty: Number(cartItem.quantity || cartItem.qty || 1),
        image: cartItem.image || (product ? product.image : "saree1.png"),
      };
    });

    // Save under 'app_cart_items' so OrderEngine reads full image and details
    localStorage.setItem("app_cart_items", JSON.stringify(formattedCart));

    // Save back to user cart key for consistency
    localStorage.setItem(cartKey, JSON.stringify(activeCart));

    // Clear active order ID so OrderEngine generates a fresh active order
    localStorage.removeItem("app_active_order_id");

    // Redirect to order page
    window.location.href = "order.html";
  });
}

initApp();
