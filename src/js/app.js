// app.js - Dashboard de Focos de Calor do Maranhão (Melhorias Chart.js)
class DashboardFocosCalor {
    constructor() {
        this.dados = [];
        this.dadosFiltrados = [];
        this.estatisticas = {};
        this.filtros = {
            municipio: 'todos',
            bioma: 'todos',
            satelite: 'todos',
            periodo: 'todos'
        };
        
        // Handlers existentes + novo ChartHandler
        this.mapHandler = null;
        this.chartHandler = null;
        this.dataLoader = null;
        
        this.inicializar();
    }

    async inicializar() {
        try {
            this.mostrarCarregamento('Carregando dados do dashboard...');
            
            // 1. Carregar dados
            await this.carregarDados();
            
            // 2. Inicializar componentes
            await this.inicializarMapa();
            await this.inicializarGraficos(); // ← NOVA IMPLEMENTAÇÃO
            this.inicializarFiltros();
            this.inicializarEventos();
            
            // 3. Primeira renderização
            this.aplicarFiltros();
            this.atualizarEstatisticas();
            
            this.ocultarCarregamento();
            console.log('✅ Dashboard inicializado com sucesso!', {
                focos: this.dados.length,
                graficos: 'Chart.js integrado',
                mapa: 'Leaflet ativo'
            });
            
        } catch (error) {
            console.error('❌ Erro ao inicializar dashboard:', error);
            this.mostrarErro('Erro ao carregar o dashboard. Tente novamente.');
        }
    }

