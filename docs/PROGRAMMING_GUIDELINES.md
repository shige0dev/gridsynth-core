# GridSynth プログラミング・UI設計ガイドライン
## Programming & UI Design Guidelines

本ドキュメントは、GridSynthの開発における設計思想、疎結合アーキテクチャ、シャーシ端子ピン配置、パネル表示・モジュール実装の統一規格、コード合理化および今後の開発方針をまとめた公式ガイドラインです。  
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

## 2. アーキテクチャと疎結合コンセプト (Decoupled 3-Tier Architecture)

GridSynthは、保守性と拡張性を最大化するため**3つの独立したレイヤー**に厳格に分離して設計・実装します。

```
┌────────────────────────────────────────────────────────┐
│ 第3層: 独自UIモジュール (Composite)                     │
│   例: FMx3, SEQ8, SEQ16, MARKOV, KEY, PAT, CHORD       │
│   → 無理に共通化しない。独自の配置・操作感を持つ。        │
│   → ただし「部品（第1層）」だけを借りて組み立てる (合成) │
├────────────────────────────────────────────────────────┤
│ 第2層: 標準スキーマ駆動モジュール (Schema-Driven)       │
│   例: VCO, VCF, VCA, MIX, DELAY, CVDELAY, REVERB, LFO  │
│   → パラメータ定義 (min, max, step) の宣言だけで自動生成 │
│   → コード量は10〜30行で極小・バグの余地ゼロ             │
├────────────────────────────────────────────────────────┤
│ 第1層: 最小共通部品 (Primitives)                       │
│   例: スライダ (48px), bindScrubber, 端子ポート, バー    │
│   → ポリシーを持たない「ただの素材」なので誰でも安全共有 │
└────────────────────────────────────────────────────────┘
```

### 2.1 UI / Audio / DSP の3層完全分離
1. **UI定義 (`src/modules/defs/`)**:
   - DOM生成 (`renderGrid`, `renderModal`)、UIイベント（`bindEvents`）、およびリアルタイム表示更新（`updateLive`）のみを担当。
   - Web Audio の `AudioContext` や `AudioNode` インスタンスを直接参照・保持してはならない。
2. **Audio定義 (`src/audio/defs/`)**:
   - Web Audio ノードグラフの生成（`create`）、パラメータ更新（`update`）、およびノード破棄（`destroy`）のみを担当。
   - UIのDOM要素を直接操作してはならない。
3. **DSP Worklet (`src/dsp/processors/`)**:
   - サンプル単位の純粋なシグナル・ピッチ・演算処理のみを担当。
4. **通信の疎結合化**:
   - UIとDSPは、プレーンオブジェクト（`SET_CONFIG`, `NOTE`, `STATE`）による非同期メッセージ通信（`postMessage`）のみで結合する。

---

## 3. シャーシ端子ピン配置規格 (Chassis Pin Layout)

モジュールグリッドセル外周に配置される14本の端子ピン（PIN1〜PIN14）の物理配置および推奨役割です。各ピンは **14px center-to-center ピッチ**、外枠からマージン2pxで配置されます。

```
       PIN1 (58px) ───┐               ┌─── PIN14 (58px)
       PIN2 (44px) ───┤               ├─── PIN13 (44px)
[左辺] PIN3 (30px) ───┤ [中央表示領域] ├─── PIN12 (30px) [右辺]
       PIN4 (16px) ───┘  (幅50px以内) └─── PIN11 (16px)
                      ┌───────────────┐
                      │ 5   6 7 8 9 10│ [底辺]
                      └───────────────┘
```

| 辺 | ピン番号 | 物理座標 (from bottom) | 標準的用途 / 優先割り当て |
| :--- | :--- | :--- | :--- |
| **左辺 (Left)** | **PIN1** | 58px (上段) | 補助入力 (AUX IN / SYNC IN) |
| | **PIN2** | 44px (中上) | 変調入力 3 (MOD3 / FM) |
| | **PIN3** | 30px (中下) | 変調入力 2 (MOD2 / PWM) |
| | **PIN4** | 16px (下段) | 変調入力 1 (MOD1 / LEVEL CV) |
| **底辺 (Bottom)** | **PIN5** | 左下角 | **最頻出 CV入力 (1V/Oct IN, MAIN CV IN)** |
| | **PIN6** | 左下寄り | トリガー/クロック入力 (CLK IN, TRIG IN) |
| | **PIN7** | 中央左 | 補助入力 / リンク入力 |
| | **PIN8** | 中央右 | 補助出力 / リンク出力 |
| | **PIN9** | 右下寄り | サブ出力 / 反転出力 |
| | **PIN10** | 右下角 | **最頻出 Gate出力 / MAIN OUT (V1)** |
| **右辺 (Right)** | **PIN11** | 16px (下段) | **最頻出 CV出力 / メイン信号出力 (CV OUT / OUT1)** |
| | **PIN12** | 30px (中下) | 第2出力 (OUT2 / V2) |
| | **PIN13** | 44px (中上) | 第3出力 (OUT3 / V3) |
| | **PIN14** | 58px (上段) | 第4出力 / 補助出力 (OUT4 / V4) |

