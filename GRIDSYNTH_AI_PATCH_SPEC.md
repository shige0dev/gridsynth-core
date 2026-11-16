# Gridsynth AI Patch Generation & Module Reference Manual (v3.2 Complete Standalone)
> **For AI Assistants (ChatGPT, Claude, Gemini, Cursor, Copilot, etc.) & Sound/Visual Designers**
> 本仕様書は、外部 AI および開発者が **Gridsynth**（Webベース 4列×32行スクロール・モジュラーシンセ＆3Dビジュアライザー）用のパッチデータ（JSON形式）を自律的かつエラーゼロで設計・作曲・出力するための**単一ファイル完結型・完全リファレンスマニュアル**です。
> すべての記述は実装コード（`src/core/patch.js`, `src/modules/defs/*.js`, `src/audio/defs/*.js`, `src/dsp/processors/*.js`）に100%準拠しています。

---

## 1. システム概要とパーサー（ローダー）仕様 (Overview & Loader Behavior)

- **グリッド構造**: **横4列 (`col: 0〜3`) × 縦32行 (`row: 0〜31`) = 計128スロット**（インデックス `"0"` 〜 `"127"`、縦スクロール対応）
- **パッチデータ形式**: **単一 JSON オブジェクト**（マークダウン内の ` ```json ` コードブロックとして出力）
- **信号結線方式**: `"送信元モジュールID:出力ポート > 送信先モジュールID:入力ポート"`（推奨。オブジェクト形式 `{ "from": { "moduleId", "port" }, "to": { "moduleId", "port" } }` も受理）
- **スピーカー出力**: 最終音声は `SPK1` の **`wave_in_l`** および **`wave_in_r`** へ結線（`SPK1:wave_in` と記述された場合もローダーが自動的に L/R 両方へ展開します）
- **映像 / 3D出力**: `OBJECT` / `PATH` / `PARTICLE` / `WAVE3D` (`obj_out`) ➔ 3Dモディファイア (`ROTATE` / `MOVE` / `SCALE` / `VERTEX` / `SCATTER`) ➔ `RENDER` (`video_out`) ➔ `VFX` / `VMIX` ➔ `DISPLAY` (`video_in`)

### 1.1 ローダー (`parsePatch`) の自動補完・検証ルール
| 項目 | ローダーの実際の挙動 (`src/core/patch.js`) |
| :--- | :--- |
| **`slots` の記載範囲** | **使用スロットのみ記載**（空きスロットの記載は不要）。万一 `slots` から漏れたモジュールが `modules` にある場合も、ローダーが左上から空きスロットへ自動配置します。 |
| **未指定パラメータ** | 各モジュールの `defaults()` 定義値で自動補完されます。 |
| **未知のパラメータ** | エラーにはならず保持・無視されます。数値の範囲外は各モジュールの Audio/DSP 側で安全にクランプされます。 |
| **未知の `type` / ポート名** | 未知のモジュールや存在しないポート名・逆方向接続（`IN ➔ OUT`）は当該モジュールまたは結線のみ安全に破棄され、`errors` 配列に利用可能なポート候補一覧付きのエラーメッセージを返します（パッチ全体はクラッシュしません）。 |
| **糖衣構文の自動変換** | ① `SPK1:wave_in` ➔ `wave_in_l` + `wave_in_r` 自動展開<br>② `SEQ8`/`SEQ16` の `steps[].cv` に音名文字列（`"C2"`, `"F#3"` 等）を指定した場合 ➔ 数値CVへ自動変換<br>③ `DELAY.delayTime` に `"1/8D"`, `"1/4"` 等の音価文字列を指定した場合 ➔ `bpm` から秒数へ自動変換<br>④ `OBJECT.shape` の `"box"` ➔ `"cube"`, `"icosahedron"` ➔ `"icosa"` 自動正規化 |
| **モジュールID命名規則** | 英数字とアンダースコア（例: `CLK1`, `SEQ8_1`, `SUB_KICK`）。数字で終わる `type`（`SEQ8`, `SEQ16`, `FMx3`, `MATH1`, `MATH2`, `DIST4`, `SLCT4`, `WAVE3D`）は `SEQ8_1` のようにアンダースコア区切り推奨。`SPK` は通常1台（`SPK1`）配置します。 |

---

## 2. トップレベル JSON スキーマと全モジュール索引 (Patch Schema & Type Index)

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

### 2.1 トップレベルフィールド定義
| フィールド | 型 | 必須 / 範囲 | デフォルト | 説明 |
| :--- | :--- | :--- | :--- | :--- |
| **`bpm`** | `number` | `40` 〜 `260` | `120` | **全ページ共通（グローバル）**のマスターテンポ |
| **`pages`** | `object` | `"0"`, `"1"` ... をキーとするマップ | - | `"0"` がメインページ、`"1"` 以降は `SUB` モジュールが参照するサブパッチ用ページ（ページ間の信号授受は `SUB` ⇔ `SUB_IO` ブリッジ経由で行います） |
| **`pages[p].name`** | `string` | 任意の文字列 | `"MAIN"` | ページ識別名 |
| **`pages[p].slots`** | `object` | `"0"` 〜 `"127"` をキーとするマップ | - | **使用スロットのみ記載**（空きスロットは省略）。`modules` のキーと1対1対応 |
| **`pages[p].modules`**| `object` | モジュールIDをキーとするマップ | - | 各モジュールの設定オブジェクト（`type` 必須） |
| **`pages[p].connections`** | `array` | `"ID1:out > ID2:in"` の配列 | `[]` | 同一ページ内の `modules` に実在するモジュール間の `OUT ➔ IN` 結線 |

### 2.2 全 42 モジュール `type` 完全一覧表（大小文字厳守）
| カテゴリ | 使用可能な `type` 名（完全一致） |
| :--- | :--- |
| **5.1 音源 (Sound)** | `VCO`, `NOISE`, `FMx3`（※`x`のみ小文字）, `FMCORE`, `WAVE` |
| **5.2 加工 (Filter/Fold)** | `VCF`, `FOLD` |
| **5.3 変調・EG・VCA** | `VCA`, `ADSR`, `AR`, `RF`, `LFO`, `SH`, `LAG` |
| **5.4 シーケンサ・論理・制御** | `CLK`, `SEQ8`, `SEQ16`, `PAT`, `KEY`, `COUNT`, `MATRIX`, `LUT`, `CHORD`, `MARKOV`, `DIST4`, `SLCT4`, `MATH1`, `MATH2`, `VALUE`, `SWITCH`, `PAD`, `GSENSOR` |
| **5.5 ミキサー・FX・出力・計測** | `MIX`, `DELAY`, `REVERB`, `SPK`, `SCOPE`, `LISS`, `SPEC` |
| **5.6 サブパッチ** | `SUB`, `SUB_IO` |
| **5.7 3D・映像パイプライン** | `OBJECT`, `PATH`, `PARTICLE`, `WAVE3D`, `ROTATE`, `MOVE`, `SCALE`, `VERTEX`, `SCATTER`, `RENDER`, `VFX`, `VMIX`, `DISPLAY` |

---

## 3. グリッド配置と信号・電圧・互換マトリクス (Grid & Signal Matrix)

### 3.1 グローバル電圧規格と信号互換マトリクス
| 信号種別 | 範囲・基準 | 相互接続の可否 | 多対1（Fan-in / 同一入力への複数結線）の合成挙動 |
| :--- | :--- | :--- | :--- |
| **Audio (`wave_*`)** | `±1.0V` (0dBFS) | **Audio / CV / Gate 間で相互接続可能**（すべて Web Audio の連続電圧信号として処理。例: `SUB1:mod_out (Audio) > SCOPE1:cv_in` や `LFO1:cv_out > VCF1:cv_in`） | **加算合成 (Sum)**。ただし複数音源のミックスはレベル調整のため `MIX` モジュール推奨 |
| **Pitch CV (`cv_*`)** | **1V/Oct**: `0.0V = C1 (32.70Hz, MIDI 24)`, `1.0V = C2`, `2.0V = C3` | Audio / CV / Gate 間で相互接続可能 | **加算合成 (Sum)**。`KEY1:cv_out` + `SEQ8_1:cv_out` ➔ `VCO1:cv_in` で鍵盤トランスポーズとして機能 |
| **Control CV (`*_cv`)** | Unipolar `0.0〜1.0V` / Bipolar `±1.0V` | Audio / CV / Gate 間で相互接続可能 | **加算合成 (Sum)** |
| **Gate / Trigger** | Low `0.0V` / High `1.0V`（検出閾値 `> 0.3V`、`1shotgate_in` は `≥ 0.4V`） | Audio / CV / Gate 間で相互接続可能 | **加算合成 (Sum)**。2本の Gate が同時に High になると `2.0V` になり閾値 `> 0.3V` を超えるため、**実質的に論理 OR として機能**します |
| **3D Object (`obj_*`)** | Three.js ジオメトリパケット | **`obj_out` ➔ `obj_in` / `base_in` / `child_in` 専用**（音声/CVとは接続不可） | **グループ合成 (Group)**。`MOVE`/`ROTATE`/`SCALE`/`RENDER` の `obj_in` に複数の `obj_out` を繋ぐと自動的に3Dコンテナグループとして一括処理・同時描画されます |
| **Video (`video_*`)** | WebGL 512×512 テクスチャ | **`video_out` ➔ `video_in` / `video_in1` / `video_in2` 専用**（音声/CVとは接続不可） | **単一入力**。2系統の映像を合成する場合は必ず `VMIX`（`video_in1`, `video_in2`）を使用します |

### 3.2 128スロット座標計算（4列 × 32行）
$$\text{slot} = \text{row} \times 4 + \text{col} \quad (\text{col} \in \{0, 1, 2, 3\},\ \text{row} \in \{0..31\})$$

| 行 (`row`) | `Col 0` (左端) | `Col 1` (中左) | `Col 2` (中右) | `Col 3` (右端) |
| :---: | :---: | :---: | :---: | :---: |
| **Row 0** | `"0"` | `"1"` | `"2"` | `"3"` (推奨: `SPK1`) |
| **Row 1** | `"4"` | `"5"` | `"6"` | `"7"` |
| **Row 2** | `"8"` | `"9"` | `"10"` | `"11"` |
| **Row 3** | `"12"` | `"13"` | `"14"` | `"15"` |

---

## 4. 結線ルール・ゲイン設計・頻出エラー防止 (Patching Rules & Pitfalls)

1. **禁止結線（エラー・無音の原因）**:
   - ❌ `LFO1:cv_in` / `LFO1:trig_in` ➔ 存在しません。LFOの入力は **`freq_cv_in`** と **`reset_in`** です。
   - ❌ `CLK1:power_in` ➔ 存在しません。クロックのリセット入力は **`reset_in`** です。
   - ❌ `VCO1:fm_in` / `VCO1:pwm_in` ➔ 存在しません。FM変調には **`FMx3`** または **`FMCORE`**（または `SUB` の `FACTORY_SOURCE`）を使用してください。
   - ❌ `MATRIX1:gate_out1` ➔ 存在しません。MATRIXの出力は **`out_1`, `out_2`, `out_3`, `out_4`** です。
   - ❌ `SCALE1:cv_in > VCO1:cv_in` ➔ `SCALE` は **3Dオブジェクト拡大縮小モジュール**（`obj_in` ➔ `obj_out`）です。ピッチCVのスケールクオンタイズには **`KEY` モジュール**（`cv_in` ➔ `cv_out`）を使用してください。
   - ❌ 同一モジュールの自己ループ（例: `RF1:trig_out > RF1:trig_in`）➔ 禁止（2台のモジュール間の相互ループ `RF1 ⇄ RF2` や `MARKOV1 ⇄ MARKOV2` は可能）。
2. **ゲインステージング指針（音割れ・無音防止）**:
   - `SPK` は内蔵リミッター（Threshold -1.5dB, Ratio 20:1）を備えていますが、`masterVol` は **`0.15` 〜 `0.35`** を推奨します。
   - **`VCA` に `ADSR` / `AR` / `RF` 等のエンベロープを結線する場合、必ず `VCA` の `"level": 0.0` に設定**してください（デフォルトの `1.0` のままだとゲートオフ時も音が鳴り続けます）。

---

## 5. モジュール別リファレンスマニュアル (Module-by-Module Reference Manual)

---

### 5.1 音源系 (Sound Generators)

#### `VCO` — アナログモデリング・マルチ波形オシレーター（最大4chポリ/ユニゾン）
単音リード・ベースから、`CHORD` と組み合わせた4声ポリフォニック演奏まで対応する基本オシレーターです。

- **ポート仕様 (`PORTS`)**:
  | ポート名 | ピン | 方向 | 信号 | 未結線時の挙動 | 変調対象・変換式・多対1合成 |
  | :--- | :---: | :---: | :---: | :--- | :--- |
  | `cv_in` | PIN5 | IN | CV | `freq1` (Hz) で固定発振 | **結線時は `freq1` を無視**し、$f = 32.7032 \times 2^{\text{cv}}$ Hz（`0.0V = C1`）で発振。複数結線時は電圧加算（トランスポーズ） |
  | `cv_in2` | PIN4 | IN | CV | `freq2` (Hz) で発振 | `channels >= 2` 時に有効。結線時は `freq2` を無視し 1V/Oct で発振 |
  | `cv_in3` | PIN3 | IN | CV | `freq3` (Hz) で発振 | `channels >= 3` 時に有効。結線時は `freq3` を無視し 1V/Oct で発振 |
  | `cv_in4` | PIN2 | IN | CV | `freq4` (Hz) で発振 | `channels == 4` 時に有効。結線時は `freq4` を無視し 1V/Oct で発振 |
  | `wave_out` | PIN10 | OUT | Audio | - | 全有効チャンネルを `0.15 / sqrt(channels)` で正規化ミックスして出力 |

- **パラメータ仕様 (`PARAMS`)**:
  | キー名 | 型 | 範囲 / 選択肢 | デフォルト | 詳細・CV結線時の扱い |
  | :--- | :--- | :--- | :---: | :--- |
  | `wave` | enum | `"sawtooth"` \| `"square"` \| `"sine"` \| `"triangle"` | `"sawtooth"` | 発振波形（※ノイズは `NOISE` モジュールを使用） |
  | `channels` | int | `1` 〜 `4` | `1` | 同時発振ボイス数。ポリフォニック時は `4` に設定 |
  | `quantize` | bool | `true` \| `false` | `true` | 手動スライダー操作時の半音スナップ有無（外部 `cv_in` は連続値のまま追従） |
  | `freq1..4` | number | `20` 〜 `2000` (Hz) | `220` | 各CHの未結線時発振周波数（対応する `cv_in` 結線時は無視されます） |

- **最小接続例**: `"SEQ8_1:cv_out > VCO1:cv_in"`, `"VCO1:wave_out > VCF1:wave_in"`

---

#### `NOISE` — カラーノイズジェネレーター（トーンフィルター内蔵）
ハイハット・スネアの原音や、風・波などのアンビエントテクスチャ、`SH` の外部ソースに使用します。

- **ポート仕様 (`PORTS`)**:
  | ポート名 | ピン | 方向 | 信号 | 未結線時の挙動 | 説明 |
  | :--- | :---: | :---: | :---: | :--- | :--- |
  | `wave_out` | PIN10 | OUT | Audio | - | フィルター＆レベル調整後の連続ノイズ波形を常時出力（入力端子なし） |

- **パラメータ仕様 (`PARAMS`)**:
  | キー名 | 型 | 範囲 / 選択肢 | デフォルト | 詳細 |
  | :--- | :--- | :--- | :---: | :--- |
  | `noiseType` | enum | `"white"` \| `"pink"` \| `"brown"` | `"white"` | ホワイト（全域均一）/ ピンク（-3dB/oct）/ ブラウン（-6dB/oct 低域重視） |
  | `tone` | number | `200` 〜 `16000` (Hz) | `8000` | 内蔵ローパスフィルターのカットオフ周波数 |
  | `level` | number | `0.0` 〜 `1.0` | `0.8` | 出力振幅レベル |

- **最小接続例**: `"NOISE1:wave_out > VCA1:wave_in"`

---

#### `FMx3` — 内蔵ADSR付き 3オペレータFM/PMシンセサイザー
各オペレータに独立したADSRエンベロープを内蔵しており、**外付けの `VCA` や `ADSR` なしで、`gate_in` と `cv_in` を繋ぐだけでベル・金属パーカッション・FMベース・エレピが完結**します。

- **ポート仕様 (`PORTS`)**:
  | ポート名 | ピン | 方向 | 信号 | 未結線時の挙動 | 変調対象・変換式 |
  | :--- | :---: | :---: | :---: | :--- | :--- |
  | `gate_in` | PIN4 | IN | Gate/Trig | 無音待機（`0.0V`） | 立ち上がり（`> 0.3V`）で全3オペレータの内蔵ADSRを同時トリガー |
  | `cv_in` | PIN5 | IN | CV | `rootMidi` の音程で発振 | **結線時は `rootMidi` を `48` (C3) 基準に固定**し、1V/Oct（`0.0V = C1`）でピッチ制御 |
  | `wave_out` | PIN10 | OUT | Audio | - | FM合成後のオーディオ出力 |

- **パラメータ仕様 (`PARAMS`)**:
  | キー名 | 型 | 範囲 / 選択肢 | デフォルト | 詳細 |
  | :--- | :--- | :--- | :---: | :--- |
  | `algorithm` | int | `1` \| `2` \| `3` | `1` | `1`: 直列 (`Op3➔Op2➔Op1` 金属音・ハードFM)<br>`2`: 並列 (`(Op3+Op2)➔Op1` エレピ・ベル・キック)<br>`3`: ハイブリッド (`Op3 + (Op2➔Op1)` スネア・アタック付加) |
  | `rootMidi` | int | `24` (C1) 〜 `72` (C5) | `48` (C3) | `cv_in` 未結線時の基準MIDIノート番号 |
  | `op1` | object | `{ ratio, level, attack, decay, sustain, release, aCurve, dCurve, rCurve }` | `ratio:1.0, level:0.85` | キャリア設定（`ratio`: `0.25〜16.0`, `level`: `0.0〜1.0`） |
  | `op2` | object | 同上 | `ratio:2.0, level:1.5` | モジュレータ1設定（`level`: `0.0〜5.0` 変調インデックス） |
  | `op3` | object | 同上 + `feedback`, `wave` | `ratio:3.5, level:1.8` | モジュレータ2設定（`feedback`: `0.0〜1.0`, `wave`: `"sine"` \| `"noise"`） |

- **最小接続例**: `"PAT1:cv_out > FMx3_1:cv_in"`, `"PAT1:gate_out > FMx3_1:gate_in"`, `"FMx3_1:wave_out > SPK1:wave_in_l"`

---

#### `FMCORE` — 西海岸/モジュラーPMオペレーター（外部オーディオ変調対応）
2台を直列接続（`FMCORE1:wave_out > FMCORE2:mod_in`）してコンプレックス・オシレーターを構築できる単体オペレーターです（連続発振のため後段に `VCA` または `FACTORY_LPG` を推奨）。

- **ポート仕様 (`PORTS`)**:
  | ポート名 | ピン | 方向 | 信号 | 未結線時の挙動 | 変調対象・変換式 |
  | :--- | :---: | :---: | :---: | :--- | :--- |
  | `cv_in` | PIN5 | IN | CV | `rootMidi` の音程で発振 | 結線時は `0.0V = C1 (32.70Hz)` 基準の 1V/Oct ピッチに `ratio` と `fine` を乗算 |
  | `mod_in` | PIN6 | IN | Audio | 位相変調なし（純粋な基本波形） | 外部オーディオ信号による位相変調（PM/FM）入力 |
  | `index_cv` | PIN7 | IN | CV | 手動 `index` 値を使用 | **結線時は手動 `index` が `0` になり**、$\text{effIndex} = \text{index\_cv} \times \text{index}$ で変調深さをVCA制御 |
  | `wave_out` | PIN10 | OUT | Audio | - | オペレーター波形出力 |

- **パラメータ仕様 (`PARAMS`)**:
  | キー名 | 型 | 範囲 / 選択肢 | デフォルト | 詳細 |
  | :--- | :--- | :--- | :---: | :--- |
  | `wave` | enum | `"sine"` \| `"triangle"` \| `"sawtooth"` \| `"square"` | `"sine"` | オペレーター基本波形（西海岸風には `"triangle"` 推奨） |
  | `rootMidi` | int | `24` 〜 `72` | `48` | `cv_in` 未結線時の基準MIDIノート |
  | `ratio` | number | `0.25` 〜 `16.0` | `1.0` | 周波数レシオ倍率 |
  | `fine` | number | `-50` 〜 `50` (cents) | `0` | デチューン微調整（セント） |
  | `index` | number | `0.0` 〜 `5.0` | `1.0` | `mod_in` に対する位相変調インデックス量 |
  | `feedback` | number | `0.0` 〜 `1.0` | `0.0` | 自己位相フィードバック量（倍音・エッジ付加） |
  | `level` | number | `0.0` 〜 `1.0` | `0.85` | 出力レベル |

- **最小接続例**: `"FMCORE1:wave_out > FMCORE2:mod_in"`, `"FMCORE2:wave_out > FOLD1:wave_in"`

---

#### `WAVE` — ループ＆スライス・サンプラー
> **AIパッチ生成時の注意**: `WAVE` は録音またはローカル音声ファイルを扱うモジュールです。新規パッチJSON単体では音声波形データを持たないため、**AIがゼロから音源を作る際は `VCO` / `FMCORE` / `FMx3` / `NOISE` / `SUB` を使用してください**。

- **ポート仕様 (`PORTS`)**: `gate_in` (PIN4), `start_cv` (PIN2), `end_cv` (PIN3), `speed_cv` (PIN5), `link_in` (PIN6) | OUT: `wave_out` (PIN10), `link_out` (PIN9)
- **パラメータ仕様 (`PARAMS`)**: `start` (`0.0〜1.0`), `end` (`0.0〜1.0`), `speed` (`-2.0〜2.0`), `loop` (`bool`), `retrigger` (`bool`), `pitchMode` (`bool`), `semiMode` (`bool`), `chopMode` (`"off"` \| `"seq"` \| `"cv"`)

---

### 5.2 音色加工系 (Filters & Waveshapers)

#### `VCF` — 1V/Oct 対応レゾナント・マルチモードフィルター
- **ポート仕様 (`PORTS`)**:
  | ポート名 | ピン | 方向 | 信号 | 未結線時の挙動 | 変調対象・変換式 |
  | :--- | :---: | :---: | :---: | :--- | :--- |
  | `wave_in` | PIN5 | IN | Audio | 無音 | フィルタリング対象のオーディオ入力 |
  | `cv_in` | PIN4 | IN | CV | ベース `cutoff` のみで動作 | ベース `cutoff` に対し $\text{detune (cents)} = \text{cv\_in} \times \text{modDepth}$ を**加算変調**（`modDepth: 1200` で `1.0V = +1オクターブ`） |
  | `wave_out` | PIN10 | OUT | Audio | - | フィルター通過後のオーディオ出力 |

- **パラメータ仕様 (`PARAMS`)**:
  | キー名 | 型 | 範囲 / 選択肢 | デフォルト | 詳細 |
  | :--- | :--- | :--- | :---: | :--- |
  | `filterType` | enum | `"lowpass"` \| `"highpass"` \| `"bandpass"` \| `"notch"` | `"lowpass"` | フィルター特性（UI表示は `LP`, `HP`, `BP`, `NOTCH`） |
  | `cutoff` | number | `32.7` 〜 `20000` (Hz) | `1800` | ベースカットオフ周波数（JSON内は Hz 値で保存。UI上は `0.00V(32.7Hz)〜9.25V(19.9kHz)` の 1V/Oct で表示・操作） |
  | `q` | number | `0.1` 〜 `20.0` | `2.5` | レゾナンス（共振ピークの強さ） |
  | `modDepth` | number | `-4800` 〜 `4800` (cents) | `1200` | `cv_in` 1Vあたりのカットオフ変調量（`1200` = `+1.00 OCT/V`, `2400` = `+2.00 OCT/V`） |

- **最小接続例**: `"VCO1:wave_out > VCF1:wave_in"`, `"ADSR1:cv_out > VCF1:cv_in"`

---

#### `FOLD` — ウェーブフォルダー（西海岸倍音付加シェイパー）
三角波やサイン波を折り畳み、独特の金属的・有機的な倍音を生成します。

- **ポート仕様 (`PORTS`)**:
  | ポート名 | ピン | 方向 | 信号 | 未結線時の挙動 | 変調対象・変換式 |
  | :--- | :---: | :---: | :---: | :--- | :--- |
  | `wave_in` | PIN5 | IN | Audio | 無音 | 入力オーディオ信号 |
  | `gain_cv` | PIN6 | IN | CV | 手動 `gain` 値で折り畳み | **結線時はベース `gain` が `0.0` になり**、$\text{effGain} = \text{gain\_cv} \times \text{gain}$ で折り畳み深さを変調（別名 `fold_cv` も受理） |
  | `wave_out` | PIN10 | OUT | Audio | - | ウェーブフォールド後のオーディオ出力 |

- **パラメータ仕様 (`PARAMS`)**:
  | キー名 | 型 | 範囲 / 選択肢 | デフォルト | 詳細 |
  | :--- | :--- | :--- | :---: | :--- |
  | `gain` | number | `0.0` 〜 `8.0` | `1.5` | フォールド・ドライブ倍率（または `gain_cv` 結線時のCV感度） |
  | `mix` | number | `0.0` 〜 `1.0` | `1.0` | Dry/Wet バランス（`1.0` = 100% Fold波形） |

- **最小接続例**: `"FMCORE2:wave_out > FOLD1:wave_in"`, `"AR1:cv_out > FOLD1:gain_cv"`

---

### 5.3 アンプ・エンベロープ・変調系 (Amps, Envelopes & Modulation)

#### `VCA` — ボルテージコントロールドアンプ
- **ポート仕様 (`PORTS`)**:
  | ポート名 | ピン | 方向 | 信号 | 未結線時の挙動 | 変調対象・変換式 |
  | :--- | :---: | :---: | :---: | :--- | :--- |
  | `wave_in` | PIN5 | IN | Audio | 無音 | 入力オーディオ（またはCV）信号 |
  | `cv_in` | PIN4 | IN | CV | `level` の固定ゲインで通過 | 出力ゲイン $G = \text{level} + (\text{cv\_in} \times \text{cvDepth})$ |
  | `wave_out` | PIN10 | OUT | Audio | - | 振幅制御後の出力信号 |

- **パラメータ仕様 (`PARAMS`)**:
  | キー名 | 型 | 範囲 / 選択肢 | デフォルト | 詳細 |
  | :--- | :--- | :--- | :---: | :--- |
  | `level` | number | `0.0` 〜 `1.0` | `1.0` | **重要**: エンベロープ（`ADSR`/`AR`/`RF`）を `cv_in` に繋ぐ場合は必ず **`"level": 0.0`** に設定してください |
  | `cvDepth` | number | `0.0` 〜 `2.0` | `1.0` | `cv_in` の変調感度 |

- **最小接続例**: `"VCF1:wave_out > VCA1:wave_in"`, `"ADSR1:cv_out > VCA1:cv_in"`

---

#### `ADSR` — 4ステージ・エンベロープジェネレーター
- **ポート仕様 (`PORTS`)**:
  | ポート名 | ピン | 方向 | 信号 | 未結線時の挙動 | 説明 |
  | :--- | :---: | :---: | :---: | :--- | :--- |
  | `gate_in` | PIN5 | IN | Gate | `0.0V` 出力（待機） | `> 0.3V` で Attack ➔ Decay ➔ Sustain、Low で Release へ遷移 |
  | `cv_out` | PIN10 | OUT | CV | - | `0.0V` 〜 `1.0V` のユニポーラ・エンベロープCV出力 |

- **パラメータ仕様 (`PARAMS`)**:
  | キー名 | 型 | 範囲 / 選択肢 | デフォルト | 詳細 |
  | :--- | :--- | :--- | :---: | :--- |
  | `attack` | number | `0.001` 〜 `2.0` (s) | `0.02` | アタック時間（秒） |
  | `decay` | number | `0.005` 〜 `3.0` (s) | `0.2` | ディケイ時間（秒） |
  | `sustain` | number | `0.0` 〜 `1.0` | `0.6` | サステイン保持レベル |
  | `release` | number | `0.005` 〜 `5.0` (s) | `0.4` | リリース時間（秒） |
  | `aCurve`, `dCurve`, `rCurve` | enum | `"lin"` \| `"exp"` \| `"log"` | `"lin"` / `"exp"` | 各ステージのカーブ形状 |

---

#### `AR` — アタック・リリース・エンベロープ（CV変調対応）
- **ポート仕様 (`PORTS`)**:
  | ポート名 | ピン | 方向 | 信号 | 未結線時の挙動 | 変調対象・変換式 |
  | :--- | :---: | :---: | :---: | :--- | :--- |
  | `gate_in` | PIN5 | IN | Gate | `0.0V` 出力 | High の間 Attack ➔ 1.0 保持、Low で Release |
  | `attack_in` | PIN6 | IN | CV | 手動 `attack` 時間 | 結線時は `attack` 時間を CV（`0〜1V`）でスケーリング（別名 `a_cv`, `attack_cv`） |
  | `release_in` | PIN7 | IN | CV | 手動 `release` 時間 | 結線時は `release` 時間を CV（`0〜1V`）でスケーリング（別名 `r_cv`, `release_cv`） |
  | `cv_out` | PIN10 | OUT | CV | - | `0.0V` 〜 `level` のエンベロープCV出力 |

- **パラメータ仕様 (`PARAMS`)**: `attack` (`0.005〜2.0`s, 既定 `0.05`), `release` (`0.005〜3.0`s, 既定 `0.2`), `level` (`0.0〜1.0`, 既定 `1.0`)

---

#### `RF` — ライズ・フォール・ファンクションジェネレーター（EOCトリガー出力付き）
トリガー1発で Rise ➔ Fall の1サイクルを実行し、完了時に `trig_out` からEOC（End of Cycle）パルスを出します。
- **ポート仕様 (`PORTS`)**:
  | ポート名 | ピン | 方向 | 信号 | 未結線時の挙動 | 変調対象・変換式 |
  | :--- | :---: | :---: | :---: | :--- | :--- |
  | `trig_in` | PIN5 | IN | Trig | `0.0V` 出力 | 立ち上がりエッジでサイクル開始 |
  | `time_cv` | PIN6 | IN | CV | 手動 `time` 値を使用 | 結線時は全体周期 `time` を CV（`0〜1V`）で制御 |
  | `peak_cv` | PIN7 | IN | CV | 手動 `peak` 比率を使用 | 結線時は Rise/Fall 比率 `peak` を CV（`0〜1V`）で制御 |
  | `cv_out` | PIN10 | OUT | CV | - | `0.0V` 〜 `level` のエンベロープCV出力 |
  | `trig_out` | PIN11 | OUT | Trig | - | Fall 完了時（EOC）にトリガーパルスを出力（別モジュールへの連鎖用） |

- **パラメータ仕様 (`PARAMS`)**: `time` (`0.02〜2.0`s, 既定 `0.2`), `peak` (`0.01〜0.99`, 既定 `0.5`: `0.05` 以下で鋭いパーカッション減衰), `level` (`0.0〜1.0`, 既定 `1.0`)

---

#### `LFO` — 低周波オシレーター（フリー周期 / BPMテンポ同期）
- **ポート仕様 (`PORTS`)**:
  | ポート名 | ピン | 方向 | 信号 | 未結線時の挙動 | 変調対象・変換式 |
  | :--- | :---: | :---: | :---: | :--- | :--- |
  | `reset_in` | PIN4 | IN | Trig | 連続フリーラン | 立ち上がりで位相を `phase` 初期位置へリセット |
  | `freq_cv_in` | PIN5 | IN | CV | 設定周期で発振 | LFO発振周波数を 1V/Oct スケールで変調（※`cv_in` ではなく `freq_cv_in`） |
  | `cv_out` | PIN10 | OUT | CV | - | LFO波形出力（`unipolar`: `0〜depth`, `bipolar`: `-depth〜+depth`） |

- **パラメータ仕様 (`PARAMS`)**:
  | キー名 | 型 | 範囲 / 選択肢 | デフォルト | 詳細・優先順位 |
  | :--- | :--- | :--- | :---: | :--- |
  | `waveType` | enum | `"sine"` \| `"triangle"` \| `"sawtooth"` \| `"ramp"` \| `"square"` | `"sine"` | LFO波形（`"sawtooth"` は下降ノコギリ、`"ramp"` は上昇ノコギリ） |
  | `polarity` | enum | `"bipolar"` \| `"unipolar"` | `"bipolar"` | `"bipolar"` = `±depth` V、`"unipolar"` = `0 〜 +depth` V |
  | `syncMode` | enum | `"free"` \| `"sync"` | `"free"` | `"sync"` 時はマスター `bpm` と `division` で周期が決定されます |
  | `division` | enum | `"4/1"`, `"2/1"`, `"1/1"`, `"1/2"`, `"1/4"`, `"1/8"`, `"1/16"`, `"1/32"`, `"1/4T"`, `"1/8T"`, `"1/4D"`, `"1/8D"` | `"1/4"` | `syncMode: "sync"` 時の同期音価 |
  | `period` / `rate` | number | `period`: `0.02〜30.0`s / `rate`: `0.03〜50.0`Hz | `period: 0.5` (`rate: 2.0`) | `syncMode: "free"` 時に有効。`period` が指定されていれば `rate = 1 / period` として優先同期されます |
  | `depth` | number | `0.0` 〜 `1.0` | `1.0` | 出力振幅 |
  | `phase` | number | `0` 〜 `360` (度) | `0` | 初期位相角（度） |
  | `duty` | number | `0.05` 〜 `0.95` | `0.5` | パルス幅（`waveType: "square"` 時のHigh比率、三角波の非対称スキューにも作用） |

---

#### `SH` — サンプル＆ホールド（内部ランダムノイズ源＆対称グライド内蔵）
- **ポート仕様 (`PORTS`)**:
  | ポート名 | ピン | 方向 | 信号 | 未結線時の挙動 | 説明 |
  | :--- | :---: | :---: | :---: | :--- | :--- |
  | `cv_in` | PIN5 | IN | CV | **内部ホワイトノイズを自動生成**してサンプリング | 結線時は外部入力信号（LFOやVCO等）の瞬時値をサンプリング |
  | `trig_in` | PIN4 | IN | Trig | ホールド値を維持 | 立ち上がり（`> 0.001V`）の瞬間に直前の入力値（または内部乱数）をホールド |
  | `cv_out` | PIN10 | OUT | CV | - | $\text{held} \times \text{scale}$ にグライドをかけたCV出力 |

- **パラメータ仕様 (`PARAMS`)**:
  | キー名 | 型 | 範囲 / 選択肢 | デフォルト | 詳細 |
  | :--- | :--- | :--- | :---: | :--- |
  | `polarity` | enum | `"unipolar"` \| `"bipolar"` | `"unipolar"` | `cv_in` 未結線時の内部乱数レンジ（`0〜1V` または `±1V`） |
  | `glide` | number | `0.0` 〜 `0.5` (s) | `0.0` | 目標値への対称RC漸近ポルタメント時定数（秒） |
  | `scale` | number | `-3.0` 〜 `3.0` | `1.0` | 出力電圧のスケーリング倍率 |

- **最小接続例**: `"CLK1:gate_out > SH1:trig_in"`, `"SH1:cv_out > KEY1:cv_in"`, `"KEY1:cv_out > VCO1:cv_in"`（スケールに則ったランダムメロディ）

---

#### `LAG` — スルーリミッター（CVポルタメント / エンベロープ平滑化）
- **ポート仕様 (`PORTS`)**: `cv_in` (PIN5: 入力CV), `time_cv` (PIN4: スルー時間変調CV) | OUT: `cv_out` (PIN10)
- **パラメータ仕様 (`PARAMS`)**: `timeMs` (`0〜2000` ms, デフォルト `50`), `cvDepth` (`0.0〜2.0`, デフォルト `1.0`)

---

### 5.4 クロック・シーケンサー・パターン・ロジック系 (Clock, Sequencers & Logic)

#### `CLK` — BPMテンポ同期マスタークロック
- **ポート仕様 (`PORTS`)**: `reset_in` (PIN5: 立ち上がりで位相を0へ即時リセット) | OUT: `gate_out` (PIN10: クロックパルス出力)
- **パラメータ仕様 (`PARAMS`)**:
  | キー名 | 型 | 範囲 / 選択肢 | デフォルト | 詳細 |
  | :--- | :--- | :--- | :---: | :--- |
  | `div` | enum | `"/16"`, `"/8"`, `"/4"`, `"/2"`, `"x1"`(4分), `"x2"`(8分), `"x4"`(16分), `"x8"`(32分), `"x16"` | `"x1"` | マスターBPMに対するクロック倍率（16分音符シーケンスには `"x4"`） |
  | `pulseWidthMs` | number | `1` 〜 `500` (ms) | `15` | ゲートHighのパルス幅（ミリ秒） |
  | `limitPct` | number | `10` 〜 `90` (%) | `90` | 周期に対する最大デューティ比上限 |

---

#### `SEQ8` / `SEQ16` — 8 / 16ステップシーケンサー（`1shotgate_in` 制御対応）
- **ポート仕様 (`PORTS`)**:
  | ポート名 | ピン | 方向 | 信号 | 未結線時の挙動 | 説明 |
  | :--- | :---: | :---: | :---: | :--- | :--- |
  | `gate_in` | PIN5 | IN | Clock | **停止（自動進行しません）** | **必須**: `CLK1:gate_out` 等のクロックを入力すると立ち上がりでステップ進行（別名 `clk_in`） |
  | `1shotgate_in` | PIN6 | IN | Gate | **常時RUN有効**（クロックに従い連続再生） | **結線時はゲート待機モード**: `≥ 0.4V` の間だけ先頭から再生し、`0V` で即停止＆リセット（旧名 `keygate_in` も互換受理） |
  | `gate_out` | PIN10 | OUT | Gate | - | 現在ステップの `gate: true` かつクロックHighの期間 `1.0V` を出力 |
  | `cv_out` | PIN11 | OUT | CV | - | 現在ステップの 1V/Oct ピッチCV（`0.0V = C1`, `1.0V = C2`）を出力 |

- **パラメータ仕様 (`PARAMS`)**:
  | キー名 | 型 | 範囲 / 選択肢 | デフォルト | 詳細 |
  | :--- | :--- | :--- | :---: | :--- |
  | `quantize` | bool | `true` \| `false` | `true` | `true` で半音（$1/12\text{V}$）単位にスナップ |
  | `keyMode` | enum | `"loop"` \| `"oneshot"` | `"loop"` | `1shotgate_in` 結線時の挙動（`"oneshot"` は1周再生後に自動停止し次のゲート立ち上がりまで待機） |
  | `steps` | array | 長さ8 (`SEQ8`) / 16 (`SEQ16`) | - | `{ "cv": 1.0, "active": true, "cvActive": true, "gate": true }` の配列（`cv` に `"C2"` 等の音名文字列を書いてもローダーが数値へ自動変換します） |

---

#### `PAT` — Strudel / TidalCycles ミニ記法パターンシーケンサー
外部クロック不要でマスター `bpm` に完全同期して自走する高機能パターンシーケンサーです。

- **ポート仕様 (`PORTS`)**:
  | ポート名 | ピン | 方向 | 信号 | 未結線時の挙動 | 説明 |
  | :--- | :---: | :---: | :---: | :--- | :--- |
  | `reset_in` | PIN5 | IN | Trig | 内部BPMで連続自走 | 立ち上がりでサイクル位相を先頭（0）へリセット（`CLK` 起点の `COUNT` と位相を完全一致させたい場合は開始トリガーを共有可能） |
  | `1shotgate_in` | PIN6 | IN | Gate | **常時再生** | 結線時は `≥ 0.4V` の間だけ先頭から再生し、`0V` で即停止＆リセット（旧名 `keygate_in` も互換受理） |
  | `gate_out` | PIN10 | OUT | Gate | - | ノート発音期間（ステップ長 × `gateLen`）に `1.0V` を出力 |
  | `cv_out` | PIN11 | OUT | CV | - | 1V/Oct ピッチCV（`c1` = `0.0V`, `c2` = `1.0V`, `c3` = `2.0V`）を出力 |

- **パラメータ仕様 (`PARAMS`)**:
  | キー名 | 型 | 範囲 / 選択肢 | デフォルト | 詳細 |
  | :--- | :--- | :--- | :---: | :--- |
  | `pattern` | string | ミニ記法文字列 | `"c2 e2 g2 b2"` | 音名 `c1〜c6`（シャープ `c#2` / フラット `eb2`, `bb1`）、休符 `~` または `-`、分割 `[a b]`、サイクル交代 `<a b>`、連打 `a*2`、伸長 `a@2`、タイ `a^` |
  | `cycleBeats` | number | `1`, `2`, `4`, `8`, `16`, `32` | `4` | 1サイクルの拍数（`4` = 1小節） |
  | `gateLen` | number | `0.05` 〜 `0.95` | `0.8` | 各ステップに対するゲート長比率 |
  | `keyMode` | enum | `"loop"` \| `"oneshot"` | `"loop"` | `1shotgate_in` 結線時に `"oneshot"` なら1サイクル（`<...>` がある場合は全サイクル一巡）で自動停止 |

