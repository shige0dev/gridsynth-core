# GridSynth AI パッチ仕様書生成ルール (SPEC_GENERATION_RULES v1.0)

本書は、GridSynth の実装コードから正確かつ軽量な AI パッチ生成用仕様書（`GRIDSYNTH_AI_PATCH_SPEC.md`）を抽出・生成するためのルールを定めます。

---

## 0. 絶対原則（ハルシネーション防止）

1. **事実はコードにあるものだけ書く**: 実コードに無い値・ポート名・挙動を推測で補わない。
2. **読み取れない項目は `UNKNOWN` と書く**: 空欄を想像で埋めない。
3. **式（コード）を優先する**: 既存文書の文章と DSP/Audio 実装が食い違う場合は、コードの式を正とする。
4. **後方互換エイリアスの除外**: `src/core/patch.js` / `src/core/utils.js` にのみ互換用として残されている廃止モジュール（`THROUGH`, `CVDELAY`, `TILT`）や旧ポート名（`1shotgate_in`, `keygate_in`, `trans_in`, `trans_out1..3` 等）は、AI が新規生成する仕様には含めない。
5. **単一ファイル完結**: 出力先の `GRIDSYNTH_AI_PATCH_SPEC.md` は 1 本のファイルとして生成し、音用・3D用などに分割しない。

---

## 1. 実コードからの抽出ソース（3層＋ローダー）

抽出対象は必ず以下の実ファイル群を参照する。

| 抽出項目 | 参照ファイル（正） | 読み取り対象 |
|---|---|---|
| **全 `type` 一覧** | `src/modules/registry.js` | `MODULE_REGISTRY` のキー名（大小文字厳守） |
| **ポート定義** | `src/modules/defs/*.js` | `ports(m, ctx)` の `{ in, out }`（`channels` 等による動的生成条件を明記） |
| **既定値** | `src/modules/defs/*.js` | `defaults()` の全キー・初期値 |
| **範囲・選択肢** | `src/modules/defs/*.js`, `src/dsp/processors/*.js` | `renderModal(m)` の `<input min max>`, `<select><option>`, `parameterDescriptors`, クランプ式 |
| **CV/Gate/Reset 挙動** | `src/audio/defs/*.js`, `src/dsp/processors/*.js` | 結線時の式（置換 / 加算 / 乗算）、未結線時挙動、立ち上がり検知・出力幅 |
| **糖衣構文・自動変換** | `src/core/patch.js` | `parsePatch`, `normalizeSubPort`, `resolveSubpatchTemplate` |
| **信号種別・色** | `src/core/signals.js`, `src/core/utils.js` | `SIGNAL_TYPES`, `PORT_ALIASES` |
| **ファクトリー SUB** | `src/presets/subpatches.js` | `FACTORY_SUBPATCHES` のキー名・公開ポート・用途 |

---

## 2. 抽出手順（モジュール単位）

各モジュールについて以下を必ず確認してから圧縮記述へ落とし込む。

1. **type 名**: `MODULE_REGISTRY` 登録名を大小文字そのまま取得する。
2. **ポート**: `ports(m, ctx)` から全入力・全出力を取得し、条件付きポート（例: `channels >= 2`）の条件を明記する。
3. **パラメータ**: `defaults()` のキーと既定値、および `renderModal()` / DSP 側の範囲・enum 全選択肢を取得する（enum は「など」で省略しない）。
4. **CV / トリガー結線時の式**: `audio/defs/` と `dsp/processors/` を確認し、手動パラメータに対する「置換 / 加算 / 乗算」を式で確定する。
5. **ローダー糖衣構文**: `patch.js` による省略記法・音名変換・短縮配列の受理可否を確認する（例: `SEQ.steps` の部分指定、`MATRIX.patterns` の長さ、`DELAY.delayTime` の音価文字列）。

---

## 3. AI 指示用 MD (`GRIDSYNTH_AI_PATCH_SPEC.md`) の構成規約

初動負荷（トークン消費）を抑えつつ生成エラーをゼロにするため、以下の順序・密度で記述する。

1. **`## 0. 出力契約と自己チェック`（冒頭に配置）**
   - 出力形式（単一 `json` コードブロック、コメント・末尾カンマ禁止、解説は求められた場合のみ簡潔に補足）。
   - 生成前チェックリスト（10項目以内）。
2. **`## 1. パッチ構造とローダー仕様`**
   - 最小の完全 JSON 例、グリッド（4列×32行=128スロット）、配置ルール、ID 命名規則、糖衣構文、エラーリカバリ手順。
3. **`## 2. 信号ルールと禁止結線`**
   - 1V/Oct（`0V = C1`, `CV = (MIDI - 24) / 12`）、音名→CV 表、Gate / RESET（微分スパイク立ち上がり検知）/ EOS、映像/3D 専用信号の分離、禁止結線リスト。
4. **`## 3. 全 type 一覧（カテゴリ別）`**
   - `MODULE_REGISTRY` と一致する実数（UI/運用除外対象がある場合は理由を明記）。
5. **`## 4. モジュール辞書（唯一の正）`**
   - ポート重複表は作らず、**1モジュール 1〜2行**の固定フォーマットで記述する：
     `- **TYPE** | IN: ... | OUT: ...`
     `  params... / 結線時挙動式`
   - PIN 番号・UI 装飾・LaTeX 数式は記載しない（カスタム `SUB` / `SUB_IO` および無名物理ピンのみ `PINx_in` / `PINx_out` を記載）。
6. **`## 5. サブパッチ（ファクトリー SUB & カスタム SUB/SUB_IO）`**
   - ファクトリー SUB 一覧表（論理ポート名と物理 PIN 併用ルールを統一記載）。
   - カスタム `SUB` + `SUB_IO` の最小動作 JSON スニペット。
7. **`## 6. 定番回路・ミックス目安・動作確認済みレシピ`**
   - 定番回路の接続スニペット、`SPK.masterVol` やドラム/ベース配分の目安。
   - フル JSON レシピ 1 本 ＋ 接続スニペット（長大な 0 埋め配列などは書かない）。

---

## 4. 出力前セルフチェック

生成した `GRIDSYNTH_AI_PATCH_SPEC.md` について以下を照合する：

- [ ] `MODULE_REGISTRY` の全有効 `type` が漏れなく辞書に載っている（除外がある場合は明記）
- [ ] 全モジュールの `IN` / `OUT` ポート名が `ports()` の実名と一致している
- [ ] `defaults()` の主要パラメータ・enum 全選択肢に省略（「など」「等」）がない
- [ ] CV 結線時の「置換 / 加算 / 乗算」が DSP/Audio コードの式と一致している
- [ ] 廃止ポート名・廃止パラメータ（`SEQ` の `keyMode` / `1shotgate_in`、`MARKOV` の `trans_in` / `trans_out1..3` 等）が新規仕様に残っていない
- [ ] 定番回路・レシピ内の全モジュール `type` とポート名が §4・§5 に実在する
