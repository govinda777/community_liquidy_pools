// Estado global da aplicação
class MountainCarSimulator {
    constructor() {
        this.canvas = document.getElementById('mountainCarCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Parâmetros do ambiente Mountain Car
        this.minPosition = -1.2;
        this.maxPosition = 0.6;
        this.maxSpeed = 0.07;
        this.goalPosition = 0.5;
        
        // Discretização do espaço de estados
        this.positionBins = 20;
        this.velocityBins = 20;
        
        // Estado atual
        this.position = -0.5;
        this.velocity = 0;
        
        // Parâmetros Q-Learning
        this.alpha = 0.1;
        this.gamma = 0.99;
        this.epsilon = 0.1;
        
        // Q-Table
        this.qTable = this.initializeQTable();
        
        // Estatísticas
        this.episode = 0;
        this.steps = 0;
        this.totalReward = 0;
        this.episodeRewards = [];
        
        // Estado da simulação
        this.isRunning = false;
        this.isPaused = false;
        this.stepMode = false;
        
        // Chart para recompensas
        this.initializeChart();
        
        // Event listeners
        this.setupEventListeners();
        
        // Inicializar Q-Table display
        this.updateQTableDisplay();
        
        // Desenhar estado inicial
        this.draw();
    }
    
    initializeQTable() {
        const qTable = {};
        for (let p = 0; p < this.positionBins; p++) {
            for (let v = 0; v < this.velocityBins; v++) {
                const state = `${p},${v}`;
                qTable[state] = [0, 0, 0]; // [esquerda, parar, direita]
            }
        }
        return qTable;
    }
    
    discretizeState(position, velocity) {
        const pBin = Math.floor((position - this.minPosition) / 
                               (this.maxPosition - this.minPosition) * this.positionBins);
        const vBin = Math.floor((velocity + this.maxSpeed) / 
                               (2 * this.maxSpeed) * this.velocityBins);
        
        const pIndex = Math.max(0, Math.min(this.positionBins - 1, pBin));
        const vIndex = Math.max(0, Math.min(this.velocityBins - 1, vBin));
        
        return `${pIndex},${vIndex}`;
    }
    
    getHeight(position) {
        // Função da montanha do Mountain Car
        return Math.sin(3 * position) * 0.45 + 0.55;
    }
    
    takeAction(action) {
        // 0: acelerar esquerda, 1: não acelerar, 2: acelerar direita
        const force = (action === 0) ? -0.001 : (action === 2) ? 0.001 : 0;
        
        this.velocity += force + Math.cos(3 * this.position) * (-0.0025);
        this.velocity = Math.max(-this.maxSpeed, Math.min(this.maxSpeed, this.velocity));
        
        this.position += this.velocity;
        this.position = Math.max(this.minPosition, Math.min(this.maxPosition, this.position));
        
        if (this.position === this.minPosition && this.velocity < 0) {
            this.velocity = 0;
        }
        
        // Recompensa
        const reward = (this.position >= this.goalPosition) ? 0 : -1;
        const done = this.position >= this.goalPosition;
        
        return { reward, done };
    }
    
    chooseAction(state) {
        if (Math.random() < this.epsilon) {
            return Math.floor(Math.random() * 3); // Exploração
        } else {
            const qValues = this.qTable[state];
            return qValues.indexOf(Math.max(...qValues)); // Exploração
        }
    }
    
    updateQTable(state, action, reward, nextState) {
        const qValues = this.qTable[state];
        const nextQValues = this.qTable[nextState];
        const maxNextQ = Math.max(...nextQValues);
        
        qValues[action] = qValues[action] + this.alpha * 
                         (reward + this.gamma * maxNextQ - qValues[action]);
    }
    
    resetEnvironment() {
        this.position = -0.5 + (Math.random() - 0.5) * 0.2; // Posição inicial aleatória
        this.velocity = 0;
        this.steps = 0;
        this.totalReward = 0;
    }
    
    step() {
        if (!this.isRunning && !this.stepMode) return;
        
        const state = this.discretizeState(this.position, this.velocity);
        const action = this.chooseAction(state);
        const { reward, done } = this.takeAction(action);
        const nextState = this.discretizeState(this.position, this.velocity);
        
        this.updateQTable(state, action, reward, nextState);
        
        this.steps++;
        this.totalReward += reward;
        
        this.updateStats();
        this.draw();
        
        if (done || this.steps >= 1000) {
            this.episodeRewards.push(this.totalReward);
            this.episode++;
            this.updateChart();
            this.updateQTableDisplay();
            this.resetEnvironment();
        }
        
        if (this.stepMode) {
            this.stepMode = false;
            return;
        }
        
        if (this.isRunning && !this.isPaused) {
            setTimeout(() => this.step(), 50);
        }
    }
    
    draw() {
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;
        
        // Limpar canvas
        ctx.clearRect(0, 0, width, height);
        
        // Desenhar montanha
        ctx.strokeStyle = '#2D7A2D';
        ctx.lineWidth = 3;
        ctx.beginPath();
        
        for (let x = 0; x <= width; x++) {
            const position = this.minPosition + (x / width) * (this.maxPosition - this.minPosition);
            const mountainHeight = this.getHeight(position);
            const y = height - (mountainHeight * height);
            
            if (x === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        
        // Completar a montanha
        ctx.lineTo(width, height);
        ctx.lineTo(0, height);
        ctx.closePath();
        
        // Preencher montanha
        ctx.fillStyle = '#90EE90';
        ctx.fill();
        ctx.stroke();
        
        // Desenhar linha de objetivo
        const goalX = (this.goalPosition - this.minPosition) / (this.maxPosition - this.minPosition) * width;
        ctx.strokeStyle = '#FF4444';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(goalX, 0);
        ctx.lineTo(goalX, height);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Desenhar carro
        const carX = (this.position - this.minPosition) / (this.maxPosition - this.minPosition) * width;
        const carY = height - (this.getHeight(this.position) * height) - 15;
        
        // Corpo do carro
        ctx.fillStyle = '#4A90E2';
        ctx.fillRect(carX - 15, carY - 10, 30, 15);
        
        // Rodas
        ctx.fillStyle = '#333';
        ctx.beginPath();
        ctx.arc(carX - 8, carY + 8, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(carX + 8, carY + 8, 5, 0, Math.PI * 2);
        ctx.fill();
        
        // Seta da velocidade
        if (Math.abs(this.velocity) > 0.001) {
            ctx.strokeStyle = this.velocity > 0 ? '#00AA00' : '#AA0000';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(carX, carY - 20);
            const arrowLength = Math.abs(this.velocity) * 300;
            const arrowX = carX + (this.velocity > 0 ? arrowLength : -arrowLength);
            ctx.lineTo(arrowX, carY - 20);
            
            // Ponta da seta
            const direction = this.velocity > 0 ? 1 : -1;
            ctx.lineTo(arrowX - (5 * direction), carY - 25);
            ctx.moveTo(arrowX, carY - 20);
            ctx.lineTo(arrowX - (5 * direction), carY - 15);
            ctx.stroke();
        }
        
        // Texto de informações
        ctx.fillStyle = '#333';
        ctx.font = '14px Arial';
        ctx.fillText(`Posição: ${this.position.toFixed(3)}`, 10, 20);
        ctx.fillText(`Velocidade: ${this.velocity.toFixed(4)}`, 10, 40);
        
        if (this.position >= this.goalPosition) {
            ctx.fillStyle = '#00AA00';
            ctx.font = 'bold 24px Arial';
            ctx.fillText('OBJETIVO ALCANÇADO!', width/2 - 100, height/2);
        }
    }
    
    updateStats() {
        const episodeEl = document.getElementById('episode');
        const stepsEl = document.getElementById('steps');
        const totalRewardEl = document.getElementById('totalReward');
        const positionEl = document.getElementById('position');
        const velocityEl = document.getElementById('velocity');
        
        if (episodeEl) episodeEl.textContent = this.episode;
        if (stepsEl) stepsEl.textContent = this.steps;
        if (totalRewardEl) totalRewardEl.textContent = this.totalReward;
        if (positionEl) positionEl.textContent = this.position.toFixed(3);
        if (velocityEl) velocityEl.textContent = this.velocity.toFixed(4);
    }
    
    initializeChart() {
        const chartCanvas = document.getElementById('rewardChart');
        if (!chartCanvas) return;
        
        const ctx = chartCanvas.getContext('2d');
        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Recompensa por Episódio',
                    data: [],
                    borderColor: '#1FB8CD',
                    backgroundColor: 'rgba(31, 184, 205, 0.1)',
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: false
                    }
                },
                plugins: {
                    legend: {
                        display: true
                    }
                }
            }
        });
    }
    
    updateChart() {
        if (!this.chart) return;
        
        const maxPoints = 100;
        if (this.episodeRewards.length > maxPoints) {
            this.episodeRewards = this.episodeRewards.slice(-maxPoints);
        }
        
        this.chart.data.labels = this.episodeRewards.map((_, i) => i + 1);
        this.chart.data.datasets[0].data = this.episodeRewards;
        this.chart.update();
    }
    
    updateQTableDisplay() {
        const tbody = document.getElementById('qtableBody');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        // Mostrar apenas uma amostra dos estados
        const sampleStates = [];
        for (let p = 0; p < this.positionBins; p += 4) {
            for (let v = 0; v < this.velocityBins; v += 4) {
                sampleStates.push(`${p},${v}`);
            }
        }
        
        sampleStates.slice(0, 15).forEach(state => {
            const qValues = this.qTable[state];
            const maxValue = Math.max(...qValues);
            const bestAction = qValues.indexOf(maxValue);
            const actionNames = ['Esquerda', 'Parar', 'Direita'];
            
            const row = tbody.insertRow();
            row.insertCell(0).textContent = state;
            
            qValues.forEach((value, index) => {
                const cell = row.insertCell(index + 1);
                cell.textContent = value.toFixed(3);
                if (value === maxValue && Math.abs(value) > 0.001) {
                    cell.classList.add('high-value');
                }
            });
            
            const bestActionCell = row.insertCell(4);
            bestActionCell.innerHTML = `<span class="best-action">${actionNames[bestAction]}</span>`;
        });
    }
    
    setupEventListeners() {
        // Controles de parâmetros
        const alphaSlider = document.getElementById('alpha');
        const gammaSlider = document.getElementById('gamma');
        const epsilonSlider = document.getElementById('epsilon');
        
        if (alphaSlider) {
            alphaSlider.addEventListener('input', (e) => {
                this.alpha = parseFloat(e.target.value);
                const valueEl = document.getElementById('alphaValue');
                if (valueEl) valueEl.textContent = this.alpha.toFixed(2);
            });
        }
        
        if (gammaSlider) {
            gammaSlider.addEventListener('input', (e) => {
                this.gamma = parseFloat(e.target.value);
                const valueEl = document.getElementById('gammaValue');
                if (valueEl) valueEl.textContent = this.gamma.toFixed(2);
            });
        }
        
        if (epsilonSlider) {
            epsilonSlider.addEventListener('input', (e) => {
                this.epsilon = parseFloat(e.target.value);
                const valueEl = document.getElementById('epsilonValue');
                if (valueEl) valueEl.textContent = this.epsilon.toFixed(2);
            });
        }
        
        // Botões de controle
        const startBtn = document.getElementById('startBtn');
        const pauseBtn = document.getElementById('pauseBtn');
        const resetBtn = document.getElementById('resetBtn');
        const stepBtn = document.getElementById('stepBtn');
        
        if (startBtn) {
            startBtn.addEventListener('click', () => this.start());
        }
        
        if (pauseBtn) {
            pauseBtn.addEventListener('click', () => this.pause());
        }
        
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.reset());
        }
        
        if (stepBtn) {
            stepBtn.addEventListener('click', () => this.stepOnce());
        }
    }
    
    start() {
        this.isRunning = true;
        this.isPaused = false;
        
        const startBtn = document.getElementById('startBtn');
        const pauseBtn = document.getElementById('pauseBtn');
        
        if (startBtn) startBtn.disabled = true;
        if (pauseBtn) pauseBtn.disabled = false;
        
        this.step();
    }
    
    pause() {
        this.isPaused = !this.isPaused;
        const pauseBtn = document.getElementById('pauseBtn');
        
        if (pauseBtn) {
            pauseBtn.textContent = this.isPaused ? 'Retomar' : 'Pausar';
        }
        
        if (!this.isPaused) {
            this.step();
        }
    }
    
    reset() {
        this.isRunning = false;
        this.isPaused = false;
        this.episode = 0;
        this.episodeRewards = [];
        this.qTable = this.initializeQTable();
        this.resetEnvironment();
        
        // Reset UI
        const startBtn = document.getElementById('startBtn');
        const pauseBtn = document.getElementById('pauseBtn');
        
        if (startBtn) startBtn.disabled = false;
        if (pauseBtn) {
            pauseBtn.disabled = true;
            pauseBtn.textContent = 'Pausar';
        }
        
        this.updateStats();
        this.updateChart();
        this.updateQTableDisplay();
        this.draw();
    }
    
    stepOnce() {
        this.stepMode = true;
        this.step();
    }
}

