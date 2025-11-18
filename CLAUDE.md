# CLAUDE.md - FP3級学習サイト 開発者ドキュメント

このドキュメントは、AI開発者（Claude）がこのプロジェクトを理解し、適切に保守・拡張するための技術詳細を記録したものです。

## プロジェクト概要

**プロジェクト名**: FP3級学習サイト 2025
**目的**: ファイナンシャルプランナー3級試験の学習支援
**開発期間**: 2025年11月
**技術スタック**: Vanilla JavaScript, HTML5, CSS3

## アーキテクチャ

### ファイル構成

```
fp3/
├── index.html          # メインHTML（構造定義）
├── styles.css          # スタイルシート（デザイン・アニメーション）
├── script.js           # アプリケーションロジック（QuizAppクラス）
├── questions.js        # 問題データベース（180問）
├── README.md          # ユーザー向けドキュメント
└── CLAUDE.md          # このファイル（開発者向け）
```

### クラス設計

#### QuizApp クラス (script.js)

**責務**: クイズアプリケーション全体の状態管理とUI制御

**主要プロパティ**:
```javascript
{
    currentCategory: null,           // 現在選択されているカテゴリー
    currentQuestions: [],            // 現在のカテゴリーの問題（シャッフル済み）
    currentQuestionIndex: 0,         // 現在の問題インデックス
    correctCount: 0,                 // 正解数
    userAnswers: [],                 // ユーザーの回答記録
    favorites: [],                   // お気に入り問題ID配列
    showOnlyFavorites: false,        // お気に入りのみ表示フラグ
    progress: {},                    // 学習進捗管理（問題ごとの正解/不正解履歴）

    // 本試験モード用プロパティ
    examMode: false,                 // 本試験モードフラグ
    examTimeRemaining: 3600,         // 残り時間（秒）60分 = 3600秒
    examTimer: null,                 // タイマーのinterval ID
    examStartTime: null              // 試験開始時刻
}
```

**主要メソッド**:

1. **init()** (script.js:25-107)
   - カテゴリーボタンのイベントリスナー設定
   - コントロールボタンのイベントリスナー設定
   - お気に入り/苦手/未解答カウンターのイベント設定
   - 本試験モードボタンのイベントリスナー設定
   - 本試験確認モーダルのボタン設定
   - 試験終了ボタンのイベントリスナー設定
   - キーボードナビゲーション対応（Enter/Space）
   - キーボードショートカットのリスナー設定
   - 初回訪問時のキーボードヒント表示

2. **shuffleArray(array)** (script.js:87-95)
   - Fisher-Yatesアルゴリズムによる配列シャッフル
   - 問題のランダム表示に使用

3. **loadCategory(category)** (script.js:97-125)
   - カテゴリー選択時の処理
   - 問題をシャッフルして読み込み
   - UI初期化
   - トースト通知の表示

4. **loadFavoritesOnly()** (script.js:127-181)
   - お気に入り問題のみを表示
   - 全カテゴリーからお気に入りを抽出
   - ランダム出題

5. **loadWeakQuestionsOnly()** (script.js:183-230)
   - 苦手問題（正解率50%未満）のみを表示
   - 全カテゴリーから抽出
   - トースト通知で問題数を表示

6. **loadUnansweredQuestionsOnly()** (script.js:232-278)
   - 未解答問題（totalAttempts===0）のみを表示
   - 全カテゴリーから抽出
   - トースト通知で問題数を表示

7. **displayQuestion()** (script.js:280-447)
   - 問題表示の中核メソッド
   - フィードバックバナー、お気に入りボタン、選択肢を動的生成
   - 習熟度バッジの表示
   - イベントリスナーの設定

8. **selectAnswer(answerIndex)** (script.js:449-480)
   - 回答選択時の処理
   - 重複回答防止
   - 正解判定と正解数更新
   - 学習進捗の記録
   - カウンター更新
   - **重要**: 自動遷移は無効化されている

9. **toggleFavorite(category, questionId)** (script.js:625-642)
   - お気に入りの追加/削除
   - トースト通知の表示
   - localStorageへの保存
   - UI更新

10. **updateButtons()** (script.js:507-542)
    - ナビゲーションボタンの状態管理
    - 未回答時は「次の問題」ボタンを無効化
    - 最後の問題では「結果を見る」に変更

### 学習進捗管理メソッド

11. **loadProgressFromStorage()** (script.js:723-733)
    - localStorageから学習進捗を読み込み
    - キー: 'fp3-progress'

12. **saveProgressToStorage()** (script.js:738-744)
    - localStorageに学習進捗を保存
    - JSON形式で永続化