---

#### `KEY` — 16鍵リボンキーボード 兼 リアルタイム・スケールクオンタイザー
- **ポート仕様 (`PORTS`)**:
  | ポート名 | ピン | 方向 | 信号 | 未結線時の挙動 | 説明 |
  | :--- | :---: | :---: | :---: | :--- | :--- |
  | `cv_in` | PIN5 | IN | CV | 手動鍵盤モード（最後に押した鍵盤または初期値 `cv` を保持出力） | **結線時はリアルタイム・スケールクオンタイザーとして動作**: 入力CVを `root` と `scale` の構成音へ即座にスナップして `cv_out` へ出力 |
  | `cv_out` | PIN11 | OUT | CV | - | $\text{CV} = (\text{octave} - 1) + \text{semitone}/12$（例: `octave: 2, root: 0` の C2 鍵 = `1.0V`）。**無押下時も直前のCV値（初期値 `cv: 1.0`）を保持出力**します |
  | `gate_out` | PIN10 | OUT | Gate | - | 画面上の鍵盤を押下している間のみ `1.0V`、**無押下時は厳格に `0.0V`** |

- **パラメータ仕様 (`PARAMS`)**:
  | キー名 | 型 | 範囲 / 選択肢 | デフォルト | 詳細 |
  | :--- | :--- | :--- | :---: | :--- |
  | `octave` | int | `1` 〜 `5` | `3` | 鍵盤の基準オクターブ（`1`=C1:0V, `2`=C2:1V, `3`=C3:2V） |
  | `root` | int | `0` 〜 `11` | `0` (C) | スケールのルート音（`0`=C, `2`=D, `4`=E, `5`=F, `7`=G, `9`=A, `11`=B） |
  | `scale` | enum | `"CHROMATIC"` \| `"MAJOR"` \| `"MINOR"` \| `"PENT.MAJ"` \| `"PENT.MIN"` \| `"DORIAN"` \| `"PHRYGIAN"` \| `"BLUES"` \| `"HARM.MIN"` | `"CHROMATIC"` | クオンタイズおよび鍵盤マスクのスケール |
  | `cv` | number | `0.0` 〜 `5.0` | `1.0` | 初期出力CV（`SEQ` の `cv_out` と同じ `VCO:cv_in` に並列接続すると、この値がオフセットとして加算されます） |
  | `legato` | bool | `true` \| `false` | `false` | スライド演奏時に Gate を途切れさせないレガートモード |

