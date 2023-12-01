import { query, update, text, StableBTreeMap, Vec, Result, ic, Principal, Canister, Ok, Err, None, Some } from 'azle';
import { DTOs } from './dtos';

const cartStorage = StableBTreeMap(Principal, DTOs.Cart, 1);
const cartItemStorage = StableBTreeMap(Principal, DTOs.CartItem, 2);

export default Canister({

    // Cart methods

    getCarts: query([], Result(Vec(DTOs.Cart), text), () => {
        return Ok(cartStorage.values());
    }),

    getCart: query([Principal], Result(DTOs.Cart, text), (id) => {
        const cartOpt = cartStorage.get(id);
        if ('None' in cartOpt) {
            return Err(`a cart with id=${id} not found`);
        }

        return Ok(cartOpt.Some);
    }),

    createCart: update([], Result(DTOs.Cart, text), () => {
        const cart: typeof DTOs.Cart = {
            id: generateId(),
            cartItems: [],
            totalPrice: 0,
            createdAt: ic.time(),
            updatedAt: None,
        }

        cartStorage.insert(cart.id, cart);

        return Ok(cart);
    }),

    deleteCart: update([Principal], Result(DTOs.Cart, text), (id) => {
        const cartOpt = cartStorage.get(id);
        if ('None' in cartOpt) {
            return Err(`couldn't delete a cart with id=${id}. cart not found.`);
        }

        cartStorage.remove(id);

        const cartItems = cartItemStorage.values().filter(
            (cartItem: typeof DTOs.CartItem) =>
                cartItem.cartId.toText() === id.toText()
        );

        cartItems.forEach((cartItem: typeof DTOs.CartItem) => cartItemStorage.remove(cartItem.id));

        return Ok(cartOpt.Some);
    }),

    // CartItem methods

    addCartItem: update([DTOs.CartItemPayload, Principal], Result(DTOs.CartItem, text), (payload, cartId) => {
        const cartOpt = cartStorage.get(cartId);
        if ('None' in cartOpt) {
            return Err(`a cart with id=${cartId} not found`);
        }

        const cart = cartOpt.Some;

        const cartItem: typeof DTOs.CartItem = {
            id: generateId(),
            cartId: cartId,
            createdAt: ic.time(),
            updatedAt: None,
            ...payload,
        };

        cartItemStorage.insert(cartItem.id, cartItem);

        cart.cartItems.push(cartItem.id);
        cart.updatedAt = Some(ic.time());
        cart.totalPrice = calculateTotalPrice(cart);
        cartStorage.insert(cartId, cart);

        return Ok(cartItem);
    }),

    updateCartItem: update([DTOs.CartItemPayload, Principal], Result(DTOs.CartItem, text), (payload, cartItemId) => {
        const cartItemOpt = cartItemStorage.get(cartItemId);
        if ('None' in cartItemOpt) {
            return Err(`a cart item with id=${cartItemId} not found`);
        }

        const cartItem = cartItemOpt.Some;


        const updatedCartItem: typeof cartItem = {
            ...cartItem,
            updatedAt: Some(ic.time()),
            ...payload,
        };


        cartItemStorage.insert(cartItemId, updatedCartItem);

        const cart = cartStorage.get(cartItem.cartId).Some;
        cart.updatedAt = Some(ic.time());
        cart.totalPrice = calculateTotalPrice(cart);
        cartStorage.insert(cart.id, cart);

        return Ok(updatedCartItem);
    }),

    getCartItems: query([Principal], Result(Vec(DTOs.CartItem), text), (cartId) => {
        const cartOpt = cartStorage.get(cartId);
        if ('None' in cartOpt) {
            return Err(`a cart with id=${cartId} not found`);
        }

        const cart = cartOpt.Some;
        const cartItems = cartItemStorage.values().filter(
            (cartItem: typeof DTOs.CartItem) =>
                cartItem.cartId.toText() === cart.id.toText()
        );

        return Ok(cartItems);
    })
});

function generateId(): Principal {
    const randomBytes = new Array(29)
        .fill(0)
        .map((_) => Math.floor(Math.random() * 256));

    return Principal.fromUint8Array(Uint8Array.from(randomBytes));
};

// a workaround to make uuid package work with Azle
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

function calculateTotalPrice(cart: typeof DTOs.Cart) {

    const cartItems = cartItemStorage.values().filter(
        (cartItem: typeof DTOs.CartItem) =>
            cartItem.cartId.toText() === cart.id.toText()
    );

    let totalPrice = 0;

    cartItems.forEach((cartItem: typeof DTOs.CartItem) => totalPrice += cartItem.price * cartItem.quantity)

    return totalPrice;
};
