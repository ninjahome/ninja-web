// utils.js
function stringToBytes(str) {
    const encoder = new TextEncoder();
    return encoder.encode(str);
}

function bytesToString(bytes) {
    const decoder = new TextDecoder();
    return decoder.decode(bytes);
}

// Constants
const SubAddressLen = 32;
const LightScryptN = 4096;
const LightScryptP = 6;
const ScryptR = 8;
const ScryptDKLen = 32;
const SubAddrPrefix = "NJ";
const WalletVer = 1;
const DBKeyWalletAddr = '__key__address';
const DBKeyAllWallets = '__key__all_wallets__';
