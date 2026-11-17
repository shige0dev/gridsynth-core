# Gridsynth AI Patch Generation Spec (v3.3 Compact)

Gridsynth = ブラウザ上の 4列×32行モジュラーシンセ＆3Dビジュアライザー。
あなた（AI）は、依頼に応じて **インポート可能な単一 JSON パッチ** を生成する。
※ 本書は [docs/SPEC_GENERATION_RULES.md](docs/SPEC_GENERATION_RULES.md) に基づき、実装コード（`v1.0.0861`）から直接抽出・検証した唯一の正です。

---

## 0. 出力契約と自己チェック（最重要）

**出力**: 単一の `json` コードブロックのみ。コメント（`//`）・末尾カンマ禁止。
（ユーザーが解説を求めた場合のみ、JSON の後に簡潔に補足する）

**出力前チェック**:
1. `slots` は使用スロットのみ。`modules` の全キーと 1 対 1 で一致させる
2. `type` とポート名は §4 に実在する名前のみ（大小文字厳守）。結線は `"送信元ID:出力ポート > 送信先ID:入力ポート"`（OUT→IN）
3. 最終音は `SPK1:wave_in_l` と `SPK1:wave_in_r` の**両方**へ（`SPK1:wave_in` と書いても自動展開される）。`REVERB` 使用時は `wave_out → wave_in_l`、`wave_out_r → wave_in_r`
4. `ADSR`/`AR`/`RF` で VCA を開閉するなら、その VCA は **`"level": 0.0`** を明記する
5. `SEQ8`/`SEQ16` は **`gate_in`** に `CLK:gate_out` を必ず接続。`reset_in` は**未結線＝常時ループ**、**結線＝ワンショット**、**`eos_out > reset_in` 戻し＝ループ**
6. ピッチのスケール量子化は **`KEY`**（`cv_in→cv_out`）。**`SCALE` は 3D 拡大縮小専用**
7. 3D/映像は `obj_out → (ROTATE/MOVE/SCALE/VERTEX/SCATTER) → RENDER → (VFX/VMIX) → DISPLAY` の順。`DISPLAY` 1台なら `"divN": 1`
8. `MIX` は `channels` の数だけ入力ポートが生える（既定 `2`）。3入力なら `"channels": 3`
9. `SPK.masterVol` は `0.15〜0.35` を目安にする（複数音源時は `MIX` でバランス調整）
10. インポートエラーを受け取ったら、エラー文中の「利用可能な端子一覧」で該当箇所だけ直し、**完全な JSON を再出力**する

---

## 1. パッチ構造とローダー仕様

```json
{
  "bpm": 124,
  "pages": {
    "0": {
      "name": "MAIN",
      "slots": { "0": "CLK1", "1": "SEQ8_1", "2": "VCO1", "3": "SPK1" },
      "modules": {
        "CLK1": { "type": "CLK", "div": "x2" },
        "SEQ8_1": { "type": "SEQ8", "steps": [ { "cv": "C2" }, { "cv": "D#2" } ] },
        "VCO1": { "type": "VCO", "wave": "sawtooth" },
        "SPK1": { "type": "SPK", "masterVol": 0.18 }
      },
      "connections": [
        "CLK1:gate_out > SEQ8_1:gate_in",
        "SEQ8_1:cv_out > VCO1:cv_in",
        "VCO1:wave_out > SPK1:wave_in"
      ]
    }
  }
}
```
（上の `SEQ8_1.steps` は 8 個、SEQ16 は 16 個書く。`{ "cv": "C2" }` だけでも `active/cvActive/gate` は `true` 扱いになる）

- **`bpm`**: 40〜260（全ページ共通、既定 120）
- **`pages."0"`**: メインページ。`"1"` 以降は `SUB` が参照するサブパッチ用
- **グリッド**: 4列×32行＝128スロット（`slot = row*4 + col`）。信号の流れ順に左上から配置し、`SPK1` は右端（`"3"` 等）が見やすい
- **ID 命名**: 英数字と `_`。数字で終わる type（`SEQ8`,`SEQ16`,`FMx3`,`MATH1`,`MATH2`,`DIST4`,`SLCT4`,`WAVE3D`）は `SEQ8_1` のように `_` 区切り
- **未指定パラメータ**: 各モジュールの `defaults()` で補完されるため、変更したい値だけ書けばよい
- **糖衣構文**:
  - `SPK1:wave_in` → `wave_in_l` と `wave_in_r` へ自動展開
  - `SEQ8`/`SEQ16` の `steps[].cv` に音名 `"C2"`, `"F#3"` 等を書くと数値 CV へ自動変換
  - `DELAY.delayTime` に `"1/1"`, `"1/2"`, `"1/2D"`, `"1/2T"`, `"1/4"`, `"1/4D"`, `"1/4T"`, `"1/8"`, `"1/8D"`, `"1/8T"`, `"1/16"`, `"1/16D"`, `"1/16T"` を書くと `bpm` から秒数へ変換
  - `OBJECT.shape` の `"box"→"cube"`, `"icosahedron"→"icosa"`, `"octahedron"→"octa"`, `"tetrahedron"→"tetra"`, `"dodecahedron"→"dodeca"` 自動変換
