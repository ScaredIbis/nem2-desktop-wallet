import {Message} from "@/config/index.ts";
import {market} from "@/core/api/logicApi.ts";
import {KlineQuery} from "@/core/query/klineQuery.ts";
import {Address, Alias, MosaicId, NamespaceHttp, NamespaceId} from 'nem2-sdk';
import {MosaicApiRxjs} from '@/core/api/MosaicApiRxjs.ts';
import {AccountApiRxjs} from '@/core/api/AccountApiRxjs.ts';
import {Component, Vue, Watch} from 'vue-property-decorator';
import monitorSeleted from '@/common/img/monitor/monitorSeleted.png';
import monitorUnselected from '@/common/img/monitor/monitorUnselected.png';
import {getNamespaces, setWalletMosaic, getMosaicList, getMosaicInfoList} from "@/core/utils/wallet.ts";
import {copyTxt, localSave, formatXEMamount} from '@/core/utils/utils.ts';
import {mapState} from "vuex";

@Component({
    computed: {
        ...mapState({
            activeAccount: 'account',
            app: 'app',
        })
    }
})
export class MonitorPanelTs extends Vue {
    app: any;
    activeAccount: any;
    XEMamount = 0;
    mosaic: string;
    mosaicName = '';
    currentPrice = 0;
    isLoadingMosaic = true;
    localMosaicMap: any = {};
    isShowAccountInfo = true;
    isShowAccountAlias = false;
    isShowManageMosaicIcon = false;
    monitorSeleted = monitorSeleted;
    monitorUnselected = monitorUnselected;
    navigatorList: any = [
        {
            name: 'dash_board',
            isSelect: true,
            path: 'dashBoard'
        },
        {
            name: 'transfer',
            isSelect: false,
            path: 'transfer'
        },
        {
            name: 'receive',
            isSelect: false,
            path: 'receipt'
        },

        {
            name: 'remote',
            isSelect: false,
            path: 'remote',
        },
        {
            name: 'market',
            isSelect: false,
            path: 'market'
        },
    ];

    mosaicMap: any = {
        aabby: {
            name: 'nem.xem',
            hex: 'nem.xem',
            amount: 0.265874,
            show: true,
            showInManage: true
        }
    };

    get getWallet() {
        return this.$store.state.account.wallet;
    }

    get getWalletList() {
        return this.$store.state.app.walletList || [];
    }


    get confirmedTxList() {
        return this.$store.state.account.ConfirmedTx;
    }


    get accountPublicKey() {
        return this.activeAccount.wallet.publicKey;
    }

    get accountAddress() {
        return this.activeAccount.wallet.address;
    }

    get address() {
        return this.activeAccount.wallet.address;
    }

    get node() {
        return this.activeAccount.node;
    }

    get currentXem() {
        return this.activeAccount.currentXem;
    }


    get currentXEM2() {
        return this.activeAccount.currentXEM2;
    }


    get currentXEM1() {
        return this.activeAccount.currentXEM1;
    }

    get namespaceList() {
        return this.activeAccount.namespace
    }

    switchPanel(index) {
        if (this.navigatorList[index].disabled) {
            return;
        }
        const list = this.navigatorList.map((item) => {
            item.isSelect = false;
            return item;
        });
        list[index].isSelect = true;
        this.navigatorList = list;
        this.$router.push({
            name: list[index].path
        });
    }

    hideAssetInfo() {
        this.isShowAccountInfo = false;
    }

    manageMosaicList() {
        this.isShowManageMosaicIcon = !this.isShowManageMosaicIcon;
    }

    copyAddress() {
        const that = this;
        copyTxt(this.address).then(() => {
            that.$Notice.success(
                {
                    title: this.$t(Message.COPY_SUCCESS) + ''
                }
            );
        });
    }

    initData() {
        this.$store.commit('SET_CURRENT_PANEL_INDEX', 0);
    }

