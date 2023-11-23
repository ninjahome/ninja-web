// wallet.js
class AllLocalWallet {
    constructor(data = {addresses: []}) {
        this.addresses = data.addresses || [];
    }

    addWallet(address) {
        if (!this.has(address)) {
            this.addresses.push(address);
            this.saveToLocalStorage();
            return true; // 表示地址成功添加
        } else {
            return false; // 表示地址已存在
        }
    }

    removeWallet(address) {
        const index = this.addresses.indexOf(address);
        if (index !== -1) {
            this.addresses.splice(index, 1);
            this.saveToLocalStorage();
            return true; // 表示地址成功删除
        } else {
            return false; // 表示地址不存在
        }
    }

    clearWallets() {
        this.addresses = [];
        this.saveToLocalStorage();
    }

    getWallets() {
        return this.addresses;
    }
    has(address) {
        return this.addresses.includes(address);
    }
    saveToLocalStorage() {
        localStorage.setItem(DBKeyAllWallets, JSON.stringify(this));
    }
}

function loadOrCreateWallet() {
    const storedWalletString = localStorage.getItem(DBKeyAllWallets);

    let allWallets;
    if (storedWalletString) {
        const storedWalletData = JSON.parse(storedWalletString);
        allWallets = new AllLocalWallet(storedWalletData);
    } else {
        allWallets = new AllLocalWallet();
    }

    return allWallets;
}


class EncryptedKeyJSON {
    constructor(address, crypto, id, version) {
        this.address = address;
        this.crypto = crypto;
        this.id = id;
        this.version = version;
    }
}

function addNewKeyItem(encryptedKeyJSON) {
    const jsonString = JSON.stringify(encryptedKeyJSON, null, '\t');
    localStorage.setItem(DBKeyWalletAddr + encryptedKeyJSON.address, jsonString);
    const allWallets = loadOrCreateWallet();
    allWallets.addWallet(encryptedKeyJSON.address)
}

function  removeKeyItem(address){
    const allWallets = loadOrCreateWallet();
    allWallets.removeWallet(address);
    localStorage.removeItem(DBKeyWalletAddr + address);
}

async function newWallet(password) {
    try {
        const key = generateNewLightSubKey();
        const passwordBytes = stringToBytes(password);
        const cryptoStruct = await encryptData(key.privateKey, passwordBytes);
        const encryptedKeyJSON = new EncryptedKeyJSON(
            key.AddrStr(),
            cryptoStruct,
            key.id,
            WalletVer);
        addNewKeyItem(encryptedKeyJSON);
        return encryptedKeyJSON;
    } catch (error) {
        console.error("Error:", error);
        throw error;
    }
}

async function getEncryptedKeyJSON(keyString, password) {
    if (!keyString) {
        throw new Error("Key not found for wallet address:" + keyString);
    }
    const keyData = JSON.parse(keyString);
    // 检查 keyData 是否包含必要的属性
    if (!keyData.address || !keyData.crypto || !keyData.id || !keyData.version) {
        throw new Error("Invalid key data");
    }

    const cryptoStruct = new CryptoStruct(
        keyData.crypto.cipher,
        keyData.crypto.ciphertext,
        keyData.crypto.cipherParams,
        keyData.crypto.kdf,
        keyData.crypto.kdfParams,
        keyData.crypto.mac
    );
    const privateKey = await decryptData(cryptoStruct, password);

    if (!privateKey) {
        throw new Error("Failed to decrypt private key for wallet:" + keyString);
    }

    return new LightSubKey(true, keyData.id, keyData.address, privateKey);
}