<template>
 <div>
 </div>
</template>
<script lang="ts">
  import {Component, Vue, Watch} from 'vue-property-decorator'
  import {AppInfo, StoreAccount, AppState} from "@/core/model"
  import {mapState} from "vuex"

  @Component({ computed: { ...mapState({ app: 'app' }) } })
  export default class LoadingOverlay extends Vue {
    app: AppInfo

    get show() {
        return this.app.loadingOverlay.show
    }

    @Watch('show')
    onLoadingOverlayShowChange(newValue: boolean, oldValue: boolean) {
       console.log("TCL: onLoadingOverlayShowChange -> oldValue", oldValue)
       console.log("TCL: onLoadingOverlayShowChange -> newValue", newValue)
       if (newValue !== oldValue) {
         if(newValue) this.open()
      // @ts-ignore
         if(!newValue) this.$Spin.hide()
       }
    }

    open () {
      // @ts-ignore
      this.$Spin.show({
        render: (h) => {
          return h('div', [
            h('Icon', {
              'class': 'demo-spin-icon-load',
              props: {
                type: 'ios-loading',
                size: 18
              }
            }),
            h('div', this.app.loadingOverlay.message),
            h('a', {
              on: {
                click: this.closeScreen
            }}, 'close')
          ])
        }
      });

      this
    }

    mounted() {
      this.open()
    }

    closeScreen() {
      console.log("TCL: closeScreen -> closeScreen", this)
      // @ts-ignore
this.$Spin.hide()
      this.$store.commit('SET_LOADING_OVERLAY', {
          show: false,
          message: ''
      })
    }
  }
</script>

<style>
  .demo-spin-icon-load {
    animation: ani-demo-spin 1s linear infinite;
  }
</style>