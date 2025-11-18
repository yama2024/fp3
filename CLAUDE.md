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
    progress: {}                     // 学習進捗管理（問題ごとの正解/不正解履歴）
}
```

**主要メソッド**:

1. **init()** (script.js:16-33)
   - カテゴリーボタンのイベントリスナー設定
   - コントロールボタンのイベントリスナー設定
   - お気に入りカウンター初期化

2. **shuffleArray(array)** (script.js:35-43)
   - Fisher-Yatesアルゴリズムによる配列シャッフル
   - 問題のランダム表示に使用

3. **loadCategory(category)** (script.js:45-70)
   - カテゴリー選択時の処理
   - 問題をシャッフルして読み込み
   - UI初期化

4. **displayQuestion()** (script.js:72-183)
   - 問題表示の中核メソッド
   - フィードバックバナー、お気に入りボタン、選択肢を動的生成
   - イベントリスナーの設定

5. **selectAnswer(answerIndex)** (script.js:185-196)
   - 回答選択時の処理
   - 重複回答防止
   - 正解判定と正解数更新
   - **重要**: 自動遷移は無効化されている

6. **toggleFavorite(category, questionId)** (script.js:360-375)
   - お気に入りの追加/削除
   - localStorageへの保存
   - UI更新

7. **updateButtons()** (script.js:225-258)
   - ナビゲーションボタンの状態管理
   - 未回答時は「次の問題」ボタンを無効化
   - 最後の問題では「結果を見る」に変更

8. **loadFavoritesOnly()** (script.js:78-132)
   - お気に入り問題のみを表示
   - 全カテゴリーからお気に入りを抽出
   - ランダム出題

### 学習進捗管理メソッド

9. **loadProgressFromStorage()** (script.js:506-516)
   - localStorageから学習進捗を読み込み
   - キー: 'fp3-progress'

10. **saveProgressToStorage()** (script.js:521-527)
    - localStorageに学習進捗を保存
    - JSON形式で永続化

11. **recordProgress(category, questionId, isCorrect)** (script.js:535-559)
    - 問題の解答履歴を記録
    - 正解/不正解回数を更新
    - 総解答回数をカウント
    - 最終解答日時を記録

12. **getQuestionProgress(category, questionId)** (script.js:567-575)
    - 特定の問題の進捗データを取得
    - 返り値: {correct, incorrect, totalAttempts, lastAttempt}

13. **getQuestionAccuracy(category, questionId)** (script.js:583-589)
    - 問題の正解率を計算（0-100%）
    - 未解答の場合は0%を返す

14. **getCategoryStats(category)** (script.js:596-628)
    - カテゴリー全体の統計を計算
    - 解答済み問題数、正解率、総解答回数など

15. **getOverallStats()** (script.js:634-660)
    - 全体統計を計算
    - 全カテゴリーの集計データを返す

16. **showStatsPage()** (script.js:704-712)
    - 学習統計ダッシュボードを表示
    - クイズセクションを非表示に

17. **updateStatsDisplay()** (script.js:717-807)
    - 統計データを画面に表示
    - 全体統計とカテゴリー別統計を動的生成

18. **hideStatsPage()** (script.js:812-816)
    - 統計ページを非表示
    - カテゴリー選択画面に戻る

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

### 4. UI/UXの強化

#### お気に入りボタンのデザイン (styles.css:186-244)

**特徴**:
- 金色のグラデーション背景
- 常時パルスアニメーション（2秒周期）
- ホバー時に拡大＋回転
- クリック時のグローエフェクト
- ボタン下に説明テキスト表示

**アニメーション**:
- `favoritePulse`: 常時パルス（目立たせる）
- `favoriteGlow`: クリック時のグロー（フィードバック）
- `counterPulse`: ヘッダーカウンターのパルス

#### 初回使用時のヘルプ (script.js:84-96)

最初の問題表示時に、お気に入り機能の説明を表示（お気に入りが0件の場合のみ）

### 4. Fisher-Yatesシャッフル

**理由**: 真にランダムな出題順序を実現
**実装**: script.js:35-43
**適用タイミング**: カテゴリー読み込み時、リセット時

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

1. **fadeIn** (styles.css:423-432)
   - 問題表示時のフェードイン

2. **correctPulse** (styles.css:434-444)
   - 正解時の選択肢のパルス

3. **incorrectShake** (styles.css:446-456)
   - 不正解時の選択肢のシェイク

4. **favoritePulse** (styles.css:224-231)
   - お気に入りボタンの常時パルス

5. **favoriteGlow** (styles.css:234-244)
   - お気に入りボタンクリック時のグロー

6. **counterPulse** (styles.css:247-256)
   - お気に入りカウンターのパルス

## 既存機能の保護

以下の機能は**絶対に壊してはならない**コア機能です：

1. **手動ナビゲーション**: 自動遷移は無効のまま維持
2. **ランダム表示**: Fisher-Yatesシャッフルを維持
3. **回答後のボタン制御**: 未回答時は「次の問題」ボタンを無効化
4. **正解/不正解のフィードバック**: 視覚的フィードバックを維持
5. **お気に入り機能**: localStorage連携を維持
6. **学習進捗管理**: 履歴データの整合性を維持、localStorageの独立管理

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
   - キー分離: 'fp3-favorites' と 'fp3-progress'

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
**バージョン**: 1.1
**メンテナー**: Claude AI

---

## バージョン履歴

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
