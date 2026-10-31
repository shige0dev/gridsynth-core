# Gridsynth AI Patch Generation & Composition Specification (v2.0 Standalone)
> **For AI Assistants (ChatGPT, Claude, Gemini, Cursor, Copilot, etc.)**
> 本仕様書は、外部 AI が **Gridsynth**（Webベース 4列×32行スクロール・モジュラーシンセサイザー）用のパッチデータ（JSON形式）を自律的かつエラーなく設計・作曲・出力するための**完全単一・自己完結型リファレンス仕様書**です。
> 本ドキュメントをチャットプロンプトにコピー＆ペーストするだけで、他の外部ファイルを参照することなく、即座にインポート可能な完全動作パッチを出力できます。

---

## 1. システム概要 (Overview)

- **グリッド構造**: **横4列 × 縦32行 = 計128スロット**（インデックス `"0"` 〜 `"127"`、縦スクロール対応）
- **パッチデータ形式**: **完全な単一 JSON オブジェクト**（マークダウン内の ` ```json ` コードブロックとして出力）
- **信号結線方式**: 文字列配列 `"送信元モジュールID:出力ポート > 送信先モジュールID:入力ポート"`
- **再生エンジン**: クロック（`CLK`）またはシーケンサー（`SEQ8` / `SEQ16` / `PAT` / `MARKOV`）駆動のリアルタイム Web Audio / AudioWorklet 合成
- **スピーカー出力**: 最終音声は必ず `SPK1` の `wave_in_l` および `wave_in_r` へ結線

---

## 2. トップレベル JSON スキーマ (Patch Structure)

Gridsynth のパッチは、以下の最小限かつ完全な JSON スキーマに厳格に準拠します。

```json
{
  "bpm": 120,
  "pages": {
    "0": {
      "name": "MAIN",
      "slots": {
        "0": "CLK1",
        "1": "SEQ8_1",
        "2": "VCO1",
        "3": "SPK1",
        "6": "VCF1"
      },
      "modules": {
        "CLK1": { "type": "CLK", "div": "x2", "pulseWidthMs": 15 },
        "SEQ8_1": {
          "type": "SEQ8",
          "quantize": true,
          "steps": [
            { "cv": 0.0, "active": true, "cvActive": true, "gate": true },
            { "cv": 0.0, "active": true, "cvActive": true, "gate": true },
            { "cv": 0.5, "active": true, "cvActive": true, "gate": true },
            { "cv": 0.25, "active": true, "cvActive": true, "gate": true },
            { "cv": 0.0, "active": true, "cvActive": true, "gate": true },
            { "cv": 0.75, "active": true, "cvActive": true, "gate": true },
            { "cv": 0.25, "active": true, "cvActive": true, "gate": true },
            { "cv": 0.5, "active": true, "cvActive": true, "gate": true }
          ]
        },
        "VCO1": { "type": "VCO", "wave": "sawtooth", "freq1": 110, "channels": 1 },
        "VCF1": { "type": "VCF", "filterType": "lowpass", "cutoff": 800, "q": 4.0, "modDepth": 2000 },
        "SPK1": { "type": "SPK", "masterVol": 0.16 }
      },
      "connections": [
        "CLK1:gate_out > SEQ8_1:gate_in",
        "SEQ8_1:cv_out > VCO1:cv_in",
        "VCO1:wave_out > VCF1:wave_in",
        "VCF1:wave_out > SPK1:wave_in_l",
        "VCF1:wave_out > SPK1:wave_in_r"
      ]
    }
  }
}
```

### フィールド定義
| フィールド | 型 | 必須 / 範囲 | デフォルト | 説明 |
| :--- | :--- | :--- | :--- | :--- |
| **`bpm`** | `number` | `40` 〜 `260` | `120` | グローバルマスターテンポ |
| **`pages`** | `object` | ページID (`"0"`, `"1"` ...) をキーとするマップ | - | ページ構造体（`"0"` がメイン画面） |
| **`pages["0"].name`** | `string` | 任意の文字列 | `"MAIN"` | ページ識別名 |
| **`pages["0"].slots`** | `object` | `"0"` 〜 `"127"` をキーとするモジュール配置マップ | - | スロットとモジュールIDの1対1対応 |
| **`pages["0"].modules`**| `object` | モジュールIDをキーとするモジュール定義マップ | - | 各モジュールの内部パラメータ |
| **`pages["0"].connections`** | `array` | 短縮結線文字列の配列 | `[]` | ケーブル結線リスト |

---

## 3. グリッド配置とスロット座標系 (Grid & Slots)

### 3.1 グローバル電圧規格（全モジュール共通）
Gridsynth エンジン内のすべての入出力ポートは、以下の4大シグナル電圧規格に準拠します。

| 信号種別 | 範囲 | 単位 / 基準 | 動作特性・クリップ挙動 |
| :--- | :--- | :--- | :--- |
| **Audio (音響信号)** | `±1.0V` | 0dBFS (`1.0V = 0dB`) | `±1.0V` を超えると soft-clipping、`±2.0V` で hard-clipping（Section 9.4 参照） |
| **Pitch CV (音程制御)** | `1V/Oct` | `1.0V = 1オクターブ` (1半音 = $1/12\text{V} \approx 0.08333\text{V}$) | $CV = (MIDI - 24) / 12$（Section 6.1 参照） |
| **Control CV (変調)** | `0.0V 〜 1.0V` (Uni)<br>`±1.0V` (Bi) | パラメータ変調幅 | モジュールによりユニポーラ/バイポーラを切り替え可能 |
| **Gate / Trigger** | `0.0V` / `1.0V` | デジタル二値信号 | 閾値 `0.5V`（Low: `< 0.5V`, High: `≥ 0.5V`） |

### 3.2 128スロット座標レイアウト（4列 × 32行・縦スクロール）
Gridsynth は **横4列（Col 0〜3）**、**縦32行（Row 0〜31）** の計128スロット構成です。
スロット番号と行列座標の対応関係:
- $\text{slot} = \text{row} \times 4 + \text{col}$
- $\text{col} = \text{slot} \pmod 4, \quad \text{row} = \lfloor \text{slot} / 4 \rfloor$

```text
        Col 0        Col 1        Col 2        Col 3
