# Gridsynth AI Patch Generation & Composition Specification (v3.1 Complete Standalone)
> **For AI Assistants (ChatGPT, Claude, Gemini, Cursor, Copilot, etc.)**
> 本仕様書は、外部 AI が **Gridsynth**（Webベース 4列×32行スクロール・モジュラーシンセ＆3Dビジュアライザー）用のパッチデータ（JSON形式）を自律的かつエラーゼロで設計・作曲・出力するための**完全単一・自己完結型リファレンス仕様書**です。
> Gridsynth のパーサーは**全モジュールの入出力ポート名および方向（OUT ➔ IN）を厳密に検証**し、存在しないポート名や逆方向接続はエラーとして破棄します。必ず本仕様書に記載された正確な `type`・ポート名・パラメータ名を使用してください。

---

## 1. システム概要 (Overview)

- **グリッド構造**: **横4列 (`col: 0〜3`) × 縦32行 (`row: 0〜31`) = 計128スロット**（インデックス `"0"` 〜 `"127"`、縦スクロール対応）
- **パッチデータ形式**: **単一 JSON オブジェクト**（マークダウン内の ` ```json ` コードブロックとして出力）
- **信号結線方式**: `"送信元モジュールID:出力ポート > 送信先モジュールID:入力ポート"`（または `{ "from": { "moduleId", "port" }, "to": { "moduleId", "port" } }`）
- **スピーカー出力**: 最終音声は必ず `SPK1` の **`wave_in_l`** および **`wave_in_r`** へ結線
- **映像 / 3D出力**: `OBJECT` / `PATH` / `PARTICLE` / `WAVE3D` (`obj_out`) ➔ 3Dモディファイア (`ROTATE` / `MOVE` / `SCALE` / `VERTEX` / `SCATTER`) ➔ `RENDER` (`video_out`) ➔ `VFX` / `VMIX` ➔ `DISPLAY` (`video_in`)

---

## 2. トップレベル JSON スキーマ (Patch Structure)

```json
{
  "bpm": 124,
  "pages": {
    "0": {
      "name": "MAIN",
      "slots": {
        "0": "CLK1",
        "1": "SEQ8_1",
        "2": "VCO1",
        "3": "SPK1",
        "5": "ADSR1",
        "6": "VCF1",
        "7": "VCA1"
      },
      "modules": {
        "CLK1": { "type": "CLK", "div": "x2", "pulseWidthMs": 15, "limitPct": 90 },
        "SEQ8_1": {
          "type": "SEQ8",
          "quantize": true,
          "keyMode": "loop",
          "steps": [
            { "cv": 1.0, "active": true, "cvActive": true, "gate": true },
            { "cv": 1.0, "active": true, "cvActive": true, "gate": true },
            { "cv": 1.583333, "active": true, "cvActive": true, "gate": true },
            { "cv": 1.25, "active": true, "cvActive": true, "gate": true },
            { "cv": 1.0, "active": true, "cvActive": true, "gate": true },
            { "cv": 1.833333, "active": true, "cvActive": true, "gate": true },
            { "cv": 1.25, "active": true, "cvActive": true, "gate": true },
            { "cv": 1.583333, "active": true, "cvActive": true, "gate": true }
          ]
        },
        "VCO1": { "type": "VCO", "wave": "sawtooth", "freq1": 65.4, "channels": 1, "quantize": true },
        "VCF1": { "type": "VCF", "filterType": "lowpass", "cutoff": 600, "q": 4.5, "modDepth": 2400 },
        "ADSR1": { "type": "ADSR", "attack": 0.005, "decay": 0.2, "sustain": 0.2, "release": 0.15 },
        "VCA1": { "type": "VCA", "level": 0.0, "cvDepth": 1.0 },
        "SPK1": { "type": "SPK", "masterVol": 0.16 }
      },
      "connections": [
        "CLK1:gate_out > SEQ8_1:gate_in",
        "SEQ8_1:cv_out > VCO1:cv_in",
        "SEQ8_1:gate_out > ADSR1:gate_in",
        "ADSR1:cv_out > VCF1:cv_in",
        "ADSR1:cv_out > VCA1:cv_in",
        "VCO1:wave_out > VCF1:wave_in",
        "VCF1:wave_out > VCA1:wave_in",
        "VCA1:wave_out > SPK1:wave_in_l",
        "VCA1:wave_out > SPK1:wave_in_r"
      ]
    }
  }
}
```

### フィールド定義と整合性ルール
| フィールド | 型 | 必須 / 範囲 | デフォルト | 説明 |
| :--- | :--- | :--- | :--- | :--- |
| **`bpm`** | `number` | `40` 〜 `260` | `120` | グローバルマスターテンポ |
| **`pages`** | `object` | `"0"`, `"1"` ... をキーとするマップ | - | `"0"` がメインページ、`"1"` 以降はサブパッチ用ページ |
| **`pages[p].name`** | `string` | 任意の文字列 | `"MAIN"` | ページ識別名 |
| **`pages[p].slots`** | `object` | `"0"` 〜 `"127"` をキーとするマップ | - | スロット番号（文字列）とモジュールIDの**完全1対1対応** |
| **`pages[p].modules`**| `object` | モジュールIDをキーとするマップ | - | `slots` に登場する全モジュールIDの定義（`type` 必須） |
| **`pages[p].connections`** | `array` | `"ID1:out > ID2:in"` の配列 | `[]` | 必ず `modules` に実在するモジュール間の `OUT ➔ IN` 結線 |

---

## 3. グリッド配置と信号電圧規格 (Grid & Voltage Standards)

### 3.1 グローバル電圧・信号規格
| 信号種別 | 範囲 | 単位 / 基準 | 動作特性・運用ルール |
| :--- | :--- | :--- | :--- |
| **Audio (音響信号)** | `±1.0V` | 0dBFS (`1.0V = 0dB`) | `±1.0V` 超で soft-clipping。複数音源の合成には `MIX` を使用 |
| **Pitch CV (音程制御)** | `1V/Oct` | `0.0V = C1 (MIDI 24)`<br>`1.0V = C2`, `2.0V = C3` | $CV = (\text{MIDI} - 24) / 12$（1半音 $= 1/12\text{V} \approx 0.083333\text{V}$） |
| **Control CV (変調)** | `0.0V 〜 1.0V` (Uni)<br>`±1.0V` (Bi) | パラメータ変調幅 | `COUNT` / `ADSR` / `AR` / `RF` / `LUT` は `0〜1V`、`LFO` は極性選択可 |
| **Gate / Trigger** | `0.0V` / `1.0V` | デジタル二値信号 | トリガー立ち上がり閾値 `> 0.3V` / `SEQ`/`PAT` の RUN 閾値 `≥ 0.4V` |
| **3D Object (`OBJ`)** | 内部パケット | 3D ジオメトリ参照 | `obj_out > obj_in`（または `SCATTER` の `base_in` / `child_in`）のみ接続可 |
| **Video (`VID`)** | テクスチャ | WebGL レンダーターゲット | `video_out > video_in`（または `VMIX` の `video_in1` / `video_in2`）のみ接続可 |

### 3.2 128スロット座標計算と配置設計（4列 × 32行）
$$\text{slot} = \text{row} \times 4 + \text{col} \quad (\text{col} \in \{0, 1, 2, 3\},\ \text{row} \in \{0..31\})$$

| 行 (`row`) | `Col 0` (左端) | `Col 1` (中左) | `Col 2` (中右) | `Col 3` (右端) |
| :---: | :---: | :---: | :---: | :---: |
| **Row 0** | `"0"` | `"1"` | `"2"` | `"3"` (推奨: `SPK1`) |
| **Row 1** | `"4"` | `"5"` | `"6"` | `"7"` |
| **Row 2** | `"8"` | `"9"` | `"10"` | `"11"` |
| **Row 3** | `"12"` | `"13"` | `"14"` | `"15"` |
| **Row 4** | `"16"` | `"17"` | `"18"` | `"19"` |
| **Row 5** | `"20"` | `"21"` | `"22"` | `"23"` |

- **レイアウトのベストプラクティス**:
  - 左から右へ信号が流れるように配置するとケーブルが交差せず美しく視認できます（`Col 0`: `CLK`/`KEY`/`COUNT` ➔ `Col 1`: `SEQ8`/`PAT`/`MATRIX`/`ADSR` ➔ `Col 2`: `VCO`/`FMx3`/`VCF`/`WAVE3D` ➔ `Col 3`: `VCA`/`MIX`/`DELAY`/`SPK`）。
  - `DISPLAY` を 2×2 大画面（`divN: 2`）で使う場合は、隣接する 2×2 スロット（例: Row 2〜3 の Col 2〜3 である `"10"`, `"11"`, `"14"`, `"15"`）に `DISPLAY1..4` を配置してデイジーチェーン接続します（後述 Section 5.7 参照）。

---

## 4. ケーブル結線ルールと頻出エラー防止 (Connection Rules)

1. **構文**: `"送信元ID:出力ポート > 送信先ID:入力ポート"`
2. **1対多（分岐）・多対1（加算）**:
   - 1つの出力端子から複数の入力端子へ分岐可能（例: `CLK1:gate_out` を複数のシーケンサーへ分配）。
   - 複数の `cv_out` を1つの `cv_in` に接続すると**電圧が自動加算**されます（例: `KEY1:cv_out` + `SEQ8_1:cv_out` ➔ `VCO1:cv_in` で、シーケンスを鍵盤でトランスポーズ可能）。
3. **絶対に行ってはいけない結線ミス（パーサーエラーの原因）**:
   - ❌ `SPK1:wave_in` ➔ 存在しません。必ず `SPK1:wave_in_l` と `SPK1:wave_in_r` の2本を接続してください。
   - ❌ `LFO1:cv_in` / `LFO1:trig_in` ➔ 存在しません。LFOの入力は `freq_cv_in` と `reset_in` です。
   - ❌ `CLK1:power_in` ➔ 廃止されました。クロックのリセット入力は `CLK1:reset_in` です。
   - ❌ `VCO1:fm_in` / `VCO1:pwm_in` / `VCO1:sync_in` ➔ 存在しません。VCOの入力は `cv_in`（および `channels` に応じた `cv_in2..4`）のみです。FM変調には `FMx3` または `FMCORE` を使用してください。
   - ❌ `MATRIX1:gate_out1` ➔ 存在しません。MATRIXの出力は `out_1`, `out_2`, `out_3`, `out_4` です。
   - ❌ `SCALE1:cv_in > VCO1:cv_in` ➔ `SCALE` は **3Dオブジェクト拡大縮小モジュール**（`obj_in` ➔ `obj_out`）です。ピッチCVのスケールクオンタイズには **`KEY` モジュール**（`cv_in` ➔ `cv_out`）を使用してください。

---

## 5. 全モジュール完全辞書 (Complete Module Catalog)

### 5.1 音源系 (Sound Generators)

#### `VCO` — アナログモデリング・マルチ波形オシレーター（最大4chポリ/ユニゾン）
- **IN**: `cv_in` (CH1 1V/Oct), `cv_in2` (CH2, `channels >= 2` 時), `cv_in3` (`channels >= 3` 時), `cv_in4` (`channels == 4` 時)
- **OUT**: `wave_out`
- **PARAMS**:
  - `wave`: `"sawtooth"` | `"square"` | `"sine"` | `"triangle"` (デフォルト `"sawtooth"` ※`"noise"` は別モジュール `NOISE` を使用)
  - `channels`: `1` 〜 `4` (デフォルト `1`)
  - `quantize`: `true` | `false` (デフォルト `true`)
  - `freq1`, `freq2`, `freq3`, `freq4`: `20` 〜 `2000` Hz (デフォルト `220`。`cv_in` 結線時は **0V = C1 (32.7Hz)** 基準の 1V/Oct で動作し、未結線時は `freq1` の周波数で発振)

#### `NOISE` — カラーノイズジェネレーター
- **IN**: なし | **OUT**: `wave_out`
- **PARAMS**: `noiseType` (`"white"` | `"pink"` | `"brown"`, デフォルト `"white"`), `tone` (`200`〜`16000` Hz, デフォルト `8000`), `level` (`0.0`〜`1.0`, デフォルト `0.8`)

#### `FMx3` — 内蔵ADSR付き 3オペレータFM/PMシンセサイザー（ベース・ベル・ドラム・金属音）
VCAやADSRを外付けせずに、単体で完成されたポリリズミックな打楽器・ベース・ベルを鳴らせます。
- **IN**: `gate_in` (Trigger), `cv_in` (1V/Oct Pitch CV) | **OUT**: `wave_out`
- **PARAMS**:
  - `algorithm`: `1` (直列 `Op3➔Op2➔Op1`: 金属音・ハードベース), `2` (並列 `(Op3+Op2)➔Op1`: エレピ・ベル・キック), `3` (ハイブリッド `Op3+(Op2➔Op1)`: スネア・アタックレイヤー)
  - `rootMidi`: `24` (C1) 〜 `72` (C5) (デフォルト `48` = C3 ※`cv_in` 未結線時の基準ノート)
  - `op1` (Carrier): `{ "ratio": 1.0, "level": 0.85, "attack": 0.005, "decay": 0.4, "sustain": 0.0, "release": 0.1, "aCurve": "lin", "dCurve": "exp", "rCurve": "exp" }`
  - `op2` (Mod 1): `{ "ratio": 2.0, "level": 1.5, "attack": 0.005, "decay": 0.15, "sustain": 0.0, "release": 0.05, "aCurve": "lin", "dCurve": "exp", "rCurve": "exp" }`
  - `op3` (Mod 2): `{ "ratio": 3.5, "level": 1.8, "feedback": 0.0, "wave": "sine", "attack": 0.005, "decay": 0.05, "sustain": 0.0, "release": 0.02, "aCurve": "lin", "dCurve": "exp", "rCurve": "exp" }` (`wave` は `"sine"` | `"noise"` を選択可)

#### `FMCORE` — モジュラーPMオペレーター（外部オーディオ変調対応）
- **IN**: `cv_in` (1V/Oct), `mod_in` (Audio位相変調入力), `index_cv` (変調量CV) | **OUT**: `wave_out`
- **PARAMS**: `rootMidi` (`24`〜`72`, デフォルト `48`), `level` (`0.0`〜`1.0`, デフォルト `0.85`), `ratio` (`0.25`〜`16.0`, デフォルト `1.0`), `index` (`0.0`〜`5.0`, デフォルト `1.0`), `feedback` (`0.0`〜`1.0`, デフォルト `0.0`), `fine` (`-50`〜`50` cents, デフォルト `0`)

#### `WAVE` — サンプラー / ループ＆チョップ・ウェーブプレーヤー
- **IN**: `gate_in`, `start_cv`, `end_cv`, `speed_cv`, `link_in` | **OUT**: `wave_out`, `link_out`
- **PARAMS**: `start` (`0.0`〜`1.0`), `end` (`0.0`〜`1.0`), `speed` (`-2.0`〜`2.0`), `loop` (boolean), `retrigger` (boolean), `pitchMode` (boolean: `true` で `speed_cv` を 1V/Oct ピッチとして解釈), `semiMode` (boolean), `chopMode` (`"off"` | `"seq"` | `"cv"`)

---

### 5.2 音色加工系 (Filters & Waveshapers)

#### `VCF` — レゾナント・マルチモードフィルター
- **IN**: `wave_in`, `cv_in` | **OUT**: `wave_out`
- **PARAMS**: `filterType` (`"lowpass"` | `"highpass"` | `"bandpass"` | `"notch"`), `cutoff` (`20`〜`20000` Hz, デフォルト `1800`), `q` (`0.1`〜`20.0`, デフォルト `2.5`), `modDepth` (`-5000`〜`5000` cents, デフォルト `1200`)

#### `FOLD` — ウェーブフォルダー（倍音付加・西海岸シンセシス）
- **IN**: `wave_in`, `gain_cv` | **OUT**: `wave_out`
- **PARAMS**: `gain` (`0.0`〜`8.0`, デフォルト `1.5`), `mix` (`0.0`〜`1.0`, デフォルト `1.0`)

---

### 5.3 アンプ・エンベロープ・変調系 (Amps, Envelopes & Modulation)

#### `VCA` — ボルテージコントロールドアンプ
- **IN**: `wave_in`, `cv_in` | **OUT**: `wave_out`
- **PARAMS**: `level` (`0.0`〜`1.0`, デフォルト `1.0` — **`cv_in` にエンベロープを結線する場合はベース音漏れを防ぐため `"level": 0.0` に設定すること**), `cvDepth` (`0.0`〜`2.0`, デフォルト `1.0`)

#### `ADSR` — 4ステージ・エンベロープジェネレーター
- **IN**: `gate_in` | **OUT**: `cv_out` (`0.0V` 〜 `1.0V`)
- **PARAMS**: `attack` (`0.001`〜`2.0`s, デフォルト `0.02`), `decay` (`0.005`〜`3.0`s, デフォルト `0.2`), `sustain` (`0.0`〜`1.0`, デフォルト `0.6`), `release` (`0.005`〜`5.0`s, デフォルト `0.4`), `aCurve` / `dCurve` / `rCurve` (`"lin"` | `"exp"` | `"log"`)

#### `AR` — アタック・リリース・エンベロープ
- **IN**: `gate_in`, `attack_in`, `release_in` | **OUT**: `cv_out`
- **PARAMS**: `attack` (`0.005`〜`2.0`s, デフォルト `0.05`), `release` (`0.005`〜`3.0`s, デフォルト `0.2`), `level` (`0.0`〜`1.0`, デフォルト `1.0`)

#### `RF` — ライズ・フォール・ファンクションジェネレーター（EOCトリガー出力付き）
- **IN**: `trig_in`, `time_cv`, `peak_cv` | **OUT**: `cv_out`, `trig_out` (サイクル完了時にパルス出力。`trig_out > trig_in` の自己ループは不可だが、2台の `RF` でピンポン連鎖可能)
- **PARAMS**: `time` (`0.02`〜`2.0`s, デフォルト `0.2`), `peak` (`0.01`〜`0.99`, デフォルト `0.5`: 0.01で鋭い減衰パーカッション包絡線), `level` (`0.0`〜`1.0`, デフォルト `1.0`)

#### `LFO` — 低周波オシレーター（フリー周期 / BPMテンポ同期）
- **IN**: `reset_in` (PIN 4: 位相リセット), `freq_cv_in` (PIN 5: 周波数変調 **※`cv_in` や `trig_in` は不可**)
- **OUT**: `cv_out`
- **PARAMS**:
  - `waveType`: `"sine"` | `"triangle"` | `"sawtooth"` | `"ramp"` | `"square"` (デフォルト `"sine"`)
  - `polarity`: `"bipolar"` (`-depth`〜`+depth`) | `"unipolar"` (`0`〜`+depth`)
  - `syncMode`: `"free"` | `"sync"`
  - `division`: `"4/1"` | `"2/1"` | `"1/1"` | `"1/2"` | `"1/4"` | `"1/8"` | `"1/16"` | `"1/32"` | `"1/4T"` | `"1/8T"` | `"1/4D"` | `"1/8D"` (`syncMode: "sync"` 時に有効)
  - `period`: `0.02` 〜 `30.0` 秒 (`syncMode: "free"` 時の周期, `rate = 1 / period`)
  - `rate`: `0.03` 〜 `50.0` Hz (デフォルト `2.0`)
  - `depth`: `0.0` 〜 `1.0` (デフォルト `1.0`), `phase`: `0` 〜 `360`, `duty`: `0.05` 〜 `0.95`

#### `SH` — サンプル＆ホールド（内部ランダムノイズ源内蔵）
- **IN**: `cv_in` (未結線時は内部ノイズをサンプリング), `trig_in` (サンプリングトリガー) | **OUT**: `cv_out`
- **PARAMS**: `polarity` (`"unipolar"` 0〜1V | `"bipolar"` ±1V), `glide` (`0.0`〜`0.5`s), `scale` (`-3.0`〜`3.0`, デフォルト `1.0`)

#### `LAG` — スルーリミッター（ポルタメント / CV平滑化）
- **IN**: `cv_in`, `time_cv` | **OUT**: `cv_out` | **PARAMS**: `timeMs` (`0`〜`2000` ms, デフォルト `50`)

---

### 5.4 クロック・シーケンサー・パターン・ロジック系 (Clock, Sequencers & Logic)

#### `CLK` — BPMテンポ同期マスタークロック
- **IN**: `reset_in` (立ち上がりで位相を0にリセット **※旧名 `power_in` は不可**) | **OUT**: `gate_out`
- **PARAMS**:
  - `div`: `"/16"`, `"/8"`, `"/4"`, `"/2"`, `"x1"` (4分音符), `"x2"` (8分音符), `"x4"` (16分音符), `"x8"` (32分音符), `"x16"`
  - `pulseWidthMs`: `1` 〜 `500` ms (デフォルト `15`), `limitPct`: `10` 〜 `90` % (デフォルト `90`)

#### `SEQ8` / `SEQ16` — 8 / 16ステップシーケンサー（`RUN` ゲート制御 ＆ `1-SHOT` 対応）
- **IN**:
  - `gate_in` (PIN 5: クロック進行トリガー)
  - `keygate_in` (PIN 6: **`RUN` ゲート入力** — **未結線時は常時スタンバイ状態**で `gate_in` のクロックに従い進行。**結線時はゲート待機モード**となり、`keygate_in >= 0.4V` の間だけ先頭から再生し、`0V` になると即座に停止＆ステップ0へリセット)
- **OUT**: `cv_out` (1V/Oct Pitch CV), `gate_out` (Gate)
- **PARAMS**:
  - `quantize`: `true` | `false` (デフォルト `true`)
  - `keyMode`: `"loop"` (RUNゲートONの間ループ再生) | `"oneshot"` (**1周再生し終えると最終ステップ後に自動停止**し、次のRUNゲート立ち上がりまで待機)
  - `steps`: 長さ8（`SEQ8`）または16（`SEQ16`）のオブジェクト配列:
    `{ "cv": 1.0, "active": true, "cvActive": true, "gate": true }`
    - `cv`: 1V/Oct 電圧（`1.0` = C2, `2.0` = C3）
    - `active`: `false` にしたステップはスキップ（変拍子・短縮ステップの作成に有効）
    - `cvActive`: `false` のステップは直前のステップの `cv` を維持（グライド・タイ保持）
    - `gate`: `false` のステップは休符（Gate 0V）

#### `PAT` — Strudel / TidalCycles ミニ記法パターンシーケンサー（`RUN` ゲート ＆ `1-SHOT` 対応）
外部クロック不要でもマスターBPMに完全同期して動作します。
- **IN**:
  - `reset_in` (PIN 5: 立ち上がりでサイクル先頭へリセット)
  - `keygate_in` (PIN 6: **`RUN` ゲート入力** — 未結線時は常時再生。結線時はゲートHighで先頭から再生開始、Lowで即停止＆リセット)
- **OUT**: `cv_out` (1V/Oct Pitch CV), `gate_out` (Gate)
- **PARAMS**:
  - `pattern`: ミニ記法文字列（例: `"c2 ~ e2 [g2 a2]"`）
    - 音名: `c1`〜`c6`, シャープ `c#2` / フラット `eb3`（または数値CV `1.0`, `1.5`）
    - `~` または `-`: 休符
    - `[a b]`: 1拍を細分化（連符・16分音符）
    - `<a b c>`: サイクルごとに要素を順番に切り替え（複数小節展開を1行で記述可能！）
    - `a*2`: 要素を2回連打、`a@2`: 要素の長さを2倍に伸ばす、`a^`: 次の音とレガート結合（タイ）
  - `cycleBeats`: `1`, `2`, `4` (1小節=デフォルト), `8` (2小節), `16` (4小節), `32` (8小節)
  - `gateLen`: `0.05` 〜 `0.95` (デフォルト `0.8`)
  - `keyMode`: `"loop"` | `"oneshot"` (`"oneshot"` はパターン1サイクル完了で停止、`<...>` がある場合は全サイクル一巡で停止)