    async carregarDados() {
        try {
            // Tentar carregar dados processados primeiro
            const response = await fetch('./src/data/processed/focos-dashboard.json');
            if (response.ok) {
                this.dados = await response.json();
                console.log(`📊 Dados carregados: ${this.dados.length} focos`);
            } else {
                throw new Error('Dados não encontrados');
            }
            
            // Tentar carregar estatísticas
            try {
                const statsResponse = await fetch('./src/data/processed/estatisticas.json');
                if (statsResponse.ok) {
                    this.estatisticas = await statsResponse.json();
                }
            } catch (e) {
                console.warn('⚠️ Estatísticas não encontradas, calculando...');
                this.calcularEstatisticas();
            }
            
            this.dadosFiltrados = [...this.dados];
            
        } catch (error) {
            console.warn('⚠️ Usando dados de exemplo para demonstração');
            this.dados = this.gerarDadosExemplo();
            this.dadosFiltrados = [...this.dados];
            this.calcularEstatisticas();
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // 🆕 NOVA IMPLEMENTAÇÃO: Inicialização dos Gráficos Chart.js
    // ═══════════════════════════════════════════════════════════════
    async inicializarGraficos() {
        try {
            // Verificar se Chart.js está disponível
            if (typeof Chart === 'undefined') {
                console.error('❌ Chart.js não foi carregado!');
                this.mostrarAviso('Chart.js não encontrado. Alguns gráficos podem não funcionar.');
                return;
            }

            // Verificar se ChartHandler está disponível
            if (typeof ChartHandler === 'undefined') {
                console.error('❌ ChartHandler não foi carregado!');
                this.mostrarAviso('ChartHandler não encontrado. Verifique se o arquivo foi incluído.');
                return;
            }

            // Inicializar ChartHandler
            this.chartHandler = new ChartHandler();
            
            // Aguardar um pouco para garantir que os elementos DOM existam
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Inicializar gráficos com os dados atuais
            await this.chartHandler.inicializarGraficos(this.dados);
            
            console.log('📈 Gráficos Chart.js inicializados com sucesso!');
            
        } catch (error) {
            console.error('❌ Erro ao inicializar gráficos:', error);
            this.mostrarAviso('Erro ao carregar gráficos. Algumas visualizações podem não estar disponíveis.');
        }
    }

    async inicializarMapa() {
        try {
            if (typeof MapHandler !== 'undefined') {
                this.mapHandler = new MapHandler();
                await this.mapHandler.inicializar('mapa-container');
                this.mapHandler.adicionarFocos(this.dadosFiltrados);
                console.log('🗺️ Mapa inicializado');
            }
        } catch (error) {
            console.error('❌ Erro ao inicializar mapa:', error);
        }
    }

    inicializarFiltros() {
        // Popular dropdowns baseado nos dados reais
        this.popularFiltroMunicipios();
        this.popularFiltroBiomas();
        this.popularFiltroSatelites();
    }

    inicializarEventos() {
        // Eventos dos filtros principais
        const filtroMunicipio = document.getElementById('filtro-municipio');
        const filtroBioma = document.getElementById('filtro-bioma');
        const filtroSatelite = document.getElementById('filtro-satelite');
        const filtroPeriodo = document.getElementById('filtro-periodo');

        if (filtroMunicipio) {
            filtroMunicipio.addEventListener('change', (e) => {
                this.filtros.municipio = e.target.value;
                this.aplicarFiltros();
            });
        }

        if (filtroBioma) {
            filtroBioma.addEventListener('change', (e) => {
                this.filtros.bioma = e.target.value;
                this.aplicarFiltros();
            });
        }

        if (filtroSatelite) {
            filtroSatelite.addEventListener('change', (e) => {
                this.filtros.satelite = e.target.value;
                this.aplicarFiltros();
            });
        }

        if (filtroPeriodo) {
            filtroPeriodo.addEventListener('change', (e) => {
                this.filtros.periodo = e.target.value;
                this.aplicarFiltros();
            });
        }

        // Botão de reset
        const btnReset = document.getElementById('btn-reset-filtros');
        if (btnReset) {
            btnReset.addEventListener('click', () => this.resetarFiltros());
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // 🆕 MELHORIAS: Aplicação de Filtros com Atualização de Gráficos
    // ═══════════════════════════════════════════════════════════════
    aplicarFiltros() {
        // Aplicar filtros aos dados
        let dadosFiltrados = [...this.dados];

        // Filtro por município
        if (this.filtros.municipio !== 'todos') {
            dadosFiltrados = dadosFiltrados.filter(d => 
                d.municipio === this.filtros.municipio
            );
        }

        // Filtro por bioma
        if (this.filtros.bioma !== 'todos') {
            dadosFiltrados = dadosFiltrados.filter(d => 
                d.bioma === this.filtros.bioma
            );
        }

        // Filtro por satélite
        if (this.filtros.satelite !== 'todos') {
            dadosFiltrados = dadosFiltrados.filter(d => 
                d.satelite === this.filtros.satelite
            );
        }

        // Aplicar filtro de período (implementação básica)
        if (this.filtros.periodo !== 'todos') {
            dadosFiltrados = this.aplicarFiltroPeriodo(dadosFiltrados);
        }

        // Atualizar dados filtrados
        this.dadosFiltrados = dadosFiltrados;

        // 🆕 Atualizar todos os componentes
        this.atualizarComponentes();

        console.log(`🔍 Filtros aplicados: ${dadosFiltrados.length} focos exibidos`);
    }

    // ═══════════════════════════════════════════════════════════════
    // 🆕 NOVA FUNÇÃO: Atualizar Todos os Componentes
    // ═══════════════════════════════════════════════════════════════
    atualizarComponentes() {
        // 1. Atualizar estatísticas
        this.atualizarEstatisticas();

        // 2. Atualizar mapa
        if (this.mapHandler) {
            this.mapHandler.atualizarFocos(this.dadosFiltrados);
        }

        // 3. 🆕 Atualizar gráficos
        if (this.chartHandler) {
            this.chartHandler.atualizarGraficos(this.dadosFiltrados);
        }

        // 4. Atualizar contadores na interface
        this.atualizarContadores();
    }

    aplicarFiltroPeriodo(dados) {
        const hoje = new Date();
        const umaSemanaAtras = new Date(hoje.getTime() - 7 * 24 * 60 * 60 * 1000);
        const umMesAtras = new Date(hoje.getTime() - 30 * 24 * 60 * 60 * 1000);

        switch (this.filtros.periodo) {
            case '7dias':
                return dados.filter(d => new Date(d.data_hora || d.data) >= umaSemanaAtras);
            case '30dias':
                return dados.filter(d => new Date(d.data_hora || d.data) >= umMesAtras);
            case 'hoje':
                return dados.filter(d => {
                    const dataFoco = new Date(d.data_hora || d.data);
                    return dataFoco.toDateString() === hoje.toDateString();
                });
            default:
                return dados;
        }
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
        // Resetar objeto de filtros
        this.filtros = {
            municipio: 'todos',
            bioma: 'todos',
            satelite: 'todos',
            periodo: 'todos'
        };

        // Resetar dropdowns
        document.getElementById('filtro-municipio')?.selectedIndex = 0;
        document.getElementById('filtro-bioma')?.selectedIndex = 0;
        document.getElementById('filtro-satelite')?.selectedIndex = 0;
        document.getElementById('filtro-periodo')?.selectedIndex = 0;

        // Reaplicar sem filtros
        this.aplicarFiltros();
    }

    atualizarEstatisticas() {
        const stats = this.calcularEstatisticasAtual(this.dadosFiltrados);
        
        // Atualizar elementos na tela
        this.atualizarElemento('total-focos', stats.total.toLocaleString());
        this.atualizarElemento('municipio-lider', stats.municipioLider);
        this.atualizarElemento('bioma-predominante', stats.biomaPredominante);
        this.atualizarElemento('satelite-principal', stats.satelitePrincipal);
    }

    atualizarContadores() {
        const elemento = document.getElementById('contador-filtrado');
        if (elemento) {
            elemento.textContent = `${this.dadosFiltrados.length} focos exibidos`;
        }
    }

    calcularEstatisticasAtual(dados) {
        if (!dados || dados.length === 0) {
            return {
                total: 0,
                municipioLider: 'N/A',
                biomaPredominante: 'N/A',
                satelitePrincipal: 'N/A'
            };
        }

        // Contar por município
        const municipios = {};
        dados.forEach(d => {
            municipios[d.municipio] = (municipios[d.municipio] || 0) + 1;
        });
        const municipioLider = Object.entries(municipios).sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A';

        // Contar por bioma
        const biomas = {};
        dados.forEach(d => {
            biomas[d.bioma] = (biomas[d.bioma] || 0) + 1;
        });
        const biomaPredominante = Object.entries(biomas).sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A';

        // Contar por satélite
        const satelites = {};
        dados.forEach(d => {
            satelites[d.satelite] = (satelites[d.satelite] || 0) + 1;
        });
        const satelitePrincipal = Object.entries(satelites).sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A';

        return {
            total: dados.length,
            municipioLider,
            biomaPredominante,
            satelitePrincipal
        };
    }

    calcularEstatisticas() {
        this.estatisticas = this.calcularEstatisticasAtual(this.dados);
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
            elemento.textContent = mensagem;
            elemento.style.display = 'block';
        }
    }

    ocultarCarregamento() {
        const elemento = document.getElementById('loading');
        if (elemento) {
            elemento.style.display = 'none';
        }
    }

    mostrarErro(mensagem) {
        console.error(mensagem);
        alert(mensagem); // Implementar toast mais elegante depois
    }

    mostrarAviso(mensagem) {
        console.warn(mensagem);
        // Implementar sistema de notificações depois
    }

    // Dados de exemplo para fallback
    gerarDadosExemplo() {
        const municipios = ['Balsas', 'Timon', 'Caxias', 'Imperatriz', 'São Luís'];
        const biomas = ['Cerrado', 'Caatinga', 'Amazônia'];
        const satelites = ['NOAA-21', 'NPP-375D', 'GOES-19', 'TERRA_M-T'];
        
        const dados = [];
        for (let i = 0; i < 100; i++) {
            dados.push({
                id: i + 1,
                latitude: -3.5 + (Math.random() - 0.5) * 6,
                longitude: -45.0 + (Math.random() - 0.5) * 8,
                municipio: municipios[Math.floor(Math.random() * municipios.length)],
                bioma: biomas[Math.floor(Math.random() * biomas.length)],
                satelite: satelites[Math.floor(Math.random() * satelites.length)],
                data_hora: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
                confianca: Math.floor(Math.random() * 100)
            });
        }
        return dados;
    }
}

// ═══════════════════════════════════════════════════════════════
// 🚀 INICIALIZAÇÃO AUTOMÁTICA
// ═══════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Inicializando Dashboard de Focos de Calor do Maranhão...');
    window.dashboard = new DashboardFocosCalor();
});