---

#### `COUNT` — ステップカウンター ＆ 正規化ランプCVジェネレーター
`MATRIX` や `LUT` を駆動するための位相ランプ生成器です。
- **ポート仕様 (`PORTS`)**:
  | ポート名 | ピン | 方向 | 信号 | 未結線時の挙動 | 説明 |
  | :--- | :---: | :---: | :---: | :--- | :--- |
  | `clk_in` | PIN5 | IN | Clock | カウント停止（`0.0V`） | 立ち上がりごとにカウント `step = (step + 1) % max` を進行（別名 `gate_in`） |
  | `reset_in` | PIN4 | IN | Trig | - | 立ち上がりでカウントを `0` にリセット |
  | `cv_out` | PIN10 | OUT | CV | - | $\text{cv\_out} = \text{step} / \text{max}$（`0.0V` 〜 `(max-1)/max V` の正規化ステップランプCV） |
  | `carry_out` | PIN11 | OUT | Trig | - | カウントが1周して `0` に戻る瞬間にトリガーパルスを出力 |

- **パラメータ仕様 (`PARAMS`)**: `max` (`8`, `16`, `32`, `64`, `128`, `256`, デフォルト `16`)

---

#### `MATRIX` — 4トラック・リズムマトリックスシーケンサー
- **ポート仕様 (`PORTS`)**:
  | ポート名 | ピン | 方向 | 信号 | 未結線時の挙動 | 説明 |
  | :--- | :---: | :---: | :---: | :--- | :--- |
  | `cv_in` | PIN5 | IN | CV | ステップ0で静止 | `0.0V 〜 1.0V` の正規化位相CV（`COUNT:cv_out` を接続）から $\text{step} = \lfloor \text{cv\_in} \times \text{divisions} \rfloor \bmod \text{divisions}$ を算出 |
  | `out_1..4` | PIN7..10 | OUT | Gate/Trig | - | 各トラックの出力（**`out_1`, `out_2`, `out_3`, `out_4`** ※アンダースコア必須） |