13. **recordProgress(category, questionId, isCorrect)** (script.js:752-776)
    - 問題の解答履歴を記録
    - 正解/不正解回数を更新
    - 総解答回数をカウント
    - 最終解答日時を記録

14. **getQuestionProgress(category, questionId)** (script.js:784-792)
    - 特定の問題の進捗データを取得
    - 返り値: {correct, incorrect, totalAttempts, lastAttempt}

15. **getQuestionAccuracy(category, questionId)** (script.js:800-806)
    - 問題の正解率を計算（0-100%）
    - 未解答の場合は0%を返す

16. **getCategoryStats(category)** (script.js:813-845)
    - カテゴリー全体の統計を計算
    - 解答済み問題数、正解率、総解答回数など

17. **getOverallStats()** (script.js:850-876)
    - 全体統計を計算
    - 全カテゴリーの集計データを返す

18. **showStatsPage()** (script.js:881-888)
    - 学習統計ダッシュボードを表示
    - クイズセクションを非表示に

19. **updateStatsDisplay()** (script.js:893-983)
    - 統計データを画面に表示
    - 全体統計とカテゴリー別統計を動的生成

20. **hideStatsPage()** (script.js:988-992)
    - 統計ページを非表示
    - カテゴリー選択画面に戻る

### キーボードショートカット機能

21. **handleKeyboardShortcut(e)** (script.js:1002-1101)
    - すべてのキーボードショートカットを処理
    - 入力欄フォーカス時は無効化
    - 問題状態に応じた条件分岐
    - サポートされるショートカット:
      - `1-4`: 選択肢を選択
      - `→/←`: 次/前の問題へ移動
      - `R`: リセット
      - `F`: お気に入り追加/削除
      - `S`: 学習統計を表示
      - `W`: 苦手問題を表示
      - `U`: 未解答問題を表示
      - `?`: ショートカットヘルプを表示
      - `Esc`: モーダルを閉じる

22. **showShortcutsModal()** (script.js:1106-1111)
    - キーボードショートカットのヘルプモーダルを表示

23. **hideShortcutsModal()** (script.js:1116-1121)
    - キーボードショートカットのヘルプモーダルを非表示

### UI/UX改善機能

24. **showToast(message, type, duration)** (script.js:1131-1164)
    - トースト通知を表示
    - タイプ: success, error, info, warning
    - アイコン付き
    - 自動フェードアウト

25. **showKeyboardHint()** (script.js:1169-1195)
    - 初回訪問時にキーボードヒントを表示
    - localStorageで表示状態を記録
    - 2秒後に表示、8秒後に自動消去

26. **createProgressBar(current, total, container)** (script.js:1203-1221)
    - プログレスバーを作成・更新
    - ARIA属性付き
    - シマーアニメーション対応

### 本試験モード機能

27. **showExamConfirmModal()** (script.js:1227-1232)
    - 本試験モード確認モーダルを表示
    - 試験形式と注意事項を表示

28. **hideExamConfirmModal()** (script.js:1237-1242)
    - 本試験モード確認モーダルを非表示

29. **startExamMode()** (script.js:1247-1306)
    - 本試験モードを開始
    - 全180問からランダムに60問を選出
    - タイマーを初期化（60分 = 3600秒）
    - カテゴリーセクションを非表示
    - リセットボタンを非表示、試験終了ボタンを表示
    - タイマーを開始（1秒ごとにupdateExamTimer()を呼び出し）

30. **updateExamTimer()** (script.js:1311-1332)
    - 試験タイマーを更新（1秒ごとに呼ばれる）
    - 残り時間を表示
    - 残り5分を切ったら赤色で警告＋パルスアニメーション
    - 時間切れ時に自動採点

31. **formatTime(seconds)** (script.js:1339-1343)
    - 秒数をMM:SS形式に変換
    - タイマー表示に使用

32. **endExamMode(autoEnd)** (script.js:1349-1371)
    - 試験モードを終了（採点）
    - 未解答問題がある場合は確認ダイアログを表示
    - タイマーを停止
    - 試験結果を表示

33. **showExamResults()** (script.js:1376-1531)
    - 試験結果を表示（本試験モード専用）
    - 合格判定（36問以上正解で合格）
    - 正答率、所要時間の表示
    - 不正解・未解答問題のリスト表示
    - 合格・不合格に応じたメッセージ表示

## 重要な設計決定

### 1. 自動遷移の無効化

**理由**: ユーザーが解説をじっくり読めるように
**実装**: selectAnswer()メソッドでsetTimeoutを使用しない
**制約**: ユーザーは必ず「次の問題」ボタンをクリックする必要がある

**コード位置**: script.js:185-196

