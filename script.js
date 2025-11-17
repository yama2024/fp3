// FP3級学習サイト メインスクリプト（ランダム表示対応版）

class QuizApp {
    constructor() {
        this.currentCategory = null;
        this.currentQuestions = [];
        this.currentQuestionIndex = 0;
        this.correctCount = 0;
        this.userAnswers = [];
        this.favorites = [];
        this.showOnlyFavorites = false;
        this.loadFavoritesFromStorage();
        this.init();
    }

    init() {
        // カテゴリーボタンのイベントリスナー設定
        const categoryBtns = document.querySelectorAll('.category-btn');
        categoryBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const category = btn.dataset.category;
                this.loadCategory(category);
            });
        });

        // コントロールボタンのイベントリスナー設定
        document.getElementById('prev-btn').addEventListener('click', () => this.prevQuestion());
        document.getElementById('next-btn').addEventListener('click', () => this.nextQuestion());
        document.getElementById('reset-btn').addEventListener('click', () => this.resetQuiz());

        // お気に入り数を表示
        this.updateFavoriteCount();
    }

    // 配列をランダムにシャッフルする関数（Fisher-Yatesアルゴリズム）
    shuffleArray(array) {
        const shuffled = [...array]; // 元の配列を変更しないようにコピー
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    loadCategory(category) {
        if (!questionsData[category]) {
            console.error('カテゴリーが見つかりません:', category);
            return;
        }

        this.currentCategory = category;
        // 問題をランダムにシャッフル
        this.currentQuestions = this.shuffleArray(questionsData[category].questions);
        this.currentQuestionIndex = 0;
        this.correctCount = 0;
        this.userAnswers = new Array(this.currentQuestions.length).fill(null);

        // カテゴリータイトルを更新
        document.getElementById('current-category').textContent = questionsData[category].title + '（ランダム出題）';

        // 統計情報を更新
        document.getElementById('total-questions').textContent = this.currentQuestions.length;
        document.getElementById('correct-count').textContent = '0';

        // コントロールボタンを表示
        document.getElementById('quiz-controls').style.display = 'flex';

        // 最初の問題を表示
        this.displayQuestion();
    }

    displayQuestion() {
        const question = this.currentQuestions[this.currentQuestionIndex];
        const container = document.getElementById('quiz-container');

        // 問題番号を更新
        document.getElementById('current-question').textContent = this.currentQuestionIndex + 1;

        const isAnswered = this.userAnswers[this.currentQuestionIndex] !== null;
        const userAnswer = this.userAnswers[this.currentQuestionIndex];
        const isCorrect = isAnswered && userAnswer === question.correctAnswer;

        // 最初の問題でお気に入り機能のヘルプを表示
        let favoriteHelp = '';
        if (this.currentQuestionIndex === 0 && this.favorites.length === 0) {
            favoriteHelp = `
                <div style="background: linear-gradient(135deg, #fff5e6 0%, #ffe5b4 100%);
                            padding: 1rem; margin-bottom: 1rem; border-radius: 8px;
                            border: 2px solid #ffd700; text-align: center;">
                    <strong style="color: #ff8c00; font-size: 1.1rem;">💡 重要な問題は右上の★ボタンでお気に入り登録できます！</strong>
                    <p style="color: #666; font-size: 0.9rem; margin: 0.5rem 0 0 0;">
                        後で復習したい問題を保存しておきましょう
                    </p>
                </div>
            `;
        }

        // フィードバックバナー
        let feedbackBanner = '';
        if (isAnswered) {
            if (isCorrect) {
                feedbackBanner = `
                    <div class="feedback-banner correct">
                        ✓ 正解です！よくできました！
                    </div>
                `;
            } else {
                feedbackBanner = `
                    <div class="feedback-banner incorrect">
                        ✗ 不正解です。正しい答えを確認しましょう。
                    </div>
                `;
            }
        }

        // お気に入りボタン
        const isFav = this.isFavorite(this.currentCategory, question.id);
        const favoriteIcon = isFav ? '★' : '☆';
        const favoriteClass = isFav ? 'favorite-active' : '';

        // 問題HTMLを生成
        let html = `
            <div class="question">
                ${favoriteHelp}
                ${feedbackBanner}
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem; gap: 1rem;">
                    <p class="question-text" style="flex: 1; margin: 0;">
                        <strong>問題${this.currentQuestionIndex + 1}:</strong> ${question.question}
                    </p>
                    <div style="display: flex; flex-direction: column; align-items: center; gap: 0.3rem;">
                        <button class="favorite-btn ${favoriteClass}"
                                data-category="${this.currentCategory}"
                                data-question-id="${question.id}"
                                title="${isFav ? 'お気に入りから削除' : 'お気に入りに追加'}">
                            ${favoriteIcon}
                        </button>
                        <span style="font-size: 0.75rem; color: #ff8c00; font-weight: 600; white-space: nowrap;">
                            ${isFav ? 'お気に入り' : 'クリックして保存'}
                        </span>
                    </div>
                </div>
                <ul class="options">
        `;

        question.options.forEach((option, index) => {
            const isSelected = userAnswer === index;
            const isOptionCorrect = index === question.correctAnswer;

            let optionClass = 'option';
            if (isAnswered) {
                optionClass += ' disabled';
                if (isSelected && isOptionCorrect) {
                    // 選択した答えが正解
                    optionClass += ' correct';
                } else if (isSelected && !isOptionCorrect) {
                    // 選択した答えが不正解
                    optionClass += ' incorrect';
                } else if (isOptionCorrect) {
                    // 正解の選択肢（選択していない場合）
                    optionClass += ' neutral-correct';
                }
            }

            html += `
                <li class="${optionClass}" data-index="${index}">
                    ${index + 1}. ${option}
                </li>
            `;
        });

        html += `
                </ul>
                <div class="explanation ${isAnswered ? 'show' : ''}">
                    <h4>💡 解説</h4>
                    <p>${question.explanation}</p>
                </div>
            </div>
        `;

        container.innerHTML = html;

        // オプションのクリックイベント
        if (!isAnswered) {
            const options = container.querySelectorAll('.option');
            options.forEach(option => {
                option.addEventListener('click', () => {
                    const index = parseInt(option.dataset.index);
                    this.selectAnswer(index);
                });
            });
        }

        // お気に入りボタンのクリックイベント
        const favoriteBtn = container.querySelector('.favorite-btn');
        if (favoriteBtn) {
            favoriteBtn.addEventListener('click', () => {
                const category = favoriteBtn.dataset.category;
                const questionId = parseInt(favoriteBtn.dataset.questionId);
                this.toggleFavorite(category, questionId);
            });
        }

        // ボタンの有効/無効を更新
        this.updateButtons();
    }

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

    prevQuestion() {
        if (this.currentQuestionIndex > 0) {
            this.currentQuestionIndex--;
            this.displayQuestion();
        }
    }

    nextQuestion() {
        if (this.currentQuestionIndex < this.currentQuestions.length - 1) {
            this.currentQuestionIndex++;
            this.displayQuestion();
        } else {
            // 最後の問題の場合は結果を表示
            this.showResults();
        }
    }

    resetQuiz() {
        // 問題を再シャッフル
        this.currentQuestions = this.shuffleArray(questionsData[this.currentCategory].questions);
        this.currentQuestionIndex = 0;
        this.correctCount = 0;
        this.userAnswers = new Array(this.currentQuestions.length).fill(null);
        document.getElementById('correct-count').textContent = '0';
        this.displayQuestion();
    }

    updateButtons() {
        const prevBtn = document.getElementById('prev-btn');
        const nextBtn = document.getElementById('next-btn');

        // 前の問題ボタン：最初の問題では無効化
        prevBtn.disabled = this.currentQuestionIndex === 0;

        // 次の問題ボタン：現在の問題に回答済みかチェック
        const isAnswered = this.userAnswers[this.currentQuestionIndex] !== null;

        // 最後の問題の場合
        if (this.currentQuestionIndex === this.currentQuestions.length - 1) {
            // 回答済みなら「結果を見る」ボタンとして有効化
            if (isAnswered) {
                nextBtn.disabled = false;
                nextBtn.textContent = '結果を見る';
            } else {
                // 未回答なら無効化
                nextBtn.disabled = true;
                nextBtn.textContent = '結果を見る';
            }
        } else {
            // 最後以外の問題の場合
            if (isAnswered) {
                // 回答済みなら「次の問題」ボタンを有効化
                nextBtn.disabled = false;
                nextBtn.textContent = '次の問題';
            } else {
                // 未回答なら「次の問題」ボタンを無効化
                nextBtn.disabled = true;
                nextBtn.textContent = '次の問題';
            }
        }
    }

    showResults() {
        const container = document.getElementById('quiz-container');
        const percentage = Math.round((this.correctCount / this.currentQuestions.length) * 100);

        let message = '';
        let emoji = '';
        let advice = '';

        if (percentage >= 80) {
            message = '素晴らしい！合格レベルです！';
            emoji = '🎉';
            advice = 'この調子で他の分野も学習しましょう。本試験でも自信を持って臨めます！';
        } else if (percentage >= 60) {
            message = '合格ラインに到達しました！';
            emoji = '✅';
            advice = '合格ラインは超えていますが、より高得点を目指して復習を続けましょう。';
        } else if (percentage >= 40) {
            message = 'もう少しです。復習しましょう！';
            emoji = '📚';
            advice = '間違えた問題を中心に、もう一度解説を読んで理解を深めましょう。';
        } else {
            message = '基礎から復習が必要です。';
            emoji = '💪';
            advice = '焦らず基礎からしっかり学習しましょう。繰り返し解くことで必ず理解できます。';
        }

        // 不正解の問題リストを作成
        let incorrectList = '';
        const incorrectQuestions = [];
        this.userAnswers.forEach((answer, index) => {
            if (answer !== this.currentQuestions[index].correctAnswer) {
                incorrectQuestions.push(index + 1);
            }
        });

        if (incorrectQuestions.length > 0) {
            incorrectList = `
                <div style="margin-top: 2rem; padding: 1.5rem; background: #f8f9fa; border-radius: 8px; text-align: left;">
                    <h4 style="color: #dc3545; margin-bottom: 1rem;">復習が必要な問題</h4>
                    <p style="color: #666;">問題番号: ${incorrectQuestions.join(', ')}</p>
                    <p style="color: #666; font-size: 0.95rem; margin-top: 0.5rem;">
                        「もう一度挑戦」ボタンで再度学習できます（問題はランダムに並び替わります）
                    </p>
                </div>
            `;
        }

        const html = `
            <div class="question" style="text-align: center;">
                <h2 style="font-size: 3rem; margin-bottom: 1rem;">${emoji}</h2>
                <h3 style="color: #667eea; margin-bottom: 1rem;">結果発表</h3>
                <p style="font-size: 1.5rem; margin-bottom: 1rem;">
                    <strong style="color: #28a745;">${this.correctCount}</strong>
                    <span style="color: #666;">/ ${this.currentQuestions.length} 問正解</span>
                </p>
                <p style="font-size: 2rem; color: #764ba2; margin-bottom: 1rem;">
                    正答率: <strong>${percentage}%</strong>
                </p>
                <p style="font-size: 1.2rem; color: #333; font-weight: 600; margin-bottom: 0.5rem;">
                    ${message}
                </p>
                <p style="font-size: 1rem; color: #666; margin-bottom: 2rem;">
                    ${advice}
                </p>
                ${incorrectList}
                <div style="margin-top: 2rem; display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
                    <button class="btn btn-primary" onclick="quizApp.resetQuiz()" style="padding: 1rem 3rem; font-size: 1.1rem;">
                        もう一度挑戦
                    </button>
                    <button class="btn btn-secondary" onclick="location.reload()" style="padding: 1rem 3rem; font-size: 1.1rem;">
                        別の分野を選ぶ
                    </button>
                </div>
            </div>
        `;

        container.innerHTML = html;
    }

    // お気に入り機能
    getQuestionId(category, questionId) {
        return `${category}-${questionId}`;
    }

    isFavorite(category, questionId) {
        const id = this.getQuestionId(category, questionId);
        return this.favorites.includes(id);
    }

    toggleFavorite(category, questionId) {
        const id = this.getQuestionId(category, questionId);
        const index = this.favorites.indexOf(id);

        if (index > -1) {
            // お気に入りから削除
            this.favorites.splice(index, 1);
        } else {
            // お気に入りに追加
            this.favorites.push(id);
        }

        this.saveFavoritesToStorage();
        this.updateFavoriteCount();
        this.displayQuestion(); // 表示を更新
    }

    updateFavoriteCount() {
        const countElement = document.getElementById('favorite-count');
        if (countElement) {
            countElement.textContent = this.favorites.length;
        }
    }

    saveFavoritesToStorage() {
        try {
            localStorage.setItem('fp3-favorites', JSON.stringify(this.favorites));
        } catch (e) {
            console.error('お気に入りの保存に失敗しました:', e);
        }
    }

    loadFavoritesFromStorage() {
        try {
            const saved = localStorage.getItem('fp3-favorites');
            if (saved) {
                this.favorites = JSON.parse(saved);
            }
        } catch (e) {
            console.error('お気に入りの読み込みに失敗しました:', e);
            this.favorites = [];
        }
    }

    getFavoriteCount() {
        return this.favorites.length;
    }
}

// アプリケーションの初期化
let quizApp;
document.addEventListener('DOMContentLoaded', () => {
    quizApp = new QuizApp();
});
