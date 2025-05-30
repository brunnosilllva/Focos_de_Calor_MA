// app.js - Dashboard de Focos de Calor (Versão Simplificada para Debug)
class DashboardFocosCalor {
    constructor() {
        this.dados = [];
        this.dadosFiltrados = [];
        this.filtros = {
            municipio: 'todos',
            bioma: 'todos',
            satelite: 'todos',
            periodo: 'todos'
        };
        
        // Handlers
        this.mapHandler = null;
        this.chartHandler = null;
        this.dataLoader = null;
        
        console.log('🚀 Dashboard inicializando...');
        this.inicializar();
    }

    async inicializar() {
        try {
            console.log('1️⃣ Iniciando carregamento...');
            this.mostrarCarregamento('Carregando dados...');
            
            // Aguardar um pouco para garantir que DOM esteja pronto
            await this.delay(500);
            
            // 1. Inicializar DataLoader
            console.log('2️⃣ Inicializando DataLoader...');
            this.dataLoader = new DataLoader();
            
            // 2. Carregar dados
            console.log('3️⃣ Carregando dados...');
            await this.carregarDados();
            
            // 3. Inicializar componentes (com fallback)
            console.log('4️⃣ Inicializando componentes...');
            await this.inicializarComponentes();
            
            // 4. Configurar filtros
            console.log('5️⃣ Configurando filtros...');
            this.inicializarFiltros();
            this.inicializarEventos();
            
            // 5. Primeira renderização
            console.log('6️⃣ Renderizando dados...');
            this.aplicarFiltros();
            this.atualizarEstatisticas();
            
            // 6. Ocultar loading
            console.log('7️⃣ Finalizando...');
            await this.delay(1000); // Aguardar um pouco para suavizar
            this.ocultarCarregamento();
            
            console.log('✅ Dashboard inicializado com sucesso!');
            
        } catch (error) {
            console.error('❌ Erro durante inicialização:', error);
            this.mostrarErroInicializacao(error);
        }
    }

    async carregarDados() {
        try {
            console.log('📊 Carregando dados...');
            this.dados = await this.dataLoader.carregarDadosPrincipais();
            this.dadosFiltrados = [...this.dados];
            console.log(`✅ ${this.dados.length} focos carregados`);
        } catch (error) {
            console.error('❌ Erro ao carregar dados:', error);
            // Em caso de erro, usar dados de exemplo
            this.dados = this.gerarDadosExemplo();
            this.dadosFiltrados = [...this.dados];
        }
    }

    async inicializarComponentes() {
        // Inicializar mapa (com tratamento de erro)
        try {
            console.log('🗺️ Inicializando mapa...');
            if (typeof L !== 'undefined' && typeof MapHandler !== 'undefined') {
                this.mapHandler = new MapHandler();
                await this.mapHandler.inicializar('mapa-container');
                console.log('✅ Mapa inicializado');
            } else {
                console.warn('⚠️ Leaflet ou MapHandler não disponível');
            }
        } catch (error) {
            console.error('❌ Erro ao inicializar mapa:', error);
        }

        // Inicializar gráficos (com tratamento de erro)
        try {
            console.log('📈 Inicializando gráficos...');
            if (typeof Chart !== 'undefined' && typeof ChartHandler !== 'undefined') {
                this.chartHandler = new ChartHandler();
                await this.delay(500); // Aguardar DOM
                await this.chartHandler.inicializarGraficos(this.dados);
                console.log('✅ Gráficos inicializados');
            } else {
                console.warn('⚠️ Chart.js ou ChartHandler não disponível');
            }
        } catch (error) {
            console.error('❌ Erro ao inicializar gráficos:', error);
        }
    }

    inicializarFiltros() {
        console.log('🎛️ Configurando filtros...');
        
        // Popular dropdowns
        this.popularFiltroMunicipios();
        this.popularFiltroBiomas();
        this.popularFiltroSatelites();
    }

