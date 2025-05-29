// src/js/app.js - Script principal do dashboard
class FocosCalorDashboard {
  constructor() {
    this.dados = [];
    this.filtros = {
      municipio: '',
      dataInicio: '',
      dataFim: ''
    };
    
    this.inicializar();
  }

  async inicializar() {
    console.log('🚀 Inicializando Dashboard de Focos de Calor...');
    
    // Mostrar loading
    this.mostrarLoading(true);
    
    try {
      // Carregar dados
      await this.carregarDados();
      
      // Inicializar componentes
      this.inicializarMapa();
      this.inicializarGraficos();
      this.inicializarTabela();
      this.configurarFiltros();
      
      // Ocultar loading
      this.mostrarLoading(false);
      
      console.log('✅ Dashboard inicializado com sucesso!');
      
    } catch (error) {
      console.error('❌ Erro ao inicializar dashboard:', error);
      this.mostrarErro('Erro ao carregar dados. Tente novamente em alguns minutos.');
    }
  }

  async carregarDados() {
    console.log('📊 Carregando dados de focos...');
    
    try {
      // Tentar carregar dados processados primeiro
      const dadosProcessados = await this.buscarDadosProcessados();
      
      if (dadosProcessados && dadosProcessados.length > 0) {
        this.dados = dadosProcessados;
        console.log(`✅ ${this.dados.length} focos carregados (dados processados)`);
        return;
      }
      
      // Se não houver dados processados, carregar CSVs diretamente
      const dadosCSV = await this.buscarCSVsProcessados();
      
      if (dadosCSV && dadosCSV.length > 0) {
        this.dados = dadosCSV;
        console.log(`✅ ${this.dados.length} focos carregados (CSVs)`);
        return;
      }
      
      // Se não encontrar nada, mostrar dados de exemplo
      this.dados = this.gerarDadosExemplo();
      console.log('⚠️ Usando dados de exemplo - aguarde próxima atualização');
      
    } catch (error) {
      console.error('❌ Erro ao carregar dados:', error);
      this.dados = this.gerarDadosExemplo();
    }
  }

  async buscarDadosProcessados() {
    try {
      // Primeiro, tentar carregar o resumo do processamento
      const summaryResponse = await fetch('src/data/processed/processing-summary.json');
      
      if (!summaryResponse.ok) {
        console.log('📋 Resumo não encontrado, tentando CSVs diretos...');
        return await this.buscarCSVsProcessados();
      }
      
      const summary = await response.json();
      console.log('📊 Resumo dos dados encontrado:', summary);
      
      // Tentar carregar CSVs da pasta processed
      return await this.buscarCSVsProcessados();
      
    } catch (error) {
      console.log('📋 Erro ao buscar dados processados:', error.message);
      return await this.buscarCSVsProcessados();
    }
  }

  async buscarCSVsProcessados() {
    try {
      // Buscar CSVs que podem estar na pasta processed
      console.log('🔍 Buscando CSVs na pasta processed...');
      
      // Listar arquivos possíveis baseado no padrão de nomes
      const agora = new Date();
      const hoje = agora.toISOString().slice(0, 10).replace(/-/g, '');
      
      // Tentar alguns horários recentes
      const horasPossiveis = [];
      for (let h = agora.getHours(); h >= Math.max(0, agora.getHours() - 3); h--) {
        for (let m = 50; m >= 0; m -= 10) {
          horasPossiveis.push(`${h.toString().padStart(2, '0')}${m.toString().padStart(2, '0')}`);
        }
      }
      
      // Tentar encontrar arquivos CSV
      for (const hora of horasPossiveis) {
        const arquivos = [
          `src/data/processed/focos_10min_${hoje}_${hora}.csv`,
          `src/data/raw/focos_10min_${hoje}_${hora}.csv` // backup
        ];
        
        for (const arquivo of arquivos) {
          try {
            console.log(`🔍 Tentando carregar: ${arquivo}`);
            const response = await fetch(arquivo);
            
            if (response.ok) {
              const csvText = await response.text();
              const dados = this.parseCSV(csvText);
              
              if (dados.length > 0) {
                console.log(`✅ ${dados.length} focos carregados de: ${arquivo}`);
                return dados;
              }
            }
          } catch (error) {
            console.log(`⏭️ ${arquivo} não encontrado`);
          }
        }
      }
      
      return null;
      
    } catch (error) {
      console.log('❌ Erro ao buscar CSVs processados:', error);
      return null;
    }
  }