- **検証**: 未知の type・未知のポート・逆方向結線（IN→OUT）はその要素のみ破棄され、`errors` に候補端子一覧を返す

---

## 2. 信号ルールと禁止結線

| 種別 | 規格 | 備考 |
|---|---|---|
| Audio / CV / Gate | 相互接続可（連続電圧）。Audio ±1.0 | 同一入力への複数結線は**加算**。音源の混合は `MIX` 推奨 |
| Pitch CV | **1V/Oct、0V = C1**（C2=1V, C3=2V）。`CV = (MIDI - 24) / 12` | `KEY:cv_out` と `SEQ:cv_out` を同じ `VCO:cv_in` に繋ぐと移調になる |
| Gate | High = 1.0V、検出閾値 > 0.3V | 複数本を同一入力に繋ぐと OR 的に加算 |
| `reset_in` / `eos_out` | 入力は**微分スパイク立ち上がり検知**（`val - prev >= 0.4`） | 複数本差し（例: `KEY:gate_out` + `SEQ:eos_out` の 1V→2V）でも立ち上がりを検知。出力幅は入力クロック長 |
| `obj_*` / `video_*` | 3D/映像専用。音声系とは接続不可 | `obj_in` は複数結線でグループ合成。`video_in` は単一入力で、2系統合成は `VMIX` |

**禁止結線**:
- `LFO:cv_in` / `LFO:gate_in` は存在しない（正: `freq_cv_in`, `reset_in`）
- `CLK:power_in` は存在しない（正: `reset_in`）
- `VCO:fm_in` / `VCO:pwm_in` は存在しない（FM は `FMx3` / `FMCORE` / `FACTORY_SOURCE`）
- `MATRIX:gate_out1` は存在しない（正: `out_1`〜`out_4`）
- 同一モジュールの自己ループのうち、音声・Gate の無限発振（`RF1:gate_out > RF1:gate_in` 等）は不可（※ `SEQ:eos_out > SEQ:reset_in` の自己ループは可）

**音名→CV**（オクターブ N の C = N−1 V に下記を加算）:
`C 0 / C# .0833 / D .1667 / D# .25 / E .3333 / F .4167 / F# .5 / G .5833 / G# .6667 / A .75 / A# .8333 / B .9167`（例: A2 = 1.75, C3 = 2.0）

---

## 3. 全 54 type 一覧

- **音源 (5)**: `VCO` `NOISE` `FMx3`(x小文字) `FMCORE` `WAVE`
- **加工 (2)**: `VCF` `FOLD`
- **アンプ/EG/変調 (7)**: `VCA` `ADSR` `AR` `RF` `LFO` `SH` `LAG`
- **制御 (18)**: `CLK` `SEQ8` `SEQ16` `PAT` `KEY` `COUNT` `MATRIX` `LUT` `CHORD` `MARKOV` `DIST4` `SLCT4` `MATH1` `MATH2` `VALUE` `SWITCH` `PAD` `GSENSOR`
- **MIX/FX/出力/計測 (7)**: `MIX` `DELAY` `REVERB` `SPK` `SCOPE` `LISS` `SPEC`
- **サブパッチ (2)**: `SUB` `SUB_IO`
- **3D/映像 (13)**: `OBJECT` `PATH` `PARTICLE` `WAVE3D` `ROTATE` `MOVE` `SCALE` `VERTEX` `SCATTER` `RENDER` `VFX` `VMIX` `DISPLAY`

> `WAVE`（サンプラー）は音声データを JSON に持てないため生成対象から除外する。

---

## 4. モジュール辞書（唯一の正）

形式: `TYPE | IN | OUT` ／ パラメータ `(範囲/選択肢, 既定)` と結線時の計算式。**ここに無いポート名は使えない。**

### 音源
- **VCO** | IN: `cv_in`, `cv_in2`(ch≥2), `cv_in3`(ch≥3), `cv_in4`(ch=4) | OUT: `wave_out`
  `wave` sawtooth|square|sine|triangle (sawtooth) / `channels` 1〜4 (1) / `quantize` bool (true) / `freq1..4` 40〜2000Hz または MIDI 24〜84のHz (220)
  `cv_in` 結線時: 該当 `freqN` を無視し `32.703 * 2^cv`（1V/Oct、0V=C1）で置換。
- **NOISE** | IN: なし | OUT: `wave_out`
  `noiseType` white|pink|brown (white) / `tone` 200〜16000Hz (8000) / `level` 0〜1 (0.8)
