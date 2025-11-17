// FP3級学習サイト メインスクリプト

class QuizApp {
    constructor() {
        this.currentCategory = null;
        this.currentQuestions = [];
        this.currentQuestionIndex = 0;
        this.correctCount = 0;
        this.userAnswers = [];
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
    }

    loadCategory(category) {
        if (!questionsData[category]) {
            console.error('カテゴリーが見つかりません:', category);
            return;
        }

        this.currentCategory = category;
        this.currentQuestions = questionsData[category].questions;
        this.currentQuestionIndex = 0;
        this.correctCount = 0;
        this.userAnswers = new Array(this.currentQuestions.length).fill(null);

        // カテゴリータイトルを更新
        document.getElementById('current-category').textContent = questionsData[category].title;

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

        // 問題HTMLを生成
        let html = `
            <div class="question">
                <p class="question-text">
                    <strong>問題${this.currentQuestionIndex + 1}:</strong> ${question.question}
                </p>
                <ul class="options">
        `;

        question.options.forEach((option, index) => {
            const isSelected = this.userAnswers[this.currentQuestionIndex] === index;
            const isCorrect = index === question.correctAnswer;
            const isAnswered = this.userAnswers[this.currentQuestionIndex] !== null;

            let optionClass = 'option';
            if (isAnswered) {
                optionClass += ' disabled';
                if (isSelected && isCorrect) {
                    optionClass += ' correct';
                } else if (isSelected && !isCorrect) {
                    optionClass += ' incorrect';
                } else if (isCorrect) {
                    optionClass += ' correct';
                }
            } else if (isSelected) {
                optionClass += ' selected';
            }

            html += `
                <li class="${optionClass}" data-index="${index}">
                    ${index + 1}. ${option}
                </li>
            `;
        });

        html += `
                </ul>
                <div class="explanation ${this.userAnswers[this.currentQuestionIndex] !== null ? 'show' : ''}">
                    <h4>解説</h4>
                    <p>${question.explanation}</p>
                </div>
            </div>
        `;

        container.innerHTML = html;

        // オプションのクリックイベント
        const options = container.querySelectorAll('.option:not(.disabled)');
        options.forEach(option => {
            option.addEventListener('click', () => {
                const index = parseInt(option.dataset.index);
                this.selectAnswer(index);
            });
        });

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

        // 問題を再表示（解説を表示）
        this.displayQuestion();

        // 自動的に次の問題へ進む（最後の問題以外）
        if (this.currentQuestionIndex < this.currentQuestions.length - 1) {
            setTimeout(() => {
                this.nextQuestion();
            }, 2000);
        } else {
            // 最後の問題の場合、結果を表示
            setTimeout(() => {
                this.showResults();
            }, 2000);
        }
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
        }
    }

    resetQuiz() {
        this.currentQuestionIndex = 0;
        this.correctCount = 0;
        this.userAnswers = new Array(this.currentQuestions.length).fill(null);
        document.getElementById('correct-count').textContent = '0';
        this.displayQuestion();
    }

    updateButtons() {
        const prevBtn = document.getElementById('prev-btn');
        const nextBtn = document.getElementById('next-btn');

        prevBtn.disabled = this.currentQuestionIndex === 0;
        nextBtn.disabled = this.currentQuestionIndex === this.currentQuestions.length - 1;
    }

    showResults() {
        const container = document.getElementById('quiz-container');
        const percentage = Math.round((this.correctCount / this.currentQuestions.length) * 100);

        let message = '';
        let emoji = '';

        if (percentage >= 80) {
            message = '素晴らしい！合格レベルです！';
            emoji = '🎉';
        } else if (percentage >= 60) {
            message = '合格ラインに到達しました！';
            emoji = '✅';
        } else if (percentage >= 40) {
            message = 'もう少しです。復習しましょう！';
            emoji = '📚';
        } else {
            message = '基礎から復習が必要です。';
            emoji = '💪';
        }

        const html = `
            <div class="question" style="text-align: center;">
                <h2 style="font-size: 3rem; margin-bottom: 1rem;">${emoji}</h2>
                <h3 style="color: #667eea; margin-bottom: 1rem;">結果発表</h3>
                <p style="font-size: 1.5rem; margin-bottom: 1rem;">
                    <strong>${this.correctCount}</strong> / ${this.currentQuestions.length} 問正解
                </p>
                <p style="font-size: 2rem; color: #764ba2; margin-bottom: 1rem;">
                    正答率: <strong>${percentage}%</strong>
                </p>
                <p style="font-size: 1.2rem; color: #666;">
                    ${message}
                </p>
                <button class="btn btn-primary" onclick="quizApp.resetQuiz()" style="margin-top: 2rem; padding: 1rem 3rem; font-size: 1.1rem;">
                    もう一度挑戦
                </button>
            </div>
        `;

        container.innerHTML = html;
    }
}

// アプリケーションの初期化
let quizApp;
document.addEventListener('DOMContentLoaded', () => {
    quizApp = new QuizApp();
});
