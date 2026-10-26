# Gridsynth AI Patch Generation & Composition Specification (v2.0)
> **For AI Assistants (ChatGPT, Claude, Gemini, Cursor, Copilot, etc.)**
> 本仕様書は、AIが **Gridsynth**（Webベース 5×8 モジュラーシンセサイザー）用のパッチデータ（JSON形式）を自律的かつエラーなく設計・作曲・出力するための完全リファレンス仕様書です。
> 人間向けの解説は最小限に留め、構文規則、スキーマ定義、ポート仕様、計算式、および即時利用可能なパッチレシピを中心に構成されています。

---

## 1. 概要 (Overview)

- **グリッド構成**: 横5列 × 縦8行 = 計40スロット（インデックス `0` 〜 `39`）
- **パッチデータ形式**: **完全な単一 JSON オブジェクト**
- **再生方式**: クロック（`CLK`）またはシーケンサー（`SEQ8` / `SEQ16` / `PAT` / `MARKOV`）駆動のリアルタイムWeb Audio / AudioWorklet合成
- **電圧規格**: 
  - オーディオ信号: ±1.0V (0dBFS基準)
  - ピッチCV: 1V/Oct (1.0V = 1オクターブ / 1半音 = 1/12V ≈ 0.08333V)
  - ゲート/トリガー: 0.0V (Low) / 1.0V (High)
  - 変調CV: 0.0V 〜 1.0V (Unipolar) または -1.0V 〜 +1.0V (Bipolar)

---

## 2. トップレベル JSON 構造 (Patch JSON Schema)

AIが出力するパッチは、必ず以下の厳密なスキーマ構造に従う必要があります。

```json
{
  "bpm": 126,
  "pages": {
    "0": {
      "name": "Main",
      "slots": {
        "0": "CLK1",
        "1": "SEQ8_1",
        "2": "VCO1",
        "3": "VCF1",
        "4": "SPK1"
      },
      "modules": {
        "CLK1": { "type": "CLK", "div": "x2", "pulseWidthMs": 15 },
        "SEQ8_1": { "type": "SEQ8", "quantize": true, "steps": [ ... ] },
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
| フィールド | 型 | 制約 / 範囲 | デフォルト | 説明 |
| :--- | :--- | :--- | :--- | :--- |
| **`bpm`** | `number` | `40` 〜 `260` | `120` | グローバルテンポ |
| **`pages`** | `object` | ページID (`"0"`, `"1"` ...) をキーとするマップ | - | ページ構造 |
| **`pages["0"].name`** | `string` | 任意の文字列 | `"Main"` | ページ名 |
| **`pages["0"].slots`** | `object` | キー: `"0"` 〜 `"39"`, 値: モジュールID | `{}` | グリッドスロット配置 |
| **`pages["0"].modules`** | `object` | キー: モジュールID, 値: パラメータオブジェクト | `{}` | モジュール実体 |
| **`pages["0"].connections`** | `array` | 短縮接続文字列の配列 | `[]` | ケーブル結線リスト |

---

## 3. グリッド配置とスロット番号ルール (Grid & Slot System)

グリッドは **横5列 × 縦8行** の全40スロットです。

```
       Col 0   Col 1   Col 2   Col 3   Col 4
Row 0:  [ 0]    [ 1]    [ 2]    [ 3]    [ 4]  <- [4] に SPK1 を置くと綺麗
Row 1:  [ 5]    [ 6]    [ 7]    [ 8]    [ 9]
Row 2:  [10]    [11]    [12]    [13]    [14]
Row 3:  [15]    [16]    [17]    [18]    [19]
Row 4:  [20]    [21]    [22]    [23]    [24]
Row 5:  [25]    [26]    [27]    [28]    [29]
Row 6:  [30]    [31]    [32]    [33]    [34]
Row 7:  [35]    [36]    [37]    [38]    [39]
```

### スロット計算式
$$\text{slotIndex} = \text{row} \times 5 + \text{col} \quad (0 \le \text{row} \le 7, \quad 0 \le \text{col} \le 4)$$

- **厳格ルール**:
  1. **重複禁止**: 同一スロット番号に複数のモジュールを割り当ててはなりません（スロットは1対1対応）。
  2. **スロット指定必須**: `modules` に定義したすべてのモジュールIDは、必ず `slots` のいずれかの番号にマッピングされていなければなりません。
- **推奨レイアウト**:
  - `Col 0` 〜 `Col 1`: クロック・シーケンサー（`CLK`, `SEQ8`, `SEQ16`, `PAT`, `MARKOV`）
  - `Col 2` 〜 `Col 3`: 音源・フィルター・エンベロープ（`VCO`, `NOISE`, `VCF`, `ADSR`, `VCA`）
  - `Col 4`: ミキサー・エフェクト・スピーカー（`MIX`, `DELAY`, `REVERB`, `SPK`）

---

## 4. ケーブル結線（Connection）の厳格ルール

`connections` 配列の書式:
```
"送信元モジュールID:送信元ポート名 > 送信先モジュールID:送信先ポート名"
```

### 接続の鉄則
1. **方向の厳守（出力 > 入力）**:
   - `>` の左側は必ず **出力ポート (out)**、右側は必ず **入力ポート (in)** でなければなりません（逆方向は不可）。
2. **自己ループ禁止**:
   - 同一モジュール内の出力から入力への直結（例: `"DELAY1:wave_out > DELAY1:wave_in"`）は禁止です。
3. **1出力からの分岐（スプリット / マルチプル）: 【完全許可】**:
   - 1つの出力ポートから複数の入力ポートへ分岐接続することは**完全に可能**です。
   - 例: クロック分配
     ```json
     "CLK1:gate_out > SEQ8_1:gate_in",
     "CLK1:gate_out > ADSR1:gate_in"
     ```
   - 例: エンベロープ分配（フィルターとVCAを同時に動かす）
     ```json
     "ADSR1:cv_out > VCF1:cv_in",
     "ADSR1:cv_out > VCA1:cv_in"
     ```
4. **1入力への複数出力接続（サミング）のルール**:
   - **オーディオ信号（`wave_out`）**: **直接の多重接続は禁止**。2つ以上のオーディオ信号をまとめる場合は、必ず `MIX` モジュールを経由してください（音割れ・位相干渉防止）。
   - **CV信号（ピッチCV / 変調CV）**: 直接多重接続すると電圧が加算（サミング）されます。複雑な演算を行う場合は `MATH1` または `MATH2` の使用を推奨します。
5. **ミキサー（`MIX`）の設計・集約原則**:
   - **通常の4パート構成はミキサー1台で完結する**:
     `MIX` モジュールは最大4系統（`wave_in1`〜`wave_in4`）のオーディオ入力をサミング可能です。一般的な4パート構成（例: Kick, Snare, Bass, Lead、またはドラム3点＋シンセ1点など）では、**1台の `MIX`（`MIX1`）ですべての音声をまとめ、直接 `SPK1` に出力するのが基本かつ最もクリーンな設計**です。
     4パート以下でミキサーを2台以上配置したり、空きポートを残したままミキサーを数珠繋ぎ（カスケード）にするのは禁止（アンチパターン）です。
   - **5パート以上の場合のサブミックス構成ルール**:
     音源が5系統以上存在する場合に限り、サブミキサーとマスターミキサーの2段構成を設計します。その際も、
     - `MIX1`（ドラム・サブミックス / 4ch）: Kick, Snare, Hat, Perc
     - `MIX2`（マスター・ミックス / 4ch）: ドラムまとめ（`MIX1:wave_out`）, Bass, Lead, FX Return
     のように、**各ミキサーの全4入力をフル活用（100%使用）**し、中途半端な空き端子を残さないようにしてください。
6. **最終出力の結線義務**:
   - 音を鳴らすには、必ず `SPK1:wave_in_l` および `SPK1:wave_in_r` にオーディオ信号が接続されていなければなりません。

### 4.1 シグナル種別・端子色・ケーブル発光色 (Signal Types & Colors)

| シグナル種別 | 端子色 (Tailwind) | ケーブル色 (HEX) | 代表的なポート名 | 用途・電圧仕様 |
| :--- | :--- | :--- | :--- | :--- |
| **CV (制御電圧)** | 黄 `bg-yellow-400` | `#eab308` (Yellow) | `cv_in`, `cv_out`, `gain_cv`, `time_cv`, `index_cv`, `cv_in_a`, `cv_in_b` | 1V/Oct音程、周波数/時間/ゲイン変調 (0.0〜10.0V / ±5.0V) |
| **AUDIO (音声信号)** | 青 `bg-blue-500` | `#38bdf8` (Sky) | `wave_in`, `wave_out`, `mod_in`, `in1..4`, `wave_in_l/r` | 可聴帯域オーディオ信号 (±1.0V 基準) |
| **TRIGGER (瞬間パルス)** | 橙 `bg-orange-500` | `#f97316` (Orange) | `trig_in`, `trig_out`, `reset` | 瞬間パルス・トリガー信号 (0.0V / 1.0V) |
| **GATE_SEQ (ステップゲート)** | 赤 `bg-red-500` | `#f43f5e` (Rose) | `gate_in`, `gate_out`, `gate_out1..4` | シーケンサー/クロック/ステップゲート (0.0V / 1.0V) |
| **TRANS (状態遷移)** | 灰 `bg-slate-400` | `#94a3b8` (Slate) | `trans_in`, `trans_out`, `trans_out1..4` | MARKOV / PASS 専用・状態遷移バトンパルス (0.0V / 1.0V) |
| **CLOCK (マスターテンポ)** | 赤 `bg-rose-500` | `#f43f5e` (Rose) | `gate_out` (CLK), `clk_in` | テンポ同期パルス |

---

## 5. モジュール完全辞書 (Module Catalog)

Gridsynth で利用可能な全モジュールの正式型名（`type`）、端子仕様、全パラメータの型・範囲・デフォルト値、および内部挙動の完全仕様書です。

---

### 5.1 音源モジュール (Sound Sources)

#### `VCO` (アナログオシレーター)
クラシックなアナログシンセサイズ波形を生成する基本オシレーター。最大4ボイスのポリフォニック発音に対応。
- **入力ポート**:
  - `cv_in` (1V/Oct ピッチCV入力 / ボイス1)
  - `cv_in2`, `cv_in3`, `cv_in4` (ボイス2〜4用ピッチCV / `channels > 1` 時)
  - `sync_in` (オシレーター同期ハードシンク入力)
- **出力ポート**: `wave_out` (オーディオ出力)
- **パラメータ**:
  | キー | 型 | 範囲 / 選択肢 | デフォルト | 説明 |
  | :--- | :--- | :--- | :--- | :--- |
  | `channels` | `number` | `1`, `2`, `3`, `4` | `1` | ボイス数（和音時は `4`） |
  | `wave` | `string` | `"sawtooth"`, `"square"`, `"triangle"`, `"sine"` | `"sawtooth"` | 基本波形 |
  | `freq1` | `number` | `20` 〜 `2000` | `220` | ボイス1基準周波数(Hz) |
  | `freq2` 〜 `freq4` | `number` | `20` 〜 `2000` | `220` | ボイス2〜4基準周波数(Hz) |
  | `quantize` | `boolean` | `true`, `false` | `false` | 半音クオンタイズ有効化 |