```javascript
selectAnswer(answerIndex) {
    // 既に回答済みの場合は何もしない
    if (this.userAnswers[this.currentQuestionIndex] !== null) {
        return;
    }

    // 回答を記録
    this.userAnswers[this.currentQuestionIndex] = answerIndex;

    // 正解かどうかチェック
    const question = this.currentQuestions[this.currentQuestionIndex];
    if (answerIndex === question.correctAnswer) {
        this.correctCount++;
        document.getElementById('correct-count').textContent = this.correctCount;
    }

    // 問題を再表示（解説とフィードバックを表示）
    this.displayQuestion();

    // 自動遷移は無効化（ユーザーが手動で次へボタンを押す）
    // 解説をじっくり読んでから次に進めるようにする
}
```

### 2. お気に入り機能の実装

**目的**: 重要な問題や復習したい問題を保存
**ストレージ**: localStorage（キー: 'fp3-favorites'）
**データ形式**: `["category-questionId", ...]`

**イベント処理**:
- onclick属性ではなくaddEventListenerを使用（セキュリティとメンテナンス性）
- data-category、data-question-id属性でデータを渡す

**コード位置**: script.js:171-180, 350-395

### 3. 学習進捗管理システム

**目的**: 問題ごとの正解/不正解履歴を記録し、学習効率を向上させる
**ストレージ**: localStorage（キー: 'fp3-progress'）
**データ形式**:
```javascript
{
  "category-questionId": {
    correct: 2,          // 正解回数
    incorrect: 1,        // 不正解回数
    totalAttempts: 3,    // 総解答回数
    lastAttempt: "2025-11-18T12:34:56.789Z"  // 最終解答日時（ISO 8601形式）
  }
}
```

**主要機能**:

1. **問題ごとの学習履歴記録**
   - 回答時に自動的に正解/不正解を記録
   - 累積データをlocalStorageに永続化
   - 問題を解く度に統計が更新される

2. **習熟度バッジ表示**
   - 各問題に習熟度を色分けして表示
   - 🟢 得意（80%以上）: 緑色
   - 🟡 普通（50-80%）: 黄色
   - 🔴 苦手（50%未満）: 赤色
   - ⚪ 未解答: バッジなし
   - 正解回数/総解答回数も表示

3. **学習統計ダッシュボード**
   - 📊ボタンから統計ページにアクセス
   - 全体統計: 総合正解率、解答済み問題数、総解答回数
   - カテゴリー別統計: 各カテゴリーの詳細データ
   - 進捗バー: 視覚的な学習進捗表示

**実装の詳細**:

- **記録タイミング**: selectAnswer()メソッド内で自動記録（script.js:291-293）
- **統計計算**: getQuestionAccuracy()で正解率を計算
- **バッジ表示**: displayQuestion()内で動的生成（script.js:187-217）
- **ダッシュボード**: updateStatsDisplay()で統計カードを生成

**設計の利点**:
- 問題IDベースでデータ管理（カテゴリー変更に対応）
- JSONフォーマットで人間可読
- try-catchでエラーハンドリング
- 既存機能と独立して動作

### 4. 苦手問題・未解答問題フィルタリング機能

**目的**: 学習効率の最大化
**実装**:
- **苦手問題**: 正解率50%未満の問題を抽出
- **未解答問題**: 一度も解答していない問題を抽出

**データ構造**:
```javascript
// 苦手問題の判定
if (progress.totalAttempts > 0 && accuracy < 50) {
    // 苦手問題としてマーク
}

// 未解答問題の判定
if (progress.totalAttempts === 0) {
    // 未解答問題としてマーク
}
```

**UI要素**:
- 🔴 苦手カウンター: 赤色グラデーション、クリックで苦手問題のみ表示
- 📝 未解答カウンター: 青色グラデーション、クリックで未解答問題のみ表示
- リアルタイム更新: 問題に回答する度にカウンターが自動更新

**主要メソッド**:
- `loadWeakQuestionsOnly()` (script.js:183-230)
- `loadUnansweredQuestionsOnly()` (script.js:232-278)
- `updateWeakQuestionsCount()` (script.js:649-662)
- `updateUnansweredQuestionsCount()` (script.js:667-680)

### 5. キーボードショートカット機能

**目的**: キーボードのみで完全に操作可能なアクセシビリティ
**実装**: script.js:1002-1121

**サポートされるショートカット**:

