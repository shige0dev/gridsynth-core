# Gridsynth AI Patch Generation & Composition Specification (v3.0 Standalone)
> **For AI Assistants (ChatGPT, Claude, Gemini, Cursor, Copilot, etc.)**
> 本仕様書は、外部 AI が **Gridsynth**（Webベース 4列×32行スクロール・モジュラーシンセ＆3Dビジュアライザー）用のパッチデータ（JSON形式）を自律的かつエラーなく設計・作曲・出力するための**完全単一・自己完結型リファレンス仕様書**です。
> 本ドキュメントをチャットプロンプトに添付または貼り付けるだけで、他のファイルを参照することなく、即座にインポート可能な完全動作パッチを出力できます。

---

## 1. システム概要 (Overview)

- **グリッド構造**: **横4列 × 縦32行 = 計128スロット**（インデックス `"0"` 〜 `"127"`、縦スクロール対応）
- **パッチデータ形式**: **完全な単一 JSON オブジェクト**（マークダウン内の ` ```json ` コードブロックとして出力）
- **信号結線方式**: `"送信元モジュールID:出力ポート > 送信先モジュールID:入力ポート"`（または `{ "from": { "moduleId", "port" }, "to": { "moduleId", "port" } }`）
- **再生エンジン**: クロック（`CLK`）またはシーケンサー（`SEQ8` / `SEQ16` / `PAT` / `MARKOV`）駆動のリアルタイム Web Audio / AudioWorklet 合成
- **スピーカー出力**: 最終音声は必ず `SPK1` の `wave_in_l` および `wave_in_r` へ結線
- **映像 / 3D出力**: `OBJECT` / `PATH` / `PARTICLE` / `WAVE3D` (`obj_out`) ➔ 3Dモディファイア (`ROTATE` / `MOVE` / `SCALE` / `VERTEX` / `SCATTER`) ➔ `RENDER` (`video_out`) ➔ `VFX` / `VMIX` ➔ `DISPLAY` (`video_in`)

---

## 2. トップレベル JSON スキーマ (Patch Structure)

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
        "CLK1": { "type": "CLK", "div": "x2", "pulseWidthMs": 15, "limitPct": 90 },
        "SEQ8_1": {
          "type": "SEQ8",
          "quantize": true,
          "keyMode": "loop",
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
| **`pages["0"].connections`** | `array` | 結線文字列（または `{from, to}` オブジェクト）の配列 | `[]` | ケーブル結線リスト |

---

## 3. グリッド配置と信号電圧規格 (Grid & Voltage Standards)

### 3.1 グローバル電圧・信号規格
| 信号種別 | 範囲 | 単位 / 基準 | 動作特性 |
| :--- | :--- | :--- | :--- |
| **Audio (音響信号)** | `±1.0V` | 0dBFS (`1.0V = 0dB`) | `±1.0V` 超で soft-clipping、`±2.0V` で hard-clipping |
| **Pitch CV (音程制御)** | `1V/Oct` | `1.0V = 1オクターブ` (1半音 = $1/12\text{V} \approx 0.08333\text{V}$) | $CV = (MIDI - 24) / 12$ |
| **Control CV (変調)** | `0.0V 〜 1.0V` (Uni)<br>`±1.0V` (Bi) | パラメータ変調幅 | モジュールによりユニポーラ/バイポーラ切替 |
| **Gate / Trigger** | `0.0V` / `1.0V` | デジタル二値信号 | 立ち上がり `> 0.3V` / RUNゲート `≥ 0.4V` |
| **3D Object (`OBJ`)** | 内部パケット | Three.js ジオメトリ / InstancedMesh | `OBJECT` / `PATH` / `PARTICLE` / `WAVE3D` ➔ 修飾 ➔ `RENDER` |
| **Video (`VID`)** | テクスチャ | Three.js / WebGL レンダーターゲット | `RENDER` ➔ `VFX` / `VMIX` ➔ `DISPLAY` |

### 3.2 128スロット座標レイアウト（4列 × 32行・縦スクロール）
- $\text{slot} = \text{row} \times 4 + \text{col}$ (`"0"` 〜 `"127"`)
- **配置の目安**:
  - `Col 0`: クロック・コントローラー・トリガー（`CLK`, `KEY`, `PAD` 等）
  - `Col 1`: シーケンサー・CV変調（`SEQ8`, `SEQ16`, `PAT`, `MARKOV`, `LFO`, `ADSR` 等）
  - `Col 2`: 音源・音色加工・3D生成（`VCO`, `FMx3`, `VCF`, `OBJECT`, `WAVE3D` 等）
  - `Col 3`: ミキサー・出力・映像出力（`MIX`, `VCA`, `REVERB`, `SPK`, `RENDER`, `DISPLAY` 等）

---

## 4. ケーブル結線ルール (Connections)

- **構文**: `"送信元モジュールID:出力ポート > 送信先モジュールID:入力ポート"`
- **1対多（分岐接続）**: 1つの出力から複数の入力へ接続可能（例: `CLK1:gate_out` や `KEY1:gate_out` の分配）。
- **多対1（加算接続）**: 複数の出力を1つの入力へ繋ぐと自動加算されます。
- **自己ループ禁止**: 同一モジュールへの無効な自己接続は禁止です。

---

## 5. モジュール辞書 (Module Catalog)

### 5.1 音源系 (Sound Generators)

#### `VCO`
アナログモデリング・マルチ波形オシレーター（最大4ボイス）。
- **IN**: `cv_in`, `cv_in2..4`, `sync_in`, `fm_in`, `pwm_in` | **OUT**: `wave_out`
- **PARAMS**: `wave` (`"sawtooth"|"square"|"triangle"|"sine"|"noise"`), `freq1` (20〜2000), `channels` (1〜4), `quantize` (boolean), `pwm` (0.05〜0.95)

#### `WAVE`
サンプラー / ループウェーブプレーヤー（`RETRIGGER` / `LOOP` / `PITCH` / `SEMI` / チョップ対応）。
- **IN**: `gate_in` (トリガー), `speed_cv` (速度/ピッチCV) | **OUT**: `wave_out`
- **PARAMS**: `start` (0〜1), `end` (0〜1), `speed` (-2〜2), `loop` (boolean), `retrigger` (boolean), `pitchMode` (boolean)

#### `FMx3`
内包ADSR付き3オペレータPM音源。ドラム・ベル・ベースに最適。
- **IN**: `cv_in` (Pitch CV), `gate_in` (Trigger) | **OUT**: `wave_out`
- **PARAMS**: `algorithm` (`1`: 直列 `Op3->Op2->Op1`, `2`: 並列 `(Op3+Op2)->Op1`, `3`: `(Op2->Op1)+Op3`), `rootMidi` (24〜72), `op1..op3` (`ratio`, `level`, `attack`, `decay`, `sustain`, `release`, `curve`, `op3.feedback`, `op3.wave`: `"sine"|"noise"`)

#### `FMCORE`
外部変調対応のモジュラーPMオシレーターコア。
- **IN**: `cv_in`, `mod_in`, `index_cv` | **OUT**: `wave_out`
- **PARAMS**: `ratio`, `fine`, `index`, `feedback`, `rootMidi`, `level`

#### `NOISE`
ホワイトノイズ源。
- **IN**: なし | **OUT**: `wave_out` | **PARAMS**: なし

---

### 5.2 音色加工系 (Filters & Waveshapers)

#### `VCF`
自己発振可能なレゾナント・マルチモードフィルター。
- **IN**: `wave_in`, `cv_in` | **OUT**: `wave_out`
- **PARAMS**: `filterType` (`"lowpass"|"highpass"|"bandpass"|"notch"`), `cutoff` (20〜18000), `q` (0.5〜20), `modDepth` (-10000〜10000)

#### `FOLD`
ウェーブフォルダー。
- **IN**: `wave_in`, `gain_cv` | **OUT**: `wave_out`
- **PARAMS**: `gain` (0〜8.0), `mix` (0〜1.0)

---

### 5.3 アンプ・変調・CV系 (Amps, Envelopes & CV)

#### `VCA`
ボルテージコントロールドアンプ（`cv_in` 結線時は `level: 0.0` 推奨）。
- **IN**: `wave_in`, `cv_in` | **OUT**: `wave_out` | **PARAMS**: `level` (0〜1.0), `cvDepth` (0〜2.0)

#### `ADSR`
ADSR エンベロープジェネレーター。
- **IN**: `gate_in` | **OUT**: `cv_out` (0〜1.0V) | **PARAMS**: `attack`, `decay`, `sustain`, `release`, `attackCurve`, `decayCurve`, `releaseCurve`

#### `RF` / `AR`
- `RF`: Rise/Fall スルー・サイクリングエンベロープ。IN: `trig_in` / `cv_in` | OUT: `cv_out`, `gate_out`
- `AR`: Attack/Release エンベロープ。IN: `gate_in` | OUT: `cv_out`

#### `LFO`
低周波オシレーター。
- **IN**: `freq_cv_in` (**※旧名 `cv_in` 不可**), `trig_in` | **OUT**: `cv_out`
- **PARAMS**: `waveType` (`"sine"|"triangle"|"sawtooth"|"ramp"|"square"`), `polarity` (`"bipolar"|"unipolar"`), `syncMode` (`"free"|"sync"`), `rate` (0.05〜30Hz), `division`, `depth`, `duty`, `phase`

#### `SH` / `LAG` / `VALUE` / `MATH1` / `MATH2` / `CHORD` / `COUNT` / `LUT` / `MATRIX` / `SWITCH`
- `SH`: IN: `cv_in` (未結線時は内部ノイズ), `trig_in` | OUT: `cv_out` | PARAMS: `glide`, `scale`, `polarity`
- `MATH1` / `MATH2`: IN: `cv_in_a`, `cv_in_b` | OUT: `cv_out` | PARAMS: `mode`, `valA`, `valB`
- `CHORD`: IN: `cv_in` | OUT: `cv_out1..4` | PARAMS: `chordType`, `inversion`
- `VALUE`: 定数/手動スライダ CV 出力。OUT: `cv_out`
- ※ **注意**: 以前の CV 用 `SCALE` モジュールは **3D 空間スケールモディファイア** へ移行しました。音階のクオンタイズ（未調律 CV ➔ 1V/Oct スケール吸着）には **`KEY` モジュール**（`cv_in` ➔ `cv_out`）を使用してください。

---

### 5.4 クロック・シーケンサー・コントローラー系 (Clock, Sequencers & Controllers)

#### `CLK`
BPMテンポ同期マスタークロック。
- **IN**: `reset_in` (立ち上がりで位相リセット ※旧名 `power_in` は廃止) | **OUT**: `gate_out`
- **PARAMS**: `div` (`"/16"`〜`"/2"`, `"x1"`〜`"x16"`), `pulseWidthMs` (1〜500ms), `limitPct` (10〜90%)

#### `SEQ8` / `SEQ16`
ステップシーケンサー（`RUN` ゲート制御＆ `1-SHOT` 対応）。
- **IN**:
  - `gate_in` (PIN 5: クロック入力)
  - `keygate_in` (PIN 6: **RUN ゲート入力** — 未結線時は常時スタンバイでクロック進行。結線時はゲート待機し、High で再生開始、Low で即停止＆リセット)
- **OUT**: `cv_out` (Pitch CV), `gate_out` (Gate)
- **PARAMS**:
  - `quantize`: `true` | `false`
  - `keyMode`: `"loop"` (ゲートONの間ループ) | `"oneshot"` (1周完了で停止、次のゲート立ち上がりまで待機)
  - `steps`: 長さ8または16の配列 `{ "cv": 0.25, "active": true, "cvActive": true, "gate": true }`

#### `PAT`
Strudel / TidalCycles 風テキストパターンシーケンサー（`RUN` ゲート制御＆ `1-SHOT` 対応）。
- **IN**:
  - `reset_in` (PIN 5: 外部リセット)
  - `keygate_in` (PIN 6: **RUN ゲート入力** — 未結線時は常時再生、結線時はゲートONで先頭から再生、ゲートOFFで即停止＆リセット)
- **OUT**: `cv_out` (Pitch CV), `gate_out` (Gate)
- **PARAMS**:
  - `pattern`: ミニ記法文字列（`c2 ~ e2 [g2 a2]`, `<c2 d2>` 等）
  - `cycleBeats`: `1`, `2`, `4`, `8`, `16`, `32` (`BAR = cycleBeats / 4`)
  - `gateLen`: `0.05` 〜 `0.95`
  - `keyMode`: `"loop"` | `"oneshot"` (全サイクル1周で停止)

#### `KEY`
16鍵リボンキーボード 兼 **リアルタイム・スケールクオンタイザー**（複数台配置・独立操作対応）。
- **IN**: `cv_in` (未結線時は鍵盤操作、結線時は入力 CV を指定スケールへクオンタイズして出力)
- **OUT**: `cv_out` (1V/Oct Pitch CV), `gate_out` (鍵盤押下時の Gate 0/1V)
- **PARAMS**:
  - `octave` (1〜6), `root` (0〜11, 0=C), `scale` (`"CHROMATIC"`, `"MAJOR"`, `"MINOR"`, `"PENTATONIC"` 等), `mask` (長さ12の0/1配列)
  - `legato` (boolean, デフォルト `false`): `true` のとき鍵盤を押したまま別鍵盤へ移っても Gate を再トリガーせず音程のみ切り替え

#### `MARKOV` / `DIST4` / `SLCT4` / `PAD`
- `MARKOV`: IN: `gate_in`, `trans_in` | OUT: `trans_out1..3`, `startgate_out`, `gate_out`, `longgate_out`, `cv_out` | PARAMS: `rootMidi`, `quantize`, `holdClocks`, `initOn`, `weights` (`[self, out1, out2, out3]`)
- `DIST4` / `SLCT4`: 1対4 分配 / 4対1 選択スイッチ

---

### 5.5 ミックス・エフェクト・出力系 (Mix, Effects & Output)

#### `MIX`
多チャンネル・オーディオミキサー（チャンネル別 `MUTE` 対応）。
- **IN**: `wave_in1..4` | **OUT**: `wave_out`
- **PARAMS**: `channels` (2〜4), `lvl1..4` (0〜1.0), `mute1..4` (boolean, デフォルト `false`)

#### `DELAY` / `REVERB` / `SPK`
- `DELAY`: IN: `wave_in` | OUT: `wave_out` | PARAMS: `delayTime`, `feedback`, `mix`
- `REVERB`: IN: `wave_in` | OUT: `wave_out` | PARAMS: `decay`, `mix`
- `SPK`: IN: `wave_in_l`, `wave_in_r` (**※単一 `wave_in` 不可**) | PARAMS: `masterVol`

---

### 5.6 3D グラフィックス・映像系 (3D & Video Pipeline)

3Dパイプラインは **`OBJ` (3Dオブジェクト生成・変形) ➔ `RENDER` ➔ `VID` (映像エフェクト/合成) ➔ `DISPLAY`** の順に接続します。

#### 3D ジェネレータ (`obj_out` 出力)
| モジュール | 入力 | 出力 | 主なパラメータ・特徴 |
| :--- | :--- | :--- | :--- |
| **`OBJECT`** | なし | `obj_out` | プリミティブ形状生成 (`shape`: `"torus"`, `"sphere"`, `"box"`, `"cone"`, `"icosahedron"` 等, `material`: `"wire"|"solid"|"toon"|"normal"|"glass"|"point"`, `color`, `glow`, `mirror`) |
| **`PATH`** | `cv_in` | `obj_out` | 2Dライン/円弧/多角形生成 (`shape`: `"line"|"arc"|"poly"`, `renderMode`: `"line"|"fill"`, `points`, `arc`, `sides`, `color`, `glow`) |
| **`PARTICLE`** | `cv_in`, `obj_in`, `gate_in` | `obj_out` | パーティクル散布・バースト（`gate_in` でリシード、`cv_in` で展開変調） |
| **`WAVE3D`** | `wave_in` (Audio), `cv_in` (Gain) | `obj_out` | **音声駆動3Dスクロール地形/ウォーターフォール** (`sourceMode`: `"wave"` 時間波形 / `"spec"` 20Hz-20kHz 対数FFT, `style`: `"ribbon"` ライン / `"point"` ドット / `"bars"` 棒グラフ, `slices`: 16〜64, `cols`: 24〜96, `gain`: 0.2〜4.0, `speed`: 0.2〜2.0, `glow`: 0〜1.0, `color`) |

#### 3D モディファイア (`obj_in` ➔ `obj_out`)
| モジュール | 入力 | 出力 | 主なパラメータ・特徴 |
| :--- | :--- | :--- | :--- |
| **`ROTATE`** | `obj_in`, `cv_in` | `obj_out` | 回転 (`axis`: `"x"|"y"|"z"`, `angle`: ラジアン) |
| **`MOVE`** | `obj_in`, `cv_in` | `obj_out` | 平行移動 (`axis`: `"x"|"y"|"z"`, `offset`) |
| **`SCALE`** | `obj_in`, `cv_in` | `obj_out` | **3D拡大縮小** (`axis`: `"all"|"x"|"y"|"z"`, `scale`: 0.1〜4.0) **※CVクオンタイザーではない** |
| **`VERTEX`** | `obj_in`, `cv_in` | `obj_out` | 頂点ディストーション / 波打ち変調 |
| **`SCATTER`** | `base_in`, `child_in`, `cv_in` | `obj_out` | `base_in` の頂点位置に `child_in` を GPU Instancing 配置 |

#### レンダラー・映像エフェクト・ディスプレイ (`video_in` / `video_out`)
| モジュール | 入力 | 出力 | 主なパラメータ・特徴 |
| :--- | :--- | :--- | :--- |
| **`RENDER`** | `obj_in`, `fov_in` | `video_out` | 3Dシーンをオフスクリーン描画 (`camX`, `camY`, `camZ`, `targetX`, `targetY`, `targetZ`, `fov`, `camRoll`, `materialOverride`) |
| **`VFX`** | `video_in`, `cv_in` | `video_out` | 映像ポストエフェクト (`mode`: `"mosaic"|"glitch"|"trail"|"kaleido"` 等, `amount`: 0〜1.0) |
| **`VMIX`** | `video_in1`, `video_in2`, `cv_in` | `video_out` | 2系統の映像をミキシング (`mode`: `"dissolve"|"add"|"luma"` 等, `mix`: 0〜1.0) |
| **`DISPLAY`** | `video_in` | `video_out` | グリッド上にライブ映像を表示（`divN`: 2 = 2x2 等） |

---

## 6. 音階と 1V/Oct ピッチ計算式 (Musical Pitch & Math)

$$\text{CV} = \frac{\text{MIDI\_Note} - 24}{12}$$

- **C1** (MIDI 24): `0.0000V` / **C2** (MIDI 36): `1.0000V` / **C3** (MIDI 48): `2.0000V` / **G3** (MIDI 55): `2.5833V` / **C4** (MIDI 60): `3.0000V`

---

## 7. 完全実動パッチレシピ (Complete Patch Recipes)

### 【レシピ 1】KEY + SEQ8 (RUN連動) + WAVE3D 3Dオーディオ・ウォーターフォール
鍵盤 (`KEY1`) を押している間だけ `SEQ8_1` がループし、シンセ音と同時に `WAVE3D` による 3D オーディオ地形を `RENDER` ➔ `DISPLAY` に描画するマルチメディアパッチです。

```json
{
  "bpm": 120,
  "pages": {
    "0": {
      "name": "Wave3D_Seq",
      "slots": {
        "0": "KEY1",
        "1": "CLK1",
        "2": "SEQ8_1",
        "3": "SPK1",
        "4": "VCO1",
        "5": "VCF1",
        "6": "ADSR1",
        "7": "VCA1",
        "8": "WAVE3D_1",
        "9": "ROTATE1",
        "10": "RENDER1",
        "11": "DISPLAY1"
      },
      "modules": {
        "KEY1": { "type": "KEY", "octave": 3, "root": 0, "scale": "MINOR", "legato": true },
        "CLK1": { "type": "CLK", "div": "x2", "pulseWidthMs": 15, "limitPct": 90 },
        "SEQ8_1": {
          "type": "SEQ8",
          "quantize": true,
          "keyMode": "loop",
          "steps": [
            { "cv": 0.0, "active": true, "cvActive": true, "gate": true },
            { "cv": 0.583333, "active": true, "cvActive": true, "gate": true },
            { "cv": 0.25, "active": true, "cvActive": true, "gate": true },
            { "cv": 0.833333, "active": true, "cvActive": true, "gate": true },
            { "cv": 0.0, "active": false, "cvActive": true, "gate": true },
            { "cv": 0.0, "active": false, "cvActive": true, "gate": true },
            { "cv": 0.0, "active": false, "cvActive": true, "gate": true },
            { "cv": 0.0, "active": false, "cvActive": true, "gate": true }
          ]
        },
        "VCO1": { "type": "VCO", "wave": "sawtooth", "freq1": 110, "channels": 1, "quantize": true },
        "VCF1": { "type": "VCF", "filterType": "lowpass", "cutoff": 1400, "q": 4.2, "modDepth": 1800 },
        "ADSR1": { "type": "ADSR", "attack": 0.01, "decay": 0.25, "sustain": 0.4, "release": 0.35 },
        "VCA1": { "type": "VCA", "level": 0.0, "cvDepth": 1.0 },
        "SPK1": { "type": "SPK", "masterVol": 0.16 },
        "WAVE3D_1": {
          "type": "WAVE3D",
          "sourceMode": "spec",
          "style": "ribbon",
          "slices": 40,
          "cols": 64,
          "gain": 2.0,
          "speed": 1.0,
          "glow": 0.8,
          "color": "#38bdf8"
        },
        "ROTATE1": { "type": "ROTATE", "axis": "x", "angle": 0.45 },
        "RENDER1": { "type": "RENDER", "camX": 0.0, "camY": 0.8, "camZ": 6.5, "fov": 45 },
        "DISPLAY1": { "type": "DISPLAY", "divN": 2 }
      },
      "connections": [
        "KEY1:gate_out > CLK1:reset_in",
        "KEY1:gate_out > SEQ8_1:keygate_in",
        "CLK1:gate_out > SEQ8_1:gate_in",
        "KEY1:cv_out > VCO1:cv_in",
        "SEQ8_1:cv_out > VCO1:cv_in",
        "SEQ8_1:gate_out > ADSR1:gate_in",
        "ADSR1:cv_out > VCF1:cv_in",
        "ADSR1:cv_out > VCA1:cv_in",
        "VCO1:wave_out > VCF1:wave_in",
        "VCF1:wave_out > VCA1:wave_in",
        "VCA1:wave_out > SPK1:wave_in_l",
        "VCA1:wave_out > SPK1:wave_in_r",
        "VCA1:wave_out > WAVE3D_1:wave_in",
        "WAVE3D_1:obj_out > ROTATE1:obj_in",
        "ROTATE1:obj_out > RENDER1:obj_in",
        "RENDER1:video_out > DISPLAY1:video_in"
      ]
    }
  }
}
```

### 【レシピ 2】303 アシッドベース（VCO + VCF + ADSR + DELAY）
```json
{
  "bpm": 128,
  "pages": {
    "0": {
      "name": "AcidBass",
      "slots": {
        "0": "CLK1", "1": "SEQ8_1", "2": "VCO1", "3": "SPK1",
        "4": "ADSR1", "6": "VCF1", "7": "DELAY1", "8": "VCA1"
      },
      "modules": {
        "CLK1": { "type": "CLK", "div": "x2", "pulseWidthMs": 20 },
        "SEQ8_1": {
          "type": "SEQ8",
          "quantize": true,
          "keyMode": "loop",
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

---

## 8. 外部 AI 向け指示プロンプトテンプレート

外部 AI（ChatGPT, Claude, Gemini, Cursor 等）にパッチ生成を依頼する際は、以下のプロンプトと本仕様書を合わせて入力してください。

```text
あなたはモジュラーシンセ＆3Dビジュアライザー "Gridsynth" のプロフェッショナル・サウンド/ビジュアルデザイナーです。
添付した Gridsynth AI Patch Generation & Composition Specification (v3.0) に厳密に従い、Gridsynth で即座にインポート・再生可能な完全なパッチ JSON を単一の ```json コードブロックのみで出力してください。

【出力ルール】:
1. 前置きや解説テキストは省き、Gridsynth にそのままインポートできる単一の ```json コードブロックのみを出力してください。
2. すべての接続は "connections" 配列内に "送信元ID:ポート > 送信先ID:ポート" の形式で記述し、必ず出力端子から入力端子へ結線してください。
3. 最終オーディオ出力は、必ず SPK1 の "wave_in_l" および "wave_in_r" に結線してください（※単一の "wave_in" は存在しません）。
4. slots ("0"〜"127") と modules のモジュールIDを重複なく1対1でマッピングしてください（4列×32行）。
5. 電圧規格: Pitch CV は 1V/Oct (CV = (MIDI - 24) / 12)、Audio は ±1.0V、Gate は 0.0V / 1.0V。
6. SEQ8 / SEQ16 / PAT を鍵盤等でゲート連動させる場合は "keygate_in" (RUN) に結線し、"keyMode": "loop" または "oneshot" を指定してください（未結線時は常時スタンバイ動作）。
7. CLK のリセットには "reset_in" を使用してください（旧名 power_in は不可）。
8. スケールクオンタイズ（CV ➔ 音階吸着）には KEY モジュール ("cv_in" > "cv_out") を使用してください。SCALE モジュールは 3D オブジェクト拡大縮小専用 ("obj_in" > "obj_out") です。
9. 3D・映像パイプラインは OBJECT/PATH/PARTICLE/WAVE3D (obj_out) ➔ ROTATE/MOVE/SCALE/VERTEX/SCATTER (obj_in > obj_out) ➔ RENDER (obj_in > video_out) ➔ VFX/VMIX ➔ DISPLAY (video_in) の順に接続してください。
```
