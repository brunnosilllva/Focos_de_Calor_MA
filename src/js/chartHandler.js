// chartHandler.js - Implementação completa dos gráficos Chart.js
class ChartHandler {
    constructor() {
        this.charts = {};
        this.cores = {
            primaria: '#1e40af',
            secundaria: '#dc2626',
            terciaria: '#059669',
            quaternaria: '#7c3aed',
            gradiente: ['#1e40af', '#3b82f6', '#60a5fa', '#93c5fd'],
            biomas: {
                'Cerrado': '#f97316',
                'Amazônia': '#22c55e',
                'Caatinga': '#a3a3a3'
            }
        };
    }

    async inicializarGraficos(dados) {
        try {
            await this.criarGraficoTemporal(dados);
            await this.criarGraficoMunicipios(dados);
            await this.criarGraficoBiomas(dados);
            await this.criarGraficoSatelites(dados);
            await this.criarGraficoEvolucaoMensal(dados);
            await this.criarGraficoComparativo(dados);
        } catch (error) {
            console.error('Erro ao inicializar gráficos:', error);
        }
    }

    // Gráfico 1: Série Temporal (2012-2025)
    async criarGraficoTemporal(dados) {
        const ctx = document.getElementById('grafico-temporal');
        if (!ctx) return;

        // Processar dados por mês/ano
        const dadosTemporais = this.processarDadosTemporais(dados);
        
        if (this.charts.temporal) {
            this.charts.temporal.destroy();
        }

        this.charts.temporal = new Chart(ctx, {
            type: 'line',
            data: {
                labels: dadosTemporais.labels,
                datasets: [{
                    label: 'Focos de Calor',
                    data: dadosTemporais.valores,
                    borderColor: this.cores.primaria,
                    backgroundColor: this.cores.primaria + '20',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: this.cores.primaria,
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#ffffff',
                        bodyColor: '#ffffff',
                        borderColor: this.cores.primaria,
                        borderWidth: 1,
                        callbacks: {
                            title: (context) => `${context[0].label}`,
                            label: (context) => `${context.parsed.y.toLocaleString()} focos`
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            maxTicksLimit: 12
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: '#e5e7eb'
                        },
                        ticks: {
                            callback: (value) => value.toLocaleString()
                        }
                    }
                }
            }
        });
    }