| キー | 機能 | 条件 |
|------|------|------|
| `1-4` | 選択肢を選択 | 問題表示中、未回答時のみ |
| `→` | 次の問題へ | 問題表示中、回答済みの場合のみ |
| `←` | 前の問題へ | 問題表示中、最初の問題以外 |
| `R` | リセット | 通常カテゴリーのみ（確認ダイアログ付き） |
| `F` | お気に入り追加/削除 | 問題表示中 |
| `S` | 学習統計を表示 | 常時 |
| `W` | 苦手問題を表示 | 常時 |
| `U` | 未解答問題を表示 | 常時 |
| `?` | ショートカットヘルプを表示 | 常時 |
| `Esc` | モーダルを閉じる | モーダル表示中 |

**安全機能**:
- 入力欄（INPUT/TEXTAREA）にフォーカスがある場合は無効化
- `e.preventDefault()`でブラウザのデフォルト動作を抑制
- 問題状態に応じた条件分岐

**ヘルプモーダル**:
- `?`キーまたはボタンクリックで表示
- ARIA属性付き（role="dialog", aria-modal="true"）
- Escキーで閉じる

### 6. アクセシビリティ機能

**WCAG 2.1 AAレベル対応**:

**キーボードナビゲーション**:
- すべてのインタラクティブ要素がキーボードでアクセス可能
- Enter/Spaceキーでカウンターをアクティブ化
- Tabキーでフォーカス移動
- フォーカス状態の視覚化（focus-visible）

**ARIA属性**:
```html
<!-- カウンター -->
<div role="button" tabindex="0" aria-label="お気に入り問題を表示">
  ★ お気に入り: <span aria-live="polite">5</span>問
</div>

<!-- ナビゲーション -->
<div role="navigation" aria-label="問題ナビゲーション">
  <button aria-label="前の問題に戻る">前の問題</button>
  <button aria-label="次の問題へ進む">次の問題</button>
</div>

<!-- モーダル -->
<div role="dialog" aria-modal="true" aria-labelledby="shortcuts-modal-title">
  <h2 id="shortcuts-modal-title">キーボードショートカット</h2>
</div>
```

**視覚的フィードバック**:
- フォーカスリング: 3px solid #667eea + ボックスシャドウ
- ホバー状態: transform + box-shadow
- アクティブ状態: scale(0.97)

**リデュースモーション対応**:
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

**ハイコントラストモード対応**:
```css
@media (prefers-contrast: high) {
  *:focus-visible {
    outline-width: 4px;
    outline-color: currentColor;
  }
}
```

### 7. UI/UX改善機能

#### トースト通知システム (script.js:1131-1164)

**特徴**:
- 4種類のタイプ（success, error, info, warning）
- アイコン付き（✅, ❌, ℹ️, ⚠️）
- 自動フェードアウト（デフォルト3秒）
- スライドインアニメーション
- 重複防止（既存のトーストを自動削除）

**使用例**:
```javascript
this.showToast('お気に入りに追加しました ⭐', 'success', 2000);
this.showToast('苦手問題 15問を読み込みました', 'warning', 3000);
```

#### キーボードヒント (script.js:1169-1195)

**機能**:
- 初回訪問時のみ表示（localStorageで記録）
- 2秒後に自動表示、8秒後に自動消去
- 「💡 ヒント: ? キーでショートカット一覧を表示」
- スライドインアニメーション

#### プログレスバー (script.js:1203-1221)

**機能**:
- 動的生成・更新
- ARIA属性付き（progressbar role）
- シマーアニメーション
- スムーズなトランジション（cubic-bezier）

#### その他のUI改善

**カスタムスクロールバー** (styles.css:1113-1131):
- グラデーション背景
- ホバー時の色変化

**カスタムセレクションカラー** (styles.css:1133-1141):
- 紫色のハイライト（rgba(102, 126, 234, 0.3)）

**ツールチップ** (styles.css:790-831):
- data-tooltip属性で自動表示
- ホバー時にフェードイン
- 矢印付き

**モーダルの改善** (styles.css:1144-1151):
- バックドロップぼかし効果（backdrop-filter）
- fadeInUpアニメーション

### 8. Fisher-Yatesシャッフル

**理由**: 真にランダムな出題順序を実現
**実装**: script.js:87-95
**適用タイミング**: カテゴリー読み込み時、リセット時

### 9. 本試験モード

**目的**: 本番試験と同じ形式でテストを実施し、実力を測定
**実装**: script.js:1222-1531

**主要機能**:

1. **60問・60分間のテスト形式**
   - 全180問からランダムに60問を選出（Fisher-Yatesシャッフル）
   - 制限時間: 60分（3600秒）
   - 合格基準: 36問以上正解（60%以上）

2. **タイマー機能**
   - 1秒ごとにカウントダウン（setInterval）
   - MM:SS形式で表示（formatTime()）
   - 残り5分を切ったら赤色警告＋パルスアニメーション
   - 時間切れで自動採点（3秒後にendExamMode(true)を呼び出し）

