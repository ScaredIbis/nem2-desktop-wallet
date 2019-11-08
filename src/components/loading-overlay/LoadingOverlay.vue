<template>
 <div>
 </div>
</template>
<script lang="ts">
  import {Component, Vue, Watch} from 'vue-property-decorator'
  import {DisabledFormsTs} from '@/components/disabled-forms/DisabledFormsTs.ts'
  import {AppInfo, StoreAccount} from "@/core/model"
  import {mapState} from "vuex"

  @Component({ computed: { ...mapState({ app: 'app' }) } })
  export default class DisabledForms extends DisabledFormsTs {
    spin: any = this.$Spin

    @Watch('app.loadingOverlay.show')
    onLoadingOverlayShowChange(newValue: boolean, oldValue: boolean) {
       if (newValue !== oldValue) {
         if(newValue) this.open()
         if(!newValue) this.closeScreen()
       }
    }

    open () {
      this.spin.show({
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
    }

    closeScreen() {
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