Row 0:  [  0 ]       [  1 ]       [  2 ]       [  3 ]  <-- [3] は SPK1 推奨位置
Row 1:  [  4 ]       [  5 ]       [  6 ]       [  7 ]
Row 2:  [  8 ]       [  9 ]       [ 10 ]       [ 11 ]
Row 3:  [ 12 ]       [ 13 ]       [ 14 ]       [ 15 ]
Row 4:  [ 16 ]       [ 17 ]       [ 18 ]       [ 19 ]
 ...    ...          ...          ...          ...
Row 31: [ 124]       [ 125]       [ 126]       [ 127]
```
- **配置ルール**:
  1. `slots` のキーは文字列のインデックス（`"0"` 〜 `"127"`）です。
  2. `modules` で定義したモジュールIDは、必ず `slots` のいずれか1つの位置に重複なくマッピングしてください。
  3. 標準的な信号フロー配置 (左から右、上から下へ流れる自然なレイアウト):
     - `Col 0`: クロック・テンポ同期・トリガー（`CLK`, `DIV`, `LOGIC` 等）
     - `Col 1`: シーケンサー・変調源（`SEQ8`, `SEQ16`, `PAT`, `MARKOV`, `LFO`, `ENV` 等）
     - `Col 2`: 音源・音色加工（`VCO`, `NOISE`, `FMx3`, `VCF`, `FOLD` 等）
     - `Col 3`: 出力・アンプ・空間系（`VCA`, `PAN`, `DELAY`, `REVERB`, `SPK` 等）
     - ※Row 0 の Col 3（スロット `"3"`）はデフォルトのメイン出力 `SPK1` 推奨位置です。

---

## 4. ケーブル結線ルール (Connections)

`connections` 配列は、パッチ内の全モジュール間の結線を定義する**唯一の情報源**です。

### 4.1 構文フォーマット
```text
"送信元モジュールID:出力ポート > 送信先モジュールID:入力ポート"
```
- 接続は**必ず出力ポート（`_out`）から入力ポート（`_in`）へ**向けて記述してください。逆方向（`_in > _out`）や未定義ポートはインポートエラーとなります。
- **1対多（分岐接続）**: 1つの出力ポートから複数の入力ポートへ接続可能です（例: クロック分配、ピッチCV分配）。
- **多対1（合算接続）**: 複数の出力ポートを1つの入力ポートへ接続した場合、入力信号は**自動的に加算（サミング）**されます（例: シーケンサーCVとキーボードCVのリアルタイム移調加算）。
- **自己ループの禁止**: 同一モジュールでの無効な自己接続（例: `DELAY1:wave_out > DELAY1:wave_in`）は禁止です。

---

## 5. モジュール辞書 (Module Catalog)

### 5.1 音源系 (Sound Generators)

#### `VCO`
アナログモデリング・マルチ波形オシレーター。最大4ボイスのパラフォニック（コード/ユニゾン）対応。
- **IN**: `cv_in` (Pitch CV / Voice 1), `cv_in2..4` (Voice 2..4 CV), `sync_in` (Hard Sync), `fm_in` (Audio FM), `pwm_in` (PWM CV)
- **OUT**: `wave_out` (Audio)
- **PARAMS**:
  | キー | 型 | 範囲 | デフォルト | 説明 |
  | :--- | :--- | :--- | :--- | :--- |
  | `wave` | `string` | `"sawtooth"`, `"square"`, `"triangle"`, `"sine"`, `"noise"` | `"sawtooth"` | 基本波形 |
  | `freq1` | `number` | `20` 〜 `2000` | `110` | 基準周波数(Hz) |
  | `channels` | `number` | `1` 〜 `4` | `1` | 発音ボイス数 |
  | `pwm` | `number` | `0.05` 〜 `0.95` | `0.5` | 矩形波パルス幅 |

#### `FMx3`
内包ADSR付き3オペレータ位相変調（Phase Modulation: PM）音源。キック、スネア、ハット、FMベース、金属ベルに最適。
- **IN**: `cv_in` (Pitch CV), `gate_in` (Gate/Trig: 3オペレータの内包ADSRを一括トリガー)
- **OUT**: `wave_out` (Audio)
- **PARAMS**:
  | キー | 型 | 範囲 | デフォルト | 説明 |
  | :--- | :--- | :--- | :--- | :--- |
  | `algorithm` | `number` | `1`, `2`, `3` | `1` | FM接続トポロジー（下記） |
  | `rootMidi` | `number` | `24` 〜 `72` | `48` | 基準MIDIノート |
  | `op1`, `op2`, `op3` | `object` | オペレータ構造体 | - | オペレータパラメータ |
- **3つのアルゴリズム (`algorithm`)**:
  - `1` (CASCADE / 直列): `Op3 -> Op2 -> Op1 -> OUT`。金属音、ベル、FMリード、ディープベース。
  - `2` (DUAL MOD / 並列変調): `(Op3 + Op2) -> Op1 -> OUT`。パンチの効いたキック、タム、アタック感のあるドラム。
  - `3` (FM+LAYER / サミング合算): `(Op2 -> Op1) + Op3 -> OUT`。スネアドラム（Op3ホワイトノイズ ＋ Op1/2トーン胴鳴り）。
- **オペレータ構造体 (`op1..3`)**:
  `ratio` (周波数倍率比 0.125〜16), `level` (ゲイン/変調指数 0〜10), `attack` (0.001〜5s), `decay` (0.005〜10s), `sustain` (0〜1.0), `release` (0.005〜10s), `curve` (`"lin"|"exp"|"log"`), `feedback` (`op3`専用 0〜1.0), `wave` (`op3`専用 `"sine"|"noise"`)

#### `FMCORE`
外部変調波を流し込めるモジュラー位相変調オシレーターコア。
- **IN**: `cv_in` (Pitch CV), `mod_in` (外部変調オーディオ), `index_cv` (変調指数CV)
- **OUT**: `wave_out` (Audio)
- **PARAMS**: `ratio` (0.125〜16), `fine` (-100〜+100 cent), `index` (0〜10), `feedback` (0〜1), `rootMidi` (24〜72), `level` (0〜1)

#### `NOISE`
アナログシンセシスのドラム・効果音用ホワイトノイズ源。
- **IN**: なし | **OUT**: `wave_out` (Audio) | **PARAMS**: なし

---

### 5.2 音色加工系 (Filters & Waveshapers)

#### `VCF`
自己発振可能なレゾナント・マルチモードフィルター。
- **IN**: `wave_in` (Audio), `cv_in` (カットオフ変調CV)
- **OUT**: `wave_out` (Audio)
- **PARAMS**: `filterType` (`"lowpass"`, `"highpass"`, `"bandpass"`, `"notch"`), `cutoff` (20〜18000 Hz), `q` (0.5〜20.0), `modDepth` (-10000〜+10000 Hz)

#### `FOLD`
ウェストコースト・スタイルのウェーブフォルダー。入力波形を折り畳んで倍音を付加。
- **IN**: `wave_in` (Audio), `gain_cv` (フォールド変調CV) | **OUT**: `wave_out` (Audio)
- **PARAMS**: `gain` (0〜8.0), `mix` (0〜1.0)

---

### 5.3 アンプ・変調・制御系 (Amps, Envelopes & Modulators)

#### `VCA`
ボルテージコントロールドアンプ。
- **IN**: `wave_in` (Audio), `cv_in` (音量変調CV) | **OUT**: `wave_out` (Audio)
- **PARAMS**: `level` (バイアスゲイン 0〜1.0), `cvDepth` (CV変調感度 0〜2.0)
  *(※ `cv_in` 結線時は通常 `level: 0.0` とし、ADSR で開閉します)*

#### `ADSR`
アタック・ディケイ・サスティン・リリース エンベロープジェネレーター。
- **IN**: `gate_in` (ゲートパルス) | **OUT**: `cv_out` (0.0V〜1.0V CV)
- **PARAMS**: `attack` (0.001〜10s), `decay` (0.005〜10s), `sustain` (0〜1.0), `release` (0.005〜10s), `attackCurve`, `decayCurve`, `releaseCurve` (-1.0〜+1.0)

#### `LFO`
低周波変調オシレーター。
- **IN**: `freq_cv_in` (レート変調CV ※旧名 `cv_in` / `rate_cv` は無効), `trig_in` (位相リセット)
- **OUT**: `cv_out` (CV)
- **PARAMS**: `waveType` (`"sine"`, `"triangle"`, `"sawtooth"`, `"ramp"`, `"square"`), `polarity` (`"bipolar"`, `"unipolar"`), `syncMode` (`"free"`, `"sync"`), `rate` (0.05〜30Hz), `division` (`"1/4"`, `"1/8"` 等), `depth` (0〜5.0V), `duty` (0.01〜0.99), `phase` (0〜360)

#### `SH`
サンプル＆ホールド。未結線時は内部ホワイトノイズを自動サンプリング。
- **IN**: `cv_in` (サンプリング対象CV), `trig_in` (サンプリング実行トリガー) | **OUT**: `cv_out` (保持CV)
- **PARAMS**: `glide` (0〜0.5s), `scale` (-3.0〜+3.0), `polarity` (`"unipolar"`, `"bipolar"`)

#### `MATH1` / `MATH2`
1変数・2変数の算術・比較・ブール論理演算モジュール。
- **IN**: `cv_in_a`, `cv_in_b` (MATH2のみ) | **OUT**: `cv_out`
- **PARAMS**: `mode` (`"ADD"`, `"MULTI"`, `"DIFF"`, `"MOD"`, `"NOT"`, `"AND"`, `"OR"`, `"NAND"`, `"NOR"`, `"XOR"`, `"<"`, `">"` 等), `valA` (-10〜+10), `valB` (-10〜+10)
  *(※ `cv_in_a` 未結線時は `valA` の固定値がそのまま使用されます)*

#### `SCALE`
未調律CVを音楽的スケールに吸着するクオンタイザー。
- **IN**: `cv_in` (未調律CV) | **OUT**: `cv_out` (1V/Oct CV)
- **PARAMS**: `scale` (`"chromatic"`, `"major"`, `"minor"`, `"pentatonic"`, `"dorian"`, `"mixolydian"`, `"blues"`), `root` (0〜11, 0=C)

#### `STATE4`
クロックごとに4つのステートを順次ラッチ切り替えする直流スイッチ。
- **IN**: `gate_in` | **OUT**: `cv_out1..4` (アクティブ時 1.0V DC) | **PARAMS**: `steps` (2〜4), `mode` (`"up"`, `"down"`, `"updown"`, `"random"`)

---

### 5.4 シーケンサー・コントローラー系 (Sequencers & IO)

#### `CLK`
BPMテンポ同期マスタークロック。
- **IN**: `power_in` (動作イネーブル: Highで動作、Lowで停止。未結線時は常時動作) | **OUT**: `gate_out` (クロックパルス)
- **PARAMS**: `div` (`"/16"`〜`"/2"`, `"x1"`〜`"x16"`), `pulseWidthMs` (1〜500ms), `limitPct` (10〜90%)

#### `SEQ8` / `SEQ16`
アナログスタイル・ステップシーケンサー。
- **IN**: `gate_in` | **OUT**: `cv_out` (Pitch CV), `gate_out` (Gate)
- **PARAMS**: `quantize` (`true`), `steps` (最大8または16のステップ配列。配列長未満の場合は可変長ループ)
  - ステップオブジェクト: `{ "cv": 0.25, "active": true, "cvActive": true, "gate": true }`

#### `PAT`
Strudel / TidalCycles 風テキストパターンシーケンサー。
- **IN**: `power_in` | **OUT**: `cv_out` (Pitch CV), `gate_out` (Gate)
- **PARAMS**: `pattern` (ミニ記法文字列), `cycleBeats` (1, 2, 4, 8), `gateLen` (0.05〜0.95)
- **Strudel ミニ記法**:
  - `c3 d3 e3 g3`: 均等分割4ステップ
  - `~`: 休符（例: `c3 ~ e3 ~`）
  - `[c3 e3]`: サブステップ細分化（例: `c3 [e3 g3] a3`）
  - `c3*2`: 拍内連打（例: `c3*4`）
  - `c3@2 e3@1`: 重み付け長（c3が2倍長、e3が1倍長）

#### `MARKOV`
確率的状態遷移シーケンサーノード。
- **IN**: `gate_in` (クロック), `trans_in` (遷移バトン入力)
- **OUT**: `trans_out1..3` (遷移パルス), `startgate_out` (遷移直後ワンショット), `gate_out` (通過パルス列), `longgate_out` (持続ゲート), `cv_out` (Pitch CV)
- **PARAMS**: `rootMidi` (24〜72), `quantize` (`true`), `holdClocks` (1〜16), `initOn` (boolean: ネットワーク内で1台のみ `true`), `weights` (長さ4のウェイト配列 `[self, out1, out2, out3]`。インデックス0はTRANS_OUT 0自己ノーマライズ結線)

#### `CHORD` / `ARP`
コード生成器およびアルペジエーター。
- **CHORD**: IN: `cv_in` | OUT: `cv_out1..4` | PARAMS: `chordType` (`"maj"`, `"min"`, `"7"`, `"maj7"`, `"m7"`, `"dim"`, `"sus4"` 等), `inversion` (0〜3)
- **ARP**: IN: `cv_in1..4` (Auto-Sense結線), `gate_in` | OUT: `cv_out`, `gate_out` | PARAMS: `mode` (`"up"`, `"down"`, `"updown"`, `"random"`), `octaves` (1〜3)

---

### 5.5 出力・エフェクト系 (Mix & Output)

#### `MIX`
多チャンネル・オーディオミキサー。
- **IN**: `wave_in1..4` | **OUT**: `wave_out` | **PARAMS**: `channels` (2〜4), `lvl1..4` (0〜1.0)

#### `DELAY` / `REVERB`
空間系エフェクター。
- **DELAY**: IN: `wave_in` | OUT: `wave_out` | PARAMS: `delayTime` (0.01〜1.0s), `feedback` (0〜0.9), `mix` (0〜1.0)
- **REVERB**: IN: `wave_in` | OUT: `wave_out` | PARAMS: `decay` (0.1〜10s), `mix` (0〜1.0)

#### `SPK`
マスターオーディオ出力（スピーカー）。
- **IN**: `wave_in_l`, `wave_in_r` (**※単一の `wave_in` は存在しません**) | **OUT**: なし | **PARAMS**: `masterVol` (0〜1.0)

---

## 6. 音階と 1V/Oct ピッチ計算式 (Musical Pitch & Math)

### 6.1 ピッチCV計算式
Gridsynth は、ユーロラック規格の **1.0V = 1オクターブ（12半音）** に厳格に準拠しています。

$$\text{CV} = \frac{\text{MIDI\_Note} - 24}{12}$$

**代表例:**
- **C1** (MIDI 24 / 最低基準音): `0.0000V`
- **D1** (MIDI 26 / 全音上): `0.1667V`
- **C2** (MIDI 36 / 1 Oct上 - ベース基準): `1.0000V`
- **C3** (MIDI 48 / 2 Oct上 - リード基準): `2.0000V`
- **G3** (MIDI 55 / 2 Oct半音7): `2.5833V`
- **C4** (MIDI 60 / 3 Oct上): `3.0000V`

---

## 7. 完全実動パッチレシピ (Complete Patch Recipes)

以下のJSONは、そのままGridsynthにインポートして即座に演奏可能な完全なパッチレシピです。

### 【レシピ 1】303 アシッドベース（VCO + VCF + ENV + DELAY）
```json
{
  "bpm": 128,
  "pages": {
    "0": {
      "name": "AcidBass",
      "slots": {
        "0": "CLK1",
        "1": "SEQ8_1",
        "2": "VCO1",
        "3": "SPK1",
        "4": "ADSR1",
        "6": "VCF1",
        "7": "DELAY1",
        "8": "VCA1"
      },
      "modules": {
        "CLK1": { "type": "CLK", "div": "x2", "pulseWidthMs": 20 },
        "SEQ8_1": {
          "type": "SEQ8",
          "quantize": true,
          "steps": [
            { "cv": 0.0, "active": true, "cvActive": true, "gate": true },
            { "cv": 0.0, "active": true, "cvActive": true, "gate": true },
            { "cv": 0.25, "active": true, "cvActive": true, "gate": true },
            { "cv": 0.0, "active": true, "cvActive": true, "gate": true },
            { "cv": 1.0, "active": true, "cvActive": true, "gate": true },
            { "cv": 0.5, "active": true, "cvActive": true, "gate": true },
            { "cv": 0.25, "active": true, "cvActive": true, "gate": true },
            { "cv": 0.75, "active": true, "cvActive": true, "gate": true }
          ]
        },
        "VCO1": { "type": "VCO", "wave": "sawtooth", "freq1": 65.4, "channels": 1 },
        "VCF1": { "type": "VCF", "filterType": "lowpass", "cutoff": 450, "q": 8.0, "modDepth": 3200 },
        "ADSR1": { "type": "ADSR", "attack": 0.005, "decay": 0.18, "sustain": 0.1, "release": 0.1 },
        "VCA1": { "type": "VCA", "level": 0.0, "cvDepth": 1.0 },
        "DELAY1": { "type": "DELAY", "delayTime": 0.234, "feedback": 0.45, "mix": 0.35 },
        "SPK1": { "type": "SPK", "masterVol": 0.2 }
      },
      "connections": [
        "CLK1:gate_out > SEQ8_1:gate_in",
        "SEQ8_1:gate_out > ADSR1:gate_in",
        "SEQ8_1:cv_out > VCO1:cv_in",
        "ADSR1:cv_out > VCF1:cv_in",
        "ADSR1:cv_out > VCA1:cv_in",
        "VCO1:wave_out > VCF1:wave_in",
        "VCF1:wave_out > VCA1:wave_in",
        "VCA1:wave_out > DELAY1:wave_in",
        "DELAY1:wave_out > SPK1:wave_in_l",
        "DELAY1:wave_out > SPK1:wave_in_r"
      ]
    }
  }
}
```

### 【レシピ 2】FM クリスタルベル（FMx3 + REVERB）
```json
{
  "bpm": 115,
  "pages": {
    "0": {
      "name": "FMBells",
      "slots": {
        "0": "CLK1",
        "1": "SEQ8_1",
        "2": "FMx3_1",
        "3": "SPK1",
        "6": "REVERB1"
      },
      "modules": {
        "CLK1": { "type": "CLK", "div": "x2", "pulseWidthMs": 20 },
        "SEQ8_1": {
          "type": "SEQ8",
          "quantize": true,
          "steps": [
            { "cv": 2.0, "active": true, "cvActive": true, "gate": true },
            { "cv": 2.25, "active": true, "cvActive": true, "gate": true },
            { "cv": 2.5, "active": true, "cvActive": true, "gate": true },
            { "cv": 2.75, "active": true, "cvActive": true, "gate": true },
            { "cv": 3.0, "active": true, "cvActive": true, "gate": true },
            { "cv": 2.75, "active": true, "cvActive": true, "gate": true },
            { "cv": 2.5, "active": true, "cvActive": true, "gate": true },
            { "cv": 2.25, "active": true, "cvActive": true, "gate": true }
          ]
        },
        "FMx3_1": {
          "type": "FMx3",
          "algorithm": 1,
          "rootMidi": 60,
          "op1": { "ratio": 1.0, "level": 1.0, "attack": 0.001, "decay": 1.5, "sustain": 0.0, "release": 0.5 },
          "op2": { "ratio": 2.76, "level": 1.8, "attack": 0.001, "decay": 0.8, "sustain": 0.0, "release": 0.3 },
          "op3": { "ratio": 5.4, "level": 1.2, "attack": 0.001, "decay": 0.4, "sustain": 0.0, "release": 0.2, "feedback": 0.2 }
        },
        "REVERB1": { "type": "REVERB", "decay": 3.5, "mix": 0.45 },
        "SPK1": { "type": "SPK", "masterVol": 0.18 }
      },
      "connections": [
        "CLK1:gate_out > SEQ8_1:gate_in",
        "SEQ8_1:gate_out > FMx3_1:gate_in",
        "SEQ8_1:cv_out > FMx3_1:cv_in",
        "FMx3_1:wave_out > REVERB1:wave_in",
        "REVERB1:wave_out > SPK1:wave_in_l",
        "REVERB1:wave_out > SPK1:wave_in_r"
      ]
    }
  }
}
```

### 【レシピ 3】マルコフ連鎖アンビエント（MARKOV x3 永久自動生成）
```json
{
  "bpm": 100,
  "pages": {
    "0": {
      "name": "MarkovAmb",
      "slots": {
        "0": "CLK1",
        "1": "MARKOV1",
        "2": "VCO1",
        "3": "SPK1",
        "4": "MARKOV2",
        "5": "MARKOV3",
        "6": "VCF1",
        "7": "REVERB1",
        "8": "ADSR1",
        "10": "VCA1"
      },
      "modules": {
        "CLK1": { "type": "CLK", "div": "x1", "pulseWidthMs": 25 },
        "MARKOV1": { "type": "MARKOV", "rootMidi": 48, "initOn": true, "holdClocks": 2, "weights": [3, 0, 4, 2] },
        "MARKOV2": { "type": "MARKOV", "rootMidi": 51, "initOn": false, "holdClocks": 3, "weights": [2, 3, 0, 3] },
        "MARKOV3": { "type": "MARKOV", "rootMidi": 55, "initOn": false, "holdClocks": 2, "weights": [4, 2, 3, 0] },
        "VCO1": { "type": "VCO", "wave": "sawtooth", "freq1": 130.81, "channels": 1 },
        "VCF1": { "type": "VCF", "filterType": "lowpass", "cutoff": 700, "q": 4.5, "modDepth": 1800 },
        "ADSR1": { "type": "ADSR", "attack": 0.05, "decay": 0.35, "sustain": 0.2, "release": 0.4 },
        "VCA1": { "type": "VCA", "level": 0.0, "cvDepth": 1.0 },
        "REVERB1": { "type": "REVERB", "decay": 4.0, "mix": 0.5 },
        "SPK1": { "type": "SPK", "masterVol": 0.18 }
      },
      "connections": [
        "CLK1:gate_out > MARKOV1:gate_in",
        "CLK1:gate_out > MARKOV2:gate_in",
        "CLK1:gate_out > MARKOV3:gate_in",
        "MARKOV1:trans_out2 > MARKOV2:trans_in",
        "MARKOV1:trans_out3 > MARKOV3:trans_in",
        "MARKOV2:trans_out1 > MARKOV1:trans_in",
        "MARKOV2:trans_out3 > MARKOV3:trans_in",
        "MARKOV3:trans_out1 > MARKOV1:trans_in",
        "MARKOV3:trans_out2 > MARKOV2:trans_in",
        "MARKOV1:cv_out > VCO1:cv_in",
        "MARKOV2:cv_out > VCO1:cv_in",
        "MARKOV3:cv_out > VCO1:cv_in",
        "MARKOV1:startgate_out > ADSR1:gate_in",
        "MARKOV2:startgate_out > ADSR1:gate_in",
        "MARKOV3:startgate_out > ADSR1:gate_in",
        "ADSR1:cv_out > VCF1:cv_in",
        "ADSR1:cv_out > VCA1:cv_in",
        "VCO1:wave_out > VCF1:wave_in",
        "VCF1:wave_out > VCA1:wave_in",
        "VCA1:wave_out > REVERB1:wave_in",
        "REVERB1:wave_out > SPK1:wave_in_l",
        "REVERB1:wave_out > SPK1:wave_in_r"
      ]
    }
  }
}
```

---

## 8. サブパッチアーキテクチャ（マルチページ仕様）

### 8.1 表裏対称 14ピン体系
サブパッチ（`SUB` / `SUB_IO`）は、親画面（Page 0）と子画面（Page 1〜）を物理ピン 1〜14 でブリッジします。

| スロット | 信号の向き | 親側（`SUB`） | 子側（`SUB_IO`） | 主な伝達信号 |
| :---: | :---: | :---: | :---: | :--- |
| **1 〜 7** | **親 ➔ 子（送り）** | **`PIN1_in` 〜 `PIN7_in`** | **`PIN1_out` 〜 `PIN7_out`** | クロック、ゲート、ピッチCV、変調CV |
| **8 〜 14** | **子 ➔ 親（戻り）** | **`PIN8_out` 〜 `PIN14_out`** | **`PIN8_in` 〜 `PIN14_in`** | 完成オーディオ (L/R)、内部ENV還元 |

- **推奨ピン割り当て**:
  - `PIN5`: 左下コーナー一次ピッチCV入力
  - `PIN4`: 左下ゲート/トリガー入力
  - `PIN10`: 右下コーナー完成オーディオ出力 (Mono/L)
  - `PIN9`: 底辺右完成オーディオ出力 (R)

---

## 9. 補遺：未結線デフォルト・実行順序・クリッピング

### 9.1 未結線ポートのデフォルト挙動
| モジュール | ポート名 | 種別 | 未結線時のデフォルト挙動 |
| :--- | :--- | :--- | :--- |
| **`VCA`** | `cv_in` | Control CV | 結線なし時は `level` パラメータのバイアス値がそのまま固定ゲインとして使用される |
| **`VCF`** | `cv_in` | Pitch/Mod CV | `0.0V`（カットオフは `cutoff` スライダ値のみで決定） |
| **`ADSR`** | `gate_in` | Gate | Low (`0.0V`) 扱い。トリガーされず `cv_out` は `0.0V` を維持 |
| **`CLK`** | `power_in` | Gate | High (`1.0V`) 扱い。未結線時は常時クロックパルスを発振 |
| **`LFO`** | `freq_cv_in` | CV | `0.0V`（`rate` スライダ値の基本周波数で動作） |
| **`SH`** | `cv_in` | CV | **内部ホワイトノイズ源に自動接続**（トリガー入力のみでランダムCVを生成可能） |
| **`MATH1/2`** | `cv_in_a/b` | CV | 未結線時は `valA`, `valB` パラメータの定数値がそのまま使用される |

### 9.2 信号フロー実行順序
1. **DAG トポロジカルソート実行**: パッチの結線グラフは有向非巡回グラフ（DAG）として上流から下流へ評価されます。
2. **閉路（Feedback Loop）の禁止**: 同一オーディオサンプリング周期内での自己ループは禁止です（必ず `DELAY` や `SUB` 等の遅延要素を経由してください）。

### 9.3 オーディオクリップ・飽和ポリシー
- **±1.0V (0dBFS)**: 完全リニアなクリーン増幅領域。
- **±1.0V 〜 ±2.0V**: $\tanh$ によるアナログライクなソフトクリッピング飽和。
- **> ±2.0V**: ハードクリッピング（デジタルクリップ）。
- ※ 複数音源を合算する場合は、必ず `MIX` モジュールを経由し、各チャンネルレベルを `0.6 〜 0.75` に設定してクリッピングを回避してください。

### 9.4 MARKOV 遷移確率の計算式
滞在カウントダウン（`holdClocks`）が $0$ に達したクロック時点で、各出力 $j$（0: 自己再帰 TRANS_OUT 0, 1〜3: 外部 trans_out1..3）への遷移確率 $P_j$ は以下で計算されます：

$$P_j = \frac{\text{weights}[j]}{\sum_{k=0}^3 \text{weights}[k]} \quad (j \in \{0, 1, 2, 3\})$$

※ `weights[0]` は外部端子を持たず、モジュール内部で直結（ノーマライズ）された自己留まり（Self）重みです。

---

## 10. 外部 AI 向け指示プロンプトテンプレート

外部の AI（ChatGPT, Claude, Gemini, Cursor 等）に曲作りやパッチ作成を指示する際は、以下のプロンプトをそのままコピーして入力してください。

```text
あなたはモジュラーシンセサイザー "Gridsynth" のプロフェッショナル・サウンドデザイナーです。
Gridsynth AI Patch Generation & Composition Specification の仕様に厳密に従い、Gridsynth で即座にインポート・再生可能な完全なパッチ JSON を単一の ```json コードブロックのみで出力してください。

【出力ルール】:
1. 前置きや挨拶、解説テキストは一切省き、Gridsynth にそのままインポートできる単一の ```json コードブロックのみを出力してください。
2. すべての接続は "connections" 配列内に "送信元ID:ポート > 送信先ID:ポート" の形式で記述し、必ず出力端子（_out）から入力端子（_in）へ結線してください。
3. 最終オーディオ出力は、必ず SPK1 の "wave_in_l" および "wave_in_r" に結線してください（※単一の "wave_in" は存在しません）。
4. slots のキー ("0"〜"127") と modules のモジュールIDを重複なく1対1で漏れなくマッピングしてください（横4列: Col 0〜3、縦32行）。Row 0 Col 3（スロット "3"）に SPK1 を配置することを推奨します。
5. グラフ内の無効な自己ループ（例: DELAY1:wave_out > DELAY1:wave_in）は禁止です。
6. 電圧規格: ピッチCVは 1V/Oct (CV = (MIDI - 24) / 12)、オーディオは ±1.0V、ゲート/トリガーは 0.0V / 1.0V (0.5V閾値) です。
7. MARKOV モジュールを使用する場合は、複数ノード（2台以上）を相互に trans_out1..3 と trans_in で結線してください。weights 配列は長さ4（[self, out1, out2, out3]）で指定し、未結線の trans_out に対応する weights[1..3] の値は 0 に設定してください（weights[0] は内部自己ループ重み）。ネットワーク内で必ず1台のみ "initOn": true を設定してください。音源のトリガーには startgate_out（遷移直後ワンショット）または gate_out、longgate_out を使用します（※旧名 transition_out や trig_out は使用不可）。
8. FMx3 モジュールを使用する場合は、3オペレータのRatio比、アルゴリズム（1: CASCADE, 2: DUAL MOD, 3: FM+LAYER）、および各オペレータの内包ADSRを活用して合成してください。スネアやハットのノイズ成分には Op3 の "wave": "noise" が極めて有効です。
```
