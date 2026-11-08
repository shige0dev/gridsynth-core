# GridSynth 開発常駐ルール (Workspace Rules)
<!-- This file is automatically loaded into the agent's memory on every turn. -->

本プロジェクト（GridSynth）の開発では、以下のルールを最優先で遵守すること。詳細は `docs/PROGRAMMING_GUIDELINES.md` を参照。

## 1. 疎結合アーキテクチャ (3-Tier & Decoupled Design)
- **3層分離**: 第1層(部品: `UIHelpers`), 第2層(宣言的: `schema`), 第3層(複合UI: `Composite`)。何でも入り万能スキーマの作成は禁止。
- **UI / Audio / DSP の分離**: `defs/`(DOM・描画) と `audio/defs/`(Web Audioグラフ) と `dsp/`(Worklet) を分離。通信は `postMessage` (プレーンオブジェクト) のみ。

## 2. 端子ピン配置 & 結線ルール (Pin Layout & Patching)
- **ピン配置規格 (14pxピッチ)**:
  - 左辺 (PIN1〜4): 入力 (PIN4=MOD1, PIN1=AUX)
  - 底辺 (PIN5〜10): PIN5=**最頻出 CV IN (1V/Oct)**, PIN10=**最頻出 Gate OUT**
  - 右辺 (PIN11〜14): 出力 (PIN11=**最頻出 CV OUT / OUT1**)
- **シグナル種別と色**: CV=`bg-yellow-400`, Gate=`bg-orange-500` / `bg-red-500`, Audio=`bg-blue-500`。
- **結線ステート同期**: ケーブル脱着時は `cableManager` ➔ `synth.updateModule` 経由で `patchState` を Worklet (`isPatched`) へ即時同期。

## 3. パネル表示規格 (Panel Bar Standards)
- **バー表示の共通化**: パネルのバー表示には必ず `UIHelpers.renderPanelBars` を使用し、独自divを新設しない。
- **高さ・形状**: 高さ標準は `h-7` (28px)。バーはシャープな角（`rounded-none` / `rounded-xs`）とし、丸角（ラウンドコーナー）は禁止。
- **端子ピン干渉防止**: 中央表示の幅は **50px以内**（最大54px）に収め、左右の端子ピン領域へはみ出さない。
- **多鍵盤リボン (KEY等)**: 個別枠×16本は禁止。単一枠（`w-[50px] h-7`）内に枠線・装飾・隙間のない（`gap-0`）16分割矩形ストリップを描画する。

## 4. 上下文字ラベル規格 (Text Overlay Standards)
- **配置**: バー表示の境界から **直近 2px**（上部: `bottom-full mb-[2px]`, 下部: `top-full mt-[2px]`）に配置。セル固定座標（`top-[8px]` 等）は禁止。
- **フォント**: `text-[7.5px] font-mono font-bold leading-none tracking-tight text-center max-w-[64px]`
- **色**: 上部（機能名・スケール等）= `text-amber-400`、下部（音名・数値等）= `text-cyan-300`。

## 5. 色相・明度表現 (Color Semantics)
- **黒鍵表示**: 彩度を落として黒くするのではなく、**明度（Lightness）を上げて淡く表現**する（`bg-[hsl(48,90%,72%)]`）。
- **重複音**: 2レイヤー重なり（ベース＋テンション）は左右50%水平分割（`linear-gradient(to right, #facc15 50%, #ef4444 50%)`）。

## 6. 音声・シグナル整合性 (Audio & CV Integrity)
- **1V/Oct 標準**: 0.0V = C1 (MIDI 24), 1.0V = C2, 2.0V = C3。
- **CV入力の結線判定**: 未結線時（`!isPatched`）は `cv_in` をディゼーブル（無効化）し、手動CVを保持、アイドル時Gateは厳格に0.0（トリガー漏れ根絶）。結線時は即クオンタイズ。
- **クオンタイズ境界補正**: オクターブ跨ぎ時の逆戻りを防ぐため、必ず `diff = snapped - absSemi`（`diff > 6 ? -12 : diff < -6 ? +12`）補正を行う。

## 7. コード保守 & バージョン同期
- **車輪の再発明の禁止**: 毎回オリジナルを作らず、既存の `UIHelpers` や共通コンポーネントを再利用する。
- **廃止コードの完全消去**: 統合・不要になったモジュールやコードは速やかに全域から削除する。
- **バージョン同期**: 更新時は `src/main.js`, `index.html`, `src/audio/engine.js`, `src/dsp/worklet-processors.js` の4箇所を同時更新する。