- **FMx3**（各オペに ADSR 内蔵。`VCA`/`ADSR` 不要）| IN: `gate_in`, `cv_in` | OUT: `wave_out`
  `algorithm` 1|2|3 (1:直列, 2:並列, 3:ハイブリッド) / `rootMidi` 24〜72 (48)
  `op1` `{ratio 0.25〜16(1.0), level 0〜1(0.85)}` / `op2` `{ratio 0.25〜16(2.0), level 0〜5(1.5)}` / `op3` `{ratio 0.25〜16(3.5), level 0〜5(1.8), feedback 0〜1(0.0), wave sine|noise(sine)}`
  各 op に `attack`(.0005〜2), `decay`(.005〜3), `sustain`(0〜1), `release`(.005〜5), `aCurve/dCurve/rCurve`(log|lin|exp) 指定可。`cv_in` 結線時: `rootMidi` を無視し 1V/Oct（0V=C1）で置換。`gate_in` 未結線時は連続発音。
- **FMCORE**（連続発振。後段に `VCA`/`FACTORY_LPG` 推奨）| IN: `cv_in`, `mod_in`(Audio PM), `index_cv` | OUT: `wave_out`
  `wave` sine|triangle (sine) / `rootMidi` 24〜72 (48) / `ratio` 0.25〜16 (1.0) / `fine` -50〜50 (0) / `index` 0〜5 (1.0) / `feedback` 0〜1 (0.0) / `level` 0〜1 (0.85)
  `cv_in` 結線時: `rootMidi` を無視（`fine`/`ratio` は維持）。`index_cv` 結線時: `effIndex = index * max(0, index_cv)`（乗算のため `index > 0` が必要）。

### 加工
- **VCF** | IN: `wave_in`, `cv_in` | OUT: `wave_out`
  `filterType` lowpass|highpass|bandpass|notch (lowpass) / `cutoff` 約32.7〜20000Hz (1800) / `q` 0.1〜20 (2.5) / `modDepth` -4800〜4800 cent (1200)
  `cv_in` 結線時: `effCutoff = cutoff * 2^((cv_in * modDepth) / 1200)`（加算変調）。
- **FOLD** | IN: `wave_in`, `gain_cv` | OUT: `wave_out`
  `gain` 0〜8 (1.5) / `mix` 0〜1 (1.0) / `shape` fold|sine|tanh|rectify (fold)
  `gain_cv` 結線時: `effGain = max(0, gain_cv * gain)`（乗算のため `gain > 0` が必要）。

### アンプ / EG / 変調
- **VCA** | IN: `wave_in`, `cv_in` | OUT: `wave_out`
  `level` 0〜1 (1.0) / `cvDepth` 0〜2 (1.0)
  `cv_in` 結線時: `gain = cv_in * cvDepth`（`level` を置換。EG 使用時は `"level": 0.0` を明記）。未結線時: `gain = level`。
- **ADSR** | IN: `gate_in` | OUT: `cv_out`(0〜1)
  `attack` .0005〜2 (.02) / `decay` .005〜3 (.2) / `sustain` 0〜1 (.6) / `release` .005〜5 (.4) / `aCurve,dCurve,rCurve` log|lin|exp (lin)
- **AR** | IN: `gate_in`, `attack_in`, `release_in` | OUT: `cv_out`(0〜1)
  `attack` .005〜2 (.05) / `release` .005〜3 (.2) / `level` 0〜1 (1.0)
  `attack_in` / `release_in` 結線時（0〜1V）: 該当手動値を置換（`0.005 * 400^cv` / `0.005 * 600^cv`）。
- **RF**（1トリガーで Rise→Fall。完了時 `gate_out` に EOC パルス）| IN: `gate_in`, `time_cv`, `peak_cv` | OUT: `gate_out`, `cv_out`
  `time` 0〜2 (.2) / `peak` .01〜.99 (.5) / `level` 0〜1 (1.0)
  `time_cv` / `peak_cv`: `gate_in` 立ち上がり時にサンプルし、該当手動値を置換（`2.0 * min(1, time_cv)^2.5` / `clamp(peak_cv, .01, .99)`）。
- **LFO** | IN: `reset_in`, `freq_cv_in` | OUT: `cv_out`
  `waveType` sine|triangle|sawtooth|ramp|square (sine) / `polarity` bipolar|unipolar (bipolar) / `syncMode` free|sync (free)
  `division` 4/1|2/1|1/1|1/2|1/4|1/8|1/16|1/32|1/4T|1/8T|1/4D|1/8D (1/4) / `period` .01〜120 (.5) / `rate` .001〜200 (2.0) / `depth` 0〜5 (1.0) / `phase` 0〜360 (0) / `duty` .05〜.95 (.5)
  `freq_cv_in`: `free` 時のみ `effRate = baseRate * 2^freq_cv_in`（`sync` 時は無視）。`reset_in`: 微分スパイクで位相リセット。
