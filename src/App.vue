<template>
  <router-view></router-view>
</template>

<script lang="ts" setup>


</script>

<style>
/* 克苏鲁风格全局字体 */
@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Noto+Serif+SC:wght@400;600;700&display=swap');

* {
  font-family: 'Cinzel', 'Noto Serif SC', 'Times New Roman', serif !important;
}

/* 添加一些克苏鲁风格的文字效果 */
h1, h2, h3 {
  letter-spacing: 0.1em;
}

/* 选中文字的颜色 */
::selection {
  background: #2d1b4e;
  color: #9d7ed8;
}
</style>