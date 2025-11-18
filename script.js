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
        this.progress = {}; // 学習進捗管理（問題ごとの正解/不正解履歴）

        // 本試験モード用プロパティ
        this.examMode = false;              // 本試験モードフラグ
        this.examTimeRemaining = 3600;      // 残り時間（秒）60分 = 3600秒
        this.examTimer = null;              // タイマーのinterval ID
        this.examStartTime = null;          // 試験開始時刻

        this.loadFavoritesFromStorage();
        this.loadProgressFromStorage();
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

        // お気に入りカウンターのクリック・キーボードイベント
        const favoriteCounter = document.getElementById('favorite-counter');
        if (favoriteCounter) {
            favoriteCounter.addEventListener('click', () => this.loadFavoritesOnly());
            favoriteCounter.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.loadFavoritesOnly();
                }
            });
        }

        // 学習統計ボタンのキーボードイベント
        const statsBtn = document.getElementById('stats-btn');
        if (statsBtn) {
            statsBtn.addEventListener('click', () => this.showStatsPage());
        }

        // 苦手問題カウンターのクリック・キーボードイベント
        const weakCounter = document.getElementById('weak-counter');
        if (weakCounter) {
            weakCounter.addEventListener('click', () => this.loadWeakQuestionsOnly());
            weakCounter.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.loadWeakQuestionsOnly();
                }
            });
        }

        // 未解答問題カウンターのクリック・キーボードイベント
        const unansweredCounter = document.getElementById('unanswered-counter');
        if (unansweredCounter) {
            unansweredCounter.addEventListener('click', () => this.loadUnansweredQuestionsOnly());
            unansweredCounter.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.loadUnansweredQuestionsOnly();
                }
            });
        }

        // カウンター数を表示
        this.updateFavoriteCount();
        this.updateWeakQuestionsCount();
        this.updateUnansweredQuestionsCount();

        // 本試験モードボタンのイベントリスナー
        const examModeBtn = document.getElementById('exam-mode-btn');
        if (examModeBtn) {
            examModeBtn.addEventListener('click', () => this.showExamConfirmModal());
        }

        // 本試験確認モーダルのボタン
        const examConfirmStartBtn = document.getElementById('exam-confirm-start-btn');
        const examConfirmCancelBtn = document.getElementById('exam-confirm-cancel-btn');
        if (examConfirmStartBtn) {
            examConfirmStartBtn.addEventListener('click', () => this.startExamMode());
        }
        if (examConfirmCancelBtn) {
            examConfirmCancelBtn.addEventListener('click', () => this.hideExamConfirmModal());
        }

        // 試験終了ボタン
        const endExamBtn = document.getElementById('end-exam-btn');
        if (endExamBtn) {
            endExamBtn.addEventListener('click', () => this.endExamMode());
        }

        // キーボードショートカットのイベントリスナー
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcut(e));

        // 初回訪問時にキーボードヒントを表示
        this.showKeyboardHint();
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

        // トースト通知を表示
        this.showToast(`${questionsData[category].title}を開始しました！`, 'info', 2500);

        // 最初の問題を表示
        this.displayQuestion();
    }

    loadFavoritesOnly() {
        // お気に入りが0件の場合
        if (this.favorites.length === 0) {
            alert('お気に入りに登録された問題がありません。\n問題を解いて、★ボタンをクリックしてお気に入りに追加してください。');
            return;
        }

        // 全カテゴリーからお気に入りの問題を抽出
        const favoriteQuestions = [];

        // お気に入りIDをパース（例: "life-planning-1" -> {category: "life-planning", id: 1}）
        this.favorites.forEach(favId => {
            const parts = favId.split('-');
            // 最後の部分がquestionId、それ以外がcategory
            const questionId = parseInt(parts[parts.length - 1]);
            const category = parts.slice(0, -1).join('-');

            if (questionsData[category]) {
                const question = questionsData[category].questions.find(q => q.id === questionId);
                if (question) {
                    // カテゴリー情報を問題オブジェクトに追加
                    favoriteQuestions.push({
                        ...question,
                        originalCategory: category
                    });
                }
            }
        });

        // お気に入りの問題が見つからない場合
        if (favoriteQuestions.length === 0) {
            alert('お気に入りの問題が見つかりませんでした。');
            return;
        }

        // お気に入りをランダムにシャッフル
        this.currentQuestions = this.shuffleArray(favoriteQuestions);
        this.currentCategory = 'favorites'; // 特別なカテゴリー
        this.currentQuestionIndex = 0;
        this.correctCount = 0;
        this.userAnswers = new Array(this.currentQuestions.length).fill(null);

        // カテゴリータイトルを更新
        document.getElementById('current-category').textContent = '★ お気に入り問題（ランダム出題）';

        // 統計情報を更新
        document.getElementById('total-questions').textContent = this.currentQuestions.length;
        document.getElementById('correct-count').textContent = '0';

        // コントロールボタンを表示
        document.getElementById('quiz-controls').style.display = 'flex';

        // 最初の問題を表示
        this.displayQuestion();
    }

    loadWeakQuestionsOnly() {
        // 全カテゴリーから苦手問題（正解率50%未満）を抽出
        const weakQuestions = [];

        Object.keys(questionsData).forEach(category => {
            questionsData[category].questions.forEach(question => {
                const accuracy = this.getQuestionAccuracy(category, question.id);
                const progress = this.getQuestionProgress(category, question.id);

                // 解答履歴があり、かつ正解率が50%未満の問題を苦手問題とする
                if (progress.totalAttempts > 0 && accuracy < 50) {
                    weakQuestions.push({
                        ...question,
                        originalCategory: category
                    });
                }
            });
        });

        // 苦手問題が0件の場合
        if (weakQuestions.length === 0) {
            alert('苦手問題がありません。\n正解率50%未満の問題が「苦手問題」として表示されます。\nもっと問題を解いて、苦手分野を見つけましょう！');
            return;
        }

        // 苦手問題をランダムにシャッフル
        this.currentQuestions = this.shuffleArray(weakQuestions);
        this.currentCategory = 'weak'; // 特別なカテゴリー
        this.currentQuestionIndex = 0;
        this.correctCount = 0;
        this.userAnswers = new Array(this.currentQuestions.length).fill(null);

        // カテゴリータイトルを更新
        document.getElementById('current-category').textContent = '🔴 苦手問題（正解率50%未満・ランダム出題）';

        // 統計情報を更新
        document.getElementById('total-questions').textContent = this.currentQuestions.length;
        document.getElementById('correct-count').textContent = '0';

        // コントロールボタンを表示
        document.getElementById('quiz-controls').style.display = 'flex';

        // トースト通知を表示
        this.showToast(`苦手問題 ${weakQuestions.length}問を読み込みました`, 'warning', 3000);

        // 最初の問題を表示
        this.displayQuestion();
    }

    loadUnansweredQuestionsOnly() {
        // 全カテゴリーから未解答問題（総解答回数が0）を抽出
        const unansweredQuestions = [];

        Object.keys(questionsData).forEach(category => {
            questionsData[category].questions.forEach(question => {
                const progress = this.getQuestionProgress(category, question.id);

                // 一度も解答していない問題を未解答問題とする
                if (progress.totalAttempts === 0) {
                    unansweredQuestions.push({
                        ...question,
                        originalCategory: category
                    });
                }
            });
        });

        // 未解答問題が0件の場合
        if (unansweredQuestions.length === 0) {
            alert('未解答問題がありません。\nおめでとうございます！全180問を少なくとも1回は解答しました！\n復習モードで苦手問題を克服しましょう。');
            return;
        }

        // 未解答問題をランダムにシャッフル
        this.currentQuestions = this.shuffleArray(unansweredQuestions);
        this.currentCategory = 'unanswered'; // 特別なカテゴリー
        this.currentQuestionIndex = 0;
        this.correctCount = 0;
        this.userAnswers = new Array(this.currentQuestions.length).fill(null);

        // カテゴリータイトルを更新
        document.getElementById('current-category').textContent = '📝 未解答問題（ランダム出題）';

        // 統計情報を更新
        document.getElementById('total-questions').textContent = this.currentQuestions.length;
        document.getElementById('correct-count').textContent = '0';

        // コントロールボタンを表示
        document.getElementById('quiz-controls').style.display = 'flex';

        // トースト通知を表示
        this.showToast(`未解答問題 ${unansweredQuestions.length}問を読み込みました`, 'info', 3000);

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

        // お気に入りボタン（試験モードでは非表示）
        // お気に入りカテゴリーの場合はoriginalCategoryを使用
        const categoryForFavorite = question.originalCategory || this.currentCategory;
        const isFav = this.isFavorite(categoryForFavorite, question.id);
        const favoriteIcon = isFav ? '★' : '☆';
        const favoriteClass = isFav ? 'favorite-active' : '';

        // 学習進捗バッジ（試験モードでは非表示）
        const progress = this.getQuestionProgress(categoryForFavorite, question.id);
        const accuracy = this.getQuestionAccuracy(categoryForFavorite, question.id);
        let progressBadge = '';

        if (!this.examMode && progress.totalAttempts > 0) {
            let badgeColor = '#6c757d'; // グレー（デフォルト）
            let badgeText = '未解答';

            if (accuracy >= 80) {
                badgeColor = '#28a745'; // 緑（得意）
                badgeText = '得意';
            } else if (accuracy >= 50) {
                badgeColor = '#ffc107'; // 黄（普通）
                badgeText = '普通';
            } else {
                badgeColor = '#dc3545'; // 赤（苦手）
                badgeText = '苦手';
            }

            progressBadge = `
                <div style="background: ${badgeColor}; color: white; padding: 0.3rem 0.6rem;
                            border-radius: 12px; font-size: 0.7rem; font-weight: 600;
                            text-align: center; margin-top: 0.5rem; white-space: nowrap;">
                    ${badgeText} ${accuracy}%
                </div>
                <div style="font-size: 0.65rem; color: #666; margin-top: 0.2rem; text-align: center;">
                    正解${progress.correct}/${progress.totalAttempts}回
                </div>
            `;
        }

        // 問題HTMLを生成
        let html = `
            <div class="question">
                ${favoriteHelp}
                ${feedbackBanner}
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem; gap: 1rem;">
                    <p class="question-text" style="flex: 1; margin: 0;">
                        <strong>問題${this.currentQuestionIndex + 1}:</strong> ${question.question}
                    </p>
                    ${!this.examMode ? `
                    <div style="display: flex; flex-direction: column; align-items: center; gap: 0.3rem;">
                        <button class="favorite-btn ${favoriteClass}"
                                data-category="${categoryForFavorite}"
                                data-question-id="${question.id}"
                                title="${isFav ? 'お気に入りから削除' : 'お気に入りに追加'}">
                            ${favoriteIcon}
                        </button>
                        <span style="font-size: 0.75rem; color: #ff8c00; font-weight: 600; white-space: nowrap;">
                            ${isFav ? 'お気に入り' : 'クリックして保存'}
                        </span>
                        ${progressBadge}
                    </div>
                    ` : ''}
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
        const isCorrect = answerIndex === question.correctAnswer;

        if (isCorrect) {
            this.correctCount++;
            document.getElementById('correct-count').textContent = this.correctCount;
        }

        // 学習進捗を記録（試験モードでは記録しない）
        if (!this.examMode) {
            // お気に入りカテゴリーの場合はoriginalCategoryを使用
            const categoryForProgress = question.originalCategory || this.currentCategory;
            this.recordProgress(categoryForProgress, question.id, isCorrect);

            // カウンターを更新（苦手問題・未解答問題の数が変わる可能性があるため）
            this.updateWeakQuestionsCount();
            this.updateUnansweredQuestionsCount();
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

        // 試験モードの場合
        if (this.examMode) {
            // 最後の問題の場合
            if (this.currentQuestionIndex === this.currentQuestions.length - 1) {
                nextBtn.disabled = !isAnswered;
                nextBtn.textContent = '次の問題';
            } else {
                nextBtn.disabled = !isAnswered;
                nextBtn.textContent = '次の問題';
            }
            // 試験終了ボタンは常に有効（確認ダイアログがあるため）
            const endExamBtn = document.getElementById('end-exam-btn');
            if (endExamBtn) {
                endExamBtn.disabled = false;
            }
        } else {
            // 通常モードの場合
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
            this.showToast('お気に入りから削除しました', 'info', 2000);
        } else {
            // お気に入りに追加
            this.favorites.push(id);
            this.showToast('お気に入りに追加しました ⭐', 'success', 2000);
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

    updateWeakQuestionsCount() {
        const countElement = document.getElementById('weak-count');
        if (countElement) {
            let weakCount = 0;
            Object.keys(questionsData).forEach(category => {
                questionsData[category].questions.forEach(question => {
                    const accuracy = this.getQuestionAccuracy(category, question.id);
                    const progress = this.getQuestionProgress(category, question.id);
                    if (progress.totalAttempts > 0 && accuracy < 50) {
                        weakCount++;
                    }
                });
            });
            countElement.textContent = weakCount;
        }
    }

    updateUnansweredQuestionsCount() {
        const countElement = document.getElementById('unanswered-count');
        if (countElement) {
            let unansweredCount = 0;
            Object.keys(questionsData).forEach(category => {
                questionsData[category].questions.forEach(question => {
                    const progress = this.getQuestionProgress(category, question.id);
                    if (progress.totalAttempts === 0) {
                        unansweredCount++;
                    }
                });
            });
            countElement.textContent = unansweredCount;
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

    // ========== 学習進捗管理機能 ==========

    /**
     * 学習進捗をlocalStorageから読み込む
     */
    loadProgressFromStorage() {
        try {
            const saved = localStorage.getItem('fp3-progress');
            if (saved) {
                this.progress = JSON.parse(saved);
            }
        } catch (e) {
            console.error('学習進捗の読み込みに失敗しました:', e);
            this.progress = {};
        }
    }

    /**
     * 学習進捗をlocalStorageに保存
     */
    saveProgressToStorage() {
        try {
            localStorage.setItem('fp3-progress', JSON.stringify(this.progress));
        } catch (e) {
            console.error('学習進捗の保存に失敗しました:', e);
        }
    }

    /**
     * 問題の進捗を記録
     * @param {string} category - カテゴリー名
     * @param {number} questionId - 問題ID
     * @param {boolean} isCorrect - 正解かどうか
     */
    recordProgress(category, questionId, isCorrect) {
        const key = this.getQuestionId(category, questionId);

        // 既存の進捗データを取得、なければ初期化
        if (!this.progress[key]) {
            this.progress[key] = {
                correct: 0,
                incorrect: 0,
                totalAttempts: 0,
                lastAttempt: null
            };
        }

        // 進捗を更新
        if (isCorrect) {
            this.progress[key].correct++;
        } else {
            this.progress[key].incorrect++;
        }
        this.progress[key].totalAttempts++;
        this.progress[key].lastAttempt = new Date().toISOString();

        // localStorageに保存
        this.saveProgressToStorage();
    }

    /**
     * 特定の問題の進捗を取得
     * @param {string} category - カテゴリー名
     * @param {number} questionId - 問題ID
     * @returns {Object} 進捗データ
     */
    getQuestionProgress(category, questionId) {
        const key = this.getQuestionId(category, questionId);
        return this.progress[key] || {
            correct: 0,
            incorrect: 0,
            totalAttempts: 0,
            lastAttempt: null
        };
    }

    /**
     * 問題の正解率を計算
     * @param {string} category - カテゴリー名
     * @param {number} questionId - 問題ID
     * @returns {number} 正解率（0-100）
     */
    getQuestionAccuracy(category, questionId) {
        const prog = this.getQuestionProgress(category, questionId);
        if (prog.totalAttempts === 0) {
            return 0;
        }
        return Math.round((prog.correct / prog.totalAttempts) * 100);
    }

    /**
     * カテゴリー全体の統計を取得
     * @param {string} category - カテゴリー名
     * @returns {Object} カテゴリー統計
     */
    getCategoryStats(category) {
        const stats = {
            totalQuestions: 0,
            attemptedQuestions: 0,
            totalCorrect: 0,
            totalIncorrect: 0,
            totalAttempts: 0,
            averageAccuracy: 0
        };

        if (!questionsData[category]) {
            return stats;
        }

        const questions = questionsData[category].questions;
        stats.totalQuestions = questions.length;

        questions.forEach(question => {
            const prog = this.getQuestionProgress(category, question.id);
            if (prog.totalAttempts > 0) {
                stats.attemptedQuestions++;
                stats.totalCorrect += prog.correct;
                stats.totalIncorrect += prog.incorrect;
                stats.totalAttempts += prog.totalAttempts;
            }
        });

        if (stats.totalAttempts > 0) {
            stats.averageAccuracy = Math.round((stats.totalCorrect / stats.totalAttempts) * 100);
        }

        return stats;
    }

    /**
     * 全体の統計を取得
     * @returns {Object} 全体統計
     */
    getOverallStats() {
        const stats = {
            totalQuestions: 0,
            attemptedQuestions: 0,
            totalCorrect: 0,
            totalIncorrect: 0,
            totalAttempts: 0,
            averageAccuracy: 0,
            categoryStats: {}
        };

        Object.keys(questionsData).forEach(category => {
            const catStats = this.getCategoryStats(category);
            stats.totalQuestions += catStats.totalQuestions;
            stats.attemptedQuestions += catStats.attemptedQuestions;
            stats.totalCorrect += catStats.totalCorrect;
            stats.totalIncorrect += catStats.totalIncorrect;
            stats.totalAttempts += catStats.totalAttempts;
            stats.categoryStats[category] = catStats;
        });

        if (stats.totalAttempts > 0) {
            stats.averageAccuracy = Math.round((stats.totalCorrect / stats.totalAttempts) * 100);
        }

        return stats;
    }

    /**
     * 学習統計ページを表示
     */
    showStatsPage() {
        // クイズセクションを非表示、統計セクションを表示
        document.getElementById('quiz-section').style.display = 'none';
        document.querySelector('.category-section').style.display = 'none';
        document.getElementById('stats-section').style.display = 'block';

        // 統計を更新
        this.updateStatsDisplay();
    }

    /**
     * 学習統計の表示を更新
     */
    updateStatsDisplay() {
        const overallStats = this.getOverallStats();

        // 全体統計の更新
        document.getElementById('overall-accuracy').textContent = `${overallStats.averageAccuracy}%`;
        document.getElementById('overall-attempted').textContent = `${overallStats.attemptedQuestions}/${overallStats.totalQuestions}`;
        document.getElementById('overall-total-attempts').textContent = overallStats.totalAttempts;

        // カテゴリー別統計の更新
        const container = document.getElementById('category-stats-container');
        const categoryNames = {
            'life-planning': 'ライフプランニングと資金計画',
            'risk-management': 'リスク管理',
            'financial-assets': '金融資産運用',
            'tax': 'タックスプランニング',
            'real-estate': '不動産',
            'inheritance': '相続・事業承継'
        };

        let html = '';
        Object.keys(questionsData).forEach(category => {
            const stats = overallStats.categoryStats[category];
            const progressPercent = Math.round((stats.attemptedQuestions / stats.totalQuestions) * 100);

            // 正解率で色分け
            let accuracyColor = '#6c757d'; // グレー
            if (stats.averageAccuracy >= 80) {
                accuracyColor = '#28a745'; // 緑
            } else if (stats.averageAccuracy >= 60) {
                accuracyColor = '#ffc107'; // 黄
            } else if (stats.averageAccuracy > 0) {
                accuracyColor = '#dc3545'; // 赤
            }

            html += `
                <div style="background: white; border: 2px solid #e9ecef; border-radius: 12px;
                            padding: 1.5rem; margin-bottom: 1rem; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    <h3 style="margin: 0 0 1rem 0; color: #2c3e50; font-size: 1.2rem;">
                        ${categoryNames[category]}
                    </h3>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 1rem; margin-bottom: 1rem;">
                        <div style="text-align: center;">
                            <div style="font-size: 1.8rem; font-weight: 700; color: ${accuracyColor};">
                                ${stats.averageAccuracy}%
                            </div>
                            <div style="font-size: 0.85rem; color: #6c757d;">正解率</div>
                        </div>
                        <div style="text-align: center;">
                            <div style="font-size: 1.8rem; font-weight: 700; color: #17a2b8;">
                                ${stats.attemptedQuestions}/${stats.totalQuestions}
                            </div>
                            <div style="font-size: 0.85rem; color: #6c757d;">解答済み</div>
                        </div>
                        <div style="text-align: center;">
                            <div style="font-size: 1.8rem; font-weight: 700; color: #6f42c1;">
                                ${stats.totalAttempts}
                            </div>
                            <div style="font-size: 0.85rem; color: #6c757d;">解答回数</div>
                        </div>
                    </div>
                    <!-- 進捗バー -->
                    <div style="background: #e9ecef; border-radius: 10px; height: 20px; overflow: hidden;">
                        <div style="background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
                                    width: ${progressPercent}%; height: 100%; transition: width 0.3s ease;
                                    display: flex; align-items: center; justify-content: center;
                                    color: white; font-size: 0.75rem; font-weight: 600;">
                            ${progressPercent > 10 ? progressPercent + '%' : ''}
                        </div>
                    </div>
                    <div style="text-align: center; margin-top: 0.5rem; font-size: 0.85rem; color: #6c757d;">
                        学習進捗: ${progressPercent}%
                    </div>
                </div>
            `;
        });

        // 戻るボタンを追加
        html += `
            <button onclick="quizApp.hideStatsPage()"
                    style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                           color: white; padding: 1rem 2rem; border-radius: 12px;
                           font-weight: 700; font-size: 1.1rem; cursor: pointer;
                           border: none; width: 100%; margin-top: 1rem;
                           box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
                           transition: all 0.3s ease;">
                ← カテゴリー選択に戻る
            </button>
        `;

        container.innerHTML = html;
    }

    /**
     * 学習統計ページを非表示にしてカテゴリー選択に戻る
     */
    hideStatsPage() {
        document.getElementById('stats-section').style.display = 'none';
        document.querySelector('.category-section').style.display = 'block';
        document.getElementById('quiz-section').style.display = 'block';
    }

    // ========== キーボードショートカット機能 ==========

    /**
     * キーボードショートカットを処理
     * @param {KeyboardEvent} e - キーボードイベント
     */
    handleKeyboardShortcut(e) {
        // 入力欄にフォーカスがある場合はショートカットを無効化
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            return;
        }

        // 問題が表示されていない場合は一部のショートカットのみ有効
        const hasQuestions = this.currentQuestions.length > 0;

        switch(e.key) {
            case '1':
            case '2':
            case '3':
            case '4':
                // 問題が表示されており、未回答の場合のみ有効
                if (hasQuestions && this.userAnswers[this.currentQuestionIndex] === null) {
                    const answerIndex = parseInt(e.key) - 1;
                    const question = this.currentQuestions[this.currentQuestionIndex];
                    if (answerIndex < question.options.length) {
                        this.selectAnswer(answerIndex);
                        e.preventDefault();
                    }
                }
                break;

            case 'ArrowRight':
                // 次の問題へ（問題が表示されており、回答済みの場合のみ）
                if (hasQuestions && this.userAnswers[this.currentQuestionIndex] !== null) {
                    const nextBtn = document.getElementById('next-btn');
                    if (!nextBtn.disabled) {
                        this.nextQuestion();
                        e.preventDefault();
                    }
                }
                break;

            case 'ArrowLeft':
                // 前の問題へ（問題が表示されている場合）
                if (hasQuestions && this.currentQuestionIndex > 0) {
                    this.prevQuestion();
                    e.preventDefault();
                }
                break;

            case 'r':
            case 'R':
                // リセット（試験モードでは無効、問題が表示されている場合のみ）
                if (!this.examMode && hasQuestions && this.currentCategory && this.currentCategory !== 'favorites' && this.currentCategory !== 'weak' && this.currentCategory !== 'unanswered') {
                    if (confirm('問題をリセットして最初から始めますか？')) {
                        this.resetQuiz();
                    }
                    e.preventDefault();
                }
                break;

            case 'f':
            case 'F':
                // お気に入り追加/削除（試験モードでは無効、問題が表示されている場合のみ）
                if (!this.examMode && hasQuestions) {
                    const question = this.currentQuestions[this.currentQuestionIndex];
                    const categoryForFavorite = question.originalCategory || this.currentCategory;
                    this.toggleFavorite(categoryForFavorite, question.id);
                    e.preventDefault();
                }
                break;

            case 's':
            case 'S':
                // 学習統計を表示（試験モードでは無効）
                if (!this.examMode) {
                    this.showStatsPage();
                    e.preventDefault();
                }
                break;

            case 'w':
            case 'W':
                // 苦手問題を表示（試験モードでは無効）
                if (!this.examMode) {
                    this.loadWeakQuestionsOnly();
                    e.preventDefault();
                }
                break;

            case 'u':
            case 'U':
                // 未解答問題を表示（試験モードでは無効）
                if (!this.examMode) {
                    this.loadUnansweredQuestionsOnly();
                    e.preventDefault();
                }
                break;

            case '?':
                // ショートカットヘルプを表示
                this.showShortcutsModal();
                e.preventDefault();
                break;

            case 'Escape':
                // ショートカットモーダルを閉じる
                this.hideShortcutsModal();
                e.preventDefault();
                break;
        }
    }

    /**
     * キーボードショートカットのヘルプモーダルを表示
     */
    showShortcutsModal() {
        const modal = document.getElementById('shortcuts-modal');
        if (modal) {
            modal.style.display = 'flex';
        }
    }

    /**
     * キーボードショートカットのヘルプモーダルを非表示
     */
    hideShortcutsModal() {
        const modal = document.getElementById('shortcuts-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    // ========== UI/UX改善: トースト通知とヒント表示 ==========

    /**
     * トースト通知を表示
     * @param {string} message - 表示するメッセージ
     * @param {string} type - success, error, info, warning
     * @param {number} duration - 表示時間（ミリ秒）
     */
    showToast(message, type = 'info', duration = 3000) {
        // 既存のトーストがあれば削除
        const existingToast = document.querySelector('.toast');
        if (existingToast) {
            existingToast.remove();
        }

        // トースト要素を作成
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        // アイコンを選択
        let icon = '🔔';
        if (type === 'success') icon = '✅';
        else if (type === 'error') icon = '❌';
        else if (type === 'warning') icon = '⚠️';
        else if (type === 'info') icon = 'ℹ️';

        toast.innerHTML = `
            <div class="toast-icon">${icon}</div>
            <div class="toast-content">
                <div class="toast-message">${message}</div>
            </div>
        `;

        document.body.appendChild(toast);

        // 自動で削除
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    /**
     * キーボードショートカットのヒントを表示（初回のみ）
     */
    showKeyboardHint() {
        // localStorage でヒントを既に表示したかチェック
        const hintShown = localStorage.getItem('fp3-keyboard-hint-shown');

        if (!hintShown) {
            setTimeout(() => {
                // ヒント要素を作成
                const hint = document.createElement('div');
                hint.className = 'keyboard-hint';
                hint.innerHTML = `
                    <span>💡 ヒント: <kbd>?</kbd> キーでショートカット一覧を表示</span>
                `;

                document.body.appendChild(hint);

                // 8秒後に削除
                setTimeout(() => {
                    hint.style.opacity = '0';
                    hint.style.transform = 'translateX(100%)';
                    setTimeout(() => hint.remove(), 500);
                }, 8000);

                // 表示したことを記録
                localStorage.setItem('fp3-keyboard-hint-shown', 'true');
            }, 2000); // ページロード2秒後に表示
        }
    }

    /**
     * プログレスバーを作成・更新
     * @param {number} current - 現在の進捗
     * @param {number} total - 合計
     * @param {HTMLElement} container - 挿入先のコンテナ
     */
    createProgressBar(current, total, container) {
        const percent = Math.round((current / total) * 100);

        let progressBar = container.querySelector('.progress-bar');
        if (!progressBar) {
            progressBar = document.createElement('div');
            progressBar.className = 'progress-bar';
            progressBar.innerHTML = '<div class="progress-fill"></div>';
            container.appendChild(progressBar);
        }

        const progressFill = progressBar.querySelector('.progress-fill');
        progressFill.style.width = `${percent}%`;
        progressFill.setAttribute('aria-valuenow', percent);
        progressFill.setAttribute('aria-valuemin', '0');
        progressFill.setAttribute('aria-valuemax', '100');
        progressFill.setAttribute('role', 'progressbar');
        progressFill.setAttribute('aria-label', `${current}問中${total}問完了（${percent}%）`);
    }

    // ========== 本試験モード機能 ==========

    /**
     * 本試験モード確認モーダルを表示
     */
    showExamConfirmModal() {
        const modal = document.getElementById('exam-confirm-modal');
        if (modal) {
            modal.style.display = 'flex';
        }
    }

    /**
     * 本試験モード確認モーダルを非表示
     */
    hideExamConfirmModal() {
        const modal = document.getElementById('exam-confirm-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    /**
     * 本試験モードを開始
     */
    startExamMode() {
        // モーダルを閉じる
        this.hideExamConfirmModal();

        // 全カテゴリーから全問題を集める
        const allQuestions = [];
        Object.keys(questionsData).forEach(category => {
            questionsData[category].questions.forEach(question => {
                allQuestions.push({
                    ...question,
                    originalCategory: category
                });
            });
        });

        // 全180問からランダムに60問を選択
        const shuffled = this.shuffleArray(allQuestions);
        this.currentQuestions = shuffled.slice(0, 60);

        // 試験モードフラグをON
        this.examMode = true;
        this.currentCategory = 'exam'; // 特別なカテゴリー
        this.currentQuestionIndex = 0;
        this.correctCount = 0;
        this.userAnswers = new Array(60).fill(null);

        // タイマーを初期化
        this.examTimeRemaining = 3600; // 60分
        this.examStartTime = Date.now();

        // カテゴリータイトルを更新
        document.getElementById('current-category').textContent = '⏱️ 本試験モード（60分間・60問）';

        // 統計情報を更新
        document.getElementById('total-questions').textContent = '60';
        document.getElementById('correct-count').textContent = '0';

        // タイマーを表示
        const timerElement = document.getElementById('exam-timer');
        if (timerElement) {
            timerElement.style.display = 'block';
        }

        // コントロールボタンを調整（リセットボタンを非表示、試験終了ボタンを表示）
        document.getElementById('quiz-controls').style.display = 'flex';
        document.getElementById('reset-btn').style.display = 'none';
        document.getElementById('end-exam-btn').style.display = 'inline-block';

        // カテゴリーセクションを非表示
        document.querySelector('.category-section').style.display = 'none';

        // タイマーを開始
        this.examTimer = setInterval(() => this.updateExamTimer(), 1000);

        // トースト通知を表示
        this.showToast('本試験モードを開始しました！60分間、頑張ってください！', 'info', 3000);

        // 最初の問題を表示
        this.displayQuestion();
    }

    /**
     * 試験タイマーを更新（1秒ごとに呼ばれる）
     */
    updateExamTimer() {
        this.examTimeRemaining--;

        // 残り時間を表示
        const display = document.getElementById('exam-time-display');
        if (display) {
            display.textContent = this.formatTime(this.examTimeRemaining);

            // 残り5分を切ったら赤色で警告
            if (this.examTimeRemaining <= 300) {
                display.style.color = '#ff4757';
                display.style.animation = 'pulse 1s ease-in-out infinite';
            }
        }

        // 時間切れ
        if (this.examTimeRemaining <= 0) {
            clearInterval(this.examTimer);
            this.showToast('制限時間終了！自動的に採点します。', 'warning', 3000);
            setTimeout(() => this.endExamMode(true), 3000);
        }
    }

    /**
     * 秒数をMM:SS形式に変換
     * @param {number} seconds - 秒数
     * @returns {string} MM:SS形式の文字列
     */
    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
    }

    /**
     * 試験モードを終了（採点）
     * @param {boolean} autoEnd - 時間切れによる自動終了かどうか
     */
    endExamMode(autoEnd = false) {
        // 確認ダイアログ（自動終了の場合はスキップ）
        if (!autoEnd) {
            const unansweredCount = this.userAnswers.filter(a => a === null).length;
            if (unansweredCount > 0) {
                const confirmEnd = confirm(
                    `未解答の問題が${unansweredCount}問あります。\n本当に試験を終了しますか？\n\n未解答の問題は不正解として採点されます。`
                );
                if (!confirmEnd) {
                    return;
                }
            }
        }

        // タイマーを停止
        if (this.examTimer) {
            clearInterval(this.examTimer);
            this.examTimer = null;
        }

        // 試験結果を表示
        this.showExamResults();
    }

    /**
     * 試験結果を表示（本試験モード専用）
     */
    showExamResults() {
        const container = document.getElementById('quiz-container');

        // 正解数を計算（未解答は不正解扱い）
        let correctCount = 0;
        this.userAnswers.forEach((answer, index) => {
            if (answer !== null && answer === this.currentQuestions[index].correctAnswer) {
                correctCount++;
            }
        });

        const totalQuestions = 60;
        const percentage = Math.round((correctCount / totalQuestions) * 100);
        const isPassed = correctCount >= 36; // 60点以上で合格

        // 経過時間を計算
        const elapsedSeconds = 3600 - this.examTimeRemaining;
        const elapsedTime = this.formatTime(elapsedSeconds);

        // 合格・不合格判定
        let resultEmoji = '';
        let resultTitle = '';
        let resultMessage = '';
        let resultColor = '';

        if (isPassed) {
            if (percentage >= 90) {
                resultEmoji = '🎊';
                resultTitle = '優秀！満点に近い成績です！';
                resultMessage = 'この調子で本番に臨めば、確実に合格できます。素晴らしい実力です！';
                resultColor = '#28a745';
            } else if (percentage >= 80) {
                resultEmoji = '🎉';
                resultTitle = '合格！素晴らしい成績です！';
                resultMessage = '高得点で合格基準を大きく上回りました。自信を持って本番に臨んでください！';
                resultColor = '#28a745';
            } else {
                resultEmoji = '✅';
                resultTitle = '合格！よく頑張りました！';
                resultMessage = '合格基準を満たしています。苦手分野を復習すれば、さらに高得点が狙えます。';
                resultColor = '#28a745';
            }
        } else {
            if (percentage >= 50) {
                resultEmoji = '📚';
                resultTitle = '不合格 - あと少しです！';
                resultMessage = '合格まであと少し。間違えた問題を復習して、もう一度挑戦しましょう。';
                resultColor = '#ffc107';
            } else {
                resultEmoji = '💪';
                resultTitle = '不合格 - 基礎から復習しましょう';
                resultMessage = '焦らず基礎からしっかり学習しましょう。繰り返し解くことで必ず合格できます。';
                resultColor = '#dc3545';
            }
        }

        // 不正解・未解答の問題リスト
        let incorrectList = '';
        const incorrectQuestions = [];
        const unansweredQuestions = [];

        this.userAnswers.forEach((answer, index) => {
            if (answer === null) {
                unansweredQuestions.push(index + 1);
            } else if (answer !== this.currentQuestions[index].correctAnswer) {
                incorrectQuestions.push(index + 1);
            }
        });

        if (incorrectQuestions.length > 0 || unansweredQuestions.length > 0) {
            incorrectList = `
                <div style="margin-top: 2rem; padding: 1.5rem; background: #f8f9fa; border-radius: 12px; text-align: left;">
                    <h4 style="color: #dc3545; margin-bottom: 1rem;">📝 復習が必要な問題</h4>
                    ${incorrectQuestions.length > 0 ? `
                        <p style="color: #666; margin-bottom: 0.5rem;">
                            <strong>不正解の問題</strong>（${incorrectQuestions.length}問）: ${incorrectQuestions.join(', ')}
                        </p>
                    ` : ''}
                    ${unansweredQuestions.length > 0 ? `
                        <p style="color: #666;">
                            <strong>未解答の問題</strong>（${unansweredQuestions.length}問）: ${unansweredQuestions.join(', ')}
                        </p>
                    ` : ''}
                </div>
            `;
        }

        const html = `
            <div class="question" style="text-align: center;">
                <h2 style="font-size: 3.5rem; margin-bottom: 1rem;">${resultEmoji}</h2>
                <h3 style="color: ${resultColor}; margin-bottom: 1.5rem; font-size: 1.8rem;">
                    ${isPassed ? '🎊 合格 🎊' : '不合格'}
                </h3>

                <!-- 得点表示 -->
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                            color: white; padding: 2rem; border-radius: 16px;
                            margin-bottom: 2rem; box-shadow: 0 6px 20px rgba(102, 126, 234, 0.3);">
                    <p style="font-size: 3rem; margin: 0; font-weight: 700;">
                        ${correctCount} / 60
                    </p>
                    <p style="font-size: 1.2rem; margin: 0.5rem 0 0 0; opacity: 0.9;">
                        正答率: ${percentage}%
                    </p>
                    <p style="font-size: 1rem; margin: 1rem 0 0 0; opacity: 0.8;">
                        所要時間: ${elapsedTime}
                    </p>
                </div>

                <!-- 合格基準 -->
                <div style="background: #fff3cd; padding: 1.5rem; border-radius: 12px;
                            margin-bottom: 2rem; border: 2px solid #ffc107;">
                    <p style="margin: 0; color: #856404; font-size: 1.1rem;">
                        <strong>合格基準: 36問以上正解（60%以上）</strong>
                    </p>
                    <p style="margin: 0.5rem 0 0 0; color: #856404;">
                        あなたの得点: ${correctCount}問正解
                        ${isPassed ? '✅ 合格' : '❌ 不合格'}
                    </p>
                </div>

                <!-- 結果メッセージ -->
                <p style="font-size: 1.3rem; color: ${resultColor}; font-weight: 600; margin-bottom: 1rem;">
                    ${resultTitle}
                </p>
                <p style="font-size: 1rem; color: #666; margin-bottom: 2rem; line-height: 1.6;">
                    ${resultMessage}
                </p>

                ${incorrectList}

                <!-- アクションボタン -->
                <div style="margin-top: 2rem; display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
                    <button class="btn btn-primary" onclick="location.reload()"
                            style="padding: 1rem 3rem; font-size: 1.1rem;">
                        🏠 トップに戻る
                    </button>
                </div>

                <p style="margin-top: 2rem; color: #999; font-size: 0.9rem;">
                    ※ 本試験モードの結果は学習統計に記録されません
                </p>
            </div>
        `;

        container.innerHTML = html;

        // タイマーを非表示
        const timerElement = document.getElementById('exam-timer');
        if (timerElement) {
            timerElement.style.display = 'none';
        }

        // コントロールボタンを非表示
        document.getElementById('quiz-controls').style.display = 'none';
    }
}

// アプリケーションの初期化
let quizApp;
document.addEventListener('DOMContentLoaded', () => {
    quizApp = new QuizApp();
});