// Navegação e funcionalidades da página
function initializeNavigation() {
    // Navegação suave
    const navLinks = document.querySelectorAll('a[href^="#"]');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href').substring(1);
            const targetElement = document.getElementById(targetId);
            
            if (targetElement) {
                const header = document.querySelector('.header');
                const headerHeight = header ? header.offsetHeight : 0;
                const targetPosition = targetElement.offsetTop - headerHeight - 20;
                
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
                
                // Atualizar link ativo
                navLinks.forEach(l => l.classList.remove('nav__link--active'));
                this.classList.add('nav__link--active');
            }
        });
    });
    
    // Destacar link ativo baseado no scroll
    function updateActiveNavLink() {
        const sections = document.querySelectorAll('section[id]');
        const navLinks = document.querySelectorAll('.nav__link');
        
        let current = '';
        const header = document.querySelector('.header');
        const headerHeight = header ? header.offsetHeight : 0;
        
        sections.forEach(section => {
            const sectionTop = section.offsetTop - headerHeight - 100;
            const sectionHeight = section.offsetHeight;
            
            if (window.scrollY >= sectionTop && 
                window.scrollY < sectionTop + sectionHeight) {
                current = section.getAttribute('id');
            }
        });
        
        navLinks.forEach(link => {
            link.classList.remove('nav__link--active');
            if (link.getAttribute('href') === `#${current}`) {
                link.classList.add('nav__link--active');
            }
        });
    }
    
    window.addEventListener('scroll', updateActiveNavLink);
    updateActiveNavLink();
}

