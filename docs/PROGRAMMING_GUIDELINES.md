# GridSynth プログラミング・UI設計ガイドライン
## Programming & UI Design Guidelines

本ドキュメントは、GridSynthの開発における設計思想、パネル表示・モジュール実装の統一規格、コード合理化および今後の開発方針をまとめた公式ガイドラインです。  
**「毎回オリジナル（アドホックな独自実装）を作らず、確立された共通ルールと部品を徹底して再利用する」** ことを最重要原則とします。

---

## 1. 最重要原則 (Core Principles)

1. **共通ルールの遵守と車輪の再発明の禁止**:
   - パネル表示やスライダ、端子配置などでモジュールごとに独自の `div` 構造やCSSを新設しない。
   - 必ず `UIHelpers` 等の既存共通ヘルパーを利用し、全モジュールで同一の視覚言語・操作感を維持する。
2. **端子ピンとの物理的境界の厳守**:
   - グリッドセル（約70〜80px）の左右端には端子ピン（左: PIN1〜4、右: PIN11〜14、下: PIN5〜10）が配置される。
   - パネル中央の表示部品（バーやCanvas）は **幅 50px（最大 54px）以内** に収め、端子ピン領域に絶対にはみ出さない。
3. **不要コード・廃止モジュールの完全消去**:
   - 機能統合や廃止が決まったモジュール（例: 旧SCALEモジュール等）は、残骸を残さず定義・DSP・登録・HTML paletteの全域から速やかに消去し、コードベースを常にクリーンに保つ。
4. **シグナル整合性とトリガー漏れの根絶**:
   - CV入力（`cv_in`）は未結線時は完全にディゼーブル（無効化）し、意図せぬゲート漏れ（常に1.0出力）やノイズ出力を絶対に許容しない。

---

## 2. パネル（グリッドセル内）表示規格

### 2.1 バーメーター・インジケータ規格 (`UIHelpers.renderPanelBars`)
パネル中央にバー表示を持つモジュール（`SEQ8`, `SEQ16`, `KEY`, `CHORD`, `ADSR`, `AR`, `RF`, `ARP`, `DIST4`, `MIX`, `SPK`, `TILT`, `VAL` 等）は、以下の規格に完全準拠します。

* **高さ（標準規格）**: `h-7` (28px)。
  - *例外*: 上下2段組の `SEQ16` のみ、セル内に収めるため `h-6` (24px) × 2段（間隔 `gap-0.5`）。
* **スロット枠（共通ベゼル）**:
  - `rounded-sm p-[1px] border border-slate-600 bg-slate-950/40 panel-bar-slot relative flex flex-col justify-end`
* **バーの形状**:
  - 丸角（ラウンドコーナー）は禁止。シャープで過度のある矩形（`rounded-none` または `rounded-xs`）を使用する。
* **多鍵盤・密なステップの表示ルール（例: KEYモジュール）**:
  - 16個の個別スロットを並べると幅58pxを超えてピンに干渉するため禁止。
  - **単一の標準枠（`w-[50px] h-7`）** を配置し、その中に枠線・装飾・隙間のない（`gap-0`）矩形ストリップとして描画する。

### 2.2 上下文字ラベルの配置とタイポグラフィ規格
バー表示の上下に文字を配置する場合、**バー表示の境界から直近 2px** の距離に配置します。

```
     ┌───────────────────────────────────┐
     │  Top Label (text-amber-400)       │  ← バー上端から 2px 上 (bottom-full mb-[2px])
     ├───────────────────────────────────┤
     │  [   Panel Bar Display (h-7)   ]  │  ← 標準高さ 28px (中央配置)
     ├───────────────────────────────────┤
     │  Bottom Text (text-cyan-300)      │  ← バー下端から 2px 下 (top-full mt-[2px])
     └───────────────────────────────────┘
```

* **配置方法**:
  - セル固定座標（`top-[8px]` や `bottom-[10px]`）の直書きは禁止。
  - `UIHelpers.renderPanelBars` のオプション `top` / `bottom` を使用し、バーコンテナ相対で自動配置する。
* **フォント規格**:
  ```css
  text-[7.5px] font-mono font-bold leading-none tracking-tight text-center max-w-[64px] truncate pointer-events-none select-none
  ```
* **色使いの統一ルール**:
  - **上部（機能名・スケール・コード名など）**: `text-amber-400`（黄色／アンバー系）
  - **下部（現在音名・音量・数値など）**: `text-cyan-300`（シアン系）

### 2.3 カラーパレットとセマンティクス

