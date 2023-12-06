class IndexedDBManager {

    constructor(databaseName, version) {
        this.databaseName = databaseName;
        this.version = version;
        this.db = null;
    }

    static get WALLET_TABLE_NAME() {
        return 'wallets';
    }

    static get CONTACT_TABLE_NAME() {
        return 'contacts';
    }

    static get META_TABLE_NAME() {
        return 'metas';
    }

    static get MSG_TIP_TABLE_NAME() {
        return 'msgTips';
    }

    static get MESSAGE_TABLE_NAME() {
        return 'message';
    }

    initWalletTable(db) {
        if (!db.objectStoreNames.contains(IndexedDBManager.WALLET_TABLE_NAME)) {
            const walletStore = db.createObjectStore(IndexedDBManager.WALLET_TABLE_NAME, {keyPath: 'address'});
            walletStore.createIndex('addressIndex', 'address', {unique: true});
            walletStore.createIndex('jsonStrIndex', 'jsonStr', {unique: false});
            walletStore.createIndex('atTimeIndex', 'atTime', {unique: false});
        }
    }

    initMetaTable(db) {
        if (!db.objectStoreNames.contains(IndexedDBManager.META_TABLE_NAME)) {
            const walletStore = db.createObjectStore(IndexedDBManager.META_TABLE_NAME, {keyPath: 'address'});
            walletStore.createIndex('addressIndex', 'address', {unique: true});
            walletStore.createIndex('nonceIndex', 'nonce', {unique: false});
            walletStore.createIndex('nameIndex', 'name', {unique: false});
            walletStore.createIndex('avatarBase64Index', 'avatarBase64', {unique: false});
            walletStore.createIndex('balanceIndex', 'balance', {unique: false});
            walletStore.createIndex('updateTimeIndex', 'updateTime', {unique: false});
            walletStore.createIndex('ethBalanceIndex', 'ethBalance', {unique: false});
            walletStore.createIndex('usdtBalanceIndex', 'usdtBalance', {unique: false});
        }
    }

    initContactTable(db) {
        if (!db.objectStoreNames.contains(IndexedDBManager.CONTACT_TABLE_NAME)) {
            const walletStore = db.createObjectStore(IndexedDBManager.CONTACT_TABLE_NAME, {keyPath: 'address'});
            walletStore.createIndex('addressIndex', 'address', {unique: true});
            walletStore.createIndex('aliasIndex', 'alias', {unique: false});
            walletStore.createIndex('remarkIndex', 'remark', {unique: false});
        }
    }

    initMsgTipTable(db) {
        if (!db.objectStoreNames.contains(IndexedDBManager.MSG_TIP_TABLE_NAME)) {
            const walletStore = db.createObjectStore(IndexedDBManager.MSG_TIP_TABLE_NAME, {keyPath: 'address'});
            walletStore.createIndex('addressIndex', 'address', {unique: true});
            walletStore.createIndex('timeIndex', 'time', {unique: false});
            walletStore.createIndex('descriptionIndex', 'description', {unique: false});
        }
    }

    initMsgItemTable(db) {
        if (!db.objectStoreNames.contains(IndexedDBManager.MESSAGE_TABLE_NAME)) {
            const walletStore = db.createObjectStore(IndexedDBManager.MESSAGE_TABLE_NAME, {keyPath: 'msgId'});
            walletStore.createIndex('addressIndex', 'address', {unique: true});
            walletStore.createIndex('msgIdIndex', 'msgId', {unique: false});
            walletStore.createIndex('payloadIndex', 'payload', {unique: false});
        }
    }

    openDatabase() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.databaseName, this.version);

            request.onupgradeneeded = event => {
                const db = event.target.result;
                const oldVersion = event.oldVersion;
                const newVersion = event.newVersion;
                if (oldVersion < 1) {
                    // 数据库版本为 1 时的迁移逻辑
                    this.initWalletTable(db);
                    this.initMetaTable(db);
                    this.initContactTable(db);
                    this.initMsgTipTable(db);
                    this.initMsgItemTable(db);
                }
                if (oldVersion < 2) {

                }
            };

            request.onsuccess = event => {
                this.db = event.target.result;
                resolve();
            };

            request.onerror = event => {
                reject(`Error opening database: ${event.target.error}`);
            };
        });
    }

    closeDatabase() {
        if (this.db) {
            this.db.close();
            this.db = null;
        }
    }

    addData(storeName, data) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const objectStore = transaction.objectStore(storeName);
            const request = objectStore.add(data);

            request.onsuccess = () => {
                resolve(`Data added to ${storeName} successfully`);
            };

            request.onerror = event => {
                reject(`Error adding data to ${storeName}: ${event.target.error}`);
            };
        });
    }

    getData(storeName, id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const objectStore = transaction.objectStore(storeName);

            const request = objectStore.get(id);

            request.onsuccess = event => {
                const result = event.target.result;
                if (result) {
                    resolve(result);
                } else {
                    resolve(null);
                }
            };

            request.onerror = event => {
                reject(`Error getting data from ${storeName}: ${event.target.error}`);
            };
        });
    }

    updateData(storeName, id, newData) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const objectStore = transaction.objectStore(storeName);

            const request = objectStore.put({...newData, id});

            request.onsuccess = () => {
                resolve(`Data updated in ${storeName} successfully`);
            };

            request.onerror = event => {
                reject(`Error updating data in ${storeName}: ${event.target.error}`);
            };
        });
    }

    deleteData(storeName, id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const objectStore = transaction.objectStore(storeName);

            const request = objectStore.delete(id);

            request.onsuccess = () => {
                resolve(`Data deleted from ${storeName} successfully`);
            };

            request.onerror = event => {
                reject(`Error deleting data from ${storeName}: ${event.target.error}`);
            };
        });
    }

    // 查询某个 storeName 下的所有数据
    getAllData(storeName) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const objectStore = transaction.objectStore(storeName);
            const request = objectStore.getAll();

            request.onsuccess = event => {
                const data = event.target.result;
                resolve(data);
            };

            request.onerror = event => {
                reject(`Error getting all data from ${storeName}: ${event.target.error}`);
            };
        });
    }

    // 查询某个 storeName 下符合条件的所有数据
    queryData(storeName, conditionFn) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const objectStore = transaction.objectStore(storeName);
            const request = objectStore.openCursor();

            const results = [];

            request.onsuccess = event => {
                const cursor = event.target.result;
                if (cursor) {
                    const data = cursor.value;
                    if (conditionFn(data)) {
                        results.push(data);
                    }
                    cursor.continue();
                } else {
                    resolve(results);
                }
            };

            request.onerror = event => {
                reject(`Error querying data from ${storeName}: ${event.target.error}`);
            };
        });
    }
}

