import { Record, Principal, text, nat64, float64, Opt, Vec, nat16 } from "azle";

const CartItem = Record({
    id: Principal,
    cartId: Principal,
    name: text,
    price: float64,
    quantity: nat16,
    createdAt: nat64,
    updatedAt: Opt(nat64)
});

const CartItemPayload = Record({
    name: text,
    price: float64,
    quantity: nat16,
});

const Cart = Record({
    id: Principal,
    cartItems: Vec(Principal),
    totalPrice: float64,
    createdAt: nat64,
    updatedAt: Opt(nat64)
});

export const DTOs = {
    Cart: Cart,
    CartItem: CartItem,
    CartItemPayload: CartItemPayload
};