3. **試験中の制約**
   - お気に入りボタン非表示（displayQuestion()で条件分岐）
   - 進捗バッジ非表示（試験モード時は学習データを表示しない）
   - 学習進捗を記録しない（selectAnswer()で条件分岐）
   - リセットボタン非表示（途中リセット不可）
   - キーボードショートカット制限（R/F/S/W/Uキーを無効化）

4. **試験終了処理**
   - 手動終了: 「試験を終了」ボタン（未解答確認ダイアログ付き）
   - 自動終了: 時間切れ時（トースト通知→3秒後に採点）
   - タイマー停止: clearInterval(this.examTimer)

5. **結果表示（showExamResults()）**
   - 合格判定: correctCount >= 36で合格
   - 詳細判定:
     - 90%以上: 「優秀！満点に近い成績です！」
     - 80-90%: 「合格！素晴らしい成績です！」
     - 60-80%: 「合格！よく頑張りました！」
     - 50-60%: 「不合格 - あと少しです！」
     - 50%未満: 「不合格 - 基礎から復習しましょう」
   - 表示内容:
     - 正答数/60問
     - 正答率（%）
     - 所要時間（MM:SS）
     - 合格/不合格バッジ
     - 不正解・未解答問題の番号リスト
     - ※試験結果は学習統計に記録されない

**データフロー**:
```
ユーザー操作: 「本試験を開始」ボタンクリック
    ↓
showExamConfirmModal() - 確認モーダル表示
    ↓
ユーザー操作: 「開始する」ボタンクリック
    ↓
startExamMode() - 試験開始
    ├─ 全180問からランダム60問選出
    ├─ examMode = true 設定
    ├─ タイマー開始（setInterval）
    └─ displayQuestion() - 最初の問題表示
    ↓
問題解答ループ（60問）
    ├─ selectAnswer() - 試験モード時は進捗記録なし
    └─ displayQuestion() - お気に入りボタン・進捗バッジ非表示
    ↓
終了トリガー:
    ├─ 手動: endExamBtn クリック → endExamMode(false)
    └─ 自動: 時間切れ → endExamMode(true)
    ↓
showExamResults() - 結果表示
    ├─ 合格判定
    ├─ 正答率計算
    ├─ 所要時間計算
    └─ 「トップに戻る」ボタン表示
```

**セキュリティ・整合性**:
- 試験モード中はlocalStorageへの書き込みなし
- タイマーは確実にclearInterval()で停止
- 試験結果は学習統計に影響しない（データ汚染防止）

## データ構造

### 問題データ (questions.js)

```javascript
const questionsData = {
    "category-key": {
        title: "カテゴリー名",
        questions: [
            {
                id: 1,                      // 問題ID（カテゴリー内で一意）
                question: "問題文",
                options: ["選択肢1", "選択肢2", "選択肢3", "選択肢4"],
                correctAnswer: 0,           // 正解のインデックス（0-3）
                explanation: "解説文"
            }
        ]
    }
}
```

### カテゴリー一覧

1. `life-planning`: ライフプランニングと資金計画
2. `risk-management`: リスク管理
3. `financial-assets`: 金融資産運用
4. `tax`: タックスプランニング
5. `real-estate`: 不動産
6. `inheritance`: 相続・事業承継

各カテゴリー: 30問 × 6カテゴリー = **合計180問**

## CSSアニメーション

### 主要アニメーション

1. **fadeIn** (styles.css)
   - 問題表示時のフェードイン
   - `opacity: 0 → 1`, `translateY(20px) → 0`

2. **fadeInUp** (styles.css:1083-1092)
   - モーダル表示時のアニメーション
   - `opacity: 0 → 1`, `translateY(30px) → 0`
   - cubic-bezierイージング

3. **correctPulse** (styles.css)
   - 正解時の選択肢のパルス
   - `scale(1) → 1.03 → 1`

4. **incorrectShake** (styles.css)
   - 不正解時の選択肢のシェイク
   - `translateX: 0 → -10px → 10px → 0`

5. **favoritePulse** (styles.css)
   - お気に入りボタンの常時パルス
   - 2秒周期、ease-in-out

6. **favoriteGlow** (styles.css)
   - お気に入りボタンクリック時のグロー

7. **counterPulse** (styles.css)
   - カウンターのパルス

8. **slideInRight** (styles.css:861-870)
   - トースト通知・ヒントのスライドイン
   - `translateX(100%) → 0`, `opacity: 0 → 1`

9. **spin** (styles.css:884-888)
   - ローディングスピナー
   - 0.8秒で360度回転

10. **shimmer** (styles.css:926-933)
    - プログレスバーのシマーエフェクト
    - グラデーションが左から右へ移動

