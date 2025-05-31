// app.js - Dashboard de Focos de Calor (Versão Simplificada para Debug)
class DashboardFocosCalor {
    constructor() {
        this.dados = [];
        this.dadosFiltrados = [];
        this.filtros = {
            municipio: 'todos',
            estado: 'todos',
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
        this.popularFiltroEstados();
        this.popularFiltroBiomas();
        this.popularFiltroSatelites();
    }

    inicializarEventos() {
        console.log('⚡ Configurando eventos...');
        
        // Eventos dos filtros
        const elementos = [
            { id: 'filtro-municipio', propriedade: 'municipio' },
            { id: 'filtro-estado', propriedade: 'estado' },
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

        if (this.filtros.estado !== 'todos') {
            dadosFiltrados = dadosFiltrados.filter(d => d.estado === this.filtros.estado);
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

    popularFiltroEstados() {
        const select = document.getElementById('filtro-estado');
        if (!select) return;

        const estados = [...new Set(this.dados.map(d => d.estado).filter(Boolean))].sort();
        
        select.innerHTML = '<option value="todos">Todos os Estados</option>';
        estados.forEach(estado => {
            const option = document.createElement('option');
            option.value = estado;
            option.textContent = estado;
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
            estado: 'todos',
            bioma: 'todos',
            satelite: 'todos',
            periodo: 'todos'
        };

        // Resetar selects
        ['filtro-municipio', 'filtro-estado', 'filtro-bioma', 'filtro-satelite', 'filtro-periodo'].forEach(id => {
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
                estadoLider: 'N/A',
                biomaPredominante: 'N/A',
                satelitePrincipal: 'N/A'
            };
        }

        const municipios = {};
        const estados = {};
        const biomas = {};
        const satelites = {};

        dados.forEach(d => {
            municipios[d.municipio] = (municipios[d.municipio] || 0) + 1;
            estados[d.estado] = (estados[d.estado] || 0) + 1;
            biomas[d.bioma] = (biomas[d.bioma] || 0) + 1;
            satelites[d.satelite] = (satelites[d.satelite] || 0) + 1;
        });

        return {
            total: dados.length,
            municipioLider: Object.entries(municipios).sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A',
            estadoLider: Object.entries(estados).sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A',
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
        console.log('🎲 Gerando dados de exemplo para Brasil...');
        
        const regioesBrasil = [
            // Norte - Amazônia
            { municipio: 'Manaus', estado: 'AM', lat: -3.1, lng: -60.0, bioma: 'Amazônia' },
            { municipio: 'Altamira', estado: 'PA', lat: -3.2, lng: -52.2, bioma: 'Amazônia' },
            { municipio: 'Porto Velho', estado: 'RO', lat: -8.8, lng: -63.9, bioma: 'Amazônia' },
            
            // Nordeste - Cerrado/Caatinga
            { municipio: 'Balsas', estado: 'MA', lat: -7.5, lng: -46.0, bioma: 'Cerrado' },
            { municipio: 'Barreiras', estado: 'BA', lat: -12.2, lng: -45.0, bioma: 'Cerrado' },
            { municipio: 'Petrolina', estado: 'PE', lat: -9.4, lng: -40.5, bioma: 'Caatinga' },
            
            // Centro-Oeste - Cerrado/Pantanal
            { municipio: 'Sorriso', estado: 'MT', lat: -12.5, lng: -55.7, bioma: 'Cerrado' },
            { municipio: 'Corumbá', estado: 'MS', lat: -19.0, lng: -57.7, bioma: 'Pantanal' },
            
            // Sudeste - Mata Atlântica/Cerrado
            { municipio: 'Ribeirão Preto', estado: 'SP', lat: -21.2, lng: -47.8, bioma: 'Cerrado' },
            { municipio: 'Uberaba', estado: 'MG', lat: -19.7, lng: -47.9, bioma: 'Cerrado' },
            
            // Sul - Mata Atlântica
            { municipio: 'Ponta Grossa', estado: 'PR', lat: -25.1, lng: -50.2, bioma: 'Mata Atlântica' }
        ];
        
        const satelites = ['NOAA-21', 'NPP-375D', 'GOES-19', 'TERRA_M-T', 'METOP-C'];
        
        const dados = [];
        for (let i = 0; i < 200; i++) {
            const regiao = regioesBrasil[Math.floor(Math.random() * regioesBrasil.length)];
            
            dados.push({
                id: i + 1,
                latitude: regiao.lat + (Math.random() - 0.5) * 2,
                longitude: regiao.lng + (Math.random() - 0.5) * 2,
                municipio: regiao.municipio,
                estado: regiao.estado,
                bioma: regiao.bioma,
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
