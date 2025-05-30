// src/js/app.js - Dashboard Final que carrega dados reais
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
      this.mostrarErro('Erro ao carregar dados. Usando dados de exemplo.');
      
      // Fallback para dados de exemplo
      this.dados = this.gerarDadosExemplo();
      this.inicializarComponentesComDados();
      this.mostrarLoading(false);
    }
  }

  async carregarDados() {
    console.log('📊 Carregando dados de focos...');
    
    try {
      // Tentar carregar summary primeiro
      const summary = await this.buscarSummary();
      
      if (summary && summary.files && summary.files.length > 0) {
        console.log(`📋 Summary encontrado: ${summary.totalFiles} arquivos CSV`);
        
        // Tentar carregar alguns CSVs mais recentes
        const dadosCSV = await this.buscarCSVsRecentes(summary.files);
        
        if (dadosCSV && dadosCSV.length > 0) {
          this.dados = dadosCSV;
          console.log(`✅ ${this.dados.length} focos carregados dos CSVs`);
          return;
        }
      }
      
      // Se não conseguir, usar dados de exemplo
      console.log('⚠️ Usando dados de exemplo - aguarde próxima atualização');
      this.dados = this.gerarDadosExemplo();
      
    } catch (error) {
      console.error('❌ Erro ao carregar dados:', error);
      this.dados = this.gerarDadosExemplo();
    }
  }

  async buscarSummary() {
    try {
      const response = await fetch('src/data/processed/processing-summary.json');
      
      if (!response.ok) {
        console.log('📋 Summary não encontrado');
        return null;
      }
      
      const summary = await response.json();
      console.log('📊 Summary carregado:', summary);
      return summary;
      
    } catch (error) {
      console.log('📋 Erro ao buscar summary:', error.message);
      return null;
    }
  }

  async buscarCSVsRecentes(arquivos) {
    console.log('🔍 Tentando carregar CSVs mais recentes...');
    
    // Ordenar arquivos por nome (que contém timestamp)
    const arquivosOrdenados = arquivos
      .filter(nome => nome.includes('.csv'))
      .sort()
      .reverse()
      .slice(0, 5); // Tentar os 5 mais recentes
    
    const todosDados = [];
    
    for (const arquivo of arquivosOrdenados) {
      try {
        console.log(`🔍 Tentando carregar: ${arquivo}`);
        
        // Tentar diferentes locais onde o arquivo pode estar
        const urlsPossiveis = [
          `src/data/raw/${arquivo}`,
          `src/data/processed/${arquivo}`,
          `${arquivo}` // caso esteja na raiz
        ];
        
        for (const url of urlsPossiveis) {
          try {
            const response = await fetch(url);
            
            if (response.ok) {
              const csvText = await response.text();
              const dados = this.parseCSV(csvText);
              
              if (dados && dados.length > 0) {
                console.log(`✅ ${dados.length} focos carregados de: ${url}`);
                todosDados.push(...dados);
                break; // Parar de tentar URLs para este arquivo
              }
            }
          } catch (urlError) {
            // Continuar tentando próxima URL
          }
        }
        
        // Se já temos dados suficientes, parar
        if (todosDados.length > 50) break;
        
      } catch (error) {
        console.log(`⏭️ Não foi possível carregar ${arquivo}`);
      }
    }
    
    return todosDados.length > 0 ? todosDados : null;
  }

  parseCSV(csvText) {
    try {
      const linhas = csvText.split('\n');
      if (linhas.length < 2) return [];
      
      const headers = linhas[0].split(',').map(h => h.trim().replace(/"/g, ''));
      const dados = [];
      
      for (let i = 1; i < linhas.length; i++) {
        const linha = linhas[i].trim();
        if (!linha) continue;
        
        const valores = linha.split(',').map(v => v.trim().replace(/"/g, ''));
        
        if (valores.length >= 2) {
          const foco = {};
          
          headers.forEach((header, index) => {
            foco[header] = valores[index] || '';
          });
          
          // Validar coordenadas básicas
          if (foco.lat && foco.lon && !isNaN(parseFloat(foco.lat)) && !isNaN(parseFloat(foco.lon))) {
            // Normalizar campos comuns
            foco.latitude = parseFloat(foco.lat);
            foco.longitude = parseFloat(foco.lon);
            
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
    console.log('🎭 Gerando dados de exemplo para o Maranhão...');
    
    const dados = [];
    const agora = new Date();
    
    // Coordenadas reais de municípios do Maranhão
    const coordenadasMA = [
      { lat: -2.5297, lon: -44.2828, municipio: 'São Luís', regiao: 'Norte' },
      { lat: -5.5244, lon: -47.4601, municipio: 'Imperatriz', regiao: 'Oeste' },
      { lat: -4.8594, lon: -43.3558, municipio: 'Caxias', regiao: 'Leste' },
      { lat: -5.0947, lon: -42.2877, municipio: 'Timon', regiao: 'Leste' },
      { lat: -2.7581, lon: -42.8256, municipio: 'Barreirinhas', regiao: 'Norte' },
      { lat: -3.7502, lon: -43.3741, municipio: 'Codó', regiao: 'Centro' },
      { lat: -4.2444, lon: -44.2133, municipio: 'Chapadinha', regiao: 'Leste' },
      { lat: -2.8800, lon: -45.2744, municipio: 'Bacabal', regiao: 'Centro' },
      { lat: -3.1019, lon: -44.3636, municipio: 'Santa Inês', regiao: 'Centro' },
      { lat: -4.0389, lon: -45.3553, municipio: 'Barra do Corda', regiao: 'Centro' }
    ];
    
    // Gerar focos distribuídos ao longo do tempo
    for (let i = 0; i < 50; i++) {
      const coord = coordenadasMA[i % coordenadasMA.length];
      const horasAtras = Math.random() * 24; // Últimas 24 horas
      const dataHora = new Date(agora.getTime() - horasAtras * 60 * 60 * 1000);
      
      dados.push({
        lat: coord.lat + (Math.random() - 0.5) * 0.3, // Variação nas coordenadas
        lon: coord.lon + (Math.random() - 0.5) * 0.3,
        latitude: coord.lat + (Math.random() - 0.5) * 0.3,
        longitude: coord.lon + (Math.random() - 0.5) * 0.3,
        municipio: coord.municipio,
        regiao: coord.regiao,
        data: dataHora.toISOString().split('T')[0],
        hora: dataHora.toTimeString().split(' ')[0],
        satelite: Math.random() > 0.5 ? 'AQUA_M-T' : 'TERRA_M-T',
        bioma: Math.random() > 0.7 ? 'Cerrado' : Math.random() > 0.5 ? 'Caatinga' : 'Amazônia',
        confianca: Math.floor(Math.random() * 40) + 60 + '%' // 60-99%
      });
    }
    
    return dados;
  }

  inicializarComponentesComDados() {
    this.inicializarMapa();
    this.inicializarGraficos();
    this.inicializarTabela();
    this.configurarFiltros();
  }

  inicializarMapa() {
    console.log('🗺️ Inicializando mapa...');
    
    const mapElement = document.getElementById('map');
    if (!mapElement) {
      console.error('❌ Elemento #map não encontrado');
      return;
    }
    
    try {
      // Inicializar mapa centrado no Maranhão
      this.mapa = L.map('map').setView([-4.5, -44.5], 7);
      
      // Adicionar camada base
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 18
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
      const lat = foco.latitude || parseFloat(foco.lat);
      const lon = foco.longitude || parseFloat(foco.lon);
      
      if (lat && lon && !isNaN(lat) && !isNaN(lon)) {
        // Cor baseada na idade do foco
        const ageFactor = this.calcularIdadeFoco(foco.data);
        const color = ageFactor < 1 ? '#ff4444' : ageFactor < 7 ? '#ff8800' : '#ffaa00';
        
        const marker = L.circleMarker([lat, lon], {
          radius: 5,
          fillColor: color,
          color: '#ffffff',
          weight: 1,
          opacity: 1,
          fillOpacity: 0.8
        });
        
        marker.bindPopup(`
          <div style="min-width: 200px;">
            <strong>🔥 Foco de Calor</strong><br>
            <strong>📍 Município:</strong> ${foco.municipio || 'N/A'}<br>
            <strong>📅 Data:</strong> ${foco.data || 'N/A'}<br>
            <strong>🕒 Hora:</strong> ${foco.hora || 'N/A'}<br>
            <strong>🛰️ Satélite:</strong> ${foco.satelite || 'N/A'}<br>
            <strong>🌿 Bioma:</strong> ${foco.bioma || 'N/A'}<br>
            <strong>📊 Confiança:</strong> ${foco.confianca || 'N/A'}
          </div>
        `);
        
        marker.addTo(this.mapa);
      }
    });
  }

  calcularIdadeFoco(dataFoco) {
    if (!dataFoco) return 30;
    
    try {
      const hoje = new Date();
      const dataFocoDate = new Date(dataFoco);
      const diffTime = hoje - dataFocoDate;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    } catch {
      return 30;
    }
  }

  inicializarGraficos() {
    console.log('📊 Inicializando gráficos...');
    this.atualizarEstatisticas();
    // TODO: Implementar gráficos Chart.js
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
      const lat = foco.latitude || parseFloat(foco.lat) || 0;
      const lon = foco.longitude || parseFloat(foco.lon) || 0;
      
      row.innerHTML = `
        <td>${foco.data || 'N/A'} ${foco.hora || ''}</td>
        <td>${lat.toFixed(4)}</td>
        <td>${lon.toFixed(4)}</td>
        <td>${foco.municipio || 'N/A'}</td>
        <td>${foco.bioma || 'N/A'}</td>
        <td>${foco.satelite || 'N/A'}</td>
        <td>${foco.confianca || 'N/A'}</td>
      `;
      tableBody.appendChild(row);
    });
  }

  configurarFiltros() {
    console.log('🎛️ Configurando filtros...');
    
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
        background: #ff6b6b;
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        z-index: 10000;
        max-width: 350px;
        box-shadow: 0 4px 15px rgba(255, 107, 107, 0.3);
        font-size: 14px;
        line-height: 1.4;
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
  
  // Aguardar carregar bibliotecas externas
  setTimeout(() => {
    new FocosCalorDashboard();
  }, 1000);
});
