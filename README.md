### IC : TypeScript Smart Contract 101 Challenge
## Description
ICP Canister for managing a Shopping Cart. 
Available methods :
- getCarts
- getCart
- createCart
- deleteCart
- addCartItem
- updateCartItem
- getCartItems

## Prerequisities
- Make sure you have node v18 installed 
    * `curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.3/install.sh | bash`
    * `nvm use 18`
- Install DFX CLI 
    * `DFX_VERSION=0.14.1 sh -ci "$(curl -fsSL https://sdk.dfinity.org/install.sh)"`
    * `echo 'export PATH="$PATH:$HOME/bin"' >> "$HOME/.bashrc"`
- Clone the project 
    * `git clone https://github.com/gdalyy/unique-icp-canister`
- Run the Canister
    * `dfx start --background`
    * `dfx deploy`

## Usage
To interact with the Canister :
- you can use the **Candid UI** accesible via 
    * `http://127.0.0.1:{port}/?canisterId={canisterID}` (copy from `dfx deploy` command output`)
- use DFX CLI 
    * example 1 : Create Cart : `dfx canister call shopping_cart createCart`
    * example 2 : Create CartItem : `dfx canister call shopping_cart addCartItem '(record {name="Product 1"; quantity=10; price=1.0}, principal "{cartId}")'`