    // Gráfico 2: Ranking Top 10 Municípios
    async criarGraficoMunicipios(dados) {
        const ctx = document.getElementById('grafico-municipios');
        if (!ctx) return;

        const ranking = this.processarRankingMunicipios(dados);
        
        if (this.charts.municipios) {
            this.charts.municipios.destroy();
        }

        this.charts.municipios = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ranking.labels,
                datasets: [{
                    label: 'Focos de Calor',
                    data: ranking.valores,
                    backgroundColor: this.cores.gradiente,
                    borderColor: this.cores.primaria,
                    borderWidth: 1,
                    borderRadius: 4,
                    borderSkipped: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y',
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        callbacks: {
                            label: (context) => `${context.parsed.x.toLocaleString()} focos`
                        }
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        grid: {
                            color: '#e5e7eb'
                        },
                        ticks: {
                            callback: (value) => value.toLocaleString()
                        }
                    },
                    y: {
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    }

    // Gráfico 3: Distribuição por Biomas
    async criarGraficoBiomas(dados) {
        const ctx = document.getElementById('grafico-biomas');
        if (!ctx) return;

        const distribuicao = this.processarDistribuicaoBiomas(dados);
        
        if (this.charts.biomas) {
            this.charts.biomas.destroy();
        }

        this.charts.biomas = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: distribuicao.labels,
                datasets: [{
                    data: distribuicao.valores,
                    backgroundColor: distribuicao.labels.map(label => this.cores.biomas[label] || '#6b7280'),
                    borderColor: '#ffffff',
                    borderWidth: 3,
                    hoverBorderWidth: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '60%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            usePointStyle: true,
                            pointStyle: 'circle'
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        callbacks: {
                            label: (context) => {
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const porcentagem = ((context.parsed / total) * 100).toFixed(1);
                                return `${context.label}: ${context.parsed.toLocaleString()} focos (${porcentagem}%)`;
                            }
                        }
                    }
                }
            }
        });
    }

    // Gráfico 4: Distribuição por Satélites
    async criarGraficoSatelites(dados) {
        const ctx = document.getElementById('grafico-satelites');
        if (!ctx) return;

        const satelites = this.processarDadosSatelites(dados);
        
        if (this.charts.satelites) {
            this.charts.satelites.destroy();
        }

        this.charts.satelites = new Chart(ctx, {
            type: 'polarArea',
            data: {
                labels: satelites.labels,
                datasets: [{
                    data: satelites.valores,
                    backgroundColor: this.cores.gradiente.concat(['#f59e0b', '#ef4444']),
                    borderColor: '#ffffff',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 15,
                            usePointStyle: true
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        callbacks: {
                            label: (context) => `${context.label}: ${context.parsed.toLocaleString()} focos`
                        }
                    }
                },
                scales: {
                    r: {
                        beginAtZero: true,
                        grid: {
                            color: '#e5e7eb'
                        },
                        ticks: {
                            callback: (value) => value.toLocaleString()
                        }
                    }
                }
            }
        });
    }

    // Gráfico 5: Evolução Mensal
    async criarGraficoEvolucaoMensal(dados) {
        const ctx = document.getElementById('grafico-mensal');
        if (!ctx) return;

        const evolucao = this.processarEvolucaoMensal(dados);
        
        if (this.charts.mensal) {
            this.charts.mensal.destroy();
        }

        this.charts.mensal = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 
                        'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
                datasets: [{
                    label: '2025',
                    data: evolucao.ano2025,
                    backgroundColor: this.cores.primaria,
                    borderRadius: 4
                }, {
                    label: '2024',
                    data: evolucao.ano2024,
                    backgroundColor: this.cores.secundaria + '60',
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top'
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        callbacks: {
                            label: (context) => `${context.dataset.label}: ${context.parsed.y.toLocaleString()} focos`
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: '#e5e7eb'
                        },
                        ticks: {
                            callback: (value) => value.toLocaleString()
                        }
                    }
                }
            }
        });
    }

    // Gráfico 6: Comparativo Anual
    async criarGraficoComparativo(dados) {
        const ctx = document.getElementById('grafico-comparativo');
        if (!ctx) return;

        const comparativo = this.processarComparativoAnual(dados);
        
        if (this.charts.comparativo) {
            this.charts.comparativo.destroy();
        }

        this.charts.comparativo = new Chart(ctx, {
            type: 'line',
            data: {
                labels: comparativo.anos,
                datasets: [{
                    label: 'Total de Focos',
                    data: comparativo.totais,
                    borderColor: this.cores.primaria,
                    backgroundColor: this.cores.primaria + '20',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4
                }, {
                    label: 'Média Móvel (3 anos)',
                    data: comparativo.mediaMovel,
                    borderColor: this.cores.secundaria,
                    backgroundColor: 'transparent',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    pointRadius: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top'
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        callbacks: {
                            label: (context) => `${context.dataset.label}: ${context.parsed.y.toLocaleString()} focos`
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: '#e5e7eb'
                        },
                        ticks: {
                            callback: (value) => value.toLocaleString()
                        }
                    }
                }
            }
        });
    }

    // Métodos de processamento de dados
    processarDadosTemporais(dados) {
        // Simular dados históricos - substituir por dados reais
        const meses = [];
        const valores = [];
        
        for (let ano = 2012; ano <= 2025; ano++) {
            for (let mes = 1; mes <= 12; mes++) {
                if (ano === 2025 && mes > 5) break; // Até maio/2025
                
                meses.push(`${mes.toString().padStart(2, '0')}/${ano}`);
                // Simular variação sazonal (mais focos no período seco)
                const base = Math.random() * 1000;
                const sazonal = mes >= 6 && mes <= 11 ? base * 2 : base * 0.5;
                valores.push(Math.floor(sazonal));
            }
        }
        
        return { labels: meses, valores };
    }

    processarRankingMunicipios(dados) {
        // Usar dados reais se disponível, senão simular
        const municipios = dados && dados.length > 0 ? 
            this.contarPorMunicipio(dados) :
            {
                'Balsas': 375,
                'Timon': 185,
                'Caxias': 172,
                'Imperatriz': 95,
                'São Luís': 68,
                'Bacabal': 45,
                'Codó': 38,
                'Chapadinha': 29,
                'Pinheiro': 21,
                'Viana': 15
            };

        const ordenados = Object.entries(municipios)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10);

        return {
            labels: ordenados.map(([nome]) => nome),
            valores: ordenados.map(([,valor]) => valor)
        };
    }

    processarDistribuicaoBiomas(dados) {
        const biomas = dados && dados.length > 0 ?
            this.contarPorBioma(dados) :
            {
                'Cerrado': 764,
                'Caatinga': 16,
                'Amazônia': 8
            };

        return {
            labels: Object.keys(biomas),
            valores: Object.values(biomas)
        };
    }

    processarDadosSatelites(dados) {
        const satelites = dados && dados.length > 0 ?
            this.contarPorSatelite(dados) :
            {
                'NOAA-21': 245,
                'NPP-375D': 198,
                'GOES-19': 156,
                'TERRA_M-T': 123,
                'METOP-C': 66
            };

        return {
            labels: Object.keys(satelites),
            valores: Object.values(satelites)
        };
    }

    processarEvolucaoMensal(dados) {
        // Simular dados mensais para 2024 e 2025
        return {
            ano2025: [45, 32, 67, 89, 156, 0, 0, 0, 0, 0, 0, 0], // Até maio
            ano2024: [78, 56, 123, 187, 245, 312, 489, 567, 432, 234, 156, 89]
        };
    }

    processarComparativoAnual(dados) {
        const anos = [];
        const totais = [];
        
        for (let ano = 2012; ano <= 2025; ano++) {
            anos.push(ano.toString());
            // Simular tendência com variação
            const base = 2000 + (ano - 2012) * 50;
            const variacao = (Math.random() - 0.5) * 500;
            totais.push(Math.max(0, Math.floor(base + variacao)));
        }

        // Calcular média móvel de 3 anos
        const mediaMovel = totais.map((_, index) => {
            if (index < 2) return null;
            return Math.floor((totais[index-2] + totais[index-1] + totais[index]) / 3);
        });

        return { anos, totais, mediaMovel };
    }

    // Métodos auxiliares
    contarPorMunicipio(dados) {
        const contador = {};
        dados.forEach(foco => {
            const municipio = foco.municipio || 'Não identificado';
            contador[municipio] = (contador[municipio] || 0) + 1;
        });
        return contador;
    }

    contarPorBioma(dados) {
        const contador = {};
        dados.forEach(foco => {
            const bioma = foco.bioma || 'Não identificado';
            contador[bioma] = (contador[bioma] || 0) + 1;
        });
        return contador;
    }

    contarPorSatelite(dados) {
        const contador = {};
        dados.forEach(foco => {
            const satelite = foco.satelite || 'Não identificado';
            contador[satelite] = (contador[satelite] || 0) + 1;
        });
        return contador;
    }

    // Método para atualizar gráficos
    atualizarGraficos(novosDados) {
        this.inicializarGraficos(novosDados);
    }

    // Método para destruir gráficos
    destruirGraficos() {
        Object.values(this.charts).forEach(chart => {
            if (chart) chart.destroy();
        });
        this.charts = {};
    }
}

// Exportar para uso global
window.ChartHandler = ChartHandler;
