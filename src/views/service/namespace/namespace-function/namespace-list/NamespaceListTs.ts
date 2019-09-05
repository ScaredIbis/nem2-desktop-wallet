import {formatSeconds} from '@/core/utils/utils.ts'
import {Component, Vue} from 'vue-property-decorator'
import NamespaceEditDialog from './namespace-edit-dialog/NamespaceEditDialog.vue'
import {mapState} from "vuex"
import {aliasType} from '@/config/index.ts'
import {Address, MosaicId} from "nem2-sdk"
import NamespaceUnAliasDialog
    from '@/views/service/namespace/namespace-function/namespace-list/namespace-unAlias-dialog/NamespaceUnAliasDialog.vue'

@Component({
    components: {
        NamespaceEditDialog,
        NamespaceUnAliasDialog
    },
    computed: {
        ...mapState({
            activeAccount: 'account',
            app: 'app'
        })
    }
})
export class NamespaceListTs extends Vue {
    activeAccount: any
    app: any
    currentNamespace = ''
    showNamespaceEditDialog = false
    showUnAliasDialog = false
    unAliasItem = {}

    get namespaceList() {
        const namespaceList = this.activeAccount.namespace.map((item) => {
            switch (item.alias.type) {
                case (aliasType.noAlias):
                    item.aliasTarget = 'no alias'
                    item.aliasType = 'no alias'
                    item.isLinked = false
                    break
                case (aliasType.addressAlias):
                    //@ts-ignore
                    item.aliasTarget = Address.createFromEncoded(item.alias.address).address
                    item.aliasType = 'address'
                    item.isLinked = true
                    break
                case (aliasType.mosaicAlias):
                    item.aliasTarget = new MosaicId(item.alias.mosaicId).toHex()
                    item.aliasType = 'mosaic'
                    item.isLinked = true
            }
            return item
        })
        return namespaceList
    }

    get nowBlockHeihgt() {
        return this.app.chainStatus.currentHeight
    }

    closeUnAliasDialog() {
        this.showUnAliasDialog = false
    }

    showEditDialog(namespaceName) {
        this.currentNamespace = namespaceName
        this.showNamespaceEditDialog = true
    }

    closeNamespaceEditDialog() {
        this.showNamespaceEditDialog = false
    }

    computeDuration(namespaceInfo) {
        const {duration, isActive} = namespaceInfo
        if (!isActive) {
            return 'Expired'
        }
        const expireTime = duration - this.nowBlockHeihgt > 0 ? duration - this.nowBlockHeihgt : 'not active'
        return expireTime
    }

    unlinkAlias(aliasItem) {
        this.showUnAliasDialog = true
        console.log(this.showUnAliasDialog)
        this.unAliasItem = aliasItem
    }

    durationToTime(duration) {
        const durationNum = Number(duration - this.nowBlockHeihgt)
        return formatSeconds(durationNum * 12)
    }

}
