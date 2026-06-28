const bank = window.QUESTION_BANK.questions;
const EXAM_TOTAL = 60;
const EXAM_SHORT_COUNT = 5;
const EXAM_PROGRAM_COUNT = 4;
const EXAM_OBJECTIVE_COUNT = EXAM_TOTAL - EXAM_SHORT_COUNT - EXAM_PROGRAM_COUNT;

const state = {
  autoShow: localStorage.getItem('autoShowAnswer') === '1',
  mode: null,
  practiceFilter: 'all',
  order: [],
  index: 0,
  answers: {},
  submitted: {},
  timerId: null,
  examEndsAt: null,
};

const view = document.getElementById('view');
const timer = document.getElementById('timer');
document.getElementById('homeBtn').addEventListener('click', showHome);

function shuffle(arr) {
  const copy = arr.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function questionIndexesByType(type) {
  return bank.map((q, i) => q.type === type ? i : -1).filter(i => i >= 0);
}

function objectiveQuestionIndexes() {
  return bank.map((q, i) => ['blank', 'truefalse', 'choice'].includes(q.type) ? i : -1).filter(i => i >= 0);
}

function allQuestionIndexes() {
  return bank.map((_, i) => i);
}

function practiceIndexes(filter) {
  if (filter === 'objective') return objectiveQuestionIndexes();
  if (filter === 'short') return questionIndexesByType('short');
  if (filter === 'program') return questionIndexesByType('program');
  return allQuestionIndexes();
}

function practiceFilterTitle(filter) {
  return {
    all: '全部题',
    objective: '客观题',
    short: '简答题',
    program: '编程题'
  }[filter] || '全部题';
}

function countInIndexes(indexes, type) {
  return indexes.filter(i => bank[i].type === type).length;
}

function takeRandom(indexes, count, label) {
  if (indexes.length < count) {
    throw new Error(`${label}数量不足，无法抽取 ${count} 道。`);
  }
  return shuffle(indexes).slice(0, count);
}

function buildExamOrder() {
  const short = takeRandom(questionIndexesByType('short'), EXAM_SHORT_COUNT, '简答题');
  const program = takeRandom(questionIndexesByType('program'), EXAM_PROGRAM_COUNT, '编程题');
  const objective = takeRandom(objectiveQuestionIndexes(), EXAM_OBJECTIVE_COUNT, '客观题');
  return shuffle([...objective, ...short, ...program]);
}

function examQuestions() {
  return state.order.map(i => bank[i]);
}

function byType(type) {
  return bank.filter(q => q.type === type).length;
}

function render(html) {
  view.innerHTML = html;
}

function stopTimer() {
  if (state.timerId) clearInterval(state.timerId);
  state.timerId = null;
  timer.hidden = true;
}

function showHome() {
  stopTimer();
  state.mode = null;
  render(`
    <section class="screen">
      <div class="home-grid">
        <div class="hero">
          <h2>完整题库练习</h2>
          <p>题库来自 Word 最终版，共 ${bank.length} 题。客观题自动判分，简答题和编程题提供参考答案自评。</p>
          <div class="stats">
            <div class="stat"><strong>${bank.length}</strong><span>总题数</span></div>
            <div class="stat"><strong>${byType('blank') + byType('truefalse') + byType('choice')}</strong><span>客观题</span></div>
            <div class="stat"><strong>${byType('short')}</strong><span>简答题</span></div>
            <div class="stat"><strong>${byType('program')}</strong><span>编程/案例题</span></div>
          </div>
          <div class="mode-list">
            <button class="mode-card" onclick="startPractice('ordered', 'all')">
              <h3>顺序练习</h3>
              <p>按 Word 中的原始顺序逐题练习，适合系统复习。</p>
            </button>
            <button class="mode-card" onclick="startPractice('random', 'all')">
              <h3>乱序练习</h3>
              <p>每次随机打乱全部题目，适合查漏补缺。</p>
            </button>
            <button class="mode-card" onclick="startExam()">
              <h3>模拟考试</h3>
              <p>随机抽 60 题：5 道简答、4 道编程，其余为客观题。60 分钟倒计时，提交后批改并列出错题。</p>
            </button>
          </div>
          <h3 class="section-label">分类窗口</h3>
          <div class="mode-list category-list">
            <button class="mode-card" onclick="showPracticeWindow('all')">
              <h3>全部题</h3>
              <p>${bank.length} 题，包含客观题、简答题和编程题。</p>
            </button>
            <button class="mode-card" onclick="showPracticeWindow('objective')">
              <h3>客观题</h3>
              <p>${practiceIndexes('objective').length} 题，包含填空、判断和选择。</p>
            </button>
            <button class="mode-card" onclick="showPracticeWindow('short')">
              <h3>简答题</h3>
              <p>${practiceIndexes('short').length} 题，只练简答。</p>
            </button>
            <button class="mode-card" onclick="showPracticeWindow('program')">
              <h3>编程题</h3>
              <p>${practiceIndexes('program').length} 题，包含编程和案例题。</p>
            </button>
          </div>
        </div>
        <aside class="settings">
          <div class="switch-row">
            <div>
              <h3>答题后自动显示答案</h3>
              <p>打开后，练习模式每次作答后立即显示解析/参考答案；关闭时需要手动查看。</p>
            </div>
            <label class="switch">
              <input id="autoSwitch" type="checkbox" ${state.autoShow ? 'checked' : ''}>
              <span class="slider"></span>
            </label>
          </div>
        </aside>
      </div>
    </section>
  `);
  document.getElementById('autoSwitch').addEventListener('change', e => {
    state.autoShow = e.target.checked;
    localStorage.setItem('autoShowAnswer', state.autoShow ? '1' : '0');
  });
}

function showPracticeWindow(filter) {
  stopTimer();
  state.mode = 'window';
  state.practiceFilter = filter;
  const indexes = practiceIndexes(filter);
  const objective = indexes.filter(i => ['blank', 'truefalse', 'choice'].includes(bank[i].type)).length;
  const short = countInIndexes(indexes, 'short');
  const program = countInIndexes(indexes, 'program');
  render(`
    <section class="screen">
      <div class="toolbar">
        <span class="pill">${practiceFilterTitle(filter)}</span>
        <span class="pill">共 ${indexes.length} 题</span>
      </div>
      <article class="question-card">
        <div class="meta">
          <span class="pill">客观题 ${objective}</span>
          <span class="pill">简答题 ${short}</span>
          <span class="pill">编程题 ${program}</span>
        </div>
        <div class="question-body">${practiceFilterTitle(filter)}练习</div>
        <div class="mode-list">
          <button class="mode-card" onclick="startPractice('ordered', '${filter}')">
            <h3>顺序练习</h3>
            <p>按原文档顺序练这一类题。</p>
          </button>
          <button class="mode-card" onclick="startPractice('random', '${filter}')">
            <h3>乱序练习</h3>
            <p>每次进入随机打乱这一类题。</p>
          </button>
        </div>
        <div class="actions">
          <button class="secondary" onclick="showHome()">返回主页</button>
        </div>
      </article>
    </section>
  `);
}

function startPractice(mode, filter = 'all') {
  stopTimer();
  state.mode = mode;
  state.practiceFilter = filter;
  const indexes = practiceIndexes(filter);
  state.order = mode === 'random' ? shuffle(indexes) : indexes;
  state.index = 0;
  state.answers = {};
  state.submitted = {};
  showPracticeQuestion();
}

function currentQuestion() {
  return bank[state.order[state.index]];
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}

function inputName(q) {
  return `q_${q.id}`;
}

function renderAnswerInput(q, value = '') {
  if (q.type === 'choice') {
    const multi = (q.answers || []).length > 1;
    return `<div class="options">${q.options.map(o => `
      <label class="option">
        <input type="${multi ? 'checkbox' : 'radio'}" name="${inputName(q)}" value="${o.key}" ${Array.isArray(value) && value.includes(o.key) ? 'checked' : ''}>
        <strong>${o.key}.</strong><span>${esc(o.text)}</span>
      </label>`).join('')}</div>`;
  }
  if (q.type === 'truefalse') {
    return `<div class="options">
      <label class="option"><input type="radio" name="${inputName(q)}" value="√" ${value === '√' ? 'checked' : ''}> √ 正确</label>
      <label class="option"><input type="radio" name="${inputName(q)}" value="×" ${value === '×' ? 'checked' : ''}> × 错误</label>
    </div>`;
  }
  if (q.type === 'blank') {
    const count = Math.max((q.answers || []).length, (q.body.match(/_{2,}/g) || []).length, 1);
    return `<div class="options">${Array.from({length: count}).map((_, i) => `
      <input type="text" data-blank="${i}" placeholder="第 ${i + 1} 空" value="${esc((value || [])[i] || '')}">
    `).join('')}</div>`;
  }
  return `<textarea placeholder="${q.type === 'program' ? '在这里写代码或思路' : '在这里作答'}">${esc(value || '')}</textarea>`;
}

function collectAnswer(q, root = document) {
  if (q.type === 'choice') {
    return [...root.querySelectorAll(`input[name="${inputName(q)}"]:checked`)].map(x => x.value).sort();
  }
  if (q.type === 'truefalse') {
    const el = root.querySelector(`input[name="${inputName(q)}"]:checked`);
    return el ? el.value : '';
  }
  if (q.type === 'blank') {
    return [...root.querySelectorAll('[data-blank]')].map(x => x.value.trim());
  }
  const ta = root.querySelector('textarea');
  return ta ? ta.value : '';
}

function normalize(s) {
  return String(s ?? '').trim().replace(/\s+/g, '').replace(/（/g, '(').replace(/）/g, ')').toLowerCase();
}

function gradeQuestion(q, ans) {
  if (q.type === 'choice') {
    const expected = (q.answers || []).slice().sort();
    if (!expected.length) return {gradable: true, correct: false, expected: '无正确选项'};
    return {gradable: true, correct: JSON.stringify(ans || []) === JSON.stringify(expected), expected: expected.join('、')};
  }
  if (q.type === 'truefalse') {
    return {gradable: true, correct: ans === q.answer, expected: q.answer};
  }
  if (q.type === 'blank') {
    const expected = q.answers || [];
    const correct = expected.every((e, i) => normalize((ans || [])[i]) === normalize(e));
    return {gradable: true, correct, expected: expected.join('；')};
  }
  return {gradable: false, correct: null, expected: q.reference || '见参考答案'};
}

function answerBlock(q, ans) {
  const g = gradeQuestion(q, ans);
  const cls = !g.gradable ? '' : g.correct ? 'correct' : 'wrong';
  const title = !g.gradable ? '参考答案' : g.correct ? '正确' : '需要再看';
  const expected = q.type === 'short' || q.type === 'program' ? q.reference : g.expected;
  return `<div class="feedback ${cls}">
    <strong>${title}</strong>
    ${q.note ? `<p>${esc(q.note)}</p>` : ''}
    <div class="reference">${esc(expected || '无参考答案')}</div>
  </div>`;
}

function showPracticeQuestion(forceAnswer = false) {
  const q = currentQuestion();
  const progress = ((state.index + 1) / state.order.length) * 100;
  const saved = state.answers[q.id];
  const submitted = state.submitted[q.id];
  render(`
    <section class="screen">
      <div class="toolbar">
        <span class="pill">${practiceFilterTitle(state.practiceFilter)}</span>
        <span class="pill">${state.mode === 'random' ? '乱序练习' : '顺序练习'}</span>
        <span class="pill">${state.index + 1} / ${state.order.length}</span>
        <div class="progress"><span style="width:${progress}%"></span></div>
      </div>
      <article class="question-card" id="questionCard">
        <div class="meta">
          <span class="pill">${esc(q.section)}</span>
          <span class="pill">${esc(q.category)}</span>
          <span class="pill">${typeName(q.type)}</span>
        </div>
        <div class="question-body">${esc(q.number + '. ' + q.body)}</div>
        ${q.options?.length ? '' : ''}
        ${renderAnswerInput(q, saved)}
        <div class="actions">
          <button class="primary" onclick="submitPractice()">提交本题</button>
          <button class="secondary" onclick="toggleAnswer()">查看答案</button>
          <button class="secondary" onclick="prevQuestion()">上一题</button>
          <button class="secondary" onclick="nextQuestion()">下一题</button>
        </div>
        <div id="answerSlot">${(forceAnswer || (submitted && state.autoShow)) ? answerBlock(q, saved) : ''}</div>
      </article>
    </section>
  `);
}

function typeName(type) {
  return {blank:'填空题', truefalse:'判断题', choice:'选择题', short:'简答题', program:'编程/案例题'}[type] || type;
}

function submitPractice() {
  const q = currentQuestion();
  const ans = collectAnswer(q);
  state.answers[q.id] = ans;
  state.submitted[q.id] = true;
  if (state.autoShow) {
    document.getElementById('answerSlot').innerHTML = answerBlock(q, ans);
  }
}

function toggleAnswer() {
  const q = currentQuestion();
  const ans = collectAnswer(q);
  state.answers[q.id] = ans;
  document.getElementById('answerSlot').innerHTML = answerBlock(q, ans);
}

function prevQuestion() {
  const q = currentQuestion();
  state.answers[q.id] = collectAnswer(q);
  state.index = Math.max(0, state.index - 1);
  showPracticeQuestion();
}

function nextQuestion() {
  const q = currentQuestion();
  state.answers[q.id] = collectAnswer(q);
  state.index = Math.min(state.order.length - 1, state.index + 1);
  showPracticeQuestion();
}

function startExam() {
  state.mode = 'exam';
  state.order = buildExamOrder();
  state.answers = {};
  state.submitted = {};
  state.examEndsAt = Date.now() + 60 * 60 * 1000;
  timer.hidden = false;
  state.timerId = setInterval(updateTimer, 250);
  updateTimer();
  renderExam();
}

function updateTimer() {
  const left = Math.max(0, state.examEndsAt - Date.now());
  const m = Math.floor(left / 60000);
  const s = Math.floor((left % 60000) / 1000);
  timer.textContent = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  if (left <= 0) {
    submitExam();
  }
}

function openQuestionList() {
  if (state.mode !== 'exam') return;
  const questions = examQuestions();
  const modal = document.createElement('div');
  modal.className = 'modal-backdrop';
  modal.id = 'questionListModal';
  modal.innerHTML = `
    <div class="question-modal" role="dialog" aria-modal="true" aria-label="题目列表">
      <header>
        <div>
          <h3>题目列表</h3>
          <p style="margin:4px 0 0;color:var(--muted);font-size:13px;">点击题号跳到对应题目</p>
        </div>
        <button class="icon-btn" onclick="closeQuestionList()" title="关闭">×</button>
      </header>
      <div class="question-grid">
        ${questions.map((q, i) => `<button class="question-jump" onclick="jumpToExamQuestion(${i})">${i + 1}</button>`).join('')}
      </div>
    </div>
  `;
  modal.addEventListener('click', event => {
    if (event.target === modal) closeQuestionList();
  });
  document.body.appendChild(modal);
}

function closeQuestionList() {
  const modal = document.getElementById('questionListModal');
  if (modal) modal.remove();
}

function jumpToExamQuestion(index) {
  closeQuestionList();
  const target = document.querySelector(`[data-exam-index="${index}"]`);
  if (!target) return;
  target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  target.classList.add('jump-highlight');
  setTimeout(() => target.classList.remove('jump-highlight'), 1400);
}

function renderExam() {
  const questions = examQuestions();
  render(`
    <section class="screen">
      <div class="toolbar">
        <span class="pill">模拟考试</span>
        <span class="pill">随机 ${questions.length} 题</span>
        <span class="pill">5 简答 · 4 编程 · ${EXAM_OBJECTIVE_COUNT} 客观</span>
        <span class="pill">60分钟</span>
        <button class="pill question-list-btn" onclick="openQuestionList()">共 ${questions.length} 题</button>
      </div>
      <div class="exam-list">
        ${questions.map((q, i) => `
          <article class="exam-question" data-exam-id="${q.id}" data-exam-index="${i}">
            <div class="meta"><span class="pill">${i + 1}</span><span class="pill">${esc(q.section)}</span><span class="pill">${typeName(q.type)}</span></div>
            <div class="question-body">${esc(q.body)}</div>
            ${renderAnswerInput(q)}
          </article>
        `).join('')}
      </div>
      <div class="actions">
        <button class="primary" onclick="submitExam()">提交试卷</button>
        <button class="danger" onclick="showHome()">退出考试</button>
      </div>
    </section>
  `);
}

function collectExamAnswers() {
  const answers = {};
  for (const q of examQuestions()) {
    const root = document.querySelector(`[data-exam-id="${q.id}"]`);
    answers[q.id] = root ? collectAnswer(q, root) : undefined;
  }
  return answers;
}

function submitExam() {
  if (state.mode !== 'exam') return;
  stopTimer();
  const answers = collectExamAnswers();
  const questions = examQuestions();
  const gradable = questions.filter(q => gradeQuestion(q, answers[q.id]).gradable);
  const correct = gradable.filter(q => gradeQuestion(q, answers[q.id]).correct);
  const manual = questions.length - gradable.length;
  const score = gradable.length ? Math.round((correct.length / gradable.length) * 100) : 0;
  const wrong = gradable.filter(q => !gradeQuestion(q, answers[q.id]).correct);

  render(`
    <section class="screen">
      <h2>考试结果</h2>
      <div class="result-grid">
        <div class="stat"><strong>${score}</strong><span>客观题得分</span></div>
        <div class="stat"><strong>${correct.length}/${gradable.length}</strong><span>客观题正确</span></div>
        <div class="stat"><strong>${manual}</strong><span>简答/编程待自评</span></div>
      </div>
      <h3>错题</h3>
      <div class="wrong-list">
        ${wrong.length ? wrong.map(q => {
          const g = gradeQuestion(q, answers[q.id]);
          return `<article class="exam-question">
            <div class="meta"><span class="pill">${esc(q.section)}</span><span class="pill">${typeName(q.type)}</span></div>
            <div class="question-body">${esc(q.number + '. ' + q.body)}</div>
            <p><strong>你的答案：</strong>${esc(Array.isArray(answers[q.id]) ? answers[q.id].join('、') : answers[q.id] || '未作答')}</p>
            <p><strong>正确答案：</strong>${esc(g.expected)}</p>
          </article>`;
        }).join('') : '<p>客观题没有错题。</p>'}
      </div>
      <h3>待自评题</h3>
      <p>简答题和编程题不自动判分。你可以回到练习模式逐题查看参考答案。</p>
      <div class="actions"><button class="primary" onclick="showHome()">返回主页</button></div>
    </section>
  `);
}

showHome();