- **パラメータ仕様 (`PARAMS`)**:
  | キー名 | 型 | 範囲 / 選択肢 | デフォルト | 詳細 |
  | :--- | :--- | :--- | :---: | :--- |
  | `divisions` | int | `16` \| `32` \| `64` | `16` | 有効ステップ分割数（`COUNT.max` と同じ値に揃えるのが基本です） |
  | `patterns` | array | 4 × 64配列 (`0` or `1`) | - | **内部バッファは各トラック長さ64の配列ですが、再生時は先頭 `divisions` 要素（0 〜 `divisions-1`）のみが使用されます** |
  | `modes` | array | `["trig"\|"gate", ...]` (長さ4) | `["gate",...]` | **`"trig"`**: ステップ進入時に **約10msの短いトリガーパルス** を出力（ドラムSUBや `RF` に最適）<br>**`"gate"`**: ステップ期間中ずっと `1.0V` を維持し、ステップ切り替わり時に2msのギャップを挿入（`ADSR` に最適） |

---

#### `LUT` — 256ステップ CVルックアップテーブル / カスタムシェイパー
- **ポート仕様 (`PORTS`)**: `cv_in` (PIN5: `0.0〜1.0V` の位相CV、未結線時は `0.0V`) | OUT: `cv_out` (PIN10: テーブル参照値 `0.0〜1.0V`)
- **パラメータ仕様 (`PARAMS`)**: `divisions` (`16` \| `32` \| `64` \| `256`, 既定 `16`), `quantize` (`bool`, 既定 `false`), `table` (長さ256の `0.0〜1.0` 配列、先頭 `divisions` 分をインデックス参照)

