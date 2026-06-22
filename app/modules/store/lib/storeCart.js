// =====================================
// LIB: storeCart
// Descripción: Helpers del carrito público de Tags Tienda.
// =====================================

const CART_KEY =
    "tags_store_cart";

function getBrowserCart() {
    if (typeof window === "undefined") {
        return [];
    }

    try {
        return JSON.parse(
            localStorage.getItem(CART_KEY) || "[]"
        );
    } catch {
        return [];
    }
}

function saveBrowserCart(items) {
    if (typeof window === "undefined") {
        return;
    }

    localStorage.setItem(
        CART_KEY,
        JSON.stringify(items || [])
    );

    window.dispatchEvent(
        new Event("tags_store_cart_updated")
    );
}

export function getCartItems() {
    return getBrowserCart();
}

export function setCartItems(items) {
    saveBrowserCart(items);
}

export function clearCart() {
    saveBrowserCart([]);
}

export function getCartCount(items = null) {
    const cartItems =
        items || getBrowserCart();

    return cartItems.reduce(
        (total, item) =>
            total + Number(item.quantity || 0),
        0
    );
}

export function getCartTotal(items = null) {
    const cartItems =
        items || getBrowserCart();

    return cartItems.reduce(
        (total, item) =>
            total + Number(item.total_price || 0),
        0
    );
}

export function addCartItem(item) {
    const cart =
        getBrowserCart();

    const existingIndex =
        cart.findIndex(cartItem =>
            Number(cartItem.product_id) === Number(item.product_id) &&
            String(cartItem.variant_id || "") === String(item.variant_id || "")
        );

    if (existingIndex >= 0) {
        cart[existingIndex] = {
            ...cart[existingIndex],
            quantity:
                Number(cart[existingIndex].quantity || 0) +
                Number(item.quantity || 1),
            total_price:
                (
                    Number(cart[existingIndex].quantity || 0) +
                    Number(item.quantity || 1)
                ) * Number(item.unit_price || 0)
        };
    } else {
        cart.push(item);
    }

    saveBrowserCart(cart);

    return cart;
}

export function updateCartItemQuantity(index, quantity) {
    const cart =
        getBrowserCart();

    if (!cart[index]) {
        return cart;
    }

    const nextQuantity =
        Math.max(1, Number(quantity || 1));

    cart[index] = {
        ...cart[index],
        quantity: nextQuantity,
        total_price:
            nextQuantity * Number(cart[index].unit_price || 0)
    };

    saveBrowserCart(cart);

    return cart;
}

export function removeCartItem(index) {
    const cart =
        getBrowserCart()
            .filter((_, itemIndex) =>
                itemIndex !== index
            );

    saveBrowserCart(cart);

    return cart;
}