- **SH** | IN: `cv_in`(未結線＝内部ノイズ), `gate_in` | OUT: `cv_out`
  `polarity` unipolar|bipolar (unipolar) / `glide` 0〜.5 (0.0) / `scale` -3〜3 (1.0)
  `gate_in` 立ち上がりでサンプルし `held * scale` を出力（`cv_in` 結線時は `polarity` 無視）。
- **LAG** | IN: `cv_in`, `time_cv` | OUT: `cv_out`
  `timeMs` 0〜2000 (50) / `cvDepth` 0〜10 (1.0)
  `time_cv` 結線時: `delayMs = clamp(time_cv * 500 * cvDepth, 0, 4999)`（`timeMs` を置換）。

### クロック / シーケンサ / 制御
- **CLK** | IN: `reset_in` | OUT: `gate_out`
  `div` /16|/8|/7|/6|/5|/4|/3|/2|x1|x2|x3|x4|x5|x6|x7|x8|x16 (x2) / `pulseWidthMs` 2〜1500 (15) / `limitPct` 10〜90 (90)
- **SEQ8 / SEQ16** | IN: `gate_in`(**必須**), `reset_in` | OUT: `eos_out`, `gate_out`, `cv_out`
  `quantize` bool (true) / `steps` 8個(SEQ8)または16個(SEQ16)の `{cv, active, cvActive, gate}`（`cv` は 0〜2.0 または音名、他は省略時 `true`）
  `reset_in` 未結線＝常時ループ / 結線＝1周で停止（ワンショット）。`eos_out > reset_in` 戻しでループ。
- **PAT**（`bpm` 同期で自走。クロック不要）| IN: `reset_in`, `1shotgate_in` | OUT: `gate_out`, `cv_out`
  `pattern` 文字列 (既定 16個の `"c2"`) / `cycleBeats` 1|2|4|8|16|32 (4) / `gateLen` .10〜.95 (.8) / `keyMode` loop|oneshot (loop)
  記法: 音名 `c1`〜`c6`(`c#2`,`eb2`), 休符 `~` `-`, 分割 `[a b]`, 交代 `<a b>`, 連打 `a*2`, 伸長 `a@2`, タイ `a^`。`1shotgate_in` 未結線＝常時RUN。
- **KEY**（16鍵盤兼クオンタイザー）| IN: `cv_in` | OUT: `gate_out`, `cv_out`
  `octave` 1〜6 (3) / `root` 0〜11 (0) / `cv` 0〜5 (2.0) / `legato` bool (false)
  `scale` CHROMATIC|MAJOR|MINOR|PENT.MAJ|PENT.MIN|DORIAN|PHRYGIAN|BLUES|HARM.MIN (CHROMATIC)
  `cv_in` 結線時: 入力をスケール音へスナップして `cv_out` へ出力。`gate_out` は鍵盤押下時のみ 1.0V。
- **COUNT** | IN: `gate_in`, `reset_in` | OUT: `cv_out`(=step/max), `carry_out`(1周で15msパルス)
  `max` 1〜1024 (16。よく使う値: 8,16,32,64,128,256)
- **MATRIX**（4トラック・CVスキャン出力）| IN: `cv_in`(0〜1。`COUNT:cv_out` を接続) | OUT: `out_1`, `out_2`, `out_3`, `out_4`
  `divisions` 16|32|64 (16。`COUNT.max` と揃える) / `patterns` 4本の `0`/`1` 配列（先頭 `divisions` 要素で可）
  注意: 出力は選択ステップが `1` の間ずっと `1.0V`（ゲート波形）。短いトリガーが欲しければ後段に `RF` / `ADSR` 等を使う。
- **LUT** | IN: `cv_in` | OUT: `cv_out`
  `divisions` 16|32|64|256 (16) / `quantize` bool (false) / `table` 長さ256の 0〜1 配列
- **CHORD**（単音CV→4声CV）| IN: `cv_in` | OUT: `cv_out1`, `cv_out2`, `cv_out3`, `cv_out4`
  `chord` min|maj|sus4|sus2|m7|7th|Maj7|m7b5|5th|open_min|open_maj|add9|m9|9th|dim7|aug (min) / `rootMidi` 48〜59 (48)
  `cv_in` 結線時は `rootMidi` を無視し入力CV基準で4声を出力。`VCO(channels:4)` の `cv_in`〜`cv_in4` へ接続。