---

#### `CHORD` — 4和音ボイシング・ジェネレーター
単音の1V/Oct CVから、指定コードの4声（Root, 3rd, 5th, 7th/9th）の1V/Oct CVを同時出力します。
- **ポート仕様 (`PORTS`)**:
  | ポート名 | ピン | 方向 | 信号 | 未結線時の挙動 | 説明 |
  | :--- | :---: | :---: | :---: | :--- | :--- |
  | `cv_in` | PIN5 | IN | CV | `rootMidi` の音程を基準に和音生成 | 結線時は入力 1V/Oct CV をルート音として4声のピッチCVを生成 |
  | `cv_out1..4` | PIN10..13 | OUT | CV | - | 第1声〜第4声の 1V/Oct CV（`VCO` の `channels: 4` の `cv_in`, `cv_in2`, `cv_in3`, `cv_in4` へ接続。後段の `VCA` / `ADSR` は共通1系統で4声一括開閉できます） |

- **パラメータ仕様 (`PARAMS`)**:
  - `chord`: `"min"` \| `"maj"` \| `"sus4"` \| `"sus2"` \| `"m7"` \| `"7th"` \| `"Maj7"` \| `"m7b5"` \| `"5th"` \| `"open_min"` \| `"open_maj"` \| `"add9"` \| `"m9"` \| `"9th"` \| `"dim7"` \| `"aug"`（既定 `"min"`）
  - `rootMidi`: `24` 〜 `72`（既定 `48` = C3）

---

#### `MARKOV` — マルコフ連鎖ステートノード
複数台の `MARKOV` を `trans_out1..3 > trans_in` で相互結線し、確率的オートマトン作曲を行います。
- **ポート仕様 (`PORTS`)**:
  - IN: `gate_in` (PIN5: クロック入力), `trans_in` (PIN6: 他ノードからの状態遷移トリガー)
  - OUT: `trans_out1` (PIN11), `trans_out2` (PIN12), `trans_out3` (PIN13), `startgate_out` (PIN7), `gate_out` (PIN8), `longgate_out` (PIN9), `cv_out` (PIN10: アクティブ時に自身のピッチCVを出力、非アクティブ時は `0.0V`)
- **パラメータ仕様 (`PARAMS`)**: `initOn` (`bool`: 最初の1台のみ `true` に設定), `rootMidi` (`24〜72`, 既定 `48`), `quantize` (`bool`), `holdClocks` (`1〜16`, 既定 `1`), `weights` (`[self, out1, out2, out3]` の遷移確率重み配列、例: `[2, 5, 3, 0]`)
- **最小接続例**:
  `"CLK1:gate_out > MARKOV1:gate_in"`, `"CLK1:gate_out > MARKOV2:gate_in"`, `"MARKOV1:trans_out1 > MARKOV2:trans_in"`, `"MARKOV2:trans_out1 > MARKOV1:trans_in"`, `"MARKOV1:cv_out > VCO1:cv_in"`, `"MARKOV2:cv_out > VCO1:cv_in"`

---

#### `DIST4` — 1入力➔4出力ロータリー分配器（クロック分周・ポリリズム生成）
- **ポート仕様 (`PORTS`)**: `cv_in` (PIN4: 未結線時は内部で `1.0V` を供給), `gate_in` (PIN5: 立ち上がりで出力先チャンネルを切り替え) | OUT: `cv_out1` (PIN10), `cv_out2` (PIN11), `cv_out3` (PIN12), `cv_out4` (PIN13)
- **パラメータ仕様 (`PARAMS`)**: `steps` (`2`〜`4`, 既定 `4`), `mode` (`"up"` \| `"down"` \| `"updown"` \| `"random"`, 既定 `"up"`)

---

#### `SLCT4` — 4入力➔1出力マルチプレクサ
- **ポート仕様 (`PORTS`)**: `gate_in` (PIN5: チャンネル切替クロック), `cv_in1..4` (PIN4, PIN3, PIN2, PIN1) | OUT: `gate_out` (PIN10), `cv_out` (PIN11: 選択中の入力チャンネル信号を出力)
- **パラメータ仕様 (`PARAMS`)**: `mode` (`"up"` \| `"down"` \| `"updown"` \| `"random"`, 既定 `"up"`)

---

#### `MATH1` / `MATH2` — 単項・二項 CV/Audio 演算モジュール
- **`MATH1`**:
  - **PORTS**: `cv_in_a` (PIN5: 未結線時は `valA` を使用) | OUT: `cv_out` (PIN10)
  - **PARAMS**: `mode` (`"ABS"` \| `"FLOOR"` \| `"CEIL"` \| `"ROUND"` \| `"INT"` \| `"NOT"` \| `"SIN"` \| `"COS"` \| `"TAN"`), `valA` (`-10〜10`, 既定 `0`)
- **`MATH2`**:
  - **PORTS**: `cv_in_a` (PIN5: 未結線時は `valA`), `cv_in_b` (PIN6: 未結線時は `valB`) | OUT: `cv_out` (PIN10)
  - **PARAMS**: `mode` (`"ADD"` \| `"DIFF"` \| `"MULTI"` \| `"MOD"` \| `"A^B"` \| `"MIN"` \| `"MAX"` \| `"<"` \| `"<="` \| `"=="` \| `">="` \| `">"` \| `"AND"` \| `"OR"` \| `"NAND"` \| `"NOR"` \| `"XOR"`), `valA` (既定 `0.0`), `valB` (既定 `1.0`)

---

#### `VALUE` / `SWITCH` / `PAD` / `GSENSOR` — マニュアル制御・コントローラー群
- **`VALUE`（定数CV / ポテンショメータ）**:
  - **PORTS**: IN なし | OUT: `cv_out` (PIN10: 設定値 `val` を常時出力)
  - **PARAMS**: `label` (文字列, 既定 `"VALUE"`), `val` (既定 `0.5`), `min` (既定 `0.0`), `max` (既定 `1.0`), `stepType` (`"0.01"` \| `"0.1"` \| `"1semi"` \| `"1"` \| `"10"`)
- **`SWITCH`（ミュートスイッチ）**:
  - **PORTS**: `cv_in` (PIN5) | OUT: `cv_out` (PIN10)
  - **PARAMS**: `state` (`true` = 通過 / `false` = 0.0V ミュート)
- **`PAD`（XYタッチパッド）**:
  - **PORTS**: `hue_cv` (PIN4), `bright_cv` (PIN3) | OUT: `x_cv` (PIN11), `y_cv` (PIN12), `gate_out` (PIN10)
  - **PARAMS**: `name`, `polX` (`"bi"` \| `"uni"`), `polY` (`"bi"` \| `"uni"`), `hue` (`0〜1`), `sat` (`0〜1`), `bright` (`0〜1`)
- **`GSENSOR`（3軸加速度・傾きセンサー）**:
  - **PORTS**: IN なし | OUT: `x_out` (PIN10), `y_out` (PIN11), `z_out` (PIN12)
  - **PARAMS**: `smooth` (`0.0〜0.95`, 既定 `0.5`)

---

### 5.5 ミキサー・エフェクト・出力・アナライザー系 (Mix, FX, Output & Analyzers)

#### `MIX` — 2〜4ch オーディオ/CVミキサー
- **ポート仕様 (`PORTS`)**: `wave_in1` (PIN5), `wave_in2` (PIN4), `wave_in3` (PIN3, `channels >= 3`), `wave_in4` (PIN2, `channels == 4`) | OUT: `wave_out` (PIN10)
- **パラメータ仕様 (`PARAMS`)**: `channels` (`2〜4`, 既定 `2`), `lvl1..4` (`0.0〜1.0`, 既定 `1.0`), `mute1..4` (`bool`, 既定 `false`)

---

#### `DELAY` — エコー / ディレイ（BPM音価記法対応）
- **ポート仕様 (`PORTS`)**: `wave_in` (PIN5: モノラル入力) | OUT: `wave_out` (PIN10: Dry + Wet ミックス出力)
- **パラメータ仕様 (`PARAMS`)**:
  | キー名 | 型 | 範囲 / 選択肢 | デフォルト | 詳細・BPM同期計算式 |
  | :--- | :--- | :--- | :---: | :--- |
  | `delayTime` | number / string | `0.02` 〜 `1.5` (s) または `"1/8D"`, `"1/4"`, `"1/8"`, `"1/16"` | `0.3` | 秒指定のほかに `"1/8D"`（付点8分）等の文字列を書くとローダーが $\text{delayTime} = \frac{60}{\text{bpm}} \times \text{拍数}$ で自動変換します（拍数: `1/4` = `1.0`, `1/8D` = `0.75`, `1/8` = `0.5`, `1/16` = `0.25`） |
  | `feedback` | number | `0.0` 〜 `0.95` | `0.4` | フィードバック減衰率 |
  | `mix` | number | `0.0` 〜 `1.0` | `0.5` | Wet ミックス量 |

---

