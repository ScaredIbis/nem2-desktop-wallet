import routers from '@/router/routers.ts'
import {Message, isWindows} from "@/config/index.ts"
import {ListenerApiRxjs} from "@/core/api/ListenerApiRxjs.ts"
import {BlockApiRxjs} from '@/core/api/BlockApiRxjs.ts'
import monitorSeleted from '@/common/img/window/windowSelected.png'
import {Address, Listener, NamespaceHttp, NamespaceId} from "nem2-sdk"
import monitorUnselected from '@/common/img/window/windowUnselected.png'
import {localSave, localRead} from "@/core/utils/utils.ts"
import {Component, Vue, Watch} from 'vue-property-decorator'
import {windowSizeChange, minWindow, maxWindow, closeWindow} from '@/core/utils/electron.ts'

@Component
export class MenuBarTs extends Vue {
    isShowNodeList = false
    isWindows = isWindows
    inputNodeValue = ''
    nodetList = [
        {
            value: 'http://192.168.0.105:3000',
            name: 'my-8',
            url: '192.168.0.105',
            isSelected: false,
        },
        {
            value: 'http://3.0.78.183:3000',
            name: 'my-8',
            url: '3.0.78.183',
            isSelected: false,
        }, {
            value: 'http://13.114.200.132:3000',
            name: 'jp-5',
            url: '13.114.200.132',
            isSelected: false,
        }, {
            value: 'http://47.107.245.217:3000',
            name: 'cn-2',
            url: '47.107.245.217',
            isSelected: true,
        }
    ]
    isNowWindowMax = false
    isShowDialog = true
    activePanelList = [false, false, false, false, false]
    currentLanguage: any = false
    languageList = []
    currentWallet = ''
    showSelectWallet = true
    monitorSeleted = monitorSeleted
    monitorUnselected = monitorUnselected
    currentNode = ''
    isNodeHealthy = true
    accountPrivateKey = ''
    accountPublicKey = ''
    accountAddress = ''
    walletList = []
    unconfirmedTxListener = null
    confirmedTxListener = null
    txStatusListener = null

    get getWallet() {
        return this.$store.state.account.wallet
    }

    get getWalletList() {
        return this.$store.state.app.walletList || []
    }

    get node() {
        return this.$store.state.account.node
    }

    get UnconfirmedTxList() {
        return this.$store.state.account.UnconfirmedTx
    }

    get ConfirmedTxList() {
        return this.$store.state.account.ConfirmedTx
    }

    get errorTxList() {
        return this.$store.state.account.errorTx
    }

    closeWindow() {
        closeWindow()
    }

    maxWindow() {
        this.isNowWindowMax = !this.isNowWindowMax
        maxWindow()
    }

    minWindow() {
        minWindow()
    }

    selectPoint(index) {
        let list = this.nodetList
        list = list.map((item) => {
            item.isSelected = false
            return item
        })
        list[index].isSelected = true
        this.currentNode = list[index].value
        this.nodetList = list
    }

    changePointByInput() {
        let inputValue = this.inputNodeValue
        if (inputValue == '') {
            this.$Message.destroy()
            this.$Message.error(this['$t'](Message.NODE_NULL_ERROR))
            return
        }
        if (inputValue.indexOf(':') == -1) {
            inputValue = "http://" + inputValue + ':3000'
        }
        this.currentNode = inputValue
    }

    toggleNodeList() {
        this.isShowNodeList = !this.isShowNodeList
    }

    switchPanel(index) {
        if (!this.$store.state.app.walletList.length) {
            return
        }
        const routerIcon = routers[0].children

        this.$router.push({
            params: {},
            name: routerIcon[index].name
        })
        this.$store.commit('SET_CURRENT_PANEL_INDEX', index)
    }

    switchLanguage(language) {
        this.$store.state.app.local = {
            abbr: language,
            language: this.$store.state.app.localMap[language]
        }
        // @ts-ignore
        this.$i18n.locale = language
        localSave('local', language)
    }

    switchWallet(address) {
        const {walletList} = this
        const that = this
        let list = walletList
        walletList.map((item, index) => {
            if (item.address == address) {
                that.$store.state.account.wallet = item
                list.splice(index, 1)
                list.unshift(item)
            }
        })
        this.$store.commit('SET_WALLET_LIST', list)
    }

    accountQuit() {
        this.$store.state.app.currentPanelIndex = 0
        this.$router.push({
            name: "login",
            params: {
                index: '2'
            }
        })
    }

    async getGenerateHash(node) {
        const that = this
        await new BlockApiRxjs().getBlockByHeight(node, 1).subscribe((blockInfo) => {
            that.$store.state.account.generationHash = blockInfo.generationHash
        })
    }