- **MARKOV** | IN: `gate_in`, `reset_in` | OUT: `eos_out1`, `eos_out2`, `eos_out3`, `startgate_out`, `gate_out`, `longgate_out`, `cv_out`
  `initOn` bool (false。最初の1台のみ true) / `quantize` bool (true) / `rootMidi` 24〜84 (36) / `stateVal` 0〜5 (1.0) / `holdClocks` 1〜32 (1) / `weights` `[self, eos1, eos2, eos3]` 各0〜100 (`[10,0,0,0]`)
  `reset_in` の微分スパイクで起動、`holdClocks` 後に確率で自己保持または `eos_out1..3` へバトンを渡す。
- **DIST4** | IN: `cv_in`(未結線=1.0V), `gate_in` | OUT: `cv_out1`, `cv_out2`, `cv_out3`, `cv_out4`
  `steps` 2|3|4 (4) / `mode` up|down|updown|random (up)
- **SLCT4** | IN: `gate_in`, `cv_in1`〜`cv_in4` | OUT: `gate_out`, `cv_out`
  `mode` up|down|updown|random (up)。未結線チャンネルはスキップ、`gate_in` は `gate_out` へスルー。
- **MATH1** | IN: `cv_in_a` | OUT: `cv_out`
  `mode` ABS|FLOOR|CEIL|ROUND|INT|NOT|SIN|COS|TAN (ABS) / `valA` -100〜100 (0.0)。`cv_in_a` 結線時は `valA` を置換。
- **MATH2** | IN: `cv_in_a`, `cv_in_b` | OUT: `cv_out`
  `mode` ADD|DIFF|MULTI|MOD|A^B|MIN|MAX|<|<=|==|>=|>|AND|OR|NAND|NOR|XOR (ADD) / `valA` -100〜100 (0.0) / `valB` -100〜100 (1.0)
  結線された側の手動値のみ入力信号で置換。
- **VALUE** | IN: なし | OUT: `cv_out`
  `label` 文字列 ("VAL") / `val` -100〜100 (0.0) / `min` (-1.0) / `max` (1.0) / `stepType` 0.01|0.1|1semi|1|10 (0.01)
- **SWITCH** | IN: `cv_in` | OUT: `cv_out` ｜ `state` bool (true: 通過 / false: 0V)
- **PAD** | IN: `hue_cv`, `bright_cv` | OUT: `x_cv`, `y_cv`, `gate_out` ｜ `polX,polY` bi|uni (bi) / `hue,sat,bright` 0〜1
- **GSENSOR** | IN: なし | OUT: `x_out`, `y_out`, `z_out` ｜ `smooth` 0〜.95 (0.7)

### MIX / FX / 出力 / 計測
- **MIX** | IN: `wave_in1`, `wave_in2`, `wave_in3`(ch≥3), `wave_in4`(ch=4) | OUT: `wave_out`
  `channels` 2〜4 (2) / `lvl1..4` 0〜1 (1.0) / `mute1..4` bool (false)
- **DELAY** | IN: `wave_in` | OUT: `wave_out`(Dry+Wet)
  `delayTime` .02〜1.5s または音価文字列 (.3) / `feedback` 0〜.95 (.4) / `mix` 0〜1 (.5)
- **REVERB** | IN: `wave_in`, `cv_in`(Wet量) | OUT: `wave_out`(L), `wave_out_r`(R)
  `mode` room|hall|plate|space (space) / `time` .2〜10 (2.8。`decay` ではない) / `damp` 500〜16000 (6500) / `mix` 0〜1 (.45) / `cvDepth` 0〜2 (1.0)
  `cv_in` 結線時: Dry=0.85固定、Wet = `cv_in * cvDepth * 1.4`（`mix` を置換）。
- **SPK** | IN: `wave_in_l`, `wave_in_r` | OUT: なし ｜ `masterVol` 0〜.5 (.12。推奨 .16〜.35)
- **SCOPE** | IN: `cv_in`, `gate_in` | OUT: なし ｜ `timeSpan` .001|.005|.01|.02|.05|.1|.25|.5|1|2|5 (1.0) / `vRange` .5|1|2|5|10|20 (2.0) / `trigMode` free|auto (free)
- **LISS** | IN: `cv_in_x`, `cv_in_y` | OUT: なし ｜ `vRange` .5|1|2|5|10 (2.0)
- **SPEC** | IN: `wave_in` | OUT: なし ｜ `mode` bar|curve (bar)

### 3D / 映像
- **OBJECT** | IN: なし | OUT: `obj_out`
  `shape` torus|cube|plane|sphere|cylinder|cone|tetra|octa|dodeca|icosa (torus) / `detail` low|mid|high (mid) / `material` wire|solid|normal|toon|point|glass (wire) / `color` "#rrggbb" ("#ffffff") / `glow` 0〜3 (0) / `mirror` 0〜1 (0) / `wireWidth` .5〜8 (1.5) / `pointSize` .5〜12 (3.0) / `glassOpacity` .05〜.85 (.25) / `refract` 0〜1 (.5)