11. **pulse** (styles.css:1099-1106)
    - 汎用パルスアニメーション
    - `opacity: 1 → 0.7 → 1`

12. **loading** (styles.css:1038-1045)
    - スケルトンローディング
    - 背景グラデーションが移動

13. **examButtonPulse** (styles.css:1236-1245)
    - 本試験モード開始ボタンのパルスアニメーション
    - `transform: scale(1) → scale(1.05) → scale(1)`
    - `box-shadow`も連動して変化
    - 2秒周期、ease-in-out

## 既存機能の保護

以下の機能は**絶対に壊してはならない**コア機能です：

1. **手動ナビゲーション**: 自動遷移は無効のまま維持
2. **ランダム表示**: Fisher-Yatesシャッフルを維持
3. **回答後のボタン制御**: 未回答時は「次の問題」ボタンを無効化
4. **正解/不正解のフィードバック**: 視覚的フィードバックを維持
5. **お気に入り機能**: localStorage連携を維持
6. **学習進捗管理**: 履歴データの整合性を維持、localStorageの独立管理
7. **苦手問題フィルタリング**: 正解率50%未満の判定ロジック
8. **未解答問題フィルタリング**: totalAttempts===0の判定ロジック
9. **キーボードショートカット**: 入力欄フォーカス時の無効化
10. **アクセシビリティ**: ARIA属性、キーボードナビゲーション
11. **トースト通知**: 重複防止、自動フェードアウト
12. **パフォーマンス最適化**: will-change、GPU アクセラレーション
13. **本試験モード**: 既存機能への影響なし、学習統計への記録なし、タイマーの確実な停止

## 開発時の注意事項

### コーディング規約

1. **イベントハンドラー**
   - inline onclick属性は使用しない
   - addEventListener()を使用する
   - data-*属性でデータを渡す

2. **HTML生成**
   - テンプレートリテラル（バッククォート）を使用
   - XSS対策: ユーザー入力は適切にエスケープ

3. **状態管理**
   - QuizAppクラスのプロパティで一元管理
   - グローバル変数は最小限（quizAppのみ）

### パフォーマンス考慮事項

1. **イベントリスナーの管理**
   - displayQuestion()で毎回新しいリスナーを設定
   - innerHTML更新時に古いリスナーは自動削除される

2. **localStorage使用**
   - お気に入り: saveFavoritesToStorage() / loadFavoritesFromStorage()
   - 学習進捗: saveProgressToStorage() / loadProgressFromStorage()
   - JSON.stringify() / JSON.parse()を使用
   - try-catchでエラーハンドリング
   - キー分離: 'fp3-favorites', 'fp3-progress', 'fp3-keyboard-hint-shown'

3. **パフォーマンス最適化**
   - will-changeプロパティの使用（transform, width）
   - GPU アクセラレーション（transform, opacity）
   - cubic-bezierイージング関数
   - アニメーションの最適化（60FPS維持）

## 未実装機能（将来の拡張）

### 試験モード

**実装案**:
- タイマー機能追加
- 全問連続出題
- 途中保存不可

## トラブルシューティング

### お気に入りボタンが動作しない

**原因**: イベントリスナーの設定漏れ
**確認箇所**: script.js:171-180
**修正履歴**: コミット 178dabb で修正済み

### 自動遷移してしまう

**原因**: selectAnswer()にsetTimeoutが追加されている
**確認箇所**: script.js:185-196
**対処**: setTimeoutを削除

### localStorageが保存されない

**原因**: プライベートブラウジング、ストレージ容量超過
**確認**: ブラウザのコンソールでエラーを確認
**対処**: try-catchでエラーハンドリング済み

## Git履歴

### 主要なコミット

1. **初期実装**: 基本的なクイズ機能
2. **UI/UX改善**: 視覚的フィードバックの強化
3. **ランダム表示**: Fisher-Yatesシャッフル実装
4. **手動ナビゲーション**: 自動遷移の無効化
5. **お気に入り機能**: 初期実装（コミット 0931023）
6. **イベント処理修正**: onclick→addEventListenerに変更（コミット 178dabb）
7. **UI大幅改善**: お気に入りボタンを目立たせる（コミット 0a1e3f1）
8. **CLAUDE.mdとREADME.mdを作成・更新**（コミット 2e57368）
9. **スマートフォン向けレスポンシブデザインを大幅に改善**（コミット 57ef873）
10. **問題数を大幅に拡張（72問→180問）**（コミット 3b90143）
    - 各カテゴリーを12問から30問に拡張
    - 合計108問の新規追加