    inicializarEventos() {
        console.log('⚡ Configurando eventos...');
        
        // Eventos dos filtros
        const elementos = [
            { id: 'filtro-municipio', propriedade: 'municipio' },
            { id: 'filtro-bioma', propriedade: 'bioma' },
            { id: 'filtro-satelite', propriedade: 'satelite' },
            { id: 'filtro-periodo', propriedade: 'periodo' }
        ];

        elementos.forEach(({ id, propriedade }) => {
            const elemento = document.getElementById(id);
            if (elemento) {
                elemento.addEventListener('change', (e) => {
                    this.filtros[propriedade] = e.target.value;
                    this.aplicarFiltros();
                });
            }
        });

        // Botão reset
        const btnReset = document.getElementById('btn-reset-filtros');
        if (btnReset) {
            btnReset.addEventListener('click', () => this.resetarFiltros());
        }
    }

    aplicarFiltros() {
        console.log('🔍 Aplicando filtros...');
        
        let dadosFiltrados = [...this.dados];

        // Aplicar cada filtro
        if (this.filtros.municipio !== 'todos') {
            dadosFiltrados = dadosFiltrados.filter(d => d.municipio === this.filtros.municipio);
        }

        if (this.filtros.bioma !== 'todos') {
            dadosFiltrados = dadosFiltrados.filter(d => d.bioma === this.filtros.bioma);
        }

        if (this.filtros.satelite !== 'todos') {
            dadosFiltrados = dadosFiltrados.filter(d => d.satelite === this.filtros.satelite);
        }

        this.dadosFiltrados = dadosFiltrados;

        // Atualizar componentes
        this.atualizarComponentes();
        
        console.log(`✅ ${dadosFiltrados.length} focos filtrados`);
    }

    atualizarComponentes() {
        // Atualizar mapa
        if (this.mapHandler) {
            try {
                this.mapHandler.atualizarFocos(this.dadosFiltrados);
            } catch (error) {
                console.error('❌ Erro ao atualizar mapa:', error);
            }
        }

        // Atualizar gráficos
        if (this.chartHandler) {
            try {
                this.chartHandler.atualizarGraficos(this.dadosFiltrados);
            } catch (error) {
                console.error('❌ Erro ao atualizar gráficos:', error);
            }
        }

        // Atualizar contador
        this.atualizarContador();
    }

    popularFiltroMunicipios() {
        const select = document.getElementById('filtro-municipio');
        if (!select) return;

        const municipios = [...new Set(this.dados.map(d => d.municipio).filter(Boolean))].sort();
        
        select.innerHTML = '<option value="todos">Todos os Municípios</option>';
        municipios.forEach(municipio => {
            const option = document.createElement('option');
            option.value = municipio;
            option.textContent = municipio;
            select.appendChild(option);
        });
    }

    popularFiltroBiomas() {
        const select = document.getElementById('filtro-bioma');
        if (!select) return;

        const biomas = [...new Set(this.dados.map(d => d.bioma).filter(Boolean))].sort();
        
        select.innerHTML = '<option value="todos">Todos os Biomas</option>';
        biomas.forEach(bioma => {
            const option = document.createElement('option');
            option.value = bioma;
            option.textContent = bioma;
            select.appendChild(option);
        });
    }

    popularFiltroSatelites() {
        const select = document.getElementById('filtro-satelite');
        if (!select) return;

        const satelites = [...new Set(this.dados.map(d => d.satelite).filter(Boolean))].sort();
        
        select.innerHTML = '<option value="todos">Todos os Satélites</option>';
        satelites.forEach(satelite => {
            const option = document.createElement('option');
            option.value = satelite;
            option.textContent = satelite;
            select.appendChild(option);
        });
    }

    resetarFiltros() {
        this.filtros = {
            municipio: 'todos',
            bioma: 'todos',
            satelite: 'todos',
            periodo: 'todos'
        };

        // Resetar selects
        ['filtro-municipio', 'filtro-bioma', 'filtro-satelite', 'filtro-periodo'].forEach(id => {
            const elemento = document.getElementById(id);
            if (elemento) elemento.selectedIndex = 0;
        });

        this.aplicarFiltros();
    }

    atualizarEstatisticas() {
        const stats = this.calcularEstatisticas(this.dadosFiltrados);
        
        this.atualizarElemento('total-focos', stats.total.toLocaleString());
        this.atualizarElemento('municipio-lider', stats.municipioLider);
        this.atualizarElemento('bioma-predominante', stats.biomaPredominante);
        this.atualizarElemento('satelite-principal', stats.satelitePrincipal);
    }

    atualizarContador() {
        this.atualizarElemento('contador-filtrado', `${this.dadosFiltrados.length} focos exibidos`);
    }

