import routers from '@/router/routers.ts';
import {Message, isWindows, languageList, localesMap, nodeList} from "@/config/index.ts";
import {ListenerApiRxjs} from "@/core/api/ListenerApiRxjs.ts";
import {BlockApiRxjs} from '@/core/api/BlockApiRxjs.ts';
import monitorSeleted from '@/common/img/window/windowSelected.png';
import {Address, Listener, NamespaceHttp, NamespaceId} from "nem2-sdk";
import monitorUnselected from '@/common/img/window/windowUnselected.png';
import {localSave} from "@/core/utils/utils.ts";
import {Component, Vue, Watch} from 'vue-property-decorator';
import {windowSizeChange, minWindow, maxWindow, closeWindow} from '@/core/utils/electron.ts';
import {mapState} from 'vuex';

@Component({
    computed: {
        ...mapState({
            activeAccount: 'account',
            app: 'app',
        })
    }
})
export class MenuBarTs extends Vue {
    app: any;
    activeAccount: any;
    isShowNodeList = false;
    isWindows = isWindows;
    inputNodeValue = '';
    nodeList = nodeList
    isNowWindowMax = false;
    isShowDialog = true;
    activePanelList = [false, false, false, false, false];
    currentWallet = '';
    showSelectWallet = true;
    monitorSeleted = monitorSeleted;
    monitorUnselected = monitorUnselected;
    accountAddress = '';
    unconfirmedTxListener = null;
    confirmedTxListener = null;
    txStatusListener = null;
    languageList = languageList;
    localesMap = localesMap;

    get isNodeHealthy() {
        return this.$store.state.app.isNodeHealthy
    }

    set isNodeHealthy(isNodeHealthy) {
        this.$store.commit('SET_IS_NODE_HEALTHY', isNodeHealthy)
    }

    get wallet() {
        return this.activeAccount.wallet || false;
    }

    get walletList() {
        return this.app.walletList || [];
    }

    get networkType() {
        return this.$store.state.account.wallet.networkType;
    }

    get node() {
        return this.activeAccount.node;
    }

    get UnconfirmedTxList() {
        return this.activeAccount.UnconfirmedTx;
    }

    get ConfirmedTxList() {
        return this.activeAccount.ConfirmedTx;
    }

    get errorTxList() {
        return this.activeAccount.errorTx;
    }

    get currentNode() {
        return this.activeAccount.node;
    }

    get language() {
        return this.$i18n.locale;
    }

    set language(lang) {
        this.$i18n.locale = lang;
        localSave('locale', lang);
    }

    closeWindow() {
        closeWindow();
    }

    maxWindow() {
        this.isNowWindowMax = !this.isNowWindowMax;
        maxWindow();
    }

    minWindow() {
        minWindow();
    }

    selectEndpoint(index) {
        this.nodeList.forEach(item => item.isSelected = false);
        this.nodeList[index].isSelected = true;
        this.$store.commit('SET_NODE', this.nodeList[index].value);
    }

    // @TODO: vee-validate
    changeEndpointByInput() {
        let inputValue = this.inputNodeValue;
        if (inputValue == '') {
            this.$Message.destroy();
            this.$Message.error(this['$t'](Message.NODE_NULL_ERROR));
            return;
        }
        if (inputValue.indexOf(':') == -1) {
            inputValue = "http://" + inputValue + ':3000';
        }
        this.$store.commit('SET_NODE', inputValue);
    }

    toggleNodeList() {
        this.isShowNodeList = !this.isShowNodeList;
    }

    switchPanel(index) {
        if (!this.app.walletList.length) return;
        const routerIcon = routers[0].children;

        this.$router.push({
            params: {},
            name: routerIcon[index].name
        });
        this.$store.commit('SET_CURRENT_PANEL_INDEX', index);
    }

    switchWallet(address) {
        const that = this;
        const walletList = [...this.walletList];
        let list = [...this.walletList];
        walletList.forEach((item, index) => {
            if (item.address === address) {
                that.$store.state.account.wallet = item;
                list.splice(index, 1);
                list.unshift(item);
            }
        });
        this.$store.commit('SET_WALLET_LIST', list);
    }

    accountQuit() {
        this.$store.commit('SET_CURRENT_PANEL_INDEX', 0);
        this.$router.push({
            name: "login",
            params: {
                index: '2'
            }
        });
    }