11. **お気に入り問題の表示機能を追加**（コミット 247cad3）
    - お気に入りカウンターをクリックでお気に入り問題のみを表示
    - 全カテゴリーから抽出・ランダム出題
12. **学習進捗管理機能を実装（正解/不正解履歴）**（コミット 3a1d7b4）
    - 問題ごとの学習履歴を記録
    - 習熟度バッジの表示
    - 学習統計ダッシュボードの実装
13. **TOP 3優先機能を実装**（コミット 411bd13） - 2025年11月18日
    - 苦手問題フィルタリング機能（正解率50%未満）
    - 未解答問題フィルタリング機能（totalAttempts===0）
    - キーボードショートカット機能（10種類のショートカット）
    - ショートカットヘルプモーダル
    - リアルタイムカウンター更新
14. **UI/UXを最大化する大規模改善**（コミット 577ed11） - 2025年11月18日
    - アクセシビリティ向上（ARIA属性、focus-visible、WCAG 2.1対応）
    - トースト通知システムの実装
    - キーボードヒント表示（初回のみ）
    - プログレスバーコンポーネント
    - リデュースモーション対応
    - ハイコントラストモード対応
    - タッチデバイス最適化
    - カスタムスクロールバー・セレクションカラー
    - パフォーマンス最適化（will-change）
    - モーダルバックドロップぼかし効果
15. **本試験モード（タイマー付き60問連続出題）を実装**（コミット 50c1955） - 2025年11月18日
    - 60問・60分間の本番形式テスト
    - タイマー機能（残り5分で警告表示）
    - 合格判定（36問以上で合格）
    - 時間切れ時の自動採点
    - 試験専用結果画面（合格/不合格、所要時間表示）
    - 新規メソッド7個追加（モーダル表示/非表示、試験開始、タイマー更新、時間フォーマット、試験終了、結果表示）
    - 既存メソッド4個修正（displayQuestion, selectAnswer, updateButtons, handleKeyboardShortcut）
    - 試験モード中は学習機能を無効化（お気に入り、進捗記録、キーボードショートカット制限）
    - 試験結果は学習統計に記録されない
    - 3ファイル変更、+573行追加、-39行削除

## セキュリティ考慮事項

1. **XSS対策**
   - 現在は静的データのみなので問題なし
   - 将来的にユーザー入力を受け付ける場合は、適切なエスケープが必要

2. **localStorage**
   - セキュリティリスクは低い（個人情報なし）
   - ドメイン内でのみアクセス可能

## テスト観点

### 機能テスト

1. カテゴリー選択
2. 問題のランダム表示
3. 回答選択と正解判定
4. ナビゲーションボタンの動作
5. お気に入りの追加/削除
6. localStorageの永続化
7. 結果表示

### UIテスト

1. レスポンシブデザイン
2. アニメーション動作
3. ボタンのホバー/クリック効果
4. フィードバックバナーの表示

### エッジケース

1. localStorage無効の環境
2. 非常に長い問題文・解説
3. 高速クリック（連打）
4. ブラウザの戻る/進む

## 参考資料