#### `NOISE` (ノイズジェネレーター)
パーカッションのアタック音や環境音、ランダムソースとして使用するアナログノイズ源。
- **入力ポート**: なし
- **出力ポート**: `wave_out` (オーディオ出力)
- **パラメータ**:
  | キー | 型 | 範囲 / 選択肢 | デフォルト | 説明 |
  | :--- | :--- | :--- | :--- | :--- |
  | `noiseType` | `string` | `"white"`, `"pink"`, `"brown"` | `"white"` | ノイズ色 |
  | `tone` | `number` | `200` 〜 `16000` | `8000` | 内部LPFカットオフ周波数(Hz) |
  | `level` | `number` | `0.0` 〜 `1.0` | `0.8` | 出力レベル |

#### `FMx3` (3オペレーター FM音源・パーカッションジェネレーター)
各オペレータに独立したADSRを内包した3オペレータ位相変調（PM）音源。キック、スネア、ハイハット、タム、金属音、ディープベースに最適。
- **入力ポート**:
  - `cv_in` (1V/Oct ピッチCV入力: 全オペレータがRatio比を保ったまま追従。旧名 `pitch_in` 互換)
  - `gate_in` (ゲート/トリガー入力: 3つの内包ADSRを同時にトリガー。位相リセットで打撃パンチを安定化)
- **出力ポート**: `wave_out` (オーディオ出力)
- **パラメータ**:
  | キー | 型 | 範囲 / 選択肢 | デフォルト | 説明 |
  | :--- | :--- | :--- | :--- | :--- |
  | `algorithm` | `number` | `1`, `2`, `3`, `4` | `1` | FM接続アルゴリズム |
  | `rootMidi` | `number` | `24` 〜 `72` | `48` | 基準MIDIノート (48=C3)。`cv_in` 結線時はCVが優先加算 |
  | `op1` | `object` | `{ ratio, level, attack, decay, sustain, release, curve }` | - | 主キャリア（出力ボリューム） |
  | `op2` | `object` | `{ ratio, level, attack, decay, sustain, release, curve }` | - | モジュレータ 1 / 副キャリア（変調指数） |
  | `op3` | `object` | `{ ratio, level, feedback, wave, attack, decay, sustain, release, curve }` | - | モジュレータ 2（最上段変調指数） |
- **4つのトポロジー (Algorithms)**:
  - `1`: **直列スタック型 (Cascade)**: `Op3 ➔ Op2 ➔ Op1 ➔ OUT`（金属音、スネア、ディープFMベース）
  - `2`: **並列変調・Y字型 (Dual Modulator)**: `(Op3 + Op2) ➔ Op1 ➔ OUT`（キック、タム、カウベル、コンガ）
  - `3`: **2キャリア分岐型 (Split Carrier)**: `Op3 ➔ (Op2 + Op1) ➔ OUT`（ベル、エレピ、ブラス、和音リード）
  - `4`: **独立FM + サブベース型 (Hybrid)**: `(Op3 ➔ Op2) + Op1 ➔ OUT`（ダンス系キック、808/909パンチベース）
- **Op3波形モード (`op3.wave`)**:
  - `"sine"`: サイン波（`feedback`: 0.0〜1.0 自己変調対応）
  - `"noise"`: ホワイトノイズ（スネアのスナッピー、ハイハットの擦れ音、アタックノイズをFM合成だけで生成）

#### `FMCORE` (モジュラー2オペレータ FMコア / PMオシレーター)
外部から任意のオーディオ信号を変調波（Modulator）として流し込み、自由度の高いモジュラーFM合成を実現する高精度位相変調オシレーターコア。
- **入力ポート**:
  - `cv_in` (1V/Oct ピッチCV入力: 旧名 `pitch_in` 互換)
  - `mod_in` (外部FM変調オーディオ入力: VCOやNOISE、別FMCOREの `wave_out` を接続)
  - `index_cv` (変調指数CV入力: 外部ADSRやLFOでFM変調強度を時間変化させる)
- **出力ポート**: `wave_out` (位相変調オーディオ出力)
- **パラメータ**:
  | キー | 型 | 範囲 / 選択肢 | デフォルト | 説明 |
  | :--- | :--- | :--- | :--- | :--- |
  | `ratio` | `number` | `0.125` 〜 `16.0` | `1.0` | キャリア周波数倍率（0.5=1オクターブ下, 2.0=1オクターブ上） |
  | `fine` | `number` | `-100` 〜 `+100` | `0` | ファインチューニング(cents) |
  | `index` | `number` | `0.0` 〜 `10.0` | `1.0` | 基本変調指数 (Modulation Index) |
  | `feedback`| `number` | `0.0` 〜 `1.0` | `0.0` | 自己位相変調フィードバック量 |
  | `rootMidi`| `number` | `24` 〜 `72` | `48` | 基準MIDIノート番号 (48=C3 130.81Hz) |
  | `level` | `number` | `0.0` 〜 `1.0` | `0.85` | 出力ゲイン |

#### `FOLD` (ウェーブフォルダー)
入力オーディオ波形を上下の境界で反射・折り畳み、豊かな奇数/偶数倍音を生成する非線形加工エフェクター。ウェストコースト・シンセシスの要。
- **入力ポート**:
  - `wave_in` (オーディオ入力)
  - `gain_cv` (フォールド変調CV入力: 外部LFOやADSRで倍音量を動的制御)
- **出力ポート**: `wave_out` (加工済みオーディオ出力)
- **パラメータ**:
  | キー | 型 | 範囲 / 選択肢 | デフォルト | 説明 |
  | :--- | :--- | :--- | :--- | :--- |
  | `gain` | `number` | `0.0` 〜 `8.0` | `1.5` | 入力ゲイン倍率（波形の折り畳み深度） |
  | `mix` | `number` | `0.0` 〜 `1.0` | `1.0` | Dry/Wetブレンド比率 |

---

### 5.2 フィルター & アンプ (Processors)

#### `VCF` (ボルテージコントロールド・フィルター)
レゾナンス付きマルチモード・アナログモデリング・フィルター。
- **入力ポート**:
  - `wave_in` (オーディオ入力)
  - `cv_in` (カットオフ周波数変調CV: 1Vあたり `modDepth` で指定したセント数またはHz分モジュレーション)
- **出力ポート**: `wave_out` (フィルター処理後オーディオ出力)
- **パラメータ**:
  | キー | 型 | 範囲 / 選択肢 | デフォルト | 説明 |
  | :--- | :--- | :--- | :--- | :--- |
  | `filterType` | `string` | `"lowpass"`, `"highpass"`, `"bandpass"`, `"notch"` | `"lowpass"` | フィルター動作種別 |
  | `cutoff` | `number` | `20` 〜 `20000` | `1800` | 基本カットオフ周波数(Hz) |
  | `q` | `number` | `0.1` 〜 `20.0` | `2.5` | レゾナンス（Q値。高いと自己発振近傍へ） |
  | `modDepth` | `number` | `-5000` 〜 `5000` | `1200` | CV入力に対する変調深度(cents) |

#### `VCA` (ボルテージコントロールド・アンプ / ゲート)
CVによってオーディオの音量を制御するアンプモジュール。
- **入力ポート**:
  - `wave_in` (オーディオ入力)
  - `cv_in` (ゲイン制御CV入力: ADSRやLFOの `cv_out` を接続)
- **出力ポート**: `wave_out` (音量制御後オーディオ出力)
- **パラメータ**:
  | キー | 型 | 範囲 / 選択肢 | デフォルト | 説明 |
  | :--- | :--- | :--- | :--- | :--- |
  | `level` | `number` | `0.0` 〜 `1.0` | `0.0` | 初期ゲインバイアス（※ADSRで音を鳴らす場合は必ず `0.0`） |
  | `cvDepth` | `number` | `0.0` 〜 `2.0` | `1.0` | CV入力に対するゲイン感度 |

---

### 5.3 エンベロープ & 変調 (Modulators)

#### `ADSR` (4ステージ・エンベロープジェネレーター)
アタック、ディケイ、サスティン、リリースの4段階で時間変化する電圧を生成。カーブ特性を連続調整可能。
- **入力ポート**: `gate_in` (ゲート/トリガーパルス入力: Highで発火しLowでリリース開始)
- **出力ポート**: `cv_out` (0.0V〜1.0V のエンベロープ電圧出力)
- **パラメータ**:
  | キー | 型 | 範囲 | デフォルト | 説明 |
  | :--- | :--- | :--- | :--- | :--- |
  | `attack` | `number` | `0.001` 〜 `2.0` | `0.02` | アタック立ち上がり時間(秒) |
  | `decay` | `number` | `0.001` 〜 `2.0` | `0.2` | ディケイ減衰時間(秒) |
  | `sustain` | `number` | `0.0` 〜 `1.0` | `0.6` | サスティン保持レベル |
  | `release` | `number` | `0.001` 〜 `5.0` | `0.4` | リリース減衰時間(秒) |
  | `attackCurve` | `number` | `-1.0` 〜 `1.0` | `0.0` | アタック曲線 (-1:指数, 0:直線, 1:対数) |
  | `decayCurve` | `number` | `-1.0` 〜 `1.0` | `0.0` | ディケイ曲線 |
  | `releaseCurve`| `number` | `-1.0` 〜 `1.0` | `0.0` | リリース曲線 |

#### `AR` (2ステージ Attack-Release エンベロープ)
RC回路特性の自然な立ち上がり・立ち下がりを持つアタック-リリース型エンベロープ。パーカッションやプラック音の高速トリガーに最適。
- **入力ポート**:
  - `gate_in` (ゲート入力: ゲートがHighの間はアタックからフルレベルを維持し、Lowでリリース減衰)
  - `attack_in` (アタック時間変調CV)
  - `release_in` (リリース時間変調CV)
- **出力ポート**: `cv_out` (0.0V〜1.0V CV出力)
- **パラメータ**:
  | キー | 型 | 範囲 | デフォルト | 説明 |
  | :--- | :--- | :--- | :--- | :--- |
  | `attack` | `number` | `0.005` 〜 `2.0` | `0.05` | アタック時間(秒) |
  | `release` | `number` | `0.005` 〜 `3.0` | `0.2` | リリース時間(秒) |
  | `level` | `number` | `0.0` 〜 `1.0` | `1.0` | 出力ピーク電圧倍率 |

#### `RF` (Rise-Fall エンベロープ / 関数発生器)
Sergeスタイルの三角波状ファンクションジェネレーター。サイクル終了時にEOS（End of Slope）トリガーを出力。
- **入力ポート**:
  - `trig_in` (発火トリガー入力: 瞬間パルスで1サイクルのRise-Fallカーブを実行)
  - `time_cv` (総サイクル時間変調CV)
  - `peak_cv` (ピーク位置変調CV)