    async getGenerationHash(node) {
        const that = this;
        await new BlockApiRxjs().getBlockByHeight(node, 1).subscribe((blockInfo) => {
            that.$store.commit('SET_GENERATE_HASH', blockInfo.generationHash);
        });
    }

    unconfirmedListener() {
        if (!this.wallet) return;
        const that = this;
        const node = this.node.replace('http', 'ws');
        this.unconfirmedTxListener && this.unconfirmedTxListener.close();
        this.unconfirmedTxListener = new Listener(node, WebSocket);
        new ListenerApiRxjs().listenerUnconfirmed(this.unconfirmedTxListener, Address.createFromRawAddress(that.wallet.address), that.disposeUnconfirmed);
    }

    confirmedListener() {
        if (!this.wallet) return;
        const node = this.node.replace('http', 'ws');
        const that = this;
        this.confirmedTxListener && this.confirmedTxListener.close();
        this.confirmedTxListener = new Listener(node, WebSocket);
        new ListenerApiRxjs().listenerConfirmed(this.confirmedTxListener, Address.createFromRawAddress(that.wallet.address), that.disposeConfirmed);
    }

    txErrorListener() {
        if (!this.wallet) return;
        const that = this;
        const node = this.node.replace('http', 'ws');
        this.txStatusListener && this.txStatusListener.close();
        this.txStatusListener = new Listener(node, WebSocket);
        new ListenerApiRxjs().listenerTxStatus(this.txStatusListener, Address.createFromRawAddress(that.wallet.address), that.disposeTxStatus);
    }

    disposeUnconfirmed(transaction) {
        let list = this.UnconfirmedTxList;
        if (!list.includes(transaction.transactionInfo.hash)) {
            list.push(transaction.transactionInfo.hash);
            this.$store.state.account.UnconfirmedTx = list;
            this.$Notice.success({
                title: this.$t('Transaction_sending').toString(),
                duration: 20,
            });
        }
    }

    disposeConfirmed(transaction) {
        let list = this.ConfirmedTxList;
        let unList = this.UnconfirmedTxList;
        if (!list.includes(transaction.transactionInfo.hash)) {
            list.push(transaction.transactionInfo.hash);
            if (unList.includes(transaction.transactionInfo.hash)) {
                unList.splice(unList.indexOf(transaction.transactionInfo.hash), 1);
            }
            this.$store.state.account.ConfirmedTx = list;
            this.$store.state.account.UnconfirmedTx = unList;
            this.$Notice.destroy();
            this.$Notice.success({
                title: this.$t('Transaction_Reception').toString(),
                duration: 4,
            });
        }
    }


    disposeTxStatus(transaction) {
        let list = this.errorTxList;
        if (!list.includes(transaction.hash)) {
            list.push(transaction.hash);
            this.$store.commit('SET_ERROR_TEXT', list);
            this.$Notice.destroy();
            this.$Notice.error({
                title: transaction.status.split('_').join(' '),
                duration: 10,
            });
        }
    }

// languageList

    @Watch('currentNode')
    onCurrentNode() {
        const {currentNode} = this;
        const that = this;
        const linkedMosaic = new NamespaceHttp(currentNode).getLinkedMosaicId(new NamespaceId('nem.xem'));
        linkedMosaic.subscribe((mosaic) => {
            this.$store.commit('SET_CURRENT_XEM_1', mosaic.toHex());
        });
        that.isNodeHealthy = false;
        this.unconfirmedListener();
        this.confirmedListener();
        this.txErrorListener();

        that.$Notice.destroy();
        that.$Notice.error({
            title: that.$t(Message.NODE_CONNECTION_ERROR) + ''
        });
        new BlockApiRxjs().getBlockchainHeight(currentNode).subscribe((info) => {
            that.isNodeHealthy = true;
            that.getGenerationHash(currentNode);
            that.$Notice.destroy();
            that.$Notice.success({
                title: that.$t(Message.NODE_CONNECTION_SUCCEEDED) + ''
            });
        }, () => {
            that.isNodeHealthy = false;
        });
    }

    @Watch('wallet.address')
    onGetWalletChange() {
        this.unconfirmedListener();
        this.confirmedListener();
        this.txErrorListener();
    }

    created() {
        if (isWindows) windowSizeChange();
        this.onCurrentNode();
        this.unconfirmedListener();
        this.confirmedListener();
        this.txErrorListener();
    }
}