- **PATH** | IN: `cv_in` | OUT: `obj_out`
  `shape` line|arc|poly (arc) / `renderMode` line|fill (line) / `points` 2〜64 (32) / `arc` .05〜1 (1.0) / `sides` 2〜16 (6) / `edgeSubdiv` 1〜8 (1) / `material` wire|solid|glass|point (wire) / `glow` 0〜3 / `mirror` 0〜1 / `color` "#ffffff"
  `cv_in` 結線時: `arc`（arc時）または `sides`（poly時）を CV 変調（UI上 CV MOD）。
- **PARTICLE** | IN: `cv_in`, `obj_in`(結線時は頂点発生), `gate_in`(再散布) | OUT: `obj_out`
  `dist` sphere|cube|ring|spiral (sphere) / `count` 1〜2000 (400) / `spread` 0〜4 (1.5) / `pointSize` .5〜12 (3.0) / `speed` 0〜2 (.4) / `cvTarget` spread|size|speed (spread) / `color` "#22d3ee"
- **WAVE3D** | IN: `wave_in`, `cv_in`(Gain) | OUT: `obj_out`
  `sourceMode` wave|spec (wave) / `style` ribbon|point|bars (ribbon) / `slices` 16〜64 (40) / `cols` 24〜96 (64) / `gain` .2〜4 (1.6) / `speed` .2〜2 (1.0) / `glow` 0〜1 (.75) / `color` "#ffffff"
  `cv_in` 結線時: `gain` を CV で置き換え。
- **ROTATE** | IN: `cv_in`, `obj_in` | OUT: `obj_out` ｜ `axis` x|y|z (x) / `angle` 0〜1 (0.0。1.0=360°)。`cv_in` 結線時は `angle` を置換（自走しないため連続回転は `LFO`/`COUNT` を接続）。
- **MOVE** | IN: `cv_in`, `obj_in` | OUT: `obj_out` ｜ `axis` x|y|z (x) / `offset` -5〜5 (0.0)。`cv_in` 結線時は `offset` を置換。
- **SCALE** | IN: `cv_in`, `obj_in` | OUT: `obj_out` ｜ `axis` all|x|y|z (all) / `scale` 0〜4 (1.0)。`cv_in` 結線時は `scale` を置換。
- **VERTEX** | IN: `cv_in`, `obj_in` | OUT: `obj_out` ｜ `mode` wave|spike|twist|wobble|pinch (wave) / `depth` 0〜1 (.35) / `freq` 1〜10 (3.0) / `speed` 0〜3 (1.0)。`cv_in` 結線時は `depth` を置換。
- **SCATTER** | IN: `cv_in`, `base_in`, `child_in` | OUT: `obj_out` ｜ `scale` .05〜1 (.25) / `showBase` bool (true) / `alignNormal` bool (true)。`cv_in` 結線時は `scale` を置換。
- **RENDER** | IN: `fov_in`, `obj_in`(複数可) | OUT: `video_out`
  `camX,camY` -10〜10 (0) / `camZ` 1〜20 (5.0) / `targetX,Y,Z` -5〜5 (0) / `fov` 15〜110 (45) / `camRoll` -180〜180 (0) / `materialOverride` auto|wire|solid|normal|toon|point|glass (auto)
- **VFX** | IN: `cv_in`, `video_in` | OUT: `video_out`
  `mode` bypass|blur|mosaic|invert|crt|rgb|trail (mosaic) / `trailType` peak|fade|diffuse|zoom|drift|prism (peak) / `amount` 0〜1 (.7)。`cv_in` 結線時は `amount` を置換。
- **VMIX** | IN: `cv_in`, `video_in1`, `video_in2` | OUT: `video_out`
  `mode` dissolve|alpha|add|luma|mosaic|blur|glitch|burn|slide_h|slide_v|blackout|whiteout (dissolve) / `mix` 0〜1 (.5)。`cv_in` 結線時は `mix` を置換。
- **DISPLAY** | IN: `video_in` | OUT: `video_out` ｜ `divN` 1|2|3|4 (2)
  1台なら必ず `"divN": 1`。2×2 大画面は 4 台を隣接スロット（例: 10,11,14,15）に置き、左上→右上→左下→右下の順で `video_out > video_in` を繋ぐ。

---

## 5. サブパッチ（ファクトリー SUB & カスタム SUB/SUB_IO）

### 5.1 ファクトリー SUB（`{ "type": "SUB", "subType": "<名前>" }`、1スロット消費）
ポートは下表の論理名を使う（物理ピン `PINn_in` / `PINn_out` も互換受理）。