- **出力ポート**:
  - `cv_out` (エンベロープCV出力)
  - `trig_out` (サイクル完了時EOSトリガーパルス出力: 他のモジュールの同期発火に使用)
- **パラメータ**:
  | キー | 型 | 範囲 | デフォルト | 説明 |
  | :--- | :--- | :--- | :--- | :--- |
  | `time` | `number` | `0.02` 〜 `2.0` | `0.2` | 総サイクル時間(秒) |
  | `peak` | `number` | `0.01` 〜 `0.99` | `0.5` | ピークタイミング比率 (0.01=鋭い減衰, 0.5=対称三角波, 0.99=スウェル) |
  | `level` | `number` | `0.0` 〜 `1.0` | `1.0` | 出力最大電圧 |

#### `LFO` (低周波オシレーター)
音程ビブラート、フィルターワウ、トレモロ、FM変調などの周期変化を与える変調源。
- **入力ポート**:
  - `reset` (位相リセットトリガー入力: クロックパルス等で0度に同期)
  - `cv_in` (レート変調CV入力: 1Vあたり +2.0Hz)
- **出力ポート**: `cv_out` (CV出力)
- **パラメータ**:
  | キー | 型 | 範囲 / 選択肢 | デフォルト | 説明 |
  | :--- | :--- | :--- | :--- | :--- |
  | `waveType` | `string` | `"sine"`, `"triangle"`, `"sawtooth"`, `"ramp"`, `"square"` | `"sine"` | LFO波形 |
  | `polarity` | `string` | `"bipolar"` (±Depth), `"unipolar"` (0〜+Depth) | `"bipolar"` | 出力極性 |
  | `syncMode` | `string` | `"free"` (Hz指定), `"sync"` (BPM音符同期) | `"free"` | 動作モード |
  | `rate` | `number` | `0.05` 〜 `30.0` | `2.0` | フリー時周波数(Hz) |
  | `division` | `string` | `"4/1"`, `"2/1"`, `"1/1"`, `"1/2"`, `"1/4"`, `"1/8"`, `"1/16"`, `"1/32"`, `"1/4T"`, `"1/8T"`, `"1/4D"`, `"1/8D"` | `"1/4"` | BPM同期時の音符比 |
  | `depth` | `number` | `0.0` 〜 `5.0` | `1.0` | 出力振幅ボルト |
  | `duty` | `number` | `0.01` 〜 `0.99` | `0.5` | デューティ比 |
  | `phase` | `number` | `0` 〜 `360` | `0` | 初期位相(度) |

#### `SH` (サンプル＆ホールド / ランダムCV)
トリガーパルスを受けた瞬間の入力信号電圧をサンプリングし、次のトリガーまでその電圧を一定に保つモジュール。
- **入力ポート**:
  - `cv_in` (サンプリング対象CV入力: **未結線の場合は内部ホワイトノイズを自動サンプリング**してアナログ乱数を生成)
  - `trig_in` (サンプリング実行トリガー入力: クロックパルスやSEQのゲートを接続)
- **出力ポート**: `cv_out` (サンプリング・保持電圧出力)
- **パラメータ**:
  | キー | 型 | 範囲 / 選択肢 | デフォルト | 説明 |
  | :--- | :--- | :--- | :--- | :--- |
  | `glide` | `number` | `0.0` 〜 `1.0` | `0.0` | スルーレート（電圧変化のスムージング/ポルタメント） |
  | `scale` | `number` | `0.0` 〜 `2.0` | `1.0` | 出力ゲイン倍率 |
  | `polarity` | `string` | `"unipolar"` (0〜Scale V), `"bipolar"` (±Scale V) | `"unipolar"` | 出力極性 |

---

### 5.4 数学演算・論理・信号加工 (Math, Logic & Utilities)

#### `MATH1` (単項数学関数・スルーモニター・定電圧ジェネレーター)
単一の入力信号に対して絶対値、床関数、四捨五入、論理反転などの数学関数を適用するプロセッサー。**未結線時は高精度な定電圧オフセット発生器**としても機能します。
- **入力ポート**: `cv_in_a` (入力信号A)
- **出力ポート**: `cv_out` (演算結果出力)
- **パラメータ**:
  | キー | 型 | 範囲 / 選択肢 | デフォルト | 説明 |
  | :--- | :--- | :--- | :--- | :--- |
  | `mode` | `string` | `"-"`, `"ABS"`, `"FLOOR"`, `"CEIL"`, `"ROUND"`, `"INT"`, `"NOT"` | `"-"` | 演算モード（下記参照） |
  | `valA` | `number` | `-10.0` 〜 `+10.0` | `0.0` | **未結線時の固定入力バイアス値（定電圧源）** |
- **7つの動作モード詳細**:
  - `"-"` (**Pass-Through / Live Monitor**): 入力信号をそのまま通過させ、パネル上にリアルタイム電圧を表示。`cv_in_a` 未結線時は `valA` の定電圧を出力（例: `valA = 1.0` で常時 1.0V を出力する定電圧ジェネレータ）。
  - `"ABS"` (**絶対値**): $v = |a|$。Bipolar LFO（±1V）を全波整流して Unipolar（0〜1V）に変換。
  - `"FLOOR"` (**床関数・切り捨て**): $v = \lfloor a \rfloor$。CV電圧の小数部を切り捨てて整数オクターブステップを生成。
  - `"CEIL"` (**天井関数・切り上げ**): $v = \lceil a \rceil$。
  - `"ROUND"` (**四捨五入**): $v = \text{round}(a)$。
  - `"INT"` (**0方向切り捨て**): $v = \text{trunc}(a)$。
  - `"NOT"` (**論理反転 / インバーター**): $a > 0.5 \implies 0.0\text{V}, \quad a \le 0.5 \implies 1.0\text{V}$。クロックやゲート信号を反転。
- **Cabled 優先ルール**:
  `cv_in_a` にケーブルが接続されると、`valA` は自動的にバイパスされ、ケーブルから入力された外部電圧がリアルタイム計算に使用されます。

#### `MATH2` (2変数算術・比較・ブール論理演算)
2系統のCV信号（$a$ と $b$）の間で、算術演算（加算、乗算、剰余等）、大小比較、論理演算（AND, OR, XOR等）を実行する万能数学モジュール。
- **入力ポート**:
  - `cv_in_a` (入力信号A)
  - `cv_in_b` (入力信号B)
- **出力ポート**: `cv_out` (演算結果出力)
- **パラメータ**:
  | キー | 型 | 範囲 / 選択肢 | デフォルト | 説明 |
  | :--- | :--- | :--- | :--- | :--- |
  | `mode` | `string` | 17種類の演算モード（下記表参照） | `"ADD"` | 演算種別 |
  | `valA` | `number` | `-10.0` 〜 `+10.0` | `0.0` | `cv_in_a` 未結線時の固定値A |
  | `valB` | `number` | `-10.0` 〜 `+10.0` | `1.0` | `cv_in_b` 未結線時の固定値B |
- **全17モード対応表**:
  1. **Arithmetic (算術演算 7種)**:
     - `"ADD"`: $v = a + b$ （ピッチCVの移調・サミング、オフセット加算）
     - `"DIFF"`: $v = a - b$ （差分検出、位相反転）
     - `"MULTI"`: $v = a \times b$ （CV VCA、LFO深さのエンベロープ変調、リングモジュレーション）
     - `"MOD"`: $v = a - b \times \lfloor a / b \rfloor$ （剰余算・クロック波形のリセット折り畳み）
     - `"A^B"`: $v = a^b$ （指数関数的CVカーブの生成）
     - `"MIN"`: $v = \min(a, b)$ （低電圧優先アナログOR回路、上限リミッター）
     - `"MAX"`: $v = \max(a, b)$ （高電圧優先アナログOR回路、ピークセレクター）
  2. **Comparison (比較演算 5種 - 条件成立で 1.0V、不成立で 0.0V を出力)**:
     - `"<"`: $a < b \implies 1.0\text{V}$, else $0.0\text{V}$
     - `"<="`: $a \le b \implies 1.0\text{V}$, else $0.0\text{V}$
     - `"=="`: $|a - b| < 0.0001 \implies 1.0\text{V}$, else $0.0\text{V}$
     - `">="`: $a \ge b \implies 1.0\text{V}$, else $0.0\text{V}$
     - `">"`: $a > b \implies 1.0\text{V}$, else $0.0\text{V}$
  3. **Logic (ブール論理演算 5種 - 0.5V 閾値のデジタル論理ゲート)**:
     - `"AND"`: $(a > 0.5 \land b > 0.5) \implies 1.0\text{V}$, else $0.0\text{V}$ （両方のゲートがONで発火）
     - `"OR"`: $(a > 0.5 \lor b > 0.5) \implies 1.0\text{V}$, else $0.0\text{V}$ （いずれかのゲートがONで発火）
     - `"NAND"`: $\neg(a > 0.5 \land b > 0.5) \implies 1.0\text{V}$, else $0.0\text{V}$
     - `"NOR"`: $\neg(a > 0.5 \lor b > 0.5) \implies 1.0\text{V}$, else $0.0\text{V}$
     - `"XOR"`: $((a > 0.5) \neq (b > 0.5)) \implies 1.0\text{V}$, else $0.0\text{V}$ （排他的論理和・変則リズム生成）
- **運用のテクニック（片側結線によるオフセット / アッテネーション）**:
  - `cv_in_a` のみに外部ピッチCVを接続し、`mode: "ADD"`, `valB: 1.0` と設定すれば、+1オクターブ（1.0V）の固定移調トランスポーザーとして動作します。
  - `cv_in_a` のみに外部LFOを接続し、`mode: "MULTI"`, `valB: 0.5` と設定すれば、振幅を50%に減衰させるアッテネーターになります。