| 対象 | スタイル | 説明 |
| :--- | :--- | :--- |
| **CV信号バー** | `bg-gradient-to-t from-amber-600 to-yellow-400` | 電圧・ピッチ・エンベロープ値 (`theme: 'cv'`) |
| **オーディオ信号バー** | `bg-gradient-to-t from-blue-600 to-cyan-400` | 音声レベル・波形 (`theme: 'audio'`) |
| **白鍵（スケール内）** | `bg-yellow-400` | 鮮やかな黄色 |
| **黒鍵（スケール内）** | `bg-[hsl(48,90%,72%)]` | **彩度ではなく明度を上げて淡く表現**（黒く落とさない） |
| **無効 / オフ** | `bg-transparent` または `opacity-30` / `opacity-40` | スロット背景を透過 |
| **重なり音（ベース＋テンション）** | `bg-[linear-gradient(to_right,#facc15_50%,#ef4444_50%)]` | 左右50%水平分割グラデーション |

---

## 3. モーダル・ダイアログ設計規格

1. **共通スライダ規格**:
   - 縦型スライダは必ず規格サイズ **高さ 48px × 幅 14px**（`.native-vslider`）を使用。
   - `UIHelpers.createVSliderHTML` および `UIHelpers.bindSlider` を使用し、数値スクラバー操作（`bindScrubber`）と同期させる。
2. **ボタングループ & セレクタ**:
   - 背景: `bg-slate-900 border border-slate-700`
   - ホバー / アクティブ: `hover:border-amber-500` / `ring-1 ring-amber-400`
   - 文字: `font-mono font-bold text-[9px]` または `text-[9.5px]`
3. **クオンタイズ・スケールマップ**:
   - 12半音ストリップ表示（`renderQuantizeMapHTML`）を使用。
   - スナップ先が切り替わる境界に細い区分線（`border-r-2 border-amber-400/90`）を配置し、視覚的に音程グループを認知できるようにする。

---

## 4. 音声・DSP処理 (Web Audio Worklet) 規格

1. **1V/Oct 標準の徹底**:
   - `0.0V` = C1 (MIDI 24)
   - `1.0V` = C2 (MIDI 36)
   - `2.0V` = C3 (MIDI 48)
   - 計算式: `midi = Math.round(cv * 12) + 24` / `cv = (midi - 24) / 12.0`
2. **オクターブ境界またぎ時の `diff` 補正**:
   - 単純に `absSemi = totalSemi % 12` だけをクオンタイズして `Math.floor(totalSemi / 12)` と足し合わせると、BからCへ上向きスナップした際に1オクターブ下に逆戻りする重大バグが発生する。
   - 必ず `diff = snappedSemi - absSemi` を算出し、`diff > 6` で `-12`、`diff < -6` で `+12` して `totalSemi + diff` で計算すること。
3. **動的パッチング検出（結線ステートハンドリング）**:
   - `isPatched = Boolean(patch?.has('cv_in'))` を Worklet に必ず通知する。
   - `!isPatched` の場合、外部入力バッファは無視し、手動入力値（`this.manualCv`）を出力する。
   - ケーブル接続・切断時には即座に Worklet へ `SET_CONFIG` メッセージを送り、ステートを同期させる。
4. **キャッシュバスティングの運用**:
   - Worklet ファイル更新時は、`src/dsp/worklet-processors.js` 内のインポートクエリおよび `src/audio/engine.js` 内の `workletUrl` クエリ（`?v=XXX`）を同時にインクリメントする。

---

## 5. 新規モジュール・機能追加時のチェックリスト

実装前に以下の項目を順に確認してください。

- [ ] **Q1. パネル表示にバーを使うか？**
  - YES ➔ 必ず `UIHelpers.renderPanelBars` を使用し、高さは `h-7` に統一する。
  - YES ➔ 上下文字ラベルは `options.top` / `options.bottom` を通じてバー直近2pxに配置する。
  - YES ➔ コンテナ幅は `w-[50px]` 以内に収め、端子ピンと干渉しないことを確認する。
- [ ] **Q2. パラメータ操作系はスライダか？**
  - YES ➔ 第2層のスキーマ（`schema`）または第1層の部品（`createVSliderHTML` / `.native-vslider`）を使用する。
- [ ] **Q3. CV入力を持つか？**
  - YES ➔ 未結線時のフォールバック値が保証され、トリガー漏れ（常にGate=1）が起きないか確認する。
  - YES ➔ ケーブル脱着時に `updateModule` 経由で結線状態がDSPノードへ即時反映されるか確認する。
- [ ] **Q4. バージョン更新を実施したか？**
  - `src/main.js`, `index.html`, `src/audio/engine.js`, `src/dsp/worklet-processors.js` の4箇所のバージョン番号を一致させて更新する。