  async buscarDadosCSV() {
    try {
      // Tentar carregar CSV mais recente
      const agora = new Date();
      const dataHoje = agora.toISOString().slice(0, 10).replace(/-/g, '');
      const horaAtual = agora.getHours().toString().padStart(2, '0');
      const minutoAtual = Math.floor(agora.getMinutes() / 10) * 10;
      const minutoStr = minutoAtual.toString().padStart(2, '0');
      
      // Tentar últimos arquivos possíveis
      const arquivosPossiveis = [
        `focos_10min_${dataHoje}_${horaAtual}${minutoStr}.csv`,
        `focos_10min_${dataHoje}_${horaAtual}${(minutoAtual - 10).toString().padStart(2, '0')}.csv`,
        `focos_10min_${dataHoje}_${(horaAtual - 1).toString().padStart(2, '0')}50.csv`
      ];
      
      for (const arquivo of arquivosPossiveis) {
        try {
          const response = await fetch(`src/data/raw/${arquivo}`);
          
          if (response.ok) {
            const csvText = await response.text();
            const dados = this.parseCSV(csvText);
            
            if (dados.length > 0) {
              console.log(`✅ Dados carregados de: ${arquivo}`);
              return dados;
            }
          }
        } catch (error) {
          console.log(`⏭️ Arquivo ${arquivo} não encontrado`);
        }
      }
      
      return null;
      
    } catch (error) {
      console.error('❌ Erro ao buscar CSVs:', error);
      return null;
    }
  }

  parseCSV(csvText) {
    try {
      const linhas = csvText.split('\n');
      const headers = linhas[0].split(',').map(h => h.trim());
      
      const dados = [];
      
      for (let i = 1; i < linhas.length; i++) {
        const linha = linhas[i].trim();
        if (!linha) continue;
        
        const valores = linha.split(',');
        
        if (valores.length >= 2) {
          const foco = {};
          
          headers.forEach((header, index) => {
            foco[header] = valores[index] ? valores[index].trim() : '';
          });
          
          // Validar coordenadas básicas
          if (foco.lat && foco.lon && !isNaN(foco.lat) && !isNaN(foco.lon)) {
            dados.push(foco);
          }
        }
      }
      
      return dados;
      
    } catch (error) {
      console.error('❌ Erro ao fazer parse do CSV:', error);
      return [];
    }
  }

  gerarDadosExemplo() {
    console.log('🎭 Gerando dados de exemplo...');
    
    const dados = [];
    const agora = new Date();
    
    // Gerar alguns focos de exemplo no Maranhão
    const coordenadasMA = [
      { lat: -2.5, lon: -44.2, municipio: 'São Luís' },
      { lat: -5.1, lon: -47.5, municipio: 'Imperatriz' },
      { lat: -3.7, lon: -43.4, municipio: 'Caxias' },
      { lat: -4.8, lon: -45.3, municipio: 'Timon' },
      { lat: -2.9, lon: -41.8, municipio: 'Barreirinhas' }
    ];
    
    for (let i = 0; i < 20; i++) {
      const coord = coordenadasMA[i % coordenadasMA.length];
      const dataHora = new Date(agora.getTime() - Math.random() * 24 * 60 * 60 * 1000);
      
      dados.push({
        lat: coord.lat + (Math.random() - 0.5) * 0.5,
        lon: coord.lon + (Math.random() - 0.5) * 0.5,
        municipio: coord.municipio,
        data: dataHora.toISOString().split('T')[0],
        hora: dataHora.toTimeString().split(' ')[0],
        satelite: Math.random() > 0.5 ? 'AQUA_M-T' : 'TERRA_M-T',
        bioma: 'Cerrado'
      });
    }
    
    return dados;
  }

  inicializarMapa() {
    console.log('🗺️ Inicializando mapa...');
    
    // Verificar se o elemento do mapa existe
    const mapElement = document.getElementById('map');
    if (!mapElement) {
      console.error('❌ Elemento #map não encontrado');
      return;
    }
    
    try {
      // Inicializar mapa centrado no Maranhão
      this.mapa = L.map('map').setView([-4.9, -45.0], 7);
      
      // Adicionar camada base
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(this.mapa);
      
      // Adicionar focos ao mapa
      this.adicionarFocosAoMapa();
      
      console.log('✅ Mapa inicializado com sucesso');
      
    } catch (error) {
      console.error('❌ Erro ao inicializar mapa:', error);
    }
  }