// Alternância de tema
function initializeThemeToggle() {
    const themeToggle = document.getElementById('themeToggle');
    if (!themeToggle) return;
    
    // Obter tema atual do localStorage ou padrão
    let currentTheme = localStorage.getItem('theme');
    
    // Se não há tema salvo, usar o padrão do sistema ou light
    if (!currentTheme) {
        currentTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    
    // Aplicar tema inicial
    applyTheme(currentTheme);
    
    // Event listener para o botão
    themeToggle.addEventListener('click', function() {
        const currentTheme = document.documentElement.getAttribute('data-color-scheme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        applyTheme(newTheme);
    });
    
    function applyTheme(theme) {
        document.documentElement.setAttribute('data-color-scheme', theme);
        localStorage.setItem('theme', theme);
        themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
        themeToggle.setAttribute('aria-label', 
            theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro');
    }
}

// Inicialização da aplicação
function initializeApp() {
    console.log('Inicializando aplicação...');
    
    // Inicializar navegação
    initializeNavigation();
    
    // Inicializar alternância de tema
    initializeThemeToggle();
    
    // Aguardar MathJax e Chart.js
    function initializeSimulator() {
        if (window.Chart) {
            console.log('Inicializando simulador...');
            window.simulator = new MountainCarSimulator();
        } else {
            console.log('Aguardando Chart.js...');
            setTimeout(initializeSimulator, 100);
        }
    }
    
    // Aguardar MathJax carregar
    if (window.MathJax && window.MathJax.startup) {
        MathJax.startup.promise.then(() => {
            console.log('MathJax carregado');
            initializeSimulator();
        }).catch(() => {
            console.log('MathJax falhou, inicializando simulador mesmo assim');
            initializeSimulator();
        });
    } else {
        console.log('MathJax não encontrado, inicializando simulador');
        setTimeout(initializeSimulator, 500);
    }
}

// Event listener principal
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}

// Adicionar estilo ativo para navegação via JavaScript
function addActiveNavStyle() {
    const existingStyle = document.getElementById('nav-active-style');
    if (existingStyle) return;
    
    const style = document.createElement('style');
    style.id = 'nav-active-style';
    style.textContent = `
        .nav__link--active {
            color: var(--color-primary) !important;
            font-weight: var(--font-weight-bold);
        }
    `;
    document.head.appendChild(style);
}

// Adicionar estilo quando o DOM carregar
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addActiveNavStyle);
} else {
    addActiveNavStyle();
}

// Utilitários
const Utils = {
    formatNumber(num, decimals = 2) {
        return parseFloat(num).toFixed(decimals);
    },
    
    clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    },
    
    lerp(start, end, factor) {
        return start + (end - start) * factor;
    },
    
    downloadData(data, filename) {
        const blob = new Blob([JSON.stringify(data, null, 2)], 
                             { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
};

// Função para exportar dados de treinamento
function exportTrainingData() {
    if (window.simulator) {
        const data = {
            episodeRewards: window.simulator.episodeRewards,
            qTable: window.simulator.qTable,
            parameters: {
                alpha: window.simulator.alpha,
                gamma: window.simulator.gamma,
                epsilon: window.simulator.epsilon
            },
            episodes: window.simulator.episode
        };
        
        Utils.downloadData(data, 'mountain_car_training_data.json');
    }
}