* **干渉防止境界**: 中央のバー表示やCanvasは幅50px以内とし、左辺（x=2〜10px）および右辺（x=62〜70px）の端子ピン領域に侵入させてはならない。

---

## 4. モジュール結線・シグナル結合ルール (Patching & Signal Coupling)

### 4.1 ポート定義フォーマット
```javascript
ports: (m) => ({
    in: [
        { port: 'cv_in', pin: 5, label: 'IN', signal: 'cv', color: 'bg-yellow-400' }
    ],
    out: [
        { port: 'gate_out', pin: 10, label: 'G', signal: 'gate', color: 'bg-orange-500' },
        { port: 'cv_out', pin: 11, label: 'CV', signal: 'cv', color: 'bg-yellow-400' }
    ]
})
```

### 4.2 シグナル種別とカラー規格
* **CV (コントロール電圧)**: `signal: 'cv'`, `color: 'bg-yellow-400'` (ピッチ, V/Oct, パラメータ変調)
* **Gate / Trigger**: `signal: 'gate'`, `color: 'bg-orange-500'` または `'bg-red-500'` (オン/オフ, クロック)
* **Audio (オーディオ音声)**: `signal: 'audio'`, `color: 'bg-blue-500'` (オシレータ音声, フィルタ出力)

### 4.3 結線ステートの追跡と反映
* ケーブルの接続・切断が発生すると、`cableManager` は即座に `synth.updateModule(id, moduleData, patchState)` を呼び出す。
* `patchState` は現在結線されている入力ポート名の `Set`（例: `patchState.has('cv_in')`）。
* オーディオ側はこれを受け取り、Worklet へ `isPatched` を通知して動作モードを切り替える（未結線 = ディゼーブル、結線 = リアルタイム処理）。

---

## 5. パネル（グリッドセル内）表示規格

### 5.1 バーメーター・インジケータ規格 (`UIHelpers.renderPanelBars`)
* **高さ（標準規格）**: `h-7` (28px)。（例外: `SEQ16` のみ `h-6` × 2段）。
* **スロット枠（共通ベゼル）**: `rounded-sm p-[1px] border border-slate-600 bg-slate-950/40 panel-bar-slot relative flex flex-col justify-end`。
* **バーの形状**: 丸角（ラウンドコーナー）は禁止。シャープな角（`rounded-none` / `rounded-xs`）。
* **多鍵盤・密なステップ（KEY等）**:
  - 個別枠×16本は禁止。**単一の標準枠（`w-[50px] h-7`）** 内に枠線・隙間のない（`gap-0`）矩形ストリップを描画する。

### 5.2 上下文字ラベルの配置とタイポグラフィ規格
* **配置**: バー表示の境界から **直近 2px**（上部: `bottom-full mb-[2px]`, 下部: `top-full mt-[2px]`）。
* **フォント規格**:
  ```css
  text-[7.5px] font-mono font-bold leading-none tracking-tight text-center max-w-[64px] truncate pointer-events-none select-none
  ```
* **色使いの統一**:
  - **上部（機能名・スケール・コード名など）**: `text-amber-400`
  - **下部（現在音名・音量・数値など）**: `text-cyan-300`

### 5.3 カラーパレットとセマンティクス
* **CV信号**: `bg-gradient-to-t from-amber-600 to-yellow-400`
* **オーディオ信号**: `bg-gradient-to-t from-blue-600 to-cyan-400`
* **白鍵（スケール内）**: `bg-yellow-400`
* **黒鍵（スケール内）**: **彩度ではなく明度を上げて淡く表現** (`bg-[hsl(48,90%,72%)]`)。
* **重複音（ベース＋テンション）**: `bg-[linear-gradient(to_right,#facc15_50%,#ef4444_50%)]`（左右50%分割）。

---

## 6. 音声・DSP処理 (Web Audio Worklet) 規格

1. **1V/Oct 標準**: `0.0V` = C1 (MIDI 24), `1.0V` = C2 (36), `2.0V` = C3 (48)。
2. **オクターブ境界またぎ時の `diff` 補正**: `diff = snappedSemi - absSemi`、`diff > 6 ? -12 : diff < -6 ? +12` でラップアラウンド時の逆戻りバグを防止。
3. **未結線時のディゼーブルとゲート漏れ根絶**: `!isPatched` 時は外部入力を無視し、キータッチ時以外は Gate 0.0 を厳守。
4. **バージョン同期**: `src/main.js`, `index.html`, `src/audio/engine.js`, `src/dsp/worklet-processors.js` の4箇所を同時更新。