    getXEMAmount() {
        const that = this;
        const {node, currentXEM1, currentXEM2} = this;
        setWalletMosaic(this.getWallet, node, currentXEM1, currentXEM2)
            .then((wallet) => {
                that.XEMamount = wallet.balance;
            });
    }

    getMyNamespaces() {
        getNamespaces(this.getWallet.address, this.node)
            .then((list) => {
                this.$store.commit('SET_NAMESPACE', list);
            });
    }

    showMosaicMap() {
        this.isShowManageMosaicIcon = !this.isShowManageMosaicIcon;
        this.mosaicMap = this.localMosaicMap;
    }

    toggleShowMosaic(key, value) {
        if (!this.localMosaicMap[key]) {
            this.localMosaicMap[key] = value;
        }
        this.localMosaicMap[key].show = !this.localMosaicMap[key].show;
        this.saveMosaicRecordInLocal();
    }

    saveMosaicRecordInLocal() {
        // save address
        this.isLoadingMosaic = false;
        localSave(this.accountAddress, JSON.stringify(this.localMosaicMap));
    }

    getAccountsName() {
        const that = this;
        const {accountAddress, node} = this;
        if (!accountAddress || accountAddress.length < 40) return;
        new AccountApiRxjs().getAccountsNames([Address.createFromRawAddress(accountAddress)], node).subscribe((namespaceInfo) => {
            if (namespaceInfo[0].names.length > 0) {
                that.isShowAccountAlias = true;
            } else {
                that.isShowAccountAlias = false;
            }
        }, () => {
            that.isShowAccountAlias = false;
        });

    }

    async getMarketOpenPrice() {
        const that = this;
        const rstStr = await market.kline({period: "1min", symbol: "xemusdt", size: "1"});
        const rstQuery: KlineQuery = JSON.parse(rstStr.rst);
        const result = rstQuery.data ? rstQuery.data[0].close : 0;
        that.currentPrice = result;
    }

    async initMosaic() {
        const that = this;
        let {accountAddress, node, currentXEM1, currentXem, currentXEM2} = this;
        let mosaicMap = {};
        let mosaicHexIds = [];
        let getWallet = this.getWallet;
        let walletList = this.getWalletList;
        const defaultMosaic = {
            amount: 0,
            name: 'nem.xem',
            hex: that.currentXEM1,
            show: true,
            showInManage: true
        };
        let mosaicList: any = await getMosaicList(accountAddress, node);
        mosaicList.map((item, index) => {
            mosaicHexIds[index] = item.id.toHex();
            return item.id;
        });
        const mosaicInfoList = await getMosaicInfoList(node, mosaicList);
        new NamespaceHttp(node).getLinkedMosaicId(new NamespaceId('nem.xem')).subscribe((mosaic) => {
            this.$store.commit('SET_CURRENT_XEM_1', mosaic.toHex());
            currentXEM1 = mosaic.toHex();
            mosaicList = mosaicInfoList.map((item) => {
                const mosaicItem: any = mosaicList[mosaicHexIds.indexOf(item.mosaicId.toHex())];
                mosaicItem.hex = item.mosaicId.toHex();
                if (mosaicItem.hex == currentXEM2 || mosaicItem.hex == currentXEM1) {
                    mosaicItem.name = currentXem;
                    getWallet.balance = mosaicItem.amount.compact() / Math.pow(10, item.divisibility);
                    this.$store.commit('SET_WALLET', getWallet);
                    walletList[0] = getWallet;
                    this.$store.commit('SET_WALLET_LIST', walletList);
                    mosaicItem.amount = mosaicItem.amount.compact();
                    mosaicItem.show = true;
                    mosaicItem.showInManage = true;
                    return mosaicItem;
                }
                mosaicItem.name = item.mosaicId.toHex();
                mosaicItem.amount = mosaicItem.amount.compact();
                mosaicItem.show = true;
                mosaicItem.showInManage = true;
                return mosaicItem;
            });
            const isCoinExist = mosaicList.every((item) => {
                if (item.id.toHex() == that.currentXEM2 || item.id.toHex() == that.currentXEM1) {
                    return false;
                }
                return true;
            });
            if (isCoinExist) {
                mosaicList.unshift({
                    amount: 0,
                    hex: currentXEM1,
                    name: 'nem.xem',
                    id: new MosaicId(currentXEM1),
                    show: true,
                    showInManage: true
                });
            }
            mosaicList = mosaicList.reverse();
            mosaicList.forEach((item) => {
                if (item.name == 'nem.xem') {
                    that.XEMamount = item.amount / 1000000;
                }
                mosaicMap[item.hex] = {
                    amount: item.amount,
                    name: item.name,
                    hex: item.hex,
                    show: true,
                    showInManage: true
                };
            });
        });
        if (mosaicList.length > 0) {
            this.$store.commit('SET_MOSAICS', mosaicList);
        } else {
            this.$store.commit('SET_MOSAICS', [defaultMosaic]);
            mosaicMap[defaultMosaic.hex] = defaultMosaic;
        }
        that.localMosaicMap = mosaicMap;
        that.mosaicMap = mosaicMap;
        that.isLoadingMosaic = false;
        console.log(this.namespaceList)
        this.namespaceList.forEach((item) => {
            // console.log(item.alias.type == )
        })
    }