| `subType` | 入力 | 出力 | 内容 |
|---|---|---|---|
| `FACTORY_VOICE` / `FACTORY_ACID` / `FACTORY_DUAL_VCO` | `cv_in`, `gate_in` | `wave_out` | モノシンセ / 303系アシッドベース / デュアルVCOリード |
| `FACTORY_KICK` / `FACTORY_KICK2` / `FACTORY_SUB_KICK` | `gate_in` | `wave_out` | 808系 / ハードテクノ / 38Hzサブキック |
| `FACTORY_SNARE` / `FACTORY_RIM` / `FACTORY_GHOST_SNARE` / `FACTORY_CLAP` | `gate_in` | `wave_out` | スネア / リム / ゴースト / ハンドクラップ |
| `FACTORY_HIHAT` / `FACTORY_CH_SOFT` / `FACTORY_OPEN_HAT` / `FACTORY_CRASH` | `gate_in` | `wave_out` | クローズHH / ソフトHH / オープンHH / クラッシュ |
| `FACTORY_COWBELL` / `FACTORY_TOM` / `FACTORY_HIGH_TOM` / `FACTORY_PERC` / `FACTORY_PERC2` | `gate_in` | `wave_out` | カウベル / ロータム / ハイタム / 金属パーカッション×2 |
| `FACTORY_SOURCE` | `cv_in`, `mod_cv`, `fold_cv` | `wave_out`, `mod_out` | 西海岸コンプレックスOSC（`FMCORE`×2→`FOLD`） |
| `FACTORY_LPG` | `wave_in`, `cv_in` | `wave_out` | バクトロール風ローパスゲート（`VCF`+`VCA`） |
| `FACTORY_SPACE_FX` | `wave_in` | `wave_out` | `DELAY` + `REVERB` 空間系エフェクト |
| `FACTORY_MAP` | `cv_in` | `cv_out` | CV 線形リマッパー |

### 5.2 カスタム SUB / SUB_IO（最小例）
親ページ `pages."0"` に `"SUB1": {"type":"SUB","targetPage":1}`、子ページ `pages."1"` に `"SUB_IO1": {"type":"SUB_IO"}` を配置する。
結線は物理ピン名（親: IN=`PIN1_in`〜`PIN7_in` / OUT=`PIN8_out`〜`PIN14_out`、子 `SUB_IO`: IN=`PIN8_in`〜`PIN14_in` / OUT=`PIN1_out`〜`PIN7_out`）を使う。

```json
"pages": {
  "0": {
    "slots": { "0": "CLK1", "1": "SUB1", "2": "SPK1" },
    "modules": {
      "CLK1": { "type": "CLK" },
      "SUB1": { "type": "SUB", "targetPage": 1 },
      "SPK1": { "type": "SPK", "masterVol": 0.2 }
    },
    "connections": [ "CLK1:gate_out > SUB1:PIN4_in", "SUB1:PIN10_out > SPK1:wave_in" ]
  },
  "1": {
    "name": "MY_VOICE",
    "slots": { "0": "SUB_IO1", "1": "VCO1", "2": "ADSR1", "3": "VCA1" },
    "modules": {
      "SUB_IO1": { "type": "SUB_IO" },
      "VCO1": { "type": "VCO" },
      "ADSR1": { "type": "ADSR" },
      "VCA1": { "type": "VCA", "level": 0.0 }
    },
    "connections": [
      "SUB_IO1:PIN4_out > ADSR1:gate_in",
      "VCO1:wave_out > VCA1:wave_in",
      "ADSR1:cv_out > VCA1:cv_in",
      "VCA1:wave_out > SUB_IO1:PIN10_in"
    ]
  }
}
```

---

## 6. 定番回路・ミックス目安・動作確認済みレシピ

### 6.1 定番回路スニペット & ミックス目安
- **ランダムメロディ**: `CLK1:gate_out > SH1:gate_in`, `SH1:cv_out > KEY1:cv_in`, `KEY1:cv_out > VCO1:cv_in`, `CLK1:gate_out > ADSR1:gate_in`
- **ポリコード**: `PAT1:cv_out > CHORD1:cv_in`, `CHORD1:cv_out1..4 > VCO1:cv_in/cv_in2/cv_in3/cv_in4` (`VCO1.channels=4`), `PAT1:gate_out > ADSR1:gate_in`, `VCO1 > VCF1 > VCA1(level:0)`
- **西海岸**: `SEQ8_1:cv_out > SUB_SRC:cv_in`, `SUB_SRC:wave_out > SUB_LPG:wave_in`, `RF1:cv_out > SUB_LPG:cv_in`, `SUB_LPG:wave_out > REVERB1:wave_in`
- **ミックス目安**: `SPK.masterVol = 0.16〜0.30`。ドラム＋ベース混在時は `MIX` で `KICK: 0.90`, `SNARE/CLAP: 0.70`, `HAT: 0.45〜0.55`, `BASS/LEAD: 0.65〜0.80` 程度に配分。