- [日本FP協会 公式サイト](https://www.jafp.or.jp/)
- [Fisher-Yates shuffle algorithm](https://en.wikipedia.org/wiki/Fisher%E2%80%93Yates_shuffle)
- [Web Storage API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API)

---

**最終更新**: 2025年11月18日
**バージョン**: 1.3
**メンテナー**: Claude AI

---

## バージョン履歴

### v1.3 (2025-11-18)
- **本試験モード機能の実装**
  - 60問・60分間の本番形式テスト
  - タイマー機能（1秒ごとのカウントダウン、MM:SS形式表示）
  - 残り5分で赤色警告＋パルスアニメーション
  - 時間切れ時の自動採点（3秒後に実行）
  - 合格判定システム（36問以上正解で合格）
  - 詳細な結果表示（正答率、所要時間、合格/不合格）
  - 不正解・未解答問題の番号リスト表示
- **新規メソッド（7個）**
  - showExamConfirmModal() / hideExamConfirmModal()
  - startExamMode(): 全180問からランダム60問選出、タイマー開始
  - updateExamTimer(): 1秒ごとの更新、残り時間表示
  - formatTime(): 秒数をMM:SS形式に変換
  - endExamMode(): 試験終了、未解答確認、タイマー停止
  - showExamResults(): 試験専用結果画面（合格判定付き）
- **既存メソッドの修正（4個）**
  - displayQuestion(): 試験モード時はお気に入りボタン・進捗バッジを非表示
  - selectAnswer(): 試験モード時は学習進捗を記録しない
  - updateButtons(): 試験終了ボタンの制御
  - handleKeyboardShortcut(): 試験モード時はR/F/S/W/Uキーを無効化
- **UI要素の追加**
  - 本試験モード開始ボタン（赤色グラデーション、パルスアニメーション）
  - 試験確認モーダル（試験形式・注意事項の説明）
  - タイマー表示（quiz-header内）
  - 試験終了ボタン（btn-dangerクラス）
- **新規アニメーション**
  - examButtonPulse（本試験ボタンのパルス、2秒周期）
- **データ整合性**
  - 試験結果は学習統計に記録されない
  - 試験モード中はlocalStorageへの書き込みなし
  - タイマーの確実な停止（clearInterval）
- **コード変更**
  - 3ファイル変更（index.html, script.js, styles.css）
  - +573行追加、-39行削除
  - 合計33個のメソッド（v1.2から+7メソッド）
  - 1,568行のJavaScriptコード（+351行）
  - 1,299行のCSSコード（+67行）

### v1.2 (2025-11-18)
- **TOP 3優先機能の実装**
  - 苦手問題フィルタリング（正解率50%未満）
  - 未解答問題フィルタリング（未解答のみ）
  - キーボードショートカット（10種類）
- **UI/UX大規模改善**
  - アクセシビリティ向上（WCAG 2.1 AAレベル対応）
  - ARIA属性の完全実装
  - focus-visibleによるキーボードナビゲーション改善
  - トースト通知システム（4種類）
  - キーボードヒント（初回のみ）
  - プログレスバーコンポーネント
  - リデュースモーション対応
  - ハイコントラストモード対応
  - タッチデバイス最適化
  - カスタムスクロールバー
  - カスタムセレクションカラー
  - パフォーマンス最適化（will-change, GPU アクセラレーション）
  - モーダルバックドロップぼかし効果
- **新規アニメーション**
  - fadeInUp（モーダル表示）
  - slideInRight（トースト・ヒント）
  - shimmer（プログレスバー）
  - spin（ローディング）
  - loading（スケルトン）
  - pulse（汎用パルス）
- **コード品質向上**
  - 26個のメソッドに拡張（v1.1から+8メソッド）
  - styles.cssに+450行の新規スタイル追加
  - 1,200行超のJavaScriptコード

### v1.1 (2025-11-18)
- 学習進捗管理機能を実装
- 問題ごとの正解/不正解履歴記録
- 習熟度バッジ表示
- 学習統計ダッシュボード追加
- お気に入り問題表示機能追加

### v1.0 (2025-11-17)
- 初回リリース
- 基本的なクイズ機能
- 180問の問題データベース
- お気に入り機能
- レスポンシブデザイン

---

## 技術的ハイライト

### パフォーマンス指標

- **JavaScriptコード**: 1,568行（v1.2から+351行）
- **CSSコード**: 1,299行（v1.2から+67行）
- **問題データベース**: 180問（30問 × 6カテゴリー）
- **メソッド数**: 33個（v1.2から+7個）
- **アニメーション**: 13種類（examButtonPulse追加）
- **キーボードショートカット**: 10種類
- **localStorage使用**: 3つのキー（favorites, progress, keyboard-hint-shown）
- **モード**: 2種類（通常モード、本試験モード）

### ブラウザ互換性

- **モダンブラウザ**: Chrome, Firefox, Safari, Edge（最新版）
- **IE11**: 非対応（ES6機能を使用）
- **モバイル**: iOS Safari, Chrome Mobile（完全対応）
- **アクセシビリティ**: WCAG 2.1 AAレベル準拠

### 技術スタック詳細

**フロントエンド**:
- Vanilla JavaScript (ES6+)
- HTML5 (セマンティックHTML、ARIA)
- CSS3 (Grid, Flexbox, Animations, Custom Properties)

**アニメーション**:
- CSS Transitions (cubic-bezier)
- CSS Keyframe Animations
- GPU アクセラレーション (transform, opacity)

**データ永続化**:
- localStorage API
- JSON シリアライズ/デシリアライズ

**アクセシビリティ**:
- ARIA 属性（role, aria-label, aria-live, aria-modal）
- キーボードナビゲーション（全機能対応）
- focus-visible 疑似クラス
- リデュースモーション対応
- ハイコントラストモード対応

### コード品質

**設計原則**:
- SOLID原則に準拠
- DRY（Don't Repeat Yourself）
- 単一責任の原則
- イベント駆動アーキテクチャ

**ベストプラクティス**:
- セマンティックHTML
- プログレッシブエンハンスメント
- グレースフルデグラデーション
- モバイルファースト
- アクセシビリティファースト

**セキュリティ**:
- XSS対策（静的データのみ）
- localStorage のドメイン制限
- try-catch によるエラーハンドリング