#### `REVERB` — ワイドステレオ・マルチモード・コンボリューションリバーブ
左右非対称の初期反射（ハース効果）と Mid/Side ステレオ拡散を備えた真のステレオリバーブです。
- **ポート仕様 (`PORTS`)**:
  | ポート名 | ピン | 方向 | 信号 | 未結線時の挙動 | 説明 |
  | :--- | :---: | :---: | :---: | :--- | :--- |
  | `wave_in` | PIN5 | IN | Audio | 無音 | 入力オーディオ信号（内部で95Hz HPF＋`damp` LPFを経てステレオ拡散） |
  | `cv_in` | PIN4 | IN | CV | 手動 `mix` でイコールパワー合成 | **結線時は Dry が `0.85` に固定**され、Wet ゲインが $\text{cv\_in} \times \text{cvDepth} \times 1.4$ で直接制御されます |
  | `wave_out` | PIN10 | OUT | Audio | - | ステレオバス（Lch / 2ch Stereo）出力。`SPK1:wave_in_l` に接続 |
  | `wave_out_r` | PIN11 | OUT | Audio | - | ステレオ右チャンネル（Rch）専用出力。`SPK1:wave_in_r` に接続（`wave_out` を `SPK1` の L/R 両方に繋いでも `SPK` 側で自動的に L/R 分離されます） |

- **パラメータ仕様 (`PARAMS`)**:
  | キー名 | 型 | 範囲 / 選択肢 | デフォルト | 詳細 |
  | :--- | :--- | :--- | :---: | :--- |
  | `mode` | enum | `"room"` \| `"hall"` \| `"plate"` \| `"space"` | `"space"` | **`"space"`** はふわっと広がる Bloom アタックと超ワイドなアンビエント空間を生成 |
  | `time` | number | `0.2` 〜 `10.0` (s) | `2.8` | 残響テール長（秒 **※キー名は `decay` ではなく `time`**） |
  | `damp` | number | `500` 〜 `16000` (Hz) | `6500` | 高域ダンピング・ローパス周波数 |
  | `mix` | number | `0.0` 〜 `1.0` | `0.45` | Dry/Wet イコールパワーバランス（`cv_in` 未結線時） |
  | `cvDepth` | number | `0.0` 〜 `2.0` | `1.0` | `cv_in` 結線時の Wet 変調感度 |

- **最小接続例**: `"VCA1:wave_out > REVERB1:wave_in"`, `"REVERB1:wave_out > SPK1:wave_in_l"`, `"REVERB1:wave_out_r > SPK1:wave_in_r"`

---

#### `SPK` — マスターステレオスピーカー出力（リミッター＆MP3録音内蔵）
- **ポート仕様 (`PORTS`)**: `wave_in_l` (PIN5: 左CH入力), `wave_in_r` (PIN6: 右CH入力) | OUT: なし
  - ※2chステレオ信号（`REVERB1:wave_out` 等）が接続された場合、`wave_in_l` は Ch0(L)、`wave_in_r` は Ch1(R) を自動抽出し、1chモノラル信号が接続された場合は両チャンネルとも同相で出力します。
- **パラメータ仕様 (`PARAMS`)**: `masterVol` (`0.0〜0.5`, デフォルト `0.12`, 推奨 `0.16〜0.35`)

---

#### `SCOPE` / `LISS` / `SPEC` — ビジュアル・アナライザー群
- **`SCOPE`（オシロスコープ）**:
  - **PORTS**: `cv_in` (PIN5: 観測するAudio/CV信号), `trig_in` (PIN6: 外部シンクロトリガー、未結線時は内部ゼロクロス同期) | OUT: なし
  - **PARAMS**: `timeSpan` (`0.001〜5.0`s, 既定 `0.05`), `vRange` (`0.5〜20.0`V, 既定 `2`), `trigMode` (`"auto"` \| `"free"`, 既定 `"auto"`)
- **`LISS`（XYリサジュー・フェーズスコープ）**:
  - **PORTS**: `cv_in_x` (PIN5), `cv_in_y` (PIN6) | OUT: なし | **PARAMS**: `vRange` (`0.5〜10.0`V, 既定 `2`)
- **`SPEC`（20Hz-20kHz 対数FFTスペクトラムアナライザー）**:
  - **PORTS**: `wave_in` (PIN5) | OUT: なし | **PARAMS**: `mode` (`"bar"` \| `"curve"`, 既定 `"bar"`), `smooth` (`0.0〜0.95`, 既定 `0.75`)

---

### 5.6 サブパッチ (`SUB` / `SUB_IO`) ＆ 内蔵ファクトリー音源 (`FACTORY_*`)

Gridsynth は1スロットに複数モジュールの回路をカプセル化する `SUB` モジュールを備えています。使い方は **① 内蔵ファクトリーSUBの呼び出し** と **② カスタムSUBページの定義** の2通りあります。

#### ① 内蔵ファクトリーサブパッチ一覧 (`"type": "SUB", "subType": "..."` で自動展開)
| `subType` (または別名) | カテゴリ | 入力ポート (`IN`) | 出力ポート (`OUT`) | 内部構成・特徴 |
| :--- | :---: | :--- | :--- | :--- |
| **`"FACTORY_SOURCE"`** (`"ComplexSource"`) | West Coast | `cv_in` (`PIN5`), `mod_cv` (`PIN4`), `fold_cv` (`PIN3`) | `wave_out` (`PIN10`), `mod_out` (`PIN11`) | Volca Modular 風コンプレックス・オシレーター（`FMCORE1(tri)` ➔ `FMCORE2(tri)` ➔ `FOLD1`） |
| **`"FACTORY_LPG"`** (`"LowPassGate"`) | West Coast | `wave_in` (`PIN5`), `cv_in` (`PIN4`), `PIN3_in` (Env) | `wave_out` (`PIN10`) | バクトール風ローパスゲート（`VCF` + `VCA` を `MATH2(MULTI)` で同時開閉） |
| **`"FACTORY_VOICE"`** (`"MonoVoice"`) | Synth | `cv_in` (`PIN5`), `gate_in` (`PIN4`) | `wave_out` (`PIN10`) | 王道モノシンセ (`VCO`+`VCF`+`ADSR`+`VCA`) |
| **`"FACTORY_ACID"`** (`"AcidBass"`) | Synth | `cv_in` (`PIN5`), `trig_in` (`PIN4`) | `wave_out` (`PIN10`) | 303系強レゾナンス・アシッドベース |
| **`"FACTORY_DUAL_VCO"`** (`"DualLead"`) | Synth | `cv_in` (`PIN5`), `gate_in` (`PIN4`) | `wave_out` (`PIN10`) | デュアルVCOデチューン・リード |
| **`"FACTORY_KICK"`** (`"Kick"`) | Drum | `trig_in` (`PIN5`) | `wave_out` (`PIN10`) | 808/909系パンチのあるバスドラム |
| **`"FACTORY_KICK2"`** (`"TechnoKick"`) | Drum | `trig_in` (`PIN5`) | `wave_out` (`PIN10`) | ハードテクノ向け重低音キック |
| **`"FACTORY_SUB_KICK"`** (`"SubKick"`) | Drum | `trig_in` (`PIN5`) | `wave_out` (`PIN10`) | ディープ・サブベースキック |
| **`"FACTORY_SNARE"`** (`"Snare"`) | Drum | `trig_in` (`PIN5`) | `wave_out` (`PIN10`) | スナッピーなアナログスネア |
| **`"FACTORY_RIM"`** (`"Rimshot"`) | Drum | `trig_in` (`PIN5`) | `wave_out` (`PIN10`) | シャープなリムショット |
| **`"FACTORY_GHOST_SNARE"`** (`"Ghost"`) | Drum | `trig_in` (`PIN5`) | `wave_out` (`PIN10`) | ゴーストノート用ショートスネア |
| **`"FACTORY_CLAP"`** (`"Clap"`) | Drum | `trig_in` (`PIN5`) | `wave_out` (`PIN10`) | マルチバースト・ハンドクラップ |
| **`"FACTORY_HIHAT"`** (`"HiHat"`) | Drum | `trig_in` (`PIN5`) | `wave_out` (`PIN10`) | クリスプなクローズドハイハット |
| **`"FACTORY_CH_SOFT"`** (`"HiHatSoft"`) | Drum | `trig_in` (`PIN5`) | `wave_out` (`PIN10`) | ソフトなシェイカー風ハイハット |
| **`"FACTORY_OPEN_HAT"`** (`"OpenHat"`) | Drum | `trig_in` (`PIN5`) | `wave_out` (`PIN10`) | メタリックなオープンハイハット |
| **`"FACTORY_COWBELL"`** (`"Cowbell"`) | Drum | `trig_in` (`PIN5`) | `wave_out` (`PIN10`) | 808風FMカウベル |
| **`"FACTORY_TOM"`** / **`"FACTORY_HIGH_TOM"`** | Drum | `trig_in` (`PIN5`) | `wave_out` (`PIN10`) | エレクトロニック・タム |
| **`"FACTORY_PERC"`** / **`"FACTORY_PERC2"`** | Drum | `trig_in` (`PIN5`) | `wave_out` (`PIN10`) | FMメタリックパーカッション |
| **`"FACTORY_CRASH"`** (`"Crash"`) | Drum | `trig_in` (`PIN5`) | `wave_out` (`PIN10`) | ロングディケイ・クラッシュシンバル |
| **`"FACTORY_SPACE_FX"`** (`"SpaceFx"`) | FX | `wave_in` (`PIN5`) | `wave_out` (`PIN10`) | ディレイ＋リバーブ複合空間エフェクト |

#### ② カスタム `SUB` ＆ `SUB_IO` の作成・結線ルール（AIが迷わないための原則）
- メインページ（`pages["0"]`）に `"SUB1": { "type": "SUB", "targetPage": 1 }` を配置し、`pages["1"]` に `"SUB_IO1": { "type": "SUB_IO" }` を配置します。
- **ピンの対応関係**:
  - 入力側（PIN1〜PIN7）: 親ページの `SUB1:PIN5_in` に入れた信号が、子ページの **`SUB_IO1:PIN5_out`** から出力されます。
  - 出力側（PIN8〜PIN14）: 子ページの **`SUB_IO1:PIN10_in`** に入れた信号が、親ページの `SUB1:PIN10_out` から出力されます。
- **物理ピン名 vs エイリアス名称の使い分け（重要）**:
  - **ユーザーサブパッチ（カスタム `SUB`）を結線するときは、常に物理ピン名（`PIN1_in〜PIN7_in`, `PIN8_out〜PIN14_out` / 子ページ `SUB_IO` は `PIN1_out〜PIN7_out`, `PIN8_in〜PIN14_in`）を使用してください。** 物理ピン名は全サブパッチで共通・一意なため、任意名称の有無で迷うことがありません。
  - `manifest.ports`（例: `{ "cutoff_cv": { "pin": "PIN4", "signal": "cv" } }`）は、UI上のピン表示名およびエイリアス辞書です（空白や `:` 等はローダーが自動的に `_` へサニタイズします）。
  - ファクトリーSUBの音色パラメータをカスタマイズしたい場合も、`pages["1"]` に展開後の内部モジュール（`VCO1`, `VCF1` 等）を記述して `targetPage: 1` で参照すれば自由に調整可能です。

---

### 5.7 3D グラフィックス・映像パイプライン (3D & Video Reference Manual)

信号フロー: **`OBJECT` / `PATH` / `PARTICLE` / `WAVE3D` (`obj_out`) ➔ `ROTATE` / `MOVE` / `SCALE` / `VERTEX` / `SCATTER` (`obj_in > obj_out`) ➔ `RENDER` (`obj_in > video_out`) ➔ `VFX` / `VMIX` (`video_in > video_out`) ➔ `DISPLAY` (`video_in`)**