// Example Usage:
const dbManager = new IndexedDBManager('ninja-protocol', 1);

// dbManager.openDatabase().then(() => {
//     console.log("index db open success");
// })
//     const dataToAddToTable1 = { name: 'John Doe', age: 30 };
//     dbManager.addData('table1', dataToAddToTable1)
//         .then(result => console.log(result))
//         .catch(error => console.error(error));
//
//     const idToGetFromTable1 = 1;
//     dbManager.getData('table1', idToGetFromTable1)
//         .then(result => console.log(result))
//         .catch(error => console.error(error));
//
//     const idToUpdateInTable1 = 1;
//     const newDataForTable1 = { name: 'Updated Name', age: 31 };
//     dbManager.updateData('table1', idToUpdateInTable1, newDataForTable1)
//         .then(result => console.log(result))
//         .catch(error => console.error(error));
//
//     const idToDeleteFromTable1 = 1;
//     dbManager.deleteData('table1', idToDeleteFromTable1)
//         .then(result => console.log(result))
//         .catch(error => console.error(error));
// });

// dbManager.openDatabase().then(async () => {
//     // 查询某个 storeName 下符合条件的所有数据
//     const resultsWithCondition = await dbManager.queryData('wallets', data => data.isMain);
//
//     console.log('Results with condition:', resultsWithCondition);
//
//     // 查询某个 storeName 下的所有数据
//     const allData = await dbManager.getAllData('wallets');
//
//     console.log('All data:', allData);
// });