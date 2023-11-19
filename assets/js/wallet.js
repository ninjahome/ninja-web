// wallet.js
class AllLocalWallet {
    constructor(data = { addresses: [] }) {
        this.createTime = new Date();
        this.addresses = data.addresses || [];
    }

    addWallet(address) {
        this.addresses.push(address);
        this.saveToLocalStorage();
    }

    getWallets() {
        return this.addresses;
    }

    saveToLocalStorage() {
        const dataToStore = JSON.stringify(this);
        localStorage.setItem(DBKeyAllWallets, dataToStore);
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
        this.Address = address;
        this.Crypto = crypto;
        this.ID = id;
        this.Version = version;
    }
}

async function newWallet(password) {
    try {
        const key = generateNewLightSubKey();
        console.log("raw key:", key.toString());

        const passwordBytes = stringToBytes(password);
        const cryptoStruct = await encryptData(key.privateKey, passwordBytes);
        const encryptedKeyJSON = new EncryptedKeyJSON(
            key.AddrStr(),
            cryptoStruct,
            key.ID,
            WalletVer);
        const jsonString = JSON.stringify(encryptedKeyJSON, null, '\t');
        localStorage.setItem(DBKeyWalletAddr+key.AddrStr(), jsonString);
        const allWallets = loadOrCreateWallet();
        allWallets.addWallet(key.AddrStr())
        return jsonString
    } catch (error) {
        console.error("Error:", error);
        throw error;
    }
}