    unconfirmedListener() {
        if (!this.getWallet) {
            return
        }
        const node = this.node.replace('http', 'ws')
        const that = this
        this.unconfirmedTxListener && this.unconfirmedTxListener.close()
        this.unconfirmedTxListener = new Listener(node, WebSocket)
        new ListenerApiRxjs().listenerUnconfirmed(this.unconfirmedTxListener, Address.createFromRawAddress(that.getWallet.address), that.disposeUnconfirmed)
    }

    confirmedListener() {
        if (!this.getWallet) {
            return
        }
        const node = this.node.replace('http', 'ws')
        const that = this
        this.confirmedTxListener && this.confirmedTxListener.close()
        this.confirmedTxListener = new Listener(node, WebSocket)
        new ListenerApiRxjs().listenerConfirmed(this.confirmedTxListener, Address.createFromRawAddress(that.getWallet.address), that.disposeConfirmed)
    }

    txErrorListener() {
        if (!this.getWallet) {
            return
        }
        const node = this.node.replace('http', 'ws')
        const that = this
        this.txStatusListener && this.txStatusListener.close()
        this.txStatusListener = new Listener(node, WebSocket)
        new ListenerApiRxjs().listenerTxStatus(this.txStatusListener, Address.createFromRawAddress(that.getWallet.address), that.disposeTxStatus)
    }

    disposeUnconfirmed(transaction) {
        let list = this.UnconfirmedTxList
        if (!list.includes(transaction.transactionInfo.hash)) {
            list.push(transaction.transactionInfo.hash)
            this.$store.state.account.UnconfirmedTx = list
            this.$Notice.success({
                title: this.$t('Transaction_sending').toString(),
                duration: 20,
            });
        }
    }

    disposeConfirmed(transaction) {
        let list = this.ConfirmedTxList
        let unList = this.UnconfirmedTxList
        if (!list.includes(transaction.transactionInfo.hash)) {
            list.push(transaction.transactionInfo.hash)
            if (unList.includes(transaction.transactionInfo.hash)) {
                unList.splice(unList.indexOf(transaction.transactionInfo.hash), 1)
            }
            this.$store.state.account.ConfirmedTx = list
            this.$store.state.account.UnconfirmedTx = unList
            this.$Notice.destroy()
            this.$Notice.success({
                title: this.$t('Transaction_Reception').toString(),
                duration: 4,
            });
        }
    }


    disposeTxStatus(transaction) {
        let list = this.errorTxList
        if (!list.includes(transaction.hash)) {
            list.push(transaction.hash)
            this.$store.state.account.errorTx = list
            this.$Notice.destroy()
            this.$Notice.error({
                title: transaction.status.split('_').join(' '),
                duration: 10,
            });
        }
    }

    initData() {
        this.languageList = this.$store.state.app.languageList
        this.currentLanguage = localRead('local')
        this.$store.state.app.local = {
            abbr: this.currentLanguage,
            language: this.$store.state.app.localMap[this.currentLanguage]
        }
        this.currentNode = this.$store.state.account.node
        this.walletList = this.getWalletList
    }

    @Watch('currentNode')
    onCurrentNode() {
        const {currentNode} = this
        this.$store.state.account.node = currentNode
        const that = this
        const linkedMosaic = new NamespaceHttp(currentNode).getLinkedMosaicId(new NamespaceId('nem.xem'))
        linkedMosaic.subscribe((mosaic) => {
            this.$store.state.account.currentXEM1 = mosaic.toHex()
        })
        that.isNodeHealthy = false
        this.unconfirmedListener()
        this.confirmedListener()
        this.txErrorListener()

        new BlockApiRxjs().getBlockchainHeight(currentNode).subscribe((info) => {
            that.isNodeHealthy = true
            that.getGenerateHash(currentNode)
            that.$Notice.destroy()
            that.$Notice.success({
                title: that.$t(Message.NODE_CONNECTION_SUCCEEDED) + ''
            });
        }, (e: Error) => {
            that.isNodeHealthy = false
            that.$Notice.destroy()
            that.$Notice.error({
                title: that.$t(Message.NODE_CONNECTION_ERROR) + ''
            })
        })
    }

    @Watch('getWallet')
    onGetWalletChange() {
        this.walletList = this.getWalletList
        this.currentWallet = this.getWallet.address
        this.unconfirmedListener()
        this.confirmedListener()
        this.txErrorListener()
    }

    created() {
        if (isWindows) {
            windowSizeChange()
        }
        this.initData()
        this.onCurrentNode()
        this.unconfirmedListener()
        this.confirmedListener()
        this.txErrorListener()
    }
}
