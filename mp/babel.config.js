// Taro 4 + React + TypeScript。
// 小程序端把 JSX 交给 React runtime，不要在这里引入 Next.js 的 preset。
module.exports = {
  presets: [["taro", { framework: "react", ts: true, compiler: "webpack5" }]]
};