### 6.2 動作確認済みレシピ（SEQ8 シンセ + SPACE リバーブ + WAVE3D）
```json
{
  "bpm": 122,
  "pages": {
    "0": {
      "name": "Wave3D_Space_Synth",
      "slots": {
        "0": "CLK1", "1": "SEQ8_1", "2": "VCO1", "3": "SPK1",
        "4": "VCF1", "5": "ADSR1", "6": "VCA1", "7": "REVERB1",
        "8": "WAVE3D_1", "9": "RENDER1", "10": "VFX1", "11": "DISPLAY1"
      },
      "modules": {
        "CLK1": { "type": "CLK", "div": "x4", "pulseWidthMs": 15, "limitPct": 90 },
        "SEQ8_1": {
          "type": "SEQ8", "quantize": true,
          "steps": [
            { "cv": "C2" }, { "cv": "D#2" }, { "cv": "G2" }, { "cv": "C3" },
            { "cv": "A#2" }, { "cv": "G2" }, { "cv": "D#2" }, { "cv": "G2" }
          ]
        },
        "VCO1": { "type": "VCO", "wave": "sawtooth", "channels": 1 },
        "VCF1": { "type": "VCF", "filterType": "lowpass", "cutoff": 900, "q": 5.0, "modDepth": 2400 },
        "ADSR1": { "type": "ADSR", "attack": 0.005, "decay": 0.18, "sustain": 0.25, "release": 0.25 },
        "VCA1": { "type": "VCA", "level": 0.0, "cvDepth": 1.0 },
        "REVERB1": { "type": "REVERB", "mode": "space", "time": 3.8, "damp": 7500, "mix": 0.42 },
        "SPK1": { "type": "SPK", "masterVol": 0.18 },
        "WAVE3D_1": { "type": "WAVE3D", "sourceMode": "spec", "style": "ribbon", "slices": 44, "cols": 64, "gain": 2.2, "glow": 0.85, "color": "#38bdf8" },
        "RENDER1": { "type": "RENDER", "camX": 0.0, "camY": 2.1, "camZ": 6.2, "targetY": -0.2, "fov": 45 },
        "VFX1": { "type": "VFX", "mode": "rgb", "trailType": "fade", "amount": 0.25 },
        "DISPLAY1": { "type": "DISPLAY", "divN": 1 }
      },
      "connections": [
        "CLK1:gate_out > SEQ8_1:gate_in",
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
        "VFX1:video_out > DISPLAY1:video_in"
      ]
    }
  }
}
```

### 6.3 ドラム + アシッドベース（接続スニペット）
`MATRIX1.patterns` は `divisions: 16` 分（各配列 16 要素）で動作する（トリガー化が必要な場合は `RF` 等を経由する）。
```json
"COUNT1": { "type": "COUNT", "max": 16 },
"MATRIX1": {
  "type": "MATRIX", "divisions": 16,
  "patterns": [
    [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0],
    [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
    [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0],
    [0,0,1,0, 0,0,1,0, 0,0,1,0, 0,0,1,0]
  ]
},
"PAT1": { "type": "PAT", "pattern": "c2 c2 [eb2 c3] c2 <f2 g2> c2 [bb1 g2] ~", "cycleBeats": 4, "gateLen": 0.55 },
"SUB_KICK": { "type": "SUB", "subType": "FACTORY_KICK2" },
"SUB_SNARE": { "type": "SUB", "subType": "FACTORY_SNARE" },
"SUB_HAT": { "type": "SUB", "subType": "FACTORY_HIHAT" },
"SUB_ACID": { "type": "SUB", "subType": "FACTORY_ACID" },
"MIX_DRUM": { "type": "MIX", "channels": 3, "lvl1": 0.9, "lvl2": 0.7, "lvl3": 0.5 },
"MIX_MASTER": { "type": "MIX", "channels": 2, "lvl1": 0.85, "lvl2": 0.75 }
```
```json
"connections": [
  "CLK1:gate_out > COUNT1:gate_in",
  "COUNT1:cv_out > MATRIX1:cv_in",
  "COUNT1:carry_out > PAT1:reset_in",
  "MATRIX1:out_1 > SUB_KICK:gate_in",
  "MATRIX1:out_2 > SUB_SNARE:gate_in",
  "MATRIX1:out_3 > SUB_HAT:gate_in",
  "SUB_KICK:wave_out > MIX_DRUM:wave_in1",
  "SUB_SNARE:wave_out > MIX_DRUM:wave_in2",
  "SUB_HAT:wave_out > MIX_DRUM:wave_in3",
  "PAT1:cv_out > SUB_ACID:cv_in",
  "PAT1:gate_out > SUB_ACID:gate_in",
  "MIX_DRUM:wave_out > MIX_MASTER:wave_in1",
  "SUB_ACID:wave_out > MIX_MASTER:wave_in2",
  "MIX_MASTER:wave_out > SPK1:wave_in"
]
```