    calcularEstatisticas(dados) {
        if (!dados || dados.length === 0) {
            return {
                total: 0,
                municipioLider: 'N/A',
                biomaPredominante: 'N/A',
                satelitePrincipal: 'N/A'
            };
        }

        const municipios = {};
        const biomas = {};
        const satelites = {};

        dados.forEach(d => {
            municipios[d.municipio] = (municipios[d.municipio] || 0) + 1;
            biomas[d.bioma] = (biomas[d.bioma] || 0) + 1;
            satelites[d.satelite] = (satelites[d.satelite] || 0) + 1;
        });

        return {
            total: dados.length,
            municipioLider: Object.entries(municipios).sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A',
            biomaPredominante: Object.entries(biomas).sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A',
            satelitePrincipal: Object.entries(satelites).sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A'
        };
    }

    // Métodos auxiliares
    atualizarElemento(id, valor) {
        const elemento = document.getElementById(id);
        if (elemento) {
            elemento.textContent = valor;
        }
    }

    mostrarCarregamento(mensagem = 'Carregando...') {
        const elemento = document.getElementById('loading');
        if (elemento) {
            elemento.style.display = 'flex';
            const texto = elemento.querySelector('p');
            if (texto) texto.textContent = mensagem;
        }
    }

    ocultarCarregamento() {
        const elemento = document.getElementById('loading');
        if (elemento) {
            elemento.style.display = 'none';
        }
    }

    mostrarErroInicializacao(error) {
        console.error('💥 Erro de inicialização:', error);
        
        // Ocultar loading
        this.ocultarCarregamento();
        
        // Mostrar erro na tela
        const container = document.querySelector('.main-container .container');
        if (container) {
            container.innerHTML = `
                <div style="text-align: center; padding: 2rem; background: #fee2e2; border-radius: 8px; margin: 2rem 0;">
                    <h2 style="color: #dc2626; margin-bottom: 1rem;">⚠️ Erro ao Carregar Dashboard</h2>
                    <p style="margin-bottom: 1rem;">Detalhes do erro: ${error.message}</p>
                    <button onclick="location.reload()" style="padding: 0.5rem 1rem; background: #dc2626; color: white; border: none; border-radius: 4px; cursor: pointer;">
                        🔄 Tentar Novamente
                    </button>
                </div>
            `;
        }
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Dados de exemplo para fallback
    gerarDadosExemplo() {
        console.log('🎲 Gerando dados de exemplo...');
        
        const municipios = ['Balsas', 'Timon', 'Caxias', 'Imperatriz', 'São Luís'];
        const biomas = ['Cerrado', 'Caatinga', 'Amazônia'];
        const satelites = ['NOAA-21', 'NPP-375D', 'GOES-19'];
        
        const dados = [];
        for (let i = 0; i < 50; i++) {
            dados.push({
                id: i + 1,
                latitude: -3.5 + (Math.random() - 0.5) * 6,
                longitude: -45.0 + (Math.random() - 0.5) * 8,
                municipio: municipios[Math.floor(Math.random() * municipios.length)],
                bioma: biomas[Math.floor(Math.random() * biomas.length)],
                satelite: satelites[Math.floor(Math.random() * satelites.length)],
                data_hora: new Date().toISOString(),
                confianca: Math.floor(Math.random() * 100)
            });
        }
        
        return dados;
    }
}

// Inicialização automática com debug
document.addEventListener('DOMContentLoaded', () => {
    console.log('🌐 DOM carregado, inicializando dashboard...');
    
    try {
        window.dashboard = new DashboardFocosCalor();
    } catch (error) {
        console.error('💥 Erro crítico na inicialização:', error);
        
        // Fallback de emergência
        setTimeout(() => {
            const loading = document.getElementById('loading');
            if (loading) {
                loading.innerHTML = `
                    <div style="text-align: center; color: white;">
                        <h2>⚠️ Erro Crítico</h2>
                        <p>Não foi possível inicializar o dashboard.</p>
                        <p style="font-size: 0.8em; margin-top: 1rem;">${error.message}</p>
                        <button onclick="location.reload()" style="margin-top: 1rem; padding: 0.5rem 1rem; background: white; color: #1e40af; border: none; border-radius: 4px; cursor: pointer;">
                            🔄 Recarregar Página
                        </button>
                    </div>
                `;
            }
        }, 3000);
    }
});
