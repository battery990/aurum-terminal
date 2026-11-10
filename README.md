# AURUM 金衡 · 黄金 CFD 智能行情终端

一套代码同时构建 **Android / iOS / Web** 的黄金行情分析应用。基于 React 19 + TypeScript + Vite 8 + Capacitor 8，Android APK 由 GitHub Actions 云端构建。

> 行情使用 Binance `PAXG/USDT` 作为 XAU/USD 现货参考。PAXG 是 1:1 黄金锚定代币，但存在溢价/折价与流动性差异，详见文末免责声明。

## 功能

- **7 个周期自动匹配策略**：1m / 5m / 15m / 1h / 4h / 1d / 1w，切换周期即加载该周期专属的指标组合与优化参数，无需手动调参。
- **自绘 Canvas K 线**：拖动查看历史、双指缩放、双击复位、十字光标；EMA/SMA、布林带、VWAP 叠加；入场/止损/目标计划线。
- **自适应指标副图**：每个周期自动选择最相关的副图（RSI / MACD / ATR / 成交量），也可手动切换。
- **多周期共振**：并行计算 7 个周期的方向偏好，给出共振/分化提示，点击即可跳转对应周期。
- **市场状态**：趋势 / 过渡 / 震荡判定，ADX、ATR 分位、量能、波动率等结构化指标。
- **交易建议**：做多 / 做空 / 观望、置信度、入场、止损、两级目标、盈亏比、决策依据链与失效条件。
- **实时与降级**：3 秒报价轮询，K 线刷新频率可调（5/15/30/60 秒）；网络异常时依次降级为本地缓存、确定性演示数据，并在界面明确标注 `LIVE / 缓存 / 演示`。
- **移动端体验**：深色交易终端视觉、金色点缀、安全区适配、触感反馈、原生启动屏与自适应图标。

## 周期与指标参数

| 周期 | 风格 | 均线 | 动能 / 摆动指标 | 波动 / 趋势过滤 | 默认副图 |
| --- | --- | --- | --- | --- | --- |
| 1m | 剥头皮 | EMA 9 / 21 | RSI 7、VWAP、BB 20,2 | ATR 14、ADX 14 | RSI |
| 5m | 短线 | EMA 12 / 26 | MACD 12/26/9、RSI 9、VWAP、BB 20,2 | ATR 14、ADX 14 | MACD |
| 15m | 日内 | EMA 20 / 50 | MACD 12/26/9、RSI 14、Stoch 14/3、BB 20,2 | ATR 14、ADX 14 | MACD |
| 1h | 日内趋势 | EMA 50 / 200 | MACD 12/26/9、RSI 14、Stoch 14/3 | ATR 14、ADX 14 | RSI |
| 4h | 波段 | SMA 50 / 200 | MACD 12/26/9、RSI 14 | ATR 14、ADX 14 | MACD |
| 1d | 趋势 | SMA 50 / 200 | RSI 14、BB 20,2 | ATR 14、ADX 14 | RSI |
| 1w | 配置 | SMA 20 / 50 | RSI 14 | ATR 14、ADX 14 | ATR |

参数设计原则：超短周期压缩均线、缩短 RSI 以降低滞后；日内周期用 EMA + MACD 捕捉动能；高周期用 SMA 50/200 作为机构趋势基准，并用 ADX 判断趋势是否成立。

## 信号模型

1. **趋势评分**：快慢均线相对位置、收盘价相对慢线、慢线斜率。
2. **动能评分**：MACD 柱体及变化、RSI 区间、随机指标、布林带位置。
3. **状态判定**：ADX 与 ATR 分位区分趋势 / 过渡 / 震荡；量能低于均量时信号降级。
4. **多周期共振**：7 个周期方向偏好加权，分化时降低置信度并提示等待。
5. **交易计划**：以 ATR 与摆动高低点计算入场、止损、两级目标与盈亏比；条件冲突时输出观望及触发条件，而不是强行给单。

置信度是模型对“当前结构一致性”的评分，不是胜率承诺。

## 技术栈

- React 19 + TypeScript
- Vite 8
- Capacitor 8（Android / iOS）
- 原生 Canvas 2D 图表（无图表库）
- Binance 公共行情 API
- GitHub Actions + Gradle 8.14 + AGP 8.13 + JDK 21 + Android SDK 36

## 本地开发

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # 类型检查 + 生产构建
```

移动端预览（390px 手机框）：`http://localhost:5173/preview.html`

## Android 构建

本地构建需要 JDK 21、Android SDK 36：

```bash
npm run build
npx cap sync android
cd android
./gradlew assembleDebug
```

APK 输出：`android/app/build/outputs/apk/debug/app-debug.apk`

## GitHub Actions 云构建

推送到 `main` 分支或手动触发 `Android APK` workflow，自动完成：

1. Node 22 + Java 21 + Android SDK 36 环境准备
2. `npm ci` → `npm run build` → `npx cap sync android`
3. `./gradlew assembleDebug`
4. 上传 `aurum-terminal-apk` artifact
5. 在 Releases 发布 `v1.0.0`，附带 `aurum-terminal-1.0.0.apk`

APK 使用 debug 签名，可直接侧载安装；上架应用商店需自行配置正式签名。

## 数据与降级

- 行情：`https://data-api.binance.vision/api/v3/klines`、`/ticker/24hr`，交易对 `PAXGUSDT`。
- 报价：3 秒轮询；K 线：默认 15 秒刷新，可在设置中调整。
- 缓存：最近一次成功行情写入 `localStorage`，断网时优先展示。
- 演示：无缓存且请求失败时，生成确定性演示 K 线，界面显示“演示数据”。
- 设置中可清除本地行情缓存。

## 目录

```
src/
  components/        UI 组件与 Canvas 图表
  hooks/             行情轮询、多周期、时钟
  lib/               指标、信号、周期参数、API、缓存、格式化
android/             Capacitor Android 原生工程
assets/              图标与启动图源文件
scripts/             资源生成脚本
.github/workflows/   Android 云构建
```

## 免责声明

本应用仅用于技术研究与学习，不构成任何投资建议。CFD 与杠杆交易风险极高，亏损可能超过本金。行情来自第三方公共接口，可能存在延迟、中断或错误；PAXG/USDT 不能完全等同于伦敦金/XAUUSD 报价，点差、隔夜利息与交易时段也存在差异。请勿将本应用的信号直接用于实盘交易。