#### `SCALE` (スケールクオンタイザー)
連続的なアナログ電圧（LFOやSHのCV）を、指定した音楽的スケール（長音階、短音階、ペンタトニック等）の半音ピッチに正確に補正・吸着させます。
- **入力ポート**: `cv_in` (未調律CV入力)
- **出力ポート**: `cv_out` (スケール適合済み 1V/Oct CV出力)
- **パラメータ**:
  | キー | 型 | 範囲 / 選択肢 | デフォルト | 説明 |
  | :--- | :--- | :--- | :--- | :--- |
  | `scale` | `string` | `"chromatic"`, `"major"`, `"minor"`, `"pentatonic"`, `"dorian"`, `"mixolydian"`, `"blues"` | `"major"` | スケール音階 |
  | `root` | `number` | `0` 〜 `11` (0=C, 1=C#, 2=D, ... 11=B) | `0` | ルート音キー |

#### `FLIP` (T-Flip-Flop / 1/2分周器)
トリガーパルスを受けるたびに出力状態が反転（High ➔ Low ➔ High）するトグルフリップフロップ。入力クロック周波数を正確に 1/2 に分周します。
- **入力ポート**: `trig_in` (トリガー入力)
- **出力ポート**:
  - `gate_out` (トグル出力: 0.0V / 1.0V)
  - `inv_out` (反転トグル出力: `gate_out` の逆相)
- **パラメータ**:
  | キー | 型 | 範囲 / 選択肢 | デフォルト | 説明 |
  | :--- | :--- | :--- | :--- | :--- |
  | `initVal` | `number` | `0`, `1` | `0` | リセット時の初期出力状態 |

#### `CVDELAY` (CV専用ディレイ / イベントバッファ)
CV信号やトリガーゲート信号をミリ秒単位で遅延させる専用バッファ。ドラムのフラムやディレイフィル、変調の時差生成に威力を発揮します。
- **入力ポート**:
  - `cv_in` (遅延対象CV/ゲート入力: 旧名 `sig_in` 互換)
  - `time_cv` (ディレイタイム外部変調CV)
- **出力ポート**: `cv_out` (遅延後CV出力)
- **パラメータ**:
  | キー | 型 | 範囲 | デフォルト | 説明 |
  | :--- | :--- | :--- | :--- | :--- |
  | `timeMs` | `number` | `0` 〜 `2000` | `50` | ディレイ時間(ms) |
  | `cvDepth` | `number` | `0.0` 〜 `2.0` | `1.0` | `time_cv` に対する感度 |

---

### 5.5 シーケンサー & 演奏 (Sequencers & Controllers)

#### `CLK` (マスタークロック)
BPMテンポに追従したタイミングパルスを全システムに供給する心臓部。
- **入力ポート**: `power_in` (動作イネーブル / ゲート入力。未結線時は常時動作。結線時は High `> 0.3V` でパルス送出、Low で停止。立ち上がりエッジ `0 -> 1` で即座に第1パルスを出力)
- **出力ポート**: `gate_out` (クロックパルス出力)
- **パラメータ**:
  | キー | 型 | 範囲 / 選択肢 | デフォルト | 説明 |
  | :--- | :--- | :--- | :--- | :--- |
  | `div` | `string` | `"/16"` 〜 `"/2"`, `"x1"` 〜 `"x16"` | `"x2"` | テンポ乗除比（分周/倍周） |
  | `pulseWidthMs`| `number` | `1` 〜 `500` | `15` | トリガーパルス幅(ms) |
  | `limitPct` | `number` | `10` 〜 `90` | `50` | 最大パルス幅デューティ上限（%） |

#### `PASS` (カウントダウン・ゲートスルーシーケンサー / パート制御)
クロックパルスをカウントダウンし、指定した拍数の間だけゲートを通過させ、カウント終了時に次へバトンを渡す精密パート制御モジュール。
- **入力ポート**:
  - `gate_in` (通過対象ゲート/クロック入力: 赤 `bg-red-500` / `GATE_SEQ`)
  - `trans_in` (カウントリセット / 外部イネーブルトリガー入力: 灰 `bg-slate-400` / `TRANS`)
- **出力ポート**:
  - `gate_out` (通過ゲート出力: カウント中の間だけ `gate_in` をそのままスルー出力)
  - `trans_out` (カウント完了時 EOS パルス出力: 灰 `bg-slate-400` / `TRANS`。次の PASS や MARKOV へ遷移バトンを渡す)
- **パラメータ**:
  | キー | 型 | 範囲 | デフォルト | 説明 |
  | :--- | :--- | :--- | :--- | :--- |
  | `count` | `number` | `1` 〜 `64` | `8` | ゲートを開いておくクロック拍数（初期値: 8拍） |
- **動作と構造**:
  - 稼働中はパネル中央の数値がカウントダウンされ、アクティブ発光（ゴールド）します。
  - カウントが 0 になるとゲートを閉じ、`trans_out` から瞬間パルスを送信。
  - 複数の `PASS` を `trans_out > trans_in` でリング状・直列にカスケード接続することで、「8拍Aメロ ➔ 8拍Bメロ ➔ 16拍サビ」といった楽曲の構成管理が極めてシンプルに実現できます。

#### `SEQ8` / `SEQ16` (ステップシーケンサー)
最大 8 または 16 ステップのアナログスタイル・ステップシーケンサー。
- **入力ポート**: `gate_in` (クロックパルス受信)
- **出力ポート**: `cv_out` (ピッチCV), `gate_out` (ステップゲート)
- **パラメータ**:
  | キー | 型 | 範囲 / 選択肢 | デフォルト | 説明 |
  | :--- | :--- | :--- | :--- | :--- |
  | `quantize` | `boolean` | `true`, `false` | `true` | 1V/Oct半音クオンタイズ |
  | `steps` | `array` | 配列長 8 (`SEQ8`) または 16 (`SEQ16`) | - | ステップ配列 |
- **ステップオブジェクト**:
  ```json
  { "cv": 0.25, "active": true, "cvActive": true, "gate": true }
  ```
  - `cv`: 電圧 (0.0=C1, 1.0=C2, 2.0=C3)
  - `active`: false でステップをスキップ（可変長ループ）
  - `cvActive`: false でタイ（前音程保持）
  - `gate`: false で休符

#### `KEY` (オンスクリーン・キーボード)
オンスクリーンピアノロール鍵盤による手動演奏およびトランスポーズCV供給器。
- **入力ポート**: なし
- **出力ポート**: `cv_out` (1V/Oct ピッチCV), `gate_out` (キー押下ゲート)
- **パラメータ**:
  | キー | 型 | 範囲 | デフォルト | 説明 |
  | :--- | :--- | :--- | :--- | :--- |
  | `octave` | `number` | `1` 〜 `7` | `2` | 基準オクターブ |
  | `cv` | `number` | `0.0` 〜 `5.0` | `1.0` | **未押下時・初期出力CV電圧** (1.0=C2) |
  | `note` | `string` | 音名文字列 | `"C2"` | 初期音名 |

#### `PAD` (2次元XYタッチパッドコントローラー)
X軸/Y軸の2次元操作で2系統のCVとゲートを同時に出力するリアルタイム表現コントローラー。
- **入力ポート**: `hue_cv`, `bright_cv` (外観変調CV)
- **出力ポート**: `x_cv` (X軸CV), `y_cv` (Y軸CV), `gate_out` (タッチ中ゲート)
- **パラメータ**:
  | キー | 型 | 範囲 / 選択肢 | デフォルト | 説明 |
  | :--- | :--- | :--- | :--- | :--- |
  | `polX` / `polY` | `string` | `"bi"` (±1.0V), `"uni"` (0.0〜1.0V) | `"bi"` | 出力電圧極性 |
  | `opacity` | `number` | `0.1` 〜 `1.0` | `0.8` | パネル透明度 |

#### `PAT` (アルゴリズム・パターンシーケンサー / Strudel風)
テキストパターン文字列からメロディやリズムを生成するライブコーディング風シーケンサー。
- **入力ポート**: `power_in` (動作イネーブルゲート: Highで再生、Lowで停止)
- **出力ポート**: `cv_out` (ピッチCV), `gate_out` (ゲート)
- **パラメータ**:
  | キー | 型 | 範囲 / 選択肢 | デフォルト | 説明 |
  | :--- | :--- | :--- | :--- | :--- |
  | `pattern` | `string` | Strudel風パターン記法 | `"c2 e2 g2 b2"` | 演奏パターン |
  | `cycleBeats`| `number` | `1`, `2`, `4`, `8` | `4` | 1サイクルの拍数 |
  | `gateLen` | `number` | `0.05` 〜 `0.95` | `0.80` | ゲート比率 |

#### `MARKOV` (マルコフ連鎖プロバビリティシーケンサー)
確率的・アルゴリズム的に状態遷移を繰り返し、終わりのない音楽的フレーズを生成する確率ノード。
- **入力ポート**:
  - `clk_in`: クロックパルス入力
  - `trans_in`: **マルコフ連鎖専用・遷移トリガー入力**（他ノードの `trans_out1..4` からバトンを受信。旧名 `transition_in`, `trig_in` 互換）
- **出力ポート**:
  - `cv_out`: ピッチCV出力
  - `gate_out`: **持続ゲート出力**（次に他の状態へ遷移するまでずっとONを維持）
  - `trig_out`: **発音用ワンショットトリガー出力**（アクティブになった最初の1拍目のみパルスを出力）
  - `trans_out1` 〜 `trans_out4`: **マルコフ連鎖専用・次状態遷移パルス**（旧名 `transition_out1..4`, `trig_out1..4` 互換）
- **パラメータ**:
  | キー | 型 | 範囲 / 選択肢 | デフォルト | 説明 |
  | :--- | :--- | :--- | :--- | :--- |
  | `rootMidi` | `number` | `24` 〜 `96` | `60` | 出力ピッチ (MIDIノート番号) |
  | `quantize` | `boolean` | `true`, `false` | `true` | 半音クオンタイズ有効化 |
  | `stayWeight` | `number` | `1` 〜 `20` | `10` | 現在ノードに留まる確率の重み |
  | `holdClocks` | `number` | `1` 〜 `16` | `1` | 1回の遷移で何拍保持するか |
  | `initOn` | `boolean` | `true`, `false` | `false` | 初期アクティブ状態（ネットワーク内で通常1台のみ `true`） |
  | `weights` | `array` | 長さ4の数値配列 (`0`〜`20`) | `[5, 5, 5, 5]` | 各ブランチへの遷移確率ウェイト |

#### `CHORD` (4ボイス・コードジェネレーター)
単音CVから4声のポリフォニックCV（`cv_out1`〜`cv_out4`）を生成。
- **入力ポート**:
  - `cv_in`: ルート音CV (1V/Oct)
  - `type_cv`: コード指定CV (0V〜7V。3ビットバイナリ `"min"`, `"maj"`, `"m7"`, `"7th"`, `"dim7"`, `"5th"`, `"sus4"`, `"Maj7"`)
  - `voice_cv`: ボイシング指定CV (0V〜3V。`"close"`, `"drop2"`, `"drop3"`, `"open"`)
- **出力ポート**: `cv_out1`, `cv_out2`, `cv_out3`, `cv_out4`
- **パラメータ**:
  | キー | 型 | 選択肢 | デフォルト | 説明 |
  | :--- | :--- | :--- | :--- | :--- |
  | `chord` | `string` | `"min"`, `"maj"`, `"m7"`, `"7th"`, `"dim7"`, `"5th"`, `"sus4"`, `"Maj7"` | `"min"` | 固定コード種別 |
  | `voicing`| `string` | `"close"`, `"drop2"`, `"drop3"`, `"open"` | `"close"` | 固定ボイシング |
  | `rootMidi`| `number` | `24` 〜 `72` | `48` | `cv_in`未接続時の基準ノート(48=C3) |

#### `GATE4` (4相ゲートディストリビューター)
入力されたゲート信号を、ステップ数（2〜4）およびカウント方向（UP/DOWN/UPDOWN/RANDOM）に従って4系統の出力（`gate_out1`〜`gate_out4`）へ順次振り分ける分配器。
- **入力ポート**: `gate_in`
- **出力ポート**: `gate_out1` 〜 `gate_out4`
- **パラメータ**:
  | キー | 型 | 範囲 / 選択肢 | デフォルト | 説明 |
  | :--- | :--- | :--- | :--- | :--- |
  | `steps` | `number` | `2`, `3`, `4` | `4` | 有効ステップ数 |
  | `mode` | `string` | `"up"`, `"down"`, `"updown"`, `"random"` | `"up"` | カウント方向 |

#### `ARP` (4ch シーケンシャルスイッチ / アルペジエーター)
最大4系統のCV/オーディオ入力を、クロックトリガーに応じて順次切り替えて単一の `cv_out` から出力。
- **入力ポート**:
  - `gate_in` (クロック/ゲートパルス入力: 旧名 `clk_in` 互換)
  - `cv_in1` 〜 `cv_in4` (チャンネル1〜4 CV入力)
- **出力ポート**:
  - `cv_out` (選択中チャンネルの出力信号: 旧名 `out` 互換)
  - `gate_out` (入力ゲートのスルー出力)
- **パラメータ**:
  | キー | 型 | 範囲 / 選択肢 | デフォルト | 説明 |
  | :--- | :--- | :--- | :--- | :--- |
  | `mode` | `string` | `"up"`, `"down"`, `"updown"`, `"random"` | `"up"` | 切り替え進行モード |

---

### 5.6 エフェクト & ビジュアライザー (Effects & Visualizers)

#### `DELAY` (ステレオディレイ)
- **入力ポート**: `wave_in` (オーディオ入力)
- **出力ポート**: `wave_out` (オーディオ出力)
- **パラメータ**:
  | キー | 型 | 範囲 | デフォルト | 説明 |
  | :--- | :--- | :--- | :--- | :--- |
  | `delayTime` | `number` | `0.02` 〜 `1.5` | `0.3` | ディレイタイム(秒) |
  | `feedback` | `number` | `0.0` 〜 `0.95` | `0.4` | フィードバック量 |
  | `mix` | `number` | `0.0` 〜 `1.0` | `0.5` | ドライ/ウェット比率 |

#### `REVERB` (コンボリューション・リバーブ)
- **入力ポート**: `wave_in` (オーディオ入力), `cv_in` (ウェットゲイン変調CV: 0V〜1V)
- **出力ポート**: `wave_out` (オーディオ出力)
- **パラメータ**:
  | キー | 型 | 範囲 / 選択肢 | デフォルト | 説明 |
  | :--- | :--- | :--- | :--- | :--- |
  | `time` | `number` | `0.1` 〜 `10.0` | `1.8` | 残響時間(秒) |
  | `damp` | `number` | `200` 〜 `10000` | `4500` | 高域ダンピング周波数(Hz) |
  | `mix` | `number` | `0.0` 〜 `1.0` | `0.4` | ドライ/ウェット比率 |
  | `mode` | `string` | `"hall"`, `"room"`, `"spring"`, `"shimmer"` | `"hall"` | 空間アルゴリズム |

#### `MIX` (4ch オーディオミキサー)
- **入力ポート**: `wave_in1`, `wave_in2`, `wave_in3`, `wave_in4`
- **出力ポート**: `wave_out`
- **パラメータ**:
  | キー | 型 | 範囲 | デフォルト | 説明 |
  | :--- | :--- | :--- | :--- | :--- |
  | `channels` | `number` | `2`, `3`, `4` | `4` | 有効入力数 |
  | `lvl1` 〜 `lvl4` | `number` | `0.0` 〜 `1.0` | `0.8` | 各chの入力音量 |

#### `SCOPE` (1ch オシロスコープ)
- **入力ポート**: `wave_in` (波形入力 / PIN4), `trig_in` (外部同期トリガー / PIN5)
- **出力ポート**: なし
- **パラメータ**:
  | キー | 型 | 範囲 / 選択肢 | デフォルト | 説明 |
  | :--- | :--- | :--- | :--- | :--- |
  | `vRange` | `number` | `0.5`, `1.0`, `2.0`, `5.0`, `10.0` | `2.0` | 電圧レンジ (V/DIV) |
  | `timeSpan` | `number` | `0.001` 〜 `5.0` | `0.1` | 時間軸スパン (秒) |
  | `trigMode` | `string` | `"auto"`, `"free"` | `"auto"` | トリガー同期モード |
  | `opacity` | `number` | `0.1` 〜 `1.0` | `0.8` | パネル透明度 |

#### `LISS` (リサージュ XY スコープ)
2系統の信号（X軸とY軸）を入力し、位相差やハーモニクスを幾何学的リサージュ図形として描画。
- **入力ポート**: `wave_in_x` (X軸入力), `wave_in_y` (Y軸入力)
- **出力ポート**: なし
- **パラメータ**:
  | キー | 型 | 範囲 / 選択肢 | デフォルト | 説明 |
  | :--- | :--- | :--- | :--- | :--- |
  | `vRange` | `number` | `0.5`, `1.0`, `2.0`, `5.0`, `10.0` | `2.0` | 電圧レンジ (V/DIV) |
  | `opacity` | `number` | `0.1` 〜 `1.0` | `0.8` | パネル透明度 |

#### `SPK` (マスター出力 / スピーカー) ★接続必須
ブラウザのマスターオーディオ出力へ最終音声を送り出す唯一の出口。
- **入力ポート**: `wave_in_l` (左chオーディオ), `wave_in_r` (右chオーディオ)
- **出力ポート**: なし
- **パラメータ**:
  | キー | 型 | 範囲 | デフォルト | 説明 |
  | :--- | :--- | :--- | :--- | :--- |
  | `masterVol` | `number` | `0.0` 〜 `0.5` | `0.16` | マスター音量（音割れ防止のため `0.12`〜`0.20` 推奨） |

---

### 5.7 サブパッチ & ブリッジ (Subpatches & Cross-Page Routing)

#### `SUB` (サブパッチ・コンテナ / 親機ブリッジ)
親ページに配置し、指定したサブページ（子ページ）と信号を中継。
- **入力ポート**: `PIN1_in` 〜 `PIN6_in`（エイリアス対応: `cv_in`, `gate_in`, `trig_in` 等）
- **出力ポート**: `PIN7_out` 〜 `PIN12_out`（エイリアス対応: `wave_out` 等）
- **パラメータ**:
  | キー | 型 | 範囲 | デフォルト | 説明 |
  | :--- | :--- | :--- | :--- | :--- |
  | `subType` | `string` | 任意のサブパッチ型番 | - | ファクトリー品またはユーザー品型番（例: `"AcidVoice"`, `"MonoVoice"`） |
  | `targetPage` | `number` | `1` 〜 | `1` | 中継先のサブページ番号 |

#### `SUB_IO` (サブパッチ入出力インターフェース / 子機ブリッジ)
サブページ（Page 1〜）内に配置し、親ページの `SUB` モジュールと信号を授受。
- **出力ポート**: `PIN1_out` 〜 `PIN6_out` (親から子へ)
- **入力ポート**: `PIN7_in` 〜 `PIN12_in` (子から親へ)
- **パラメータ**: なし（設定不要。スロット `"2"` または `"0"` に1台配置）

---

## 6. 音階と 1V/Oct ピッチCV計算式 (Musical Pitch Calculations)

Gridsynth の `SEQ8` / `SEQ16` の `cv` パラメータは、**1.0V = 1オクターブ (12半音)** 規格です。

### 6.1 音名と CV 値の対照表（C1〜C4）

$$\text{CV} = \frac{\text{MIDI Note} - 24}{12}$$

| ノート名 | MIDI | CV値 (10進) | 音楽的意味 |
| :--- | :---: | :---: | :--- |
| **C1** | 24 | `0.0000` | 基準ルート（低音ベース） |
| **D1** | 26 | `0.1667` | 長2度 |
| **Eb1** | 27 | `0.2500` | 短3度 (Minor 3rd) |
| **E1** | 28 | `0.3333` | 長3度 (Major 3rd) |
| **F1** | 29 | `0.4167` | 完全4度 |
| **G1** | 31 | `0.5833` | 完全5度 |
| **Ab1** | 32 | `0.6667` | 短6度 |
| **A1** | 33 | `0.7500` | 長6度 |
| **Bb1** | 34 | `0.8333` | 短7度 (Minor 7th) |
| **B1** | 35 | `0.9167` | 長7度 (Major 7th) |
| **C2** | 36 | `1.0000` | 1オクターブ上 |
| **Eb2** | 39 | `1.2500` | 1オクターブ上の短3度 |
| **G2** | 43 | `1.5833` | 1オクターブ上の完全5度 |
| **C3** | 48 | `2.0000` | 2オクターブ上（リード・コード基準） |
| **C4** | 60 | `3.0000` | 3オクターブ上（高音メロディ） |

### 6.2 オクターブチェンジとリアルタイム・トランスポーズ（KEYサミング技法）

`SEQ8` / `SEQ16` の内部スライダーで設定できる音域は **約3オクターブ（`0.0V` [C1] 〜 `3.0V` [C4]）** です。
4オクターブ以上の高音域へオクターブチェンジさせたり、曲中でコード進行に合わせてシーケンス全体をリアルタイム移調（トランスポーズ）させたい場合は、**`KEY`（キーボード）モジュールからのピッチCVをサミング（加算）して電圧を引き上げます**。

* **原理（入力サミング）**:
  Gridsynth のモジュラーエンジンでは、同一の入力ポート（例: `VCO1:cv_in` や `CHORD1:cv_in`）に複数のケーブルを接続すると、入力電圧が**自動的に加算（サミング）**されます。

  $$\text{最終オシレーターCV} = \text{SEQ8のCV} + \text{KEYのCV}$$

* **電圧の足し算によるオクターブ変化**:
  - `KEY` で **C1 (MIDI 24)** を弾いた時: `KEY:cv_out = 0.0V` ➔ 原音のまま（オクターブ変化なし）
  - `KEY` で **C2 (MIDI 36)** を弾いた時: `KEY:cv_out = +1.0V` ➔ **+1オクターブ上へシフト（オクターブチェンジ）**
  - `KEY` で **C3 (MIDI 48)** を弾いた時: `KEY:cv_out = +2.0V` ➔ **+2オクターブ上へシフト**
  - `KEY` で **C4 (MIDI 60)** を弾いた時: `KEY:cv_out = +3.0V` ➔ **+3オクターブ上へシフト**
  - `KEY` で D, E, F, G などの他の鍵盤を弾いた時: シーケンスのフレーズ音程関係を保ったまま、曲のキー全体がリアルタイムに移調（トランスポーズ）されます。

* **結線例（オクターブチェンジ対応シーケンス）**:
```
// クロックと発音
CLK1:gate_out > SEQ8_1:gate_in
SEQ8_1:gate_out > ADSR1:gate_in

// ピッチCVのサミング（SEQ8_1とKEY1の両方を同じVCO1:cv_inに直結）
SEQ8_1:cv_out   > VCO1:cv_in      (基本シーケンス旋律 / 0〜3V)
KEY1:cv_out   > VCO1:cv_in      (キーボードによる電圧かさ上げ: +1Vごとに1オクターブ上昇)
```

---

## 7. 実戦パッチングレシピ (Patch Architecture Recipes)

### 【レシピ 1】標準減算アナログシンセ（ベース / リード）
```
CLK1:gate_out > SEQ8_1:gate_in
SEQ8_1:cv_out   > VCO1:cv_in        (ピッチ決定)
SEQ8_1:gate_out > ADSR1:gate_in     (発音トリガー)
VCO1:wave_out > VCF1:wave_in      (原音)
ADSR1:cv_out  > VCF1:cv_in        (フィルターモジュレーション)
VCF1:wave_out > VCA1:wave_in      (アンプ入力)
ADSR1:cv_out  > VCA1:cv_in        (音量エンベロープ)
VCA1:wave_out > DELAY1:wave_in    (空間系)
DELAY1:wave_out > SPK1:wave_in_l
DELAY1:wave_out > SPK1:wave_in_r
```

### 【レシピ 2】パーカッション / ドラム合成
- **エレクトロキック（急激なピッチ降下）**:
  - `CLK1:gate_out > ADSR1:gate_in`
  - `ADSR1:cv_out > VCO1:cv_in`（Attack: `0.001`, Decay: `0.08`, Sustain: `0.0` の超高速エンベロープでアタック感を作る）
  - `VCO1:wave_out > VCA1:wave_in`
  - `ADSR1:cv_out > VCA1:cv_in`
  - `VCA1:wave_out > MIX1:wave_in1`
- **ハイハット / スネア（フィルタリングド・ノイズ）**:
  - `CLK2` (x8 等の細分クロック) `> ADSR2:gate_in`
  - `NOISE1:wave_out > VCF1:wave_in` (Highpass または Bandpass)
  - `VCF1:wave_out > VCA2:wave_in`
  - `ADSR2:cv_out > VCA2:cv_in` (Decay: `0.05` 前後のショートディケイ)
  - `VCA2:wave_out > MIX1:wave_in2`
- **サミング**:
  - `MIX1:wave_out > SPK1:wave_in_l`
  - `MIX1:wave_out > SPK1:wave_in_r`

### 【レシピ 3】2パート本格アンサンブル（アシッドベース ＋ 4声コードパッド）
```
[パートA: ベース]
CLK1:gate_out  > SEQ8_1:gate_in
SEQ8_1:cv_out    > VCO1:cv_in
SEQ8_1:gate_out  > ADSR1:gate_in
VCO1:wave_out  > VCF1:wave_in
ADSR1:cv_out   > VCF1:cv_in
VCF1:wave_out  > VCA1:wave_in
ADSR1:cv_out   > VCA1:cv_in
VCA1:wave_out  > MIX1:wave_in1

[パートB: 4声ポリフォニックコード]
PAT1:cv_out    > CHORD1:cv_in      (ルート音シーケンス)
CHORD1:cv_out1 > VCO2:cv_in       (VCO2 は channels: 4)
CHORD1:cv_out2 > VCO2:cv_in2
CHORD1:cv_out3 > VCO2:cv_in3
CHORD1:cv_out4 > VCO2:cv_in4
PAT1:gate_out  > ADSR2:gate_in
VCO2:wave_out  > VCF2:wave_in
ADSR2:cv_out   > VCF2:cv_in
VCF2:wave_out  > VCA2:wave_in
ADSR2:cv_out   > VCA2:cv_in
VCA2:wave_out  > REVERB1:wave_in
REVERB1:wave_out > MIX1:wave_in2

[マスター出力]
MIX1:wave_out  > SPK1:wave_in_l
MIX1:wave_out  > SPK1:wave_in_r
```

### 【レシピ 4】マルコフ連鎖による確率的メロディ・コード進行（3ノード・パーペチュアル型）
3台の MARKOV を相互接続し、途切れずに永久遷移し続ける基本骨格です。

- **構成**:
  - `MARKOV1` (ノードA / `initOn: true`, `rootMidi: 48` [C3], `weights: [5, 5, 0, 0]`)
  - `MARKOV2` (ノードB / `initOn: false`, `rootMidi: 51` [Eb3], `weights: [5, 5, 0, 0]`)
  - `MARKOV3` (ノードC / `initOn: false`, `rootMidi: 55` [G3], `weights: [5, 5, 0, 0]`)
- **結線**:
```
// クロック分配 (全ノードへクロック供給)
CLK1:gate_out > MARKOV1:clk_in
CLK1:gate_out > MARKOV2:clk_in
CLK1:gate_out > MARKOV3:clk_in

// 相互バトン渡し (transition_out1, transition_out2 のみ使用し、未結線の weights[2], [3] は 0)
MARKOV1:transition_out1 > MARKOV2:transition_in
MARKOV1:transition_out2 > MARKOV3:transition_in

MARKOV2:transition_out1 > MARKOV1:transition_in
MARKOV2:transition_out2 > MARKOV3:transition_in

MARKOV3:transition_out1 > MARKOV1:transition_in
MARKOV3:transition_out2 > MARKOV2:transition_in

// ピッチサミング (アクティブなノードのピッチを音源へ合流)
MARKOV1:cv_out > VCO1:cv_in
MARKOV2:cv_out > VCO1:cv_in
MARKOV3:cv_out > VCO1:cv_in

// 発音トリガーサミング (各ノードの発行時ワンショットトリガーをADSRへ合流)
MARKOV1:trig_out > ADSR1:gate_in
MARKOV2:trig_out > ADSR1:gate_in
MARKOV3:trig_out > ADSR1:gate_in

// 発音・フィルター・出力
VCO1:wave_out > VCF1:wave_in
ADSR1:cv_out  > VCF1:cv_in
VCF1:wave_out > VCA1:wave_in
ADSR1:cv_out  > VCA1:cv_in
VCA1:wave_out > SPK1:wave_in_l
VCA1:wave_out > SPK1:wave_in_r
```

### 【レシピ 5】CHORD + ARP によるアルペジオ自動生成 & GATE4 リズムディストリビューション
`CHORD` の4ボイス出力を `ARP` に入力し、クロックで巡回させて単一VCOへ流し込むことで、1ボイスのシンセから高品位なアルペジオを鳴らします。同時に `GATE4` でクロックを4相に振り分け、各拍で異なる音色変化やアクセントを付与する先進的モジュラー構成です。

```
// クロック供給
CLK1:gate_out > ARP1:clk_in
CLK1:gate_out > GATE4_1:gate_in

// CHORD の 4ボイスCV出力を ARP に入力 (Auto-Senseにより結線されたボイスのみを巡回)
CHORD1:cv_out1 > ARP1:cv_in1
CHORD1:cv_out2 > ARP1:cv_in2
CHORD1:cv_out3 > ARP1:cv_in3
CHORD1:cv_out4 > ARP1:cv_in4

// ARP から単一の VCO / ADSR へルーティング (1ボイスで完全なアルペジオを実現)
ARP1:out      > VCO1:cv_in
ARP1:gate_out > ADSR1:gate_in
VCO1:wave_out > VCF1:wave_in
ADSR1:cv_out  > VCF1:cv_in
VCF1:wave_out > VCA1:wave_in
ADSR1:cv_out  > VCA1:cv_in
VCA1:wave_out > SPK1:wave_in_l
VCA1:wave_out > SPK1:wave_in_r

// GATE4 による 4拍ごとのアクセント・ディストリビューション (例: ステップ1でフィルターを開く)
GATE4_1:gate_out1 > VCF1:cv_in
```

---

## 8. サブパッチアーキテクチャ、ファクトリー活用、および「境界切断・二分割」生成仕様 (Subpatch Architecture & Boundary-Cut Rules)

Gridsynth は、大規模なパッチや複雑なシンセボイスを整理・カプセル化・再利用するために、独立した作業グリッドを持つサブパッチ（マルチページ）機構を備えています。

---

### 8.1 新サブパッチアーキテクチャ概要 (v2.1)
従来の手動ページ番号固定（`targetPage: 1`）や曖昧な端子体系を刷新し、以下の4大コンセプトにより**「部品としての独立性」**と**「AI／人間双方にとって破綻しない厳格なシグナルフロー」**を実現しています。

1. **ページ番号非依存の管理（`subType` 動的バインド）**:
   - AIやユーザーは固定ページ番号（`targetPage`）を指定する必要はありません。型番（`subType: "AcidVoice"` 等）を指定するだけで、システムが空いている最小ページ番号（`1`, `2`...）を自動採番し、モジュール群・内部結線を動的に展開します。
   - 同一型番を複数配置した場合（例: `AcidVoice` を2台）でも、ID衝突することなく独立したサブページ（`ACID BASS`, `ACID BASS_1`）に自動展開され、完全並行動作します。
2. **表裏対称端子ペア（PIN1〜6 送り / PIN7〜12 戻り）**:
   - 親モジュール（`SUB`）と子モジュール（`SUB_IO`）で入出力の役割が厳密に対称ペアとなっています。
   - すべての結線が Gridsynth の鉄則である **「送信元:_out > 送信先:_in」** に100%合致し、接続方向の反転や文法違反が発生しません。
3. **端子エイリアス（機能別名）結線**:
   - ファクトリー品やマニフェスト付きサブパッチでは、物理ピン名（`PIN4_in`, `PIN9_out`）に加え、`trig_in`, `cv_in`, `wave_out` などの直感的な**端子エイリアス名を結線に直接記述可能**です。
4. **境界切断・二分割（Boundary-Cut）生成アルゴリズム**:
   - AIが自作サブパッチを設計する際は、まず全体フラットな結線を考案し、親・子の境界を横断する線を抽出して二分割出力する標準手順が確立されています。

---

### 8.2 ファクトリーサブパッチ完全カタログ（全11種類）
AIは以下のファクトリーサブパッチ型番（`subType`）を親ページ（`pages["0"]`）で指定するだけで、子ページを自前で実装することなく高品位なボイスやドラムキットを瞬時に呼び出せます。

| `subType` (型番) | 名称 / カテゴリ | 入力エイリアス (親から見た役割) | 出力エイリアス (親から見た役割) | 親ページ結線例 |
| :--- | :--- | :--- | :--- | :--- |
| **`AcidVoice`** | 303 ACID BASS<br>(Synth Voice) | `cv_in` (PIN4 / CV)<br>`trig_in` (PIN3 / Gate) | `wave_out` (PIN9 / Audio) | `SEQ8_1:cv_out > SUB1:cv_in`<br>`SEQ8_1:gate_out > SUB1:trig_in`<br>`SUB1:wave_out > MIX1:wave_in1` |
| **`MonoVoice`** | VOICE (Standard Lead)<br>(Synth Voice) | `cv_in` (PIN4 / CV)<br>`gate_in` (PIN3 / Gate) | `wave_out` (PIN9 / Audio) | `SEQ8_1:cv_out > SUB1:cv_in`<br>`SEQ8_1:gate_out > SUB1:gate_in`<br>`SUB1:wave_out > SPK1:wave_in_l` |
| **`DualVCOVoice`**<br>(または `DualLead`) | DUAL VCO (Fat Bass/Lead)<br>(Synth Voice) | `cv_in` (PIN4 / CV)<br>`gate_in` (PIN3 / Gate) | `wave_out` (PIN9 / Audio) | `SEQ8_1:cv_out > SUB1:cv_in`<br>`CLK1:gate_out > SUB1:gate_in`<br>`SUB1:wave_out > MIX1:wave_in1` |
| **`SpaceFxVoice`**<br>(または `SpaceFx`) | SPACE FX (Delay + Reverb)<br>(Effect Rack) | `wave_in` (PIN4 / Audio) | `wave_out` (PIN9 / Audio) | `VCO1:wave_out > SUB1:wave_in`<br>`SUB1:wave_out > SPK1:wave_in` |
| **`BassDrum`** | BASS DRUM (Analog Kick 1)<br>(Percussion) | `trig_in` (PIN4 / Gate) | `wave_out` (PIN9 / Audio) | `CLK1:gate_out > SUB1:trig_in`<br>`SUB1:wave_out > MIX1:wave_in1` |
| **`TechnoKick`** | BASS DRUM 2 (Hard Techno Kick)<br>(Percussion) | `trig_in` (PIN4 / Gate) | `wave_out` (PIN9 / Audio) | `CLK1:gate_out > SUB1:trig_in`<br>`SUB1:wave_out > MIX1:wave_in1` |
| **`SnareDrum`** | SNARE DRUM (909 Snare)<br>(Percussion) | `trig_in` (PIN4 / Gate) | `wave_out` (PIN9 / Audio) | `SEQ8_1:gate_out > SUB1:trig_in`<br>`SUB1:wave_out > MIX1:wave_in2` |
| **`HiHat`** | HI-HAT (Metallic Closed Hat)<br>(Percussion) | `trig_in` (PIN4 / Gate) | `wave_out` (PIN9 / Audio) | `CLK2:gate_out > SUB1:trig_in`<br>`SUB1:wave_out > MIX1:wave_in3` |
| **`HandClap`** | HAND CLAP (Multi-Burst Clap)<br>(Percussion) | `trig_in` (PIN4 / Gate) | `wave_out` (PIN9 / Audio) | `SEQ8_2:gate_out > SUB1:trig_in`<br>`SUB1:wave_out > MIX1:wave_in4` |
| **`TechnoTom`** | TECHNO TOM (Resonant Tom)<br>(Percussion) | `trig_in` (PIN4 / Gate) | `wave_out` (PIN9 / Audio) | `SEQ8_1:gate_out > SUB1:trig_in`<br>`SUB1:wave_out > MIX1:wave_in2` |
| **`MetallicPerc`** | METALLIC PERC (Rim / Ring)<br>(Percussion) | `trig_in` (PIN4 / Gate) | `wave_out` (PIN9 / Audio) | `SEQ8_1:gate_out > SUB1:trig_in`<br>`SUB1:wave_out > MIX1:wave_in3` |

> [!TIP]
> **ファクトリー活用時のAI推奨パターン**:
> ドラムキットやアシッドベースボイスを鳴らす場合、AIは子ページ（`pages["1"]` 等）のモジュールや配線を自分で書く必要は一切ありません。
> 親ページで `"SUB1": { "type": "SUB", "subType": "AcidVoice" }` のように型番を指定し、`SUB1:cv_in`、`SUB1:trig_in`、`SUB1:wave_out` に結線するだけで、内部配線・音色合成・ページ展開が自動実行されます。

---

### 8.3 物理端子仕様（表裏対称マッピング規則）
ファクトリー品以外の**自作サブパッチ**や、カスタム配線を行う場合、物理端子スロット 1〜12 は親側（`SUB`）と子側（`SUB_IO`）で完全に対称ペアを形成します。

| スロット | 信号の向き | 親モジュール（`SUB`） | サブモジュール（`SUB_IO`） | 主な伝達信号 |
| :---: | :---: | :---: | :---: | :--- |
| **1 〜 6** | **親 ➔ 子（送り）** | **`PIN1_in` 〜 `PIN6_in`**<br>（親から見てSUBへ流し込む） | **`PIN1_out` 〜 `PIN6_out`**<br>（子から見てSUB_IOから湧き出す） | クロック、ゲート、ピッチCV、変調CV、外部原音オーディオなど |
| **7 〜 12** | **子 ➔ 親（戻り）** | **`PIN7_out` 〜 `PIN12_out`**<br>（親から見てSUBから湧き出す） | **`PIN7_in` 〜 `PIN12_in`**<br>（子から見てSUB_IOへ流し込む） | 生成オーディオ(L/R)、内部LFO/ENV還元、EOLトリガーなど |

#### 結線文法の整合性（`_out > _in` の完全保証）
- **親 ➔ 子（例: ピッチCV）**:
  - 親（Page 0）側: `"SEQ8_1:cv_out > SUB1:PIN4_in"` （out > in: 正常）
  - 子（Page 1）側: `"SUB_IO1:PIN4_out > VCO1:cv_in"` （out > in: 正常）
- **子 ➔ 親（例: オーディオ戻り）**:
  - 子（Page 1）側: `"VCA1:wave_out > SUB_IO1:PIN9_in"` （out > in: 正常）
  - 親（Page 0）側: `"SUB1:PIN9_out > MIX1:wave_in1"` （out > in: 正常）

#### 端子のU字型物理配置
モジュールパネル上では、端子が左上から時計回りU字型に整然と配置されています：
- **左辺（下方向）**: `PIN1`（スロット1）, `PIN2`（スロット2）, `PIN3`（スロット3）
- **下辺（右方向）**: `PIN4`（スロット4）, `PIN5`（スロット5）, `PIN6`（スロット6）, `PIN7`（スロット7）, `PIN8`（スロット8）, `PIN9`（スロット9）
- **右辺（上方向）**: `PIN10`（スロット10）, `PIN11`（スロット11）, `PIN12`（スロット12）

---

### 8.4 AI向け「境界切断・二分割（Boundary-Cut）」生成アルゴリズム
AIがユーザーから「新しい音源をサブパッチとして作って」「マルチページ構成にして」と要求された場合、以下の**4段階アルゴリズム**に従って生成してください。

```
[ Step 1: 全体フラット結線の考案 ]
  親・子の境界を意識せず、シンセ全体の信号フローを設計。
  (例: CLK1 -> SEQ8_1 -> VCO1 -> VCF1 -> VCA1 -> SPK1)
            |
            v
[ Step 2: 境界切断 ＆ 境界通過ケーブルの抽出 ]
  ・親から子へ渡る線 (SEQ8_1:cv_out, SEQ8_1:gate_out)
    ➔ 送りピン PIN4, PIN3 に順次割り当て (左下コーナー入力)
  ・子から親へ戻る線 (VCA1:wave_out -> SPK1)
    ➔ 戻りピン PIN9 に割り当て (右下コーナー出力)
  ・1対N 分岐は同一ピン番号を共有
            |
            v
[ Step 3: 結線の二分割出力 ]
  ・親側 (Page 0): SUB1:PIN4_in, SUB1:PIN3_in, SUB1:PIN9_out
  ・子側 (Page 1): SUB_IO1:PIN4_out, SUB_IO1:PIN3_out, SUB_IO1:PIN9_in
            |
            v
[ Step 4: 入出力厳格検証 ]
  ・すべての結線が [送信元:_out > 送信先:_in] であることを再確認
```

#### 各ステップの詳細手順
1. **全体フラット結線の考案**:
   まず、全モジュールが単一ページにあるかのように全体のシグナルパス（演奏シーケンス ➔ 音源 ➔ フィルター ➔ アンプ ➔ エフェクト ➔ 出力）を考案します。
2. **境界通過ケーブルの抽出**:
   カプセル化するモジュール群（子ページ候補）を決め、親と子の境界を横断するケーブルのみをリストアップします。
   - **親 ➔ 子（CV、クロック、ゲート）**:
     `PIN1`〜`PIN6` の空きスロット（一次入力は推奨 `PIN4`、二次入力は推奨 `PIN3`）に順次割り当てます。
     ※もし親のクロックが子の複数モジュールに分配される場合（1対N分岐）、親側は1本（`CLK1:gate_out > SUB1:PIN4_in`）、子側は同一ピンから複数分岐（`SUB_IO1:PIN4_out > MODA:in`, `SUB_IO1:PIN4_out > MODB:in`）とします。
   - **子 ➔ 親（オーディオ、返還CV）**:
     `PIN7`〜`PIN12` の空きスロット（メインオーディオ出力は推奨 `PIN9`）に順次割り当てます。
3. **結線の二分割出力**:
   親ページ側の `connections` と、子ページ側の `connections` に物理ピン（またはエイリアス）を用いて振り分けます。
4. **入出力厳格検証（`_out > _in`）**:
   `>` の左側が必ず `_out`、右側が必ず `_in` であることをチェックし、出力します。

---

### 8.5 完全動作マルチページJSONサンプル

#### 実例A: ファクトリーサブパッチ活用（親ページのみで完結する高密度グルーヴボックス）
ファクトリー品の型番（`subType`）とエイリアス端子を活用し、子ページ記述なしでキック、ハイハット、アシッドベースを同時演奏させる最小・強力なJSONです。

```json
{
  "bpm": 130,
  "pages": {
    "0": {
      "name": "Groove Console",
      "slots": {
        "0": "CLK1",
        "1": "SEQ8_1",
        "2": "SUB1",
        "5": "CLK2",
        "7": "SUB2",
        "10": "CLK3",
        "12": "SUB3",
        "3": "MIX1",
        "4": "SPK1"
      },
      "modules": {
        "CLK1": { "type": "CLK", "div": "x4", "pulseWidthMs": 15 },
        "SEQ8_1": {
          "type": "SEQ8",
          "quantize": true,
          "steps": [
            { "cv": 0.0, "active": true, "cvActive": true, "gate": true },
            { "cv": 0.0, "active": true, "cvActive": true, "gate": true },
            { "cv": 0.5, "active": true, "cvActive": true, "gate": true },
            { "cv": 0.25, "active": true, "cvActive": true, "gate": true }
          ]
        },
        "SUB1": { "type": "SUB", "subType": "AcidVoice" },
        "CLK2": { "type": "CLK", "div": "x1", "pulseWidthMs": 20 },
        "SUB2": { "type": "SUB", "subType": "TechnoKick" },
        "CLK3": { "type": "CLK", "div": "x2", "pulseWidthMs": 10 },
        "SUB3": { "type": "SUB", "subType": "HiHat" },
        "MIX1": { "type": "MIX", "channels": 4, "lvl1": 0.7, "lvl2": 0.9, "lvl3": 0.6, "lvl4": 0.0 },
        "SPK1": { "type": "SPK", "masterVol": 0.18 }
      },
      "connections": [
        "CLK1:gate_out > SEQ8_1:gate_in",
        "SEQ8_1:gate_out > SUB1:trig_in",
        "SEQ8_1:cv_out   > SUB1:cv_in",
        "SUB1:wave_out > MIX1:wave_in1",
        "CLK2:gate_out > SUB2:trig_in",
        "SUB2:wave_out > MIX1:wave_in2",
        "CLK3:gate_out > SUB3:trig_in",
        "SUB3:wave_out > MIX1:wave_in3",
        "MIX1:wave_out > SPK1:wave_in_l",
        "MIX1:wave_out > SPK1:wave_in_r"
      ]
    }
  }
}
```

#### 実例B: 「境界切断・二分割」による自作マルチページシンセ
親（Page 0）でアルペジオパターンを生成し、子（Page 1）の自作FM/減算ハイブリッドボイスに送り込んで鳴らす、境界切断ルールに厳格準拠した完全パッチです。

```json
{
  "bpm": 128,
  "pages": {
    "0": {
      "name": "Sequencer Console",
      "slots": {
        "0": "CLK1",
        "1": "SEQ8_1",
        "2": "SUB1",
        "3": "MIX1",
        "4": "SPK1"
      },
      "modules": {
        "CLK1": { "type": "CLK", "div": "x4", "pulseWidthMs": 15 },
        "SEQ8_1": {
          "type": "SEQ8",
          "quantize": true,
          "steps": [
            { "cv": 0.0, "active": true, "cvActive": true, "gate": true },
            { "cv": 0.25, "active": true, "cvActive": true, "gate": true },
            { "cv": 0.5833, "active": true, "cvActive": true, "gate": true },
            { "cv": 1.0, "active": true, "cvActive": true, "gate": true }
          ]
        },
        "SUB1": { "type": "SUB", "targetPage": 1 },
        "MIX1": { "type": "MIX", "channels": 2, "lvl1": 0.8, "lvl2": 0.8 },
        "SPK1": { "type": "SPK", "masterVol": 0.16 }
      },
      "connections": [
        "CLK1:gate_out > SEQ8_1:gate_in",
        "SEQ8_1:cv_out   > SUB1:PIN4_in",
        "SEQ8_1:gate_out > SUB1:PIN3_in",
        "SUB1:PIN9_out > MIX1:wave_in1",
        "MIX1:wave_out > SPK1:wave_in_l",
        "MIX1:wave_out > SPK1:wave_in_r"
      ]
    },
    "1": {
      "name": "Custom Hybrid Voice",
      "slots": {
        "2": "SUB_IO1",
        "7": "VCO1",
        "8": "VCF1",
        "12": "ADSR1",
        "13": "VCA1"
      },
      "modules": {
        "SUB_IO1": { "type": "SUB_IO" },
        "VCO1": { "type": "VCO", "wave": "sawtooth", "freq1": 110, "channels": 1 },
        "VCF1": { "type": "VCF", "filterType": "lowpass", "cutoff": 650, "q": 8.0, "modDepth": 2400 },
        "ADSR1": { "type": "ADSR", "attack": 0.005, "decay": 0.22, "sustain": 0.0, "release": 0.08 },
        "VCA1": { "type": "VCA", "level": 0.0 }
      },
      "connections": [
        "SUB_IO1:PIN4_out > VCO1:cv_in",
        "SUB_IO1:PIN3_out > ADSR1:gate_in",
        "VCO1:wave_out    > VCF1:wave_in",
        "ADSR1:cv_out     > VCF1:cv_in",
        "VCF1:wave_out    > VCA1:wave_in",
        "ADSR1:cv_out     > VCA1:cv_in",
        "VCA1:wave_out    > SUB_IO1:PIN9_in"
      ]
    }
  }
}
```

---

### 8.6 単体サブパッチ / プリセット配布スキーマ（JSON）
配布用・ライブラリ登録用のサブパッチ単体JSONは、特定のページ番号を持たず、`subType` を主キーとする自己完結型フォーマット（`format: "gridsynth-submodule"`）で記述します。

```json
{
  "format": "gridsynth-submodule",
  "version": "2.1",
  "subType": "CustomAcidVoice",
  "name": "Custom Acid Bass Voice",
  "category": "Synth Voice",
  "author": "Custom",
  "manifest": {
    "description": "303スタイルのアシッドベースボイス",
    "ports": {
      "cv_in":    { "pin": "PIN4", "signal": "cv" },
      "trig_in":  { "pin": "PIN3", "signal": "gate" },
      "wave_out": { "pin": "PIN9", "signal": "audio" }
    }
  },
  "slots": {
    "2": "SUB_IO1",
    "7": "VCO1",
    "8": "VCF1",
    "12": "ADSR1",
    "13": "VCA1"
  },
  "modules": {
    "SUB_IO1": { "type": "SUB_IO" },
    "VCO1": { "type": "VCO", "wave": "sawtooth", "freq1": 110, "channels": 1 },
    "VCF1": { "type": "VCF", "filterType": "lowpass", "cutoff": 500, "q": 8.0 },
    "ADSR1": { "type": "ADSR", "decay": 0.2, "sustain": 0.0 },
    "VCA1": { "type": "VCA", "level": 0.0 }
  },
  "connections": [
    "SUB_IO1:cv_in > VCO1:cv_in",
    "SUB_IO1:trig_in > ADSR1:gate_in",
    "VCO1:wave_out > VCF1:wave_in",
    "ADSR1:cv_out > VCF1:cv_in",
    "VCF1:wave_out > VCA1:wave_in",
    "ADSR1:cv_out > VCA1:cv_in",
    "VCA1:wave_out > SUB_IO1:wave_out"
  ]
}
```
※マニフェストの `pin` は `PIN1`〜`PIN12` の番号ベースで定義し、親側・子側のどちらから参照されたかによってシステムが `_in` / `_out` を自動付与して解決します。


---

## 9. 完全動作実例 JSON (Complete Working Demo)

以下は、そのまま Gridsynth に読み込んですぐに鳴らせる「アシッドベース ＋ 空間系ディレイ」の完全な JSON です。

```json
{
  "bpm": 132,
  "pages": {
    "0": {
      "name": "Acid Drive",
      "slots": {
        "0": "CLK1",
        "1": "SEQ8_1",
        "2": "VCO1",
        "3": "VCF1",
        "4": "SPK1",
        "6": "ADSR1",
        "7": "VCA1",
        "8": "DELAY1"
      },
      "modules": {
        "CLK1": {
          "type": "CLK",
          "div": "x4",
          "pulseWidthMs": 20
        },
        "SEQ8_1": {
          "type": "SEQ8",
          "quantize": true,
          "steps": [
            { "cv": 0.0, "active": true, "cvActive": true, "gate": true },
            { "cv": 0.0, "active": true, "cvActive": true, "gate": false },
            { "cv": 0.25, "active": true, "cvActive": true, "gate": true },
            { "cv": 0.0, "active": true, "cvActive": true, "gate": true },
            { "cv": 0.5833, "active": true, "cvActive": true, "gate": true },
            { "cv": 0.25, "active": true, "cvActive": true, "gate": false },
            { "cv": 1.0, "active": true, "cvActive": true, "gate": true },
            { "cv": 0.5833, "active": true, "cvActive": true, "gate": true }
          ]
        },
        "VCO1": {
          "type": "VCO",
          "wave": "sawtooth",
          "freq1": 110,
          "channels": 1,
          "quantize": false
        },
        "VCF1": {
          "type": "VCF",
          "filterType": "lowpass",
          "cutoff": 450,
          "q": 8.0,
          "modDepth": 3600
        },
        "ADSR1": {
          "type": "ADSR",
          "attack": 0.005,
          "decay": 0.16,
          "sustain": 0.0,
          "release": 0.12,
          "attackCurve": 0.0,
          "decayCurve": 0.0,
          "releaseCurve": 0.0
        },
        "VCA1": {
          "type": "VCA",
          "level": 0.0,
          "cvDepth": 1.0
        },
        "DELAY1": {
          "type": "DELAY",
          "delayTime": 0.227,
          "feedback": 0.45,
          "mix": 0.35
        },
        "SPK1": {
          "type": "SPK",
          "masterVol": 0.16
        }
      },
      "connections": [
        "CLK1:gate_out > SEQ8_1:gate_in",
        "SEQ8_1:gate_out > ADSR1:gate_in",
        "SEQ8_1:cv_out > VCO1:cv_in",
        "VCO1:wave_out > VCF1:wave_in",
        "ADSR1:cv_out > VCF1:cv_in",
        "VCF1:wave_out > VCA1:wave_in",
        "ADSR1:cv_out > VCA1:cv_in",
        "VCA1:wave_out > DELAY1:wave_in",
        "DELAY1:wave_out > SPK1:wave_in_l",
        "DELAY1:wave_out > SPK1:wave_in_r"
      ]
    }
  }
}
```

---

## 10. AI へのシステムプロンプト指示テンプレート (Prompt Template)

外部のAI（ChatGPT, Claude, Gemini 等）に曲作りやパッチ作成を指示する際は、以下のプロンプトをそのままコピーして入力してください。

```text
あなたはモジュラーシンセサイザーのプロフェッショナルサウンドデザイナーです。
添付の「Gridsynth AI Patch Generation & Composition Specification」の仕様に厳密に従い、Gridsynthで再生可能な完全なパッチJSONを出力してください。

【楽曲テーマ・リクエスト】:
- スタイル: [例: BPM 126 のディープミニマルテクノ。パーカッシブなベースと空間系アルペジオ]
- パート構成: [例: 2パート構成（ベース + ドラム / コード）または 単一パート]
- 使用したいモジュール: [例: VCO, VCF, VCA, ADSR, SEQ8, SEQ16, DELAY, SPK, MIX など]

【出力ルール】:
1. 説明書に記載されている正式なポート名とパラメータ名のみを使用してください。
2. 接続は "送信元ID:ポート > 送信先ID:ポート" の形式とし、必ず出力ポートから入力ポートへ向けてください。
3. 最終出力は必ず SPK1 の wave_in_l および wave_in_r に結線してください。
4. slots のキー ("0"〜"39") と modules のモジュールIDを重複なく1対1でマッピングしてください。
5. 前置きや解説は一切省き、Gridsynth にそのままインポートできる単一の ```json コードブロックのみを出力してください。
6. MARKOV モジュールを使用する場合は、複数ノード（2台以上）を相互に transition_out1..4 と transition_in で結線してください。未結線の transition_out に対応する weights 配列の値は必ず 0 に設定し、意図しないシーケンス停止を防いでください。ノードの出力ピッチは rootMidi（例: 48, 51, 55）で指定します。また、ネットワーク内で必ず1台のみ "initOn": true（初期起動）を設定してください。音源のトリガーには trig_out（ワンショット）または gate_out（持続）を使用します。
7. FM モジュールを使用する場合は、3オペレータ（Op1: キャリア, Op2: モジュレータ1, Op3: モジュレータ2）のRatio比、アルゴリズム（1: 直列, 2: 並列変調, 3: 2キャリア分岐, 4: FM+サブ）、および各オペレータの内包ADSR（EXP/LIN/LOG）を活用して、キック、スネア、ハイハット、ディープベース、金属音リードを合成してください。スネアやハットのノイズ成分には Op3 の "wave": "noise" が極めて有効です。
```