#### 1. 3D ジェネレーター (`obj_out` を出力)

##### `OBJECT` — 3Dプリミティブ・メッシュジェネレーター
- **PORTS**: IN なし | OUT: `obj_out` (PIN10: 基準半径約1.0の3Dジオメトリパケットを原点 `[0,0,0]` に生成)
- **PARAMS**:
  - `shape`: `"torus"` \| `"cube"` \| `"plane"` \| `"sphere"` \| `"cylinder"` \| `"cone"` \| `"tetra"` \| `"octa"` \| `"dodeca"` \| `"icosa"`（既定 `"torus"`）
  - `detail`: `"low"` \| `"mid"` \| `"high"`（ポリゴン分割数、既定 `"mid"`）
  - `material`: `"wire"` \| `"solid"` \| `"normal"` \| `"toon"` \| `"point"` \| `"glass"`（既定 `"wire"`）
  - `color`: `"#ffffff"` 等の16進カラー, `wireWidth`: `0.5〜5.0`, `pointSize`: `1.0〜10.0`, `glow`: `0.0〜1.0`（HDRブルーム発光強度）, `mirror`: `0.0〜1.0`（環境反射率）

##### `PATH` — 2D/3D ライン・円弧・正多角形ジェネレーター
- **PORTS**:
  - `cv_in` (PIN4: **結線時は `0.0〜1.0V` にクランプ**され、`shape: "arc"` 時は `arc = max(0.02, cv)` で円弧の開閉角を直接制御、`shape: "poly"` 時は `sides = round(2 + cv * 14)` で2〜16角形へ動的変形)
  - `obj_out` (PIN10: 半径1.2のパスジオメトリ出力)
- **PARAMS**: `shape` (`"line"` \| `"arc"` \| `"poly"`), `renderMode` (`"line"` \| `"fill"`), `points` (`2〜128`), `arc` (`0.05〜1.0`, 既定 `1.0`), `sides` (`3〜16`, 既定 `6`), `material` (`"wire"` \| `"solid"` \| `"glass"` \| `"point"`), `glow` (`0.0〜1.0`), `color` (`"#ffffff"`)

##### `PARTICLE` — 3Dポイントクラウド・パーティクルシステム
- **PORTS**:
  - `cv_in` (PIN4: `cvTarget` で指定したパラメータをリアルタイム変調)
  - `obj_in` (PIN5: 未結線時は `dist` 形状に分布、**結線時は入力3Dオブジェクトの頂点座標からパーティクルを発生**)
  - `gate_in` (PIN6: `> 0.5V` の立ち上がりエッジで乱数シードを更新しパーティクルを再散布バースト)
  - `obj_out` (PIN10)
- **PARAMS**: `dist` (`"sphere"` \| `"cube"` \| `"ring"` \| `"spiral"`, 既定 `"sphere"`), `count` (`1〜2000`, 既定 `400`), `spread` (`0.0〜4.0`, 既定 `1.5`), `pointSize` (`1.0〜10.0`, 既定 `3.0`), `speed` (`0.0〜2.0`, 既定 `0.4`), `cvTarget` (`"spread"` \| `"size"` \| `"speed"`, 既定 `"spread"`), `color` (`"#22d3ee"`)

##### `WAVE3D` — 音声駆動 3D ウォーターフォール地形ジェネレーター
- **PORTS**:
  - `wave_in` (PIN5: 解析対象のAudio信号)
  - `cv_in` (PIN4: 未結線時は手動 `gain`、**結線時は $\text{effGain} = \max(0.05, \text{gain} \times (0.2 + \max(0, \text{cv})))$ で波高倍率を動的変調**)
  - `obj_out` (PIN10)
- **PARAMS**: `sourceMode` (`"wave"` オシロ波形 \| `"spec"` 20Hz-20kHz対数FFTスペアナ), `style` (`"ribbon"` \| `"point"` \| `"bars"`), `slices` (`16〜64`, 既定 `40`), `cols` (`24〜96`, 既定 `64`), `gain` (`0.2〜4.0`, 既定 `1.5`), `speed` (`0.2〜2.0`, 既定 `1.0`), `glow` (`0.0〜1.0`, 既定 `0.7`), `color` (`"#38bdf8"`)

---

#### 2. 3D モディファイア (`obj_in` を受け取り `obj_out` を出力)

| モジュール | 入力ポート (`IN`) | 出力 (`OUT`) | `cv_in` 結線時の変調対象・変換式・未結線時挙動 | パラメータ (`PARAMS`) |
| :--- | :--- | :---: | :--- | :--- |
| **`ROTATE`** | `obj_in` (PIN5)<br>`cv_in` (PIN4) | `obj_out` (PIN10) | 未結線時は手動 `angle` で静止回転（自走はしないため連続回転には `LFO` や `COUNT` を `cv_in` に接続）。<br>**`cv_in` 結線時は `angle` を置換**し、$\text{rad} = \text{cv} \times 2\pi$（**`1.0V = 360°` 1回転**）を指定軸 `axis` に加算 | `axis`: `"x"` \| `"y"` \| `"z"` (既定 `"y"`)<br>`angle`: `0.0〜1.0` (turn単位: `0.25 = 90°`) |
| **`MOVE`** | `obj_in` (PIN5)<br>`cv_in` (PIN4) | `obj_out` (PIN10) | 未結線時は手動 `offset`。**`cv_in` 結線時は `offset` を置換**し、$\text{pos} = \text{cv} \times 2.0$ を指定軸 `axis` の座標に加算 | `axis`: `"x"` \| `"y"` \| `"z"` (既定 `"x"`)<br>`offset`: `-5.0〜5.0` (既定 `0.0`) |
| **`SCALE`** | `obj_in` (PIN5)<br>`cv_in` (PIN4) | `obj_out` (PIN10) | **3Dサイズ変更専用**。未結線時は手動 `scale`。**`cv_in` 結線時は `scale` を置換**し、$\text{factor} = \max(0.001, \text{cv})$ を指定軸のスケールに乗算 | `axis`: `"all"` \| `"x"` \| `"y"` \| `"z"` (既定 `"all"`)<br>`scale`: `0.0〜4.0` (既定 `1.0`) |
| **`VERTEX`** | `obj_in` (PIN5)<br>`cv_in` (PIN4) | `obj_out` (PIN10) | 頂点変形。未結線時は手動 `depth`。**`cv_in` 結線時は `depth` を置換**し、$\text{effDepth} = \text{clamp}(\text{cv}, 0.0, 2.0)$ で変形強度を制御 | `mode`: `"wave"` \| `"spike"` \| `"twist"` \| `"wobble"` \| `"pinch"`<br>`depth`: `0.0〜1.0` (既定 `0.35`), `freq`: `0.5〜10.0`, `speed`: `0.0〜5.0` |
| **`SCATTER`** | `base_in` (PIN5)<br>`child_in` (PIN6)<br>`cv_in` (PIN4) | `obj_out` (PIN10) | `base_in` メッシュの全頂点位置に `child_in` オブジェクトを GPU Instancing 配置。<br>**`cv_in` 結線時は $\text{effScale} = \text{clamp}(\text{scale} + \text{cv} \times 0.5, 0.02, 2.0)$ で子オブジェクトサイズを加算変調** | `scale`: `0.05〜1.0` (既定 `0.25`)<br>`showBase`: `bool` (既定 `true`: 親メッシュも表示)<br>`alignNormal`: `bool` (既定 `true`: 法線方向へ整列) |

---

#### 3. レンダラー・映像エフェクト・ディスプレイ (`video_in` / `video_out`)

##### `RENDER` — WebGL オフスクリーン3Dレンダラー（HDR Bloom 内蔵）
- **PORTS**:
  - `obj_in` (PIN5: **複数の `obj_out` を多対1で加算接続可能**。接続された全3Dオブジェクトを同一シーン内に同時描画します)
  - `fov_in` (PIN4: カメラ画角変調CV。$\text{effFov} = \text{clamp}(\text{fov} + \text{fov\_in} \times 10, 10, 120)$ 度)
  - `video_out` (PIN10: 512×512 映像テクスチャ出力)
- **PARAMS**: `camX` (`-10〜10`, 既定 `0.0`), `camY` (`-10〜10`, 既定 `0.0`), `camZ` (`0.5〜20.0`, 既定 `5.0`), `targetX`/`Y`/`Z` (`-10〜10`, 既定 `0.0`), `fov` (`10〜120`, 既定 `45`), `camRoll` (`-180〜180`, 既定 `0`), `materialOverride` (`"auto"` \| `"wire"` \| `"solid"` \| `"normal"` \| `"toon"` \| `"point"` \| `"glass"`, 既定 `"auto"` = 各 `OBJECT` 側のマテリアルを尊重)

##### `VFX` — GPU ポストエフェクト＆フレーム残像フィードバック
- **PORTS**:
  - `video_in` (PIN5: 入力映像テクスチャ)
  - `cv_in` (PIN4: 未結線時は手動 `amount`、**結線時は `amount` を置換し $\text{effAmount} = \text{clamp}(\text{cv}, 0.0, 1.0)$ でエフェクト強度・残像量を制御**)
  - `video_out` (PIN10)
- **PARAMS**: `mode` (`"bypass"` \| `"blur"` \| `"mosaic"` \| `"invert"` \| `"crt"` \| `"rgb"` \| `"trail"`, 既定 `"rgb"`), `trailType` (`"peak"` \| `"fade"` \| `"diffuse"` \| `"zoom"` \| `"drift"` \| `"prism"`, 既定 `"fade"` — `mode: "bypass"` 以外でも残像フィードバックが同時に効きます), `amount` (`0.0〜1.0`, 既定 `0.7`)

##### `VMIX` — 2系統 GPU ビデオミキサー＆トランジション
- **PORTS**:
  - `video_in1` (PIN5: A面映像、未結線時は黒画面), `video_in2` (PIN6: B面映像、未結線時は黒画面)
  - `cv_in` (PIN4: 未結線時は手動 `mix`、**結線時は `mix` を置換し $\text{effMix} = \text{clamp}(\text{cv}, 0.0, 1.0)$ で A↔B クロスフェードを制御**)
  - `video_out` (PIN10)
- **PARAMS**: `mode` (`"dissolve"` \| `"alpha"` \| `"add"` \| `"luma"` \| `"mosaic"` \| `"blur"` \| `"glitch"` \| `"burn"` \| `"slide_h"` \| `"slide_v"` \| `"blackout"` \| `"whiteout"`, 既定 `"dissolve"`), `mix` (`0.0〜1.0`, 既定 `0.5`)

##### `DISPLAY` — ライブ映像モニター（1×1 単体 / 2×2・3×3・4×4 連結タイル対応）
- **PORTS**: `video_in` (PIN5) | OUT: `video_out` (PIN10: マルチタイル連結時の次段スルー出力)
- **PARAMS**: `divN` (`1` = 1×1単一セル, `2` = 2×2の4台連結, `3` = 3×3の9台連結, `4` = 4×4の16台連結)
- **タイル配置規則**:
  - **1台のみ置く場合は必ず `"divN": 1`** に設定してください。
  - `"divN": 2`（2×2大画面）にする場合は、4台の `DISPLAY` を隣接する2×2スロット（例: 左上 `10`, 右上 `11`, 左下 `14`, 右下 `15`）に配置し、`DISPLAY1:video_out > DISPLAY2:video_in > DISPLAY3:video_in > DISPLAY4:video_in` の順（左上➔右上➔左下➔右下）にデイジーチェーン接続します。

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