#### `KEY` — 16鍵リボンキーボード 兼 **リアルタイム・スケールクオンタイザー**
- **IN**: `cv_in` (未結線時は画面上の鍵盤として動作。**結線時は入力された任意のCVを指定スケールへリアルタイム・クオンタイズして `cv_out` に出力**)
- **OUT**: `cv_out` (1V/Oct Pitch CV), `gate_out` (鍵盤押下時に `1.0V`)
- **PARAMS**:
  - `octave`: `1` 〜 `5` (デフォルト `3`)
  - `root`: `0` 〜 `11` (`0`=C, `1`=C#, `2`=D, `3`=D#, `4`=E, `5`=F, `6`=F#, `7`=G, `8`=G#, `9`=A, `10`=A#, `11`=B)
  - `scale`: `"CHROMATIC"` | `"MAJOR"` | `"MINOR"` | `"PENT.MAJ"` | `"PENT.MIN"` | `"DORIAN"` | `"PHRYGIAN"` | `"BLUES"` | `"HARM.MIN"`
  - `legato`: `true` | `false` (デフォルト `false`: `true` で鍵盤スライド時にGateを再トリガーせず音程のみ滑らかに変更)

#### `COUNT` — ステップカウンター ＆ 正規化ランプCVジェネレーター
`MATRIX` や `LUT` を駆動するための最重要モジュールです。
- **IN**: `clk_in` (PIN 5: クロック入力), `reset_in` (PIN 4: 0へリセット)
- **OUT**:
  - `cv_out` (PIN 10: カウント値 `0` 〜 `max-1` を **`0.0V` 〜 `(max-1)/max V` に正規化したステップランプCV** として出力)
  - `carry_out` (PIN 11: 1周ごとにトリガー出力)
- **PARAMS**: `max` (`8`, `16`, `32`, `64`, `128`, `256`, デフォルト `16`)

#### `MATRIX` — 4トラック・リズムマトリックスシーケンサー
`COUNT:cv_out > MATRIX:cv_in` と結線することで、1モジュールで4パート（Kick, Snare, HiHat, Clap等）のドラムパターンを同時出力できます。
- **IN**: `cv_in` (PIN 5: `0.0V`〜`1.0V` の位相CV — 通常は `COUNT:cv_out` を結線)
- **OUT**: **`out_1`** (PIN 7), **`out_2`** (PIN 8), **`out_3`** (PIN 9), **`out_4`** (PIN 10) **※アンダースコア必須**
- **PARAMS**:
  - `divisions`: `16` | `32` | `64` (デフォルト `16`)
  - `patterns`: 長さ64の `0`/`1` 配列×4トラック分 `[[1,0,0,0, 1,0,0,0, ...], [0,0,0,0, 1,0,0,0, ...], ...]`
  - `modes`: 各トラックの出力モード `["gate", "gate", "gate", "gate"]` (`"gate"` または `"trig"`)

#### `LUT` — 256ステップ CVルックアップテーブル / カスタムシェイパー
`COUNT:cv_out` や `LFO:cv_out` を `cv_in` に入れることで、任意のステップシーケンスやカスタムLFO波形を生成します。
- **IN**: `cv_in` (`0.0V`〜`1.0V`) | **OUT**: `cv_out` (`0.0V`〜`1.0V`)
- **PARAMS**: `divisions` (`16` | `32` | `64` | `256`, デフォルト `16`), `quantize` (boolean: `true` で半音単位にスナップ), `table` (長さ256の `0.0`〜`1.0` 数値配列)

#### `CHORD` — 4和音ボイシング・ジェネレーター
単音の1V/Oct CVから、指定コードの4声（Root, 3rd, 5th, 7th/9th等）の1V/Oct CVを同時出力します。4ch設定の `VCO` (`cv_in`, `cv_in2`, `cv_in3`, `cv_in4`) に直結すると1台のVCOで美しいポリフォニック・コードが鳴ります。
- **IN**: `cv_in` (Root Pitch CV) | **OUT**: `cv_out1`, `cv_out2`, `cv_out3`, `cv_out4`
- **PARAMS**:
  - `chord`: `"min"` | `"maj"` | `"sus4"` | `"sus2"` | `"m7"` | `"7th"` | `"Maj7"` | `"m7b5"` | `"5th"` | `"open_min"` | `"open_maj"` | `"add9"` | `"m9"` | `"9th"` | `"dim7"` | `"aug"` (**※キー名は `chord` であり `chordType` ではない**)
  - `rootMidi`: `24` 〜 `72` (デフォルト `48` = C3 ※`cv_in` 未結線時のルート音)

#### `MARKOV` — マルコフ連鎖ステートノード
複数台の `MARKOV` を `trans_out1..3 > trans_in` で相互結線し、確率的オートマトン作曲を行います。
- **IN**: `gate_in` (Clock), `trans_in` (状態遷移トリガー)
- **OUT**: `trans_out1`, `trans_out2`, `trans_out3`, `startgate_out`, `gate_out`, `longgate_out`, `cv_out`
- **PARAMS**: `initOn` (boolean: 最初の1台のみ `true`), `rootMidi` (`24`〜`72`), `quantize` (boolean), `holdClocks` (`1`〜`16`), `weights` (`[self, out1, out2, out3]`, 例: `[2, 5, 3, 0]`)

#### `DIST4` / `SLCT4` / `MATH1` / `MATH2` / `VALUE` / `SWITCH` / `PAD` / `GSENSOR`
- **`DIST4`** (1入力➔4出力ロータリー分配): IN: `cv_in`, `gate_in` | OUT: `cv_out1`, `cv_out2`, `cv_out3`, `cv_out4` | PARAMS: `steps` (`2`〜`4`), `mode` (`"up"` | `"down"` | `"updown"` | `"random"`)
- **`SLCT4`** (4入力➔1出力マルチプレクサ): IN: `gate_in`, `cv_in1`, `cv_in2`, `cv_in3`, `cv_in4` | OUT: `gate_out`, `cv_out` | PARAMS: `mode` (`"up"` | `"down"` | `"updown"` | `"random"`)
- **`MATH1`** (単項演算): IN: `cv_in_a` | OUT: `cv_out` | PARAMS: `mode` (`"ABS"` | `"FLOOR"` | `"CEIL"` | `"ROUND"` | `"INT"` | `"NOT"` | `"SIN"` | `"COS"` | `"TAN"`), `valA`
- **`MATH2`** (二項演算・比較・論理): IN: `cv_in_a`, `cv_in_b` | OUT: `cv_out` | PARAMS: `mode` (`"ADD"` | `"DIFF"` | `"MULTI"` | `"MOD"` | `"A^B"` | `"MIN"` | `"MAX"` | `"<"` | `"<="` | `"=="` | `">="` | `">"` | `"AND"` | `"OR"` | `"NAND"` | `"NOR"` | `"XOR"`), `valA` (デフォルト `0.0`), `valB` (デフォルト `1.0`)
- **`VALUE`** (定数/手動CVスライダー): IN: なし | OUT: `cv_out` | PARAMS: `label`, `val`, `min`, `max`, `stepType` (`"0.01"` | `"0.1"` | `"1semi"` | `"1"` | `"10"`)
- **`SWITCH`** (ミュートスイッチ): IN: `cv_in` | OUT: `cv_out` | PARAMS: `state` (`true` | `false`)
- **`PAD`** (XYタッチパッド): IN: `hue_cv`, `bright_cv` | OUT: `x_cv`, `y_cv`, `gate_out` | PARAMS: `name`, `polX` (`"bi"` | `"uni"`), `polY` (`"bi"` | `"uni"`), `hue` (`0`〜`1`), `sat` (`0`〜`1`), `bright` (`0`〜`1`)
- **`GSENSOR`** (3軸傾きセンサー): IN: なし | OUT: `x_out`, `y_out`, `z_out` | PARAMS: `smooth` (`0.0`〜`0.95`)

---

### 5.5 ミキサー・エフェクト・出力・アナライザー系 (Mix, FX, Output & Analyzers)

#### `MIX` — 2〜4ch オーディオミキサー（チャンネル別 `MUTE` 対応）
- **IN**: `wave_in1`, `wave_in2`, `wave_in3` (`channels >= 3`), `wave_in4` (`channels == 4`)
- **OUT**: `wave_out`
- **PARAMS**: `channels` (`2`〜`4`, デフォルト `2`), `lvl1..4` (`0.0`〜`1.0`, デフォルト `1.0`), `mute1..4` (`true` | `false`, デフォルト `false`)

#### `DELAY` — ステレオ対応エコー/ディレイ
- **IN**: `wave_in` | **OUT**: `wave_out`
- **PARAMS**: `delayTime` (`0.02`〜`1.5`s, デフォルト `0.3`), `feedback` (`0.0`〜`0.95`, デフォルト `0.4`), `mix` (`0.0`〜`1.0`, デフォルト `0.5`)

#### `REVERB` — マルチモード・リバーブ
- **IN**: `wave_in`, `cv_in` (Wet Mix CV) | **OUT**: `wave_out`
- **PARAMS**: `mode` (`"room"` | `"hall"` | `"plate"`, デフォルト `"hall"`), **`time`** (`0.2`〜`6.0`s, デフォルト `1.8` **※`decay` ではなく `time`**), `damp` (`500`〜`16000` Hz, デフォルト `4500`), `mix` (`0.0`〜`1.0`, デフォルト `0.4`), `cvDepth` (`0.0`〜`2.0`, デフォルト `1.0`)

#### `SPK` — マスタースピーカー出力（16秒MP3録音機能内蔵）
- **IN**: **`wave_in_l`** (PIN 5), **`wave_in_r`** (PIN 6) | **OUT**: なし
- **PARAMS**: `masterVol` (`0.0`〜`0.5`, デフォルト `0.12`、推奨 `0.15`〜`0.25`)

#### `SCOPE` / `LISS` / `SPEC` — ビジュアル・アナライザー群
- **`SCOPE`** (オシロスコープ): IN: `cv_in` (PIN 5: Audio/CV), `trig_in` (PIN 6) | OUT: なし | PARAMS: `timeSpan` (`0.001`〜`5.0`s), `vRange` (`0.5`〜`20.0`V), `trigMode` (`"free"` | `"auto"`)
- **`LISS`** (XYリサジュー): IN: `cv_in_x` (PIN 5), `cv_in_y` (PIN 6) | OUT: なし | PARAMS: `vRange` (`0.5`〜`10.0`V)
- **`SPEC`** (20Hz-20kHz 対数FFTスペクトラムアナライザー): IN: `wave_in` (PIN 5) | OUT: なし | PARAMS: `mode` (`"bar"` | `"curve"`), `smooth` (`0.0`〜`0.95`)

---

### 5.6 サブパッチ (`SUB` / `SUB_IO`) ＆ 内蔵ファクトリー音源 (`FACTORY_*`)

Gridsynth は1スロットに複雑なシンセやドラム音源をカプセル化する `SUB` モジュールを備えています。
`modules` 内で `"type": "SUB", "subType": "ファクトリーID"` を指定するだけで、**サブページ記述を省略してもロード時に自動的に内部回路が展開・結線**されます。

#### 即戦力ファクトリーサブパッチ一覧 (`subType` に指定可能)
| `subType` (または別名) | カテゴリ | 入力ポート (`IN`) | 出力ポート (`OUT`) | 音色・特徴 |
| :--- | :--- | :--- | :--- | :--- |
| **`"FACTORY_VOICE"`** (`"MonoVoice"`) | Synth | `cv_in` (`PIN5_in`), `gate_in` (`PIN4_in`) | `wave_out` (`PIN10_out`) | 王道モノシンセ (VCO+VCF+ADSR+VCA) |
| **`"FACTORY_ACID"`** (`"AcidBass"`) | Synth | `cv_in` (`PIN5_in`), `trig_in` (`PIN4_in`) | `wave_out` (`PIN10_out`) | 303系強レゾナンス・アシッドベース |
| **`"FACTORY_DUAL_VCO"`** (`"DualLead"`) | Synth | `cv_in` (`PIN5_in`), `gate_in` (`PIN4_in`) | `wave_out` (`PIN10_out`) | デュアルVCOデチューン・リード |
| **`"FACTORY_KICK"`** (`"Kick"`) | Drum | `trig_in` (`PIN5_in`) | `wave_out` (`PIN10_out`) | 808/909系パンチのあるバスドラム |
| **`"FACTORY_KICK2"`** (`"TechnoKick"`) | Drum | `trig_in` (`PIN5_in`) | `wave_out` (`PIN10_out`) | ハードテクノ向け重低音キック |
| **`"FACTORY_SUB_KICK"`** (`"SubKick"`) | Drum | `trig_in` (`PIN5_in`) | `wave_out` (`PIN10_out`) | ディープ・サブベースキック |
| **`"FACTORY_SNARE"`** (`"Snare"`) | Drum | `trig_in` (`PIN5_in`) | `wave_out` (`PIN10_out`) | スナッピーなアナログスネア |
| **`"FACTORY_RIM"`** (`"Rimshot"`) | Drum | `trig_in` (`PIN5_in`) | `wave_out` (`PIN10_out`) | シャープなリムショット |
| **`"FACTORY_GHOST_SNARE"`** (`"Ghost"`) | Drum | `trig_in` (`PIN5_in`) | `wave_out` (`PIN10_out`) | ゴーストノート用ショートスネア |
| **`"FACTORY_CLAP"`** (`"Clap"`) | Drum | `trig_in` (`PIN5_in`) | `wave_out` (`PIN10_out`) | マルチバースト・ハンドクラップ |
| **`"FACTORY_HIHAT"`** (`"HiHat"`) | Drum | `trig_in` (`PIN5_in`) | `wave_out` (`PIN10_out`) | クリスプなクローズドハイハット |
| **`"FACTORY_CH_SOFT"`** (`"HiHatSoft"`) | Drum | `trig_in` (`PIN5_in`) | `wave_out` (`PIN10_out`) | ソフトなシェイカー風ハイハット |
| **`"FACTORY_OPEN_HAT"`** (`"OpenHat"`) | Drum | `trig_in` (`PIN5_in`) | `wave_out` (`PIN10_out`) | メタリックなオープンハイハット |
| **`"FACTORY_COWBELL"`** (`"Cowbell"`) | Drum | `trig_in` (`PIN5_in`) | `wave_out` (`PIN10_out`) | 808風FMカウベル |
| **`"FACTORY_TOM"`** / **`"FACTORY_HIGH_TOM"`** | Drum | `trig_in` (`PIN5_in`) | `wave_out` (`PIN10_out`) | エレクトロニック・タム |
| **`"FACTORY_PERC"`** / **`"FACTORY_PERC2"`** | Drum | `trig_in` (`PIN5_in`) | `wave_out` (`PIN10_out`) | FMメタリックパーカッション |
| **`"FACTORY_CRASH"`** (`"Crash"`) | Drum | `trig_in` (`PIN5_in`) | `wave_out` (`PIN10_out`) | ロングディケイ・クラッシュシンバル |
| **`"FACTORY_SPACE_FX"`** (`"SpaceFx"`) | FX | `wave_in` (`PIN5_in`) | `wave_out` (`PIN10_out`) | ディレイ＋リバーブ複合空間エフェクト |

- **ファクトリーSUBの使用例**:
  ```json
  "SUB1": { "type": "SUB", "subType": "FACTORY_KICK" },
  "SUB2": { "type": "SUB", "subType": "FACTORY_HIHAT" }
  ```
  結線は `"MATRIX1:out_1 > SUB1:trig_in"`, `"SUB1:wave_out > MIX1:wave_in1"` のようにエイリアス名（または `PIN5_in`, `PIN10_out`）で直結できます。

---

### 5.7 3D グラフィックス・映像パイプライン (3D & Video Pipeline)

Gridsynth は WebGL / Three.js ベースのモジュラー 3D ビジュアライザーを統合しています。
信号フローは **`OBJ` 生成 (`obj_out`) ➔ `OBJ` 変形 (`obj_in > obj_out`) ➔ `RENDER` (`obj_in > video_out`) ➔ `VFX` / `VMIX` (`video_in > video_out`) ➔ `DISPLAY` (`video_in`)** です。

#### 1. 3D ジェネレーター (`obj_out` を出力)
| モジュール | 入力 (`IN`) | 出力 (`OUT`) | パラメータ詳細 |
| :--- | :--- | :--- | :--- |
| **`OBJECT`** | なし | `obj_out` | `shape`: `"torus"` \| `"cube"` \| `"plane"` \| `"sphere"` \| `"cylinder"` \| `"cone"` \| `"tetra"` \| `"octa"` \| `"dodeca"` \| `"icosa"` (**※`"box"` ではなく `"cube"`、`"icosahedron"` ではなく `"icosa"`**)<br>`detail`: `"low"` \| `"mid"` \| `"high"`<br>`material`: `"wire"` \| `"solid"` \| `"normal"` \| `"toon"` \| `"point"` \| `"glass"`<br>`color`: `"#ffffff"` 等の16進カラー, `wireWidth`: `0.5`〜`5.0`, `pointSize`: `1.0`〜`10.0`, `glow`: `0.0`〜`1.0`, `mirror`: `0.0`〜`1.0` |
| **`PATH`** | `cv_in` | `obj_out` | `shape`: `"line"` \| `"arc"` \| `"poly"`, `renderMode`: `"line"` \| `"fill"`, `points`: `2`〜`128`, `arc`: `0.05`〜`1.0`, `sides`: `3`〜`12`, `material`: `"wire"` \| `"solid"` \| `"glass"` \| `"point"`, `glow`: `0.0`〜`1.0`, `color`: `"#ffffff"` |
| **`PARTICLE`** | `cv_in`, `obj_in`, `gate_in` | `obj_out` | `dist`: `"sphere"` \| `"cube"` \| `"ring"` \| `"spiral"` (`obj_in` 結線時は入力メッシュ頂点から発生), `count`: `1`〜`2000` (デフォルト `400`), `spread`: `0.0`〜`4.0`, `pointSize`: `1.0`〜`10.0`, `speed`: `0.0`〜`2.0`, `cvTarget`: `"spread"` \| `"size"` \| `"speed"`, `color`: `"#22d3ee"` (`gate_in` でパーティクル再散布バースト) |
| **`WAVE3D`** | `wave_in` (Audio), `cv_in` (Gain) | `obj_out` | **音声駆動 3D ウォーターフォール地形ジェネレーター**（奥行き2倍のワイド長方形バッファ）<br>`sourceMode`: `"wave"` (時間領域オシロ波形) \| `"spec"` (**20Hz〜20kHz 対数FFTスペクトラム**)<br>`style`: `"ribbon"` (3Dライン) \| `"point"` (ドット群) \| `"bars"` (3Dスペクトラムバー)<br>`slices`: `16`〜`64` (奥行き履歴数, デフォルト `40`), `cols`: `24`〜`96` (横分割数, デフォルト `64`), `gain`: `0.2`〜`4.0` (高さ倍率, デフォルト `1.5`), `speed`: `0.2`〜`2.0` (スクロール速度, デフォルト `1.0`), `glow`: `0.0`〜`1.0` (ネオン発光, デフォルト `0.7`), `color`: `"#38bdf8"` (**※角度調整は `ROTATE` または `RENDER` のカメラ位置で行います**) |

#### 2. 3D モディファイア (`obj_in` を受け取り `obj_out` を出力)
| モジュール | 入力 (`IN`) | 出力 (`OUT`) | パラメータ詳細 |
| :--- | :--- | :--- | :--- |
| **`ROTATE`** | `obj_in`, `cv_in` | `obj_out` | `axis`: `"x"` \| `"y"` \| `"z"`, **`angle`**: `0.0` 〜 `1.0` (**回転数 turn 単位: `1.0 = 360°`, `0.25 = 90°`, `0.125 = 45°`**。`cv_in` 結線時は CV `0〜1V` で1回転) |
| **`MOVE`** | `obj_in`, `cv_in` | `obj_out` | `axis`: `"x"` \| `"y"` \| `"z"`, `offset`: `-5.0` 〜 `5.0` (デフォルト `0.0`) |
| **`SCALE`** | `obj_in`, `cv_in` | `obj_out` | **3D空間スケール変形専用** (`axis`: `"all"` \| `"x"` \| `"y"` \| `"z"`, `scale`: `0.0` 〜 `4.0`, デフォルト `1.0`) |
| **`VERTEX`** | `obj_in`, `cv_in` | `obj_out` | 頂点シェーダー変形 (`mode`: `"wave"` \| `"spike"` \| `"twist"` \| `"wobble"` \| `"pinch"`, `depth`: `0.0`〜`1.0`, `freq`: `0.5`〜`10.0`, `speed`: `0.0`〜`5.0`) |
| **`SCATTER`** | `base_in`, `child_in`, `cv_in` | `obj_out` | `base_in` の全頂点に `child_in` のオブジェクトを GPU Instancing で複製配置 (`scale`: `0.05`〜`1.0`, `showBase`: boolean, `alignNormal`: boolean) |

#### 3. レンダラー・映像エフェクト・ディスプレイ (`video_in` / `video_out`)
| モジュール | 入力 (`IN`) | 出力 (`OUT`) | パラメータ詳細 |
| :--- | :--- | :--- | :--- |
| **`RENDER`** | `obj_in`, `fov_in` | `video_out` | 3D空間をオフスクリーン描画。複数オブジェクトを合成したい場合は **`RENDER1:obj_in` に複数の `obj_out` を加算接続**可能！<br>`camX` (`0.0`), `camY` (`0.0`〜`3.0`), `camZ` (`5.0`〜`8.0`), `targetX`/`Y`/`Z` (`0.0`), `fov` (`15`〜`120`, デフォルト `45`), `camRoll` (`-180`〜`180`), `materialOverride` (`"auto"` \| `"wire"` \| `"solid"` \| `"normal"` \| `"toon"` \| `"point"` \| `"glass"`) |
| **`VFX`** | `video_in`, `cv_in` | `video_out` | ポストエフェクト＆残像 (`mode`: `"blur"` \| `"mosaic"` \| `"invert"` \| `"crt"` \| `"rgb"` \| `"bypass"`, `trailType`: `"peak"` \| `"fade"` \| `"diffuse"` \| `"zoom"` \| `"drift"` \| `"prism"`, `amount`: `0.0`〜`1.0`) |
| **`VMIX`** | `video_in1`, `video_in2`, `cv_in` | `video_out` | 2系統の映像をトランジション合成 (`mode`: `"dissolve"` \| `"alpha"` \| `"add"` \| `"luma"` \| `"mosaic"` \| `"blur"` \| `"glitch"` \| `"burn"` \| `"slide_h"` \| `"slide_v"` \| `"blackout"` \| `"whiteout"`, `mix`: `0.0`〜`1.0`) |
| **`DISPLAY`** | `video_in` | `video_out` | ライブ映像ビューポート (`divN`: `1` = 1×1単一セル全画面, `2` = 2×2の4セル連結大画面, `3` = 3×3, `4` = 4×4)<br>**【重要】**: **1個の `DISPLAY` しか置かない場合は必ず `"divN": 1` に設定**してください。`"divN": 2` にする場合は 4個の `DISPLAY` を `DISPLAY1:video_out > DISPLAY2:video_in > DISPLAY3:video_in > DISPLAY4:video_in` と数珠繋ぎ（デイジーチェーン）にすると自動的にタイル番号1〜4が割り当てられ、2×2の大画面モニターになります。 |

---

## 6. 音階と 1V/Oct ピッチ早見表 (Musical Pitch Reference)

$$\text{CV} = \frac{\text{MIDI\_Note} - 24}{12}$$

| 音名 | オクターブ1 (C1=0V) | オクターブ2 (C2=1V: ベース域) | オクターブ3 (C3=2V: リード域) | オクターブ4 (C4=3V: 高音域) |
| :---: | :---: | :---: | :---: | :---: |
| **C** | `0.0000` | `1.0000` | `2.0000` | `3.0000` |
| **C# / Db** | `0.0833` | `1.0833` | `2.0833` | `3.0833` |
| **D** | `0.1667` | `1.1667` | `2.1667` | `3.1667` |
| **D# / Eb** | `0.2500` | `1.2500` | `2.2500` | `3.2500` |
| **E** | `0.3333` | `1.3333` | `2.3333` | `3.3333` |
| **F** | `0.4167` | `1.4167` | `2.4167` | `3.4167` |
| **F# / Gb** | `0.5000` | `1.5000` | `2.5000` | `3.5000` |
| **G** | `0.5833` | `1.5833` | `2.5833` | `3.5833` |
| **G# / Ab** | `0.6667` | `1.6667` | `2.6667` | `3.6667` |
| **A** | `0.7500` | `1.7500` | `2.7500` | `3.7500` |
| **A# / Bb** | `0.8333` | `1.8333` | `2.8333` | `3.8333` |
| **B** | `0.9167` | `1.9167` | `2.9167` | `3.9167` |

---

## 7. 実践運用パターン＆完全実動パッチレシピ (Complete Operational Recipes)

### 【レシピ 1】KEY (Legato) + SEQ8 (RUN連動) + WAVE3D (20Hz-20kHz スペアナ地形) + 2×2 大画面 DISPLAY
- **運用ポイント**:
  - `KEY1:gate_out` を `CLK1:reset_in` と `SEQ8_1:keygate_in` (`RUN`) に分岐接続することで、**鍵盤を押した瞬間にクロックとシーケンサーが先頭から同期スタート**します（`"keyMode": "oneshot"` に変えれば1周だけのワンショット・アルペジオになります）。
  - `KEY1:cv_out` と `SEQ8_1:cv_out` を両方 `VCO1:cv_in` に接続することで、シーケンサーのフレーズを鍵盤でリアルタイムに移調（トランスポーズ）できます。
  - `DISPLAY1〜4` をスロット `10, 11, 14, 15`（右下の 2×2 領域）に配置し、`divN: 2` でデイジーチェーン接続することで、大画面で `WAVE3D` の3Dスペクトラム地形を表示します。

```json
{
  "bpm": 122,
  "pages": {
    "0": {
      "name": "Wave3D_Visualizer",
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
        "9": "RENDER1",
        "10": "DISPLAY1",
        "11": "DISPLAY2",
        "12": "DELAY1",
        "13": "VFX1",
        "14": "DISPLAY3",
        "15": "DISPLAY4"
      },
      "modules": {
        "KEY1": { "type": "KEY", "octave": 2, "root": 0, "scale": "MINOR", "legato": true },
        "CLK1": { "type": "CLK", "div": "x4", "pulseWidthMs": 15, "limitPct": 90 },
        "SEQ8_1": {
          "type": "SEQ8",
          "quantize": true,
          "keyMode": "loop",
          "steps": [
            { "cv": 0.0, "active": true, "cvActive": true, "gate": true },
            { "cv": 0.25, "active": true, "cvActive": true, "gate": true },
            { "cv": 0.583333, "active": true, "cvActive": true, "gate": true },
            { "cv": 1.0, "active": true, "cvActive": true, "gate": true },
            { "cv": 0.833333, "active": true, "cvActive": true, "gate": true },
            { "cv": 0.583333, "active": true, "cvActive": true, "gate": true },
            { "cv": 0.25, "active": true, "cvActive": true, "gate": true },
            { "cv": 0.583333, "active": true, "cvActive": true, "gate": true }
          ]
        },
        "VCO1": { "type": "VCO", "wave": "sawtooth", "freq1": 65.4, "channels": 1, "quantize": true },
        "VCF1": { "type": "VCF", "filterType": "lowpass", "cutoff": 900, "q": 5.0, "modDepth": 2600 },
        "ADSR1": { "type": "ADSR", "attack": 0.005, "decay": 0.18, "sustain": 0.25, "release": 0.25 },
        "VCA1": { "type": "VCA", "level": 0.0, "cvDepth": 1.0 },
        "DELAY1": { "type": "DELAY", "delayTime": 0.245, "feedback": 0.4, "mix": 0.3 },
        "SPK1": { "type": "SPK", "masterVol": 0.18 },
        "WAVE3D_1": {
          "type": "WAVE3D",
          "sourceMode": "spec",
          "style": "ribbon",
          "slices": 44,
          "cols": 64,
          "gain": 2.2,
          "speed": 1.0,
          "glow": 0.85,
          "color": "#38bdf8"
        },
        "RENDER1": { "type": "RENDER", "camX": 0.0, "camY": 2.1, "camZ": 6.2, "targetX": 0.0, "targetY": -0.2, "targetZ": 0.0, "fov": 45 },
        "VFX1": { "type": "VFX", "mode": "rgb", "trailType": "fade", "amount": 0.25 },
        "DISPLAY1": { "type": "DISPLAY", "divN": 2 },
        "DISPLAY2": { "type": "DISPLAY", "divN": 2 },
        "DISPLAY3": { "type": "DISPLAY", "divN": 2 },
        "DISPLAY4": { "type": "DISPLAY", "divN": 2 }
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
        "VCA1:wave_out > DELAY1:wave_in",
        "DELAY1:wave_out > SPK1:wave_in_l",
        "DELAY1:wave_out > SPK1:wave_in_r",
        "DELAY1:wave_out > WAVE3D_1:wave_in",
        "WAVE3D_1:obj_out > RENDER1:obj_in",
        "RENDER1:video_out > VFX1:video_in",
        "VFX1:video_out > DISPLAY1:video_in",
        "DISPLAY1:video_out > DISPLAY2:video_in",
        "DISPLAY2:video_out > DISPLAY3:video_in",
        "DISPLAY3:video_out > DISPLAY4:video_in"
      ]
    }
  }
}
```

---

### 【レシピ 2】COUNT + MATRIX + ファクトリーSUBドラム + PAT アシッド・テクノグルーヴ
- **運用ポイント**:
  - `CLK1 (x4 = 16分音符) ➔ COUNT1 (max: 16) ➔ MATRIX1:cv_in` で16ステップの4トラック・ドラムマシンを構築し、`SUB` モジュール（`FACTORY_KICK2`, `FACTORY_SNARE`, `FACTORY_HIHAT`, `FACTORY_ACID`）を駆動します。
  - `PAT1` のミニ記法 `"c2 c2 [eb2 c3] c2 <f2 g2> c2 [bb1 g2] ~"` で2小節変化するアシッドベースラインを自動演奏します。

```json
{
  "bpm": 130,
  "pages": {
    "0": {
      "name": "Acid_Techno_Groove",
      "slots": {
        "0": "CLK1",
        "1": "COUNT1",
        "2": "MATRIX1",
        "3": "SPK1",
        "4": "PAT1",
        "5": "SUB_ACID",
        "6": "DELAY1",
        "7": "MIX_MASTER",
        "8": "SUB_KICK",
        "9": "SUB_SNARE",
        "10": "SUB_HAT",
        "11": "MIX_DRUM"
      },
      "modules": {
        "CLK1": { "type": "CLK", "div": "x4", "pulseWidthMs": 15 },
        "COUNT1": { "type": "COUNT", "max": 16 },
        "MATRIX1": {
          "type": "MATRIX",
          "divisions": 16,
          "modes": ["trig", "trig", "trig", "trig"],
          "patterns": [
            [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0, 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,1, 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,1,0, 0,0,1,0, 0,0,1,0, 0,0,1,1, 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
          ]
        },
        "PAT1": {
          "type": "PAT",
          "pattern": "c2 c2 [eb2 c3] c2 <f2 g2> c2 [bb1 g2] ~",
          "cycleBeats": 4,
          "gateLen": 0.55,
          "keyMode": "loop"
        },
        "SUB_ACID": { "type": "SUB", "subType": "FACTORY_ACID" },
        "SUB_KICK": { "type": "SUB", "subType": "FACTORY_KICK2" },
        "SUB_SNARE": { "type": "SUB", "subType": "FACTORY_SNARE" },
        "SUB_HAT": { "type": "SUB", "subType": "FACTORY_HIHAT" },
        "DELAY1": { "type": "DELAY", "delayTime": 0.346, "feedback": 0.45, "mix": 0.32 },
        "MIX_DRUM": { "type": "MIX", "channels": 3, "lvl1": 0.95, "lvl2": 0.75, "lvl3": 0.55 },
        "MIX_MASTER": { "type": "MIX", "channels": 2, "lvl1": 0.85, "lvl2": 0.8 },
        "SPK1": { "type": "SPK", "masterVol": 0.18 }
      },
      "connections": [
        "CLK1:gate_out > COUNT1:clk_in",
        "COUNT1:cv_out > MATRIX1:cv_in",
        "MATRIX1:out_1 > SUB_KICK:trig_in",
        "MATRIX1:out_2 > SUB_SNARE:trig_in",
        "MATRIX1:out_3 > SUB_HAT:trig_in",
        "SUB_KICK:wave_out > MIX_DRUM:wave_in1",
        "SUB_SNARE:wave_out > MIX_DRUM:wave_in2",
        "SUB_HAT:wave_out > MIX_DRUM:wave_in3",
        "PAT1:cv_out > SUB_ACID:cv_in",
        "PAT1:gate_out > SUB_ACID:trig_in",
        "SUB_ACID:wave_out > DELAY1:wave_in",
        "MIX_DRUM:wave_out > MIX_MASTER:wave_in1",
        "DELAY1:wave_out > MIX_MASTER:wave_in2",
        "MIX_MASTER:wave_out > SPK1:wave_in_l",
        "MIX_MASTER:wave_out > SPK1:wave_in_r"
      ]
    }
  }
}
```

---

## 8. 外部 AI 向け指示プロンプトテンプレート (Copy & Paste Prompt)

外部 AI（ChatGPT, Claude, Gemini, Cursor 等）にパッチ生成を依頼する際は、本ファイル（`GRIDSYNTH_AI_PATCH_SPEC.md`）を添付し、以下のプロンプトを入力してください。

```text
あなたはモジュラーシンセ＆3Dビジュアライザー "Gridsynth" のプロフェッショナル・サウンド＆ビジュアルデザイナーです。
添付した Gridsynth AI Patch Generation & Composition Specification (v3.1) に厳密に従い、Gridsynth にそのままインポートして即座に再生可能なパッチ JSON を単一の ```json コードブロックのみで出力してください。

【厳守ルール（バリデーションチェック項目）】:
1. 出力は単一の ```json コードブロックのみとし、JSON 内にコメント (//) や末尾カンマを含めないでください。
2. "slots" ("0"〜"127") と "modules" のキー（モジュールID）を漏れ・重複なく完全に1対1で一致させてください。
3. すべての接続は "connections" 配列内に "送信元ID:出力ポート > 送信先ID:入力ポート" の形式で記述し、仕様書に存在する正確なポート名のみを使用してください。
4. 最終オーディオ出力は、必ず SPK1 の "wave_in_l" と "wave_in_r" の両方に結線してください（単一の "wave_in" はエラーになります）。
5. エンベロープ (ADSR/AR/RF) で VCA を開閉する際は、必ず VCA の "level": 0.0 に設定してください。
6. シーケンサー (SEQ8 / SEQ16 / PAT) を鍵盤やゲートで起動制御する場合は "keygate_in" (PIN 6: RUN) に結線し、"keyMode": "loop" または "oneshot" を設定してください（常時再生させる場合は "keygate_in" を未結線にします）。
7. ピッチCVのスケールクオンタイズには KEY モジュール ("cv_in" > "cv_out") を使用してください。SCALE モジュールは 3D オブジェクト拡大縮小専用 ("obj_in" > "obj_out") です。
8. 3D・映像パイプラインは OBJECT / PATH / PARTICLE / WAVE3D (obj_out) ➔ ROTATE / MOVE / SCALE / VERTEX / SCATTER (obj_in > obj_out) ➔ RENDER (obj_in > video_out) ➔ VFX / VMIX ➔ DISPLAY (video_in) の順に接続してください。DISPLAY を1セル単体で使う場合は "divN": 1、2x2の4セル大画面で使う場合は "divN": 2 の DISPLAY を4台配置して video_out > video_in でデイジーチェーン接続してください。

【今回作成してほしいパッチのリクエスト】:
（ここに作りたい音楽ジャンル・音色・シーケンス展開・3Dビジュアルのイメージを記入）
```
