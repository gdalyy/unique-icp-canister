import {
    Record,
    nat64,
    StableBTreeMap,
    float64,
    Opt,
    Vec,
    nat16,
    match,
    Result,
    $query,
    $update,
    ic,
  } from "azle";
  import { v4 as uuidv4 } from "uuid";
  
  // Define the structure for CartItem
  type CartItem = Record<{
    id: string;
    cartId: string;
    name: string;
    price: float64;
    quantity: nat16;
    createdAt: nat64;
    updatedAt: Opt<nat64>;
  }>;
  
  // Define the payload structure for CartItem
  type CartItemPayload = Record<{
    name: string;
    price: float64;
    quantity: nat16;
  }>;
  
  // Define the structure for Cart
  type Cart = Record<{
    id: string;
    cartItems: Vec<string>;
    totalPrice: float64;
    createdAt: nat64;
    updatedAt: Opt<nat64>;
  }>;
  // Define the payload structure for Cart
  type CartPayload = Record<{
    cartItems: Vec<string>;
    totalPrice: float64;
  }>;
  
  // Initialize storage for carts and cart items
  const cartStorage = new StableBTreeMap<string, Cart>(0, 44, 1024);
  const cartItemStorage = new StableBTreeMap<string, CartItem>(1, 44, 1024);
  
  // Get all carts
  $query;
  export function getCarts(): Result<Vec<Cart>, string> {
    try {
      return Result.Ok(cartStorage.values());
    } catch (error: any) {
      return Result.Err(`Failed to retrieve carts: ${error}`);
    }
  }
  
  // Get a cart by ID
  $query;
  export function getCart(id: string): Result<Cart, string> {
    const cartOpt = cartStorage.get(id);
    return match(cartOpt, {
      Some: (cart) => Result.Ok<Cart, string>(cart),
      None: () => Result.Err<Cart, string>(`A cart with ID=${id} not found.`),
    });
  }
  
  // Create a new cart
  $update;
  export function createCart(payload: CartPayload): Result<Cart, string> {
    try {
      // Validate payload properties
      if (!payload.cartItems || payload.cartItems.length === 0 || payload.totalPrice <= 0) {
        return Result.Err<Cart, string>("Invalid payload. Cart must have items and a valid total price.");
      }
      const cart: Cart = {
        id: uuidv4(),
        createdAt: ic.time(),
        updatedAt: Opt.None,
        cartItems: payload.cartItems,
        totalPrice: payload.totalPrice
      };
  
      cartStorage.insert(cart.id, cart);
  
      return Result.Ok<Cart, string>(cart);
    } catch (error: any) {
      return Result.Err<Cart, string>(`Failed to create a new cart: ${error}`);
    }
  }
  
  // Delete a cart
  $update;
  export function deleteCart(id: string): Result<Cart, string> {
    // Validate cart ID
    if (!id || typeof id !== "string") {
      return Result.Err<Cart, string>("Invalid cart ID.");
    }
    const cartOpt = cartStorage.get(id);
  
    return match(cartOpt, {
      Some: (cart) => {
        // Remove the cart and associated cart items
        cartStorage.remove(id);
  
        const cartItems = cartItemStorage.values().filter(
          (cartItem) =>
            cartItem.cartId === id
        );
  
        cartItems.forEach((cartItem) => cartItemStorage.remove(cartItem.id));
  
        return Result.Ok<Cart, string>(cart);
      },
      None: () => Result.Err<Cart, string>(`Failed to delete cart with ID=${id}. Cart not found.`),
    });
  }
  
  // Add a cart item to a cart
  $update;
  export function addCartItem(payload: CartItemPayload, cartId: string): Result<CartItem, string> {
    // Validate cart ID
    if (!cartId || typeof cartId !== "string") {
      return Result.Err<CartItem, string>("Invalid cart ID.");
    }
    // Validate payload properties
    if (!payload.name || payload.price <= 0 || payload.quantity <= 0) {
      return Result.Err<CartItem, string>("Invalid payload. Cart item must have a name, a valid price, and a valid quantity.");
    }
  
    const cartOpt = cartStorage.get(cartId);
  
    return match(cartOpt, {
      Some: (cart) => {
        const cartItem: CartItem = {
          id: uuidv4(),
          cartId: cartId,
          createdAt: ic.time(),
          updatedAt: Opt.None,
          ...payload,
        };
  
        cartItemStorage.insert(cartItem.id, cartItem);
  
        cart.cartItems.push(cartItem.id);
        cart.updatedAt = Opt.Some(ic.time());
        cart.totalPrice = calculateTotalPrice(cart);
        cartStorage.insert(cartId, cart);
  
        return Result.Ok<CartItem, string>(cartItem);
      },
      None: () => Result.Err<CartItem, string>(`Failed to add cart item. Cart with ID=${cartId} not found.`),
    });
  }
  
  // Update a cart item in a cart
  $update;
  export function updateCartItem(payload: CartItemPayload, cartItemId: string): Result<CartItem, string> {
    // Validate payload properties
    if (!payload.name || payload.price <= 0 || payload.quantity <= 0) {
      return Result.Err<CartItem, string>("Invalid payload. Cart item must have a name, a valid price, and a valid quantity.");
    }
  
    // Validate cart item ID
    if (!cartItemId || typeof cartItemId !== "string") {
      return Result.Err<CartItem, string>("Invalid cart item ID.");
    }
    const cartItemOpt = cartItemStorage.get(cartItemId);
  
    return match(cartItemOpt, {
      Some: (cartItem) => {
        const updatedCartItem: CartItem = {
          ...cartItem,
          updatedAt: Opt.Some(ic.time()),
          ...payload,
        };
  
        cartItemStorage.insert(cartItemId, updatedCartItem);
  
        const cartOpt = cartStorage.get(cartItem.cartId);
  
        return match(cartOpt, {
          Some: (cart) => {
            cart.updatedAt = Opt.Some(ic.time());
            cart.totalPrice = calculateTotalPrice(cart);
            cartStorage.insert(cart.id, cart);
            return Result.Ok<CartItem, string>(updatedCartItem);
          },
          None: () => Result.Err<CartItem, string>(`Failed to update cart item. Cart with ID=${cartItem.cartId} not found.`),
        });
      },
      None: () => Result.Err<CartItem, string>(`Failed to update cart item. Cart item with ID=${cartItemId} not found.`),
    });
  }
  
  // Get all cart items in a cart
  $query;
  export function getCartItems(cartId: string): Result<Vec<CartItem>, string> {
    // Validate cart ID
    if (!cartId || typeof cartId !== "string") {
      return Result.Err<Vec<CartItem>, string>("Invalid cart ID.");
    }
    
    const cartOpt = cartStorage.get(cartId);
  
    return match(cartOpt, {
      Some: (cart) => {
        const cartItems = cartItemStorage.values().filter(
          (cartItem: CartItem) =>
            cartItem.cartId === cart.id
        );
  
        return Result.Ok<Vec<CartItem>, string>(cartItems);
      },
      None: () => Result.Err<Vec<CartItem>, string>(`Failed to retrieve cart items. Cart with ID=${cartId} not found.`),
    });
  }
  
  // Workaround to make uuid package work with Azle
  globalThis.crypto = {
    // @ts-ignore
    getRandomValues: () => {
      let array = new Uint8Array(32);
  
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
  
      return array;
    }
  };
  
  // Function to calculate total price for a cart
  function calculateTotalPrice(cart: Cart) {
  
    const cartItems = cartItemStorage.values().filter(
      (cartItem: CartItem) =>
        cartItem.cartId === cart.id
    );
  
    let totalPrice = 0;
  
    cartItems.forEach((cartItem: CartItem) => totalPrice += cartItem.price * cartItem.quantity)
  
    return totalPrice;
  }
  