    initLeftNavigator() {
        this.$store.commit('SET_CURRENT_PANEL_INDEX', 0);
    }

    searchMosaic() {
        // need hex search way
        const that = this;
        const {mosaicName, mosaicMap, currentXEM1, currentXEM2} = this;
        const {} = this;
        if (this.mosaicName == '') {
            this.showErrorMessage(Message.MOSAIC_NAME_NULL_ERROR);
            return;
        }
        let searchResult = {};
        const mosaicHex = new MosaicApiRxjs().getMosaicByNamespace(mosaicName).id.toHex();
        if (mosaicMap[mosaicHex]) {
            searchResult[mosaicHex] = mosaicMap[mosaicHex];
            that.mosaicMap = searchResult;
            return;
        }
        if (mosaicHex == currentXEM1 || currentXEM2 == mosaicHex) {
            searchResult[mosaicHex] = mosaicMap[currentXEM1] ? mosaicMap[currentXEM1] : mosaicMap[currentXEM2];
            that.mosaicMap = searchResult;
            return;
        }
        searchResult[mosaicHex] = {
            name: mosaicName,
            hex: mosaicHex,
            amount: 0,
            show: false,
            showInManage: true
        };
        that.mosaicMap = searchResult;
    }

    showErrorMessage(message) {
        this.$Notice.destroy();
        this.$Notice.error({title: this.$t(message) + ''});
    }

    setLeftSwitchIcon() {
        this.$store.commit('SET_CURRENT_PANEL_INDEX', 0);
    }

    formatXEMamount(text) {
        return formatXEMamount(text);
    }

    @Watch('getWallet')
    onGetWalletChange() {
        this.initData();
        this.initMosaic();
        this.getXEMAmount();
        this.getAccountsName();
        this.getMarketOpenPrice();
        this.getMyNamespaces();
    }

    @Watch('confirmedTxList')
    onConfirmedTxChange() {
        this.initMosaic();
        this.getXEMAmount();
        this.getAccountsName();
        this.getMyNamespaces();
    }

    @Watch('mosaicName')
    onMosaicNameChange() {
        const {mosaicMap, mosaicName} = this;
        for (const item in mosaicMap) {
            if (item.indexOf(mosaicName) !== -1 || mosaicMap[item].name.indexOf(mosaicName) !== -1) {
                mosaicMap[item].showInManage = true;
                continue;
            }
            mosaicMap[item].showInManage = false;
        }
    }

    created() {
        this.setLeftSwitchIcon();
        this.initLeftNavigator();
        this.initData();
        this.initMosaic();
        this.getXEMAmount();
        this.getAccountsName();
        this.getMarketOpenPrice();
        this.getMyNamespaces();
    }
}