## 7. 頻出イディオム・小回路パターン集 (Verified Circuit Idioms)

### 7.1 `SH` + `KEY` スケール・ランダムメロディ回路
`SH`（内部ノイズ）を `KEY`（スケールクオンタイザー）に通すことで、音楽的なランダム旋律を生成します。
```json
"connections": [
  "CLK1:gate_out > SH1:trig_in",
  "SH1:cv_out > KEY1:cv_in",
  "KEY1:cv_out > VCO1:cv_in",
  "CLK1:gate_out > ADSR1:gate_in"
]
```

### 7.2 `CHORD` + 4ch `VCO` ポリフォニック・シンセ回路
`CHORD` の4出力を `"channels": 4` の `VCO` に入れ、1系統の `VCF` ➔ `VCA` (`level: 0.0`) で包絡線をかけます。
```json
"connections": [
  "PAT1:cv_out > CHORD1:cv_in",
  "CHORD1:cv_out1 > VCO1:cv_in",
  "CHORD1:cv_out2 > VCO1:cv_in2",
  "CHORD1:cv_out3 > VCO1:cv_in3",
  "CHORD1:cv_out4 > VCO1:cv_in4",
  "PAT1:gate_out > ADSR1:gate_in",
  "ADSR1:cv_out > VCA1:cv_in",
  "VCO1:wave_out > VCF1:wave_in",
  "VCF1:wave_out > VCA1:wave_in"
]
```

### 7.3 西海岸 Volca Modular スタイル（`FACTORY_SOURCE` + `FACTORY_LPG` + `RF` + `REVERB(space)`）
```json
"modules": {
  "SUB_SRC": { "type": "SUB", "subType": "FACTORY_SOURCE" },
  "SUB_LPG": { "type": "SUB", "subType": "FACTORY_LPG" },
  "VAL_AMT": { "type": "VALUE", "label": "LPG ENV", "val": 1.0 },
  "RF1": { "type": "RF", "time": 0.45, "peak": 0.08, "level": 0.9 },
  "REVERB1": { "type": "REVERB", "mode": "space", "time": 4.2, "damp": 8500, "mix": 0.6 }
},
"connections": [
  "SEQ16_1:cv_out > SUB_SRC:PIN5_in",
  "SEQ16_1:gate_out > RF1:trig_in",
  "SUB_SRC:PIN10_out > SUB_LPG:PIN5_in",
  "VAL_AMT:cv_out > SUB_LPG:PIN4_in",
  "RF1:cv_out > SUB_LPG:PIN3_in",
  "SUB_LPG:PIN10_out > REVERB1:wave_in",
  "REVERB1:wave_out > SPK1:wave_in_l",
  "REVERB1:wave_out_r > SPK1:wave_in_r"
]
```

### 7.4 `SCATTER` + `PARTICLE` + `VMIX` 2系統3D映像ミキシング回路
```json
"connections": [
  "OBJECT_BASE:obj_out > SCATTER1:base_in",
  "OBJECT_CHILD:obj_out > SCATTER1:child_in",
  "LFO1:cv_out > ROTATE1:cv_in",
  "SCATTER1:obj_out > ROTATE1:obj_in",
  "ROTATE1:obj_out > RENDER1:obj_in",
  "PARTICLE1:obj_out > RENDER2:obj_in",
  "RENDER1:video_out > VMIX1:video_in1",
  "RENDER2:video_out > VMIX1:video_in2",
  "LFO2:cv_out > VMIX1:cv_in",
  "VMIX1:video_out > VFX1:video_in",
  "VFX1:video_out > DISPLAY1:video_in"
]
```

---

## 8. 完全実動パッチレシピ (Complete Operational Recipes)

### 【レシピ 1】常時自動再生 SEQ8 + KEY トランスポーズ + WAVE3D スペアナ地形 + 2×2 大画面 DISPLAY + ワイド SPACE リバーブ
- **運用ポイント**:
  - `SEQ8_1:1shotgate_in` を未結線にしているため、**インポート直後から即座に自動再生**されます（鍵盤押下トリガーにしたい場合のみ `KEY1:gate_out > SEQ8_1:1shotgate_in` を接続します）。
  - `KEY1:cv_out`（`"cv": 0.0` で初期オフセット0V）と `SEQ8_1:cv_out` を両方 `VCO1:cv_in` に接続することで、画面の鍵盤を弾いた瞬間にシーケンス全体をリアルタイム移調できます。

```json
{
  "bpm": 122,
  "pages": {
    "0": {
      "name": "Wave3D_Space_Synth",
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
        "12": "REVERB1",
        "13": "VFX1",
        "14": "DISPLAY3",
        "15": "DISPLAY4"
      },
      "modules": {
        "KEY1": { "type": "KEY", "octave": 1, "root": 0, "scale": "MINOR", "cv": 0.0, "legato": true },
        "CLK1": { "type": "CLK", "div": "x4", "pulseWidthMs": 15, "limitPct": 90 },
        "SEQ8_1": {
          "type": "SEQ8",
          "quantize": true,
          "keyMode": "loop",
          "steps": [
            { "cv": 1.0, "active": true, "cvActive": true, "gate": true },
            { "cv": 1.25, "active": true, "cvActive": true, "gate": true },
            { "cv": 1.583333, "active": true, "cvActive": true, "gate": true },
            { "cv": 2.0, "active": true, "cvActive": true, "gate": true },
            { "cv": 1.833333, "active": true, "cvActive": true, "gate": true },
            { "cv": 1.583333, "active": true, "cvActive": true, "gate": true },
            { "cv": 1.25, "active": true, "cvActive": true, "gate": true },
            { "cv": 1.583333, "active": true, "cvActive": true, "gate": true }
          ]
        },
        "VCO1": { "type": "VCO", "wave": "sawtooth", "freq1": 65.4, "channels": 1, "quantize": true },
        "VCF1": { "type": "VCF", "filterType": "lowpass", "cutoff": 900, "q": 5.0, "modDepth": 2400 },
        "ADSR1": { "type": "ADSR", "attack": 0.005, "decay": 0.18, "sustain": 0.25, "release": 0.25 },
        "VCA1": { "type": "VCA", "level": 0.0, "cvDepth": 1.0 },
        "REVERB1": { "type": "REVERB", "mode": "space", "time": 3.8, "damp": 7500, "mix": 0.42 },
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
        "CLK1:gate_out > SEQ8_1:gate_in",
        "KEY1:cv_out > VCO1:cv_in",
        "SEQ8_1:cv_out > VCO1:cv_in",
        "SEQ8_1:gate_out > ADSR1:gate_in",
        "ADSR1:cv_out > VCF1:cv_in",
        "ADSR1:cv_out > VCA1:cv_in",
        "VCO1:wave_out > VCF1:wave_in",
        "VCF1:wave_out > VCA1:wave_in",
        "VCA1:wave_out > REVERB1:wave_in",
        "REVERB1:wave_out > SPK1:wave_in_l",
        "REVERB1:wave_out_r > SPK1:wave_in_r",
        "REVERB1:wave_out > WAVE3D_1:wave_in",
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
  - `CLK1 (x4 = 16分音符) ➔ COUNT1 (max: 16) ➔ MATRIX1:cv_in (divisions: 16)` で16ステップの4トラック・ドラムマシンを構築し、`SUB` モジュール（`FACTORY_KICK2`, `FACTORY_SNARE`, `FACTORY_HIHAT`, `FACTORY_ACID`）を駆動します。
  - `COUNT1:carry_out > PAT1:reset_in` を接続することで、1小節ごとに `COUNT1` と `PAT1` のサイクル位相を完全同期させています。

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
        "DELAY1": { "type": "DELAY", "delayTime": "1/8D", "feedback": 0.45, "mix": 0.32 },
        "MIX_DRUM": { "type": "MIX", "channels": 3, "lvl1": 0.95, "lvl2": 0.75, "lvl3": 0.55 },
        "MIX_MASTER": { "type": "MIX", "channels": 2, "lvl1": 0.85, "lvl2": 0.8 },
        "SPK1": { "type": "SPK", "masterVol": 0.18 }
      },
      "connections": [
        "CLK1:gate_out > COUNT1:clk_in",
        "COUNT1:cv_out > MATRIX1:cv_in",
        "COUNT1:carry_out > PAT1:reset_in",
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

## 9. 外部 AI 向け指示プロンプトテンプレート (Copy & Paste Prompt)

外部 AI（ChatGPT, Claude, Gemini, Cursor 等）にパッチ生成を依頼する際は、本ファイル（`GRIDSYNTH_AI_PATCH_SPEC.md`）を添付し、以下のプロンプトを入力してください。

```text
あなたはモジュラーシンセ＆3Dビジュアライザー "Gridsynth" のプロフェッショナル・サウンド＆ビジュアルデザイナーです。
添付した Gridsynth AI Patch Generation & Module Reference Manual (v3.2) に厳密に従い、Gridsynth にそのままインポートして即座に再生可能なパッチ JSON を単一の ```json コードブロックのみで出力してください。

【出力前セルフチェックリスト（厳守）】:
1. 出力は単一の ```json コードブロックのみとし、コメント (//) や末尾カンマを含めないこと。
2. "slots" には使用スロットのみを記載し、"modules" の全キー（モジュールID）と1対1で一致させること。
3. "modules" の各 "type" および "connections" の全ポート名が §2.2・§5 のモジュール別リファレンスに実在し、"送信元ID:出力ポート > 送信先ID:入力ポート" (OUT ➔ IN) の方向であること。
4. 最終オーディオ出力は SPK1 の "wave_in_l" と "wave_in_r" の両方に結線すること（REVERB を使う場合は "REVERB1:wave_out > SPK1:wave_in_l", "REVERB1:wave_out_r > SPK1:wave_in_r" でワイドステレオ接続）。
5. エンベロープ (ADSR / AR / RF) で開閉する VCA は必ず `"level": 0.0` に設定すること。
6. SEQ8 / SEQ16 には必ず CLK の `gate_out` を `gate_in` に接続すること。インポート直後から自動再生させる場合は `1shotgate_in` (PIN6: RUN) を未結線にし、鍵盤押下中のみ再生させる場合のみ `1shotgate_in` に結線すること。
7. ピッチCVのスケールクオンタイズには KEY モジュール (`cv_in > cv_out`) を使用すること（SCALE モジュールは 3D オブジェクト拡大縮小専用 `obj_in > obj_out`）。
8. 3D・映像パイプラインは OBJECT / PATH / PARTICLE / WAVE3D (`obj_out`) ➔ ROTATE / MOVE / SCALE / VERTEX / SCATTER (`obj_in > obj_out`) ➔ RENDER (`obj_in > video_out`) ➔ VFX / VMIX ➔ DISPLAY (`video_in`) の順に接続すること。DISPLAY が1台の場合は `"divN": 1`、2x2大画面の場合は `"divN": 2` を4台隣接配置してデイジーチェーン接続すること。
9. 万一インポート時にエラーメッセージが返された場合は、エラー文中の「利用可能な端子一覧」を参照して該当箇所を修正し、完全な JSON を再出力すること。

【今回作成してほしいパッチのリクエスト】:
（ここに作りたい音楽ジャンル・音色・シーケンス展開・3Dビジュアルのイメージを記入）
```