  adicionarFocosAoMapa() {
    if (!this.mapa || !this.dados) return;
    
    console.log(`📍 Adicionando ${this.dados.length} focos ao mapa...`);
    
    this.dados.forEach(foco => {
      if (foco.lat && foco.lon) {
        const marker = L.circleMarker([parseFloat(foco.lat), parseFloat(foco.lon)], {
          radius: 4,
          fillColor: '#ff4444',
          color: '#ffffff',
          weight: 1,
          opacity: 1,
          fillOpacity: 0.8
        });
        
        marker.bindPopup(`
          <strong>Foco de Calor</strong><br>
          <strong>Município:</strong> ${foco.municipio || 'N/A'}<br>
          <strong>Data:</strong> ${foco.data || 'N/A'}<br>
          <strong>Hora:</strong> ${foco.hora || 'N/A'}<br>
          <strong>Satélite:</strong> ${foco.satelite || 'N/A'}
        `);
        
        marker.addTo(this.mapa);
      }
    });
  }

  inicializarGraficos() {
    console.log('📊 Inicializando gráficos...');
    
    // TODO: Implementar gráficos com Chart.js
    this.atualizarEstatisticas();
  }

  atualizarEstatisticas() {
    // Atualizar cards de estatísticas
    const totalFocos = document.getElementById('total-focos');
    const focosHoje = document.getElementById('focos-hoje');
    const ultimaAtualizacao = document.getElementById('ultima-atualizacao');
    
    if (totalFocos) totalFocos.textContent = this.dados.length;
    
    if (focosHoje) {
      const hoje = new Date().toISOString().split('T')[0];
      const focosDeHoje = this.dados.filter(f => f.data === hoje).length;
      focosHoje.textContent = focosDeHoje;
    }
    
    if (ultimaAtualizacao) {
      ultimaAtualizacao.textContent = new Date().toLocaleTimeString('pt-BR');
    }
  }

  inicializarTabela() {
    console.log('📋 Inicializando tabela...');
    
    const tableBody = document.getElementById('focos-table-body');
    if (!tableBody) return;
    
    // Limpar tabela
    tableBody.innerHTML = '';
    
    // Adicionar primeiros 50 registros
    const dadosLimitados = this.dados.slice(0, 50);
    
    dadosLimitados.forEach(foco => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${foco.data || 'N/A'} ${foco.hora || ''}</td>
        <td>${parseFloat(foco.lat).toFixed(4)}</td>
        <td>${parseFloat(foco.lon).toFixed(4)}</td>
        <td>${foco.municipio || 'N/A'}</td>
        <td>${foco.bioma || 'N/A'}</td>
        <td>${foco.uso_solo || 'N/A'}</td>
        <td>${foco.uc || 'N/A'}</td>
      `;
      tableBody.appendChild(row);
    });
  }

  configurarFiltros() {
    console.log('🎛️ Configurando filtros...');
    
    // TODO: Implementar filtros funcionais
    const applyFiltersBtn = document.getElementById('apply-filters');
    if (applyFiltersBtn) {
      applyFiltersBtn.addEventListener('click', () => {
        console.log('🔍 Aplicando filtros...');
        // TODO: Implementar lógica de filtros
      });
    }
  }

  mostrarLoading(mostrar) {
    const loading = document.getElementById('loading-overlay');
    if (loading) {
      loading.style.display = mostrar ? 'flex' : 'none';
    }
  }

  mostrarErro(mensagem) {
    console.error('❌ Erro:', mensagem);
    
    // Criar elemento de erro se não existir
    let errorDiv = document.getElementById('error-message');
    if (!errorDiv) {
      errorDiv = document.createElement('div');
      errorDiv.id = 'error-message';
      errorDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #ff4444;
        color: white;
        padding: 15px;
        border-radius: 5px;
        z-index: 10000;
        max-width: 300px;
      `;
      document.body.appendChild(errorDiv);
    }
    
    errorDiv.textContent = mensagem;
    errorDiv.style.display = 'block';
    
    // Ocultar após 5 segundos
    setTimeout(() => {
      errorDiv.style.display = 'none';
    }, 5000);
  }
}

// Inicializar dashboard quando página carregar
document.addEventListener('DOMContentLoaded', () => {
  console.log('🌟 Página carregada, inicializando dashboard...');
  new FocosCalorDashboard();
});
